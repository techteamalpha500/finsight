/**
 * Core Signal Processing Engine
 * Each factor contributes weighted equity/safety signals
 */

import { Signal, CouncilAnswers, AssetClass, Goal, GoalCategory, Priority } from './types';

export class SignalProcessor {
  // Priority weight constants
  private static readonly PRIORITY_WEIGHTS = {
    "high": 1.2,
    "medium": 1.0,
    "low": 0.8
  } as const;

  // Goal category base signals (before timeline adjustment)
  private static readonly BASE_CATEGORY_SIGNALS = {
    "retirement": 5,        // Moderately aggressive base
    "wealth_building": 8,   // Aggressive base
    "home_purchase": -3,    // Slightly conservative base
    "child_education": 2,   // Slightly aggressive base
    "emergency_fund": -10,  // Very conservative base
    "custom": 0            // Neutral base
  } as const;

  /**
   * Smooth sigmoid timeline curve for equity signal adjustment
   * Eliminates cliff effects and provides natural transitions
   * 
   * Curve: y = 20 / (1 + e^(-0.1*(x-36))) - 10
   * Range: -10 to +10, inflection point at 36 months
   * 
   * Timeline behavior:
   * 0-6 months:   -8 to -6 (very conservative)
   * 6-18 months:  -6 to -2 (conservative) 
   * 18-36 months: -2 to 0  (neutral transition)
   * 36-60 months: 0 to +4  (moderate growth)
   * 60+ months:   +4 to +8 (aggressive growth)
   */
  private calculateSmoothTimelineSignal(monthsToTarget: number): number {
    if (monthsToTarget <= 0) return -10; // Past due = maximum safety
    
    // Cap at 20 years for calculation stability
    const x = Math.min(240, monthsToTarget);
    
    // Sigmoid curve: smooth transition from conservative to aggressive
    const signal = (20 / (1 + Math.exp(-0.1 * (x - 36)))) - 10;
    
    // Round to 1 decimal place for cleaner signals
    return Math.round(signal * 10) / 10;
  }

  /**
   * Calculate urgency multiplier for goal weighting
   * More urgent goals get higher weight in allocation decisions
   */
  private calculateUrgencyMultiplier(monthsToTarget: number): number {
    if (monthsToTarget <= 0) return 1.5; // Past due = maximum urgency
    if (monthsToTarget > 240) return 0.1; // 20+ years = minimal urgency
    
    // Inverse relationship: closer goals are more urgent
    // Formula: 1.5 - (months/240) with minimum of 0.1
    return Math.max(0.1, Math.min(1.5, 1.5 - (monthsToTarget / 240)));
  }

  /**
   * Calculate base weight for goal based on target amount
   * Larger goals naturally get more weight in allocation decisions
   */
  private calculateBaseWeight(goal: Goal): number {
    // Normalize by 10L (1 crore) as reference point
    const normalizedAmount = goal.targetAmount / 1000000;
    
    // Logarithmic scaling to prevent huge goals from dominating
    // Weight = log(1 + amount/10L) * 0.3, capped at 1.0
    return Math.min(1.0, Math.log(1 + normalizedAmount) * 0.3);
  }

  /**
   * Get months until target date with error handling
   */
  private getMonthsUntilDate(targetDate: Date): number {
    const now = new Date();
    const target = new Date(targetDate);
    
    const diffTime = target.getTime() - now.getTime();
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average month length
    
    return Math.round(diffMonths);
  }

  /**
   * Adjust goal for current progress
   * Reduces allocation weight for partially completed goals
   */
  private adjustGoalForProgress(goal: Goal): Goal & { adjustedWeight: number } {
    if (!goal.currentProgress || goal.currentProgress <= 0) {
      return { ...goal, adjustedWeight: 1.0 };
    }
    
    // Calculate completion ratio
    const progressRatio = Math.min(1.0, goal.currentProgress / goal.targetAmount);
    const remainingAmount = goal.targetAmount - goal.currentProgress;
    
    // Reduce weight for nearly completed goals (90%+ complete get 20% weight)
    const completionFactor = progressRatio > 0.9 ? 0.2 : (1 - progressRatio);
    
    return {
      ...goal,
      targetAmount: remainingAmount,
      adjustedWeight: completionFactor
    };
  }

  /**
   * Create integrated goal signal with smooth timeline curve and priority weighting
   */
  private createGoalSignal(goal: Goal & { adjustedWeight: number }): Signal {
    const monthsToTarget = this.getMonthsUntilDate(goal.targetDate);
    
    // 1. Base signal from goal category
    const baseEquitySignal = SignalProcessor.BASE_CATEGORY_SIGNALS[goal.category] || 0;
    
    // 2. Smooth timeline adjustment (additive)
    const timelineAdjustment = this.calculateSmoothTimelineSignal(monthsToTarget);
    
    // 3. Priority multiplier (multiplicative)
    const priorityMultiplier = SignalProcessor.PRIORITY_WEIGHTS[goal.priority] || 1.0;
    
    // 4. Combine: (base + timeline) * priority, bounded to [-15, 15]
    const finalEquitySignal = Math.max(-15, Math.min(15,
      (baseEquitySignal + timelineAdjustment) * priorityMultiplier
    ));
    
    // 5. Proportional safety signal (negative correlation with equity)
    const finalSafetySignal = Math.max(-15, Math.min(15, -finalEquitySignal * 0.7));
    
    // 6. Calculate weight: base amount weight * urgency multiplier * progress adjustment
    const baseWeight = this.calculateBaseWeight(goal);
    const urgencyMultiplier = this.calculateUrgencyMultiplier(monthsToTarget);
    const progressFactor = goal.adjustedWeight;
    
    const finalWeight = Math.min(1.0, baseWeight * urgencyMultiplier * progressFactor);
    
    // 7. Create human-readable explanation
    const timelineDesc = monthsToTarget <= 12 ? "urgent" : 
                        monthsToTarget <= 36 ? "medium-term" : "long-term";
    const explanation = `${goal.name}: ₹${(goal.targetAmount / 100000).toFixed(1)}L ${timelineDesc} ${goal.category} goal (${goal.priority} priority)`;
    
    return {
      factor: `goal_${goal.category}_${goal.id}`,
      equitySignal: finalEquitySignal,
      safetySignal: finalSafetySignal,
      weight: finalWeight,
      explanation
    };
  }

  /**
   * Process multiple goals into normalized signals
   * Handles progress adjustment and weight normalization
   */
  private getGoalsSignals(goals: Goal[]): Signal[] {
    if (!goals || goals.length === 0) {
      // No goals = default balanced approach
      return [{
        factor: 'default_balanced_goal',
        equitySignal: 0,
        safetySignal: 0,
        weight: 0.15, // Standard goal weight
        explanation: 'Balanced approach with no specific goals defined'
      }];
    }
    
    // Filter active goals and adjust for progress
    const processedGoals = goals
      .filter(g => g.isActive)
      .map(goal => this.adjustGoalForProgress(goal))
      .filter(goal => goal.targetAmount > 0); // Skip completed goals
    
    if (processedGoals.length === 0) {
      return this.getGoalsSignals([]); // Fall back to default
    }
    
    // Create signals for each goal
    const goalSignals = processedGoals.map(goal => this.createGoalSignal(goal));
    
    // Normalize weights to prevent over-allocation
    return this.normalizeGoalSignals(goalSignals);
  }

  /**
   * Normalize goal signal weights to fit within allocation budget
   * Prevents goals from dominating the entire allocation decision
   */
  private normalizeGoalSignals(goalSignals: Signal[]): Signal[] {
    // Calculate total weight
    const totalWeight = goalSignals.reduce((sum, signal) => sum + signal.weight, 0);
    
    if (totalWeight === 0) return goalSignals;
    
    // Goal signals should use 40% of total allocation decision weight
    const GOAL_WEIGHT_BUDGET = 0.4;
    const normalizationFactor = GOAL_WEIGHT_BUDGET / totalWeight;
    
    return goalSignals.map(signal => ({
      ...signal,
      weight: signal.weight * normalizationFactor
    }));
  }

  // Helper method to safely get signal with fallback
  private getSignalSafely(
    signals: Record<string, { equity: number; safety: number; explanation: string }>,
    key: string,
    factor: string,
    weight: number,
    fallback: { equity: number; safety: number; explanation: string }
  ): Signal {
    const signal = signals[key];
    if (!signal) {
      return {
        factor,
        equitySignal: fallback.equity,
        safetySignal: fallback.safety,
        weight,
        explanation: fallback.explanation
      };
    }
    
    return {
      factor,
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight,
      explanation: signal.explanation
    };
  }
  
  calculateSignals(answers: CouncilAnswers): Signal[] {
    console.log("🚀🚀🚀 ENHANCED GOALS-BASED ENGINE CALCULATE SIGNALS CALLED! 🚀🚀🚀");
    console.log("📋 Input answers:", answers);
    
    const signals: Signal[] = [];
    let signalId = 1;
    
    // Age Signals (25% weight)
    const ageSignal = this.getAgeSignal(answers.age);
    ageSignal.factor = `age_${signalId++}`;
    console.log("👴 Age signal:", ageSignal);
    signals.push(ageSignal);
    
    // Time Horizon (25% weight)
    const horizonSignal = this.getHorizonSignal(answers.investmentHorizon);
    horizonSignal.factor = `horizon_${signalId++}`;
    console.log("⏰ Horizon signal:", horizonSignal);
    signals.push(horizonSignal);
    
    // Financial Situation (15% weight)
    const dependentsSignal = this.getDependentsSignal(answers.dependents);
    dependentsSignal.factor = `dependents_${signalId++}`;
    signals.push(dependentsSignal);
    
    const emergencySignal = this.getEmergencyFundSignal(answers.emergencyFundMonths);
    emergencySignal.factor = `emergency_${signalId++}`;
    signals.push(emergencySignal);
    
    // Risk Tolerance (15% weight) - Knowledge will be applied as multiplier later
    const volatilitySignal = this.getVolatilitySignal(answers.volatilityComfort);
    volatilitySignal.factor = `volatility_${signalId++}`;
    signals.push(volatilitySignal);
    
    const lossSignal = this.getLossToleranceSignal(answers.maxAcceptableLoss);
    lossSignal.factor = `loss_${signalId++}`;
    signals.push(lossSignal);
    
    // 🎯 NEW: Goals-Based Signals (40% weight budget - replaces single primaryGoal)
    const goalSignals = this.getGoalsSignals(answers.goals || []);
    console.log("🎯 Goals-based signals:", goalSignals);
    signals.push(...goalSignals);
    
    // Contextual Signals (5% weight)
    if (!answers.hasInsurance) {
      console.log("Adding no_insurance negative signal");
      signals.push({
        factor: `insurance_${signalId++}`,
        equitySignal: -10,
        safetySignal: +10,
        weight: 0.05,
        explanation: "Lack of insurance requires more conservative positioning"
      });
    } else {
      console.log("Insurance is adequate, no negative signal added");
    }
    
    console.log("🔍 BEFORE knowledge multiplier - signals:", signals.map(s => ({
      factor: s.factor,
      equitySignal: s.equitySignal,
      safetySignal: s.safetySignal,
      weight: s.weight
    })));
    
    // Apply knowledge multiplier to all signals (not as separate weight)
    this.applyKnowledgeMultiplier(signals, answers.investmentKnowledge);
    
    console.log("🔍 AFTER knowledge multiplier - signals:", signals.map(s => ({
      factor: s.factor,
      equitySignal: s.equitySignal,
      safetySignal: s.safetySignal,
      weight: s.weight,
      weightedEquity: s.equitySignal * s.weight,
      weightedSafety: s.safetySignal * s.weight
    })));
    
    // Debug: Log all signals and their impact
    console.log("🔍 DEBUG: All signals generated:", signals.map(s => ({
      factor: s.factor,
      equitySignal: s.equitySignal,
      safetySignal: s.safetySignal,
      weight: s.weight,
      weightedEquity: s.equitySignal * s.weight,
      weightedSafety: s.safetySignal * s.weight
    })));
    
    console.log("🚀🚀🚀 ENHANCED GOALS-BASED ENGINE CALCULATE SIGNALS COMPLETED! 🚀🚀🚀");
    return signals;
  }

  /**
   * Calculate dynamic weights based on primary goal context
   * Goals modify Age/Horizon weights rather than being independent
   */
  private calculateDynamicWeights(primaryGoal: string): { ageWeight: number; horizonWeight: number; goalWeight: number } {
    const baseWeights = {
      ageWeight: 0.25,      // 25% base (Core Factors: 65%)
      horizonWeight: 0.25,  // 25% base (Core Factors: 65%)
      goalWeight: 0.15      // 15% base (Core Factors: 65%)
    };

    switch (primaryGoal) {
      case "retirement":
        // Retirement: Horizon matters more than age
        return {
          ageWeight: 0.20,      // 25% → 20% (-5%)
          horizonWeight: 0.30,  // 25% → 30% (+5%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "child_education":
        // Education: Horizon dominates, age less relevant
        return {
          ageWeight: 0.15,      // 25% → 15% (-10%)
          horizonWeight: 0.35,  // 25% → 35% (+10%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "home_purchase":
        // Home purchase: Horizon critical, age less important
        return {
          ageWeight: 0.15,      // 25% → 15% (-10%)
          horizonWeight: 0.35,  // 25% → 35% (+10%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "wealth_building":
        // Wealth building: Age and horizon equally important
        return {
          ageWeight: 0.25,      // 25% unchanged
          horizonWeight: 0.25,  // 25% unchanged
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "income_generation":
        // Income: Age matters more (stability), horizon less
        return {
          ageWeight: 0.30,      // 25% → 30% (+5%)
          horizonWeight: 0.20,  // 25% → 20% (-5%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      case "preservation":
        // Preservation: Age critical, horizon less relevant
        return {
          ageWeight: 0.30,      // 25% → 30% (+5%)
          horizonWeight: 0.20,  // 25% → 20% (-5%)
          goalWeight: 0.15      // 15% unchanged
        };
      
      default:
        return baseWeights;
    }
  }

  /**
   * Apply knowledge multiplier to all signals (not as separate weight)
   * Capped to prevent extreme adjustments
   */
  private applyKnowledgeMultiplier(signals: Signal[], knowledge: string): void {
    console.log("🧠🧠🧠 KNOWLEDGE MULTIPLIER APPLIED! 🧠🧠🧠");
    console.log("📚 Knowledge level:", knowledge);
    
    const knowledgeMultipliers = {
      "beginner": 0.8,        // -20% penalty
      "some_knowledge": 0.9,  // -10% penalty
      "experienced": 1.0,     // No change
      "expert": 1.2           // +20% bonus
    };

    const multiplier = knowledgeMultipliers[knowledge as keyof typeof knowledgeMultipliers] || 1.0;
    console.log("🎯 Selected multiplier:", multiplier);
    
    // Apply multiplier to equity and safety signals
    signals.forEach((signal, index) => {
      const originalEquity = signal.equitySignal;
      const originalSafety = signal.safetySignal;
      
      // Cap total adjustment to ±10 absolute percentage points
      const maxAdjustment = 10;
      
      // Apply multiplier with safety cap
      const adjustedEquity = Math.max(-maxAdjustment, Math.min(maxAdjustment, signal.equitySignal * multiplier));
      const adjustedSafety = Math.max(-maxAdjustment, Math.min(maxAdjustment, signal.safetySignal * multiplier));
      
      signal.equitySignal = adjustedEquity;
      signal.safetySignal = adjustedSafety;
      
      // Add knowledge context to explanation
      if (knowledge !== "experienced") {
        const direction = knowledge === "expert" ? "enhanced" : "adjusted";
        signal.explanation += ` (${direction} for ${knowledge} knowledge level)`;
      }
      
      console.log(`📊 Signal ${index + 1} (${signal.factor}):`, {
        original: { equity: originalEquity, safety: originalSafety },
        adjusted: { equity: signal.equitySignal, safety: signal.safetySignal },
        multiplier: multiplier
      });
    });
    
    console.log(`🔍 DEBUG: Applied knowledge multiplier: ${multiplier}x for ${knowledge} level`);
    console.log("🧠🧠🧠 KNOWLEDGE MULTIPLIER COMPLETED! 🧠🧠🧠");
  }
  
  /**
   * Apply goal-specific volatility tolerance adjustments
   * Some goals automatically modify risk tolerance
   */
  private applyGoalSpecificAdjustments(signals: Signal[], primaryGoal: string, investmentHorizon: string): void {
    // Child education: automatically reduce volatility tolerance
    if (primaryGoal === "child_education") {
      const volatilitySignal = signals.find(s => s.factor === "volatility_comfort");
      if (volatilitySignal) {
        // Reduce volatility tolerance by 20% for education goals
        volatilitySignal.equitySignal = Math.max(-15, volatilitySignal.equitySignal * 0.8);
        volatilitySignal.safetySignal = Math.min(15, volatilitySignal.safetySignal * 1.2);
        volatilitySignal.explanation += " (reduced for child education goal)";
        
        console.log("🎓 Applied child education volatility adjustment:", {
          originalEquity: volatilitySignal.equitySignal / 0.8,
          adjustedEquity: volatilitySignal.equitySignal,
          originalSafety: volatilitySignal.safetySignal / 1.2,
          adjustedSafety: volatilitySignal.safetySignal
        });
      }
    }
    
    // Home purchase: increase liquidity preference
    if (primaryGoal === "home_purchase") {
      const liquidityPreference = signals.find(s => s.factor === "emergency_fund");
      if (liquidityPreference) {
        // Increase safety preference for home purchase
        liquidityPreference.safetySignal = Math.min(15, liquidityPreference.safetySignal * 1.3);
        liquidityPreference.explanation += " (enhanced for home purchase goal)";
        
        console.log("🏠 Applied home purchase liquidity adjustment:", {
          originalSafety: liquidityPreference.safetySignal / 1.3,
          adjustedSafety: liquidityPreference.safetySignal
        });
      }
    }
    
    // Retirement: enhance long-term growth signals
    if (primaryGoal === "retirement" && investmentHorizon === "20+ years") {
      const ageSignal = signals.find(s => s.factor === "age");
      if (ageSignal && ageSignal.equitySignal > 0) {
        // Enhance growth signals for long-term retirement
        ageSignal.equitySignal = Math.min(15, ageSignal.equitySignal * 1.1);
        ageSignal.explanation += " (enhanced for long-term retirement)";
        
        console.log("🌅 Applied retirement growth enhancement:", {
          originalEquity: ageSignal.equitySignal / 1.1,
          adjustedEquity: ageSignal.equitySignal
        });
      }
    }
  }
  
  private getAgeSignal(age: string): Signal {
    const ageSignals = {
      "<25": { equity: +15, safety: -8, explanation: "Young age provides maximum risk capacity for long-term growth" },
      "25-35": { equity: +12, safety: -5, explanation: "Prime wealth-building years with high equity tolerance" },
      "35-45": { equity: +8, safety: -2, explanation: "Peak earning years allow significant equity exposure" },
      "45-55": { equity: +3, safety: +3, explanation: "Pre-retirement phase begins gradual shift to stability" },
      "55-65": { equity: -5, safety: +8, explanation: "Approaching retirement requires increased focus on preservation" },
      "65+": { equity: -10, safety: +15, explanation: "Retirement phase prioritizes capital preservation and income" }
    };
    
    const signal = ageSignals[age as keyof typeof ageSignals];
    if (!signal) {
      // Fallback for unknown age values
      return {
        factor: "age",
        equitySignal: +5,
        safetySignal: 0,
        weight: 0.25,
        explanation: "Unknown age, applying moderate growth allocation"
      };
    }
    
    return {
      factor: "age",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.25,
      explanation: signal.explanation
    };
  }
  
  private getHorizonSignal(horizon: string): Signal {
    const horizonSignals = {
      "<2 years": { equity: -15, safety: +15, explanation: "Short horizon requires maximum liquidity and capital preservation" },
      "2-5 years": { equity: -5, safety: +5, explanation: "Medium-short horizon favors defensive positioning" },
      "5-10 years": { equity: +5, safety: -2, explanation: "Medium horizon allows moderate equity exposure" },
      "10-20 years": { equity: +10, safety: -5, explanation: "Long horizon enables significant equity allocation" },
      "20+ years": { equity: +15, safety: -8, explanation: "Very long horizon maximizes growth potential through equity" }
    };
    
    const signal = horizonSignals[horizon as keyof typeof horizonSignals];
    if (!signal) {
      // Fallback for unknown horizon values
      return {
        factor: "investment_horizon",
        equitySignal: +5,
        safetySignal: -2,
        weight: 0.25, // Base weight, will be adjusted dynamically
        explanation: "Unknown investment horizon, applying moderate growth allocation"
      };
    }
    
    return {
      factor: "investment_horizon",
      equitySignal: signal.equity,
      safetySignal: signal.safety,
      weight: 0.25,
      explanation: signal.explanation
    };
  }
  
  private getDependentsSignal(dependents: string): Signal {
    const dependentSignals = {
      "0": { equity: 0, safety: 0, explanation: "No dependents allows for neutral risk positioning" },
      "1-2": { equity: -2, safety: +5, explanation: "Few dependents suggest slight increase in safety allocation" },
      "3-4": { equity: -5, safety: +8, explanation: "Multiple dependents require increased financial security" },
      "5+": { equity: -8, safety: +12, explanation: "Many dependents necessitate conservative, stable approach" }
    };
    
    return this.getSignalSafely(
      dependentSignals,
      dependents,
      "dependents",
      0.075, // REDISTRIBUTED: 10% → 7.5%
      { equity: -2, safety: +5, explanation: "Unknown dependents count, applying moderate safety allocation" }
    );
  }
  
  private getEmergencyFundSignal(efMonths: string): Signal {
    const efSignals = {
      "0-1": { equity: -15, safety: +15, explanation: "Insufficient emergency fund requires immediate liquidity focus" },
      "2-3": { equity: -8, safety: +10, explanation: "Low emergency fund suggests increasing liquid reserves" },
      "4-6": { equity: 0, safety: 0, explanation: "Adequate emergency fund allows normal risk allocation" },
      "7-12": { equity: +3, safety: -2, explanation: "Good emergency buffer enables slightly higher risk" },
      "12+": { equity: +5, safety: -5, explanation: "Excellent emergency fund supports increased equity exposure" }
    };
    
    return this.getSignalSafely(
      efSignals,
      efMonths,
      "emergency_fund",
      0.075, // REDISTRIBUTED: 15% → 7.5%
      { equity: 0, safety: 0, explanation: "Unknown emergency fund amount, applying neutral allocation" }
    );
  }
  
  private getVolatilitySignal(comfort: string): Signal {
    const volatilitySignals = {
      "panic_sell": { equity: -15, safety: +15, explanation: "Low volatility tolerance requires defensive allocation" },
      "very_uncomfortable": { equity: -8, safety: +10, explanation: "Limited comfort with volatility suggests caution" },
      "somewhat_concerned": { equity: 0, safety: 0, explanation: "Moderate volatility comfort allows balanced approach" },
      "stay_calm": { equity: +8, safety: -5, explanation: "Good volatility tolerance supports higher equity exposure" },
      "buy_more": { equity: +12, safety: -8, explanation: "Excellent volatility tolerance enables aggressive positioning" }
    };
    
    return this.getSignalSafely(
      volatilitySignals,
      comfort,
      "volatility_comfort",
      0.075, // REDISTRIBUTED: 20% → 7.5%
      { equity: 0, safety: 0, explanation: "Unknown volatility comfort, applying balanced allocation" }
    );
  }
  
  private getLossToleranceSignal(tolerance: string): Signal {
    const toleranceSignals = {
      "5%": { equity: -10, safety: +10, explanation: "Low loss tolerance requires conservative approach" },
      "10%": { equity: -5, safety: +5, explanation: "Limited loss tolerance suggests defensive positioning" },
      "20%": { equity: 0, safety: 0, explanation: "Moderate loss tolerance allows balanced allocation" },
      "30%": { equity: +5, safety: -3, explanation: "Good loss tolerance supports higher equity exposure" },
      "40%+": { equity: +10, safety: -5, explanation: "High loss tolerance enables aggressive growth strategy" }
    };
    
    return this.getSignalSafely(
      toleranceSignals,
      tolerance,
      "loss_tolerance",
      0.075, // REDISTRIBUTED: 15% → 7.5%
      { equity: 0, safety: 0, explanation: "Unknown loss tolerance, applying balanced allocation" }
    );
  }
  
  private getGoalSignal(goal: string): Signal {
    const goalSignals = {
      "retirement": { equity: +5, safety: +3, explanation: "Retirement planning balances growth with stability" },
      "wealth_building": { equity: +10, safety: -5, explanation: "Wealth building prioritizes long-term growth" },
      "income_generation": { equity: -5, safety: +10, explanation: "Income focus requires stable, yield-generating assets" },
      "child_education": { equity: +3, safety: +2, explanation: "Education planning needs balanced growth and preservation" },
      "home_purchase": { equity: -10, safety: +15, explanation: "Home purchase requires capital preservation and liquidity" },
      "preservation": { equity: -8, safety: +12, explanation: "Capital preservation prioritizes safety over growth" }
    };
    
    return this.getSignalSafely(
      goalSignals,
      goal,
      "primary_goal",
      0.15,
      { equity: +5, safety: +3, explanation: "Unknown goal, applying balanced growth approach" }
    );
  }

  /**
   * Apply smart insurance logic: adjust equity caps and liquid floors instead of flat penalties
   */
  applyInsuranceLogic(allocation: Record<AssetClass, number>, hasInsurance: boolean): Record<AssetClass, number> {
    if (hasInsurance) {
      // Adequate insurance: no adjustments needed
      console.log("✅ Insurance adequate - no allocation adjustments needed");
      return allocation;
    }

    // No insurance: apply smart adjustments
    console.log("⚠️ No insurance - applying smart allocation adjustments");
    
    const adjustedAllocation = { ...allocation };
    
    // Reduce equity exposure (more conservative when vulnerable)
    		const equityTotal = allocation.Stocks + allocation["Equity MF"];
    const equityReduction = Math.min(equityTotal * 0.1, 10); // Max 10% reduction
    
    if (allocation.Stocks > 0) {
      const stockReduction = (allocation.Stocks / equityTotal) * equityReduction;
      adjustedAllocation.Stocks = Math.max(0, allocation.Stocks - stockReduction);
    }
    
    		if (allocation["Equity MF"] > 0) {
			const mfReduction = (allocation["Equity MF"] / equityTotal) * equityReduction;
			adjustedAllocation["Equity MF"] = Math.max(0, allocation["Equity MF"] - mfReduction);
		}
    
    // Increase liquid allocation (better emergency preparedness)
    const liquidIncrease = Math.min(10, equityReduction * 0.5); // Up to 10% increase
    adjustedAllocation.Liquid = Math.min(100, allocation.Liquid + liquidIncrease);
    
    // Increase debt allocation (stability)
    const debtIncrease = Math.min(5, equityReduction * 0.3); // Up to 5% increase
    adjustedAllocation.Debt = Math.min(100, allocation.Debt + debtIncrease);
    
    // Normalize to ensure total = 100%
    const total = Object.values(adjustedAllocation).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.1) {
      const normalizationFactor = 100 / total;
      Object.keys(adjustedAllocation).forEach(key => {
        adjustedAllocation[key as AssetClass] = adjustedAllocation[key as AssetClass] * normalizationFactor;
      });
    }
    
    console.log("🔧 Insurance adjustments applied:", {
      original: allocation,
      adjusted: adjustedAllocation,
      changes: {
        equityReduction: equityReduction.toFixed(1) + "%",
        liquidIncrease: liquidIncrease.toFixed(1) + "%",
        debtIncrease: debtIncrease.toFixed(1) + "%"
      }
    });
    
    return adjustedAllocation;
  }
}