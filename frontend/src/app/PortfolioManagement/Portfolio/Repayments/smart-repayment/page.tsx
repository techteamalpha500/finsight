"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { useSmartRepaymentCalculation, validateRepaymentForm } from "../hooks/useSmartRepaymentCalculation";
import { fetchRepayments } from "../../../../../lib/repayments";
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  Calendar, 
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Banknote,
  PiggyBank,
  Star,
  AlertCircle,
  Info,
  BarChart3,
  Timer,
  Crown,
  Coins,
  ArrowDown,
  ArrowUp
} from "lucide-react";

interface Liability {
  id: string;
  label?: string;
  institution?: string;
  original_amount: number;
  current_outstanding?: number;
  emi_amount?: number;
  interest_rate: number;
  type: string;
  tenure_months?: number;
  remaining_months?: number;
  start_date?: string;
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
  const variantStyles = {
    default: "border-border bg-card",
    success: "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30",
    warning: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30",
    info: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30"
  };

  const trendIcon = trend === "up" ? <ArrowUp className="w-3 h-3 text-green-600" /> : 
                   trend === "down" ? <ArrowDown className="w-3 h-3 text-red-600" /> : null;

  return (
    <Card className={`border-2 ${variantStyles[variant]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg">
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-foreground">{value}</p>
                {trendIcon}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function SmartRepaymentPage() {
  const router = useRouter();
  
  // Form state
  const [repaymentMode, setRepaymentMode] = useState<'monthly' | 'lump'>('monthly');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [lumpSumAmount, setLumpSumAmount] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [advisorAutoPick, setAdvisorAutoPick] = useState(false);
  
  // Data state
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculation state


  // Live calculation hook
  const liveResult = useSmartRepaymentCalculation({
    repaymentMode,
    monthlyAmount: monthlyAmount,
    lumpSumAmount: lumpSumAmount,
    selectedLoanId,
    paymentDate,
    advisorAutoPick,
    liabilities
  });

  useEffect(() => {
    const loadRepayments = async () => {
      try {
        setLoading(true);
        const repaymentSummary = await fetchRepayments();
        if (repaymentSummary && repaymentSummary.repayments && Array.isArray(repaymentSummary.repayments) && repaymentSummary.repayments.length > 0) {
          // Convert Repayment objects to Liability format expected by the hook
          const transformedLiabilities = repaymentSummary.repayments.map(repayment => ({
            id: repayment.repayment_id,
            label: `${repayment.institution} ${repayment.type}`,
            institution: repayment.institution,
            original_amount: repayment.principal,
            current_outstanding: repayment.outstanding_balance,
            emi_amount: repayment.emi_amount,
            interest_rate: repayment.interest_rate,
            type: repayment.type,
            tenure_months: repayment.tenure_months,
            start_date: repayment.start_date
          }));
          
          setLiabilities(transformedLiabilities);
          // Auto-select AI mode and first loan for better UX
          setAdvisorAutoPick(true);
          setSelectedLoanId(transformedLiabilities[0]?.id || '');
        } else {
          setError("No loan data available. Please add some loans first.");
        }
      } catch (err) {
        console.error('Error loading repayments:', err);
        setError("Failed to load loan information.");
      } finally {
        setLoading(false);
      }
    };

    loadRepayments();
  }, []);

  // Auto-set payment date to today
  useEffect(() => {
    if (!paymentDate) {
      const today = new Date().toISOString().split('T')[0];
      setPaymentDate(today);
    }
  }, [paymentDate]);



  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount && amount !== 0) return "N/A";
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatMonths = (months: number | null) => {
    if (months === null || months === undefined) return "N/A";
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0) {
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
    }
    return `${months}m`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading loan information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && liabilities.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Loan Data Available</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/PortfolioManagement/Portfolio/Repayments')}>
              Back to Repayments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/PortfolioManagement/Portfolio/Repayments')}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              Smart Repayment Advisor
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Optimize your loan repayments with AI-powered insights</p>
          </div>
        </div>
        
        {/* AI Toggle matching plan page design */}
        <div className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-[11px] text-muted-foreground">
            AI Assist
          </span>
          <button 
            type="button" 
            onClick={() => setAdvisorAutoPick(!advisorAutoPick)} 
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
              advisorAutoPick 
                ? "bg-gradient-to-r from-amber-500 via-fuchsia-500 to-indigo-600" 
                : "bg-muted"
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${
              advisorAutoPick ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
        {/* Left Column - Input Form */}
        <div className="space-y-4 sm:space-y-6 order-1">
          {/* Payment Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Payment Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className={`h-auto p-3 ${repaymentMode === 'monthly' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-foreground hover:bg-indigo-50 dark:hover:bg-indigo-950'}`}
                  onClick={() => setRepaymentMode('monthly')}
                >
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium text-sm">Monthly Top-up</span>
                    <span className="text-xs opacity-80">Extra EMI amount</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className={`h-auto p-3 ${repaymentMode === 'lump' ? 'bg-emerald-600 text-white border-emerald-600' : 'text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950'}`}
                  onClick={() => setRepaymentMode('lump')}
                >
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Banknote className="w-5 h-5" />
                    <span className="font-medium text-sm">Lump Sum</span>
                    <span className="text-xs opacity-80">One-time payment</span>
                  </div>
                </Button>
              </div>

              {/* Amount Entry Section */}
              <div className="space-y-4 border-t pt-4">
                {repaymentMode === 'monthly' ? (
                  <>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Monthly Extra Amount
                      </Label>
                      <Input
                        type="number"
                        placeholder="Enter monthly extra amount"
                        className="h-11 sm:h-12 rounded-xl border-2 focus:border-purple-500 text-base sm:text-lg"
                        value={monthlyAmount}
                        onChange={(e) => setMonthlyAmount(e.target.value)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This amount will be added to your existing EMI each month
                    </p>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          <DollarSign className="w-4 h-4 inline mr-1" />
                          Lump Sum Amount
                        </Label>
                        <Input
                          type="number"
                          placeholder="Enter lump sum amount"
                          className="h-11 sm:h-12 rounded-xl border-2 focus:border-purple-500 text-base sm:text-lg"
                          value={lumpSumAmount}
                          onChange={(e) => setLumpSumAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Payment Date
                        </Label>
                        <Input
                          type="date"
                          className="h-11 sm:h-12 rounded-xl border-2 focus:border-purple-500"
                          value={paymentDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      One-time payment to reduce your loan principal
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Loan Selection */}
          {!advisorAutoPick && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Select Target Loan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="w-full rounded-lg border border-border bg-background text-foreground h-11 sm:h-12 px-3 sm:px-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                >
                  <option value="">Choose a loan...</option>
                  {liabilities.map((liability, index) => (
                    <option key={liability.id || index} value={liability.id || index.toString()}>
                      {liability.label || liability.institution || `${liability.type} Loan`}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {/* Loan Information - Icon-based Layout */}
          {liveResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Loan Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    <div className="text-center p-3 bg-card border rounded-lg">
                    <h3 className="font-semibold text-lg mb-1">
                      {liveResult.selectedLoanLabel.replace(' (AI Selected)', '')}
                    </h3>
                    {advisorAutoPick && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        AI Selected
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                        <Card className="border-2 border-border bg-card">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center justify-center text-center min-h-[100px]">
                              <div className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg mb-3">
                                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">Outstanding</p>
                              <p className="text-lg font-bold text-foreground">{formatCurrency(liveResult.currentOutstanding)}</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-border bg-card">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center justify-center text-center min-h-[100px]">
                              <div className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg mb-3">
                                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">Time Left</p>
                              <p className="text-lg font-bold text-foreground">{liveResult.currentMonthsRemaining} months</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-border bg-card">
                          <CardContent className="p-4">
                            <div className="flex flex-col items-center justify-center text-center min-h-[100px]">
                              <div className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg mb-3">
                                <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">Interest Rate</p>
                              <p className="text-lg font-bold text-foreground">{liabilities.find(l => (l.id || liabilities.indexOf(l).toString()) === selectedLoanId)?.interest_rate || 'N/A'}%</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="space-y-4 sm:space-y-6 order-2">
          
          {/* Detailed Results */}
          {liveResult && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <KPICard
                  icon={<PiggyBank className="w-5 h-5 text-green-600" />}
                  title="Interest Saved"
                  value={formatCurrency(liveResult.interestSaved)}
                  trend={liveResult.interestSaved > 0 ? "down" : "neutral"}
                  variant="default"
                />
                <KPICard
                  icon={<Clock className="w-5 h-5 text-blue-600" />}
                  title="Time Saved"
                  value={liveResult?.monthsSaved !== null ? formatMonths(liveResult?.monthsSaved || 0) : "N/A"}
                  trend={liveResult?.monthsSaved > 0 ? "down" : "neutral"}
                  variant="info"
                />
                <KPICard
                  icon={<Calendar className="w-5 h-5 text-purple-600" />}
                  title="New Payoff Date"
                  value={liveResult?.payoffDate || "N/A"}
                  variant="default"
                />
                <KPICard
                  icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
                  title="ROI per ₹1"
                  value={`₹${(liveResult?.efficiency || 0).toFixed(2)}`}
                  subtitle="Interest saved per rupee invested"
                  variant="warning"
                />
              </div>

              {/* Timeline Comparison */}
              {liveResult?.timeline && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-600" />
                      Payoff Timeline Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Plan</span>
                        <span className="font-medium">
                          {liveResult.timeline.current !== null ? formatMonths(liveResult.timeline.current) : "Interest-only"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div className="bg-gray-400 dark:bg-gray-500 h-3 rounded-full" style={{ width: '100%' }} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">With {repaymentMode === 'monthly' ? 'Top-up' : 'Lump Sum'}</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatMonths(liveResult.timeline.withContribution)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full" 
                          style={{ 
                            width: liveResult.timeline.current 
                              ? `${(liveResult.timeline.withContribution / liveResult.timeline.current) * 100}%`
                              : '0%'
                          }} 
                        />
                      </div>
                    </div>
                    
                    {liveResult?.monthsSaved > 0 && (
                      <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <p className="text-green-700 dark:text-green-300 font-medium">
                          🎉 You'll finish {liveResult.monthsSaved} months earlier!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* AI Recommendation */}
              {advisorAutoPick && liveResult?.reason && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-600" />
                      AI Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-amber-800 dark:text-amber-200 leading-relaxed">{liveResult.reason}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
