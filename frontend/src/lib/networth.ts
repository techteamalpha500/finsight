// Net Worth API service
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com/prod';

export interface Asset {
  id: string;
  name: string;
  category: string;
  type: string;
  value: number;
  monthlyIncome?: number;
  interestRate?: number;
  purchaseDate?: string;
  maturityDate?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Liability {
  id: string;
  name: string;
  category: string;
  type: 'EMI' | 'Regular';
  principalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  startDate: string;
  endDate?: string;
  remainingMonths?: number;
  totalMonths?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NetWorthData {
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  assets: Asset[];
  liabilities: Liability[];
}

export interface FinancialHealth {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  debtToAssetRatio: number;
  liquidityRatio: number;
  monthlyCashFlow: number;
  healthScore: number;
  healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

// Fetch all net worth data
export async function fetchNetWorthData(): Promise<NetWorthData> {
  try {
    const response = await fetch(`${API_BASE_URL}/networth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch net worth data: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching net worth data:', error);
    // Return empty data structure on error
    return {
      net_worth: 0,
      total_assets: 0,
      total_liabilities: 0,
      assets: [],
      liabilities: []
    };
  }
}

// Create a new asset
export async function createAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<{ asset_id: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/networth/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(asset),
    });

    if (!response.ok) {
      throw new Error(`Failed to create asset: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating asset:', error);
    throw error;
  }
}

// Create a new liability
export async function createLiability(liability: Omit<Liability, 'id' | 'created_at' | 'updated_at'>): Promise<{ liability_id: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/networth/liabilities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(liability),
    });

    if (!response.ok) {
      throw new Error(`Failed to create liability: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating liability:', error);
    throw error;
  }
}

// Update an asset
export async function updateAsset(assetId: string, asset: Partial<Asset>): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/networth/assets/${assetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(asset),
    });

    if (!response.ok) {
      throw new Error(`Failed to update asset: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating asset:', error);
    throw error;
  }
}

// Update a liability
export async function updateLiability(liabilityId: string, liability: Partial<Liability>): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/networth/liabilities/${liabilityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(liability),
    });

    if (!response.ok) {
      throw new Error(`Failed to update liability: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating liability:', error);
    throw error;
  }
}

// Delete an asset
export async function deleteAsset(assetId: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/networth/assets/${assetId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete asset: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
}

// Delete a liability
export async function deleteLiability(liabilityId: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/networth/liabilities/${liabilityId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete liability: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting liability:', error);
    throw error;
  }
}

// Calculate financial health metrics
export function calculateFinancialHealth(assets: Asset[], liabilities: Liability[]): FinancialHealth {
  const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.remainingAmount, 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  
  // Calculate monthly cash flow
  const monthlyIncome = assets.reduce((sum, asset) => sum + (asset.monthlyIncome || 0), 0);
  const monthlyPayments = liabilities.reduce((sum, liability) => sum + liability.monthlyPayment, 0);
  const monthlyCashFlow = monthlyIncome - monthlyPayments;
  
  // Calculate liquidity ratio (cash & equivalents / monthly expenses)
  const cashAssets = assets
    .filter(asset => asset.category === 'cash-savings')
    .reduce((sum, asset) => sum + asset.value, 0);
  const liquidityRatio = monthlyPayments > 0 ? cashAssets / monthlyPayments : 0;
  
  // Calculate health score (0-100)
  let healthScore = 100;
  healthScore -= Math.min(debtToAssetRatio * 2, 50); // Debt ratio penalty
  healthScore -= Math.max(0, (6 - liquidityRatio) * 10); // Liquidity penalty
  if (monthlyCashFlow < 0) healthScore -= 20; // Negative cash flow penalty
  
  let healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Excellent';
  if (healthScore < 60) healthStatus = 'Poor';
  else if (healthScore < 75) healthStatus = 'Fair';
  else if (healthScore < 90) healthStatus = 'Good';
  
  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    debtToAssetRatio,
    liquidityRatio,
    monthlyCashFlow,
    healthScore: Math.max(0, Math.min(100, healthScore)),
    healthStatus
  };
}