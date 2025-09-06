// Repayments API integration functions

export interface Repayment {
  repayment_id: string;
  type: string;
  institution: string;
  principal: number;
  interest_rate: number;
  emi_amount: number;
  tenure_months: number;
  outstanding_balance: number;
  start_date: string;
  due_date: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface RepaymentSummary {
  total_outstanding: number;
  total_emi: number;
  total_repayments: number;
  repayments: Repayment[];
}

export interface RepaymentFormData {
  type: string;
  institution: string;
  principal: number;
  interest_rate: number;
  emi_amount: number;
  tenure_months: number;
  start_date: string;
  due_date: string;
}

export interface PrepaymentData {
  amount: number;
  type: 'lump_sum' | 'extra_emi';
  extra_emi_months?: number;
  principal_component?: number;
  interest_component?: number;
  payment_date?: string;
}

// Use the existing portfolio API endpoint
const API_BASE = '/api/portfolio';

// Helper function to make API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 404) {
        throw new Error('API endpoint not found. Please ensure the repayments API is deployed.');
      } else if (response.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
    }
    
    return response.json();
  } catch (error) {
    console.error('API call error:', error);
    // Re-throw with more user-friendly message
    if (error instanceof Error) {
      throw new Error(`Unable to connect to repayments service: ${error.message}`);
    }
    throw new Error('Network error. Please check your connection and try again.');
  }
}

// Get all repayments for a user
export async function fetchRepayments(): Promise<RepaymentSummary> {
  try {
    return await apiCall('/repayments');
  } catch (error) {
    console.error('Error fetching repayments:', error);
    throw error;
  }
}

// Get a specific repayment
export async function fetchRepayment(repaymentId: string): Promise<Repayment> {
  try {
    return await apiCall(`/repayments/${repaymentId}`);
  } catch (error) {
    console.error('Error fetching repayment:', error);
    throw error;
  }
}

// Create a new repayment
export async function createRepayment(data: RepaymentFormData): Promise<{ repayment_id: string; message: string }> {
  try {
    return await apiCall('/repayments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Error creating repayment:', error);
    throw error;
  }
}

// Update a repayment
export async function updateRepayment(repaymentId: string, data: Partial<RepaymentFormData>): Promise<{ message: string }> {
  try {
    return await apiCall(`/repayments/${repaymentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Error updating repayment:', error);
    throw error;
  }
}

// Delete a repayment
export async function deleteRepayment(repaymentId: string): Promise<{ message: string }> {
  try {
    return await apiCall(`/repayments/${repaymentId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting repayment:', error);
    throw error;
  }
}

// Add a prepayment
export async function addPrepayment(repaymentId: string, data: PrepaymentData): Promise<{ message: string }> {
  try {
    return await apiCall(`/repayments/${repaymentId}/prepayment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Error adding prepayment:', error);
    throw error;
  }
}

// Get repayment history
export async function fetchRepaymentHistory(repaymentId: string): Promise<any[]> {
  try {
    return await apiCall(`/repayments/${repaymentId}/history`);
  } catch (error) {
    console.error('Error fetching repayment history:', error);
    throw error;
  }
}

// Utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPercentage(rate: number): string {
  return `${rate}%`;
}

export function calculateProgressPercentage(repayment: Repayment): number {
  const paid = repayment.principal - repayment.outstanding_balance;
  return (paid / repayment.principal) * 100;
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function calculateEMI(principal: number, rate: number, tenure: number): number {
  const monthlyRate = rate / 100 / 12;
  
  if (monthlyRate === 0) {
    return principal / tenure;
  }
  
  return principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) / 
         (Math.pow(1 + monthlyRate, tenure) - 1);
}

// Repayment type configurations
export const REPAYMENT_TYPES = [
  { 
    value: 'home_loan', 
    label: 'Home Loan', 
    description: 'Mortgage and home financing'
  },
  { 
    value: 'car_loan', 
    label: 'Car Loan', 
    description: 'Vehicle financing'
  },
  { 
    value: 'personal_loan', 
    label: 'Personal Loan', 
    description: 'Personal and unsecured loans'
  },
  { 
    value: 'credit_card', 
    label: 'Credit Card', 
    description: 'Credit card outstanding'
  },
  { 
    value: 'bnpl', 
    label: 'BNPL', 
    description: 'Buy Now Pay Later'
  }
];

export const INSTITUTIONS = [
  'HDFC Bank', 'ICICI Bank', 'SBI Bank', 'Axis Bank', 'Kotak Bank',
  'SBI Card', 'HDFC Card', 'ICICI Card', 'Axis Card', 'Kotak Card',
  'Bajaj Finance', 'Tata Capital', 'L&T Finance', 'Mahindra Finance',
  'Paytm', 'PhonePe', 'Amazon Pay', 'Flipkart Pay', 'Other'
];