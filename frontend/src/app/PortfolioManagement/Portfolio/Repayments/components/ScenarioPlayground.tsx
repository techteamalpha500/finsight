"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { 
  Play, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  DollarSign,
  Percent,
  Calendar,
  Zap,
  ArrowRight,
  BarChart3,
  PieChart,
  LineChart,
  Lightbulb,
  Sparkles,
  Award,
  Star,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { UltraSimpleLiabilityInput, EnhancedLoanStatus, LoanEngine } from "../../../domain/Repaymentadvisor/repaymentEngine";
import { formatCurrency, formatPercentage } from "@/lib/smartRepayments";

interface ScenarioPlaygroundProps {
  liabilities: UltraSimpleLiabilityInput[];
  liabilityStatuses: EnhancedLoanStatus[];
  engine: LoanEngine;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'prepayment' | 'refinance' | 'consolidation' | 'extra_emi' | 'balance_transfer';
  parameters: any;
  results: {
    interestSaved: number;
    monthsReduced: number;
    totalSavings: number;
    newMonthlyPayment?: number;
    breakEvenMonths?: number;
  };
  priority: 'high' | 'medium' | 'low';
}

export default function ScenarioPlayground({ liabilities, liabilityStatuses, engine }: ScenarioPlaygroundProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [customRate, setCustomRate] = useState<number>(0);

  React.useEffect(() => {
    if (liabilities.length > 0) {
      generateScenarios();
    }
  }, [liabilities, liabilityStatuses]);

  const generateScenarios = () => {
    const newScenarios: Scenario[] = [];
    
    // Prepayment scenarios for each liability
    liabilities.forEach((liability, index) => {
      const status = liabilityStatuses[index];
      
      if (status.emi > 0 && liability.interest_rate > 10) {
        // 10% prepayment
        newScenarios.push({
          id: `${liability.type}-prepay-10-${index}`,
          name: `Prepay 10% - ${liability.institution}`,
          description: `Pay ₹${Math.round(status.outstandingBalance * 0.1).toLocaleString()} extra`,
          type: 'prepayment',
          parameters: { liabilityIndex: index, amount: status.outstandingBalance * 0.1 },
          results: calculatePrepaymentResults(status, status.outstandingBalance * 0.1),
          priority: 'high'
        });
        
        // 25% prepayment
        newScenarios.push({
          id: `${liability.type}-prepay-25-${index}`,
          name: `Prepay 25% - ${liability.institution}`,
          description: `Pay ₹${Math.round(status.outstandingBalance * 0.25).toLocaleString()} extra`,
          type: 'prepayment',
          parameters: { liabilityIndex: index, amount: status.outstandingBalance * 0.25 },
          results: calculatePrepaymentResults(status, status.outstandingBalance * 0.25),
          priority: 'medium'
        });
      }
    });

    // Extra EMI scenarios
    liabilities.forEach((liability, index) => {
      const status = liabilityStatuses[index];
      
      if (status.emi > 0) {
        newScenarios.push({
          id: `${liability.type}-extra-emi-${index}`,
          name: `Extra EMI - ${liability.institution}`,
          description: `Pay ₹${Math.round(status.emi * 0.5).toLocaleString()} extra monthly`,
          type: 'extra_emi',
          parameters: { liabilityIndex: index, extraAmount: status.emi * 0.5 },
          results: calculateExtraEMIResults(status, status.emi * 0.5),
          priority: 'medium'
        });
      }
    });

    // Refinancing scenarios
    liabilities.forEach((liability, index) => {
      const status = liabilityStatuses[index];
      
      if (liability.interest_rate > 12 && status.emi > 0) {
        const newRate = Math.max(liability.interest_rate - 2, 8); // 2% reduction, min 8%
        newScenarios.push({
          id: `${liability.type}-refinance-${index}`,
          name: `Refinance - ${liability.institution}`,
          description: `Refinance at ${newRate}% (from ${liability.interest_rate}%)`,
          type: 'refinance',
          parameters: { liabilityIndex: index, newRate: newRate },
          results: calculateRefinancingResults(status, liability, newRate),
          priority: 'high'
        });
      }
    });

    // Debt consolidation scenario
    if (liabilities.length > 2) {
      const highInterestLiabilities = liabilities.filter((l, index) => 
        l.interest_rate > 15 && liabilityStatuses[index].emi > 0
      );
      
      if (highInterestLiabilities.length > 1) {
        newScenarios.push({
          id: 'consolidation',
          name: 'Debt Consolidation',
          description: 'Consolidate high-interest debts at 12%',
          type: 'consolidation',
          parameters: { newRate: 12, liabilityIndices: highInterestLiabilities.map((_, i) => i) },
          results: calculateConsolidationResults(highInterestLiabilities, 12),
          priority: 'high'
        });
      }
    }

    // Balance transfer scenarios for credit cards
    liabilities.forEach((liability, index) => {
      if (liability.type === 'credit_card' && liability.interest_rate > 18) {
        newScenarios.push({
          id: `${liability.type}-balance-transfer-${index}`,
          name: `Balance Transfer - ${liability.institution}`,
          description: `Transfer to 0% APR for 12 months`,
          type: 'balance_transfer',
          parameters: { liabilityIndex: index, promoRate: 0, promoMonths: 12 },
          results: calculateBalanceTransferResults(liabilityStatuses[index], 0, 12),
          priority: 'high'
        });
      }
    });

    setScenarios(newScenarios);
  };

  const calculatePrepaymentResults = (status: EnhancedLoanStatus, amount: number) => {
    const monthlyRate = status.monthlyInterestAccrual / status.outstandingBalance;
    const remainingMonths = status.remainingMonths;
    const newBalance = status.outstandingBalance - amount;
    
    if (newBalance <= 0) {
      return {
        interestSaved: status.outstandingBalance * monthlyRate * remainingMonths,
        monthsReduced: remainingMonths,
        totalSavings: status.outstandingBalance * monthlyRate * remainingMonths
      };
    }
    
    const newMonths = Math.ceil(newBalance / status.emi);
    const interestSaved = (status.emi * remainingMonths) - (status.emi * newMonths) - amount;
    const monthsReduced = remainingMonths - newMonths;
    
    return {
      interestSaved: Math.max(0, interestSaved),
      monthsReduced: Math.max(0, monthsReduced),
      totalSavings: Math.max(0, interestSaved)
    };
  };

  const calculateExtraEMIResults = (status: EnhancedLoanStatus, extraAmount: number) => {
    const totalEMI = status.emi + extraAmount;
    const remainingMonths = status.remainingMonths;
    const newMonths = Math.ceil(status.outstandingBalance / totalEMI);
    const interestSaved = (status.emi * remainingMonths) - (totalEMI * newMonths);
    const monthsReduced = remainingMonths - newMonths;
    
    return {
      interestSaved: Math.max(0, interestSaved),
      monthsReduced: Math.max(0, monthsReduced),
      totalSavings: Math.max(0, interestSaved),
      newMonthlyPayment: totalEMI
    };
  };

  const calculateRefinancingResults = (status: EnhancedLoanStatus, liability: UltraSimpleLiabilityInput, newRate: number) => {
    const monthlyRate = newRate / 100 / 12;
    const newEMI = (status.outstandingBalance * monthlyRate * Math.pow(1 + monthlyRate, status.remainingMonths)) / 
                   (Math.pow(1 + monthlyRate, status.remainingMonths) - 1);
    
    const currentEMI = status.emi;
    const monthlySavings = currentEMI - newEMI;
    const totalSavings = monthlySavings * status.remainingMonths;
    
    return {
      interestSaved: totalSavings,
      monthsReduced: 0,
      totalSavings: totalSavings,
      newMonthlyPayment: newEMI
    };
  };

  const calculateConsolidationResults = (liabilities: UltraSimpleLiabilityInput[], newRate: number) => {
    const totalAmount = liabilities.reduce((sum, liability) => {
      const index = liabilities.indexOf(liability);
      return sum + liabilityStatuses[index].outstandingBalance;
    }, 0);
    
    const avgTenure = Math.round(liabilities.reduce((sum, liability) => {
      const index = liabilities.indexOf(liability);
      return sum + liabilityStatuses[index].remainingMonths;
    }, 0) / liabilities.length);
    
    const monthlyRate = newRate / 100 / 12;
    const newEMI = (totalAmount * monthlyRate * Math.pow(1 + monthlyRate, avgTenure)) / 
                   (Math.pow(1 + monthlyRate, avgTenure) - 1);
    
    const currentTotalEMI = liabilities.reduce((sum, liability) => {
      const index = liabilities.indexOf(liability);
      return sum + liabilityStatuses[index].emi;
    }, 0);
    
    const monthlySavings = currentTotalEMI - newEMI;
    
    return {
      interestSaved: monthlySavings * avgTenure,
      monthsReduced: 0,
      totalSavings: monthlySavings * avgTenure,
      newMonthlyPayment: newEMI
    };
  };

  const calculateBalanceTransferResults = (status: EnhancedLoanStatus, promoRate: number, promoMonths: number) => {
    const currentMonthlyInterest = status.monthlyInterestAccrual;
    const promoMonthlyInterest = status.outstandingBalance * (promoRate / 100 / 12);
    
    const savingsDuringPromo = (currentMonthlyInterest - promoMonthlyInterest) * promoMonths;
    
    return {
      interestSaved: savingsDuringPromo,
      monthsReduced: 0,
      totalSavings: savingsDuringPromo,
      breakEvenMonths: promoMonths
    };
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'prepayment': return <Target className="w-4 h-4 text-blue-600" />;
      case 'extra_emi': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'refinance': return <Zap className="w-4 h-4 text-purple-600" />;
      case 'consolidation': return <BarChart3 className="w-4 h-4 text-orange-600" />;
      case 'balance_transfer': return <ArrowRight className="w-4 h-4 text-cyan-600" />;
      default: return <Calculator className="w-4 h-4 text-gray-600" />;
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
      {/* Scenario Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="w-5 h-5 text-purple-600" />
            <span>Scenario Playground</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Explore different strategies to optimize your debt payoff. We've generated personalized scenarios based on your liabilities.
            </p>
            
            {scenarios.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenarios.map((scenario) => (
                  <Card 
                    key={scenario.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      activeScenario?.id === scenario.id ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => setActiveScenario(scenario)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getScenarioIcon(scenario.type)}
                            <h4 className="font-semibold text-foreground text-sm">{scenario.name}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(scenario.priority)}`}>
                            {scenario.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">{scenario.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Interest Saved</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(scenario.results.interestSaved)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Months Reduced</p>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">
                              {scenario.results.monthsReduced}
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
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Scenarios Available
                </h3>
                <p className="text-muted-foreground">
                  Add liabilities to see optimization scenarios
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Scenario Details */}
      {activeScenario && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span>Scenario Details: {activeScenario.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(activeScenario.results.interestSaved)}
                  </p>
                  <p className="text-sm text-muted-foreground">Interest Saved</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {activeScenario.results.monthsReduced}
                  </p>
                  <p className="text-sm text-muted-foreground">Months Reduced</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(activeScenario.results.totalSavings)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Savings</p>
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
                  View Detailed Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Scenario Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-orange-600" />
            <span>Custom Scenario Builder</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom-amount">Custom Prepayment Amount</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount || ''}
                  onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="custom-rate">Custom Refinance Rate (%)</Label>
                <Input
                  id="custom-rate"
                  type="number"
                  step="0.1"
                  placeholder="Enter rate"
                  value={customRate || ''}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Button variant="outline" className="flex-1">
                <ArrowRight className="w-4 h-4 mr-2" />
                Calculate Custom Prepayment
              </Button>
              <Button variant="outline" className="flex-1">
                <Zap className="w-4 h-4 mr-2" />
                Calculate Custom Refinance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <span>Scenario Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Prepayment Strategy</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Make extra payments to reduce principal and save interest
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Zap className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">Refinancing</h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Lower your interest rate to reduce monthly payments
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <BarChart3 className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">Consolidation</h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    Combine multiple debts into one lower-rate loan
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <ArrowRight className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">Balance Transfer</h4>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Transfer credit card balances to lower-rate cards
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