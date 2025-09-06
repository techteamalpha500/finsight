"use client";
import React from "react";
import { Card, CardContent } from "../../components/Card";

interface PlanKPIsProps {
  plan: any;
  holdings?: any[];
  className?: string;
}

export default function PlanKPIs({ plan, holdings = [], className = "" }: PlanKPIsProps) {
  if (!plan) return null;

  // Calculate KPIs
  const kpis = React.useMemo(() => {
    const buckets = plan.buckets || [];
    
    const equity = buckets
      		.filter((b: any) => ["Stocks", "Equity MF"].includes(b.class))
      .reduce((sum: number, b: any) => sum + (b.pct || 0), 0);
    
    const defensive = buckets
      .filter((b: any) => ["Debt", "Liquid"].includes(b.class))
      .reduce((sum: number, b: any) => sum + (b.pct || 0), 0);
    
    const satellite = buckets
      .filter((b: any) => ["Gold", "Real Estate"].includes(b.class))
      .reduce((sum: number, b: any) => sum + (b.pct || 0), 0);

    return {
      equity: Math.round(equity),
      defensive: Math.round(defensive),
      satellite: Math.round(satellite)
    };
  }, [plan]);

  return (
    <div className={`${className}`}>
      {/* KPI Dashboard - Matching existing design system */}
      <div className="grid grid-cols-4 gap-3">
        {/* Equity */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Equity</div>
          <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            {kpis.equity}%
          </div>
          <div className="text-[10px] text-muted-foreground">Growth Focus</div>
        </div>

        {/* Defensive */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Defensive</div>
          <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
            {kpis.defensive}%
          </div>
          <div className="text-[10px] text-muted-foreground">Stability</div>
        </div>

        {/* Satellite */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Satellite</div>
          <div className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-1">
            {kpis.satellite}%
          </div>
          <div className="text-[10px] text-muted-foreground">Diversification</div>
        </div>

        {/* Risk Profile */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Risk Profile</div>
          <div className="text-lg font-semibold text-foreground mb-1">
            {plan?.riskLevel || "—"}
          </div>
          <div className="text-[10px] text-muted-foreground">Tolerance Level</div>
        </div>
      </div>
    </div>
  );
}