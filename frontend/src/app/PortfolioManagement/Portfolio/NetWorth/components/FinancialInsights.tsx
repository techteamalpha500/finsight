"use client";
import React from "react";
import { Card } from "@/app/components/Card";
import { Badge } from "@/app/components/Badge";
import { Progress } from "@/app/components/Progress";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Shield,
  Zap,
  Lightbulb,
  Calculator,
  BarChart3,
  PieChart,
  DollarSign,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  category: string;
  type: string;
  value: number;
  monthlyIncome?: number;
  interestRate?: number;
  purchaseDate?: string;
  maturityDate?: string;
  description?: string;
}

interface Liability {
  id: string;
  name: string;
  category: string;
  type: 'EMI' | 'Regular';
  principalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  startDate: string;
  endDate?: string;
  remainingMonths?: number;
  totalMonths?: number;
  description?: string;
}

interface FinancialInsightsProps {
  assets: Asset[];
  liabilities: Liability[];
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
}

export default function FinancialInsights({ assets, liabilities }: FinancialInsightsProps) {
  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.remainingAmount, 0);
  const netWorth = totalAssets - totalLiabilities;
  
  const monthlyIncome = assets.reduce((sum, asset) => sum + (asset.monthlyIncome || 0), 0);
  const monthlyPayments = liabilities.reduce((sum, liability) => sum + liability.monthlyPayment, 0);
  const monthlyCashFlow = monthlyIncome - monthlyPayments;
  
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  
  const cashAssets = assets.filter(asset => 
    asset.category === 'Cash & Equivalents' || asset.type === 'Bank Account'
  ).reduce((sum, asset) => sum + asset.value, 0);
  const liquidityRatio = monthlyPayments > 0 ? cashAssets / monthlyPayments : 0;
  
  // High interest debt analysis
  const highInterestDebt = liabilities.filter(l => l.interestRate > 15);
  const totalHighInterestDebt = highInterestDebt.reduce((sum, l) => sum + l.remainingAmount, 0);
  
  // EMI progress analysis
  const emiLoans = liabilities.filter(l => l.type === 'EMI');
  const totalEMIAmount = emiLoans.reduce((sum, l) => sum + l.monthlyPayment, 0);
  
  // Investment analysis
  const investmentAssets = assets.filter(asset => asset.category === 'Investments');
  const totalInvestmentValue = investmentAssets.reduce((sum, asset) => sum + asset.value, 0);
  const investmentRatio = totalAssets > 0 ? (totalInvestmentValue / totalAssets) * 100 : 0;
  
  // Emergency fund analysis
  const emergencyFundTarget = monthlyPayments * 6; // 6 months of expenses
  const emergencyFundRatio = emergencyFundTarget > 0 ? (cashAssets / emergencyFundTarget) * 100 : 0;
  
  // Generate insights
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];
    
    // High interest debt alert
    if (highInterestDebt.length > 0) {
      insights.push({
        id: 'high-interest-debt',
        type: 'error',
        title: 'High Interest Debt Alert',
        description: `You have ₹${totalHighInterestDebt.toLocaleString()} in high-interest debt (>15%). Prioritize paying these off first.`,
        action: 'Consider debt consolidation or aggressive repayment',
        priority: 'high',
        icon: <AlertTriangle className="w-5 h-5" />
      });
    }
    
    // Emergency fund analysis
    if (emergencyFundRatio < 50) {
      insights.push({
        id: 'emergency-fund-low',
        type: 'warning',
        title: 'Build Emergency Fund',
        description: `You have ${emergencyFundRatio.toFixed(0)}% of recommended emergency fund. Aim for 6 months of expenses (₹${emergencyFundTarget.toLocaleString()}).`,
        action: 'Start building emergency fund with surplus cash',
        priority: 'high',
        icon: <Shield className="w-5 h-5" />
      });
    } else if (emergencyFundRatio >= 100) {
      insights.push({
        id: 'emergency-fund-good',
        type: 'success',
        title: 'Strong Emergency Fund',
        description: `Excellent! You have ${emergencyFundRatio.toFixed(0)}% of recommended emergency fund.`,
        priority: 'low',
        icon: <CheckCircle className="w-5 h-5" />
      });
    }
    
    // Debt-to-asset ratio
    if (debtToAssetRatio > 50) {
      insights.push({
        id: 'high-debt-ratio',
        type: 'warning',
        title: 'High Debt-to-Asset Ratio',
        description: `Your debt-to-asset ratio is ${debtToAssetRatio.toFixed(1)}%. Consider reducing debt or increasing assets.`,
        action: 'Focus on debt reduction and asset building',
        priority: 'high',
        icon: <TrendingDown className="w-5 h-5" />
      });
    } else if (debtToAssetRatio < 30) {
      insights.push({
        id: 'good-debt-ratio',
        type: 'success',
        title: 'Healthy Debt-to-Asset Ratio',
        description: `Great debt management! Your ratio is ${debtToAssetRatio.toFixed(1)}%.`,
        priority: 'low',
        icon: <CheckCircle className="w-5 h-5" />
      });
    }
    
    // Cash flow analysis
    if (monthlyCashFlow < 0) {
      insights.push({
        id: 'negative-cash-flow',
        type: 'error',
        title: 'Negative Cash Flow',
        description: `Your monthly expenses exceed income by ₹${Math.abs(monthlyCashFlow).toLocaleString()}. This is unsustainable.`,
        action: 'Reduce expenses or increase income immediately',
        priority: 'high',
        icon: <AlertTriangle className="w-5 h-5" />
      });
    } else if (monthlyCashFlow > monthlyPayments * 0.5) {
      insights.push({
        id: 'positive-cash-flow',
        type: 'success',
        title: 'Strong Cash Flow',
        description: `Great cash flow! You have ₹${monthlyCashFlow.toLocaleString()} surplus monthly.`,
        action: 'Consider investing surplus in high-return assets',
        priority: 'medium',
        icon: <TrendingUp className="w-5 h-5" />
      });
    }
    
    // Investment diversification
    if (investmentRatio < 20 && totalAssets > 1000000) {
      insights.push({
        id: 'low-investment-ratio',
        type: 'info',
        title: 'Consider More Investments',
        description: `Only ${investmentRatio.toFixed(1)}% of your assets are in investments. Consider diversifying into mutual funds, stocks, or bonds.`,
        action: 'Start SIP in mutual funds or invest in equity',
        priority: 'medium',
        icon: <BarChart3 className="w-5 h-5" />
      });
    }
    
    // EMI optimization
    if (emiLoans.length > 3) {
      insights.push({
        id: 'too-many-emis',
        type: 'warning',
        title: 'Multiple EMI Loans',
        description: `You have ${emiLoans.length} EMI loans totaling ₹${totalEMIAmount.toLocaleString()}/month. Consider consolidating.`,
        action: 'Explore loan consolidation options',
        priority: 'medium',
        icon: <Calculator className="w-5 h-5" />
      });
    }
    
    // Prepayment opportunities
    const highInterestEMI = emiLoans.filter(l => l.interestRate > 10);
    if (highInterestEMI.length > 0 && monthlyCashFlow > 0) {
      insights.push({
        id: 'prepayment-opportunity',
        type: 'info',
        title: 'Prepayment Opportunity',
        description: `You have surplus cash flow. Consider prepaying high-interest loans to save on interest.`,
        action: 'Use surplus cash for loan prepayment',
        priority: 'medium',
        icon: <Zap className="w-5 h-5" />
      });
    }
    
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const insights = generateInsights();

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getInsightIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Worth</p>
              <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netWorth)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Cash Flow</p>
              <p className={`text-2xl font-bold ${monthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyCashFlow)}
              </p>
            </div>
            {monthlyCashFlow >= 0 ? 
              <ArrowUp className="w-8 h-8 text-green-600" /> : 
              <ArrowDown className="w-8 h-8 text-red-600" />
            }
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Debt Ratio</p>
              <p className="text-2xl font-bold text-orange-600">
                {debtToAssetRatio.toFixed(1)}%
              </p>
            </div>
            <Target className="w-8 h-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Emergency Fund</p>
              <p className="text-2xl font-bold text-blue-600">
                {emergencyFundRatio.toFixed(0)}%
              </p>
            </div>
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Financial Health Indicators */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Financial Health Indicators
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Debt-to-Asset Ratio</span>
                <span className="text-sm text-muted-foreground">{debtToAssetRatio.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(debtToAssetRatio, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {debtToAssetRatio < 30 ? 'Excellent' : 
                 debtToAssetRatio < 50 ? 'Good' : 
                 debtToAssetRatio < 70 ? 'Fair' : 'Needs Improvement'}
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Liquidity Ratio</span>
                <span className="text-sm text-muted-foreground">{liquidityRatio.toFixed(1)} months</span>
              </div>
              <Progress 
                value={Math.min((liquidityRatio / 6) * 100, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {liquidityRatio >= 6 ? 'Strong' : 
                 liquidityRatio >= 3 ? 'Adequate' : 'Needs Building'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Investment Ratio</span>
                <span className="text-sm text-muted-foreground">{investmentRatio.toFixed(1)}%</span>
              </div>
              <Progress 
                value={investmentRatio} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {investmentRatio >= 30 ? 'Well Diversified' : 
                 investmentRatio >= 20 ? 'Good' : 'Consider More Investments'}
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Emergency Fund</span>
                <span className="text-sm text-muted-foreground">{emergencyFundRatio.toFixed(0)}%</span>
              </div>
              <Progress 
                value={Math.min(emergencyFundRatio, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {emergencyFundRatio >= 100 ? 'Complete' : 
                 emergencyFundRatio >= 50 ? 'Building' : 'Needs Attention'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Smart Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Smart Insights & Recommendations
        </h3>
        
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-green-800">Excellent Financial Health!</h4>
              <p className="text-muted-foreground">Your financial situation looks great. Keep up the good work!</p>
            </div>
          ) : (
            insights.map(insight => (
              <div key={insight.id} className={`p-4 border rounded-lg ${getInsightColor(insight.type)}`}>
                <div className="flex items-start gap-3">
                  <div className={`${getInsightIconColor(insight.type)} mt-0.5`}>
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge 
                        variant={insight.priority === 'high' ? 'destructive' : 
                                insight.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {insight.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                    {insight.action && (
                      <p className="text-sm font-medium text-blue-700">
                        💡 {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span className="font-medium">EMI Calculator</span>
            </div>
            <p className="text-sm text-muted-foreground">Calculate EMI for new loans</p>
          </button>

          <button className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="font-medium">Set Financial Goals</span>
            </div>
            <p className="text-sm text-muted-foreground">Define and track your financial objectives</p>
          </button>

          <button className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Investment Planner</span>
            </div>
            <p className="text-sm text-muted-foreground">Plan your investment strategy</p>
          </button>

          <button className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-orange-600" />
              <span className="font-medium">Emergency Fund</span>
            </div>
            <p className="text-sm text-muted-foreground">Build your financial safety net</p>
          </button>

          <button className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="font-medium">Debt Reduction</span>
            </div>
            <p className="text-sm text-muted-foreground">Strategies to pay off debt faster</p>
          </button>

          <button className="p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              <span className="font-medium">Portfolio Analysis</span>
            </div>
            <p className="text-sm text-muted-foreground">Analyze your investment portfolio</p>
          </button>
        </div>
      </Card>
    </div>
  );
}