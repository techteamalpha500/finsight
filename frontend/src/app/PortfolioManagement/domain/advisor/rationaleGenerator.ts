/**
 * Human-Like Rationale Generator
 * Creates advisor-quality explanations for allocation decisions
 */

import { Signal, CouncilAnswers, AssetClass, RiskLevel, Goal } from './types';
import { getConsistentRiskProfile } from './config';

export class RationaleGenerator {
  generate(
    allocation: Record<AssetClass, number>, 
    signals: Signal[], 
    answers: CouncilAnswers, 
    riskScore: number,
    behavioralWarnings?: Array<{
      severity: "warning" | "critical";
      message: string;
      category: string;
      suggestedAction: string;
      advisorNote?: string;
    }>
  ): string[] {
    const rationale: string[] = [];
    
    // Lead with primary driver
    const dominantSignal = signals.reduce((max, signal) => 
      Math.abs(signal.equitySignal * signal.weight) > Math.abs(max.equitySignal * max.weight) ? signal : max
    );
    
    rationale.push(this.getLeadingStatement(dominantSignal, answers));
    
    // Address risk level
    const riskLevel = this.getRiskLevel(riskScore);
    rationale.push(this.getRiskExplanation(riskLevel, allocation, answers));
    
    // Goal alignment - use goals if available, fallback to primaryGoal for backward compatibility
    if (answers.goals && answers.goals.length > 0) {
      rationale.push(this.getGoalsAlignment(answers.goals, allocation));
    } else if (answers.primaryGoal) {
      rationale.push(this.getGoalAlignment(answers.primaryGoal, allocation));
    } else {
      rationale.push("This allocation provides a balanced approach suitable for general investment objectives.");
    }
    
    // Address concerns or special circumstances
    const concerns = this.getSpecialCircumstances(signals, answers, allocation);
    if (concerns) rationale.push(concerns);
    
    // Portfolio construction rationale
    rationale.push(this.getConstructionRationale(allocation, answers));
    
    // Add behavioral warnings if any exist
    if (behavioralWarnings && behavioralWarnings.length > 0) {
      const criticalWarnings = behavioralWarnings.filter(w => w.severity === "critical");
      const warnings = behavioralWarnings.filter(w => w.severity === "warning");
      
      if (criticalWarnings.length > 0) {
        rationale.push(`⚠️ Critical Considerations: ${criticalWarnings.map(w => w.message).join("; ")}. ${criticalWarnings[0].suggestedAction}.`);
      }
      
      if (warnings.length > 0) {
        rationale.push(`📝 Additional Considerations: ${warnings.map(w => w.message).join("; ")}. Consider discussing these with your advisor.`);
      }
    }
    
    return rationale;
  }
  
  private getLeadingStatement(dominantSignal: Signal, answers: CouncilAnswers): string {
    if (dominantSignal.factor === "age") {
      const ageAdvice = {
        "<25": "At your young age, you have decades to build wealth through equity markets.",
        "25-35": "You're in prime wealth-building years with excellent capacity for growth investments.",
        "35-45": "Your peak earning phase allows for significant equity exposure while building long-term wealth.",
        "45-55": "As you approach retirement planning, we're balancing growth with gradual stability increases.",
        "55-65": "Nearing retirement, your portfolio emphasizes preservation while maintaining some growth potential.",
        "65+": "In retirement, capital preservation and income generation are your primary priorities."
      };
      return ageAdvice[answers.age as keyof typeof ageAdvice];
    }
    
    if (dominantSignal.factor === "investment_horizon") {
      return dominantSignal.explanation;
    }
    
    if (dominantSignal.factor === "primary_goal") {
      const goalAdvice = {
        "retirement": "Your retirement planning strategy balances long-term growth with progressive risk reduction.",
        "wealth_building": "For wealth building, we're emphasizing growth-oriented assets to maximize long-term returns.",
        "income_generation": "Your income focus requires stable, yield-generating investments for regular cash flow.",
        "home_purchase": "For your home purchase goal, we're prioritizing capital preservation and liquidity.",
        "child_education": "Education planning needs predictable growth while preserving capital as the timeline approaches.",
        "preservation": "Capital preservation takes priority, focusing on stability over aggressive growth."
      };
      return goalAdvice[answers.primaryGoal as keyof typeof goalAdvice];
    }
    
    return dominantSignal.explanation;
  }
  
  private getRiskLevel(riskScore: number): RiskLevel {
    return getConsistentRiskProfile(riskScore).level;
  }
  
  private getRiskExplanation(riskLevel: RiskLevel, allocation: Record<AssetClass, number>, answers: CouncilAnswers): string {
    const equityTotal = allocation.Stocks + allocation["Equity MF"];
    
    if (riskLevel === "Aggressive") {
      return `Your ${equityTotal}% equity allocation reflects your comfort with volatility and long-term growth focus, supported by your ${answers.volatilityComfort?.replace('_', ' ') || 'moderate'} approach to market fluctuations.`;
    } else if (riskLevel === "Conservative") {
      return `The conservative ${100 - equityTotal}% allocation to safety assets provides stability aligned with your risk comfort level and circumstances.`;
    } else {
      return `This balanced ${equityTotal}% equity approach provides growth potential while maintaining appropriate safety buffers for your situation.`;
    }
  }
  
  private getGoalAlignment(goal: string, allocation: Record<AssetClass, number>): string {
    const goalExplanations = {
      "retirement": `The ${allocation.Debt + allocation.Gold}% allocation to income-generating and hedge assets supports your retirement timeline.`,
      "wealth_building": `Heavy equity weighting of ${allocation.Stocks + allocation["Equity MF"]}% maximizes long-term wealth accumulation potential.`,
      "income_generation": `${allocation.Debt}% in debt instruments provides the steady income stream you're seeking.`,
      "home_purchase": `${allocation.Liquid}% in liquid assets ensures capital availability for your home purchase timeline.`,
      "child_education": `Balanced approach preserves capital while generating growth for education expenses.`,
      "preservation": `${allocation.Debt + allocation.Gold + allocation.Liquid}% in preservation assets protects your capital from market volatility.`
    };
    
    return goalExplanations[goal as keyof typeof goalExplanations] || "This allocation aligns with your stated investment objectives.";
  }

  private getGoalsAlignment(goals: Goal[], allocation: Record<AssetClass, number>): string {
    const activeGoals = goals.filter(g => g.isActive);
    
    if (activeGoals.length === 0) {
      return "This balanced allocation approach is suitable for general investment objectives.";
    }
    
    if (activeGoals.length === 1) {
      const goal = activeGoals[0];
      return `This allocation is optimized for your ${goal.name} goal (₹${(goal.targetAmount / 100000).toFixed(1)}L by ${new Date(goal.targetDate).getFullYear()}).`;
    }
    
    // Multiple goals - analyze priority and timeline
    const highPriorityGoals = activeGoals.filter(g => g.priority === "high");
    const urgentGoals = activeGoals.filter(g => {
      const monthsToTarget = Math.round((new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      return monthsToTarget <= 24;
    });
    
    let explanation = `This allocation balances ${activeGoals.length} goals: `;
    
    if (urgentGoals.length > 0) {
      const urgentNames = urgentGoals.map(g => g.name).join(", ");
      explanation += `prioritizing near-term goals (${urgentNames}) with ${allocation.Liquid + allocation.Debt}% in stable assets, `;
    }
    
    if (highPriorityGoals.length > 0) {
      const highPriorityNames = highPriorityGoals.map(g => g.name).join(", ");
      explanation += `emphasizing high-priority objectives (${highPriorityNames}), `;
    }
    
    const longTermGoals = activeGoals.filter(g => {
      const monthsToTarget = Math.round((new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      return monthsToTarget > 60;
    });
    
    if (longTermGoals.length > 0) {
      explanation += `while maintaining ${allocation.Stocks + allocation["Equity MF"]}% equity exposure for long-term growth.`;
    } else {
      explanation += `with appropriate risk balance for your timeline.`;
    }
    
    return explanation;
  }
  
  private getSpecialCircumstances(signals: Signal[], answers: CouncilAnswers, allocation: Record<AssetClass, number>): string | null {
    const circumstances: string[] = [];
    
    // Emergency fund concerns
    if (answers.emergencyFundMonths === "0-1" || answers.emergencyFundMonths === "2-3") {
      circumstances.push(`Higher liquid allocation (${allocation.Liquid}%) addresses your emergency fund gap.`);
    }
    
    // High dependents
    if (answers.dependents === "3-4" || answers.dependents === "5+") {
      circumstances.push(`Family responsibilities support the conservative positioning with ${allocation.Debt + allocation.Liquid}% in stable assets.`);
    }
    
    // Near-term withdrawal
    if (answers.withdrawalNext2Years) {
      circumstances.push(`Anticipated withdrawals within 2 years justify the emphasis on liquid and stable investments.`);
    }
    
    // Job instability
    if (answers.jobStability === "not_stable") {
      circumstances.push(`Income volatility supports maintaining higher safety buffers in your allocation.`);
    }
    
    return circumstances.length > 0 ? circumstances.join(" ") : null;
  }
  
  private getConstructionRationale(allocation: Record<AssetClass, number>, answers: CouncilAnswers): string {
    const equityTotal = allocation.Stocks + allocation["Equity MF"];
    const components: string[] = [];
    
    if (allocation.Stocks > 0) {
      components.push(`${allocation.Stocks}% direct stocks for growth potential`);
    }
    
    if (allocation["Equity MF"] > 0) {
      components.push(`${allocation["Equity MF"]}% equity mutual funds for diversified equity exposure`);
    }
    
    if (allocation.Debt > 0) {
      components.push(`${allocation.Debt}% debt for stable income`);
    }
    
    if (allocation.Gold > 0) {
      components.push(`${allocation.Gold}% gold as inflation hedge`);
    }
    
    if (allocation["Real Estate"] > 0) {
      components.push(`${allocation["Real Estate"]}% real estate for portfolio diversification`);
    }
    
    if (allocation.Liquid > 0) {
      components.push(`${allocation.Liquid}% liquid funds for flexibility and opportunities`);
    }
    
    return `Portfolio construction: ${components.join(", ")}.`;
  }
}