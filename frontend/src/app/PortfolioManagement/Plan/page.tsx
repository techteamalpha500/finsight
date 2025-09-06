"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useRouter } from "next/navigation";
import PlanSummary from "../components/PlanSummary";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questionnaire";
import { buildPlan } from "../domain/allocationEngine";
import { Modal } from "../../components/Modal";
import { RotateCcw, Save as SaveIcon, AlertTriangle, ShieldOff } from "lucide-react";

import { advisorTune } from "../domain/advisorTune";
import PlanKPIs from "../components/PlanKPIs";
import GoalsPanel from "../components/GoalsPanel";

export default function PlanPage() {
	const { plan, setPlan, activePortfolioId, questionnaire, setQuestionAnswer, setQuestionnaire, getCustomDraft, setCustomDraft, getCustomLocks, setCustomLocks, getCustomSaved, setCustomSaved, holdings } = useApp() as any;
	const router = useRouter();
	const [local, setLocal] = useState<any | null>(plan || null);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiInfo, setAiInfo] = useState<{ rationale?: string; confidence?: number } | null>(null);
	const [answersOpen, setAnswersOpen] = useState(false);
	const [ansStep, setAnsStep] = useState(0);
	const [editAnswers, setEditAnswers] = useState<any>({});
	const [toast, setToast] = useState<{ msg: string; type: 'success'|'info'|'error' } | null>(null);
	const [aiViewOn, setAiViewOn] = useState(false);
	const [aiCache, setAiCache] = useState<Record<string, { buckets: any[]; explanation?: string }>>({}); // ephemeral per session
	const [aiSummary, setAiSummary] = useState<string | undefined>(undefined);
	const [answersDrift, setAnswersDrift] = useState(false);
	const [mode, setMode] = useState<'advisor'|'custom'>('advisor');
	const [customLocks, setLocalCustomLocks] = useState<Record<string, boolean>>({});
	const [advisorPins, setAdvisorPins] = useState<Record<string, boolean>>({});
        const [goalsPanelOpen, setGoalsPanelOpen] = useState(false);
        const [draftGoal, setDraftGoal] = useState<any | null>(null);
        const previewPlan = useMemo(()=>{
                try {
                        if (!draftGoal) return null;
                        const storedGoals = (()=>{ try { return JSON.parse(localStorage.getItem('investmentGoals')||'[]'); } catch { return []; } })();
                        const mergedGoals = [...storedGoals, { ...draftGoal, isActive: true }];
                        const q = { ...questionnaire, goals: mergedGoals };
                        return buildPlan(q);
                } catch { return null; }
        }, [draftGoal, questionnaire]);
	const getEnhancedQuestionnaire = () => {
		const storedGoals = localStorage.getItem("investmentGoals");
		const goals = storedGoals ? JSON.parse(storedGoals) : [];
		return {
			...questionnaire,
			goals: goals
		};
	};

	// Listen for goals-updated event and recalculate plan
	useEffect(() => {
		function handleGoalsUpdated() {
			const enhancedQ = getEnhancedQuestionnaire();
			const newPlan = buildPlan(enhancedQ);
			setPlan(newPlan);
			setLocal(newPlan);
		}
		window.addEventListener("goals-updated", handleGoalsUpdated);
		return () => window.removeEventListener("goals-updated", handleGoalsUpdated);
	}, [questionnaire]);
	
	// Always use professional mode
	const displayMode = 'advisor';


	const saveChip = useMemo(() => {
		try {
			const pruneAlloc = (p:any)=> ({ riskLevel: p?.riskLevel, buckets: (p?.buckets||[]).map((b:any)=>({ class: b.class, pct: b.pct })) });
			const snapshot = questionnaire; // Simplified - no pruning needed
			const answersDirty = makeAnswersSig(snapshot) !== (((plan as any)?.answersSig) || "");
			const allocDirty = !!(local && plan && JSON.stringify(pruneAlloc(local)) !== JSON.stringify(pruneAlloc(plan)));
			const originDirty = (mode === 'custom' && ((plan as any)?.origin !== 'custom'));
			const dirty = answersDirty || allocDirty || originDirty;
			return dirty ? (<span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">changes</span>) : null;
		} catch { return null; }
	}, [plan, local, mode, questionnaire]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2200);
		return () => clearTimeout(t);
	}, [toast]);

	function makeAnswersSig(q: any): string {
		try { return JSON.stringify(q); } catch { return ""; }
	}
	function makeSummary(baseline: any, aiBuckets: any[]): string {
		try {
			const baseMap: Record<string, number> = {};
			for (const b of (baseline?.buckets||[])) baseMap[b.class] = b.pct;
			const deltas = aiBuckets.map(b=> ({ cls: b.class as string, d: Math.round((b.pct - (baseMap[b.class]||0))) }));
			const ups = deltas.filter(x=> x.d>0).sort((a,b)=> b.d - a.d).slice(0,2);
			const downs = deltas.filter(x=> x.d<0).sort((a,b)=> a.d - b.d).slice(0,2);
			const parts: string[] = [];
			if (ups.length) parts.push(`nudges up ${ups.map(x=>`${x.cls} ${x.d}%`).join(", ")}`);
			if (downs.length) parts.push(`and trims ${downs.map(x=>`${x.cls} ${Math.abs(x.d)}%`).join(", ")}`);
			return parts.length ? `AI gently ${parts.join(" ")}, keeping your risk in check.` : `AI keeps your mix steady with minor refinements.`;
		} catch { return "AI refined your mix for balance and resilience."; }
	}

	function handleAdvisorClick() {
		setMode('advisor');
		try {
			const savedOrigin = (plan as any)?.origin;
			if (savedOrigin === 'engine' || savedOrigin === 'ai') {
				setLocal(plan);
				setAiViewOn(savedOrigin === 'ai');
				if (savedOrigin === 'ai') {
					try { const baseline = buildPlan((plan as any)?.answersSnapshot || questionnaire); setAiSummary(makeSummary(baseline, (plan as any)?.buckets||[])); } catch {}
				} else {
					setAiSummary(undefined);
				}
			} else {
				setAiViewOn(false);
				setAiSummary(undefined);
				setLocal(buildPlan(questionnaire));
			}
		} catch {
			setAiViewOn(false);
			setAiSummary(undefined);
			setLocal(buildPlan(questionnaire));
		}
	}

	async function handleCustomClick() {
		setMode('custom');
		setAiViewOn(false);
		try {
			if (activePortfolioId) {
				// 1) Prefer locally cached draft (unsaved) for instant toggles
				const draft = getCustomDraft(activePortfolioId);
				if (draft && draft.buckets) {
					setLocal(draft);
					const locks0 = getCustomLocks(activePortfolioId);
					if (locks0) setLocalCustomLocks(locks0);
					return;
				}
				// 2) Prefer locally cached saved custom snapshot
				const cached = getCustomSaved(activePortfolioId);
				if (cached && cached.buckets) {
					setLocal(cached);
					const locks0 = getCustomLocks(activePortfolioId);
					if (locks0) setLocalCustomLocks(locks0);
					return;
				}
				// 3) Use in-memory advisor plan (engine/ai) as seed without network
				const savedOrigin = (plan as any)?.origin;
				if (savedOrigin === 'engine' || savedOrigin === 'ai') {
					setLocal(plan);
					try { setCustomDraft(activePortfolioId, plan); } catch {}
					const locks0 = getCustomLocks(activePortfolioId);
					if (locks0) setLocalCustomLocks(locks0);
					return;
				}
				// 4) As last resort, try server snapshots; else baseline
				try {
					const rc = await fetch(`/api/portfolio/plan?portfolioId=${activePortfolioId}&variant=custom`);
					const dc = await rc.json();
					if (dc?.plan?.buckets) {
						setLocal(dc.plan);
						try { setCustomSaved(activePortfolioId, dc.plan); setCustomDraft(activePortfolioId, dc.plan); } catch {}
					} else {
						const ra = await fetch(`/api/portfolio/plan?portfolioId=${activePortfolioId}`);
						const da = await ra.json();
						if (da?.plan?.buckets) { setLocal(da.plan); try { setCustomDraft(activePortfolioId, da.plan); } catch {} }
						else { const base = buildPlan(questionnaire); setLocal(base); try { setCustomDraft(activePortfolioId, base); } catch {} }
					}
				} catch {
					const base = buildPlan(questionnaire); setLocal(base); try { setCustomDraft(activePortfolioId, base); } catch {}
				}
				const locks = getCustomLocks(activePortfolioId);
				if (locks) setLocalCustomLocks(locks);
			}
		} catch {}
	}

	function handleResetClick() {
		const snap = (plan as any)?.answersSnapshot || {};
		Object.keys(snap).forEach(k=> setQuestionAnswer(k, (snap as any)[k]));
		const savedOrigin = (plan as any)?.origin;
		if (mode === 'advisor') {
			if (savedOrigin === 'engine' || savedOrigin === 'ai') {
				setLocal(plan);
				setAiViewOn(savedOrigin === 'ai');
				try { if (savedOrigin === 'ai') { const baseline = buildPlan((plan as any)?.answersSnapshot || snap); setAiSummary(makeSummary(baseline, (plan as any)?.buckets||[])); } else { setAiSummary(undefined); } } catch { setAiSummary(undefined); }
			} else {
				const src = (snap && Object.keys(snap).length>0) ? snap : questionnaire;
				setLocal(buildPlan(src));
				setAiViewOn(false);
				setAiSummary(undefined);
			}
		} else {
			try {
				if (activePortfolioId) {
					const saved = getCustomSaved(activePortfolioId);
					if (saved) {
						setLocal(saved);
					} else {
						const savedOrigin = (plan as any)?.origin;
						if (savedOrigin === 'engine' || savedOrigin === 'ai') {
							setLocal(plan);
						} else {
							const src = (snap && Object.keys(snap).length>0) ? snap : questionnaire;
							setLocal(buildPlan(src));
						}
					}
				}
			} catch { try { const src = (snap && Object.keys(snap).length>0) ? snap : questionnaire; setLocal(buildPlan(src)); } catch { setLocal(plan); } }
		}
		setAnswersDrift(false);
		setAdvisorPins({});
	}

	async function handleSaveClick() {
		const pruneAlloc = (p:any)=> ({riskLevel:p?.riskLevel, buckets:(p?.buckets||[]).map((b:any)=>({class:b.class, pct:b.pct}))});
					const snapshot = questionnaire; // Simplified - no pruning needed
		const answersDirty = makeAnswersSig(snapshot) !== (((plan as any)?.answersSig) || "");
		const allocDirty = !!(local && plan && JSON.stringify(pruneAlloc(local)) !== JSON.stringify(pruneAlloc(plan)));
		const originDirty = (mode === 'custom' && ((plan as any)?.origin !== 'custom'));
		const dirty = answersDirty || allocDirty || originDirty;
		if (!dirty) { setToast({ msg: 'No changes to save', type: 'info' }); return; }
		if (!activePortfolioId || !local) return;
		const origin = mode === 'custom' ? 'custom' : (aiViewOn ? 'ai' : 'engine');
		if (mode === 'custom') {
			const typed = window.prompt("Custom mode: type CONFIRM to save off‑policy allocation.", "");
			if ((typed||"").toUpperCase() !== 'CONFIRM') { setToast({ msg: 'Save cancelled', type: 'info' }); return; }
		}
		const planToSave = { ...(local||{}), origin, offPolicy: mode==='custom', mode, answersSig: makeAnswersSig(snapshot), answersSnapshot: snapshot, policyVersion: 'v1' };
		await fetch('/api/portfolio/plan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolioId: activePortfolioId, plan: planToSave }) });
		setPlan(planToSave);
		try { if (activePortfolioId) {
			if (mode==='custom') { setCustomDraft(activePortfolioId, planToSave); setCustomLocks(activePortfolioId, customLocks || {}); (useApp.getState() as any).setCustomSaved(activePortfolioId, planToSave); }
			else { (useApp.getState() as any).setAdvisorSaved(activePortfolioId, planToSave); }
		} } catch {}
		setToast({ msg: 'Plan saved', type: 'success' });
	}

	// Handlers extracted from JSX
	const handleToggleAiView = () => {
		if (mode === 'custom') return;
		const sig = makeAnswersSig(questionnaire);
		if (!aiViewOn) {
			if (sig && aiCache[sig]) {
				setLocal((prev:any)=> ({ ...(prev||{}), buckets: aiCache[sig].buckets }));
				setAiSummary(makeSummary(buildPlan(questionnaire), aiCache[sig].buckets));
				setAiViewOn(true);
				setAiInfo({ rationale: aiCache[sig].explanation, confidence: aiInfo?.confidence });
				return;
			}
			(async ()=>{
				try {
					setAiLoading(true);
					const baseline = buildPlan(questionnaire);
					const res = await fetch('/api/plan/suggest?debug=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionnaire, baseline }) });
					if (!res.ok) {
						// Fallback to baseline if provider key missing or error
						setLocal(baseline);
						setAiInfo({ rationale: 'AI unavailable. Showing baseline recommendation.', confidence: undefined });
						setAiSummary(undefined);
						setAiViewOn(false);
						return;
					}
					const data = await res.json();
					if (data?.aiPlan?.buckets) {
						setLocal((prev:any)=> ({ ...(prev||{}), buckets: data.aiPlan.buckets }));
						setAiInfo({ rationale: data.explanation || data.rationale, confidence: data.confidence });
						setAiCache((prev)=> ({ ...prev, [sig]: { buckets: data.aiPlan.buckets, explanation: data.explanation || data.rationale } }));
						setAiSummary(makeSummary(baseline, data.aiPlan.buckets));
						setAiViewOn(true);
					} else {
						setLocal(baseline);
						setAiInfo({ rationale: 'AI did not return a plan. Showing baseline.', confidence: undefined });
						setAiSummary(undefined);
						setAiViewOn(false);
					}
				} catch {
					const baseline = buildPlan(questionnaire);
					setLocal(baseline);
					setAiInfo({ rationale: 'AI unavailable. Showing baseline recommendation.', confidence: undefined });
					setAiSummary(undefined);
					setAiViewOn(false);
				} finally { setAiLoading(false); }
			})();
		} else {
			const allocation = buildPlan(questionnaire);
			setLocal(allocation);
			setAiSummary(undefined);
			setAiViewOn(false);
		}
	};

	const handleChangeBucketPct = (idx: number, newPct: number) => {
		const next = { ...(local||{}) } as any;
		next.buckets = [...(local?.buckets||[])];
		if (!next.buckets[idx]) return;
		if (mode === 'custom') {
			const currentVal = Math.round(Number(next.buckets[idx].pct) || 0);
			const sumOthers = Math.round(((next.buckets||[]) as any[]).reduce((s:number,b:any,i:number)=> i===idx ? s : s + (Number(b.pct)||0), 0));
			const capValue = Math.max(0, Math.floor(100 - sumOthers));
			let target = Math.round(Number(newPct) || 0);
			if (target > currentVal) {
				const incAllowed = Math.max(0, capValue - currentVal);
				target = Math.min(target, currentVal + incAllowed);
				if (target < Math.round(Number(newPct)||0)) setToast({ msg: 'No free capacity left', type: 'info' });
			} else {
				target = Math.max(0, target);
			}
			next.buckets[idx] = { ...next.buckets[idx], pct: target };
			setLocal(next);
			return;
		}
		const changedClass = next.buckets[idx].class as any;
		const baseline = buildPlan(questionnaire);
		const baseBucket = (baseline?.buckets||[]).find((b:any)=> b.class === changedClass);
		// Extract min/max from new dynamic range object
		const rangeObj = baseBucket?.range;
		const rawBand: [number, number] = rangeObj && typeof rangeObj === 'object' && 'min' in rangeObj 
			? [rangeObj.min, rangeObj.max] 
			: [0, 100];
		const band: [number, number] = [Math.round(rawBand[0]||0), Math.round(rawBand[1]||100)];
		const currentVal = Math.round(Number(next.buckets[idx].pct) || 0);
		const sumOthers = Math.round(((next.buckets||[]) as any[]).reduce((s:number,b:any,i:number)=> i===idx ? s : s + (Number(b.pct)||0), 0));
		const capValue = Math.max(0, Math.floor(100 - sumOthers));
		const incBand = Math.max(0, band[1] - currentVal);
		const incByTotal = Math.max(0, capValue - currentVal);
		const incAllowed = Math.max(0, Math.min(incBand, incByTotal));
		let target = Math.round(Number(newPct) || 0);
		const increasing = target > currentVal;
		if (increasing) {
			target = Math.min(target, currentVal + incAllowed);
		} else {
			target = Math.max(target, band[0]);
		}
		target = Math.round(Math.max(band[0], Math.min(band[1], target)));
		if (increasing && target < Math.round(Number(newPct)||0)) setToast({ msg: 'No free capacity left', type: 'info' });
		next.buckets[idx] = { ...next.buckets[idx], pct: target };
		setLocal(next);
		setAdvisorPins(prev => ({ ...(prev||{}), [changedClass]: true }));
	};

	const handleModalDone = () => {
		const prev = questionnaire || {};
		const next = editAnswers || {};
		const changed = JSON.stringify(prev) !== JSON.stringify(next);
		if (changed) {
			const keys = Object.keys(next);
			for (const k of keys) setQuestionAnswer(k, next[k]);
			if (mode === 'advisor') {
				const allocation = buildPlan(next);
				setLocal(allocation);
				setAiInfo(null);
				setAiViewOn(false);
				setAnswersDrift(true);
			}
		}
		setAnswersOpen(false);
	};

	useEffect(() => {
		const origin = (plan as any)?.origin;
		if (plan && origin !== 'custom') setLocal(plan);
		setMode(origin === 'custom' ? 'custom' : 'advisor');
		const on = !!(plan && origin === 'ai');
		setAiViewOn(on);
		const sigSaved = (plan as any)?.answersSig;
		const sigNow = makeAnswersSig(questionnaire);
		const driftNow = !!(sigSaved && sigNow && sigSaved !== sigNow);
		setAnswersDrift(driftNow);
		if (driftNow) {
			// Do not override saved plan on initial load; just note drift and disable AI view
			setAiViewOn(false);
			setAiSummary(undefined);
			setAdvisorPins({});
		}
		if (on && sigSaved && sigSaved === sigNow && (plan as any)?.buckets) {
			const baseline = buildPlan(questionnaire);
			setAiSummary(makeSummary(baseline, (plan as any).buckets));
		}
		// Load using the same logic as Reset handler
		try {
			const snap = (plan as any)?.answersSnapshot || {};
			Object.keys(snap).forEach(k=> setQuestionAnswer(k, (snap as any)[k]));
			if ((plan as any)?.origin === 'custom' && activePortfolioId) {
				(async ()=>{
					try {
						const r = await fetch(`/api/portfolio/plan?portfolioId=${activePortfolioId}&variant=custom`);
						const d = await r.json();
						if (d?.plan?.buckets) { setLocal(d.plan); setCustomDraft(activePortfolioId, null); }
						else {
							const r2 = await fetch(`/api/portfolio/plan?portfolioId=${activePortfolioId}&variant=advisor`);
							const d2 = await r2.json();
							if (d2?.plan?.buckets) { setLocal(d2.plan); setCustomDraft(activePortfolioId, null); }
							else { const base = buildPlan(snap); setLocal(base); }
						}
					} catch { setLocal(plan); }
				})();
			} else if (plan) {
				setLocal(plan);
			}
		} catch {}
		setAdvisorPins({});
	}, [plan]);

	useEffect(() => {
		if (!activePortfolioId) return;
		let cancelled = false;
		(async ()=>{
			try {
				// Fetch canonical last-saved plan first
				const ra = await fetch(`/api/portfolio/plan?portfolioId=${activePortfolioId}`);
				const da = await ra.json();
				const srv = da?.plan || null;
				if (cancelled) return;
				if (srv) {
					setPlan(srv);
					const origin = (srv as any)?.origin;
					if (origin === 'custom') {
						// Prefer saved custom snapshot; fallback to canonical
						try {
							const rc = await fetch(`/api/portfolio/plan?portfolioId=${activePortfolioId}&variant=custom`);
							const dc = await rc.json();
							if (!cancelled) setLocal(dc?.plan || srv);
						} catch { if (!cancelled) setLocal(srv); }
						setMode('custom');
						setAiViewOn(false);
					} else {
						// Advisor (engine/ai)
						setLocal(srv);
						setMode('advisor');
						const isAi = origin === 'ai';
						setAiViewOn(isAi);
						if (isAi) {
							try { const base = buildPlan(((srv as any)?.answersSnapshot) || questionnaire); setAiSummary(makeSummary(base, (srv as any)?.buckets||[])); } catch {}
						}
					}
					return;
				}
				// No saved plan yet; compute baseline
				const baseline = buildPlan(questionnaire);
				if (!cancelled) { setLocal(baseline); setPlan(baseline as any); setMode('advisor'); setAiViewOn(false); }
			} catch {}
		})();
		return () => { cancelled = true; };
	}, [activePortfolioId]);

	useEffect(() => {
		try {
			if (typeof window !== 'undefined') {
				const sp = new URLSearchParams(window.location.search);
				if (sp.get('goals') === 'open') setGoalsPanelOpen(true);
			}
		} catch {}
	}, []);

	function normalizeCustom(next: any, changedIndex: number, newPct: number) {
		const buckets = [...(next?.buckets||[])];
		if (!buckets[changedIndex]) return next;
		const order = buckets.map((b:any)=> b.class as string);
		// Apply new value to changed bucket
		buckets[changedIndex] = { ...buckets[changedIndex], pct: newPct };
		// Compute totals
		const lockedSet = new Set(Object.entries(customLocks).filter(([k,v])=> !!v).map(([k])=> k));
		const sumLocked = buckets.reduce((s:number,b:any)=> s + (lockedSet.has(b.class) ? (b.pct||0) : 0), 0);
		const unlockedIdx = buckets.map((b:any, i:number)=> (!lockedSet.has(b.class) && i!==changedIndex) ? i : -1).filter(i=> i>=0);
		const sumUnlockedOthers = unlockedIdx.reduce((s:number,i:number)=> s + (buckets[i].pct||0), 0);
		// Target for others
		let targetOthers = Math.max(0, 100 - newPct - sumLocked);
		if (unlockedIdx.length === 0) {
			// No adjustable others: scale changed back to fit
			const allowed = Math.max(0, 100 - sumLocked);
			buckets[changedIndex] = { ...buckets[changedIndex], pct: allowed };
			targetOthers = 100 - allowed - sumLocked;
		}
		// If sumUnlockedOthers zero but we have more than one unlocked including changed, scale all unlocked including changed
		if (sumUnlockedOthers <= 0 && unlockedIdx.length > 0) {
			const unlockedAll = buckets.map((b:any,i:number)=> (!lockedSet.has(b.class)) ? i : -1).filter(i=> i>=0);
			const sumUnlockedAll = unlockedAll.reduce((s:number,i:number)=> s + (buckets[i].pct||0), 0) || 1;
			const scaleAll = (100 - sumLocked) / sumUnlockedAll;
			for (const i of unlockedAll) buckets[i] = { ...buckets[i], pct: (buckets[i].pct||0) * scaleAll };
		}
		else if (sumUnlockedOthers > 0) {
			const scale = targetOthers / sumUnlockedOthers;
			for (const i of unlockedIdx) buckets[i] = { ...buckets[i], pct: (buckets[i].pct||0) * scale };
		}
		// Largest remainder rounding preserving locked exact integers
		const cont = buckets.map((b:any)=> ({ class: b.class as string, v: b.pct||0 }));
		const floors = cont.map((x:any)=> {
			const locked = lockedSet.has(x.class);
			const fv = locked ? Math.round(x.v) : Math.floor(x.v);
			const rem = locked ? -1 : (x.v - Math.floor(x.v));
			return { class: x.class as string, f: fv, r: rem };
		});
		let leftover = 100 - floors.reduce((s,c)=> s + c.f, 0);
		floors.sort((a,b)=> (b.r - a.r) || (order.indexOf(a.class) - order.indexOf(b.class)));
		for (let i=0;i<floors.length && leftover>0;i++){
			if (floors[i].r < 0) continue; // skip locked
			floors[i].f += 1; leftover--;
		}
		floors.sort((a,b)=> order.indexOf(a.class) - order.indexOf(b.class));
		const rounded = floors.map(x=> ({ class: x.class, pct: x.f }));
		return { ...(next||{}), buckets: rounded };
	}

	useEffect(() => {
		function onGoalsUpdated() {
			try {
				if (mode === 'advisor') {
					const allocation = buildPlan(questionnaire);
					setLocal(allocation);
					setAiViewOn(false);
					setAiSummary(undefined);
				}
			} catch {}
		}
		try { window.addEventListener('goals-updated', onGoalsUpdated as any); } catch {}
		return () => { try { window.removeEventListener('goals-updated', onGoalsUpdated as any); } catch {} };
	}, [mode, questionnaire]);

	if (!plan) {
		return (
			<div className="max-w-3xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>No Saved Allocation Plan</CardTitle>
						<CardDescription>Complete a short questionnaire to generate a personalized allocation plan.</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={() => router.push("/PortfolioManagement/Onboarding")}>
							Start Questionnaire
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

       return (
	       <div className="max-w-full space-y-4 pl-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Allocation Plan</div>
					{answersDrift ? (
						<span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px]">
							<span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
							<span className="text-amber-600">Profile edits not saved — plan recalculated</span>
						</span>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
						<Button size="sm" variant="outline" className={`rounded-none ${mode==='advisor' ? 'bg-indigo-600 text-white border-indigo-600' : ''}`} onClick={handleAdvisorClick}>
							<div className="flex flex-col items-start leading-tight">
								<span>Advisor</span>
								{mode==='advisor' ? <span className="text-[10px] opacity-80">Recommended</span> : null}
							</div>
						</Button>
						<Button size="sm" variant="outline" className={`rounded-none ${mode==='custom' ? 'bg-rose-600 text-white border-rose-600' : ''}`} onClick={handleCustomClick}>
							<div className="flex flex-col items-start leading-tight">
								<div className="flex items-center gap-1">
									<span>Custom</span>
									{mode==='custom' ? <ShieldOff className="h-3.5 w-3.5" /> : null}
								</div>
								{mode==='custom' ? <span className="text-[10px] opacity-80">No guardrails</span> : null}
							</div>
						</Button>
					</div>
					<Button variant="ghost" size="sm" aria-label="Reset" onClick={handleResetClick}>
						<RotateCcw className="h-4 w-4 text-rose-600" />
					</Button>
					<Button variant="outline" size="sm" leftIcon={<SaveIcon className="h-4 w-4" />} onClick={handleSaveClick}>
						<span className="inline-flex items-center gap-2">
							<span>Save Plan</span>
							{saveChip}
						</span>
					</Button>
				</div>
			</div>

			{/* Edit Answers Modal */}
			<Modal open={answersOpen} onClose={()=> setAnswersOpen(false)} title="Edit Answers" footer={(
				<>
					<Button variant="outline" onClick={()=> setAnswersOpen(false)}>Cancel</Button>
					<Button variant="outline" onClick={handleModalDone}>Done</Button>
				</>
			)}>
				<div className="space-y-3">
					<QuestionCard
						questionText={questions[ansStep].text}
						options={questions[ansStep].options as any}
						selected={editAnswers[questions[ansStep].key]}
						onChange={(value: any) => setEditAnswers((prev:any)=> ({ ...(prev||{}), [questions[ansStep].key]: value }))}
						multiSelect={questions[ansStep].key === 'avoidAssets' || questions[ansStep].key === 'emphasizeAssets'}
						helperText={(questions[ansStep] as any)?.helperText}
						maxSelect={(questions[ansStep] as any)?.maxSelect}
						compact
						type={(questions[ansStep] as any)?.type}
					/>
					<div className="flex items-center justify-between">
						<Button variant="outline" onClick={()=> setAnsStep(s=> Math.max(0, s-1))} disabled={ansStep===0}>Back</Button>
						<div className="flex items-center gap-2">
							<Button variant="outline" onClick={()=> setAnsStep(s=> Math.min(questions.length-1, s+1))} disabled={ansStep===questions.length-1}>Next</Button>
						</div>
					</div>
				</div>
			</Modal>

			{/* Enhanced KPI Dashboard */}
			<PlanKPIs 
				plan={local}
				holdings={holdings || []}
				className="mb-6"
			/>

			<PlanSummary
				plan={local}
				setGoalsPanelOpen={setGoalsPanelOpen}				onEditAnswers={()=>{ setEditAnswers({ ...(questionnaire||{}) }); setAnsStep(0); setAnswersOpen(true); }}
				onBuildBaseline={()=>{ const allocation = buildPlan(questionnaire); setLocal(allocation); setAiInfo(null); setAiSummary(undefined); setAiViewOn(false); setAnswersDrift(false); setAdvisorPins({}); }}
				onChangeBucketPct={handleChangeBucketPct}
				aiViewOn={aiViewOn}
				onToggleAiView={handleToggleAiView}
				aiLoading={aiLoading}
				aiExplanation={aiInfo?.rationale as any}
				aiSummary={aiSummary as any}
				mode={mode}
				aiDisabled={mode==='custom'}
				locks={customLocks}
				onToggleLock={(cls)=> { setLocalCustomLocks(prev=> ({ ...(prev||{}), [cls]: !prev?.[cls] })); try { if (activePortfolioId) setCustomLocks(activePortfolioId, { [cls]: !customLocks?.[cls] }); } catch {} }}
			/>

			{toast && (
				<div className={`fixed bottom-4 right-4 z-50 rounded-md border px-3 py-2 text-sm shadow-lg ${toast.type==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : toast.type==='info' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
					{toast.msg}
				</div>
			)}

                        <GoalsPanel
                                isOpen={goalsPanelOpen}
                                baselinePlan={local}
                                previewPlan={previewPlan}
                                onDraftGoalChanged={(g)=> setDraftGoal(g)}
                                onClose={() => {
                                        setGoalsPanelOpen(false);
                                        setDraftGoal(null);
                                        try {
                                                const allocation = buildPlan(getEnhancedQuestionnaire());
                                                setLocal(allocation);
                                                setAiViewOn(false);
                                                setAiSummary(undefined);
                                        } catch {}
                                }}
                                onGoalsUpdated={(goals) => {
                                        console.log("Goals updated:", goals);
                                        setDraftGoal(null);
                                        if (mode === "advisor") {
                                                const allocation = buildPlan(getEnhancedQuestionnaire());
                                                setLocal(allocation);
                                                setAiViewOn(false);
                                                setAiSummary(undefined);
                                        }
										   // Always dispatch event so PlanPage updates after edit/delete
										   try { window.dispatchEvent(new Event('goals-updated')); } catch {}
                                }}
                        />

                        {/* Mobile sticky action bar */}
                        <div className="md:hidden fixed bottom-14 left-0 right-0 z-30 px-3">
                          <div className="rounded-xl border border-border bg-card shadow flex items-center justify-between p-2">
                            <Button variant="outline" size="sm" onClick={()=> setGoalsPanelOpen(true)}>Add Goal</Button>
                            <Button size="sm" onClick={handleSaveClick}>Save Plan</Button>
                          </div>
                        </div>
		</div>
	);
}