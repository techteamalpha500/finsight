/**
 * Language Transformation Utilities
 * Converts technical advisor language into simple investor-friendly explanations
 */

export type DisplayMode = 'investor' | 'advisor';

export interface LanguageTransformations {
  [key: string]: {
    investor: string;
    advisor: string;
  };
}

// Core transformation mappings
const CORE_TRANSFORMATIONS: LanguageTransformations = {
  // Risk Profile Language
  "volatility tolerance": {
    investor: "how much your investments move up and down",
    advisor: "volatility tolerance"
  },
  "risk score": {
    investor: "your comfort level with investment swings",
    advisor: "risk score"
  },
  "risk level": {
    investor: "your investment style",
    advisor: "risk level"
  },
  
  // Allocation Language
  "allocation ranges": {
    investor: "how much your investments can vary",
    advisor: "allocation ranges"
  },
  "rebalancing thresholds": {
    investor: "when to adjust your investments",
    advisor: "rebalancing thresholds"
  },
  "drift tolerance": {
    investor: "how much your portfolio can move from target",
    advisor: "drift tolerance"
  },
  
  // Performance Language
  "drawdowns": {
    investor: "how much your portfolio drops during bad times",
    advisor: "drawdowns"
  },
  "peak-to-trough": {
    investor: "from highest to lowest point",
    advisor: "peak-to-trough"
  },
  "Sharpe ratio": {
    investor: "how good your returns are compared to risk",
    advisor: "Sharpe ratio"
  },
  "Beta": {
    investor: "how sensitive you are to market movements",
    advisor: "Beta"
  },
  
  // Stress Test Language
  "portfolio impact": {
    investor: "how much your portfolio could drop",
    advisor: "portfolio impact"
  },
  "months covered": {
    investor: "how long your emergency fund would last",
    advisor: "months covered"
  },
  "scenario analysis": {
    investor: "what happens in different market conditions",
    advisor: "scenario analysis"
  }
};

// Risk level transformations
export const transformRiskLevel = (riskLevel: string, displayMode: DisplayMode): string => {
  if (displayMode === 'advisor') return riskLevel;
  
  const riskLevelMap: Record<string, string> = {
    "Conservative": "You prefer stable, low-risk investments",
    "Moderate": "You're comfortable with some ups and downs for growth",
    "Aggressive": "You're comfortable with significant swings for higher growth potential"
  };
  
  return riskLevelMap[riskLevel] || riskLevel;
};

// Risk score transformations
export const transformRiskScore = (score: number, displayMode: DisplayMode): string => {
  if (displayMode === 'advisor') return `Risk Score: ${score}`;
  
  if (score <= 39) return "You prefer safety and stability";
  if (score <= 69) return "You're comfortable with moderate risk for growth";
  return "You're comfortable with higher risk for maximum growth potential";
};

// Allocation range transformations
export const transformAllocationRange = (min: number, max: number, displayMode: DisplayMode): string => {
  if (displayMode === 'advisor') return `${min}% - ${max}%`;
  
  return `Your target is ${Math.round((min + max) / 2)}% and can vary between ${min}% and ${max}%`;
};

// Stress test transformations
export const transformStressTestResult = (scenario: any, displayMode: DisplayMode): string => {
  if (displayMode === 'advisor') {
    return `${scenario.portfolioImpact.toFixed(1)}% impact, ${scenario.monthsCovered.toFixed(1)} months covered`;
  }
  
  const impact = Math.abs(scenario.portfolioImpact);
  const months = scenario.monthsCovered;
  
  if (impact < 10) {
    return `In this scenario, your portfolio would drop ${impact.toFixed(1)}% and your emergency fund would last ${months.toFixed(1)} months`;
  } else if (impact < 25) {
    return `During this market stress, your portfolio could drop ${impact.toFixed(1)}% and your emergency fund would last ${months.toFixed(1)} months`;
  } else {
    return `In severe market conditions, your portfolio could drop ${impact.toFixed(1)}% and your emergency fund would last ${months.toFixed(1)} months`;
  }
};

// Generic text transformation
export const transformText = (text: string, displayMode: DisplayMode): string => {
  if (displayMode === 'advisor') return text;
  
  let transformedText = text;
  
  // Apply core transformations
  Object.entries(CORE_TRANSFORMATIONS).forEach(([key, value]) => {
    const regex = new RegExp(key, 'gi');
    transformedText = transformedText.replace(regex, value.investor);
  });
  
  // Additional transformations
  transformedText = transformedText
    .replace(/±(\d+)%/g, 'can vary by $1%')
    .replace(/(\d+)% allocation/g, '$1% of your money')
    .replace(/rebalancing/g, 'adjusting your investments')
    .replace(/allocation/g, 'investment mix')
    .replace(/portfolio/g, 'your investments')
    .replace(/equity/g, 'stocks')
    .replace(/defensive/g, 'safe investments')
    .replace(/satellite/g, 'specialized investments');
  
  return transformedText;
};

// Context-aware transformations for specific components
export const transformComponentText = (
  component: string, 
  data: any, 
  displayMode: DisplayMode
): string => {
  if (displayMode === 'advisor') return data;
  
  switch (component) {
    case 'riskProfile':
      return transformRiskProfile(data, displayMode);
    case 'allocationRanges':
      return transformAllocationRanges(data, displayMode);
    case 'stressTest':
      return transformStressTest(data, displayMode);
    default:
      return transformText(data, displayMode);
  }
};

// Component-specific transformations
const transformRiskProfile = (data: any, displayMode: DisplayMode): string => {
  if (displayMode === 'advisor') return data;
  
  return `You have a ${data.level.toLowerCase()} investment style. ${data.description}. ${data.context}`;
};

const transformAllocationRanges = (data: any, displayMode: DisplayMode): string => {
  if (displayMode === 'advisor') return data;
  
  return `Your target allocation is ${data.target}% and can vary between ${data.min}% and ${data.max}%`;
};

const transformStressTest = (data: any, displayMode: DisplayMode): string => {
  if (displayMode === 'advisor') return data;
  
  return `Based on historical events like ${data.evidence}, your portfolio could drop ${data.historicalDrop} and recover in ${data.recovery}`;
};
