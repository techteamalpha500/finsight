"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Lightbulb, 
  Zap, 
  Award, 
  Star,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  DollarSign,
  Clock,
  Percent,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";
import { UltraSimpleLiabilityInput, EnhancedLoanStatus, LoanEngine } from "../../../domain/Repaymentadvisor/repaymentEngine";
import { formatCurrency, formatPercentage } from "@/lib/smartRepayments";

interface OptimizationDashboardProps {
  liabilities: UltraSimpleLiabilityInput[];
  liabilityStatuses: EnhancedLoanStatus[];
  engine: LoanEngine;
}

interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  type: 'snowball' | 'avalanche' | 'hybrid' | 'custom';
  totalSavings: number;
  payoffTime: number;
  monthlyPayment: number;
  priority: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export default function OptimizationDashboard({ 
  liabilities, 
  liabilityStatuses, 
  engine 
}: OptimizationDashboardProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [strategies, setStrategies] = useState<OptimizationStrategy[]>([]);

  React.useEffect(() => {
    if (liabilities.length > 0) {
      generateOptimizationStrategies();
    }
  }, [liabilities, liabilityStatuses]);

  const generateOptimizationStrategies = () => {
    const newStrategies: OptimizationStrategy[] = [];

    // Debt Avalanche Strategy (Highest Interest First)
    const avalancheStrategy = generateAvalancheStrategy();
    if (avalancheStrategy) newStrategies.push(avalancheStrategy);

    // Debt Snowball Strategy (Smallest Balance First)
    const snowballStrategy = generateSnowballStrategy();
    if (snowballStrategy) newStrategies.push(snowballStrategy);

    // Hybrid Strategy (Balanced Approach)
    const hybridStrategy = generateHybridStrategy();
    if (hybridStrategy) newStrategies.push(hybridStrategy);

    // Custom Strategy (Based on Risk Assessment)
    const customStrategy = generateCustomStrategy();
    if (customStrategy) newStrategies.push(customStrategy);

    setStrategies(newStrategies);
  };

  const generateAvalancheStrategy = (): OptimizationStrategy | null => {
    const sortedByInterest = [...liabilities].sort((a, b) => b.interest_rate - a.interest_rate);
    const totalSavings = calculateTotalSavings(sortedByInterest);
    const payoffTime = calculatePayoffTime(sortedByInterest);
    const monthlyPayment = calculateTotalMonthlyPayment();

    return {
      id: 'avalanche',
      name: 'Debt Avalanche',
      description: 'Pay highest interest rates first for maximum savings',
      type: 'avalanche',
      totalSavings,
      payoffTime,
      monthlyPayment,
      priority: 'high',
      recommendations: [
        'Focus on credit cards and high-interest loans first',
        'Continue making minimum payments on other debts',
        'Apply any extra money to the highest interest debt',
        'Refinance high-interest loans if possible'
      ]
    };
  };

  const generateSnowballStrategy = (): OptimizationStrategy | null => {
    const sortedByBalance = [...liabilityStatuses].sort((a, b) => a.outstandingBalance - b.outstandingBalance);
    const sortedLiabilities = sortedByBalance.map(status => 
      liabilities.find(l => l.type === status.loanCategory)!
    );
    const totalSavings = calculateTotalSavings(sortedLiabilities);
    const payoffTime = calculatePayoffTime(sortedLiabilities);
    const monthlyPayment = calculateTotalMonthlyPayment();

    return {
      id: 'snowball',
      name: 'Debt Snowball',
      description: 'Pay smallest balances first for quick wins',
      type: 'snowball',
      totalSavings,
      payoffTime,
      monthlyPayment,
      priority: 'medium',
      recommendations: [
        'Start with the smallest debt balance',
        'Celebrate each debt payoff for motivation',
        'Roll payments to next smallest debt',
        'Build momentum with quick victories'
      ]
    };
  };

  const generateHybridStrategy = (): OptimizationStrategy | null => {
    // Hybrid: High interest + manageable balances
    const hybridLiabilities = [...liabilities].sort((a, b) => {
      const aStatus = liabilityStatuses.find(s => s.loanCategory === a.type);
      const bStatus = liabilityStatuses.find(s => s.loanCategory === b.type);
      
      // Score: interest rate * 0.7 + (1/balance) * 0.3
      const aScore = a.interest_rate * 0.7 + (1 / (aStatus?.outstandingBalance || 1)) * 0.3;
      const bScore = b.interest_rate * 0.7 + (1 / (bStatus?.outstandingBalance || 1)) * 0.3;
      
      return bScore - aScore;
    });

    const totalSavings = calculateTotalSavings(hybridLiabilities);
    const payoffTime = calculatePayoffTime(hybridLiabilities);
    const monthlyPayment = calculateTotalMonthlyPayment();

    return {
      id: 'hybrid',
      name: 'Smart Hybrid',
      description: 'Balanced approach considering both interest and balance',
      type: 'hybrid',
      totalSavings,
      payoffTime,
      monthlyPayment,
      priority: 'high',
      recommendations: [
        'Balance high interest rates with manageable balances',
        'Focus on debts that can be paid off quickly',
        'Maintain motivation with regular wins',
        'Optimize for both savings and psychological benefits'
      ]
    };
  };

  const generateCustomStrategy = (): OptimizationStrategy | null => {
    // Custom: Based on risk assessment and user preferences
    const riskAdjustedLiabilities = [...liabilities].sort((a, b) => {
      const aStatus = liabilityStatuses.find(s => s.loanCategory === a.type);
      const bStatus = liabilityStatuses.find(s => s.loanCategory === b.type);
      
      // Risk score: credit card = 10, gold loan = 8, personal loan = 6, etc.
      const riskScores: Record<string, number> = {
        'credit_card': 10,
        'gold_loan': 8,
        'personal_loan': 6,
        'car_loan': 4,
        'home_loan': 2,
        'education_loan': 3
      };
      
      const aRisk = riskScores[a.type] || 5;
      const bRisk = riskScores[b.type] || 5;
      
      return bRisk - aRisk;
    });

    const totalSavings = calculateTotalSavings(riskAdjustedLiabilities);
    const payoffTime = calculatePayoffTime(riskAdjustedLiabilities);
    const monthlyPayment = calculateTotalMonthlyPayment();

    return {
      id: 'custom',
      name: 'Risk-First Strategy',
      description: 'Prioritize high-risk debts to improve credit health',
      type: 'custom',
      totalSavings,
      payoffTime,
      monthlyPayment,
      priority: 'medium',
      recommendations: [
        'Prioritize credit cards and unsecured loans',
        'Improve credit score by reducing high-risk debt',
        'Focus on debts that impact credit utilization',
        'Build better credit history for future loans'
      ]
    };
  };

  const calculateTotalSavings = (sortedLiabilities: UltraSimpleLiabilityInput[]): number => {
    // Simplified calculation - in reality, this would be more complex
    let totalSavings = 0;
    sortedLiabilities.forEach((liability, index) => {
      const status = liabilityStatuses.find(s => s.loanCategory === liability.type);
      if (status) {
        // Higher priority = more savings
        const priorityMultiplier = 1 - (index * 0.1);
        totalSavings += status.outstandingBalance * liability.interest_rate / 100 * priorityMultiplier;
      }
    });
    return totalSavings;
  };

  const calculatePayoffTime = (sortedLiabilities: UltraSimpleLiabilityInput[]): number => {
    // Simplified calculation
    const totalDebt = liabilityStatuses.reduce((sum, status) => sum + status.outstandingBalance, 0);
    const totalEMI = liabilityStatuses.reduce((sum, status) => sum + status.emi, 0);
    return totalEMI > 0 ? Math.ceil(totalDebt / totalEMI) : 0;
  };

  const calculateTotalMonthlyPayment = (): number => {
    return liabilityStatuses.reduce((sum, status) => sum + status.emi, 0);
  };

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'avalanche': return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'snowball': return <Target className="w-5 h-5 text-blue-600" />;
      case 'hybrid': return <Zap className="w-5 h-5 text-purple-600" />;
      case 'custom': return <Star className="w-5 h-5 text-green-600" />;
      default: return <Calculator className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>Optimization Strategies</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Choose the best strategy for your debt payoff journey. Each strategy is optimized for different goals and preferences.
            </p>
            
            {strategies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategies.map((strategy) => (
                  <Card 
                    key={strategy.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedStrategy === strategy.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedStrategy(strategy.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getStrategyIcon(strategy.type)}
                            <h4 className="font-semibold text-foreground">{strategy.name}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(strategy.priority)}`}>
                            {strategy.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{strategy.description}</p>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <p className="text-muted-foreground">Savings</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(strategy.totalSavings)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Payoff Time</p>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">
                              {strategy.payoffTime} months
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Monthly</p>
                            <p className="font-semibold text-purple-600 dark:text-purple-400">
                              {formatCurrency(strategy.monthlyPayment)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calculator className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Strategies Available
                </h3>
                <p className="text-muted-foreground">
                  Add liabilities to see optimization strategies
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Strategy Details */}
      {selectedStrategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <span>Strategy Details: {strategies.find(s => s.id === selectedStrategy)?.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const strategy = strategies.find(s => s.id === selectedStrategy);
              if (!strategy) return null;

              return (
                <div className="space-y-6">
                  {/* Strategy Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(strategy.totalSavings)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Savings</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {strategy.payoffTime}
                      </p>
                      <p className="text-sm text-muted-foreground">Months to Payoff</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(strategy.monthlyPayment)}
                      </p>
                      <p className="text-sm text-muted-foreground">Monthly Payment</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Action Plan</h4>
                    <div className="space-y-2">
                      {strategy.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                          <p className="text-sm text-foreground">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <Button className="flex-1">
                      <Target className="w-4 h-4 mr-2" />
                      Apply This Strategy
                    </Button>
                    <Button variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Detailed Plan
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Quick Optimization Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <span>Quick Optimization Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Refinancing</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Consider refinancing high-interest loans to lower rates
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Zap className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">Prepayments</h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Make extra payments to reduce interest and payoff time
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Award className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">Balance Transfers</h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    Transfer credit card balances to lower interest cards
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">Income Increase</h4>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Use extra income to accelerate debt payoff
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}