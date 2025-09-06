"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { Modal } from "../../../../components/Modal";
import { useSmartRepaymentCalculation, validateRepaymentForm } from "../hooks/useSmartRepaymentCalculation";
import { 
  Calculator, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Calendar, 
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  Banknote,
  PiggyBank,
  Zap,
  Star,
  AlertCircle,
  Info,
  BarChart3,
  Timer,
  Crown,
  Coins,
  X,
  ArrowDown,
  ArrowUp
} from "lucide-react";

interface SmartRepaymentModalProps {
  open: boolean;
  onClose: () => void;
  liabilities: any[];
  onApplyStrategy?: (result: any) => void;
}

interface KPICardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "warning" | "info";
}

const KPICard: React.FC<KPICardProps> = ({ 
  icon, 
  title, 
  value, 
  subtitle, 
  trend,
  variant = "default" 
}) => {
  const variantClasses = {
    default: "border-border bg-card",
    success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
    info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50"
  };

  const iconColors = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400"
  };

  return (
    <div className={`rounded-xl border p-4 ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${variant === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 
                                       variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                       variant === 'info' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                       'bg-muted'}`}>
          <div className={iconColors[variant]}>{icon}</div>
        </div>
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
          }`}>
            {trend === 'up' ? <ArrowUp className="w-3 h-3 inline mr-1" /> : 
             trend === 'down' ? <ArrowDown className="w-3 h-3 inline mr-1" /> : null}
            {trend === 'up' ? 'Improved' : trend === 'down' ? 'Reduced' : 'Stable'}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default function SmartRepaymentModal({ open, onClose, liabilities, onApplyStrategy }: SmartRepaymentModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'input' | 'results'>('input');
  const [repaymentMode, setRepaymentMode] = useState<'monthly' | 'lump'>('monthly');
  const [advisorAutoPick, setAdvisorAutoPick] = useState(false); // Start with manual mode
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [lumpSumAmount, setLumpSumAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile for responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect to full page on mobile when modal opens
  useEffect(() => {
    if (open && isMobile) {
      onClose(); // Close modal immediately
      router.push('/PortfolioManagement/Portfolio/Repayments/smart-repayment');
    }
  }, [open, isMobile, onClose, router]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep('input');
      setRepaymentMode('monthly');
      setAdvisorAutoPick(true);
      setSelectedLoanId('');
      setMonthlyAmount('');
      setLumpSumAmount('');
      setPaymentDate('');
      setResult(null);
    }
  }, [open]);

  // Set default payment date to today
  useEffect(() => {
    if (repaymentMode === 'lump' && !paymentDate) {
      const today = new Date();
      setPaymentDate(today.toISOString().split('T')[0]);
    }
  }, [repaymentMode, paymentDate]);

  // Use shared calculation hook
  const repaymentInputs = {
    repaymentMode,
    monthlyAmount,
    lumpSumAmount,
    paymentDate,
    selectedLoanId,
    advisorAutoPick,
    liabilities
  };

  const liveResult = useSmartRepaymentCalculation(repaymentInputs);

  // Form validation using shared function
  const isFormValid = () => validateRepaymentForm(repaymentInputs);

  const handleCalculate = async () => {
    if (!liveResult) return;
    
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setResult(liveResult);
      setCurrentStep('results');
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('input');
    setResult(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatMonths = (months: number | null) => {
    if (months === null) return "N/A";
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0) {
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
    }
    return `${months}m`;
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      footer={null}
    >
      <div className="min-h-[500px]">
        {/* Custom Header - Compact with AI Toggle */}
        <div className="relative -m-4 mb-6 p-4 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-lg font-bold">Smart Repayment</h2>
            </div>
            
            <div className="flex items-center gap-3">
              {/* AI Advisor Toggle - Matching Plan Page Design */}
              <div className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="text-[11px] text-white/90">
                  AI Assist
                </span>
                <button 
                  type="button" 
                  onClick={() => setAdvisorAutoPick(!advisorAutoPick)} 
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                    advisorAutoPick 
                      ? "bg-gradient-to-r from-amber-500 via-fuchsia-500 to-indigo-600" 
                      : "bg-white/20"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    advisorAutoPick ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {currentStep === 'input' ? (
          <div className="space-y-6">
            {/* Strategy Mode Selection */}
            <div>
              <Label className="text-base font-semibold text-foreground mb-3 block">
                Choose Your Repayment Strategy
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRepaymentMode('monthly')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    repaymentMode === 'monthly'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                      : 'border-border bg-card hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      repaymentMode === 'monthly' 
                        ? 'bg-purple-100 dark:bg-purple-900/50' 
                        : 'bg-muted'
                    }`}>
                      <Calendar className={`w-5 h-5 ${
                        repaymentMode === 'monthly' 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Monthly Top-up</p>
                      <p className="text-xs text-muted-foreground">Add extra to EMI monthly</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setRepaymentMode('lump')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    repaymentMode === 'lump'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                      : 'border-border bg-card hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      repaymentMode === 'lump' 
                        ? 'bg-purple-100 dark:bg-purple-900/50' 
                        : 'bg-muted'
                    }`}>
                      <Banknote className={`w-5 h-5 ${
                        repaymentMode === 'lump' 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Lump Sum</p>
                      <p className="text-xs text-muted-foreground">One-time large payment</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>



            {/* AI Selected Loan Highlight - Compact */}
            {advisorAutoPick && liveResult && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                  AI Target: {liveResult.selectedLoanLabel.replace(' (AI Selected)', '')}
                </span>
                <span className="px-1.5 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                  AI
                </span>
              </div>
            )}

            {/* Manual Loan Selection */}
            {!advisorAutoPick && (
              <div>
                <Label className="text-base font-medium text-foreground mb-3 block">
                  Select Target Loan
                </Label>
                <select
                  className="w-full rounded-xl border border-border bg-card text-foreground h-12 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                >
                  <option value="">Choose a loan...</option>
                  {liabilities.map((liability, index) => (
                    <option key={liability.id || index} value={liability.id || index.toString()}>
                      {liability.label || liability.institution || `${liability.type} Loan`} - 
                      {formatCurrency(liability.current_outstanding || liability.original_amount)} outstanding @ {liability.interest_rate}% 
                      {liability.remaining_months ? ` (${liability.remaining_months}mo left)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <Label className="text-base font-medium text-foreground mb-3 block">
                {repaymentMode === 'monthly' ? 'Monthly Extra Amount' : 'Lump Sum Amount'}
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-muted-foreground text-lg">₹</span>
                </div>
                <Input
                  type="number"
                  placeholder={repaymentMode === 'monthly' ? '5,000' : '50,000'}
                  className="pl-8 h-12 text-lg rounded-xl border-2 focus:border-purple-500"
                  value={repaymentMode === 'monthly' ? monthlyAmount : lumpSumAmount}
                  onChange={(e) => {
                    if (repaymentMode === 'monthly') {
                      setMonthlyAmount(e.target.value);
                    } else {
                      setLumpSumAmount(e.target.value);
                    }
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {repaymentMode === 'monthly' 
                  ? 'This amount will be added to your existing EMI each month'
                  : 'One-time payment to reduce the principal amount'
                }
              </p>
            </div>

            {/* Enhanced Live Preview */}
            {liveResult && (
              <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-foreground">Live Savings Preview</h3>
                  </div>
                  
                  {/* Target Loan Info */}
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">
                          {liveResult.selectedLoanLabel.replace(' (AI Selected)', '')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600 dark:text-blue-400">Outstanding</p>
                        <p className="font-bold text-blue-900 dark:text-blue-100">
                          {formatCurrency(liveResult.currentOutstanding || 0)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {liveResult.currentMonthsRemaining} months left
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Interest Saved</p>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        ₹{liveResult.interestSaved.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Time Saved</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {liveResult.monthsSaved}mo
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">ROI</p>
                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        ₹{(liveResult.efficiency || 0).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Date for Lump Sum */}
            {repaymentMode === 'lump' && (
              <div>
                <Label className="text-base font-medium text-foreground mb-3 block">
                  Payment Date
                </Label>
                <Input
                  type="date"
                  className="h-12 rounded-xl border-2 focus:border-purple-500"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCalculate}
                disabled={!isFormValid() || loading}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                leftIcon={loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Calculator className="w-4 h-4" />}
              >
                {loading ? 'Calculating...' : 'Calculate Savings'}
              </Button>
            </div>

          </div>
        ) : (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-foreground">Optimization Complete!</h3>
              </div>
              {result?.reason && (
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {result.reason}
                </p>
              )}
            </div>

            {/* Selected Loan Info */}
            {result?.selectedLoanLabel && (
              <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                      <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Target Loan</p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">{result.selectedLoanLabel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <KPICard
                icon={<PiggyBank className="w-5 h-5" />}
                title="Interest Saved"
                value={formatCurrency(result?.interestSaved || 0)}
                trend="down"
                variant="success"
              />
              <KPICard
                icon={<Timer className="w-5 h-5" />}
                title="Time Saved"
                value={result?.monthsSaved !== null ? formatMonths(result?.monthsSaved || 0) : "N/A"}
                trend={result?.monthsSaved > 0 ? "down" : "neutral"}
                variant="info"
              />
              <KPICard
                icon={<Calendar className="w-5 h-5" />}
                title="New Payoff Date"
                value={result?.payoffDate || "N/A"}
                variant="default"
              />
              <KPICard
                icon={<BarChart3 className="w-5 h-5" />}
                title="Efficiency"
                value={`${(result?.efficiency * 100 || 0).toFixed(1)}%`}
                subtitle="Return per rupee"
                variant="info"
              />
            </div>

            {/* Timeline Comparison */}
            {result?.timeline && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-5 h-5" />
                    Payoff Timeline Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Plan</span>
                      <span className="font-medium">
                        {result.timeline.current !== null ? formatMonths(result.timeline.current) : "Interest-only"}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gray-400 dark:bg-gray-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">With {repaymentMode === 'monthly' ? 'Monthly Top-up' : 'Lump Sum'}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatMonths(result.timeline.withContribution)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: result.timeline.current 
                            ? `${(result.timeline.withContribution / result.timeline.current) * 100}%`
                            : '60%'
                        }}
                      />
                    </div>
                  </div>

                  {result?.monthsSaved > 0 && (
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-xl">
                      <p className="text-green-700 dark:text-green-300 font-semibold">
                        🎉 You'll finish {formatMonths(result.monthsSaved)} earlier!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="w-5 h-5" />
                  Financial Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Total Interest (New)</span>
                    <span className="font-medium">{formatCurrency(result?.totalInterestPaidNew || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Interest Savings</span>
                    <span className="font-medium text-green-600">{formatCurrency(result?.interestSaved || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Monthly {repaymentMode === 'monthly' ? 'Extra' : 'Impact'}</span>
                    <span className="font-medium">
                      {repaymentMode === 'monthly' 
                        ? formatCurrency(parseFloat(monthlyAmount) || 0)
                        : formatCurrency(parseFloat(lumpSumAmount) || 0)
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 font-semibold text-lg">
                    <span>ROI per Rupee</span>
                    <span className="text-purple-600">₹{((result?.efficiency || 0) * 1).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 h-12 rounded-xl"
                leftIcon={<ArrowRight className="w-4 h-4 rotate-180" />}
              >
                Try Another Strategy
              </Button>
              <Button
                onClick={() => {
                  onApplyStrategy?.(result);
                  onClose();
                }}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                leftIcon={<Zap className="w-4 h-4" />}
              >
                Apply This Strategy
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
