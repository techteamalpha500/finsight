"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useApp } from "../../store";
import { computeRebalance } from "../domain/rebalance";
import { LineChart, Layers, Banknote, Coins, Home, Droplet, Edit3, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Target } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Modal } from "../../components/Modal";
import GoalsPanel from "./GoalsPanel";
import RiskProfile from "./RiskProfile";
import { transformText, transformRiskLevel, transformRiskScore, transformAllocationRange, transformStressTestResult } from "../domain/languageTransform";

export default function PlanSummary({ 
	plan, 
  setGoalsPanelOpen,
	onChangeBucketPct, 
	onEditAnswers, 
	onBuildBaseline, 
	aiViewOn, 
	onToggleAiView, 
	aiLoading, 
	aiExplanation, 
	aiSummary, 
	mode, 
	aiDisabled, 
	locks, 
	onToggleLock

}: { 
	plan: any; 
  setGoalsPanelOpen?: (open: boolean) => void;
	onChangeBucketPct?: (index: number, newPct: number) => void; 
	onEditAnswers?: () => void; 
	onBuildBaseline?: () => void; 
	aiViewOn?: boolean; 
	onToggleAiView?: () => void; 
	aiLoading?: boolean; 
	aiExplanation?: string; 
	aiSummary?: string; 
	mode?: string; 
	aiDisabled?: boolean; 
	locks?: Record<string, boolean>; 
	onToggleLock?: (cls: string) => void;
}) {
  const { holdings, driftTolerancePct, questionnaire, activePortfolioId } = useApp() as any;
  const [edgeHit, setEdgeHit] = useState<Record<string, { edge: 'min'|'max'; val: number } | null>>({});
  const [tipFor, setTipFor] = useState<string | null>(null);
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const router = useRouter();

  const [proposeMode, setProposeMode] = useState<'to-band'|'to-target'>("to-target");
  const [optCashOnly, setOptCashOnly] = useState(false);
  const [optTurnoverPct, setOptTurnoverPct] = useState(1);
  const [optUseGoals, setOptUseGoals] = useState(true);
  const [proposal, setProposal] = useState<any | null>(null);
  const [proposeLoading, setProposeLoading] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [rebalanceOn, setRebalanceOn] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  
  // Enhanced sections expand/collapse state
  const [rationaleExpanded, setRationaleExpanded] = useState(false);
  const [rebalanceExpanded, setRebalanceExpanded] = useState(false);
  const [rebalanceOptionsExpanded, setRebalanceOptionsExpanded] = useState(false);

  useEffect(()=>{
    let ignore = false;
    async function run() {
      if (!rebalanceOpen || !plan || !Array.isArray(plan?.buckets)) return;
      try {
        setProposeLoading(true); setProposeError(null);
        const res = await fetch('/api/portfolio/rebalance/propose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolioId: activePortfolioId,
            plan,
            holdings,
            mode: proposeMode,
            options: { cashOnly: optCashOnly, turnoverLimitPct: optTurnoverPct, considerGoals: optUseGoals },
          })
        });
        const data = await res.json();
        if (!ignore) setProposal(data);
      } catch (e:any) {
        if (!ignore) setProposeError(String(e?.message||e));
      } finally { if (!ignore) setProposeLoading(false); }
    }
    if (rebalanceOn) run();
    else setProposal(null);
    return ()=> { ignore = true; };
  }, [rebalanceOn, rebalanceOpen, proposeMode, optCashOnly, optTurnoverPct, plan, holdings, activePortfolioId]);

  const kpis = useMemo(() => {
    if (!plan) return { equity: 0, defensive: 0, satellite: 0 };
    
    // Calculate KPIs directly from the buckets that are displayed in the table
    let equity = 0, defensive = 0, satellite = 0;
    const satelliteBreakdown: any[] = [];
    const unclassifiedAssets: any[] = [];
    
    for (const bucket of (plan?.buckets || [])) {
      if (bucket.pct > 0) { // Only count positive allocations
        		if (bucket.class === "Stocks" || bucket.class === "Equity MF") {
          equity += bucket.pct;
        } else if (bucket.class === "Debt" || bucket.class === "Liquid") {
          defensive += bucket.pct;
        } else if (bucket.class === "Gold" || bucket.class === "Real Estate") {
          satellite += bucket.pct;
          satelliteBreakdown.push({ class: bucket.class, pct: bucket.pct });
        } else {
          // Track any unclassified assets
          unclassifiedAssets.push({ class: bucket.class, pct: bucket.pct });
        }
      }
    }
    
    // Calculate satellite assets for KPI display
    
    return { 
      equity: Math.round(equity), 
      defensive: Math.round(defensive), 
      satellite: Math.round(satellite) 
    };
  }, [plan]);

  const rebalance = useMemo(() => (plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }), [holdings, plan, driftTolerancePct]);

  const stress = useMemo(() => {
    try {
      const total = (rebalance as any).totalCurrentValue || holdings.reduce((s:any,h:any)=> s + (h.currentValue||0), 0);
      if (!plan || total <= 0) return null;
      		const eqPct = (plan.buckets||[]).filter((b:any)=> b.class==='Stocks' || b.class==='Equity MF').reduce((s:number,b:any)=> s + (b.pct||0), 0) / 100;
      const shock = 0.20; // 20% equity drop
      const impact = Math.round(total * eqPct * shock);
      const liquidPct = (plan.buckets||[]).find((b:any)=> b.class==='Liquid')?.pct || 0;
      const liquidAmt = Math.round((liquidPct/100) * total);
      // Placeholder monthly expense estimate: 3% of portfolio
      const monthly = Math.max(1, Math.round(total * 0.03 / 12));
      const months = Math.max(0, Math.floor(liquidAmt / monthly));
      return { impact, months, liquidAmt };
    } catch { return null; }
  }, [plan, holdings, rebalance]);

  const whyText = useMemo(() => {
    try {
      const ds = (plan as any)?.explain?.topDrivers || [];
      if (!ds.length) return '';
      const mapDriver = (d: string) => {
        if (d.includes('Near-term cap')) return 'We cap equity and prioritise safety due to short-term considerations.';
        if (d.includes('Near-term safety')) return 'We add more to Debt/Liquid to protect near-term needs.';
        if (d.includes('EF buffer')) return 'Liquid is set to cover emergency needs.';
        if (d.includes('Equity cap')) return 'Equity is kept within a safe range for your risk tolerance.';
        if (d.includes('Short horizon')) return 'Shorter horizon shifts a little from equity into safety.';
        if (d.includes('Long horizon')) return 'Longer horizon allows a small tilt towards growth.';
        if (d.includes('Retirement glide')) return 'Approaching retirement, we gradually reduce equity (glide path).';
        if (d.includes('Young capacity')) return 'Younger profile with capacity allows a modest equity tilt.';
        if (d.includes('Older safety')) return 'Older profile adds a touch more safety.';
        if (d.includes('Gold tilt')) return 'A small Gold allocation is kept as an inflation and shock hedge.';
        if (d.includes('Global equity cap')) return 'Equity is limited to stay within policy guardrails.';
        if (d.includes('Debt clamp->Liquid')) return 'Excess Debt flows into Liquid to keep balance.';
        if (d.includes('Debt minimum')) return 'We ensure a minimum level of Debt for stability.';
        if (d.includes('Equity floor')) return 'We maintain a sensible equity floor for long-term growth.';
        		if (d.includes('Beginner MF routing')) return 'As a beginner, equity is routed via diversified equity mutual funds rather than direct stocks.';
        return null;
      };
      const msgs: string[] = [];
      for (const d of ds) { const m = mapDriver(String(d.driver||'')); if (m && !msgs.includes(m)) msgs.push(m); if (msgs.length >= 4) break; }
      return msgs.join(' ');
    } catch { return ''; }
  }, [plan]);

  const kpiExtras = useMemo(()=>{
    const total = (rebalance as any)?.totalCurrentValue || 0;
    const reValue = (holdings||[]).filter((h:any)=> h.instrumentClass==='Real Estate').reduce((s:number,h:any)=> s + (h.currentValue||0), 0);
    const rePct = total>0 ? Math.round((reValue/total)*100) : 0;
    // Turnover and cost estimate
    const sells = (rebalance as any)?.items?.filter((it:any)=> it.action==='Reduce') || [];
    const turnover = total>0 ? Math.round((sells.reduce((s:number,it:any)=> s + (it.amount||0), 0)/total)*100) : 0;
    const assumedFriction = 0.004; // 0.4% blended friction heuristic
    const estCost = Math.round((turnover/100) * total * assumedFriction);
    return { rePct, turnover, estCost };
  }, [rebalance, holdings]);

  function displayRange(range?: [number, number]) { if (!range) return "—"; const [min, max] = range; const mi = Math.round(min); const ma = Math.round(max); return `${mi}% – ${ma}%`; }

  const avoidSet = useMemo(()=>{
    const v = (questionnaire?.avoidAssets);
    const arr = Array.isArray(v) ? v : (typeof v === 'string' && v ? [v] : []);
    return new Set(arr as string[]);
  }, [questionnaire]);

  const visibleBuckets = useMemo(()=> {
    const buckets = mode==='custom' ? (plan?.buckets||[]) : (plan?.buckets||[]).filter((b:any)=> !avoidSet.has(b.class));
    
    // Define consistent order for asset classes
    const assetClassOrder = ['Stocks', 'Equity MF', 'Debt', 'Liquid', 'Gold', 'Real Estate'];
    
    // Sort buckets by the defined order
    return buckets.sort((a: any, b: any) => {
      const aIndex = assetClassOrder.indexOf(a.class);
      const bIndex = assetClassOrder.indexOf(b.class);
      
      // If both are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the order array, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither is in the order array, maintain original order
      return 0;
    });
  }, [plan, avoidSet, mode]);

  async function handleAcceptProposal() {
    try {
      if (!activePortfolioId || !proposal) { setRebalanceOpen(false); return; }
      await fetch('/api/portfolio/rebalance/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioId: activePortfolioId, proposal })
      });
      setRebalanceOpen(false);
    } catch {
      setRebalanceOpen(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Allocation
              </CardTitle>
              <CardDescription className="text-xs">
                Target mix and details
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {mode !== 'custom' ? (
                <Button variant="outline" leftIcon={<Edit3 className="h-4 w-4 text-sky-600" />} onClick={onEditAnswers}>
                  Adjust Risk Profile
                </Button>
              ) : null}
              {mode !== 'custom' && (
                <Button variant="outline" leftIcon={<Target className="h-4 w-4 text-amber-600" />} onClick={()=> { if (setGoalsPanelOpen) setGoalsPanelOpen(true); else setGoalsOpen(true); }}>
                  Investment Goals
                </Button>
              )}
              {mode !== 'custom' ? (
                <div className="inline-flex items-center gap-2 ml-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-[11px] text-muted-foreground">
                    AI Assist
                  </span>
                  <button type="button" onClick={onToggleAiView} disabled={!!aiLoading || !!aiDisabled} className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${aiViewOn?"bg-gradient-to-r from-amber-500 via-fuchsia-500 to-indigo-600":"bg-muted"}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${aiViewOn?"translate-x-6":"translate-x-1"}`}></span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {plan ? (
            <>
            <div className="rounded-xl border border-border overflow-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-card sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3 text-muted-foreground">Asset Class</th>
                    <th className="py-2 px-3 text-muted-foreground text-right">Allocation</th>
                    <th className="py-2 px-3 text-muted-foreground">Adjust</th>
                    <th className="py-2 px-3 text-muted-foreground">Role</th>
                    <th className="py-2 px-3 text-muted-foreground">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBuckets.map((b: any, idx: number) => (
                    <tr key={b.class} className="border-t border-border/50">
                      <td className="py-2 px-3 font-medium"><span className="inline-flex items-center">{(() => { const common = "h-4 w-4 mr-2"; if (b.class === "Stocks") return <LineChart className={common} />; 		if (b.class === "Equity MF") return <Layers className={common} />; if (b.class === "Debt") return <Banknote className={common} />; if (b.class === "Gold") return <Coins className={common} />; if (b.class === "Real Estate") return <Home className={common} />; if (b.class === "Liquid") return <Droplet className={common} />; return <LineChart className={common} />; })()}{b.class}</span></td>
                      <td className="py-2 px-3 text-right">{Math.round(b.pct)}%</td>
                      <td className="py-2 px-3">
                        <div className="group flex items-center gap-2">
                          {(() => { const maxAllowed = 100; return (
                            <>
                              {(() => { const rawBand = (Array.isArray(b.range) ? b.range as [number,number] : [0,100]); const minBound = 0; const maxBound = mode==='custom' ? maxAllowed : 100; const bandMin = Math.round((Number(rawBand[0])||0)); const bandMax = Math.round((Number(rawBand[1])||100)); const valueNow = Number.isFinite(Number(b.pct)) ? Math.round(Number(b.pct)) : 0; const bandStart = Math.max(0, Math.min(100, bandMin)); const bandEnd = Math.max(0, Math.min(100, bandMax)); const cls = b.class; const isEdge = !!edgeHit?.[cls]; return (
                                <>
                                  <div className="relative w-full md:w-56">
                                    <input
                                      className={`w-full appearance-none range-line ${isEdge ? 'animate-shake' : ''}`}
                                      type="range"
                                      step={1}
                                      min={minBound}
                                      max={maxBound}
                                      value={valueNow}
                                      aria-label={`${b.class} allocation`}
                                      disabled={!!aiViewOn}
                                      style={mode!=='custom' ? ({ background: `linear-gradient(to right, rgba(120,120,120,0.18) 0%, rgba(120,120,120,0.18) ${bandStart}%, rgba(99,102,241,0.25) ${bandStart}%, rgba(99,102,241,0.25) ${bandEnd}%, rgba(120,120,120,0.18) ${bandEnd}%, rgba(120,120,120,0.18) 100%)` } as any) : undefined}
                                      onChange={(e)=>{
                                        const v = Math.round(Math.max(0, Math.min(mode==='custom' ? maxAllowed : 100, Number(e.target.value)||0)));
                                        if (mode !== 'custom' && (v < bandMin || v > bandMax)) {
                                          const edge = v < bandMin ? 'min' : 'max'; const val = v < bandMin ? bandMin : bandMax; setEdgeHit(prev => ({ ...(prev||{}), [cls]: { edge, val } })); setTimeout(()=> setEdgeHit(prev => ({ ...(prev||{}), [cls]: null }) ), 2000);
                                        }
                                        if (onChangeBucketPct) onChangeBucketPct((plan.buckets as any[]).findIndex((x:any)=> x.class===b.class), v);
                                      }}
                                    />
                                    {mode!=='custom' && edgeHit?.[cls] ? (
                                      <div className="absolute -bottom-5 right-0 text-[10px] px-2 py-0.5 rounded bg-rose-500 text-white shadow z-50">
                                        {edgeHit[cls]?.edge === 'max' ? `Max reached (${edgeHit[cls]?.val}%)` : `Min reached (${edgeHit[cls]?.val}%)`}
                                      </div>
                                    ) : null}
                                  </div>
                                  {mode==='custom' ? (
                                    (()=>{ const current = Math.round(Number(b.pct)||0); const sumOthersAll = ((plan?.buckets||[]) as any[]).reduce((s:any, x:any)=> s + (x.class !== b.class ? (Number(x.pct)||0) : 0), 0); const capValue = Math.max(0, Math.floor(100 - sumOthersAll)); const incAllowed = Math.max(0, capValue - current); return (<span className="text-[10px] text-muted-foreground whitespace-nowrap">free {Math.round(incAllowed)}%</span>); })()
                                  ) : null}
                                </>
                              ); })()}
                            </>
                          ); })()}
                        </div>
                      </td>
                      		<td className="py-2 px-3">{b.riskCategory || (b.class === 'Stocks' || b.class === 'Equity MF' ? 'Core' : (b.class === 'Gold' || b.class === 'Real Estate' ? 'Satellite' : (b.class === 'Debt' || b.class === 'Liquid' ? 'Defensive' : '')))}</td>
                      		<td className="py-2 px-3">{b.notes || (b.class === 'Stocks' ? 'Growth focus' : b.class === 'Equity MF' ? 'Diversified equity' : b.class === 'Debt' ? 'Stability & income' : b.class === 'Liquid' ? 'Emergency buffer' : b.class === 'Gold' ? 'Inflation hedge' : b.class === 'Real Estate' ? 'Long-term asset' : '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {aiViewOn ? (
              <div className="mt-3 rounded-md border border-border p-3">
                <div className="text-xs font-semibold mb-1">AI recommendation</div>
                {aiSummary ? (
                  <div className="text-xs">
                    {aiSummary}
                  </div>
                ) : null}
                {aiExplanation ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">{aiExplanation}</div>
                ) : null}
              </div>
            ) : null}

            {/* Stress check removed for Advisor/AI/engine view as per requirements. */}
            </>
          ) : (
            <div className="text-muted-foreground text-sm">No plan yet.</div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Why This Mix - Right after allocation table */}
      {mode !== 'custom' && plan?.rationale && (Array.isArray(plan.rationale) ? plan.rationale.length > 0 : plan.rationale.length > 100) && (
        <Card className="mt-4">
          <CardHeader 
            className="cursor-pointer" 
            onClick={() => setRationaleExpanded(!rationaleExpanded)}
          >
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-blue-500" />
                Why This Mix?
              </div>
              {rationaleExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          {rationaleExpanded && (
            <CardContent>
              {Array.isArray(plan.rationale) ? (
                <div className="space-y-2">
                  {plan.rationale.map((reason: string, index: number) => (
                    <div key={index} className="text-xs text-muted-foreground leading-relaxed p-2 bg-muted/20 rounded">
                      {reason}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {plan.rationale}
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

  {/* Rebalancing Suggestions moved to Insights view. */}

      <Modal open={rebalanceOpen} onClose={()=> setRebalanceOpen(false)} title="Rebalance Proposal" footer={(
        <>
          <Button variant="outline" onClick={()=> setRebalanceOpen(false)}>Close</Button>
          <Button disabled={proposeLoading || !(proposal?.trades||[]).length} onClick={handleAcceptProposal}>Accept</Button>
        </>
      )}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">Mode</div>
            <div className="inline-flex items-center gap-2">
              <span className="px-2 py-0.5 rounded border border-border bg-muted">Proposal</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">Options</div>
            <div className="inline-flex items-center gap-3">
              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={rebalanceOn} onChange={e=> setRebalanceOn(e.target.checked)} /> <span>Propose suggested rebalance</span></label>
              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={optUseGoals} onChange={e=> setOptUseGoals(e.target.checked)} /> <span>Use goals</span></label>
              <label className="inline-flex items-center gap-1"><input type="checkbox" checked={optCashOnly} onChange={e=> setOptCashOnly(e.target.checked)} /> <span>Contributions only</span></label>
              <label className="inline-flex items-center gap-1">Turnover cap <input type="number" min={0} max={10} className="w-14 rounded border border-border bg-background px-1 py-0.5" value={optTurnoverPct} onChange={e=> setOptTurnoverPct(Math.max(0, Math.min(10, Math.round(Number(e.target.value)||0))))} />%</label>
            </div>
          </div>
          {proposeError ? <div className="text-[11px] text-rose-600">{proposeError}</div> : null}
          {proposeLoading ? <div className="text-xs text-muted-foreground">Computing proposal…</div> : null}
          {proposal?.constraints ? (
            <div className="text-[11px] text-muted-foreground">Constraints applied: EF {Number(proposal.constraints.efMonths||0)} months{Number(proposal.constraints.liquidityAmount||0)?`, liquidity ₹${proposal.constraints.liquidityAmount} over ${Number(proposal.constraints.liquidityMonths||0)} months`:''}{proposal.goalsCount?` · goals: ${proposal.goalsCount}`:''}</div>
          ) : (proposal?.goalsCount? <div className="text-[11px] text-muted-foreground">Goals considered: {proposal.goalsCount}</div> : null)}
          {proposal?.afterMix ? (
            <div className="mt-2 rounded-md border border-border p-2">
              <div className="text-xs font-medium mb-1">Suggested mix</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.keys(proposal.afterMix).map((k)=> (
                  <div key={`mix-${k}`} className="flex items-center justify-between"><span>{k}</span><span>{Math.round(Number(proposal.afterMix[k]||0))}%</span></div>
                ))}
              </div>
            </div>
          ) : null}
          {proposal?.trades?.length ? (
            <div className="space-y-2">
              {proposal.trades.map((it:any)=> (
                <div key={`prop-${it.class}`} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{it.class}</div>
                    <div className={it.action==='Increase' ? 'text-indigo-600' : 'text-rose-600'}>{it.action} {it.amount.toFixed(0)}</div>
                  </div>
                  <div className="mt-1 text-muted-foreground">{it.actualPct}% → {it.targetPct}% · reason: {it.reason}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">{proposeLoading?"" : "No actions needed. Portfolio within comfort bands."}</div>
          )}
          {proposal?.rationale ? <div className="text-[11px] text-muted-foreground">{proposal.rationale}</div> : null}
        </div>
      </Modal>

      {/* Rebalance Options Section */}
      {/* Rebalance Options Section */}
      <Card className="mt-4">
        <CardHeader 
          className="cursor-pointer" 
          onClick={() => setRebalanceOptionsExpanded(!rebalanceOptionsExpanded)}
        >
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-green-500" />
              Rebalance Options
            </div>
            {rebalanceOptionsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
          <CardDescription className="text-xs">
            Configure rebalancing preferences and proposals
          </CardDescription>
        </CardHeader>
        {rebalanceOptionsExpanded && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="text-muted-foreground">Options</div>
              <div className="inline-flex items-center gap-3">
                <label className="inline-flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    checked={rebalanceOn} 
                    onChange={e=> setRebalanceOn(e.target.checked)} 
                  /> 
                  <span>Propose suggested rebalance</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    checked={optUseGoals} 
                    onChange={e=> setOptUseGoals(e.target.checked)} 
                  /> 
                  <span>Use goals</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    checked={optCashOnly} 
                    onChange={e=> setOptCashOnly(e.target.checked)} 
                  /> 
                  <span>Contributions only</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  Turnover cap 
                  <input 
                    type="number" 
                    min={0} 
                    max={10} 
                    className="w-14 rounded border border-border bg-background px-1 py-0.5" 
                    value={optTurnoverPct} 
                    onChange={e=> setOptTurnoverPct(Math.max(0, Math.min(10, Math.round(Number(e.target.value)||0))))} 
                  />%
                </label>
              </div>
            </div>
            
            {proposeError && (
              <div className="text-[11px] text-rose-600">{proposeError}</div>
            )}
            
            {proposeLoading && (
              <div className="text-xs text-muted-foreground">Computing proposal…</div>
            )}
            
            {proposal?.constraints && (
              <div className="text-[11px] text-muted-foreground">
                Constraints applied: EF {Number(proposal.constraints.efMonths||0)} months
                {Number(proposal.constraints.liquidityAmount||0) ? 
                  `, liquidity ₹${proposal.constraints.liquidityAmount} over ${Number(proposal.constraints.liquidityMonths||0)} months` : ''
                }
                {proposal.goalsCount ? ` · goals: ${proposal.goalsCount}` : ''}
              </div>
            )}
            
            {proposal?.goalsCount && !proposal?.constraints && (
              <div className="text-[11px] text-muted-foreground">Goals considered: {proposal.goalsCount}</div>
            )}
          </CardContent>
        )}
      </Card>

  <GoalsPanel isOpen={goalsOpen} onClose={()=> setGoalsOpen(false)} onGoalsUpdated={()=>{}} />
      <style jsx>{`
        @keyframes shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.3s linear; }
        .range-line { -webkit-appearance: none; appearance: none; height: 6px; background: transparent; outline: none; }
        .range-line:focus { outline: none; }
        .range-line::-webkit-slider-runnable-track { height: 6px; background: var(--muted, rgba(120,120,120,0.18)); border-radius: 9999px; }
        .range-line::-moz-range-track { height: 6px; background: var(--muted, rgba(120,120,120,0.18)); border-radius: 9999px; }
        .range-line::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; background: #4f46e5; border-radius: 9999px; border: 2px solid white; margin-top: -5px; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); }
        .range-line:disabled::-webkit-slider-thumb { background: #a1a1aa; }
        .range-line::-moz-range-thumb { width: 16px; height: 16px; background: #4f46e5; border: 2px solid white; border-radius: 9999px; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); }
        .range-line:disabled::-moz-range-thumb { background: #a1a1aa; }
        .range-line:hover::-webkit-slider-thumb { background: #6366f1; }
        .range-line:hover::-moz-range-thumb { background: #6366f1; }
      `}</style>
    </div>
  );
}