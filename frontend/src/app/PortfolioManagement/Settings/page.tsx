"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/Card";
import { useApp } from "../../store";

export default function SettingsPage() {
  const { driftTolerancePct, setDriftTolerancePct, emergencyMonths, setEmergencyMonths } = useApp();
  return (
    <div className="max-w-full space-y-4 pl-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Settings</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Rebalancing</CardTitle>
          <CardDescription>Set drift tolerance for suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Drift tolerance: {driftTolerancePct}%</label>
            <input type="range" min={3} max={10} value={driftTolerancePct} onChange={(e)=> setDriftTolerancePct(Number(e.target.value))} className="w-full"/>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Fund</CardTitle>
          <CardDescription>Months of expenses to hold in Liquid</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Emergency months: {emergencyMonths}</label>
            <input type="range" min={3} max={12} value={emergencyMonths} onChange={(e)=> setEmergencyMonths(Number(e.target.value))} className="w-full"/>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

