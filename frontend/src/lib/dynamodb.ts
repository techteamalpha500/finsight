import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// AWS Configuration
const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
};

// Initialize DynamoDB client
let client: DynamoDBClient;
let docClient: DynamoDBDocumentClient;

// Require credentials to initialize
if (process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID && process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY) {
  client = new DynamoDBClient(awsConfig);
  docClient = DynamoDBDocumentClient.from(client);
}

// Types for mutual fund data
export interface MutualFundScheme {
  scheme_code: string;
  fund_name: string;
  scheme_name: string;
  nav: number;
  allocation_class: string;
  is_etf: string;
  date: string;
  amc: string;
  scheme_type: string;
  plan: string;
  option: string;
}

export interface TransformedFund {
  schemeCode: string;
  name: string;
  fullName: string;
  currentNAV: number;
  asset_class: string;
  portfolioRole: string;
  isETF: boolean;
}

// Types for holdings
export interface HoldingData {
  id: string;
  user_id: string;
  instrumentClass: string;
  name: string;
  symbol?: string;
  isin?: string;
  units?: number;
  price?: number;
  investedAmount?: number;
  currentValue?: number;
  asset_class?: string;
  portfolio_role?: string;
  broker?: string;
  created_at: string;
  updated_at: string;
  breakdown?: {
    operation: string;
    holding_name: string;
    broker: string;
    previous_units?: number;
    previous_invested?: number;
    previous_value?: number;
    added_units?: number;
    added_invested?: number;
    added_value?: number;
    new_units?: number;
    new_invested?: number;
    new_value?: number;
    timestamp: string;
  };
}

// API Base URLs for segregated Lambda functions
const EXPENSES_API_BASE = process.env.NEXT_PUBLIC_API_BASE_EXPENSES || "";
const PORTFOLIO_API_BASE = process.env.NEXT_PUBLIC_API_BASE_PORTFOLIO || "";

// Legacy support - if new variables aren't set, fall back to old one
const API_BASE = PORTFOLIO_API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

// Cache for mutual fund data with daily refresh at 6 AM
let mfCache: { data: TransformedFund[]; timestamp: number } | null = null;

// Cache for stock data with daily refresh at 6 AM
let stockCache: { data: StockCompany[]; timestamp: number } | null = null;

// Loading state to prevent multiple simultaneous cache loads
let mfCacheLoading = false;
let stockCacheLoading = false;

function getNextRefreshTime(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0); // 6 AM tomorrow
  return tomorrow.getTime();
}

function shouldRefreshCache(): boolean {
  if (!mfCache) return true;
  
  const now = Date.now();
  const nextRefresh = getNextRefreshTime();
  
  // Refresh if it's past 6 AM or cache is older than 24 hours
  return now >= nextRefresh || (now - mfCache.timestamp) >= 24 * 60 * 60 * 1000;
}

function shouldRefreshStockCache(): boolean {
  if (!stockCache) return true;
  
  const now = Date.now();
  const nextRefresh = getNextRefreshTime();
  
  // Refresh if it's past 6 AM or cache is older than 24 hours
  return now >= nextRefresh || (now - stockCache.timestamp) >= 24 * 60 * 60 * 1000;
}



export async function fetchMutualFundSchemes(): Promise<TransformedFund[]> {
  // Check if cache is valid
  if (mfCache && !shouldRefreshCache()) {
    return mfCache.data;
  }

  // If already loading, wait for it to complete
  if (mfCacheLoading) {
    // Wait for loading to complete
    while (mfCacheLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Return cached data after loading completes
    if (mfCache) {
      return mfCache.data;
    }
  }

  // Start loading
  mfCacheLoading = true;

  // Fetch from API
  if (!API_BASE) {
    mfCacheLoading = false;
    throw new Error('API_BASE not configured');
  }

  try {
    console.log('🔄 MF Cache loading in progress...');
    const res = await fetch(`${API_BASE}/mutual-funds`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    const funds = (data.items || []) as TransformedFund[];
    
    // Update cache
    mfCache = { data: funds, timestamp: Date.now() };
    console.log('✅ MF Cache load completed');
    return funds;
  } catch (error) {
    throw error;
  } finally {
    mfCacheLoading = false;
  }
}

// Preload function to be called on server start
export async function preloadMutualFundData(): Promise<void> {
  try {
    await fetchMutualFundSchemes();
  } catch (error) {
    // Silent fail on preload
  }
}

// Preload function for stock data to be called on server start
export async function preloadStockData(): Promise<void> {
  try {
    await fetchStockCompanies();
  } catch (error) {
    // Silent fail on preload
  }
}

// Function to clear cache (for testing)
export function clearMFCache(): void {
  mfCache = null;
  mfCacheLoading = false;
}

// Function to clear stock cache (for testing)
export function clearStockCache(): void {
  stockCache = null;
  stockCacheLoading = false;
}

// Function to fetch funds by ETF status (deprecated - use role-based filtering instead)
export async function fetchFundsByETFStatus(isETF: boolean): Promise<TransformedFund[]> {
  const allFunds = await fetchMutualFundSchemes();
  return allFunds.filter(fund => fund.isETF === isETF);
}

export async function searchFundsByName(searchTerm: string): Promise<TransformedFund[]> {
  // Use cached data for search to avoid API calls
  const allFunds = await fetchMutualFundSchemes();
  
  let filteredFunds = allFunds;
  
  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredFunds = filteredFunds.filter(fund => 
      fund.name.toLowerCase().includes(term) || 
      fund.fullName.toLowerCase().includes(term)
    );
  }
  
  // Return limited results
  return filteredFunds.slice(0, 10);
}

export async function saveHolding(holding: HoldingData): Promise<any> {
  if (!API_BASE) {
    throw new Error('API_BASE not configured');
  }

  try {
    const body = { portfolioId: holding.user_id, holding };
    const res = await fetch(`${API_BASE}/holdings`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Save holding failed: ${res.status} - ${errorText}`);
    }
    
    const responseData = await res.json();
    return responseData;
  } catch (error) {
    throw error;
  }
}



export async function fetchUserHoldings(userId: string): Promise<HoldingData[]> {
  if (!API_BASE) {
    throw new Error('API_BASE not configured');
  }

  try {
    const res = await fetch(`${API_BASE}/holdings?portfolioId=${encodeURIComponent(userId)}`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return (data.items || []) as HoldingData[];
  } catch (error) {
    throw error;
  }
}

export async function deleteHolding(holdingId: string, portfolioId: string): Promise<boolean> {
  if (!API_BASE) {
    throw new Error('API_BASE not configured');
  }

  try {
    const res = await fetch(`${API_BASE}/holdings/${holdingId}`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolioId })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Delete holding failed: ${res.status} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

// ==================== EXPENSES API FUNCTIONS ====================

// Types for expense data
export interface ExpenseData {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  category: string;
  priority: number;
  createdAt: string;
}

export interface BudgetData {
  id: string;
  category: string;
  amount: number;
  period: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch expenses from expenses API
export async function fetchExpenses(userId: string, startDate?: string, endDate?: string, category?: string): Promise<ExpenseData[]> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    let url = `${EXPENSES_API_BASE}/expenses`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    if (category) params.append('category', category);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(url, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return (data.items || []) as ExpenseData[];
  } catch (error) {
    throw error;
  }
}

// Create new expense
export async function createExpense(expense: Omit<ExpenseData, 'id' | 'createdAt'>): Promise<string> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/expenses`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(expense) 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Create expense failed: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    return data.expenseId;
  } catch (error) {
    throw error;
  }
}

// Fetch expense categories
export async function fetchExpenseCategories(): Promise<string[]> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/categories`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.categories || [];
  } catch (error) {
    throw error;
  }
}

// Fetch expense summary
export async function fetchExpenseSummary(userId: string, startDate?: string, endDate?: string): Promise<{ summary: Array<{ category: string; total: number }>; total: number }> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    let url = `${EXPENSES_API_BASE}/expenses/summary`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(url, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    throw error;
  }
}

// Fetch category rules
export async function fetchCategoryRules(): Promise<CategoryRule[]> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/category-rules`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return (data.items || []) as CategoryRule[];
  } catch (error) {
    throw error;
  }
}

// Create category rule
export async function createCategoryRule(rule: Omit<CategoryRule, 'id' | 'createdAt'>): Promise<string> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/category-rules`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(rule) 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Create category rule failed: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    return data.ruleId;
  } catch (error) {
    throw error;
  }
}

// Delete category rule
export async function deleteCategoryRule(ruleId: string): Promise<boolean> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/category-rules/${ruleId}`, { 
      method: 'DELETE' 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Delete category rule failed: ${res.status} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

// Fetch budgets
export async function fetchBudgets(): Promise<BudgetData[]> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/budgets`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return (data.items || []) as BudgetData[];
  } catch (error) {
    throw error;
  }
}

// Create or update budget
export async function saveBudget(budget: Omit<BudgetData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/budgets/${budget.category}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(budget) 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Save budget failed: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    return data.budgetId || budget.category;
  } catch (error) {
    throw error;
  }
}

// Delete budget
export async function deleteBudget(category: string): Promise<boolean> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/budgets/${category}`, { 
      method: 'DELETE' 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Delete budget failed: ${res.status} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

// Stock Companies API functions
export interface StockCompany {
  symbol: string;
  companyName: string;
  listingDate?: string;
  isinNumber: string;
  exchange: string;
}

// Fetch all stock companies with caching
export async function fetchStockCompanies(): Promise<StockCompany[]> {
  // Check if cache is valid
  if (stockCache && !shouldRefreshStockCache()) {
    return stockCache.data;
  }

  // If already loading, wait for it to complete
  if (stockCacheLoading) {
    // Wait for loading to complete
    while (stockCacheLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Return cached data after loading completes
    if (stockCache) {
      return stockCache.data;
    }
  }

  // Start loading
  stockCacheLoading = true;

  // Fetch from API
  if (!PORTFOLIO_API_BASE) {
    stockCacheLoading = false;
    throw new Error('PORTFOLIO_API_BASE not configured');
  }

  try {
    console.log('🔄 Stock cache loading in progress...');
    const res = await fetch(`${PORTFOLIO_API_BASE}/stocks`);
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API returned ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    const stocks = (data.items || []) as StockCompany[];
    
    // Update cache
    stockCache = { data: stocks, timestamp: Date.now() };
    console.log('✅ Stock cache load completed');
    return stocks;
  } catch (error) {
    throw error;
  } finally {
    stockCacheLoading = false;
  }
}

// Search stock companies using cached data
export async function searchStockCompanies(query: string, exchange?: string): Promise<StockCompany[]> {
  // Use cached data for search to avoid API calls
  const allStocks = await fetchStockCompanies();
  
  let filteredStocks = allStocks;
  
  // Filter by search term
  if (query.trim()) {
    const term = query.toLowerCase();
    filteredStocks = filteredStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(term) || 
      stock.companyName.toLowerCase().includes(term)
    );
  }
  
  // Filter by exchange if specified
  if (exchange) {
    filteredStocks = filteredStocks.filter(stock => 
      stock.exchange.toLowerCase() === exchange.toLowerCase()
    );
  }
  
  // Return limited results
  return filteredStocks.slice(0, 10);
}

// API Configuration
// TODO: Update these URLs with actual API Gateway endpoints after deployment
const PORTFOLIO_API_URL = process.env.NEXT_PUBLIC_PORTFOLIO_API_URL || 'https://your-portfolio-api-gateway-url';
const IMPORT_STOCKS_API_URL = process.env.NEXT_PUBLIC_IMPORT_STOCKS_API_URL || 'https://your-import-stocks-api-gateway-url';

// CAS Import API function - Parse file
export async function parseCASFile(file: File, password: string, broker: string): Promise<any> {
  if (!IMPORT_STOCKS_API_URL) {
    throw new Error('Import Stocks API URL not configured');
  }

  // Convert file to base64
  const fileContent = await fileToBase64(file);
  
  // Get file extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  const response = await fetch(`${IMPORT_STOCKS_API_URL}/parse-cas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      broker: broker.charAt(0).toUpperCase() + broker.slice(1),
      file_content: fileContent,
      password,
      file_extension: fileExtension
    })
  });

  console.log('API Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error response:', errorText);
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    } catch (parseError) {
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }
  }

  const result = await response.json();
  console.log('CAS parsing successful:', result);
  return result.data; // Return the parsed CAS data
}

// CAS Import API function - Import parsed data to holdings
export async function importCASData(casData: any): Promise<any> {
  if (!PORTFOLIO_API_URL) {
    throw new Error('Portfolio API URL not configured');
  }

  console.log('🔍 importCASData called with:', casData);
  console.log('🔍 PORTFOLIO_API_URL:', PORTFOLIO_API_URL);

  console.log('🚀 Calling import API with data:', JSON.stringify(casData, null, 2));
  const response = await fetch(`${PORTFOLIO_API_URL}/holdings/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(casData)
  });

  console.log('Import API Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Import API Error response:', errorText);
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    } catch (parseError) {
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }
  }

  const result = await response.json();
  console.log('CAS import successful:', result);
  return result;
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (data:application/pdf;base64,)
      const base64Content = base64.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = error => reject(error);
  });
}
