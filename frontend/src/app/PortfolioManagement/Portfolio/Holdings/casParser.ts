// CAS (Consolidated Account Statement) Parser
// This utility handles parsing of CAS files from NSDL/CDSL

export interface CASStockData {
  name: string;
  symbol: string;
  units: number;
  price: number;
  currentValue: number;
  investedAmount: number;
  isin?: string;
  folioNumber?: string;
}

export interface CASData {
  broker: string;
  dpId?: string;
  clientId?: string;
  statementDate?: string;
  stocks: CASStockData[];
}

// Mock CAS data for demonstration
// In a real implementation, this would parse actual PDF content
export const mockCASData: CASData = {
  broker: "Zerodha",
  dpId: "12081600",
  clientId: "12345678",
  statementDate: "2024-01-15",
  stocks: [
    {
      name: "Reliance Industries Ltd",
      symbol: "RELIANCE",
      isin: "INE002A01018",
      units: 10,
      price: 2500.00,
      currentValue: 25000.00,
      investedAmount: 24000.00,
      folioNumber: "FOL001"
    },
    {
      name: "TCS Ltd",
      symbol: "TCS",
      isin: "INE467B01029",
      units: 5,
      price: 3500.00,
      currentValue: 17500.00,
      investedAmount: 17000.00,
      folioNumber: "FOL002"
    },
    {
      name: "HDFC Bank Ltd",
      symbol: "HDFCBANK",
      isin: "INE040A01034",
      units: 20,
      price: 1500.00,
      currentValue: 30000.00,
      investedAmount: 29000.00,
      folioNumber: "FOL003"
    },
    {
      name: "Infosys Ltd",
      symbol: "INFY",
      isin: "INE009A01021",
      units: 15,
      price: 1800.00,
      currentValue: 27000.00,
      investedAmount: 26000.00,
      folioNumber: "FOL004"
    },
    {
      name: "ITC Ltd",
      symbol: "ITC",
      isin: "INE154A01025",
      units: 25,
      price: 400.00,
      currentValue: 10000.00,
      investedAmount: 9500.00,
      folioNumber: "FOL005"
    }
  ]
};

// Simulate CAS file parsing
export async function parseCASFile(file: File, password: string, broker: string): Promise<CASData> {
  return new Promise((resolve, reject) => {
    // Simulate file processing delay
    setTimeout(() => {
      try {
        // In a real implementation, you would:
        // 1. Use a PDF parsing library like pdf-parse or pdf2pic
        // 2. Extract text from the PDF using the password
        // 3. Parse the CAS format to extract stock data
        // 4. Handle different CAS formats from different brokers
        
        // For now, we'll return mock data with some randomization
        const mockData = { ...mockCASData };
        mockData.broker = broker;
        
        // Add some randomization to make it feel more realistic
        mockData.stocks = mockData.stocks.map(stock => ({
          ...stock,
          units: stock.units + Math.floor(Math.random() * 5),
          price: stock.price + (Math.random() - 0.5) * 100,
          currentValue: 0, // Will be calculated
          investedAmount: stock.investedAmount + (Math.random() - 0.5) * 1000
        }));
        
        // Recalculate current value
        mockData.stocks = mockData.stocks.map(stock => ({
          ...stock,
          currentValue: stock.units * stock.price
        }));
        
        resolve(mockData);
      } catch (error) {
        reject(new Error("Failed to parse CAS file. Please check the file format and password."));
      }
    }, 2000 + Math.random() * 1000); // Random delay between 2-3 seconds
  });
}

// Helper function to validate CAS file format
export function validateCASFile(file: File): boolean {
  // Check if it's a PDF file
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
    return false;
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }
  
  return true;
}

// Helper function to extract broker name from filename (if possible)
export function extractBrokerFromFilename(filename: string): string {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes('zerodha')) return 'Zerodha';
  if (lowerFilename.includes('groww')) return 'Groww';
  if (lowerFilename.includes('upstox')) return 'Upstox';
  if (lowerFilename.includes('angel')) return 'Angel';
  
  return 'Other';
}

// Helper function to format CAS data for display
export function formatCASDataForDisplay(casData: CASData) {
  return {
    broker: casData.broker,
    totalStocks: casData.stocks.length,
    totalValue: casData.stocks.reduce((sum, stock) => sum + stock.currentValue, 0),
    totalInvested: casData.stocks.reduce((sum, stock) => sum + stock.investedAmount, 0),
    statementDate: casData.statementDate
  };
}