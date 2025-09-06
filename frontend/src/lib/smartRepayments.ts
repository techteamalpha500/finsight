// Smart Repayments System - Revolutionary Features

export interface SmartLiability {
  id: string;
  type: 'loan' | 'credit_card' | 'bnpl' | 'gold_loan' | 'personal_loan' | 'business_loan' | 'education_loan' | 'other';
  category: 'secured' | 'unsecured' | 'revolving' | 'term';
  institution: string;
  principal: number;
  interest_rate: number;
  emi_amount: number;
  tenure_months: number;
  outstanding_balance: number;
  start_date: string;
  due_date: string;
  status: 'active' | 'closed' | 'default';
  
  // Smart features
  interest_type: 'simple' | 'compound' | 'reducing_balance';
  compounding_frequency: 'monthly' | 'quarterly' | 'annually';
  grace_period_days: number;
  late_fee_percentage: number;
  prepayment_allowed: boolean;
  prepayment_penalty: number;
  
  // Risk assessment
  risk_score: number; // 1-10
  priority_level: 'high' | 'medium' | 'low';
  impact_on_credit_score: 'high' | 'medium' | 'low';
  
  created_at: string;
  updated_at: string;
}

export interface InterestSimulation {
  month: number;
  date: string;
  outstanding_balance: number;
  interest_accrued: number;
  emi_paid: number;
  principal_paid: number;
  cumulative_interest: number;
  total_paid: number;
  remaining_balance: number;
}

export interface PrepaymentStrategy {
  id: string;
  name: string;
  description: string;
  type: 'lump_sum' | 'extra_emi' | 'frequency_increase' | 'refinance' | 'balance_transfer';
  amount: number;
  frequency?: 'monthly' | 'quarterly' | 'annually';
  start_month: number;
  end_month?: number;
  
  // Results
  interest_saved: number;
  tenure_reduced_months: number;
  new_closure_date: string;
  total_savings: number;
  roi_percentage: number;
  
  // Risk factors
  risk_level: 'low' | 'medium' | 'high';
  liquidity_impact: 'low' | 'medium' | 'high';
  credit_impact: 'positive' | 'neutral' | 'negative';
}

export interface SmartInsight {
  id: string;
  type: 'optimization' | 'warning' | 'opportunity' | 'risk';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action_required: string;
  potential_savings?: number;
  risk_level?: 'low' | 'medium' | 'high';
  category: 'prepayment' | 'refinance' | 'consolidation' | 'timing' | 'strategy';
}

export interface DebtConsolidationPlan {
  id: string;
  name: string;
  description: string;
  current_liabilities: string[];
  new_loan_amount: number;
  new_interest_rate: number;
  new_tenure_months: number;
  new_emi_amount: number;
  
  // Benefits
  monthly_savings: number;
  total_interest_saved: number;
  simplified_management: boolean;
  credit_score_improvement: number;
  
  // Requirements
  eligibility_criteria: string[];
  required_documents: string[];
  processing_time_days: number;
  fees_charges: number;
}

// Smart calculation functions
export function calculateInterestAccrual(
  principal: number,
  interestRate: number,
  months: number,
  emiAmount: number = 0,
  interestType: 'simple' | 'compound' | 'reducing_balance' = 'reducing_balance'
): InterestSimulation[] {
  const simulation: InterestSimulation[] = [];
  let outstandingBalance = principal;
  let cumulativeInterest = 0;
  let totalPaid = 0;
  
  for (let month = 1; month <= months; month++) {
    const monthlyRate = interestRate / 100 / 12;
    let interestAccrued = 0;
    let principalPaid = 0;
    
    if (interestType === 'simple') {
      interestAccrued = principal * monthlyRate;
    } else if (interestType === 'compound') {
      interestAccrued = outstandingBalance * monthlyRate;
    } else { // reducing_balance
      interestAccrued = outstandingBalance * monthlyRate;
    }
    
    if (emiAmount > 0) {
      principalPaid = Math.min(emiAmount - interestAccrued, outstandingBalance);
      outstandingBalance = Math.max(0, outstandingBalance - principalPaid);
      totalPaid += emiAmount;
    } else {
      // No EMI - interest keeps accumulating
      outstandingBalance += interestAccrued;
    }
    
    cumulativeInterest += interestAccrued;
    
    simulation.push({
      month,
      date: new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      outstanding_balance: outstandingBalance,
      interest_accrued: interestAccrued,
      emi_paid: emiAmount,
      principal_paid: principalPaid,
      cumulative_interest: cumulativeInterest,
      total_paid: totalPaid,
      remaining_balance: outstandingBalance
    });
  }
  
  return simulation;
}

export function generatePrepaymentStrategies(liability: SmartLiability): PrepaymentStrategy[] {
  const strategies: PrepaymentStrategy[] = [];
  
  // Strategy 1: Lump sum prepayment
  const lumpSumAmount = Math.min(liability.outstanding_balance * 0.2, 100000); // 20% or 1L max
  if (lumpSumAmount > 10000) {
    strategies.push({
      id: 'lump_sum_20',
      name: 'Lump Sum Prepayment',
      description: `Pay ₹${lumpSumAmount.toLocaleString()} as one-time prepayment`,
      type: 'lump_sum',
      amount: lumpSumAmount,
      start_month: 1,
      interest_saved: calculateLumpSumSavings(liability, lumpSumAmount),
      tenure_reduced_months: calculateTenureReduction(liability, lumpSumAmount),
      new_closure_date: calculateNewClosureDate(liability, lumpSumAmount),
      total_savings: calculateLumpSumSavings(liability, lumpSumAmount),
      roi_percentage: 15.2,
      risk_level: 'low',
      liquidity_impact: 'medium',
      credit_impact: 'positive'
    });
  }
  
  // Strategy 2: Extra EMI
  const extraEMI = Math.min(liability.emi_amount * 0.5, 5000); // 50% extra or 5K max
  if (extraEMI > 1000) {
    strategies.push({
      id: 'extra_emi_50',
      name: 'Extra EMI Strategy',
      description: `Pay ₹${extraEMI.toLocaleString()} extra every month`,
      type: 'extra_emi',
      amount: extraEMI,
      frequency: 'monthly',
      start_month: 1,
      interest_saved: calculateExtraEMISavings(liability, extraEMI),
      tenure_reduced_months: calculateExtraEMITenureReduction(liability, extraEMI),
      new_closure_date: calculateExtraEMIClosureDate(liability, extraEMI),
      total_savings: calculateExtraEMISavings(liability, extraEMI),
      roi_percentage: 12.8,
      risk_level: 'low',
      liquidity_impact: 'low',
      credit_impact: 'positive'
    });
  }
  
  // Strategy 3: Frequency increase (if applicable)
  if (liability.type === 'personal_loan' || liability.type === 'business_loan') {
    strategies.push({
      id: 'frequency_increase',
      name: 'Bi-weekly Payments',
      description: 'Switch to bi-weekly payments instead of monthly',
      type: 'frequency_increase',
      amount: liability.emi_amount / 2,
      frequency: 'monthly',
      start_month: 1,
      interest_saved: calculateFrequencyIncreaseSavings(liability),
      tenure_reduced_months: 6,
      new_closure_date: calculateFrequencyIncreaseClosureDate(liability),
      total_savings: calculateFrequencyIncreaseSavings(liability),
      roi_percentage: 8.5,
      risk_level: 'low',
      liquidity_impact: 'low',
      credit_impact: 'positive'
    });
  }
  
  return strategies;
}

export function generateSmartInsights(liabilities: SmartLiability[]): SmartInsight[] {
  const insights: SmartInsight[] = [];
  
  // High interest rate warning
  const highInterestLiabilities = liabilities.filter(l => l.interest_rate > 15);
  if (highInterestLiabilities.length > 0) {
    insights.push({
      id: 'high_interest_warning',
      type: 'warning',
      priority: 'high',
      title: 'High Interest Rate Alert',
      description: `You have ${highInterestLiabilities.length} liability(ies) with interest rates above 15%`,
      impact: 'High interest rates are significantly increasing your debt burden',
      action_required: 'Consider refinancing or prepayment strategies',
      potential_savings: calculateHighInterestSavings(highInterestLiabilities),
      risk_level: 'high',
      category: 'prepayment'
    });
  }
  
  // Debt consolidation opportunity
  const totalEMI = liabilities.reduce((sum, l) => sum + l.emi_amount, 0);
  const avgInterestRate = liabilities.reduce((sum, l) => sum + l.interest_rate, 0) / liabilities.length;
  
  if (liabilities.length > 3 && avgInterestRate > 12) {
    insights.push({
      id: 'consolidation_opportunity',
      type: 'opportunity',
      priority: 'medium',
      title: 'Debt Consolidation Opportunity',
      description: 'You have multiple high-interest liabilities that could be consolidated',
      impact: 'Potential monthly savings of ₹' + Math.round(totalEMI * 0.15).toLocaleString(),
      action_required: 'Explore debt consolidation loan options',
      potential_savings: totalEMI * 0.15 * 12, // Annual savings
      risk_level: 'medium',
      category: 'consolidation'
    });
  }
  
  // Prepayment optimization
  const prepaymentCandidates = liabilities.filter(l => l.interest_rate > 10 && l.outstanding_balance > 50000);
  if (prepaymentCandidates.length > 0) {
    insights.push({
      id: 'prepayment_optimization',
      type: 'optimization',
      priority: 'medium',
      title: 'Prepayment Optimization',
      description: `${prepaymentCandidates.length} liability(ies) are good candidates for prepayment`,
      impact: 'Strategic prepayments could save significant interest',
      action_required: 'Use prepayment calculator to find optimal strategies',
      potential_savings: calculatePrepaymentOptimizationSavings(prepaymentCandidates),
      risk_level: 'low',
      category: 'prepayment'
    });
  }
  
  return insights;
}

// Helper calculation functions
function calculateLumpSumSavings(liability: SmartLiability, amount: number): number {
  const monthlyRate = liability.interest_rate / 100 / 12;
  const remainingMonths = Math.ceil(liability.outstanding_balance / liability.emi_amount);
  const newBalance = liability.outstanding_balance - amount;
  const newMonths = Math.ceil(newBalance / liability.emi_amount);
  
  const originalInterest = (liability.emi_amount * remainingMonths) - liability.outstanding_balance;
  const newInterest = (liability.emi_amount * newMonths) - newBalance;
  
  return originalInterest - newInterest;
}

function calculateTenureReduction(liability: SmartLiability, amount: number): number {
  const remainingMonths = Math.ceil(liability.outstanding_balance / liability.emi_amount);
  const newBalance = liability.outstanding_balance - amount;
  const newMonths = Math.ceil(newBalance / liability.emi_amount);
  
  return remainingMonths - newMonths;
}

function calculateNewClosureDate(liability: SmartLiability, amount: number): string {
  const newBalance = liability.outstanding_balance - amount;
  const newMonths = Math.ceil(newBalance / liability.emi_amount);
  const closureDate = new Date();
  closureDate.setMonth(closureDate.getMonth() + newMonths);
  
  return closureDate.toISOString().split('T')[0];
}

function calculateExtraEMISavings(liability: SmartLiability, extraAmount: number): number {
  const totalEMI = liability.emi_amount + extraAmount;
  const remainingMonths = Math.ceil(liability.outstanding_balance / liability.emi_amount);
  const newMonths = Math.ceil(liability.outstanding_balance / totalEMI);
  
  const originalInterest = (liability.emi_amount * remainingMonths) - liability.outstanding_balance;
  const newInterest = (totalEMI * newMonths) - liability.outstanding_balance;
  
  return originalInterest - newInterest;
}

function calculateExtraEMITenureReduction(liability: SmartLiability, extraAmount: number): number {
  const totalEMI = liability.emi_amount + extraAmount;
  const remainingMonths = Math.ceil(liability.outstanding_balance / liability.emi_amount);
  const newMonths = Math.ceil(liability.outstanding_balance / totalEMI);
  
  return remainingMonths - newMonths;
}

function calculateExtraEMIClosureDate(liability: SmartLiability, extraAmount: number): string {
  const totalEMI = liability.emi_amount + extraAmount;
  const newMonths = Math.ceil(liability.outstanding_balance / totalEMI);
  const closureDate = new Date();
  closureDate.setMonth(closureDate.getMonth() + newMonths);
  
  return closureDate.toISOString().split('T')[0];
}

function calculateFrequencyIncreaseSavings(liability: SmartLiability): number {
  // Bi-weekly payments = 26 payments per year vs 12 monthly
  const biWeeklyAmount = liability.emi_amount / 2;
  const annualPayments = 26;
  const annualAmount = biWeeklyAmount * annualPayments;
  const monthlyEquivalent = annualAmount / 12;
  
  const remainingMonths = Math.ceil(liability.outstanding_balance / liability.emi_amount);
  const newMonths = Math.ceil(liability.outstanding_balance / monthlyEquivalent);
  
  const originalInterest = (liability.emi_amount * remainingMonths) - liability.outstanding_balance;
  const newInterest = (monthlyEquivalent * newMonths) - liability.outstanding_balance;
  
  return originalInterest - newInterest;
}

function calculateFrequencyIncreaseClosureDate(liability: SmartLiability): string {
  const biWeeklyAmount = liability.emi_amount / 2;
  const annualPayments = 26;
  const annualAmount = biWeeklyAmount * annualPayments;
  const monthlyEquivalent = annualAmount / 12;
  
  const newMonths = Math.ceil(liability.outstanding_balance / monthlyEquivalent);
  const closureDate = new Date();
  closureDate.setMonth(closureDate.getMonth() + newMonths);
  
  return closureDate.toISOString().split('T')[0];
}

function calculateHighInterestSavings(liabilities: SmartLiability[]): number {
  return liabilities.reduce((sum, l) => {
    const potentialSavings = l.outstanding_balance * (l.interest_rate - 12) / 100; // Assuming 12% refinancing
    return sum + potentialSavings;
  }, 0);
}

function calculatePrepaymentOptimizationSavings(liabilities: SmartLiability[]): number {
  return liabilities.reduce((sum, l) => {
    const prepaymentAmount = Math.min(l.outstanding_balance * 0.1, 50000); // 10% or 50K
    return sum + calculateLumpSumSavings(l, prepaymentAmount);
  }, 0);
}

// Utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getRiskColor(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'high': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
  }
}

export function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
  }
}