/**
 * Configuration constants and parameters for the Advisor Council Engine
 */

import { RiskLevel, RiskRange, CouncilAnswers, ConsistencyRule } from './types';

// Configurable risk scoring parameters for easy calibration
export const RISK_SCORING_CONFIG = {
  base: 55,           // Base threshold (was 50, increased to 55)
  safetyCoef: 0.30,   // Safety signal coefficient
  offset: 5           // Post-hoc offset to reach 70+ target (was 0)
};

export const RISK_LEVELS: Record<RiskLevel, RiskRange> = {
  Conservative: {
    min: 0,
    max: 39,
    description: "Low risk appetite with focus on stability",
    context: "Suitable for short-term needs and capital protection"
  },
  Moderate: {
    min: 40,
    max: 69,
    description: "Balanced growth with some volatility tolerance",
    context: "Suitable for medium-term investors"
  },
  Aggressive: {
    min: 70,
    max: 100,
    description: "High growth focus with 15–20% volatility tolerance",
    context: "Suitable for long-term investors comfortable with swings"
  }
};

export const getConsistentRiskProfile = (score: number) => {
  const level = Object.entries(RISK_LEVELS).find(
    ([, range]) => score >= range.min && score <= range.max
  );
  
  if (!level) {
    // Handle edge cases (score < 0 or > 100) - default to Moderate
    return {
      level: "Moderate" as RiskLevel,
      score: Math.max(0, Math.min(100, score)),
      ...RISK_LEVELS.Moderate
    };
  }
  
  return { level: level[0] as RiskLevel, score, ...level[1] };
};

/**
 * Enhanced Stress Test Scenarios with Historical Evidence
 * Real market events with specific drop percentages and recovery timelines
 */
interface StressTestScenario {
  drop: Record<string, string>;
  evidence: string;
  recovery: string;
}

export const stressTestScenarios: Record<string, StressTestScenario> = {
  "2008 Financial Crisis": { 
    drop: { "S&P500": "-37%", "NIFTY": "-52%" },
    evidence: "2008–2009 global financial crisis",
    recovery: "3–4 years"
  },
  "COVID Crash": {
    drop: { "NIFTY": "-38%" },
    evidence: "March 2020 pandemic shock",
    recovery: "6–9 months"
  },
  "Dotcom Bust": {
    drop: { "NASDAQ": "-78%" },
    evidence: "2000–2002 tech bubble burst",
    recovery: "15 years for NASDAQ"
  },
  "2016 Demonetization": {
    drop: { "NIFTY": "-15%", "Real Estate": "-35%", "Gold": "-20%" },
    evidence: "November 2016 currency ban, cash crunch",
    recovery: "6–8 months"
  }
};

export const consistencyRules: ConsistencyRule[] = [
  {
    condition: (a: CouncilAnswers) => a.investmentHorizon === "<2 years" && a.primaryGoal === "wealth_building",
    message: "Short horizon with long-term wealth building goal",
    severity: "warning",
    category: "timeline",
    suggestedAction: "Discuss timeline alignment or goal adjustment",
    advisorNote: "Consider if client understands wealth building timelines"
  },
  {
    condition: (a: CouncilAnswers) => a.emergencyFundMonths === "0-1" && a.primaryGoal === "retirement",
    message: "No emergency fund but planning for retirement",
    severity: "critical",
    category: "financial-foundation",
    suggestedAction: "Prioritize emergency fund before retirement planning",
    advisorNote: "Financial foundation must come first"
  },
  {
    condition: (a: CouncilAnswers) => a.age === "65+" && a.investmentHorizon === "20+ years",
    message: "Senior age with very long investment horizon",
    severity: "warning",
    category: "timeline",
    suggestedAction: "Verify timeline expectations and health considerations",
    advisorNote: "May indicate unrealistic expectations or family planning"
  },
  {
    condition: (a: CouncilAnswers) => a.liquidityNeeds === "monthly" && a.primaryGoal === "wealth_building",
    message: "Frequent liquidity needs may conflict with long-term wealth building",
    severity: "warning",
    category: "behavioral",
    suggestedAction: "Balance liquidity needs with long-term growth strategy",
    advisorNote: "Consider hybrid approach or goal prioritization"
  }
];

export const validateBehavioralConsistency = (answers: CouncilAnswers) => {
  return consistencyRules
    .filter(rule => rule.condition(answers))
    .map(rule => ({
      severity: rule.severity,
      message: rule.message,
      category: rule.category,
      suggestedAction: rule.suggestedAction,
      advisorNote: rule.advisorNote
    }));
};