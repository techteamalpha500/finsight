// Enhanced Allocation Engine for Finsight Portfolio Management
// Implements sophisticated 10-Advisor Council logic with weighted signals

import { AdvisorCouncilEngine } from './advisor/advisorCouncilEngine';

export type AssetClass = "Stocks" | "Equity MF" | "ETF" | "Gold" | "Real Estate" | "Debt" | "Liquid";
export type RiskLevel = "Conservative" | "Moderate" | "Aggressive";

export interface AllocationPlan {
  equity: number;
  defensive: number;
  satellite: number;
  riskProfile: {
    level: RiskLevel;
    score: number;
    min: number;
    max: number;
    description: string;
    context: string;
  };
  rationale: string[];
  // Behavioral consistency validation
  behavioralWarnings?: Array<{
    severity: "warning" | "critical";
    message: string;
    category: "risk-reward" | "timeline" | "financial-foundation" | "behavioral";
    suggestedAction: string;
    advisorNote?: string;
  }>;
  consistencyScore?: number; // 0-100, how consistent the answers are
  // Extended fields for Dashboard compatibility with dynamic ranges
  buckets: Array<{
    class: AssetClass;
    pct: number;
    range: {
      min: number;
      max: number;
      range: number;
      base: number;
      multiplier: number;
      cap: number;
      explanation: string;
    };
    riskCategory: string;
    notes: string;
  }>;
  riskLevel: RiskLevel;
  riskScore?: number;
  // Advanced engine data
  signals?: Array<{
    factor: string;
    equitySignal: number;
    safetySignal: number;
    weight: number;
    explanation: string;
  }>;
  stressTest?: {
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
  };
}

export interface QuestionnaireAnswers {
  // Demographics & Time Horizon (25% weight)
  age: string;
  investmentHorizon: string;
  
  // Financial Situation (30% weight)
  annualIncome: string | { absolute: string; relative?: string; context?: string };
  investmentAmount: number;
  emergencyFundMonths: string;
  dependents: string;
  
  // Risk Tolerance (25% weight)
  volatilityComfort: string;
  maxAcceptableLoss: string;
  investmentKnowledge: string;
  
  // Goals & Objectives (40% weight) - NEW: Multi-goal support
  goals?: any[]; // Goals from Goals page
  primaryGoal?: string; // DEPRECATED: Keep for backward compatibility
  
  // Additional Context
  hasInsurance: boolean | string;
  avoidAssets?: string[];
}

// Smart inference system for removed fields
interface InferredValues {
  monthlyObligations: string;
  liquidityNeeds: string;
  jobStability: string;
  withdrawalNext2Years: boolean;
  expectedReturn: string;
  geographicContext: string;
}

const inferRemovedValues = (answers: QuestionnaireAnswers): InferredValues => {
  // Infer monthly obligations from income (FIXED: More realistic ratios)
  const getMonthlyObligations = (income: string): string => {
    if (income.includes('5L+')) return "25K-50K";  // Fixed: More realistic for high income
    if (income.includes('2L-5L')) return "15K-30K"; // Fixed: More realistic
    if (income.includes('1L-2L')) return "8K-20K";  // Fixed: More realistic
    if (income.includes('50K-1L')) return "5K-12K"; // Fixed: More realistic
    return "<5K";
  };

  // Infer liquidity needs from horizon and goal
  const getLiquidityNeeds = (horizon: string, goal: string): string => {
    if (horizon === "<2 years") return "monthly";
    if (goal === "home_purchase") return "monthly";
    if (horizon === "2-5 years") return "few_times_year";
    if (goal === "wealth_building" && horizon === "20+ years") return "once_year";
    return "never";
  };

  // Infer job stability from age, dependents, and emergency fund
  const getJobStability = (age: string, dependents: string, emergencyFund: string): string => {
    if (emergencyFund === "0-1" || emergencyFund === "2-3") return "not_stable";
    if (age === "65+" || dependents === "5+") return "somewhat_stable";
    if (age === "<25" || age === "25-35") return "very_stable";
    return "somewhat_stable";
  };

  // Infer withdrawal needs from emergency fund
  const getWithdrawalNext2Years = (emergencyFund: string): boolean => {
    return emergencyFund === "0-1" || emergencyFund === "2-3";
  };

  // Infer expected return from risk tolerance
  const getExpectedReturn = (maxLoss: string, volatility: string): string => {
    if (maxLoss === "40%+" && volatility === "buy_more") return "20%+";
    if (maxLoss === "30%" && volatility === "stay_calm") return "15-20%";
    if (maxLoss === "20%" && volatility === "somewhat_concerned") return "12-15%";
    if (maxLoss === "10%" && volatility === "very_uncomfortable") return "8-12%";
    if (maxLoss === "5%" && volatility === "panic_sell") return "5-8%";
    return "8-12%"; // Default moderate
  };

  // Infer geographic context from income patterns (IMPROVED: Better logic)
  const getGeographicContext = (income: string, obligations: string): string => {
    // More sophisticated income-to-obligations ratio analysis
    if (income.includes('5L+') && obligations.includes('25K')) return "urban_affluent";      // 1.15x multiplier
    if (income.includes('5L+') && obligations.includes('50K')) return "urban_standard";     // 1.1x multiplier
    if (income.includes('2L-5L') && obligations.includes('15K')) return "urban_standard";   // 1.1x multiplier
    if (income.includes('1L-2L') && obligations.includes('8K')) return "suburban";          // 1.0x multiplier
    if (income.includes('50K-1L') && obligations.includes('5K')) return "rural_standard";   // 0.9x multiplier
    return "suburban"; // Default to suburban for balanced approach
  };

  const monthlyObligations = getMonthlyObligations(answers.annualIncome as string);
  const liquidityNeeds = getLiquidityNeeds(answers.investmentHorizon, answers.primaryGoal || "wealth_building");
  const jobStability = getJobStability(answers.age, answers.dependents, answers.emergencyFundMonths);
  const withdrawalNext2Years = getWithdrawalNext2Years(answers.emergencyFundMonths);
  const expectedReturn = getExpectedReturn(answers.maxAcceptableLoss, answers.volatilityComfort);
  const geographicContext = getGeographicContext(answers.annualIncome as string, monthlyObligations);

  // Debug logging to see what's being inferred
  console.log("🔍 DEBUG: Inferred Values:", {
    monthlyObligations,
    liquidityNeeds,
    jobStability,
    withdrawalNext2Years,
    expectedReturn,
    geographicContext,
    originalIncome: answers.annualIncome
  });

  return {
    monthlyObligations,
    liquidityNeeds,
    jobStability,
    withdrawalNext2Years,
    expectedReturn,
    geographicContext
  };
};

// Helper functions for dynamic range calculation
const getBaseRange = (asset: AssetClass): number => {
  const baseRanges = {
    "Stocks": 0.05,        // ±5% base range
    		"Equity MF": 0.04,     // ±4% base range
    		"ETF": 0.04,           // ±4% base range (similar to Equity MF)
    "Debt": 0.03,          // ±3% base range
    "Liquid": 0.02,        // ±2% base range
    "Gold": 0.03,          // ±3% base range
    "Real Estate": 0.03    // ±3% base range
  };
  return baseRanges[asset] || 0.03;
};

const getAssetCap = (asset: AssetClass): number => {
  const caps = {
    "Stocks": 2.5,        // Most volatile, widest ranges
    		"Equity MF": 2.2,     // High volatility
    		"ETF": 2.2,           // High volatility (similar to Equity MF)
    "Debt": 1.5,          // Low volatility, tight ranges
    "Liquid": 1.3,        // Very stable
    "Gold": 1.8,          // Moderate volatility
    "Real Estate": 1.6    // Low-medium volatility
  };
  return caps[asset] || 2.0; // Default fallback
};

const getAssetBounds = (asset: AssetClass, riskLevel: RiskLevel) => {
  const bounds = {
    "Stocks": {
      min: riskLevel === "Conservative" ? 5 : riskLevel === "Aggressive" ? 15 : 10,
      max: riskLevel === "Conservative" ? 45 : riskLevel === "Aggressive" ? 75 : 60
    },
    		"Equity MF": {
      min: riskLevel === "Conservative" ? 10 : riskLevel === "Aggressive" ? 20 : 15,
      max: riskLevel === "Conservative" ? 50 : riskLevel === "Aggressive" ? 70 : 60
    },
    "ETF": {
      min: riskLevel === "Conservative" ? 10 : riskLevel === "Aggressive" ? 20 : 15,
      max: riskLevel === "Conservative" ? 50 : riskLevel === "Aggressive" ? 70 : 60
    },
    "Debt": {
      min: riskLevel === "Conservative" ? 25 : riskLevel === "Aggressive" ? 15 : 20,
      max: riskLevel === "Conservative" ? 60 : riskLevel === "Aggressive" ? 40 : 50
    },
    "Liquid": {
      min: riskLevel === "Conservative" ? 8 : riskLevel === "Aggressive" ? 5 : 6,
      max: riskLevel === "Conservative" ? 25 : riskLevel === "Aggressive" ? 15 : 20
    },
    "Gold": {
      min: 2, // Never below 2%
      max: riskLevel === "Conservative" ? 15 : riskLevel === "Aggressive" ? 25 : 20
    },
    "Real Estate": {
      min: 2, // Never below 2%
      max: riskLevel === "Conservative" ? 20 : riskLevel === "Aggressive" ? 30 : 25
    }
  };
  
  return bounds[asset];
};

/**
 * Smart Geographic Context System
 * Infers geographic context from income patterns instead of hardcoded cities
 */

const getComprehensiveContextMultiplier = (context: any): number => {
  let multiplier = 1.0;
  
  // Time Horizon (Primary factor)
  if (context.investmentHorizon === "<2 years") multiplier *= 0.8;
  if (context.investmentHorizon === "20+ years") multiplier *= 1.1;
  
  // Age (Secondary factor)
  if (context.age === "65+") multiplier *= 0.85;
  if (context.age === "<25") multiplier *= 1.05;
  
  // Emergency Fund (Critical factor)
  if (context.emergencyFundMonths === "0-1") multiplier *= 0.8;
  if (context.emergencyFundMonths === "12+") multiplier *= 1.05;
  
  // Dependents (Family factor)
  if (context.dependents === "5+") multiplier *= 0.9; // More dependents = tighter ranges
  if (context.dependents === "0") multiplier *= 1.1;  // No dependents = slightly wider
  
  // Insurance (Risk factor)
  if (!context.hasInsurance) multiplier *= 0.85; // No insurance = tighter ranges
  
  // Withdrawal needs (Liquidity factor)
  if (context.withdrawalNext2Years) multiplier *= 0.8; // Near-term withdrawals = tighter
  
  // Job stability (Income factor)
  if (context.jobStability === "not_stable") multiplier *= 0.9; // Unstable job = tighter
  if (context.jobStability === "very_stable") multiplier *= 1.05; // Stable job = slightly wider
  
  // Geographic context (Inferred from income patterns)
  if (context.geographicContext) {
    switch (context.geographicContext) {
      case "urban_affluent": multiplier *= 1.15; // Wider ranges for high relative income
      case "urban_standard": multiplier *= 1.1;
      case "suburban": multiplier *= 1.0; // No change
      case "rural_standard": multiplier *= 0.9; // Tighter ranges for low relative income
      case "rural_challenged": multiplier *= 0.8; // Even tighter for very low relative income
    }
  }
  
  // Apply progressive caps
  multiplier = Math.max(0.5, Math.min(1.5, multiplier)); // Never go below 50% or above 150%
  
  return multiplier;
};

const getContextSummary = (context: any): string => {
  const factors = [];
  
  if (context.investmentHorizon === "<2 years") factors.push("Short horizon");
  if (context.age === "65+") factors.push("Senior");
  if (context.emergencyFundMonths === "0-1") factors.push("Low EF");
  if (context.dependents === "5+") factors.push("Many dependents");
  if (!context.hasInsurance) factors.push("No insurance");
  
  return factors.length > 0 ? factors.join(", ") : "Standard";
};

const getSmartDynamicRange = (
  asset: AssetClass,
  currentAllocation: number,
  riskLevel: RiskLevel,
  context: any
) => {
  const baseRange = getBaseRange(asset);
  const contextMultiplier = getComprehensiveContextMultiplier(context);

  const bounds = getAssetBounds(asset, riskLevel);
  const assetCap = getAssetCap(asset); // asset-specific instead of flat 2.0

  // Range with asset-specific cap
  const calculatedRange = Math.min(baseRange * contextMultiplier, baseRange * assetCap);

  // Delta with floor (at least 2%)
  const delta = Math.max(currentAllocation * calculatedRange, 0.02);

  const min = Math.max(bounds.min, currentAllocation - delta);
  const max = Math.min(bounds.max, currentAllocation + delta);

  return {
    min,
    max,
    range: calculatedRange,
    base: baseRange,
    multiplier: contextMultiplier,
    cap: assetCap,
    explanation: `±${(calculatedRange * 100).toFixed(1)}% | Bounds: ${bounds.min}–${bounds.max}% | Context: ${getContextSummary(context)}`
  };
};

export function buildPlan(answers: QuestionnaireAnswers): AllocationPlan {
  console.log("🚀 Building allocation plan with new engine format:", answers); console.log("🎯 Goals data:", answers.goals);
  
  // Get inferred values for removed fields
  const inferredValues = inferRemovedValues(answers);
  
  // Convert avoidAssets from string[] to AssetClass[]
  const convertedAnswers = {
    ...answers,
    // Convert annualIncome to expected format
    annualIncome: {
      absolute: answers.annualIncome as string,
      relative: undefined,
      context: "Income meaning inferred from patterns"
    },
    // Add inferred values
    monthlyObligations: inferredValues.monthlyObligations,
    liquidityNeeds: inferredValues.liquidityNeeds,
    jobStability: inferredValues.jobStability,
    withdrawalNext2Years: inferredValues.withdrawalNext2Years,
    expectedReturn: inferredValues.expectedReturn,
    geographicContext: inferredValues.geographicContext,
    // Handle boolean conversions
    hasInsurance: typeof answers.hasInsurance === 'boolean' ? answers.hasInsurance : answers.hasInsurance === 'Yes',
    // 🎯 NEW: Goals support (replaces primaryGoal)
    goals: answers.goals || [],
    // Keep primaryGoal for backward compatibility
    primaryGoal: answers.primaryGoal,
    avoidAssets: (() => {
      if (!answers.avoidAssets) return [];
      if (Array.isArray(answers.avoidAssets)) {
        return answers.avoidAssets.map(asset => asset as AssetClass);
      }
      // Handle single string case
      if (typeof answers.avoidAssets === 'string') {
        return [answers.avoidAssets as AssetClass];
      }
      return [];
    })()
  };
  
  // Use the new AdvisorCouncilEngine directly
  const advisorEngine = new AdvisorCouncilEngine();
  const result = advisorEngine.generateRecommendation(convertedAnswers);
  
  // Convert the result to our standard format
  const plan: AllocationPlan = {
    		equity: result.allocation.Stocks + result.allocation["Equity MF"],
    defensive: result.allocation.Debt + result.allocation.Liquid,
    satellite: result.allocation.Gold + result.allocation["Real Estate"],
    riskProfile: result.riskProfile,
    rationale: result.rationale,
    buckets: [
      {
        class: "Stocks" as AssetClass,
        pct: result.allocation.Stocks,
        range: getSmartDynamicRange("Stocks", result.allocation.Stocks, result.riskLevel, convertedAnswers),
        riskCategory: "Equity",
        notes: "Direct stock investments for growth"
      },
      		{
			class: "Equity MF" as AssetClass,
			pct: result.allocation["Equity MF"],
			range: getSmartDynamicRange("Equity MF", result.allocation["Equity MF"], result.riskLevel, convertedAnswers),
        riskCategory: "Equity",
        notes: "Diversified equity exposure through funds"
      },
      {
        class: "Debt" as AssetClass,
        pct: result.allocation.Debt,
        range: getSmartDynamicRange("Debt", result.allocation.Debt, result.riskLevel, convertedAnswers),
        riskCategory: "Defensive",
        notes: "Fixed income for stability"
      },
      {
        class: "Liquid" as AssetClass,
        pct: result.allocation.Liquid,
        range: getSmartDynamicRange("Liquid", result.allocation.Liquid, result.riskLevel, convertedAnswers),
        riskCategory: "Defensive",
        notes: "Cash and liquid assets for emergencies"
      },
      {
        class: "Gold" as AssetClass,
        pct: result.allocation.Gold,
        range: getSmartDynamicRange("Gold", result.allocation.Gold, result.riskLevel, convertedAnswers),
        riskCategory: "Satellite",
        notes: "Hedge against inflation and market volatility"
      },
      {
        class: "Real Estate" as AssetClass,
        pct: result.allocation["Real Estate"],
        range: getSmartDynamicRange("Real Estate", result.allocation["Real Estate"], result.riskLevel, convertedAnswers),
        riskCategory: "Satellite",
        notes: "Long-term real asset investment"
      }
    ],
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    signals: result.signals,
    stressTest: result.stressTest,
    behavioralWarnings: result.behavioralWarnings,
    consistencyScore: result.consistencyScore
  };
  
  console.log("✅ Allocation plan built successfully:", plan);
  return plan;
}