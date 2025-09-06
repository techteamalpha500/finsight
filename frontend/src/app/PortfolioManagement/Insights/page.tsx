"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { useApp } from "../../store";
import { computeRebalance } from "../domain/rebalance";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "../../components/Button";

export default function InsightsPage() {
  const { holdings, plan, driftTolerancePct, profile } = useApp();
  const currency = profile.currency || "INR";
  const result = useMemo(() => plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }, [holdings, plan, driftTolerancePct]);

  // Prepare data for bar chart
  const chartData = (result.items || []).map(item => ({
    class: item.class,
    drift: Math.abs(item.actualPct - item.targetPct),
    action: item.action,
    amount: item.amount,
    actualPct: item.actualPct,
    targetPct: item.targetPct
  }));

  return (
    <div className="max-w-full space-y-4 pl-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Insights</div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Drift & Rebalance Insights</CardTitle>
          <CardDescription>Visualize where your portfolio needs attention and take action.</CardDescription>
        </CardHeader>
        <CardContent>
          {plan && chartData.length > 0 ? (
            <div>
              <div className="w-full h-72 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <XAxis dataKey="class" stroke="#888" fontSize={13} />
                    <YAxis stroke="#888" fontSize={13} />
                    <Tooltip formatter={(value: number, name: string, props: any) => [`${value}% drift`, props.payload.action]} />
                    <Bar dataKey="drift" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.action === "Increase" ? "#6366f1" : "#f43f5e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chartData.map(item => (
                  <Card key={item.class} className="border-2 border-border">
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.class}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${item.action === "Increase" ? "bg-indigo-100 text-indigo-700" : "bg-rose-100 text-rose-700"}`}>{item.action}</span>
                        </div>
                        <div className="text-lg font-bold">{currency} {item.amount.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Actual: {item.actualPct}% &rarr; Target: {item.targetPct}%</div>
                        <div className="text-xs text-muted-foreground">Drift: {item.drift}%</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border p-6 text-center">
              <div className="text-lg font-semibold mb-1">All good!</div>
              <div className="text-muted-foreground text-sm">Your portfolio is within the drift tolerance.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

