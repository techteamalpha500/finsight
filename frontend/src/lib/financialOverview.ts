// Financial Overview service for integrating Holdings, Net Worth, and Repayments
import { type Asset, type Liability, type NetWorthData, calculateFinancialHealth } from './networth';
import { type HoldingData } from './dynamodb';
import { fetchRepayments, type Repayment } from './repayments';

export interface FinancialOverview {
  // Net Worth Data
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  financialHealth: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    debtToAssetRatio: number;
    liquidityRatio: number;
    monthlyCashFlow: number;
    healthScore: number;
    healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  };
  
  // Holdings Data
  holdings: {
    totalValue: number;
    totalInvested: number;
    totalPL: number;
    totalPLPct: number;
    count: number;
  };
  
  // Repayments Data
  repayments: {
    totalOutstanding: number;
    totalMonthlyEMI: number;
    totalInterestAccrued: number;
    avgInterestRate: number;
    count: number;
  };
  
  // Integrated Insights
  insights: {
    monthlyCashFlow: number;
    debtToIncomeRatio: number;
    investmentToDebtRatio: number;
    emergencyFundMonths: number;
    recommendations: string[];
  };
}

// Calculate comprehensive financial overview
export async function calculateFinancialOverview(): Promise<FinancialOverview> {
  try {
    // Fetch all financial data
    const [netWorthData, repaymentsData] = await Promise.all([
      fetchNetWorthData(),
      fetchRepayments()
    ]);

    // Calculate holdings data (this would come from holdings API in real implementation)
    const holdingsData = {
      totalValue: 0,
      totalInvested: 0,
      totalPL: 0,
      totalPLPct: 0,
      count: 0
    };

    // Calculate repayments data
    const repayments = repaymentsData.repayments || [];
    const repaymentsData_calc = {
      totalOutstanding: repayments.reduce((sum, r) => sum + (r.outstanding_balance || 0), 0),
      totalMonthlyEMI: repayments.reduce((sum, r) => sum + (r.emi_amount || 0), 0),
      totalInterestAccrued: repayments.reduce((sum, r) => sum + (r.interest_rate || 0) * (r.outstanding_balance || 0) / 12, 0),
      avgInterestRate: repayments.length > 0 ? repayments.reduce((sum, r) => sum + (r.interest_rate || 0), 0) / repayments.length : 0,
      count: repayments.length
    };

    // Calculate financial health
    const financialHealth = calculateFinancialHealth(netWorthData.assets, netWorthData.liabilities);

    // Calculate integrated insights
    const monthlyCashFlow = financialHealth.monthlyCashFlow;
    const debtToIncomeRatio = financialHealth.totalAssets > 0 ? (repaymentsData_calc.totalOutstanding / financialHealth.totalAssets) * 100 : 0;
    const investmentToDebtRatio = repaymentsData_calc.totalOutstanding > 0 ? (holdingsData.totalValue / repaymentsData_calc.totalOutstanding) * 100 : 0;
    const emergencyFundMonths = repaymentsData_calc.totalMonthlyEMI > 0 ? 
      (netWorthData.assets.filter(a => a.category === 'cash-savings').reduce((sum, a) => sum + a.value, 0) / repaymentsData_calc.totalMonthlyEMI) : 0;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (financialHealth.debtToAssetRatio > 40) {
      recommendations.push("Consider reducing debt to improve your debt-to-asset ratio");
    }
    
    if (emergencyFundMonths < 3) {
      recommendations.push("Build an emergency fund with at least 3 months of expenses");
    }
    
    if (repaymentsData_calc.avgInterestRate > 15) {
      recommendations.push("Focus on paying off high-interest debt first");
    }
    
    if (investmentToDebtRatio < 50) {
      recommendations.push("Consider increasing your investment allocation relative to debt");
    }
    
    if (monthlyCashFlow < 0) {
      recommendations.push("Your monthly expenses exceed income - review your budget");
    }

    return {
      netWorth: financialHealth.netWorth,
      totalAssets: financialHealth.totalAssets,
      totalLiabilities: financialHealth.totalLiabilities,
      financialHealth,
      holdings: holdingsData,
      repayments: repaymentsData_calc,
      insights: {
        monthlyCashFlow,
        debtToIncomeRatio,
        investmentToDebtRatio,
        emergencyFundMonths,
        recommendations
      }
    };
  } catch (error) {
    console.error('Error calculating financial overview:', error);
    throw error;
  }
}

// Helper function to format currency
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Helper function to get health status color
export function getHealthStatusColor(status: string): string {
  switch (status) {
    case 'Excellent': return 'text-green-600 dark:text-green-400';
    case 'Good': return 'text-blue-600 dark:text-blue-400';
    case 'Fair': return 'text-yellow-600 dark:text-yellow-400';
    case 'Poor': return 'text-red-600 dark:text-red-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
}

// Helper function to get health status background color
export function getHealthStatusBgColor(status: string): string {
  switch (status) {
    case 'Excellent': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
    case 'Good': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    case 'Fair': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
    case 'Poor': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
    default: return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
  }
}