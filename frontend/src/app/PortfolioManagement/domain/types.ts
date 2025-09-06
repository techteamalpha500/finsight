/**
 * Core Types and Interfaces for Portfolio Management
 * Clean separation of concerns - all types in one place
 */

// Asset Class Definitions
export type AssetClass = "Stocks" | "Equity MF" | "ETF" | "Gold" | "Real Estate" | "Debt" | "Liquid";

// Risk Level Definitions
export type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

// Risk Range Interface
export interface RiskRange {
  min: number;
  max: number;
  description: string;
  context: string;
}

// Goal Interface
export interface Goal {
  type: "retirement" | "wealth_building" | "child_education" | "home_purchase" | "travel" | "emergency";
  targetAmount: number;
  targetDate: Date;
  priority: 1 | 2 | 3 | 4 | 5;
  status: "active" | "inactive" | "completed";
}

// Council Answers Interface
export interface CouncilAnswers {
  // Demographics & Time Horizon (25% weight)
  age: string;
  investmentHorizon: string;
  
  // Financial Situation (30% weight)
  annualIncome: { absolute: string; relative?: string; context?: string };
  investmentAmount: number; // Actual amount in rupees
  emergencyFundMonths: string;
  dependents: string;
  
  // Risk Tolerance (25% weight)
  volatilityComfort: string;
  maxAcceptableLoss: string;
  investmentKnowledge: string;
  
  // Goals & Objectives (20% weight) - UPDATED: removed primaryGoal, added goals
  goals?: Goal[];
  
  // Additional Context
  hasInsurance: boolean;
  avoidAssets?: AssetClass[];
  
  // Inferred values (added by allocation engine)
  monthlyObligations?: string;
  liquidityNeeds?: string;
  jobStability?: string;
  withdrawalNext2Years?: boolean;
  expectedReturn?: string;
  geographicContext?: string;
}

// Consistency Rule Interface
export interface ConsistencyRule {
  condition: (answers: CouncilAnswers) => boolean;
  message: string;
  severity: "warning" | "error" | "info";
  advisorGuidance: string;
}

// Signal Interface
export interface Signal {
  id: string;
  value: number;
  weight: number;
  category: "equity" | "safety" | "neutral";
  description: string;
  context: string;
}

// Allocation Result Interface
export interface AllocationResult {
  allocation: Record<AssetClass, number>;
  riskScore: number;
  riskLevel: RiskLevel;
  rationale: string;
  signals: Signal[];
  stressTest: StressTestResult;
  behavioralWarnings: string[];
  consistencyScore: number;
}

// Stress Test Result Interface
export interface StressTestResult {
  scenario: string;
  impact: string;
  recommendation: string;
  severity: "low" | "medium" | "high";
}

// Rebalance Action Interface
export interface RebalanceAction {
  asset: AssetClass;
  currentAllocation: number;
  targetAllocation: number;
  action: "buy" | "sell" | "hold";
  amount: number;
  priority: "high" | "medium" | "low";
  reason: string;
}

// Stress Test Scenario Interface
export interface StressTestScenario {
  name: string;
  description: string;
  testFunction: (allocation: Record<AssetClass, number>) => StressTestResult;
}
