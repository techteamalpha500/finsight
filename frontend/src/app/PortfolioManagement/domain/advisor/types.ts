/**
 * Core types and interfaces for the Advisor Council Engine
 * Professional-grade allocation logic with weighted signals and dynamic base calculations
 */

export type AssetClass = "Stocks" | "Equity MF" | "ETF" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

export interface RiskRange {
  min: number;
  max: number;
  description: string;
  context: string;
}

export type GoalCategory = "retirement" | "home_purchase" | "child_education" | "emergency_fund" | "wealth_building" | "custom";
export type Priority = "high" | "medium" | "low";

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  targetAmount: number;
  targetDate: Date;
  priority: Priority;
  currentProgress?: number;
  isActive: boolean;
  createdAt: Date;
}

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
  
  // 🎯 NEW: Goals & Objectives (40% weight - replaces primaryGoal)
  goals?: Goal[];
  
  // 🔄 DEPRECATED: Keep for backward compatibility
  primaryGoal?: string;
  
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

/**
 * Behavioral Consistency Validation System
 * Detects contradictory answers and provides advisor guidance
 */
export interface ConsistencyRule {
  condition: (a: CouncilAnswers) => boolean;
  message: string;
  severity: "critical" | "warning";
  category: "risk-reward" | "timeline" | "financial-foundation" | "behavioral";
  suggestedAction: string;
  advisorNote?: string; // Additional context for advisors
}

export interface Signal {
  factor: string;
  equitySignal: number;  // -15 to +15
  safetySignal: number;  // -15 to +15
  weight: number;        // 0 to 1
  explanation: string;
}

export interface AllocationResult {
  allocation: Record<AssetClass, number>;
  riskScore: number;
  riskLevel: RiskLevel;
  riskProfile: {
    level: RiskLevel;
    score: number;
    min: number;
    max: number;
    description: string;
    context: string;
  };
  behavioralWarnings?: Array<{
    severity: "warning" | "critical";
    message: string;
    category: "risk-reward" | "timeline" | "financial-foundation" | "behavioral";
    suggestedAction: string;
    advisorNote?: string;
  }>;
  consistencyScore?: number; // 0-100, how consistent the answers are
  signals: Signal[];
  rationale: string[];
  stressTest: StressTestResult;
}

export interface StressTestResult {
  scenarios: Record<string, {
    portfolioImpact: number;
    monthsCovered: number;
    recommendation: string;
    // Enhanced with historical context
    historicalDrop?: string;
    evidence?: string;
    recovery?: string;
    comparison?: string; // "Your portfolio: -25% vs Historical: -38%"
    sectorImpacts?: Record<string, number>; // For demonetization-like sector-specific events
  }>;
}

export interface RebalanceAction {
  class: AssetClass;
  action: "buy" | "sell";
  amount: number;
  currentPct: number;
  targetPct: number;
  drift: number;
}

export interface StressTestScenario {
  [key: string]: Record<AssetClass, number>;
}