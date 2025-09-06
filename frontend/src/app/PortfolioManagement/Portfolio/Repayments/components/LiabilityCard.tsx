"use client";
import React, { useState } from "react";
import { Card, CardContent } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { 
  Home, 
  Car, 
  CreditCard, 
  User, 
  DollarSign,
  Calculator,
  TrendingUp,
  AlertTriangle,
  Target,
  Clock,
  Percent,
  Calendar,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { SmartLiability, formatCurrency, formatPercentage } from "@/lib/smartRepayments";

interface LiabilityCardProps {
  liability: SmartLiability;
  onDelete: (id: string) => void;
}

export default function LiabilityCard({ liability, onDelete }: LiabilityCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showPrepayment, setShowPrepayment] = useState(false);
  const [prepaymentAmount, setPrepaymentAmount] = useState(0);

  const getIcon = () => {
    switch (liability.type) {
      case 'home_loan':
        return <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'car_loan':
        return <Car className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'credit_card':
        return <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'gold_loan':
        return <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBgColor = () => {
    switch (liability.type) {
      case 'home_loan':
        return 'bg-blue-100 dark:bg-blue-900/30';
      case 'car_loan':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'credit_card':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'gold_loan':
        return 'bg-yellow-100 dark:bg-yellow-900/30';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const calculateRemainingMonths = () => {
    if (!liability.start_date || !liability.tenure_months || liability.emi_amount === 0) {
      return null;
    }
    
    const startDate = new Date(liability.start_date);
    const currentDate = new Date();
    const monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (currentDate.getMonth() - startDate.getMonth());
    
    return Math.max(0, liability.tenure_months - monthsElapsed);
  };

  const calculateProgress = () => {
    if (liability.emi_amount === 0) return 0;
    const remainingMonths = calculateRemainingMonths();
    if (!remainingMonths) return 0;
    return Math.round(((liability.tenure_months - remainingMonths) / liability.tenure_months) * 100);
  };

  const calculatePrepaymentSavings = (amount: number) => {
    if (liability.emi_amount === 0 || amount <= 0) return { interestSaved: 0, monthsReduced: 0 };
    
    const monthlyRate = liability.interest_rate / 100 / 12;
    const remainingMonths = calculateRemainingMonths() || liability.tenure_months;
    const newBalance = liability.outstanding_balance - amount;
    
    if (newBalance <= 0) {
      return { 
        interestSaved: liability.outstanding_balance * monthlyRate * remainingMonths,
        monthsReduced: remainingMonths 
      };
    }
    
    const newMonths = Math.ceil(newBalance / liability.emi_amount);
    const interestSaved = (liability.emi_amount * remainingMonths) - (liability.emi_amount * newMonths) - amount;
    const monthsReduced = remainingMonths - newMonths;
    
    return { interestSaved: Math.max(0, interestSaved), monthsReduced: Math.max(0, monthsReduced) };
  };

  const getIndividualRecommendations = () => {
    const recommendations = [];
    
    if (liability.interest_rate > 15) {
      recommendations.push({
        type: 'warning',
        title: 'High Interest Rate',
        description: `${formatPercentage(liability.interest_rate)} is quite high`,
        action: 'Consider refinancing or prepayment',
        priority: 'high'
      });
    }
    
    if (liability.emi_amount === 0) {
      recommendations.push({
        type: 'alert',
        title: 'No EMI - Interest Accumulating',
        description: 'Interest is piling up daily without regular payments',
        action: 'Consider making regular payments',
        priority: 'high'
      });
    }
    
    if (liability.risk_score > 7) {
      recommendations.push({
        type: 'warning',
        title: 'High Risk Liability',
        description: 'This liability needs immediate attention',
        action: 'Prioritize payoff or refinancing',
        priority: 'high'
      });
    }
    
    const remainingMonths = calculateRemainingMonths();
    if (remainingMonths && remainingMonths > 0 && liability.emi_amount > 0) {
      recommendations.push({
        type: 'info',
        title: 'Prepayment Opportunity',
        description: `${remainingMonths} months remaining`,
        action: 'Extra payments can save significant interest',
        priority: 'medium'
      });
    }
    
    return recommendations;
  };

  const remainingMonths = calculateRemainingMonths();
  const progress = calculateProgress();
  const recommendations = getIndividualRecommendations();

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getBgColor()}`}>
                {getIcon()}
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{liability.institution}</h4>
                <p className="text-sm text-muted-foreground capitalize">{liability.type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground">{formatCurrency(liability.outstanding_balance)}</p>
              <p className="text-sm text-muted-foreground">{formatPercentage(liability.interest_rate)}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Monthly EMI</p>
              <p className="font-semibold text-foreground">
                {liability.emi_amount > 0 ? formatCurrency(liability.emi_amount) : 'No EMI'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Risk Level</p>
              <p className={`font-semibold ${
                liability.risk_score > 7 ? 'text-red-600 dark:text-red-400' :
                liability.risk_score > 4 ? 'text-orange-600 dark:text-orange-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {liability.risk_score > 7 ? 'High' : liability.risk_score > 4 ? 'Medium' : 'Low'}
              </p>
            </div>
          </div>

          {/* Progress Bar for EMI loans */}
          {liability.emi_amount > 0 && remainingMonths && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">
                  {progress}% • {remainingMonths} months left
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Individual Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-2">
              {recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className={`p-2 rounded-lg text-xs ${
                  rec.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                  rec.priority === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
                  'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                }`}>
                  <div className="flex items-center space-x-2">
                    {rec.priority === 'high' ? <AlertTriangle className="w-3 h-3 text-red-600" /> :
                     rec.priority === 'medium' ? <Target className="w-3 h-3 text-orange-600" /> :
                     <TrendingUp className="w-3 h-3 text-blue-600" />}
                    <span className="font-medium">{rec.title}</span>
                  </div>
                  <p className="text-muted-foreground mt-1">{rec.action}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrepayment(!showPrepayment)}
              className="text-primary border-primary hover:bg-primary/10"
            >
              <Calculator className="w-4 h-4 mr-1" />
              Prepayment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(liability.id)}
              className="text-destructive border-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Prepayment Calculator */}
          {showPrepayment && (
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <h5 className="font-semibold text-foreground mb-3">Prepayment Calculator</h5>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="prepayment-amount">Extra Amount (₹)</Label>
                  <Input
                    id="prepayment-amount"
                    type="number"
                    placeholder="50000"
                    value={prepaymentAmount || ''}
                    onChange={(e) => setPrepaymentAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                {prepaymentAmount > 0 && (
                  <div className="p-3 bg-background rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Interest Saved</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(calculatePrepaymentSavings(prepaymentAmount).interestSaved)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Months Reduced</p>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {calculatePrepaymentSavings(prepaymentAmount).monthsReduced} months
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Information */}
          {showDetails && (
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <h5 className="font-semibold text-foreground mb-3">Detailed Information</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Principal Amount</p>
                  <p className="font-semibold text-foreground">{formatCurrency(liability.principal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-semibold text-foreground">
                    {new Date(liability.start_date).toLocaleDateString()}
                  </p>
                </div>
                {remainingMonths && (
                  <div>
                    <p className="text-muted-foreground">Remaining Months</p>
                    <p className="font-semibold text-foreground">{remainingMonths}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Priority Level</p>
                  <p className="font-semibold text-foreground capitalize">{liability.priority_level}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}