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
  Filter,
  Download,
  Share,
  Settings,
  Award,
  Star,
  Trophy,
  Shield,
  Heart,
  Home,
  Car,
  CreditCard,
  Award as GoldAward
} from "lucide-react";
import { UltraSimpleLiabilityInput, EnhancedLoanStatus } from "../../../domain/Repaymentadvisor/repaymentEngine";
import { formatCurrency, formatPercentage } from "@/lib/smartRepayments";

interface VisualAnalyticsProps {
  liabilities: UltraSimpleLiabilityInput[];
  liabilityStatuses: EnhancedLoanStatus[];
}

export default function VisualAnalytics({ liabilities, liabilityStatuses }: VisualAnalyticsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '3m' | '6m' | '1y' | 'all'>('all');
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'optimization' | 'insights'>('overview');

  const calculateTotalInterest = () => {
    return liabilityStatuses.reduce((sum, status) => {
      if (status.emi > 0) {
        const monthlyRate = status.monthlyInterestAccrual / status.outstandingBalance;
        const remainingMonths = status.remainingMonths;
        return sum + (status.emi * remainingMonths - status.outstandingBalance);
      } else {
        return sum + (status.totalInterestAccrued || 0);
      }
    }, 0);
  };

  const getDebtByType = () => {
    const debtByType: Record<string, { amount: number; count: number; avgRate: number; color: string }> = {};
    
    liabilityStatuses.forEach((status, index) => {
      const liability = liabilities[index];
      const type = liability.type.replace('_', ' ').toUpperCase();
      
      if (!debtByType[type]) {
        debtByType[type] = { 
          amount: 0, 
          count: 0, 
          avgRate: 0,
          color: getTypeColor(liability.type)
        };
      }
      
      debtByType[type].amount += status.outstandingBalance;
      debtByType[type].count += 1;
      debtByType[type].avgRate += liability.interest_rate;
    });

    // Calculate average rates
    Object.keys(debtByType).forEach(type => {
      debtByType[type].avgRate = debtByType[type].avgRate / debtByType[type].count;
    });

    return debtByType;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'home_loan': '#3B82F6',
      'car_loan': '#10B981',
      'personal_loan': '#8B5CF6',
      'credit_card': '#EF4444',
      'gold_loan': '#F59E0B',
      'education_loan': '#6366F1',
      'other': '#6B7280'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'home_loan': return <Home className="w-4 h-4" />;
      case 'car_loan': return <Car className="w-4 h-4" />;
      case 'personal_loan': return <Heart className="w-4 h-4" />;
      case 'credit_card': return <CreditCard className="w-4 h-4" />;
      case 'gold_loan': return <GoldAward className="w-4 h-4" />;
      case 'education_loan': return <Star className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getOptimizationOpportunities = () => {
    const opportunities = [];
    
    // High interest rate opportunities
    const highInterestLiabilities = liabilities.filter((l, index) => l.interest_rate > 15);
    if (highInterestLiabilities.length > 0) {
      opportunities.push({
        type: 'refinance',
        title: 'High Interest Rate Refinancing',
        description: `${highInterestLiabilities.length} liability(ies) with rates above 15%`,
        potentialSavings: highInterestLiabilities.reduce((sum, l) => {
          const index = liabilities.indexOf(l);
          return sum + liabilityStatuses[index].outstandingBalance * 0.03;
        }, 0),
        priority: 'high',
        action: 'Consider refinancing at lower rates',
        icon: <Zap className="w-5 h-5" />
      });
    }

    // No EMI opportunities
    const noEMILiabilities = liabilityStatuses.filter(status => status.emi === 0);
    if (noEMILiabilities.length > 0) {
      opportunities.push({
        type: 'payment',
        title: 'Interest Accumulation Alert',
        description: `${noEMILiabilities.length} liability(ies) with no EMI`,
        potentialSavings: noEMILiabilities.reduce((sum, status) => {
          const liability = liabilities[liabilityStatuses.indexOf(status)];
          return sum + status.outstandingBalance * liability.interest_rate / 100 / 12;
        }, 0),
        priority: 'high',
        action: 'Start making regular payments',
        icon: <AlertTriangle className="w-5 h-5" />
      });
    }

    // Prepayment opportunities
    const prepaymentCandidates = liabilities.filter((l, index) => 
      l.interest_rate > 10 && liabilityStatuses[index].outstandingBalance > 50000
    );
    if (prepaymentCandidates.length > 0) {
      opportunities.push({
        type: 'prepayment',
        title: 'Prepayment Opportunities',
        description: `${prepaymentCandidates.length} liability(ies) suitable for prepayment`,
        potentialSavings: prepaymentCandidates.reduce((sum, l) => {
          const index = liabilities.indexOf(l);
          return sum + liabilityStatuses[index].outstandingBalance * 0.1;
        }, 0),
        priority: 'medium',
        action: 'Consider strategic prepayments',
        icon: <Target className="w-5 h-5" />
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
          {(['1m', '3m', '6m', '1y', 'all'] as const).map((timeframe) => (
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
          {(['overview', 'trends', 'optimization', 'insights'] as const).map((view) => (
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
              <div className="text-xs text-muted-foreground mb-1">Total Debt</div>
              <div className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">
                {formatCurrency(liabilityStatuses.reduce((sum, status) => sum + status.outstandingBalance, 0))}
              </div>
              <div className="text-[10px] text-muted-foreground">Outstanding</div>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <TrendingDown className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
              <div className="text-xs text-muted-foreground mb-1">Total Interest</div>
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-1">
                {formatCurrency(totalInterest)}
              </div>
              <div className="text-[10px] text-muted-foreground">To be paid</div>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-xs text-muted-foreground mb-1">Monthly EMIs</div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-1">
                {formatCurrency(liabilityStatuses.reduce((sum, status) => sum + status.emi, 0))}
              </div>
              <div className="text-[10px] text-muted-foreground">Per month</div>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <Percent className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-xs text-muted-foreground mb-1">Avg Interest Rate</div>
              <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-1">
                {formatPercentage(liabilities.length > 0 ? 
                  liabilities.reduce((sum, l) => sum + l.interest_rate, 0) / liabilities.length : 0)}
              </div>
              <div className="text-[10px] text-muted-foreground">Weighted avg</div>
            </div>
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
                  const percentage = (data.amount / liabilityStatuses.reduce((sum, status) => sum + status.outstandingBalance, 0)) * 100;
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div style={{ color: data.color }}>
                            {getTypeIcon(type.toLowerCase().replace(' ', '_'))}
                          </div>
                          <span className="font-medium text-foreground">{type}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(data.amount)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className="h-3 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: data.color
                          }}
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
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="text-blue-600 dark:text-blue-400">
                            {opportunity.icon}
                          </div>
                          <h4 className="font-semibold text-foreground">{opportunity.title}</h4>
                        </div>
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

      {/* Insights View */}
      {selectedView === 'insights' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span>AI-Powered Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  AI Insights Coming Soon
                </h3>
                <p className="text-muted-foreground">
                  Personalized recommendations and predictive analytics
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-gray-600" />
            <span>Export & Share</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline" className="flex-1">
              <Share className="w-4 h-4 mr-2" />
              Share Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}