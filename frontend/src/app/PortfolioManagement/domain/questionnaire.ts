interface Question {
  key: string;
  text: string;
  options?: string[];
  type?: "text" | "number";
  helperText?: string;
  maxSelect?: number;
  optional?: boolean;
  isGoalsPage?: boolean; // Special flag for goals management question
}

export const questions: Question[] = [
  // Demographics & Time Horizon (25% weight)
  {
    key: "age",
    text: "What is your age?",
    options: ["<25", "25-35", "35-45", "45-55", "55-65", "65+"],
    helperText: "Age helps determine risk capacity and equity ceiling."
  },
  {
    key: "investmentHorizon",
    text: "How long can your money stay invested?",
    options: ["<2 years", "2-5 years", "5-10 years", "10-20 years", "20+ years"],
    helperText: "Longer horizons allow higher equity; shorter horizons favor defensive assets."
  },
  
  // Financial Situation (30% weight)
  {
    key: "annualIncome",
    text: "What is your annual income?",
    options: ["<50K", "50K-1L", "1L-2L", "2L-5L", "5L+"],
    helperText: "Income level affects risk capacity and investment amount."
  },
  {
    key: "investmentAmount",
    text: "How much are you planning to invest? (in rupees)",
    type: "number",
    helperText: "Enter the actual amount you plan to invest."
  },
  {
    key: "emergencyFundMonths",
    text: "How many months of emergency fund do you have?",
    options: ["0-1", "2-3", "4-6", "7-12", "12+"],
    helperText: "If less than 6 months, we'll prioritize liquid assets."
  },
  {
    key: "dependents",
    text: "How many dependents do you have?",
    options: ["0", "1-2", "3-4", "5+"],
    helperText: "More dependents generally require more safety allocation."
  },
  
  // Risk Tolerance (25% weight)
  {
    key: "volatilityComfort",
    text: "How do you react to market volatility?",
    options: ["panic_sell", "very_uncomfortable", "somewhat_concerned", "stay_calm", "buy_more"],
    helperText: "Helps set your psychological risk tolerance."
  },
  {
    key: "maxAcceptableLoss",
    text: "What's the maximum loss you can accept?",
    options: ["5%", "10%", "20%", "30%", "40%+"],
    helperText: "Your risk capacity for portfolio declines."
  },
  {
    key: "investmentKnowledge",
    text: "What is your investment knowledge level?",
    options: ["beginner", "some_knowledge", "experienced", "expert"],
    helperText: "Your familiarity with investments."
  }, 
  // Additional Context
  {
    key: "hasInsurance",
    text: "Do you have adequate health & life insurance?",
    options: ["Yes", "No"],
    helperText: "Insurance coverage affects risk allocation."
  },
  {
    key: "avoidAssets",
    text: "Are there any assets you want to avoid? (Optional)",
    		options: ["Stocks", "Equity MF", "Gold", "Real Estate", "Debt", "Liquid"],
    helperText: "We will set avoided assets to 0% (safety sleeves remain).",
    maxSelect: 6,
    optional: true
  },
];