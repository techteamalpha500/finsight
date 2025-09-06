import { NextRequest, NextResponse } from "next/server";
import { getUserSubFromJwt } from "../../../_utils/auth";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { buildPlan } from "../../../../PortfolioManagement/domain/allocationEngine";

// Types aligned with frontend
interface Bucket { class: string; pct: number; range?: [number, number]; }
interface Plan { buckets: Bucket[]; riskLevel?: string; rationale?: string }
interface Holding { instrumentClass: string; currentValue?: number; units?: number; price?: number; investedAmount?: number }

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

function valueOfHolding(h: Holding): number {
	if (typeof h.currentValue === "number") return h.currentValue;
	if (typeof h.units === "number" && typeof h.price === "number") return h.units * h.price;
	if (typeof h.investedAmount === "number") return h.investedAmount;
	return 0;
}

async function fetchConstraints(sub: string, portfolioId: string) {
	const res = await ddb.send(new GetCommand({ TableName: INVEST_TABLE, Key: { pk: `USER#${sub}`, sk: `CONSTRAINTS#${portfolioId}` } }));
	return (res.Item as any)?.constraints || null;
}

async function fetchGoals(sub: string, portfolioId: string) {
	const res = await ddb.send(new QueryCommand({
		TableName: INVEST_TABLE,
		IndexName: "GSI1",
		KeyConditionExpression: "GSI1PK = :g",
		ExpressionAttributeValues: { ":g": `PORTFOLIO#${portfolioId}` },
		ScanIndexForward: false,
	}));
	return (res.Items||[]).filter((it:any)=> String(it.sk||"").startsWith(`GOAL#${portfolioId}#`));
}

function horizonLabelForDate(dateStr: string): string {
	const dt = new Date(dateStr);
	if (Number.isNaN(dt.getTime())) return "Medium (3–7 yrs)";
	const yrs = (dt.getTime() - Date.now()) / (365 * 24 * 3600 * 1000);
	if (yrs <= 3) return "Short (<3 yrs)";
	if (yrs <= 7) return "Medium (3–7 yrs)";
	return "Long (>7 yrs)";
}

function volFromRisk(r?: string): string {
	if (r === "High") return "High";
	if (r === "Low") return "Low";
	return "Medium";
}

function enginePlanForGoal(hLabel: string, riskLevel: string | undefined, constraints: any): Plan {
	const q: any = {
		ageBand: "31–45",
		horizon: hLabel,
		volatilityComfort: volFromRisk(riskLevel),
		investmentKnowledge: "Intermediate",
		incomeStability: "Variable",
		dependents: "None",
		liabilities: "None",
		financialGoal: "Major purchase",
		emergencyFundSixMonths: (Number(constraints?.efMonths)||0) >= 6 ? "Yes" : "No",
		insuranceCoverage: "Yes",
	};
	return buildPlan(q) as any;
}

function toPctMap(buckets: Bucket[]): Record<string, number> {
	const m: Record<string, number> = {};
	for (const b of buckets) m[b.class] = Number(b.pct) || 0;
	return m;
}

function normalizeTo100Ints(m: Record<string, number>): Record<string, number> {
	const keys = Object.keys(m);
	const raw = keys.map(k => ({ k, v: Math.max(0, Math.min(100, Number(m[k]) || 0)) }));
	const sum = raw.reduce((s, x) => s + x.v, 0);
	if (sum === 0) {
		// Default equally if all zeros
		const eq = Math.floor(100 / Math.max(1, raw.length));
		const out: Record<string, number> = {};
		for (const x of raw) out[x.k] = eq;
		out[raw[0]?.k || keys[0]] += 100 - (eq * raw.length);
		return out;
	}
	// Scale to 100, then round with largest remainders
	const scaled = raw.map(x => ({ k: x.k, v: (x.v / sum) * 100 }));
	const ints = scaled.map(x => ({ k: x.k, i: Math.floor(x.v), frac: x.v - Math.floor(x.v) }));
	let used = ints.reduce((s, x) => s + x.i, 0);
	let remain = 100 - used;
	ints.sort((a,b)=> b.frac - a.frac);
	for (let i = 0; i < ints.length && remain > 0; i++) { ints[i].i += 1; remain--; }
	const out: Record<string, number> = {};
	for (const x of ints) out[x.k] = x.i;
	return out;
}

function applyLiquidFloor(target: Record<string, number>, efMonths: number, liqAmt: number): Record<string, number> {
	const out = { ...target };
	let minLiquid = (efMonths >= 6) ? 3 : (efMonths > 0 ? 5 : 8);
	if (liqAmt > 0) minLiquid = Math.min(12, minLiquid + 2);
	const cur = Math.round(Number(out["Liquid"] || 0));
	if (cur >= minLiquid) return out;
	let need = minLiquid - cur;
	out["Liquid"] = minLiquid;
	// Reduce from Debt, then Stocks, then Equity MF, then Gold, then Real Estate
	const order = ["Debt", "Stocks", "Equity MF", "Gold", "Real Estate"];
	for (const cls of order) {
		if (need <= 0) break;
		const have = Math.round(Number(out[cls] || 0));
		if (have <= 0) continue;
		const take = Math.min(have, need);
		out[cls] = have - take;
		need -= take;
	}
	// If still need, reduce proportionally from any positives
	if (need > 0) {
		const positives = Object.keys(out).filter(k => k !== "Liquid" && out[k] > 0);
		for (const k of positives) {
			if (need <= 0) break;
			const have = Math.round(out[k]);
			const take = Math.min(have, need);
			out[k] = have - take;
			need -= take;
		}
	}
	// Normalize again to 100
	return normalizeTo100Ints(out);
}

export async function POST(req: NextRequest) {
	const sub = await getUserSubFromJwt(req);
	if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	try {
		const { plan, holdings, mode, options, constraints: constraintsIn, portfolioId } = await req.json();
		if (!plan || !Array.isArray(plan?.buckets) || !Array.isArray(holdings)) {
			return NextResponse.json({ error: "Missing or invalid plan/holdings" }, { status: 400 });
		}
		const modeKind = 'to-target';
		const cashOnly = !!(options?.cashOnly);
		const turnoverLimitPct = Math.max(0, Math.min(10, Number(options?.turnoverLimitPct) || 1));
		const considerGoals = options?.considerGoals !== false;

		// Load constraints/goals if portfolioId provided
		let constraints = constraintsIn || null;
		if (!constraints && portfolioId) constraints = await fetchConstraints(sub, portfolioId);
		const goals = portfolioId ? await fetchGoals(sub, portfolioId) : [];

		const efMonths = Math.max(0, Math.min(24, Number(constraints?.efMonths)||0));
		const liqAmt = Math.max(0, Number(constraints?.liquidityAmount)||0);
		const liqMonths = Math.max(0, Math.min(36, Number(constraints?.liquidityMonths)||0));

		// Household blended target from goals (if any)
		let blendedTarget: Record<string, number> | null = null;
		if (considerGoals && goals && goals.length) {
			const parts: Array<{ mix: Record<string, number>; w: number }> = [];
			for (const it of goals) {
				const g = (it as any)?.goal || {};
				const hLabel = horizonLabelForDate(g.targetDate || g.date || new Date().toISOString());
				const gp = enginePlanForGoal(hLabel, plan?.riskLevel, constraints);
				const mix = toPctMap(gp.buckets);
				const amount = Number(g.targetAmount || g.amount || 0) || 0;
				let w = amount > 0 ? amount : 1;
				const pri = String(g.priority || "Medium").toLowerCase();
				if (pri === 'high') w *= 1.2; else if (pri === 'low') w *= 0.8;
				parts.push({ mix, w });
			}
			const sumW = parts.reduce((s, p) => s + p.w, 0) || 1;
			const acc: Record<string, number> = {};
			for (const p of parts) {
				for (const k of Object.keys(p.mix)) acc[k] = (acc[k] || 0) + (p.mix[k] * (p.w / sumW));
			}
			blendedTarget = normalizeTo100Ints(acc);
			// Apply simple Liquid floor from constraints
			blendedTarget = applyLiquidFloor(blendedTarget, efMonths, liqAmt);
		}

		const total = holdings.reduce((s: number, h: Holding) => s + valueOfHolding(h), 0) || 0;
		const classToValue = new Map<string, number>();
		for (const h of holdings as Holding[]) {
			const v = valueOfHolding(h);
			const k = h.instrumentClass;
			classToValue.set(k, (classToValue.get(k) || 0) + v);
		}
		const allClasses = new Set<string>([...plan.buckets.map((b: Bucket)=> b.class), ...Array.from(classToValue.keys())]);

		// Build current and target maps
		const currentPct: Record<string, number> = {};
		const targetPct: Record<string, number> = {};
		for (const cls of allClasses) {
			const cur = total > 0 ? ((classToValue.get(cls) || 0) / total) * 100 : 0;
			currentPct[cls] = +(cur.toFixed(2));
			const pb = (plan.buckets as Bucket[]).find(b => b.class === cls);
			let baseTarget = pb ? Number(pb.pct) || 0 : 0;
			if (blendedTarget && typeof blendedTarget[cls] === 'number') baseTarget = blendedTarget[cls];
			targetPct[cls] = baseTarget;
		}

		// Enforce simple Liquid floor
		const adjusted = applyLiquidFloor(targetPct, efMonths, liqAmt);
		for (const k of Object.keys(adjusted)) targetPct[k] = adjusted[k];

		// Compose trades
		type Trade = { class: string; action: 'Increase'|'Reduce'; amount: number; actualPct: number; targetPct: number; reason: string };
		const sells: Trade[] = [];
		const buys: Trade[] = [];
		for (const cls of Object.keys(currentPct)) {
			const cur = currentPct[cls];
			const tgt = targetPct[cls] ?? cur;
			if (Math.abs(tgt - cur) < 0.5) continue; // ignore tiny deltas < 0.5%
			const deltaPct = tgt - cur;
			const amt = +(total * (Math.abs(deltaPct) / 100)).toFixed(2);
			if (deltaPct > 0) buys.push({ class: cls, action: 'Increase', amount: amt, actualPct: cur, targetPct: tgt, reason: 'to target' });
			else sells.push({ class: cls, action: 'Reduce', amount: amt, actualPct: cur, targetPct: tgt, reason: 'to target' });
		}

		// Apply options: cashOnly removes sells
		let effectiveSells = cashOnly ? [] as Trade[] : sells.sort((a,b)=> b.amount - a.amount);
		let effectiveBuys = buys.sort((a,b)=> b.amount - a.amount);

		// Turnover cap (approx): limit sells to turnoverLimitPct of portfolio value
		let sellBudget = (turnoverLimitPct/100) * total;
		const filteredSells: Trade[] = [];
		for (const t of effectiveSells) {
			if (sellBudget <= 0) break;
			const take = Math.min(t.amount, sellBudget);
			if (take >= 1) { filteredSells.push({ ...t, amount: +take.toFixed(2) }); sellBudget -= take; }
		}
		// Buys: if cashOnly, these imply contributions; otherwise match sells sum
		const sellsSum = filteredSells.reduce((s, t)=> s + t.amount, 0);
		let buyBudget = cashOnly ? effectiveBuys.reduce((s,t)=> s + t.amount, 0) : sellsSum;
		const filteredBuys: Trade[] = [];
		for (const t of effectiveBuys) {
			if (buyBudget <= 0) break;
			const take = Math.min(t.amount, buyBudget);
			if (take >= 1) { filteredBuys.push({ ...t, amount: +take.toFixed(2) }); buyBudget -= take; }
		}

		const trades = [...filteredSells, ...filteredBuys];
		const turnoverPct = total > 0 ? +((trades.reduce((s,t)=> s + t.amount, 0) / total) * 100).toFixed(2) : 0;
		const constraintNote = (efMonths || liqAmt)
			? ` while respecting ${efMonths? efMonths+ ' months EF':''}${efMonths&&liqAmt?' and ':''}${liqAmt? ('₹'+liqAmt+' over '+(liqMonths||0)+' months'):''}`
			: '';
		const goalsNote = goals?.length && considerGoals ? ` and considering ${goals.length} goal(s)` : '';
		const rationale = `We realign to targets${considerGoals? ' blended from your goals':''}${cashOnly? ' using contributions only':''}, keeping turnover under ${turnoverLimitPct}%${constraintNote}${goalsNote}.`;

		// After-mix (approx): apply targetPct where trades exist; else keep current
		const afterMix: Record<string, number> = {};
		for (const cls of Object.keys(currentPct)) {
			afterMix[cls] = Math.round(targetPct[cls] ?? currentPct[cls]);
		}

		return NextResponse.json({
			mode: modeKind,
			trades,
			beforeMix: currentPct,
			afterMix,
			turnoverPct,
			rationale,
			constraints: constraints || null,
			goalsCount: considerGoals ? (goals?.length || 0) : 0,
			blendedTarget: blendedTarget || null,
		});
	} catch (e:any) {
		return NextResponse.json({ error: 'Bad request', detail: String(e?.message||e) }, { status: 400 });
	}
}