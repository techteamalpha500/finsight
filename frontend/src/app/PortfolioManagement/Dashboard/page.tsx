"use client";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { useApp } from "../../store";
import { Doughnut, Bar } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
import { formatCurrency, formatNumber } from "../../utils/format";
import { computeRebalance } from "../domain/rebalance";
import { ArrowUpRight, ArrowDownRight, PlusCircle, Target, PieChart, LineChart, TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw } from "lucide-react";
import RiskProfile from "../components/RiskProfile";
import { calculateFinancialOverview, type FinancialOverview } from "../../../lib/financialOverview";

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function DashboardPage() {
	const { holdings, plan, driftTolerancePct, profile } = useApp();
	const currency = profile.currency || "INR";
	const [financialOverview, setFinancialOverview] = useState<FinancialOverview | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

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

	// Load financial overview
	useEffect(() => {
		loadFinancialOverview();
	}, []);

	const loadFinancialOverview = async () => {
		try {
			setLoading(true);
			const overview = await calculateFinancialOverview();
			setFinancialOverview(overview);
		} catch (error) {
			console.error('Error loading financial overview:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		await loadFinancialOverview();
		setRefreshing(false);
	};

	if (loading) {
		return (
			<div className="max-w-full space-y-4 pl-2">
				<div className="flex items-center justify-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
						<div className="text-muted-foreground">Loading dashboard...</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-full space-y-4 pl-2">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Dashboard</div>
					{refreshing && (
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
					)}
				</div>
				<Button 
					onClick={handleRefresh}
					variant="outline" 
					size="sm"
					disabled={refreshing}
					leftIcon={refreshing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <RefreshCw size={16} />}
				>
					{refreshing ? 'Refreshing...' : 'Refresh'}
				</Button>
			</div>
			
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<KPI title="Current Value" value={formatCurrency(totalCurrent, currency)} icon={<PieChart className="h-5 w-5 text-indigo-600" />} />
				<KPI title="Invested" value={formatCurrency(totalInvested, currency)} icon={<Target className="h-5 w-5 text-emerald-600" />} />
				<KPI title="P/L" value={`${formatCurrency(pnl, currency)} (${formatNumber(pnlPct, 2)}%)`} icon={pnl >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-600" /> : <ArrowDownRight className="h-5 w-5 text-rose-600" />} valueClassName={pnl >= 0 ? "text-emerald-700" : "text-rose-700"} />
				{financialOverview && (
					<KPI 
						title="Net Worth" 
						value={formatCurrency(financialOverview.netWorth, currency)} 
						icon={<DollarSign className="h-5 w-5 text-purple-600" />} 
						valueClassName={financialOverview.netWorth >= 0 ? "text-purple-700" : "text-red-700"}
					/>
				)}
			</div>

			{/* Financial Health Overview */}
			{financialOverview && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card className="bg-emerald-900/40 border border-emerald-800">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs text-muted-foreground">Financial Health</p>
									<p className="text-lg font-bold text-emerald-400">
										{financialOverview.financialHealth.healthStatus}
									</p>
									<p className="text-xs text-muted-foreground">
										Score: {financialOverview.financialHealth.healthScore.toFixed(0)}/100
									</p>
								</div>
								<BarChart3 className="w-5 h-5 text-emerald-400" />
							</div>
						</CardContent>
					</Card>

					<Card className="bg-blue-900/40 border border-blue-800">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs text-muted-foreground">Monthly Cash Flow</p>
									<p className={`text-lg font-bold ${financialOverview.insights.monthlyCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
										{formatCurrency(financialOverview.insights.monthlyCashFlow, currency)}
									</p>
									<p className="text-xs text-muted-foreground">
										Emergency Fund: {financialOverview.insights.emergencyFundMonths.toFixed(1)} months
									</p>
								</div>
								<TrendingUp className="w-5 h-5 text-blue-400" />
							</div>
						</CardContent>
					</Card>

					<Card className="bg-red-900/40 border border-red-800">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs text-muted-foreground">Total Debt</p>
									<p className="text-lg font-bold text-red-400">
										{formatCurrency(financialOverview.repayments.totalOutstanding, currency)}
									</p>
									<p className="text-xs text-muted-foreground">
										Monthly EMI: {formatCurrency(financialOverview.repayments.totalMonthlyEMI, currency)}
									</p>
								</div>
								<TrendingDown className="w-5 h-5 text-red-400" />
							</div>
						</CardContent>
					</Card>
				</div>
			)}

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

			{/* Quick Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Actions</CardTitle>
					<CardDescription>Manage your financial portfolio</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<Button 
							variant="outline" 
							className="h-auto p-4 flex flex-col items-center gap-2"
							onClick={() => window.location.href = '/PortfolioManagement/FinancialOverview'}
						>
							<BarChart3 className="w-6 h-6 text-purple-600" />
							<div className="text-center">
								<div className="font-medium">Financial Overview</div>
								<div className="text-xs text-muted-foreground">Complete financial picture</div>
							</div>
						</Button>

						<Button 
							variant="outline" 
							className="h-auto p-4 flex flex-col items-center gap-2"
							onClick={() => window.location.href = '/PortfolioManagement/Portfolio/Holdings'}
						>
							<TrendingUp className="w-6 h-6 text-green-600" />
							<div className="text-center">
								<div className="font-medium">Manage Holdings</div>
								<div className="text-xs text-muted-foreground">Add or update investments</div>
							</div>
						</Button>

						<Button 
							variant="outline" 
							className="h-auto p-4 flex flex-col items-center gap-2"
							onClick={() => window.location.href = '/PortfolioManagement/Portfolio/NetWorth'}
						>
							<PieChart className="w-6 h-6 text-blue-600" />
							<div className="text-center">
								<div className="font-medium">Track Net Worth</div>
								<div className="text-xs text-muted-foreground">Assets & liabilities</div>
							</div>
						</Button>

						<Button 
							variant="outline" 
							className="h-auto p-4 flex flex-col items-center gap-2"
							onClick={() => window.location.href = '/PortfolioManagement/Portfolio/Repayments'}
						>
							<CreditCard className="w-6 h-6 text-red-600" />
							<div className="text-center">
								<div className="font-medium">Optimize Repayments</div>
								<div className="text-xs text-muted-foreground">Smart debt management</div>
							</div>
						</Button>
					</div>
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