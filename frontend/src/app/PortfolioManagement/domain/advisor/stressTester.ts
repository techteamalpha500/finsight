/**
 * Stress Testing Engine
 * Evaluates portfolio resilience under various market scenarios
 */

import { CouncilAnswers, AssetClass, StressTestResult } from './types';
import { stressTestScenarios } from './config';

export class StressTester {
  runStressTest(allocation: Record<AssetClass, number>, answers: CouncilAnswers): StressTestResult {
    const results: Record<string, any> = {};
    const monthlyExpenses = this.estimateMonthlyExpenses(answers);
    const emergencyFundValue = this.getEmergencyFundValue(answers);
    
    // Use historical scenarios instead of generic ones
    Object.entries(stressTestScenarios).forEach(([scenarioName, scenario]) => {
      let portfolioImpact = 0;
      const sectorImpacts: Record<string, number> = {};
      
      // Calculate portfolio impact based on allocation and historical drops
      Object.entries(allocation).forEach(([asset, percentage]) => {
        let assetImpact = 0;
        
        // Get the relevant drop percentage for this asset
        		if (scenario.drop.NIFTY && (asset === "Stocks" || asset === "Equity MF")) {
          assetImpact = parseFloat(scenario.drop.NIFTY.replace('%', ''));
        } else if (scenario.drop["Real Estate"] && asset === "Real Estate") {
          assetImpact = parseFloat(scenario.drop["Real Estate"].replace('%', ''));
        } else if (scenario.drop.Gold && asset === "Gold") {
          assetImpact = parseFloat(scenario.drop.Gold.replace('%', ''));
        } else if (scenario.drop["S&P500"] && asset === "Stocks") {
          assetImpact = parseFloat(scenario.drop["S&P500"].replace('%', ''));
        		} else if (scenario.drop["NASDAQ"] && asset === "Equity MF") {
          assetImpact = parseFloat(scenario.drop["NASDAQ"].replace('%', ''));
        } else {
          // Default impact for assets not specifically mentioned
          assetImpact = asset === "Debt" ? -5 : asset === "Liquid" ? 0 : -15;
        }
        
        const weightedImpact = (percentage / 100) * (assetImpact / 100);
        portfolioImpact += weightedImpact;
        
        // Store sector-specific impacts for demonetization-like events
        if (Math.abs(assetImpact) > 10) {
          sectorImpacts[asset] = assetImpact;
        }
      });
      
      const monthsCovered = monthlyExpenses > 0 ? 
        (emergencyFundValue + (portfolioImpact * answers.investmentAmount)) / monthlyExpenses : 
        emergencyFundValue > 0 ? 12 : 0;
      
      // Get the most relevant historical drop for comparison
      const historicalDrop = scenario.drop["NIFTY"] || scenario.drop["S&P500"] || scenario.drop["NASDAQ"] || "-20%";
      const portfolioDrop = `${(portfolioImpact * 100).toFixed(1)}%`;
      
      let recommendation = "Portfolio shows good resilience";
      if (monthsCovered < 3) {
        recommendation = "Consider increasing emergency fund before investing";
      } else if (portfolioImpact < -0.30) {
        recommendation = "Consider reducing equity exposure for this scenario";
      } else if (portfolioImpact < -0.20) {
        recommendation = "Portfolio within acceptable risk parameters";
      }
      
      results[scenarioName] = {
        portfolioImpact: portfolioImpact * 100, // Convert to percentage
        monthsCovered: Math.max(0, monthsCovered),
        recommendation,
        // Enhanced with historical context
        historicalDrop: historicalDrop,
        evidence: scenario.evidence,
        recovery: scenario.recovery,
        comparison: `Your portfolio: ${portfolioDrop} vs Historical: ${historicalDrop}`,
        sectorImpacts: Object.keys(sectorImpacts).length > 0 ? sectorImpacts : undefined
      };
    });
    
    return { scenarios: results };
  }
  
  private estimateMonthlyExpenses(answers: CouncilAnswers): number {
    // Rough estimation based on income and obligations
    const incomeMapping: Record<string, number> = {
      "<50K": 35000,
      "50K-1L": 75000,
      "1L-2L": 150000,
      "2L-5L": 350000,
      "5L+": 750000
    };
    
    const monthlyIncome = incomeMapping[answers.annualIncome.absolute as keyof typeof incomeMapping] / 12;
    
    // Estimate expenses as 60-80% of income based on dependents
    const expenseRatio = answers.dependents === "0" ? 0.6 : 
                        answers.dependents === "1-2" ? 0.7 : 0.8;
    
    return monthlyIncome * expenseRatio;
  }
  
  private getEmergencyFundValue(answers: CouncilAnswers): number {
    const monthlyExpenses = this.estimateMonthlyExpenses(answers);
    
    const efMapping: Record<string, number> = {
      "0-1": 0.5,
      "2-3": 2.5,
      "4-6": 5,
      "7-12": 9,
      "12+": 15
    };
    
    return monthlyExpenses * efMapping[answers.emergencyFundMonths as keyof typeof efMapping];
  }
}