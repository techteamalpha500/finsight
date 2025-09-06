/**
 * Dynamic Base Allocation Calculator
 * Converts weighted signals into base allocation percentages
 */

import { Signal, CouncilAnswers, AssetClass } from './types';
import { RISK_SCORING_CONFIG } from './config';

export class AllocationCalculator {
  calculateDynamicBase(signals: Signal[]): { equityBase: number; safetyBase: number; riskScore: number } {
    console.log("🧮🧮🧮 CALCULATING DYNAMIC BASE! 🧮🧮🧮");
    
    const neutralEquity = 50; // Starting baseline
    
    // Calculate weighted equity and safety signals
    let totalEquitySignal = 0;
    let totalSafetySignal = 0;
    let totalWeight = 0;
    
    signals.forEach(signal => {
      const weightedEquity = signal.equitySignal * signal.weight;
      const weightedSafety = signal.safetySignal * signal.weight;
      totalEquitySignal += weightedEquity;
      totalSafetySignal += weightedSafety;
      totalWeight += signal.weight;
      
      console.log(`📊 Signal ${signal.factor}:`, {
        weight: signal.weight,
        equity: signal.equitySignal,
        safety: signal.safetySignal,
        weightedEquity: weightedEquity,
        weightedSafety: weightedSafety
      });
    });
    
    console.log("📈 Totals:", {
      totalEquitySignal,
      totalSafetySignal,
      totalWeight
    });
    
    // Normalize by total weight
    const avgEquitySignal = totalEquitySignal / totalWeight;
    const avgSafetySignal = totalSafetySignal / totalWeight;
    
    console.log("📊 Averages:", {
      avgEquitySignal,
      avgSafetySignal
    });
    
    // Calculate dynamic equity base
    let equityBase = neutralEquity + avgEquitySignal - (avgSafetySignal * 0.5);
    
    // Clamp to realistic bounds
    equityBase = Math.max(10, Math.min(85, equityBase));
    
    const safetyBase = 100 - equityBase;
    
    // FIXED: Calculate risk score considering BOTH equity AND safety signals
    // Higher equity signals = higher risk, higher safety signals = lower risk
    const rawScore = RISK_SCORING_CONFIG.base + avgEquitySignal - (avgSafetySignal * RISK_SCORING_CONFIG.safetyCoef);
    const riskScore = Math.max(10, Math.min(90, rawScore + RISK_SCORING_CONFIG.offset));
    console.log("⚙️ Risk Scoring Config:", {
      base: RISK_SCORING_CONFIG.base,
      safetyCoef: RISK_SCORING_CONFIG.safetyCoef,
      offset: RISK_SCORING_CONFIG.offset,
      rawScore: rawScore,
      finalScore: riskScore
    });    
    console.log("🎯 Final Results:", {
      equityBase: Math.round(equityBase),
      safetyBase: Math.round(safetyBase),
      riskScore: Math.round(riskScore * 100) / 100
    });
    
    return { equityBase, safetyBase, riskScore };
  }
  
  splitEquityCategory(equityBase: number, answers: CouncilAnswers): { stocks: number; mutualFunds: number } {
    // Base split: 60% MF, 40% Stocks (more conservative default)
    let mfRatio = 0.65;
    let stocksRatio = 0.35;
    
    // Adjust based on knowledge and experience
    if (answers.investmentKnowledge === "expert") {
      stocksRatio = 0.50; // More direct equity for experts
      mfRatio = 0.50;
    } else if (answers.investmentKnowledge === "experienced") {
      stocksRatio = 0.40;
      mfRatio = 0.60;
    } else if (answers.investmentKnowledge === "beginner") {
      stocksRatio = 0.25; // Heavy MF bias for beginners
      mfRatio = 0.75;
    }
    
    // Adjust for goal
    if (answers.primaryGoal === "wealth_building" && answers.age !== "65+") {
      stocksRatio += 0.10; // More aggressive for wealth building
      mfRatio -= 0.10;
    }
    
    return {
      stocks: Math.round(equityBase * stocksRatio),
      mutualFunds: Math.round(equityBase * mfRatio)
    };
  }
  
  splitSafetyCategory(safetyBase: number, answers: CouncilAnswers): { liquid: number; gold: number; realEstate: number; debt: number } {
    // Base safety allocation
    let liquidRatio = 0.35;
    let goldRatio = 0.20;
    let realEstateRatio = 0.25;
    let debtRatio = 0.20;
    
    // Adjust based on horizon
    if (answers.investmentHorizon === "<2 years") {
      liquidRatio = 0.60; // Heavy liquid for short horizon
      goldRatio = 0.15;
      realEstateRatio = 0.15;
      debtRatio = 0.10;
    } else if (answers.investmentHorizon === "20+ years") {
      liquidRatio = 0.25; // Less liquid for long horizon
      goldRatio = 0.25;
      realEstateRatio = 0.35; // More RE for long term
      debtRatio = 0.15;
    }
    
    // Adjust for liquidity needs
    if (answers.liquidityNeeds === "frequently" || answers.withdrawalNext2Years) {
      liquidRatio = Math.min(0.70, liquidRatio + 0.20);
      goldRatio *= 0.8;
      realEstateRatio *= 0.8;
      debtRatio *= 0.8;
    }
    
    // Adjust for emergency fund
    if (answers.emergencyFundMonths === "0-1" || answers.emergencyFundMonths === "2-3") {
      liquidRatio = Math.min(0.60, liquidRatio + 0.15);
      goldRatio *= 0.9;
      realEstateRatio *= 0.9;
      debtRatio *= 0.9;
    }
    
    // Normalize ratios
    const totalRatio = liquidRatio + goldRatio + realEstateRatio + debtRatio;
    liquidRatio /= totalRatio;
    goldRatio /= totalRatio;
    realEstateRatio /= totalRatio;
    debtRatio /= totalRatio;
    
    return {
      liquid: Math.round(safetyBase * liquidRatio),
      gold: Math.round(safetyBase * goldRatio),
      realEstate: Math.round(safetyBase * realEstateRatio),
      debt: Math.round(safetyBase * debtRatio)
    };
  }
  
  applyGoalAdjustments(allocation: Record<AssetClass, number>, answers: CouncilAnswers): Record<AssetClass, number> {
    const adjusted = { ...allocation };
    
    // Goal-specific tactical adjustments
    // NEW: Process goals array if available
    if (answers.goals && answers.goals.length > 0) {
      console.log("🎯 Processing goals for allocation:", answers.goals.length, "goals");
      
      // Categorize goals by timeline
      const shortTermGoals = answers.goals.filter(g => {
        const yearsToTarget = (new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24 * 365.25);
        return yearsToTarget < 5 && g.isActive;
      });
      
      const longTermGoals = answers.goals.filter(g => {
        const yearsToTarget = (new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24 * 365.25);
        return yearsToTarget > 10 && g.isActive;
      });
      
      const highPriorityGoals = answers.goals.filter(g => g.priority === "high" && g.isActive);
      
      // Apply goal-based adjustments
      if (shortTermGoals.length > 0) {
        console.log("📅 Short-term goals detected, increasing safety assets");
        adjusted.Liquid = Math.min(30, adjusted.Liquid + 5);
        adjusted.Debt = Math.min(25, adjusted.Debt + 5);
        adjusted.Stocks = Math.max(20, adjusted.Stocks - 5);
        		adjusted["Equity MF"] = Math.max(15, adjusted["Equity MF"] - 5);
      }
      
      if (longTermGoals.length > 0) {
        console.log("🚀 Long-term goals detected, increasing growth assets");
        adjusted.Stocks = Math.min(50, adjusted.Stocks + 5);
        		adjusted["Equity MF"] = Math.min(40, adjusted["Equity MF"] + 5);
        adjusted.Liquid = Math.max(5, adjusted.Liquid - 5);
        adjusted.Debt = Math.max(5, adjusted.Debt - 5);
      }
      
      if (highPriorityGoals.length > 0) {
        console.log("⭐ High priority goals detected, increasing safety buffer");
        adjusted.Liquid = Math.min(25, adjusted.Liquid + 3);
        adjusted.Debt = Math.max(5, adjusted.Debt + 2);
      }
      
      console.log("🎯 Allocation after goal adjustments:", adjusted);
    } else {
      console.log("⚠️ No goals provided, using fallback logic");
      // Fallback: Legacy primaryGoal support for backward compatibility
      switch (answers.primaryGoal) {
        case "wealth_building":
          adjusted.Stocks = Math.min(45, adjusted.Stocks + 5);
          		adjusted["Equity MF"] = Math.min(45, adjusted["Equity MF"] + 5);
          adjusted.Liquid = Math.max(5, adjusted.Liquid - 10);
          break;
        case "home_purchase":
          adjusted.Liquid = Math.min(50, adjusted.Liquid + 15);
          adjusted.Stocks = Math.max(5, adjusted.Stocks - 8);
          		adjusted["Equity MF"] = Math.max(5, adjusted["Equity MF"] - 7);
          break;
        case "income_generation":
          adjusted.Debt = Math.min(35, adjusted.Debt + 10);
          adjusted.Stocks = Math.max(5, adjusted.Stocks - 5);
          		adjusted["Equity MF"] = Math.max(5, adjusted["Equity MF"] - 5);
          break;
        case "preservation":
          adjusted.Liquid = Math.min(40, adjusted.Liquid + 10);
          adjusted.Debt = Math.min(30, adjusted.Debt + 5);
          adjusted.Stocks = Math.max(10, adjusted.Stocks - 10);
          		adjusted["Equity MF"] = Math.max(10, adjusted["Equity MF"] - 5);
          break;
      }
    }
    
    return this.normalizeAllocation(adjusted);
  }
  
  handleAvoidedAssets(allocation: Record<AssetClass, number>, avoidAssets: AssetClass[] = []): Record<AssetClass, number> {
    console.log("🔍 handleAvoidedAssets called with:", { allocation, avoidAssets });
    
    if (!avoidAssets.length) {
      console.log("⚠️ No avoided assets provided, returning original allocation");
      return allocation;
    }
    
    const adjusted = { ...allocation };
    let redistributeAmount = 0;
    
    // Set avoided assets to 0 and calculate redistribution amount
    avoidAssets.forEach(asset => {
      console.log(`🚫 Setting ${asset} from ${adjusted[asset]}% to 0%`);
      redistributeAmount += adjusted[asset];
      adjusted[asset] = 0;
    });
    
    console.log(`💰 Redistributing ${redistributeAmount}% from avoided assets`);
    
    // Redistribute proportionally to remaining assets
    const remainingAssets = (Object.keys(adjusted) as AssetClass[]).filter(
      asset => !avoidAssets.includes(asset) && adjusted[asset] > 0
    );
    
    if (remainingAssets.length > 0) {
      const totalRemaining = remainingAssets.reduce((sum, asset) => sum + adjusted[asset], 0);
      
      remainingAssets.forEach(asset => {
        const proportion = adjusted[asset] / totalRemaining;
        adjusted[asset] = Math.round(adjusted[asset] + (redistributeAmount * proportion));
      });
    }
    
    return this.normalizeAllocation(adjusted);
  }
  
  private normalizeAllocation(allocation: Record<AssetClass, number>): Record<AssetClass, number> {
    const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    
    if (total === 100) return allocation;
    
    // Use largest remainder method for rounding
    const normalized = { ...allocation };
    const factor = 100 / total;
    
    Object.keys(normalized).forEach(key => {
      normalized[key as AssetClass] = allocation[key as AssetClass] * factor;
    });
    
    // Round and handle remainder
    let runningTotal = 0;
    const rounded: Record<AssetClass, number> = {} as any;
    const remainders: Array<{ asset: AssetClass; remainder: number }> = [];
    
    Object.entries(normalized).forEach(([asset, value]) => {
      const floor = Math.floor(value);
      rounded[asset as AssetClass] = floor;
      runningTotal += floor;
      remainders.push({ asset: asset as AssetClass, remainder: value - floor });
    });
    
    // Distribute remaining percentage points
    remainders.sort((a, b) => b.remainder - a.remainder);
    const remaining = 100 - runningTotal;
    
    for (let i = 0; i < remaining; i++) {
      if (remainders[i]) {
        rounded[remainders[i].asset]++;
      }
    }
    
    return rounded;
  }
}