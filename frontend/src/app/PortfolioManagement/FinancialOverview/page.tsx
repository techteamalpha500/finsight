"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Home, 
  Car, 
  PiggyBank, 
  Building2,
  Target,
  BarChart3,
  PieChart,
  Calculator,
  Lightbulb,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from "lucide-react";
import { 
  calculateFinancialOverview, 
  formatCurrency, 
  formatPercentage, 
  getHealthStatusColor, 
  getHealthStatusBgColor,
  type FinancialOverview 
} from "../../../lib/financialOverview";

export default function FinancialOverviewPage() {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = async () => {
    try {
      setError(null);
      const data = await calculateFinancialOverview();
      setOverview(data);
    } catch (err) {
      console.error('Error loading financial overview:', err);
      setError('Failed to load financial overview. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOverview();
  };

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-muted-foreground">Loading financial overview...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <Button onClick={loadOverview}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        <div className="text-center py-8">
          <div className="text-muted-foreground">No financial data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Financial Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive view of your financial health</p>
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

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-emerald-900/40 border border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Worth</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatCurrency(overview.netWorth)}
                </p>
              </div>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-900/40 border border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Assets</p>
                <p className="text-lg font-bold text-blue-400">
                  {formatCurrency(overview.totalAssets)}
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
                <p className="text-xs text-muted-foreground">Total Liabilities</p>
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(overview.totalLiabilities)}
                </p>
              </div>
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${getHealthStatusBgColor(overview.financialHealth.healthStatus)} border`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Financial Health</p>
                <p className={`text-lg font-bold ${getHealthStatusColor(overview.financialHealth.healthStatus)}`}>
                  {overview.financialHealth.healthStatus}
                </p>
                <p className="text-xs text-muted-foreground">
                  Score: {overview.financialHealth.healthScore.toFixed(0)}/100
                </p>
              </div>
              <Shield className="w-5 h-5 text-current" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Worth Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Net Worth Breakdown
            </CardTitle>
            <CardDescription>Your assets vs liabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assets</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(overview.totalAssets)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Liabilities</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(overview.totalLiabilities)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ 
                    width: `${overview.totalAssets > 0 ? (overview.totalLiabilities / overview.totalAssets) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm font-semibold">
                <span>Net Worth</span>
                <span className={overview.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(overview.netWorth)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debt Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Debt Analysis
            </CardTitle>
            <CardDescription>Your repayment obligations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Outstanding</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(overview.repayments.totalOutstanding)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly EMI</p>
                <p className="text-lg font-semibold text-orange-600">
                  {formatCurrency(overview.repayments.totalMonthlyEMI)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Avg Interest Rate</p>
                <p className="text-lg font-semibold">
                  {formatPercentage(overview.repayments.avgInterestRate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Loans</p>
                <p className="text-lg font-semibold">
                  {overview.repayments.count}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Debt-to-Asset Ratio</span>
                <span className="font-medium">
                  {formatPercentage(overview.financialHealth.debtToAssetRatio)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Cash Flow Analysis
            </CardTitle>
            <CardDescription>Monthly income vs expenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Monthly Cash Flow</p>
              <p className={`text-2xl font-bold ${overview.insights.monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(overview.insights.monthlyCashFlow)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Emergency Fund</span>
                <span className="font-medium">
                  {overview.insights.emergencyFundMonths.toFixed(1)} months
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Liquidity Ratio</span>
                <span className="font-medium">
                  {overview.financialHealth.liquidityRatio.toFixed(1)} months
                </span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Investment-to-Debt</span>
                <span className="font-medium">
                  {formatPercentage(overview.insights.investmentToDebtRatio)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Smart Recommendations
          </CardTitle>
          <CardDescription>AI-powered insights to improve your financial health</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.insights.recommendations.length > 0 ? (
            <div className="space-y-3">
              {overview.insights.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-1 bg-yellow-100 dark:bg-yellow-900/40 rounded">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                  </div>
                  <p className="text-sm text-foreground">{recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Your financial health looks great! No immediate recommendations.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Quick Actions
          </CardTitle>
          <CardDescription>Take action to improve your financial health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="text-xs text-muted-foreground">Manage assets & liabilities</div>
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