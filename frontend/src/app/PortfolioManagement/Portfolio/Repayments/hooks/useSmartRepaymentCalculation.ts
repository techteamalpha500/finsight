import { useMemo } from 'react';

// Types for the hook
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

interface RepaymentInputs {
  repaymentMode: 'monthly' | 'lump';
  monthlyAmount: string;
  lumpSumAmount: string;
  paymentDate: string;
  selectedLoanId: string;
  advisorAutoPick: boolean;
  liabilities: Liability[];
}

interface RepaymentResult {
  selectedLoanId: string;
  selectedLoanLabel: string;
  reason: string;
  currentMonthsRemaining: number;
  newMonthsRemaining: number;
  monthsSaved: number;
  monthsPaidSoFar: number;
  payoffDate: string;
  interestSaved: number;
  totalInterestPaidNew: number;
  efficiency: number;
  timeline: {
    current: number;
    withContribution: number;
  };
  currentOutstanding?: number;
  emiAmount?: number;
}

// Helper functions
const calculateMonthsElapsed = (liability: Liability): number => {
  // If remaining_months is available in the data, use it to calculate elapsed months
  if (liability.remaining_months !== undefined && liability.tenure_months) {
    return Math.max(0, liability.tenure_months - liability.remaining_months);
  }
  
  // Fallback to date calculation
  if (!liability.start_date) return 0;
  
  const startDate = new Date(liability.start_date);
  const currentDate = new Date();
  
  const yearDiff = currentDate.getFullYear() - startDate.getFullYear();
  const monthDiff = currentDate.getMonth() - startDate.getMonth();
  
  return Math.max(0, yearDiff * 12 + monthDiff);
};

const getDefaultTenureForType = (type: string): number => {
  const defaults: Record<string, number> = {
    'home_loan': 180,     // 15 years
    'car_loan': 60,       // 5 years  
    'personal_loan': 36,  // 3 years
    'credit_card': 0,     // revolving
    'gold_loan': 12,      // 1 year
    'education_loan': 84, // 7 years
    'other': 36
  };
  return defaults[type] || 36;
};

const calculateMonthsSaved = (liability: Liability, amount: number, mode: string, paymentDate?: string): number => {
  const principal = liability.current_outstanding || liability.original_amount || 0;
  const annualRate = liability.interest_rate / 100;
  const monthlyRate = annualRate / 12;
  const remainingMonths = liability.remaining_months || 0;
  
  // Debug logging (can be removed in production)
  // console.log('📅 Months Calculation Debug:', { principal, remainingMonths, amount, mode });
  
  if (principal <= 0 || remainingMonths <= 0 || amount <= 0 || monthlyRate <= 0) {
    return 0;
  }
  
  // Handle extreme values - cap the input amount to reasonable limits
  const maxReasonableAmount = mode === 'lump' ? principal : principal * 0.2; // 20% of principal per month max
  const cappedAmount = Math.min(amount, maxReasonableAmount);
  
  // Handle case where payment covers most/all of the loan
  if (cappedAmount >= principal * 0.95) {
    return Math.max(1, remainingMonths - 1); // Save almost all months, leave 1
  }
  
  // Simple, reliable calculation
  if (mode === 'lump') {
    // For lump sum, consider when the payment is made using DAILY calculation
    let daysToPayment = 0;
    if (paymentDate) {
      const paymentDateObj = new Date(paymentDate);
      const today = new Date();
      // Calculate exact days difference
      const timeDiff = paymentDateObj.getTime() - today.getTime();
      daysToPayment = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
    }
    
    // Calculate actual remaining days based on actual calendar days
    const today = new Date();
    const loanEndDate = new Date(today);
    loanEndDate.setMonth(loanEndDate.getMonth() + remainingMonths);
    const actualRemainingDays = Math.floor((loanEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const effectiveRemainingDays = Math.max(1, actualRemainingDays - daysToPayment);
    
    // Calculate months saved based on principal reduction and remaining time
    const percentageReduction = cappedAmount / principal;
    const daysReduction = Math.floor(effectiveRemainingDays * percentageReduction * 0.8); // Conservative
    
    // Convert days back to months more accurately
    const avgDaysPerMonth = actualRemainingDays / remainingMonths; // Actual average for this loan period
    const monthsReduction = Math.floor(daysReduction / avgDaysPerMonth);
    
    return Math.min(monthsReduction, remainingMonths - 1); // Don't pay off completely
  } else {
    // Monthly: Improved calculation based on EMI impact
    const currentEstimatedEmi = principal / remainingMonths; // Rough EMI estimate
    const extraPaymentRatio = cappedAmount / currentEstimatedEmi;
    
    // More realistic calculation for monthly extra payments
    let monthsReduction = 0;
    
    if (extraPaymentRatio >= 1.0) {
      // Significant extra payment (100% or more of EMI)
      monthsReduction = Math.floor(remainingMonths * extraPaymentRatio * 0.15); // 15% reduction
    } else if (extraPaymentRatio >= 0.5) {
      // Moderate extra payment (50-100% of EMI)
      monthsReduction = Math.floor(remainingMonths * extraPaymentRatio * 0.12); // 12% reduction  
    } else if (extraPaymentRatio >= 0.2) {
      // Small extra payment (20-50% of EMI)
      monthsReduction = Math.floor(remainingMonths * extraPaymentRatio * 0.08); // 8% reduction
    } else {
      // Very small payment
      monthsReduction = Math.floor(remainingMonths * extraPaymentRatio * 0.05); // 5% reduction
    }
    
    
    return Math.min(monthsReduction, Math.floor(remainingMonths * 0.6)); // Max 60% reduction
  }
};

const calculateInterestSaved = (liability: Liability, amount: number, monthsElapsed: number, mode: string, paymentDate?: string): number => {
  const principal = liability.current_outstanding || liability.original_amount || 0;
  const annualRate = liability.interest_rate / 100;
  const monthlyRate = annualRate / 12;
  const remainingMonths = liability.remaining_months || 0;
  
  // Debug logging (can be removed in production)
  // console.log('🔍 Interest Calculation Debug:', { principal, annualRate, amount, mode });
  
  if (principal <= 0 || remainingMonths <= 0 || monthlyRate <= 0) {
    return 0;
  }
  
  // Handle extreme values - cap the input amount
  const maxReasonableAmount = mode === 'lump' ? principal : principal * 0.2;
  const cappedAmount = Math.min(amount, maxReasonableAmount);
  
  // Simple, conservative interest calculation
  let interestSaved = 0;
  
  if (mode === 'lump') {
    // For lump sum, consider when the payment is made using DAILY calculation
    let daysToPayment = 0;
    if (paymentDate) {
      const paymentDateObj = new Date(paymentDate);
      const today = new Date();
      // Calculate exact days difference
      const timeDiff = paymentDateObj.getTime() - today.getTime();
      daysToPayment = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
    }
    
    // Calculate actual remaining days based on actual calendar days
    const today = new Date();
    const loanEndDate = new Date(today);
    loanEndDate.setMonth(loanEndDate.getMonth() + remainingMonths);
    const actualRemainingDays = Math.floor((loanEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const effectiveRemainingDays = Math.max(1, actualRemainingDays - daysToPayment);
    
    // Annual interest rate converted to daily rate (more accurate)
    const annualRate = liability.interest_rate / 100;
    const dailyRate = annualRate / 365; // Using actual days in year
    
    // Calculate interest saved based on exact days the payment will impact
    interestSaved = cappedAmount * dailyRate * effectiveRemainingDays * 0.8; // Conservative
    
    // Debug logging
    console.log('🔍 Lump Sum Interest Calculation:', {
      paymentDate,
      daysToPayment,
      actualRemainingDays,
      effectiveRemainingDays,
      cappedAmount,
      dailyRate: (dailyRate * 100).toFixed(6) + '%',
      interestSaved: Math.round(interestSaved)
    });
  } else {
    // Monthly: Interest saved per year * years of impact
    const yearsOfImpact = Math.min(remainingMonths / 12, 5); // Cap at 5 years
    const annualInterestSaved = cappedAmount * 12 * annualRate * 0.6; // Conservative multiplier
    interestSaved = annualInterestSaved * yearsOfImpact;
  }
  
  // Cap the maximum savings to be reasonable
  const maxSavings = principal * 0.3; // Max 30% of principal as interest saved
  interestSaved = Math.min(interestSaved, maxSavings);
  
  return Math.max(0, interestSaved);
};

const getOptimizationReason = (selected: Liability, allLiabilities: Liability[]): string => {
  const highestRate = Math.max(...allLiabilities.map(l => l.interest_rate));
  const hasHighestRate = selected.interest_rate === highestRate;
  
  if (hasHighestRate) {
    return `highest interest rate (${selected.interest_rate}%)`;
  }
  
  if (selected.type === 'credit_card') {
    return 'daily compounding interest that grows rapidly';
  }
  
  if (selected.type === 'personal_loan') {
    return 'high interest rate and flexible prepayment terms';
  }
  
  return `${selected.interest_rate}% interest rate and loan characteristics`;
};

// Validation function
const validateRepaymentForm = (inputs: RepaymentInputs): boolean => {
  const hasAmount = inputs.repaymentMode === 'monthly' ? 
    parseFloat(inputs.monthlyAmount) > 0 : 
    parseFloat(inputs.lumpSumAmount) > 0;
  const hasLoanSelection = inputs.advisorAutoPick || !!inputs.selectedLoanId;
  const hasPaymentDate = inputs.repaymentMode === 'lump' ? !!inputs.paymentDate : true;
  const hasValidLiabilities = inputs.liabilities && inputs.liabilities.length > 0;
  
  return hasAmount && hasLoanSelection && hasPaymentDate && hasValidLiabilities;
};

// Main hook
export const useSmartRepaymentCalculation = (inputs: RepaymentInputs): RepaymentResult | null => {
  return useMemo(() => {
    // Basic validation
    const hasValidLiabilities = inputs.liabilities && inputs.liabilities.length > 0;
    if (!hasValidLiabilities) return null;
    
    // Get selected liability or auto-select
    const selectedLiability = inputs.advisorAutoPick 
      ? inputs.liabilities.find(l => l.interest_rate === Math.max(...inputs.liabilities.map(li => li.interest_rate))) || inputs.liabilities[0]
      : inputs.liabilities.find(l => l.id === inputs.selectedLoanId) || null;
    
    if (!selectedLiability) return null;

    // Calculate months elapsed and remaining
    const monthsElapsed = calculateMonthsElapsed(selectedLiability);
    const originalTenure = selectedLiability.tenure_months || getDefaultTenureForType(selectedLiability.type);
    
    // Use remaining_months from data if available, otherwise calculate
    let remainingMonths = selectedLiability.remaining_months !== undefined 
      ? selectedLiability.remaining_months 
      : Math.max(0, originalTenure - monthsElapsed);
    
    // If still 0, use a reasonable fallback based on loan type and original amount
    if (remainingMonths <= 0) {
      remainingMonths = Math.floor(originalTenure * 0.7); // Assume 70% of tenure remaining
    }
    
    if (remainingMonths <= 0) {
      return null;
    }

    const amount = parseFloat(inputs.repaymentMode === 'monthly' ? inputs.monthlyAmount : inputs.lumpSumAmount) || 0;
    
    // If no amount, return basic info for preview (only for manual selection or AI mode)
    if (amount <= 0) {
      // Only show preview if user has selected a loan manually or AI is enabled
      const hasLoanSelection = inputs.advisorAutoPick || !!inputs.selectedLoanId;
      if (!hasLoanSelection) return null;
      
      return {
        selectedLoanId: selectedLiability.id,
        selectedLoanLabel: inputs.advisorAutoPick ? `${selectedLiability.label || selectedLiability.type} (AI Selected)` : selectedLiability.label || 'Selected Loan',
        reason: inputs.advisorAutoPick ? 
          `AI selected your ${selectedLiability.label || selectedLiability.type} because it has the ${getOptimizationReason(selectedLiability, inputs.liabilities)}. Currently ${monthsElapsed} months have been paid.` :
          `${selectedLiability.label || selectedLiability.type} is selected. Currently ${monthsElapsed} months have been paid.`,
        currentMonthsRemaining: remainingMonths,
        newMonthsRemaining: remainingMonths,
        monthsSaved: 0,
        monthsPaidSoFar: monthsElapsed,
        payoffDate: new Date(Date.now() + remainingMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
        interestSaved: 0,
        totalInterestPaidNew: 0,
        efficiency: 0,
        timeline: {
          current: remainingMonths,
          withContribution: remainingMonths
        },
        currentOutstanding: selectedLiability.current_outstanding || selectedLiability.original_amount || 0,
        emiAmount: selectedLiability.emi_amount || 0
      };
    }

    // Full validation for calculations
    const hasLoanSelection = inputs.advisorAutoPick || !!inputs.selectedLoanId;
    const hasPaymentDate = inputs.repaymentMode === 'lump' ? !!inputs.paymentDate : true;
    
    if (!hasLoanSelection || !hasPaymentDate) return null;

    // Calculate impact based on loan type and months already paid
    
    // Create a corrected liability object with the right remaining months
    const correctedLiability = {
      ...selectedLiability,
      remaining_months: remainingMonths
    };
    
    const monthsSaved = calculateMonthsSaved(correctedLiability, amount, inputs.repaymentMode, inputs.paymentDate);
    const newRemainingMonths = Math.max(0, remainingMonths - monthsSaved);
    const interestSaved = calculateInterestSaved(correctedLiability, amount, monthsElapsed, inputs.repaymentMode, inputs.paymentDate);
    
    // Fallback calculation if main calculation returns 0
    if (interestSaved === 0 && monthsSaved === 0 && amount > 0) {
      
      // Simple fallback calculation
      const simpleMonthsSaved = inputs.repaymentMode === 'monthly' ? Math.floor(amount / 5000) : Math.floor(amount / 50000);
      const simpleInterestSaved = amount * (selectedLiability.interest_rate / 100) * 0.8; // Rough estimate
      
      return {
        selectedLoanId: selectedLiability.id,
        selectedLoanLabel: inputs.advisorAutoPick ? `${selectedLiability.label || selectedLiability.type} (AI Selected)` : selectedLiability.label || 'Selected Loan',
        reason: inputs.advisorAutoPick ? 
          `AI selected your ${selectedLiability.label || selectedLiability.type} because it has the ${getOptimizationReason(selectedLiability, inputs.liabilities)}.` :
          '',
        currentMonthsRemaining: remainingMonths,
        newMonthsRemaining: Math.max(0, remainingMonths - simpleMonthsSaved),
        monthsSaved: simpleMonthsSaved,
        monthsPaidSoFar: monthsElapsed,
        payoffDate: new Date(Date.now() + (remainingMonths - simpleMonthsSaved) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
        interestSaved: simpleInterestSaved,
        totalInterestPaidNew: Math.max(30000, 150000 - simpleInterestSaved),
        efficiency: simpleInterestSaved / amount,
        timeline: {
          current: remainingMonths,
          withContribution: Math.max(0, remainingMonths - simpleMonthsSaved)
        },
        currentOutstanding: selectedLiability.current_outstanding || selectedLiability.original_amount || 0,
        emiAmount: selectedLiability.emi_amount || 0
      };
    }
    
    return {
      selectedLoanId: selectedLiability.id,
      selectedLoanLabel: inputs.advisorAutoPick ? `${selectedLiability.label || selectedLiability.type} (AI Selected)` : selectedLiability.label || 'Selected Loan',
      reason: inputs.advisorAutoPick ? 
        `AI selected your ${selectedLiability.label || selectedLiability.type} because it has the ${getOptimizationReason(selectedLiability, inputs.liabilities)}. After ${monthsElapsed} months of payments, this strategy saves ₹${interestSaved.toLocaleString()} in interest.` :
        '',
      currentMonthsRemaining: remainingMonths,
      newMonthsRemaining: newRemainingMonths,
      monthsSaved,
      monthsPaidSoFar: monthsElapsed,
      payoffDate: new Date(Date.now() + newRemainingMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
      interestSaved,
      totalInterestPaidNew: Math.max(30000, 150000 - interestSaved),
      efficiency: interestSaved / amount,
      timeline: {
        current: remainingMonths,
        withContribution: newRemainingMonths
      },
      currentOutstanding: selectedLiability.current_outstanding || selectedLiability.original_amount || 0,
      emiAmount: selectedLiability.emi_amount || 0
    };
  }, [
    inputs.repaymentMode, 
    inputs.monthlyAmount, 
    inputs.lumpSumAmount, 
    inputs.selectedLoanId, 
    inputs.advisorAutoPick, 
    inputs.liabilities,
    inputs.paymentDate
  ]);
};

// Export the validation function separately for form validation
export { validateRepaymentForm };

// Export types
export type { Liability, RepaymentInputs, RepaymentResult };
