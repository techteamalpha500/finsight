import { buildPlan } from "./allocationEngine";

export type Bucket = { class: string; pct: number; range?: [number, number] };
export type Plan = { buckets: Bucket[]; riskLevel?: string };

export function horizonLabelForDate(dateStr: string): string {
	const dt = new Date(dateStr);
	if (Number.isNaN(dt.getTime())) return "Medium (3–7 yrs)";
	const yrs = (dt.getTime() - Date.now()) / (365 * 24 * 3600 * 1000);
	if (yrs <= 3) return "Short (<3 yrs)";
	if (yrs <= 7) return "Medium (3–7 yrs)";
	return "Long (>7 yrs)";
}

export function volFromRisk(r?: string): string {
	if (r === "High") return "High";
	if (r === "Low") return "Low";
	return "Medium";
}

export function enginePlanForGoal(hLabel: string, riskLevel: string | undefined, constraints: any): Plan {
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

export function toPctMap(buckets: Bucket[]): Record<string, number> {
	const m: Record<string, number> = {};
	for (const b of buckets) m[b.class] = Number(b.pct) || 0;
	return m;
}

export function normalizeTo100Ints(m: Record<string, number>): Record<string, number> {
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

export function applyLiquidFloor(target: Record<string, number>, efMonths: number, liqAmt: number): Record<string, number> {
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
	return normalizeTo100Ints(out);
}

export function blendGoalTargets(goals: any[], planRiskLevel: string | undefined, constraints: any): Record<string, number> | null {
	if (!goals || goals.length === 0) return null;
	const parts: Array<{ mix: Record<string, number>; w: number }> = [];
	for (const it of goals) {
		const g = (it as any)?.goal || {};
		const hLabel = horizonLabelForDate(g.targetDate || g.date || new Date().toISOString());
		const gp = enginePlanForGoal(hLabel, planRiskLevel, constraints);
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
	return normalizeTo100Ints(acc);
}