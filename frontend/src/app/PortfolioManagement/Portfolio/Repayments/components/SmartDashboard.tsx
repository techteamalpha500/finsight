"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  Zap, 
  Calculator,
  BarChart3,
  PieChart,
  Clock,
  DollarSign,
  Percent,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Sparkles,
  Plus
} from "lucide-react";
import { 
  SmartLiability, 
  InterestSimulation, 
  PrepaymentStrategy, 
  SmartInsight,
  calculateInterestAccrual,
  generatePrepaymentStrategies,
  generateSmartInsights,
  formatCurrency,
  formatPercentage,
  getRiskColor,
  getPriorityColor
} from "@/lib/smartRepayments";

interface SmartDashboardProps {
  liabilities: SmartLiability[];
  onAddLiability: () => void;
  onEditLiability: (id: string) => void;
  onDeleteLiability: (id: string) => void;
}

export default function SmartDashboard({ 
  liabilities, 
  onAddLiability, 
  onEditLiability, 
  onDeleteLiability 
}: SmartDashboardProps) {
  const [selectedLiability, setSelectedLiability] = useState<SmartLiability | null>(null);
  const [simulationData, setSimulationData] = useState<InterestSimulation[]>([]);
  const [strategies, setStrategies] = useState<PrepaymentStrategy[]>([]);
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'simulation' | 'strategies' | 'insights'>('overview');

  useEffect(() => {
    if (liabilities.length > 0) {
      const insights = generateSmartInsights(liabilities);
      setInsights(insights);
    }
  }, [liabilities]);

  useEffect(() => {
    if (selectedLiability) {
      const simulation = calculateInterestAccrual(
        selectedLiability.outstanding_balance,
        selectedLiability.interest_rate,
        24, // 24 months simulation
        selectedLiability.emi_amount,
        selectedLiability.interest_type
      );
      setSimulationData(simulation);

      const strategies = generatePrepaymentStrategies(selectedLiability);
      setStrategies(strategies);
    }
  }, [selectedLiability]);

  const totalOutstanding = liabilities.reduce((sum, l) => sum + l.outstanding_balance, 0);
  const totalEMI = liabilities.reduce((sum, l) => sum + l.emi_amount, 0);
  const avgInterestRate = liabilities.length > 0 ? 
    liabilities.reduce((sum, l) => sum + l.interest_rate, 0) / liabilities.length : 0;
  const highRiskLiabilities = liabilities.filter(l => l.risk_score > 7).length;

  return (
    <div className="space-y-6">
      {/* Smart Summary Cards - Consistent with Plan page style */}
      <div className="grid grid-cols-4 gap-3">
        {/* Total Outstanding */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Total Outstanding</div>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="text-[10px] text-muted-foreground">Debt to repay</div>
        </div>

        {/* Monthly EMIs */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Monthly EMIs</div>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-1">
            {formatCurrency(totalEMI)}
          </div>
          <div className="text-[10px] text-muted-foreground">Due every month</div>
        </div>

        {/* Avg Interest Rate */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Avg Interest Rate</div>
          <div className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-1">
            {formatPercentage(avgInterestRate)}
          </div>
          <div className="text-[10px] text-muted-foreground">Weighted average</div>
        </div>

        {/* High Risk */}
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">High Risk</div>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">
            {highRiskLiabilities}
          </div>
          <div className="text-[10px] text-muted-foreground">Need attention</div>
        </div>
      </div>

      {/* AI-Powered Insights */}
      {insights.length > 0 && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span>AI-Powered Smart Insights</span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight.priority)}`}>
                          {insight.priority.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(insight.risk_level || 'low')}`}>
                          {insight.type.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                      <p className="text-sm font-medium text-foreground mb-1">Impact: {insight.impact}</p>
                      <p className="text-sm text-muted-foreground">Action: {insight.action_required}</p>
                      {insight.potential_savings && (
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-2">
                          Potential Savings: {formatCurrency(insight.potential_savings)}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'simulation', label: 'Interest Simulation', icon: Calculator },
          { id: 'strategies', label: 'Smart Strategies', icon: Target },
          { id: 'insights', label: 'AI Insights', icon: Lightbulb }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liabilities List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liabilities.map((liability) => (
                  <div key={liability.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">{liability.institution}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{liability.type.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatCurrency(liability.outstanding_balance)}</p>
                        <p className="text-sm text-muted-foreground">{formatPercentage(liability.interest_rate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(liability.risk_score > 7 ? 'high' : liability.risk_score > 4 ? 'medium' : 'low')}`}>
                          Risk: {liability.risk_score}/10
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(liability.priority_level)}`}>
                          {liability.priority_level}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedLiability(liability)}>
                          <Calculator className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onEditLiability(liability.id)}>
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onDeleteLiability(liability.id)}>
                          <TrendingDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="w-full" onClick={onAddLiability}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Liability
                </Button>
                <Button variant="outline" className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize All Liabilities
                </Button>
                <Button variant="outline" className="w-full">
                  <Target className="w-4 h-4 mr-2" />
                  Generate Smart Plan
                </Button>
                <Button variant="outline" className="w-full">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Detailed Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'simulation' && selectedLiability && (
        <Card>
          <CardHeader>
            <CardTitle>Interest Simulation - {selectedLiability.institution}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(selectedLiability.outstanding_balance)}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className="text-xl font-bold text-foreground">{formatPercentage(selectedLiability.interest_rate)}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Monthly EMI</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(selectedLiability.emi_amount)}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                  <p className="text-xl font-bold text-foreground">{selectedLiability.risk_score}/10</p>
                </div>
              </div>
              
              <div className="h-64 bg-muted rounded-lg p-4">
                <p className="text-center text-muted-foreground">Interest Simulation Chart (Coming Soon)</p>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Visual representation of how interest accumulates over time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'strategies' && selectedLiability && (
        <Card>
          <CardHeader>
            <CardTitle>Smart Prepayment Strategies - {selectedLiability.institution}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strategies.map((strategy) => (
                <div key={strategy.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground">{strategy.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(strategy.risk_level)}`}>
                      {strategy.risk_level}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Interest Saved:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(strategy.interest_saved)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tenure Reduced:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {strategy.tenure_reduced_months} months
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ROI:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {formatPercentage(strategy.roi_percentage)}
                      </span>
                    </div>
                  </div>
                  <Button className="w-full mt-4" size="sm">
                    <Target className="w-4 h-4 mr-2" />
                    Apply Strategy
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'insights' && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight.priority)}`}>
                          {insight.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">{insight.category}</span>
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                      <p className="text-sm font-medium text-foreground mb-1">Impact: {insight.impact}</p>
                      <p className="text-sm text-muted-foreground">Action: {insight.action_required}</p>
                      {insight.potential_savings && (
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-2">
                          Potential Savings: {formatCurrency(insight.potential_savings)}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}