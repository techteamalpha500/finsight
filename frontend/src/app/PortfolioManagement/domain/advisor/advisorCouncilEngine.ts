/**
 * Main Advisor Council Engine
 * Orchestrates all components to generate professional allocation recommendations
 */

import { 
  CouncilAnswers, 
  AllocationResult, 
  AssetClass 
} from './types';
import { getConsistentRiskProfile, validateBehavioralConsistency } from './config';
import { SignalProcessor } from './signalProcessor';
import { AllocationCalculator } from './allocationCalculator';
import { RationaleGenerator } from './rationaleGenerator';
import { StressTester } from './stressTester';
import { GoalAnalyzer } from '../goalAnalyzer';

export class AdvisorCouncilEngine {
  private signalProcessor = new SignalProcessor();
  private allocationCalculator = new AllocationCalculator();
  private rationaleGenerator = new RationaleGenerator();
  private stressTester = new StressTester();
  private goalAnalyzer = new GoalAnalyzer();
  
  generateRecommendation(answers: CouncilAnswers): AllocationResult {
    console.log("🚀 ADVISOR COUNCIL ENGINE GENERATERECOMMENDATION CALLED! 🚀");
    console.log("🏗️ === ADVISOR COUNCIL ENGINE - DETAILED CALCULATION === 🏗️");
    console.log("📋 INPUT ANSWERS:", answers);
    
    // Step 1: Process all signals
    const signals = this.signalProcessor.calculateSignals(answers);
    console.log("📊 STEP 1 - SIGNALS CALCULATED:", {
      totalSignals: signals.length,
      signalBreakdown: signals.map(s => ({
        factor: s.factor,
        equitySignal: s.equitySignal,
        safetySignal: s.safetySignal,
        weight: s.weight,
        weightedEquityEffect: s.equitySignal * s.weight,
        explanation: s.explanation
      }))
    });
    
    // Step 2: Calculate dynamic base allocation
    const { equityBase, safetyBase, riskScore } = this.allocationCalculator.calculateDynamicBase(signals);
    console.log("⚖️ STEP 2 - DYNAMIC BASE ALLOCATION:", {
      equityBase: `${equityBase}%`,
      safetyBase: `${safetyBase}%`,
      riskScore: riskScore,
      totalEquitySignals: signals.reduce((sum, s) => sum + (s.equitySignal * s.weight), 0),
      totalSafetySignals: signals.reduce((sum, s) => sum + (s.safetySignal * s.weight), 0)
    });
    
    // Step 3: Split equity category
    const { stocks, mutualFunds } = this.allocationCalculator.splitEquityCategory(equityBase, answers);
    console.log("📈 STEP 3 - EQUITY SPLIT:", {
      equityBase: `${equityBase}%`,
      stocks: `${stocks}%`,
      mutualFunds: `${mutualFunds}%`,
      splitRatio: `${(stocks/equityBase*100).toFixed(1)}% stocks / ${(mutualFunds/equityBase*100).toFixed(1)}% MF`,
      reasonForSplit: answers.investmentKnowledge
    });
    
    // Step 4: Split safety category
    const { liquid, gold, realEstate, debt } = this.allocationCalculator.splitSafetyCategory(safetyBase, answers);
    console.log("🛡️ STEP 4 - SAFETY SPLIT:", {
      safetyBase: `${safetyBase}%`,
      liquid: `${liquid}%`,
      debt: `${debt}%`,
      gold: `${gold}%`,
      realEstate: `${realEstate}%`,
      splitBreakdown: {
        liquidRatio: `${(liquid/safetyBase*100).toFixed(1)}%`,
        debtRatio: `${(debt/safetyBase*100).toFixed(1)}%`,
        goldRatio: `${(gold/safetyBase*100).toFixed(1)}%`,
        realEstateRatio: `${(realEstate/safetyBase*100).toFixed(1)}%`
      }
    });
    
    // Step 5: Create base allocation
    let allocation: Record<AssetClass, number> = {
      "Stocks": stocks,
      		"Equity MF": mutualFunds,
      		"ETF": 0, // ETFs will be handled as part of Equity MF for now
      "Gold": gold,
      "Real Estate": realEstate,
      "Debt": debt,
      "Liquid": liquid
    };
    console.log("🔧 STEP 5 - BASE ALLOCATION CREATED:", {
      allocation,
      totals: {
        equity: stocks + mutualFunds,
        safety: liquid + debt + gold + realEstate,
        total: Object.values(allocation).reduce((sum, val) => sum + val, 0)
      }
    });
    
    // Step 6: Apply goal adjustments
    const allocationBeforeGoals = { ...allocation };
    allocation = this.allocationCalculator.applyGoalAdjustments(allocation, answers);
    console.log("🎯 STEP 6 - GOAL ADJUSTMENTS:", {
      primaryGoal: answers.primaryGoal,
      before: allocationBeforeGoals,
      after: allocation,
      changes: Object.keys(allocation).map(key => ({
        asset: key,
        before: allocationBeforeGoals[key as AssetClass],
        after: allocation[key as AssetClass],
        change: allocation[key as AssetClass] - allocationBeforeGoals[key as AssetClass]
      })).filter(change => change.change !== 0)
    });
    
    // Step 7: Handle avoided assets
    console.log("🚫 AVOIDED ASSETS DEBUG:", {
      avoidAssets: answers.avoidAssets,
      allocationBefore: allocation,
    });
    allocation = this.allocationCalculator.handleAvoidedAssets(allocation, answers.avoidAssets);
    console.log("🚫 ALLOCATION AFTER AVOIDING:", allocation);
    
    // Step 8: Apply insurance logic
    allocation = this.signalProcessor.applyInsuranceLogic(allocation, answers.hasInsurance);
    console.log("🛡️ STEP 8 - INSURANCE ADJUSTMENTS:", {
      hasInsurance: answers.hasInsurance,
      originalAllocation: allocationBeforeGoals,
      adjustedAllocation: allocation,
      changes: Object.keys(allocation).map(key => ({
        asset: key,
        before: allocationBeforeGoals[key as AssetClass],
        after: allocation[key as AssetClass],
        change: allocation[key as AssetClass] - allocationBeforeGoals[key as AssetClass]
      })).filter(change => change.change !== 0)
    });
    
    // Step 9: Generate rationale
    const behavioralWarnings = validateBehavioralConsistency(answers);
    const rationale = this.rationaleGenerator.generate(allocation, signals, answers, riskScore, behavioralWarnings);
    console.log("💭 STEP 9 - RATIONALE GENERATED:", {
      rationaleLength: rationale.length,
      rationale: rationale
    });
    
    // Step 10: Run stress tests
    const stressTest = this.stressTester.runStressTest(allocation, answers);
    console.log("🧪 STEP 10 - STRESS TESTS:", {
      scenarios: Object.keys(stressTest.scenarios),
      worstCaseScenario: Object.entries(stressTest.scenarios).sort((a, b) => a[1].portfolioImpact - b[1].portfolioImpact)[0],
      bestCaseScenario: Object.entries(stressTest.scenarios).sort((a, b) => b[1].portfolioImpact - a[1].portfolioImpact)[0],
      averageImpact: Object.values(stressTest.scenarios).reduce((sum, s) => sum + s.portfolioImpact, 0) / Object.keys(stressTest.scenarios).length,
      fullResults: stressTest
    });
    
    // Step 11: Determine risk level with consistent mapping
    const riskProfile = getConsistentRiskProfile(riskScore);
    const riskLevel = riskProfile.level;
    
    // Step 12: Behavioral consistency validation
    const consistencyScore = Math.max(0, 100 - (behavioralWarnings.length * 15)); // Deduct 15 points per warning
    
    console.log("🧠 STEP 12 - BEHAVIORAL VALIDATION:", {
      warningsFound: behavioralWarnings.length,
      consistencyScore: consistencyScore,
      criticalIssues: behavioralWarnings.filter(w => w.severity === "critical").length,
      warnings: behavioralWarnings.filter(w => w.severity === "warning").length,
      fullWarnings: behavioralWarnings
    });
    
    console.log("🎯 STEP 11 - FINAL RESULTS:", {
      riskScore: riskScore,
      riskLevel: riskLevel,
      finalAllocation: allocation,
      allocationSummary: {
        		totalEquity: allocation.Stocks + allocation["Equity MF"],
        totalSafety: allocation.Liquid + allocation.Debt + allocation.Gold + allocation["Real Estate"],
        satellite: allocation.Gold + allocation["Real Estate"],
        breakdown: {
          		equity: `${allocation.Stocks + allocation["Equity MF"]}% (${allocation.Stocks}% stocks + ${allocation["Equity MF"]}% Equity MF)`,
          defensive: `${allocation.Liquid + allocation.Debt}% (${allocation.Liquid}% liquid + ${allocation.Debt}% debt)`,
          satellite: `${allocation.Gold + allocation["Real Estate"]}% (${allocation.Gold}% gold + ${allocation["Real Estate"]}% real estate)`
        }
      }
    });
    
    console.log("🏁 === ENGINE CALCULATION COMPLETE === 🏁");
    
    return {
      allocation,
      riskScore,
      riskLevel,
      riskProfile,
      behavioralWarnings,
      consistencyScore,
      signals,
      rationale,
      stressTest
    };
  }
}