import { NextRequest, NextResponse } from "next/server";

// Allowed asset classes and basic guardrails
const ALLOWED_CLASSES = ["Stocks","Equity MF","Gold","Real Estate","Debt","Liquid"] as const;

type AllowedClass = typeof ALLOWED_CLASSES[number];

type AiResult = { buckets: Array<{ class: string; pct: number; min?: number; max?: number; range?: [number, number] }>; rationale?: string; confidence?: number; diag?: { missingKey?: boolean; status?: number; parseError?: string; raw?: string } };

function extractJson(text: string): any {
	try { return JSON.parse(text); } catch {}
	try {
		const cleaned = text.replace(/```json|```/g, "").trim();
		return JSON.parse(cleaned);
	} catch {}
	try {
		const start = text.indexOf("{");
		const end = text.lastIndexOf("}");
		if (start >= 0 && end > start) {
			return JSON.parse(text.slice(start, end + 1));
		}
	} catch {}
	throw new Error("parse_failed");
}

async function callGroqForAllocation(prompt: string): Promise<AiResult> {
	const apiKey = (process.env.GROQ_API_KEY || "").trim();
	if (!apiKey) return { buckets: [], diag: { missingKey: true } };
	try {
		const system = `You are a portfolio allocation assistant. Allowed classes: ${ALLOWED_CLASSES.join(", ")}. Respond ONLY JSON like {"buckets":[{"class":"Stocks","pct":35,"min":30,"max":40},...], "rationale": string, "confidence": 0.0-1.0}. Percentages must sum to ~100. For each bucket, include a reasonable comfort range (min/max in percent) that contains pct.`;
		const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Accept": "application/json",
				"Authorization": `Bearer ${apiKey}`,
				"User-Agent": "finsight-next/1.0"
			},
			body: JSON.stringify({
				model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: prompt }
				],
				temperature: 0,
				top_p: 1,
				response_format: { type: "json_object" },
				max_tokens: 512
			})
		});
		const status = res.status;
		const data = await res.json();
		const txt = (data?.choices?.[0]?.message?.content as string) || "";
		try {
			const parsed = extractJson(txt);
			return {
				buckets: Array.isArray(parsed?.buckets) ? parsed.buckets : [],
				rationale: typeof parsed?.rationale === "string" ? parsed.rationale : undefined,
				confidence: typeof parsed?.confidence === "number" ? parsed.confidence : undefined,
				diag: { status, raw: typeof txt === 'string' ? txt.slice(0, 300) : undefined }
			};
		} catch (e: any) {
			return { buckets: [], diag: { status, parseError: String(e), raw: typeof txt === 'string' ? txt.slice(0, 300) : undefined } };
		}
	} catch {
		return { buckets: [], diag: { parseError: "request_failed" } };
	}
}

function clampRefined(
	baseline: Array<{ class: AllowedClass; pct: number; min: number; max: number }>,
	ai: Array<{ class: string; pct: number; min?: number; max?: number; range?: [number, number] }>,
): Array<{ class: AllowedClass; pct: number; min: number; max: number }>{
	const baseMap = new Map<AllowedClass, { pct: number; min: number; max: number }>();
	for (const b of baseline) baseMap.set(b.class, { pct: b.pct, min: b.min, max: b.max });
	const out: Array<{ class: AllowedClass; pct: number; min: number; max: number }> = [];
	for (const [cls, v] of baseMap.entries()) {
		const aiEntry = ai.find(x => x.class?.toLowerCase() === cls.toLowerCase());
		let pct = v.pct;
		let min = v.min;
		let max = v.max;
		if (aiEntry) {
			if (Number.isFinite(aiEntry.pct)) {
				pct = Math.max(min, Math.min(max, Number(aiEntry.pct)));
			}
		}
		out.push({ class: cls, pct, min, max });
	}
	const liq = out.find(o => o.class === "Liquid");
	if (liq && liq.pct < 5) liq.pct = 5;
	const sum = out.reduce((s, x) => s + x.pct, 0) || 1;
	for (const o of out) o.pct = +(o.pct * 100 / sum).toFixed(2);
	for (const o of out) o.pct = Math.max(o.min, Math.min(o.max, o.pct));
	return out;
}

function objFromBuckets(buckets: Array<{ class: AllowedClass; pct: number }>): Record<AllowedClass, number> {
	const out: Record<AllowedClass, number> = { Stocks: 0, "Equity MF": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	for (const b of buckets) out[b.class] = b.pct;
	return out;
}

function normalizeTo100(obj: Record<AllowedClass, number>): Record<AllowedClass, number> {
	const sum = (ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).reduce((s, k) => s + (obj[k] || 0), 0) || 1;
	const out: Record<AllowedClass, number> = { Stocks: 0, "Equity MF": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	(ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).forEach(k => out[k] = +(obj[k] * 100 / sum).toFixed(2));
	return out;
}

function enforceSimpleConstraints(obj: Record<AllowedClass, number>): Record<AllowedClass, number> {
	const out = { ...obj };
	if (out.Liquid < 5) {
		const need = 5 - out.Liquid;
		const takeDebt = Math.min(need, out.Debt);
		out.Debt -= takeDebt;
		out.Liquid += takeDebt;
		let remain = need - takeDebt;
		if (remain > 0) {
			const eq = out.Stocks + out["Equity MF"]; const totalEq = eq || 1;
			const fromS = Math.min(remain * (out.Stocks / totalEq), out.Stocks);
			out.Stocks -= fromS; remain -= fromS;
			const fromMF = Math.min(remain, out["Equity MF"]);
			out["Equity MF"] -= fromMF; remain -= fromMF;
			out.Liquid += (need - takeDebt);
		}
	}
	if (out.Gold < 3) { const d = 3 - out.Gold; const take = Math.min(d, out.Debt); out.Debt -= take; out.Gold += take; }
	if (out.Gold > 12) { const d = out.Gold - 12; out.Gold -= d; out.Debt += d; }
	if (out["Real Estate"] > 7) { const d = out["Real Estate"] - 7; out["Real Estate"] -= d; out.Debt += d; }
	return out;
}

function roundWhole(obj: Record<AllowedClass, number>): Record<AllowedClass, number> {
	const keys = ALLOWED_CLASSES as ReadonlyArray<AllowedClass>;
	const floors: Record<AllowedClass, number> = { Stocks: 0, "Equity MF": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	const remainders: Array<{ k: AllowedClass; r: number }> = [];
	let total = 0;
	for (const k of keys) {
		const v = Math.max(0, Math.min(100, obj[k] || 0));
		const f = Math.floor(v);
		floors[k] = f;
		remainders.push({ k, r: v - f });
		total += f;
	}
	let leftover = 100 - total;
	remainders.sort((a,b)=> b.r - a.r);
	for (let i=0; i<remainders.length && leftover>0; i++) { floors[remainders[i].k] += 1; leftover--; }
	return floors;
}

// Comfort zone utilities
function getToleranceFromRiskProfile(risk: string): number {
	const r = String(risk || "").toLowerCase();
	if (r.includes("low") || r.includes("conservative")) return 0.03; // ±3%
	if (r.includes("high") || r.includes("aggressive")) return 0.10; // ±10%
	if (r.includes("moderate") || r.includes("balanced")) return 0.07; // ±7%
	return 0.07;
}

function mapFromAnyBuckets(buckets: Array<{ class: string; pct: number }>): Record<AllowedClass, number> {
	const out: Record<AllowedClass, number> = { Stocks: 0, "Equity MF": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	for (const b of (buckets || [])) {
		const cls = (ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).find(a => a.toLowerCase() === String(b.class || "").toLowerCase());
		if (!cls) continue;
		const v = Number(b.pct);
		if (!Number.isFinite(v)) continue;
		out[cls] = v;
	}
	return out;
}

function apply_comfort_zone(
	baseline: Record<AllowedClass, number>,
	aiSuggestion: Record<AllowedClass, number>,
	riskProfile: string
): Record<AllowedClass, number> {
	const tol = getToleranceFromRiskProfile(riskProfile);
	const out: Record<AllowedClass, number> = { Stocks: 0, "Equity MF": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	(ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).forEach(k => {
		const base = baseline[k] || 0;
		const min = base - base * tol;
		const max = base + base * tol;
		const aiv = aiSuggestion[k] || 0;
		out[k] = Math.max(min, Math.min(max, aiv));
	});
	return normalizeTo100(out);
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { questionnaire, baseline } = body as {
			questionnaire: Record<string, any>,
			baseline: { riskLevel: string; buckets: Array<{ class: AllowedClass; pct: number; range: [number, number] }> }
		};
		if (!questionnaire || !baseline) return NextResponse.json({ error: "Missing questionnaire or baseline" }, { status: 400 });
		const debug = (req.nextUrl?.searchParams?.get('debug') === '1');

		// Goals context for prompt (optional)
		const goalsArr = Array.isArray((questionnaire as any)?.goals) ? (questionnaire as any).goals : [];
		const goalsText = goalsArr.length ? goalsArr.slice(0,5).map((g:any)=> {
			const amt = Number(g.targetAmount||0) || 0;
			const date = g.targetDate || g.date || '';
			return `${g.name||g.category||'Goal'}: ₹${amt} by ${date}`;
		}).join("; ") : "none";

		const toArray = (v: any): string[] => Array.isArray(v) ? v : (typeof v === 'string' && v ? [v] : []);
		const prefs = toArray(questionnaire?.emphasizeAssets).join(", ");
		const prompt = `User profile: age=${questionnaire.ageBand||""}, horizon=${questionnaire.horizon||""}, income_stability=${questionnaire.incomeStability||""}, liabilities=${questionnaire.liabilities||""}, dependents=${questionnaire.dependents||""}, volatility=${questionnaire.volatilityComfort||""}, knowledge=${questionnaire.investmentKnowledge||""}, goal=${questionnaire.financialGoal||""}, ef6m=${questionnaire.emergencyFundSixMonths||""}, insurance=${questionnaire.insuranceCoverage||""}, tax_pref=${questionnaire.taxPreference||""}, avoid=[${prefs}].\nActive goals: ${goalsText}.\nCurrent suggested mix: ${baseline.buckets.map(b=>`${b.class}:${b.pct}% [${b.range[0]}-${b.range[1]}]`).join(", ")}. Propose a refined mix (allowed classes only) keeping changes within per-class ranges and overall risk. Ensure Liquid remains at least 5% and totals sum to ~100%.`;

		const ai = await callGroqForAllocation(prompt);
		if (ai?.diag?.missingKey) return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 400 });

		// Build baseline (advisor) and AI maps
		const advisorBuckets = baseline.buckets.map(b => ({ class: b.class, pct: b.pct }));
		const advisor = objFromBuckets(advisorBuckets);
		const baseForClamp = baseline.buckets.map(b => ({ class: b.class, pct: b.pct, min: b.range[0], max: b.range[1] }));
		const refined = clampRefined(baseForClamp, ai.buckets || []);
		const aiMap = objFromBuckets(refined.map(r => ({ class: r.class, pct: r.pct })) as any);

		// Per-asset explanations
		const perAsset: Record<string, string> = {};
		(ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).forEach(k => {
			const b = advisor[k] || 0;
			const aRaw = (()=>{ const e = (ai.buckets||[]).find(x=> (x.class||"").toLowerCase()===k.toLowerCase()); return Number.isFinite(e?.pct) ? Number(e!.pct) : b; })();
			const foundBucket = baseline.buckets.find(x=>x.class===k);
			const rangeArr = Array.isArray(foundBucket?.range) ? foundBucket.range : [0,100];
			const [min, max] = rangeArr;
			if (aRaw < min) perAsset[k] = `AI below comfort; clamped to ${min}%`;
			else if (aRaw > max) perAsset[k] = `AI above comfort; clamped to ${max}%`;
			else perAsset[k] = `Within comfort; blended with baseline`;
		});

		// Debate reconciliation: midpoint within ±5 cap
		const cap = 5;
		const final: Record<AllowedClass, number> = { Stocks: 0, "Equity MF": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
		(ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).forEach(k => {
			const B = advisor[k] || 0; const A = aiMap[k] || 0;
			const diff = A - B; const ad = Math.abs(diff);
			if (ad > cap) {
				final[k] = +(B + Math.sign(diff) * cap).toFixed(2);
				perAsset[k] = (perAsset[k] ? perAsset[k]+"; " : "") + `Limited to ±${cap}% from baseline`;
			} else {
				final[k] = +(((A + B) / 2)).toFixed(2);
				perAsset[k] = (perAsset[k] ? perAsset[k]+"; " : "") + `Midpoint of baseline and AI`;
			}
		});
		// Normalize and enforce simple constraints
		let finalNorm = normalizeTo100(final);
		finalNorm = enforceSimpleConstraints(finalNorm);
		finalNorm = normalizeTo100(finalNorm);
		const finalInt = roundWhole(finalNorm);

		// Per-goal context summary (for UI)
		const goalContext = goalsArr.length ? {
			count: goalsArr.length,
			examples: goalsArr.slice(0,3).map((g:any)=> ({ name: g.name || g.category, targetAmount: Number(g.targetAmount||0)||0, date: g.targetDate || g.date }))
		} : { count: 0, examples: [] };

		const advisorSafe = normalizeTo100(advisor);
		const aiSuggestion = normalizeTo100(aiMap);
		const comfortRanges: Record<AllowedClass, [number, number]> = {} as any;
		(ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).forEach(k => {
			const foundBucket = baseline.buckets.find(x=>x.class===k);
			const rangeArr = Array.isArray(foundBucket?.range) ? foundBucket.range : [0,100];
			const [min, max] = rangeArr;
			comfortRanges[k] = [Math.round(min), Math.round(max)];
		});
		const explanation = `Applied comfort zones from baseline; blended with AI via ±${cap}% cap/midpoint.`;

		// Only include range in output buckets if mode is custom
		const mode = (baseline as any)?.mode || (baseline as any)?.origin || "engine";
		let bucketsOut;
		if (mode === "custom") {
			bucketsOut = (ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).map(cls => ({ class: cls, pct: finalInt[cls], range: comfortRanges[cls], riskCategory: "", notes: "" }));
		} else {
			bucketsOut = (ALLOWED_CLASSES as ReadonlyArray<AllowedClass>).map(cls => ({ class: cls, pct: finalInt[cls], riskCategory: "", notes: "" }));
		}
		return NextResponse.json({
			aiPlan: {
				riskLevel: baseline?.riskLevel || "Moderate",
				buckets: bucketsOut
			},
			rationale: ai.rationale || "Refined based on your risk and goals.",
			confidence: typeof ai.confidence === "number" ? ai.confidence : undefined,
			baseline_allocation: advisorSafe,
			advisor_safe_allocation: advisorSafe,
			ai_suggestion: aiSuggestion,
			final_recommendation: finalInt,
			per_asset_explanations: perAsset,
			goal_context: goalContext,
			explanation,
			...(debug ? { diag: ai.diag || {} } : {})
		});
	} catch (err: any) {
		// Log error to server console for debugging
		console.error('AI plan suggest error:', err);
		// If debug=1, include error details in response
		const debug = (req.nextUrl?.searchParams?.get('debug') === '1');
		const errorPayload: any = { error: "Failed to suggest plan" };
		if (debug) {
			errorPayload.details = {
				message: err?.message,
				stack: err?.stack,
				raw: String(err)
			};
		}
		return NextResponse.json(errorPayload, { status: 502 });
	}
}