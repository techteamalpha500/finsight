// -------------------- TYPES --------------------
export type LoanCategory =
  | 'home_loan'
  | 'car_loan'
  | 'personal_loan'
  | 'credit_card'
  | 'gold_loan'
  | 'education_loan'
  | 'other';

export interface UltraSimpleLiabilityInput {
  type: LoanCategory;
  interest_rate: number;
  institution: string;
  start_date: string; // YYYY-MM-DD
  original_amount: number;
  tenure_months?: number;
}

export interface PrepaymentEntry {
  date: string;
  amount: number;
  type: 'principal' | 'interest';
}

export interface PaymentEntry {
  date: string;
  amount: number;
  type: 'minimum' | 'partial' | 'full';
}

export interface CreditCardInput extends UltraSimpleLiabilityInput {
  type: 'credit_card';
  payments?: PaymentEntry[];
}

export interface GoldLoanInput extends UltraSimpleLiabilityInput {
  type: 'gold_loan';
  compounding: 'simple' | 'monthly' | 'quarterly';
}

export interface EnhancedLoanStatus {
  id?: string;
  loanType: 'emi' | 'credit_card' | 'gold_loan' | 'generic';
  loanCategory: LoanCategory;
  originalAmount: number;
  interest_rate: number; // Added missing field
  emi: number;
  outstandingBalance: number;
  monthsElapsed: number;
  remainingMonths: number;
  monthlyInterestAccrual: number;
  minimumDue?: number;
  prepaymentSavings?: number;
  totalInterestPaid?: number;
  totalInterestAccrued?: number;
  originalTenure?: number;
  startDate?: string;
  explanation: string;
  calculationBreakdown: {
    emiFormula?: string;
    outstandingFormula?: string;
    interestAccrualFormula?: string;
    compoundingType?: 'simple' | 'monthly' | 'quarterly';
  };
}

// -------------------- ENGINE --------------------
export class LoanEngine {
  // Default tenure mapping
  private getDefaultTenure(type: LoanCategory): number {
    const defaults: Record<LoanCategory, number> = {
      home_loan: 180,       // 15 yrs
      car_loan: 60,         // 5 yrs
      personal_loan: 36,    // 3 yrs
      credit_card: 0,       // revolving
      gold_loan: 12,        // 1 yr
      education_loan: 84,   // 7 yrs
      other: 36             // fallback
    };
    return defaults[type];
  }

  // Validate input data
  private validateInput(input: UltraSimpleLiabilityInput | CreditCardInput | GoldLoanInput): void {
    if (!input.type) throw new Error('Loan type is required');
    if (input.interest_rate < 0 || input.interest_rate > 100) {
      throw new Error('Interest rate must be between 0 and 100');
    }
    if (input.original_amount <= 0) {
      throw new Error('Original amount must be positive');
    }
    if (input.tenure_months !== undefined && input.tenure_months < 0) {
      throw new Error('Tenure cannot be negative');
    }
  }

  // Main entry point
  calculateEverything(
    input: UltraSimpleLiabilityInput | CreditCardInput | GoldLoanInput,
    prepayments?: PrepaymentEntry[]
  ): EnhancedLoanStatus {
    // Validate input first
    this.validateInput(input);
    const startDate = new Date(input.start_date);
    const currentDate = new Date();
    const monthsElapsed = this.getMonthsElapsed(startDate, currentDate);

    const tenure = input.tenure_months || this.getDefaultTenure(input.type);

    let status: EnhancedLoanStatus;

    if (input.type === 'credit_card') {
      status = this.calculateCreditCard(input as CreditCardInput, monthsElapsed);
    } else if (input.type === 'gold_loan') {
      status = this.calculateGoldLoan(input as GoldLoanInput, monthsElapsed);
    } else if (tenure > 0) {
      status = this.calculateEMILoan(input, monthsElapsed, tenure);
    } else {
      status = this.calculateGenericLoan(input, monthsElapsed);
    }

    // Apply prepayments if any
    if (prepayments && prepayments.length > 0) {
      status = this.applyPrepayments(status, prepayments, input.interest_rate);
    }

    return status;
  }

  // -------------------- EMI LOANS --------------------
  private calculateEMILoan(
    input: UltraSimpleLiabilityInput,
    monthsElapsed: number,
    tenure: number
  ): EnhancedLoanStatus {
    const monthlyRate = input.interest_rate / 100 / 12;
    
    // Handle edge cases
    let emi: number;
    if (monthlyRate === 0) {
      // Zero interest rate - simple division
      emi = input.original_amount / tenure;
    } else if (tenure === 0) {
      // No tenure - treat as one-time payment
      emi = input.original_amount;
    } else {
      // Standard EMI calculation
      emi =
        (input.original_amount *
          monthlyRate *
          Math.pow(1 + monthlyRate, tenure)) /
        (Math.pow(1 + monthlyRate, tenure) - 1);
    }

    const outstanding = this.calculateOutstandingBalanceAccurate(
      input.original_amount,
      input.interest_rate,
      emi,
      monthsElapsed,
      tenure
    );

    return {
      id: Math.random().toString(),
      loanType: 'emi',
      loanCategory: input.type,
      originalAmount: input.original_amount,
      interest_rate: input.interest_rate, // Added missing field
      emi,
      outstandingBalance: outstanding,
      monthsElapsed,
      remainingMonths: Math.max(0, tenure - monthsElapsed),
      monthlyInterestAccrual: outstanding * monthlyRate,
      originalTenure: tenure,
      startDate: input.start_date,
      explanation: `EMI loan of ₹${input.original_amount.toLocaleString()} at ${input.interest_rate}% for ${tenure} months. After ${monthsElapsed} months, outstanding balance is ₹${outstanding.toLocaleString()}.`,
      calculationBreakdown: {
        emiFormula: 'P × r × (1+r)^n / ((1+r)^n - 1)',
        outstandingFormula:
          'P × ((1+r)^n - (1+r)^p) / ((1+r)^n - 1)',
      }
    };
  }

  private calculateOutstandingBalanceAccurate(
    principal: number,
    annualRate: number,
    emi: number,
    monthsElapsed: number,
    tenure: number
  ): number {
    const monthlyRate = annualRate / 100 / 12;
    
    // Handle edge cases
    if (monthsElapsed >= tenure) return 0;
    if (tenure === 0) return Math.max(0, principal - (emi * monthsElapsed));
    if (monthlyRate === 0) return Math.max(0, principal - (emi * monthsElapsed));

    // Calculate outstanding balance using proper formula considering months already paid
    // Outstanding = Principal * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
    // where p = monthsElapsed, n = tenure, r = monthlyRate
    const powerN = Math.pow(1 + monthlyRate, tenure);
    const powerP = Math.pow(1 + monthlyRate, monthsElapsed);
    
    const numerator =
      Math.pow(1 + monthlyRate, tenure) -
      Math.pow(1 + monthlyRate, monthsElapsed);
    const denominator = Math.pow(1 + monthlyRate, tenure) - 1;
    return Math.max(0, principal * (numerator / denominator));
  }

  // -------------------- CREDIT CARD --------------------
  private calculateCreditCard(
    input: CreditCardInput,
    monthsElapsed: number
  ): EnhancedLoanStatus {
    const dailyRate = input.interest_rate / 100 / 365;
    let balance = input.original_amount;
    let totalInterestPaid = 0;

    for (let m = 1; m <= monthsElapsed; m++) {
      const monthStart = new Date(input.start_date);
      monthStart.setMonth(monthStart.getMonth() + m - 1);
      const daysInMonth = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0
      ).getDate();

      const interest = balance * dailyRate * daysInMonth;
      balance += interest;
      totalInterestPaid += interest;

      const monthPayments =
        input.payments?.filter((p) =>
          this.isSameMonth(new Date(p.date), monthStart)
        ) || [];
      const totalPayments = monthPayments.reduce((s, p) => s + p.amount, 0);
      balance = Math.max(0, balance - totalPayments);
    }

    return {
      id: Math.random().toString(),
      loanType: 'credit_card',
      loanCategory: input.type,
      originalAmount: input.original_amount,
      interest_rate: input.interest_rate, // Added missing field
      emi: 0,
      outstandingBalance: balance,
      monthsElapsed,
      remainingMonths: 0,
      monthlyInterestAccrual: balance * (input.interest_rate / 100 / 12),
      minimumDue: Math.max(balance * 0.05, 500),
      totalInterestPaid,
      startDate: input.start_date,
      explanation: `Credit card balance grew to ₹${balance.toLocaleString()} at ${input.interest_rate}% annual interest after ${monthsElapsed} months.`,
      calculationBreakdown: {
        interestAccrualFormula: 'Daily compounding',
      }
    };
  }

  private isSameMonth(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
  }

  // -------------------- GOLD LOAN --------------------
  private calculateGoldLoan(
    input: GoldLoanInput,
    monthsElapsed: number
  ): EnhancedLoanStatus {
    const annualRate = input.interest_rate / 100;
    let outstanding: number;
    let totalInterestAccrued: number;

    switch (input.compounding) {
      case 'simple': {
        const monthlyInterest = input.original_amount * (annualRate / 12);
        totalInterestAccrued = monthlyInterest * monthsElapsed;
        outstanding = input.original_amount + totalInterestAccrued;
        break;
      }
      case 'monthly': {
        const monthlyRate = annualRate / 12;
        outstanding = input.original_amount * Math.pow(1 + monthlyRate, monthsElapsed);
        totalInterestAccrued = outstanding - input.original_amount;
        break;
      }
      case 'quarterly': {
        const quarterlyRate = annualRate / 4;
        const quarters = Math.floor(monthsElapsed / 3);
        outstanding = input.original_amount * Math.pow(1 + quarterlyRate, quarters);
        const remMonths = monthsElapsed % 3;
        if (remMonths > 0) {
          outstanding += outstanding * (annualRate / 12) * remMonths;
        }
        totalInterestAccrued = outstanding - input.original_amount;
        break;
      }
    }

    return {
      id: Math.random().toString(),
      loanType: 'gold_loan',
      loanCategory: input.type,
      originalAmount: input.original_amount,
      interest_rate: input.interest_rate, // Added missing field
      emi: 0,
      outstandingBalance: outstanding,
      monthsElapsed,
      remainingMonths: 0,
      monthlyInterestAccrual: outstanding * (input.interest_rate / 100 / 12),
      totalInterestAccrued,
      startDate: input.start_date,
      explanation: `Gold loan balance is ₹${outstanding.toLocaleString()} after ${monthsElapsed} months with ${input.compounding} compounding.`,
      calculationBreakdown: {
        compoundingType: input.compounding,
      }
    };
  }

  // -------------------- GENERIC LOANS --------------------
  private calculateGenericLoan(
    input: UltraSimpleLiabilityInput,
    monthsElapsed: number
  ): EnhancedLoanStatus {
    const monthlyRate = input.interest_rate / 100 / 12;
    const accruedInterest = input.original_amount * monthlyRate * monthsElapsed;
    const outstanding = input.original_amount + accruedInterest;

    return {
      id: Math.random().toString(),
      loanType: 'generic',
      loanCategory: input.type,
      originalAmount: input.original_amount,
      interest_rate: input.interest_rate, // Added missing field
      emi: 0,
      outstandingBalance: outstanding,
      monthsElapsed,
      remainingMonths: 0,
      monthlyInterestAccrual: accruedInterest / monthsElapsed || 0,
      startDate: input.start_date,
      explanation: `Generic loan balance = ₹${outstanding.toLocaleString()} after ${monthsElapsed} months at ${input.interest_rate}% annual interest.`,
      calculationBreakdown: {
        interestAccrualFormula: 'Simple accrual',
      }
    };
  }

  // -------------------- PREPAYMENTS --------------------
  private applyPrepayments(
    base: EnhancedLoanStatus,
    prepayments: PrepaymentEntry[],
    interestRate: number
  ): EnhancedLoanStatus {
    let adjustedBalance = base.outstandingBalance;
    let totalSavings = 0;
    let newEMI = base.emi;

    prepayments.forEach((p) => {
      if (p.type === 'principal') {
        adjustedBalance -= p.amount;
        if (base.remainingMonths > 0) {
          const r = interestRate / 100 / 12;
          newEMI =
            (adjustedBalance * r * Math.pow(1 + r, base.remainingMonths)) /
            (Math.pow(1 + r, base.remainingMonths) - 1);
          const originalInterest = base.emi * base.remainingMonths - base.outstandingBalance;
          const newInterest = newEMI * base.remainingMonths - adjustedBalance;
          totalSavings += originalInterest - newInterest;
        }
      }
    });

    return {
      ...base,
      outstandingBalance: Math.max(0, adjustedBalance),
      emi: newEMI,
      prepaymentSavings: totalSavings,
      explanation: base.explanation + ` Prepayments saved ~₹${totalSavings.toLocaleString()}.`
    };
  }

  // -------------------- UTIL --------------------
  private getMonthsElapsed(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
    );
  }
}
