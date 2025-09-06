/**
 * Goal Analyzer Engine
 * Handles goal-based allocation adjustments
 * Follows best practices with clean function separation
 */

import { Goal, CouncilAnswers, AssetClass, Priority } from './advisor/types';

export interface GoalAnalysisResult {
  activeGoalCount: number;
  shortTermGoals: Goal[];
  mediumTermGoals: Goal[];
  longTermGoals: Goal[];
  totalTargetAmount: number;
  weightedAllocation: Record<AssetClass, number>;
}

export class GoalAnalyzer {
  /**
   * Analyze goals and categorize them by timeline
   * Clean function separation - no inline logic
   */
  public analyzeGoals(goals: Goal[]): GoalAnalysisResult {
    const activeGoals = this.filterActiveGoals(goals);
    const categorizedGoals = this.categorizeGoalsByTimeline(activeGoals);
    const totalTargetAmount = this.calculateTotalTargetAmount(activeGoals);
    const weightedAllocation = this.calculateWeightedAllocation(categorizedGoals, totalTargetAmount);

    return {
      activeGoalCount: activeGoals.length,
      shortTermGoals: categorizedGoals.shortTerm,
      mediumTermGoals: categorizedGoals.mediumTerm,
      longTermGoals: categorizedGoals.longTerm,
      totalTargetAmount,
      weightedAllocation
    };
  }

  /**
   * Filter only active goals
   * Clean function separation
   */
  private filterActiveGoals(goals: Goal[]): Goal[] {
    return goals.filter(goal => goal.isActive === true);
  }

  /**
   * Categorize goals by timeline
   * Clean function separation
   */
  private categorizeGoalsByTimeline(goals: Goal[]): {
    shortTerm: Goal[];
    mediumTerm: Goal[];
    longTerm: Goal[];
  } {
    const now = new Date();
    const shortTerm: Goal[] = [];
    const mediumTerm: Goal[] = [];
    const longTerm: Goal[] = [];

    goals.forEach(goal => {
      const yearsToTarget = this.calculateYearsToTarget(goal.targetDate, now);
      
      if (yearsToTarget < 5) {
        shortTerm.push(goal);
      } else if (yearsToTarget <= 10) {
        mediumTerm.push(goal);
      } else {
        longTerm.push(goal);
      }
    });

    return { shortTerm, mediumTerm, longTerm };
  }

  /**
   * Calculate years to target date
   * Clean function separation
   */
  private calculateYearsToTarget(targetDate: Date, currentDate: Date): number {
    const timeDiff = targetDate.getTime() - currentDate.getTime();
    const yearsDiff = timeDiff / (1000 * 3600 * 24 * 365.25);
    return Math.max(0, yearsDiff);
  }

  /**
   * Calculate total target amount
   * Clean function separation
   */
  private calculateTotalTargetAmount(goals: Goal[]): number {
    return goals.reduce((total, goal) => total + goal.targetAmount, 0);
  }

  /**
   * Calculate weighted allocation based on goals
   * Clean function separation
   */
  private calculateWeightedAllocation(
    categorizedGoals: { shortTerm: Goal[]; mediumTerm: Goal[]; longTerm: Goal[] },
    totalTargetAmount: number
  ): Record<AssetClass, number> {
    const shortTermWeight = this.calculateCategoryWeight(categorizedGoals.shortTerm, totalTargetAmount);
    const mediumTermWeight = this.calculateCategoryWeight(categorizedGoals.mediumTerm, totalTargetAmount);
    const longTermWeight = this.calculateCategoryWeight(categorizedGoals.longTerm, totalTargetAmount);

    // Apply goal-based allocation adjustments
    const allocation: Record<AssetClass, number> = {
      "Stocks": 0,
      		"Equity MF": 0,
      		"ETF": 0, // ETFs will be handled as part of Equity MF for now
      "Gold": 0,
      "Real Estate": 0,
      "Debt": 0,
      "Liquid": 0
    };

    // Short-term goals bias towards safety
    if (shortTermWeight > 0) {
      allocation["Liquid"] += shortTermWeight * 0.4;
      allocation["Debt"] += shortTermWeight * 0.4;
      allocation["Gold"] += shortTermWeight * 0.2;
    }

    // Medium-term goals maintain balance
    if (mediumTermWeight > 0) {
      allocation["Stocks"] += mediumTermWeight * 0.3;
      		allocation["Equity MF"] += mediumTermWeight * 0.3;
      allocation["Debt"] += mediumTermWeight * 0.2;
      allocation["Liquid"] += mediumTermWeight * 0.1;
      allocation["Gold"] += mediumTermWeight * 0.1;
    }

    // Long-term goals bias towards growth
    if (longTermWeight > 0) {
      allocation["Stocks"] += longTermWeight * 0.5;
      		allocation["Equity MF"] += longTermWeight * 0.3;
      allocation["Real Estate"] += longTermWeight * 0.2;
    }

    return allocation;
  }

  /**
   * Calculate weight for a goal category
   * Clean function separation
   */
  private calculateCategoryWeight(goals: Goal[], totalTargetAmount: number): number {
    if (totalTargetAmount === 0) return 0;
    
    const categoryTotal = goals.reduce((sum, goal) => {
      const priorityMultiplier = this.getPriorityMultiplier(goal.priority);
      const timelineMultiplier = this.getTimelineMultiplier(goal.targetDate);
      return sum + (goal.targetAmount * priorityMultiplier * timelineMultiplier);
    }, 0);

    return categoryTotal / totalTargetAmount;
  }

  /**
   * Get priority multiplier
   * Clean function separation
   */
  private getPriorityMultiplier(priority: Priority): number {
    const multipliers: Record<Priority, number> = {
      "low": 0.5,
      "medium": 1.0,
      "high": 1.5
    };
    return multipliers[priority] || 1.0;
  }

  /**
   * Get timeline multiplier
   * Clean function separation
   */
  private getTimelineMultiplier(targetDate: Date): number {
    const yearsToTarget = this.calculateYearsToTarget(targetDate, new Date());
    
    if (yearsToTarget < 5) return 1.2;      // Short-term urgency
    if (yearsToTarget <= 10) return 1.0;    // Medium-term balance
    return 0.8;                              // Long-term patience
  }

  /**
   * Apply goal-based adjustments to existing allocation
   * Main function that integrates with allocation engine
   */
  public applyGoalAdjustments(
    baseAllocation: Record<AssetClass, number>,
    goals: Goal[],
    answers: CouncilAnswers
  ): Record<AssetClass, number> {
    if (!goals || goals.length === 0) {
      console.log("🎯 No goals provided, returning base allocation");
      return baseAllocation;
    }

    console.log("🎯 Applying goal-based adjustments to allocation");
    
    const analysis = this.analyzeGoals(goals);
    const goalAdjustments = analysis.weightedAllocation;
    
    // Blend base allocation with goal adjustments
    const blendedAllocation = this.blendAllocations(baseAllocation, goalAdjustments, 0.3);
    
    // Ensure allocation sums to 100%
    const normalizedAllocation = this.normalizeAllocation(blendedAllocation);
    
    console.log("🎯 Goal adjustments applied:", {
      activeGoals: analysis.activeGoalCount,
      shortTerm: analysis.shortTermGoals.length,
      mediumTerm: analysis.mediumTermGoals.length,
      longTerm: analysis.longTermGoals.length,
      totalTargetAmount: analysis.totalTargetAmount
    });

    return normalizedAllocation;
  }

  /**
   * Blend base allocation with goal adjustments
   * Clean function separation
   */
  private blendAllocations(
    base: Record<AssetClass, number>,
    goals: Record<AssetClass, number>,
    goalWeight: number
  ): Record<AssetClass, number> {
    const blended: Record<AssetClass, number> = {} as Record<AssetClass, number>;
    
    Object.keys(base).forEach(assetClass => {
      const asset = assetClass as AssetClass;
      blended[asset] = (base[asset] * (1 - goalWeight)) + (goals[asset] * goalWeight);
    });

    return blended;
  }

  /**
   * Normalize allocation to sum to 100%
   * Clean function separation
   */
  private normalizeAllocation(allocation: Record<AssetClass, number>): Record<AssetClass, number> {
    const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    
    if (total === 0) return allocation;
    
    const normalized: Record<AssetClass, number> = {} as Record<AssetClass, number>;
    Object.keys(allocation).forEach(assetClass => {
      const asset = assetClass as AssetClass;
      normalized[asset] = (allocation[asset] / total) * 100;
    });

    return normalized;
  }
}
