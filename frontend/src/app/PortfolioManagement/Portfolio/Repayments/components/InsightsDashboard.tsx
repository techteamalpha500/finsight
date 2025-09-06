"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Clock,
  DollarSign,
  Percent,
  Calendar,
  Zap,
  Brain,
  Eye,
  Filter
} from "lucide-react";
import { SmartLiability, formatCurrency, formatPercentage } from "@/lib/smartRepayments";

interface InsightsDashboardProps {
  liabilities: SmartLiability[];
}

export default function InsightsDashboard({ liabilities }: InsightsDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '3m' | '6m' | '1y'>('1y');
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'optimization'>('overview');

  const calculateTotalInterest = () => {
    return liabilities.reduce((sum, liability) => {
      if (liability.emi_amount > 0) {
        const monthlyRate = liability.interest_rate / 100 / 12;
        const remainingMonths = calculateRemainingMonths(liability);
        return sum + (liability.emi_amount * remainingMonths - liability.outstanding_balance);
      } else {
        // For no-EMI loans, calculate accumulated interest
        const monthlyRate = liability.interest_rate / 100 / 12;
        const monthsElapsed = calculateMonthsElapsed(liability);
        return sum + (liability.outstanding_balance * monthlyRate * monthsElapsed);
      }
    }, 0);
  };

  const calculateRemainingMonths = (liability: SmartLiability) => {
    if (!liability.start_date || !liability.tenure_months || liability.emi_amount === 0) {
      return 60; // Default assumption
    }
    
    const startDate = new Date(liability.start_date);
    const currentDate = new Date();
    const monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (currentDate.getMonth() - startDate.getMonth());
    
    return Math.max(0, liability.tenure_months - monthsElapsed);
  };

  const calculateMonthsElapsed = (liability: SmartLiability) => {
    if (!liability.start_date) return 12; // Default assumption
    
    const startDate = new Date(liability.start_date);
    const currentDate = new Date();
    const monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (currentDate.getMonth() - startDate.getMonth());
    
    return Math.max(1, monthsElapsed);
  };

  const getDebtByType = () => {
    const debtByType: Record<string, { amount: number; count: number; avgRate: number }> = {};
    
    liabilities.forEach(liability => {
      const type = liability.type.replace('_', ' ').toUpperCase();
      if (!debtByType[type]) {
        debtByType[type] = { amount: 0, count: 0, avgRate: 0 };
      }
      debtByType[type].amount += liability.outstanding_balance;
      debtByType[type].count += 1;
      debtByType[type].avgRate += liability.interest_rate;
    });

    // Calculate average rates
    Object.keys(debtByType).forEach(type => {
      debtByType[type].avgRate = debtByType[type].avgRate / debtByType[type].count;
    });

    return debtByType;
  };

  const getOptimizationOpportunities = () => {
    const opportunities = [];
    
    // High interest rate opportunities
    const highInterestLiabilities = liabilities.filter(l => l.interest_rate > 15);
    if (highInterestLiabilities.length > 0) {
      opportunities.push({
        type: 'refinance',
        title: 'High Interest Rate Refinancing',
        description: `${highInterestLiabilities.length} liability(ies) with rates above 15%`,
        potentialSavings: highInterestLiabilities.reduce((sum, l) => sum + l.outstanding_balance * 0.03, 0),
        priority: 'high',
        action: 'Consider refinancing at lower rates'
      });
    }

    // No EMI opportunities
    const noEMILiabilities = liabilities.filter(l => l.emi_amount === 0);
    if (noEMILiabilities.length > 0) {
      opportunities.push({
        type: 'payment',
        title: 'Interest Accumulation Alert',
        description: `${noEMILiabilities.length} liability(ies) with no EMI`,
        potentialSavings: noEMILiabilities.reduce((sum, l) => sum + l.outstanding_balance * l.interest_rate / 100 / 12, 0),
        priority: 'high',
        action: 'Start making regular payments'
      });
    }

    // Prepayment opportunities
    const prepaymentCandidates = liabilities.filter(l => l.interest_rate > 10 && l.outstanding_balance > 50000);
    if (prepaymentCandidates.length > 0) {
      opportunities.push({
        type: 'prepayment',
        title: 'Prepayment Opportunities',
        description: `${prepaymentCandidates.length} liability(ies) suitable for prepayment`,
        potentialSavings: prepaymentCandidates.reduce((sum, l) => sum + l.outstanding_balance * 0.1, 0),
        priority: 'medium',
        action: 'Consider strategic prepayments'
      });
    }

    return opportunities;
  };

  const debtByType = getDebtByType();
  const totalInterest = calculateTotalInterest();
  const opportunities = getOptimizationOpportunities();

  return (
    <div className="space-y-6">
      {/* Timeframe and View Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
          {(['1m', '3m', '6m', '1y'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
          {(['overview', 'trends', 'optimization'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                selectedView === view
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(liabilities.reduce((sum, l) => sum + l.outstanding_balance, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Debt</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingDown className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalInterest)}
                </p>
                <p className="text-sm text-muted-foreground">Total Interest</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(liabilities.reduce((sum, l) => sum + l.emi_amount, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Monthly EMIs</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Percent className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {formatPercentage(liabilities.length > 0 ? 
                    liabilities.reduce((sum, l) => sum + l.interest_rate, 0) / liabilities.length : 0)}
                </p>
                <p className="text-sm text-muted-foreground">Avg Interest Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Debt Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                <span>Debt Distribution by Type</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(debtByType).map(([type, data]) => {
                  const percentage = (data.amount / liabilities.reduce((sum, l) => sum + l.outstanding_balance, 0)) * 100;
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{type}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(data.amount)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{data.count} liability{data.count > 1 ? 'ies' : ''}</span>
                        <span>Avg rate: {formatPercentage(data.avgRate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends View */}
      {selectedView === 'trends' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LineChart className="w-5 h-5 text-blue-600" />
                <span>Debt Payoff Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <LineChart className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Timeline Visualization Coming Soon
                </h3>
                <p className="text-muted-foreground">
                  Visual representation of your debt payoff journey over time
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Optimization View */}
      {selectedView === 'optimization' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-600" />
                <span>Optimization Opportunities</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {opportunities.map((opportunity, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            opportunity.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            opportunity.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {opportunity.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">{opportunity.type}</span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-1">{opportunity.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{opportunity.description}</p>
                        <p className="text-sm font-medium text-foreground mb-1">Action: {opportunity.action}</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                          Potential Savings: {formatCurrency(opportunity.potentialSavings)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Zap className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}