/**
 * Risk Scoring Engine
 * Extracted from advisorCouncilEngine.ts to follow best practices
 * All functionality preserved exactly as built
 */

import { RiskLevel, RiskRange } from './types';

// Risk Level Definitions - EXACTLY as they were
const RISK_LEVELS: Record<RiskLevel, RiskRange> = {
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
    description: "High growth potential with significant volatility tolerance",
    context: "Suitable for long-term investors with high risk appetite"
  }
};

// Configurable risk scoring parameters for easy calibration
const RISK_SCORING_CONFIG = {
  base: 55,           // Base threshold (was 50, increased to 55)
  safetyCoef: 0.30,   // Safety signal coefficient
  offset: 5           // Post-hoc offset to reach 70+ target (was 0)
};

/**
 * Calculate Risk Score based on equity and safety signals
 * EXACTLY as implemented - no changes to logic
 */
export function calculateRiskScore(avgEquitySignal: number, avgSafetySignal: number): number {
  console.log("🧮 RISK SCORING CONFIG:", RISK_SCORING_CONFIG);
  
  const rawScore = RISK_SCORING_CONFIG.base + avgEquitySignal - (avgSafetySignal * RISK_SCORING_CONFIG.safetyCoef);
  console.log("🧮 Raw score calculation:", {
    base: RISK_SCORING_CONFIG.base,
    avgEquitySignal,
    avgSafetySignal,
    safetyCoef: RISK_SCORING_CONFIG.safetyCoef,
    rawScore
  });
  
  const riskScore = Math.max(10, Math.min(90, rawScore + RISK_SCORING_CONFIG.offset));
  console.log("🧮 Final risk score:", {
    rawScore,
    offset: RISK_SCORING_CONFIG.offset,
    finalScore: riskScore
  });
  
  return riskScore;
}

/**
 * Determine Risk Level from Risk Score
 * EXACTLY as implemented - no changes to logic
 */
export function determineRiskLevel(riskScore: number): RiskLevel {
  if (riskScore <= 39) return "Conservative";
  if (riskScore <= 69) return "Moderate";
  return "Aggressive";
}

/**
 * Get Risk Level Details
 * EXACTLY as implemented - no changes to logic
 */
export function getRiskLevelDetails(riskLevel: RiskLevel): RiskRange {
  return RISK_LEVELS[riskLevel];
}

/**
 * Get All Risk Levels
 * EXACTLY as implemented - no changes to logic
 */
export function getAllRiskLevels(): Record<RiskLevel, RiskRange> {
  return RISK_LEVELS;
}

/**
 * Get Risk Scoring Config
 * EXACTLY as implemented - no changes to logic
 */
export function getRiskScoringConfig() {
  return RISK_SCORING_CONFIG;
}
