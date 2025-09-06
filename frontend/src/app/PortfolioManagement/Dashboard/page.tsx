"use client";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useApp } from "../../store";
import { Doughnut, Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
import { formatCurrency, formatNumber } from "../../utils/format";
import { computeRebalance } from "../domain/rebalance";
import { ArrowUpRight, ArrowDownRight, PlusCircle, Target, PieChart, LineChart } from "lucide-react";
import RiskProfile from "../components/RiskProfile";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function DashboardPage() {
	const { holdings, plan, driftTolerancePct, profile } = useApp();
	const currency = profile.currency || "INR";

	const { totalInvested, totalCurrent, pnl, pnlPct } = useMemo(() => {
		const invested = holdings.reduce((sum, h) => sum + (h.investedAmount || (h.units && h.price ? h.units * h.price : 0)), 0);
		const current = holdings.reduce((sum, h) => sum + (h.currentValue || (h.units && h.price ? h.units * h.price : 0)), 0);
		const p = current - invested;
		const pPct = invested > 0 ? (p / invested) * 100 : 0;
		return { totalInvested: invested, totalCurrent: current, pnl: p, pnlPct: pPct };
	}, [holdings]);

	const donutData = useMemo(() => {
		if (!plan) return null;
		return {
			labels: plan.buckets.map(b => b.class),
			datasets: [{
				data: plan.buckets.map(b => b.pct),
				backgroundColor: ["#6366f1", "#10b981", "#f59e42", "#fbbf24", "#3b82f6", "#ef4444", "#a3e635"],
				borderWidth: 2,
				borderColor: "#fff",
			}],
		};
	}, [plan]);

	const { barLabels, barTarget, barActual } = useMemo(() => {
		if (!plan) return { barLabels: [], barTarget: [], barActual: [] };
		const classToValue = new Map<string, number>();
		for (const h of holdings) {
			const val = h.currentValue || (h.units && h.price ? h.units * h.price : 0);
			classToValue.set(h.instrumentClass, (classToValue.get(h.instrumentClass) || 0) + val);
		}
		const total = Array.from(classToValue.values()).reduce((a, b) => a + b, 0);
		const labels = plan.buckets.map(b => b.class);
		const target = plan.buckets.map(b => b.pct);
		const actual = labels.map(lbl => total > 0 ? +(((classToValue.get(lbl) || 0) / total) * 100).toFixed(2) : 0);
		return { barLabels: labels, barTarget: target, barActual: actual };
	}, [plan, holdings]);

	const barData = {
		labels: barLabels,
		datasets: [
			{ label: "Target %", data: barTarget, backgroundColor: "rgba(99,102,241,0.5)" },
			{ label: "Actual %", data: barActual, backgroundColor: "rgba(16,185,129,0.5)" },
		],
	};
	const barOptions = {
		plugins: { legend: { position: "bottom" as const, labels: { font: { size: 12 } } } },
		responsive: true,
		maintainAspectRatio: false,
		scales: { y: { beginAtZero: true, max: 100 } },
	};

	const rebalance = useMemo(() => plan ? computeRebalance(holdings, plan, driftTolerancePct) : { items: [], totalCurrentValue: 0 }, [holdings, plan, driftTolerancePct]);

	return (
		<div className="max-w-full space-y-4 pl-2">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Dashboard</div>
				</div>
			</div>
			
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPI title="Current Value" value={formatCurrency(totalCurrent, currency)} icon={<PieChart className="h-5 w-5 text-indigo-600" />} />
				<KPI title="Invested" value={formatCurrency(totalInvested, currency)} icon={<Target className="h-5 w-5 text-emerald-600" />} />
				<KPI title="P/L" value={`${formatCurrency(pnl, currency)} (${formatNumber(pnlPct, 2)}%)`} icon={pnl >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-600" /> : <ArrowDownRight className="h-5 w-5 text-rose-600" />} valueClassName={pnl >= 0 ? "text-emerald-700" : "text-rose-700"} />
				<div className="flex gap-2">
					<Button variant="outline" size="sm" className="w-full" leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => window.location.assign("/PortfolioManagement/AddHolding")}>Add Holding</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Target Allocation</CardTitle>
						<CardDescription>Your plan's target mix</CardDescription>
					</CardHeader>
					<CardContent>
						{plan && donutData ? (
							<div className="mx-auto h-72 max-w-sm"><Doughnut data={donutData} options={{ plugins: { legend: { position: "bottom" as const, labels: { font: { size: 12 } } } }, cutout: "70%" }} /></div>
						) : (
							<div className="text-slate-500">No plan yet. Go to Onboarding to create one.</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Current vs Target</CardTitle>
						<CardDescription>Compare your actual allocation with target</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							{plan ? (
								<Bar data={barData} options={barOptions as any} />
							) : (
								<div className="text-slate-500">Add holdings and create a plan to see comparison.</div>
							)}
						</div>
					</CardContent>
				</Card>

				{plan && (plan.riskLevel || plan.riskScore) && (
					<RiskProfile 
						riskLevel={plan.riskLevel} 
						riskScore={plan.riskScore}
						className="h-fit"
					/>
				)}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Rebalancing Suggestions</CardTitle>
					<CardDescription>Based on drift tolerance of {driftTolerancePct}%</CardDescription>
				</CardHeader>
				<CardContent>
					{plan && rebalance.items.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{rebalance.items.map(item => (
								<Card key={item.class}>
									<CardContent>
										<div className="flex items-center justify-between">
											<div>
												<div className="text-sm text-slate-500">{item.class}</div>
												<div className="text-lg font-semibold">{item.action} {formatCurrency(item.amount, currency)}</div>
											</div>
											<div className="text-sm text-slate-600">{item.actualPct}% → {item.targetPct}%</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<div className="text-slate-500">{holdings.length === 0 ? "Add holdings to see suggestions." : "All good! No rebalancing needed."}</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function KPI({ title, value, icon, valueClassName = "" }: { title: string; value: string; icon?: React.ReactNode; valueClassName?: string }) {
	return (
		<Card>
			<CardContent>
				<div className="flex items-center justify-between">
					<div>
						<div className="text-sm text-slate-500 flex items-center gap-2">{icon}{title}</div>
						<div className={`text-xl font-semibold ${valueClassName}`}>{value}</div>
					</div>
					<LineChart className="h-8 w-8 text-slate-300" />
				</div>
			</CardContent>
		</Card>
	);
}