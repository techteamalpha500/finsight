// SmartRepayService.ts
import {
  LoanEngine,
  UltraSimpleLiabilityInput,
  CreditCardInput,
  GoldLoanInput,
  EnhancedLoanStatus,
} from "./repaymentEngine";

export type AnyLiability = (UltraSimpleLiabilityInput | CreditCardInput | GoldLoanInput) & { id: string; label?: string };

export type SmartRepayMode = "monthly" | "lump";

export interface MonthlyTopUpInput {
  mode: "monthly";
  amount: number;              // ₹/month extra
  advisorAutoPick: boolean;
  targetLoanId?: string;       // required if advisorAutoPick = false
}

export interface LumpSumInput {
  mode: "lump";
  amount: number;              // one-time ₹
  date: string;                // YYYY-MM-DD
  advisorAutoPick: boolean;
  targetLoanId?: string;       // required if advisorAutoPick = false
}

export type SmartRepayInput = MonthlyTopUpInput | LumpSumInput;

export interface SmartRepayResult {
  selectedLoanId: string | null;
  selectedLoanLabel: string | null;
  reason: string; // advisor explanation or "" in manual mode
  currentMonthsRemaining: number | null;  // null = not applicable (e.g., interest-only baseline)
  newMonthsRemaining: number;
  monthsSaved: number | null;             // null when current baseline has no payoff
  payoffDate: string;                     // ISO
  interestSaved: number;
  totalInterestPaidNew: number;
  efficiency: number; // interestSaved / totalExtraPaid
  timeline: {
    current: number | null;
    withContribution: number;
  };
}

export class SmartRepayService {
  private engine = new LoanEngine();

  // ==== Public entrypoints used by your UI ====

  simulateMonthlyTopUp(
    liabilities: AnyLiability[],
    input: MonthlyTopUpInput
  ): SmartRepayResult {
    const amount = Math.max(0, input.amount || 0);

    if (input.advisorAutoPick) {
      const picked = this.pickBestLoan(liabilities, { mode: "monthly", amount });
      return this.simulateMonthlyForLoan(picked.loan, amount, /*reason*/ picked.reason);
    } else {
      const loan = liabilities.find(l => l.id === input.targetLoanId) || null;
      if (!loan) return this.emptyResult("monthly");
      return this.simulateMonthlyForLoan(loan, amount, "");
    }
  }

  simulateLumpSum(
    liabilities: AnyLiability[],
    input: LumpSumInput
  ): SmartRepayResult {
    const amount = Math.max(0, input.amount || 0);
    const date = input.date;

    if (input.advisorAutoPick) {
      const picked = this.pickBestLoan(liabilities, { mode: "lump", amount, date });
      return this.simulateLumpForLoan(picked.loan, amount, date, picked.reason);
    } else {
      const loan = liabilities.find(l => l.id === input.targetLoanId) || null;
      if (!loan) return this.emptyResult("lump");
      return this.simulateLumpForLoan(loan, amount, date, "");
    }
  }

  // ==== Advisor Auto-Pick ====

  private pickBestLoan(
    liabilities: AnyLiability[],
    params: { mode: "monthly"; amount: number } | { mode: "lump"; amount: number; date?: string }
  ): { loan: AnyLiability; reason: string } {
    // If amount is 0, just pick the first EMI loan or first loan
    if (params.amount <= 0) {
      const firstEMI = liabilities.find(l => l.type !== 'credit_card' && l.type !== 'gold_loan');
      const selected = firstEMI || liabilities[0];
      return { 
        loan: selected, 
        reason: `No extra payment specified. Showing baseline for ${selected.label ?? selected.institution ?? 'this loan'}.` 
      };
    }

    let best: { loan: AnyLiability; score: number; reason: string } | null = null;

    for (const loan of liabilities) {
      const sim =
        params.mode === "monthly"
          ? this.simulateMonthlyForLoan(loan, params.amount, "", /*dry*/ true)
          : this.simulateLumpForLoan(loan, params.amount, (params as any).date!, "", /*dry*/ true);

      // Normalize to avoid bias across magnitudes
      const intSaved = Math.max(0, sim.interestSaved);
      const monthsSaved = sim.monthsSaved ?? 0;

      const riskBoost =
        loan.type === "credit_card" || loan.type === "gold_loan" ? 0.2 : 0;

      const score = 0.6 * this.normalize(intSaved) + 0.3 * this.normalize(monthsSaved) + 0.1 * riskBoost;

      const why =
        loan.type === "credit_card"
          ? `Picked your credit card because interest compounds fastest and this move saves ₹${this.f(intSaved)}.`
          : loan.type === "gold_loan"
          ? `Picked your gold loan to stop interest piling; saves ₹${this.f(intSaved)} and accelerates payoff.`
          : `Picked ${loan.label ?? loan.institution ?? "this loan"} because it saves the most interest (₹${this.f(intSaved)}) and cuts ${monthsSaved} months.`;

      if (!best || score > best.score) best = { loan, score, reason: why };
    }

    return { loan: best!.loan, reason: best!.reason };
  }

  // ==== Monthly Top-up simulation for a single loan ====

  private simulateMonthlyForLoan(
    loan: AnyLiability,
    extra: number,
    reason: string,
    dry: boolean = false
  ): SmartRepayResult {
    const status = this.engine.calculateEverything(loan);
    const today = new Date();

    if (loan.type === "credit_card") {
      const base = this.simulateCreditCard(loan as any, 0);               // minimum due only
      const withExtra = this.simulateCreditCard(loan as any, extra);      // min due + extra
      const monthsSaved = Math.max(0, base.months - withExtra.months);
      const totalExtraPaid = withExtra.extraPaid;
      const efficiency = totalExtraPaid > 0 ? (base.interest - withExtra.interest) / totalExtraPaid : 0;

      return {
        selectedLoanId: loan.id,
        selectedLoanLabel: loan.label ?? loan.institution ?? "Credit Card",
        reason,
        currentMonthsRemaining: base.months,
        newMonthsRemaining: withExtra.months,
        monthsSaved,
        payoffDate: this.addMonthsISO(today, withExtra.months),
        interestSaved: Math.max(0, base.interest - withExtra.interest),
        totalInterestPaidNew: withExtra.interest,
        efficiency,
        timeline: { current: base.months, withContribution: withExtra.months }
      };
    }

    if (loan.type === "gold_loan") {
      const gold = loan as GoldLoanInput;
      // Baseline is interest-only → no defined payoff
      const withExtra = this.simulateGoldMonthly(gold, extra);
      const totalExtraPaid = withExtra.extraPaid;
      const efficiency = totalExtraPaid > 0 ? withExtra.intSaved / totalExtraPaid : 0;

      return {
        selectedLoanId: loan.id,
        selectedLoanLabel: loan.label ?? loan.institution ?? "Gold Loan",
        reason,
        currentMonthsRemaining: null, // no baseline payoff
        newMonthsRemaining: withExtra.months,
        monthsSaved: null,
        payoffDate: this.addMonthsISO(today, withExtra.months),
        interestSaved: withExtra.intSaved,
        totalInterestPaidNew: withExtra.interest,
        efficiency,
        timeline: { current: null, withContribution: withExtra.months }
      };
    }

    // EMI loans (home, car, personal, education, other)
    const emi = status.emi;
    
    // Use consistent calculation for baseline
    const baseSim = this.simulateAmortization(status.outstandingBalance, loan.interest_rate, emi);
    const baseMonths = baseSim.months;
    const baseInterestRemaining = baseSim.interest;

    const sim = this.simulateAmortization(status.outstandingBalance, loan.interest_rate, emi + extra);
    const monthsSaved = Math.max(0, baseMonths - sim.months);
    const interestSaved = Math.max(0, baseInterestRemaining - sim.interest);
    const totalExtraPaid = extra * sim.months;
    const efficiency = totalExtraPaid > 0 ? interestSaved / totalExtraPaid : 0;

    const result: SmartRepayResult = {
      selectedLoanId: loan.id,
      selectedLoanLabel: loan.label ?? loan.institution ?? "Loan",
      reason,
      currentMonthsRemaining: baseMonths,
      newMonthsRemaining: sim.months,
      monthsSaved,
      payoffDate: this.addMonthsISO(today, sim.months),
      interestSaved,
      totalInterestPaidNew: sim.interest,
      efficiency,
      timeline: { current: baseMonths, withContribution: sim.months }
    };
    return result;
  }

  // ==== Lump Sum simulation for a single loan ====

  private simulateLumpForLoan(
    loan: AnyLiability,
    lump: number,
    dateISO: string,
    reason: string,
    dry: boolean = false
  ): SmartRepayResult {
    const status = this.engine.calculateEverything(loan);
    const payDate = new Date(dateISO || new Date());

    if (loan.type === "credit_card") {
      // One-time principal reduction then pay minimum dues
      const base = this.simulateCreditCard(loan as any, 0);
      const afterLump = this.simulateCreditCardAfterLump(loan as any, lump, payDate);
      const monthsSaved = Math.max(0, base.months - afterLump.months);
      const interestSaved = Math.max(0, base.interest - afterLump.interest);

      return {
        selectedLoanId: loan.id,
        selectedLoanLabel: loan.label ?? loan.institution ?? "Credit Card",
        reason,
        currentMonthsRemaining: base.months,
        newMonthsRemaining: afterLump.months,
        monthsSaved,
        payoffDate: this.addMonthsISO(new Date(), afterLump.months),
        interestSaved,
        totalInterestPaidNew: afterLump.interest,
        efficiency: lump > 0 ? interestSaved / lump : 0,
        timeline: { current: base.months, withContribution: afterLump.months }
      };
    }

    if (loan.type === "gold_loan") {
      const gold = loan as GoldLoanInput;
      const after = this.simulateGoldLump(gold, lump, payDate);
      // Baseline is interest-only; compute interest saved over a 24-month window
      const windowMonths = 24;
      const baseInt = this.projectGoldInterest(gold, windowMonths);
      const intSaved = Math.max(0, baseInt - after.interestWindow);

      return {
        selectedLoanId: loan.id,
        selectedLoanLabel: loan.label ?? loan.institution ?? "Gold Loan",
        reason,
        currentMonthsRemaining: null,
        newMonthsRemaining: after.monthsToZero,
        monthsSaved: null,
        payoffDate: this.addMonthsISO(new Date(), after.monthsToZero),
        interestSaved: intSaved,
        totalInterestPaidNew: after.interestWindow,
        efficiency: lump > 0 ? intSaved / lump : 0,
        timeline: { current: null, withContribution: after.monthsToZero }
      };
    }

    // EMI loans: subtract lump on chosen date, keep same EMI, compute new tenure
    const emi = status.emi;
    
    // Use consistent calculation for baseline
    const baseSim = this.simulateAmortization(status.outstandingBalance, loan.interest_rate, emi);
    const baseMonths = baseSim.months;
    const baseInterestRemaining = baseSim.interest;

    // Get balance on payDate (months from now)
    const monthsFromNow = this.diffMonths(new Date(), payDate);
    const balOnDate = this.balanceAfterMonths(status.outstandingBalance, loan.interest_rate, emi, monthsFromNow);
    const newBalance = Math.max(0, balOnDate - lump);
    const sim = this.simulateAmortization(newBalance, loan.interest_rate, emi);

    const monthsSaved = Math.max(0, baseMonths - (monthsFromNow + sim.months));
    const interestSaved = Math.max(0, baseInterestRemaining - sim.interest);
    const resultMonths = Math.max(0, monthsFromNow + sim.months);

    return {
      selectedLoanId: loan.id,
      selectedLoanLabel: loan.label ?? loan.institution ?? "Loan",
      reason,
      currentMonthsRemaining: baseMonths,
      newMonthsRemaining: resultMonths,
      monthsSaved,
      payoffDate: this.addMonthsISO(new Date(), resultMonths),
      interestSaved,
      totalInterestPaidNew: sim.interest,
      efficiency: lump > 0 ? interestSaved / lump : 0,
      timeline: { current: baseMonths, withContribution: resultMonths }
    };
  }

  // ==== Low-level simulators ====

  private simulateAmortization(principal: number, apr: number, monthlyPay: number) {
    const r = apr / 100 / 12;
    let bal = principal;
    let months = 0;
    let interest = 0;

    if (monthlyPay <= 0) return { months: Infinity, interest: Infinity };

    while (bal > 0 && months < 1200) {
      const i = bal * r;
      interest += i;
      bal = bal + i - monthlyPay;
      months++;
      if (bal <= 0) break;
      // If payment can't cover interest, break to avoid infinite
      if (monthlyPay <= i) return { months: Infinity, interest: Infinity };
    }
    return { months, interest: Math.max(0, interest) };
  }

  private simulateCreditCard(card: CreditCardInput, extra: number) {
    let bal = card.original_amount;
    const apr = card.interest_rate;
    const r = apr / 100 / 12;
    let months = 0;
    let interest = 0;
    let extraPaid = 0;

    while (bal > 0 && months < 600) {
      const i = bal * r;
      interest += i;
      const minDue = Math.max(bal * 0.05, 500);
      const pay = minDue + extra;
      bal = Math.max(0, bal + i - pay);
      extraPaid += extra;
      months++;
      if (pay <= i) break; // non-convergent
    }
    return { months, interest, extraPaid };
  }

  private simulateCreditCardAfterLump(card: CreditCardInput, lump: number, _date: Date) {
    const reduced: CreditCardInput = { ...card, original_amount: Math.max(0, card.original_amount - lump) };
    return this.simulateCreditCard(reduced, 0);
  }

  private simulateGoldMonthly(loan: GoldLoanInput, extra: number) {
    const monthlyRate = loan.interest_rate / 100 / 12;
    let bal = loan.original_amount;
    let months = 0;
    let interest = 0;
    let extraPaid = 0;

    while (bal > 0 && months < 600) {
      const i = bal * monthlyRate;
      interest += i;
      const principalPayment = Math.max(0, extra - i);
      bal = Math.max(0, bal - principalPayment);
      extraPaid += extra;
      months++;
      if (extra <= i) break; // can't reduce principal
    }
    // Interest saved vs “interest-only for 24 months”
    const intOnly24 = loan.original_amount * monthlyRate * 24;
    const intSaved = Math.max(0, intOnly24 - interest);
    return { months, interest, extraPaid, intSaved };
  }

  private simulateGoldLump(loan: GoldLoanInput, lump: number, _date: Date) {
    const monthlyRate = loan.interest_rate / 100 / 12;
    let bal = Math.max(0, loan.original_amount - lump);
    let months = 0;
    let interest = 0;
    while (bal > 0 && months < 600) {
      const i = bal * monthlyRate;
      interest += i;
      // assume customer clears remaining principal month by month with interest-only + principal  (simplified)
      const pay = i + Math.min(bal, bal / 12); // pay ~1/12 principal monthly after lump
      bal = Math.max(0, bal + i - pay);
      months++;
    }
    const interestWindow = Math.min(24, months) * loan.original_amount * monthlyRate; // rough window
    return { monthsToZero: months, interestWindow };
  }

  private projectGoldInterest(loan: GoldLoanInput, months: number) {
    const r = loan.interest_rate / 100 / 12;
    return loan.original_amount * r * months;
  }

  private balanceAfterMonths(bal: number, apr: number, emi: number, months: number) {
    const r = apr / 100 / 12;
    for (let m = 0; m < months; m++) {
      const i = bal * r;
      bal = Math.max(0, bal + i - emi);
      if (bal <= 0) break;
    }
    return bal;
  }

  // ==== Helpers ====

  private addMonthsISO(from: Date, n: number) {
    const d = new Date(from);
    d.setMonth(d.getMonth() + Math.max(0, Math.floor(n)));
    return d.toISOString().slice(0, 10);
    }

  private diffMonths(a: Date, b: Date) {
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }

  private normalize(x: number) {
    if (!isFinite(x) || x <= 0) return 0;
    // Log-like squashing so big numbers don't dominate
    return Math.log10(1 + x);
  }

  private f(n: number) {
    return Math.round(n).toLocaleString("en-IN");
  }

  private emptyResult(mode: SmartRepayMode): SmartRepayResult {
    return {
      selectedLoanId: null,
      selectedLoanLabel: null,
      reason: "",
      currentMonthsRemaining: null,
      newMonthsRemaining: 0,
      monthsSaved: null,
      payoffDate: new Date().toISOString().slice(0,10),
      interestSaved: 0,
      totalInterestPaidNew: 0,
      efficiency: 0,
      timeline: { current: null, withContribution: 0 }
    };
  }
}
