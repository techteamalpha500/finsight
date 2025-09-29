"use client";
import React, { useState, useEffect } from "react";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Progress } from "@/app/components/Progress";
import { Badge } from "@/app/components/Badge";
import AssetForm from "./components/AssetForm";
import LiabilityForm from "./components/LiabilityForm";
import FinancialInsights from "./components/FinancialInsights";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Home, 
  Car, 
  PiggyBank, 
  Building2,
  Smartphone,
  Laptop,
  Watch,
  Gem,
  Briefcase,
  Landmark,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  PieChart,
  Calculator,
  Lightbulb,
  Shield,
  Zap,
  Edit,
  Trash2
} from "lucide-react";

// Types
interface Asset {
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
}

interface Liability {
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
}

interface FinancialHealth {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  debtToAssetRatio: number;
  liquidityRatio: number;
  monthlyCashFlow: number;
  healthScore: number;
  healthStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

// Sample Data
const sampleAssets: Asset[] = [
  {
    id: '1',
    name: 'Primary Residence',
    category: 'real-estate',
    type: 'primary-residence',
    value: 2500000,
    purchaseDate: '2020-01-15',
    description: '3BHK apartment in downtown'
  },
  {
    id: '2',
    name: 'Savings Account',
    category: 'cash-savings',
    type: 'savings-account',
    value: 150000,
    interestRate: 3.5,
    description: 'HDFC Savings Account'
  },
  {
    id: '3',
    name: 'Certificate of Deposit',
    category: 'cash-savings',
    type: 'certificate-deposit',
    value: 500000,
    interestRate: 6.8,
    maturityDate: '2025-12-31',
    description: 'SBI CD for 3 years'
  },
  {
    id: '4',
    name: 'Mutual Fund Portfolio',
    category: 'investments',
    type: 'mutual-funds',
    value: 750000,
    monthlyIncome: 2500,
    description: 'Diversified equity and debt funds'
  },
  {
    id: '5',
    name: 'Stocks Portfolio',
    category: 'investments',
    type: 'stocks',
    value: 300000,
    description: 'Blue chip stocks'
  },
  {
    id: '6',
    name: 'Car',
    category: 'vehicles',
    type: 'car',
    value: 800000,
    purchaseDate: '2022-06-01',
    description: 'Honda City VX'
  },
  {
    id: '7',
    name: 'Gold Jewelry',
    category: 'personal-assets',
    type: 'jewelry',
    value: 200000,
    description: 'Family gold collection'
  },
  {
    id: '8',
    name: '401(k) Account',
    category: 'retirement-funds',
    type: '401k',
    value: 1200000,
    description: 'Company 401(k) with employer match'
  }
];

const sampleLiabilities: Liability[] = [
  {
    id: '1',
    name: 'Home Mortgage',
    category: 'mortgage',
    type: 'EMI',
    principalAmount: 2000000,
    remainingAmount: 1200000,
    monthlyPayment: 25000,
    interestRate: 8.5,
    startDate: '2020-01-15',
    endDate: '2030-01-15',
    remainingMonths: 60,
    totalMonths: 120,
    description: 'SBI Home Mortgage'
  },
  {
    id: '2',
    name: 'Car Loan',
    category: 'auto-loans',
    type: 'EMI',
    principalAmount: 600000,
    remainingAmount: 200000,
    monthlyPayment: 15000,
    interestRate: 9.2,
    startDate: '2022-06-01',
    endDate: '2027-06-01',
    remainingMonths: 20,
    totalMonths: 60,
    description: 'HDFC Car Loan'
  },
  {
    id: '3',
    name: 'Credit Card Debt',
    category: 'credit-cards',
    type: 'Regular',
    principalAmount: 50000,
    remainingAmount: 50000,
    monthlyPayment: 5000,
    interestRate: 18.5,
    startDate: '2024-01-01',
    description: 'HDFC Credit Card'
  },
  {
    id: '4',
    name: 'Personal Loan',
    category: 'personal-loans',
    type: 'EMI',
    principalAmount: 200000,
    remainingAmount: 80000,
    monthlyPayment: 8000,
    interestRate: 12.0,
    startDate: '2023-03-01',
    endDate: '2025-03-01',
    remainingMonths: 8,
    totalMonths: 24,
    description: 'ICICI Personal Loan'
  },
  {
    id: '5',
    name: 'Student Loan',
    category: 'student-loans',
    type: 'EMI',
    principalAmount: 300000,
    remainingAmount: 150000,
    monthlyPayment: 3000,
    interestRate: 6.8,
    startDate: '2018-09-01',
    endDate: '2028-09-01',
    remainingMonths: 48,
    totalMonths: 120,
    description: 'Federal Student Loan'
  }
];

export default function NetWorthPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'liabilities'>('overview');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Asset | Liability | null>(null);

  // Calculate financial health
  const calculateFinancialHealth = (): FinancialHealth => {
    const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.remainingAmount, 0);
    const netWorth = totalAssets - totalLiabilities;
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    
    // Calculate monthly cash flow
    const monthlyIncome = assets.reduce((sum, asset) => sum + (asset.monthlyIncome || 0), 0);
    const monthlyPayments = liabilities.reduce((sum, liability) => sum + liability.monthlyPayment, 0);
    const monthlyCashFlow = monthlyIncome - monthlyPayments;
    
    // Calculate liquidity ratio (cash & equivalents / monthly expenses)
    // Liquidity: consider cash & savings bucket only
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
  };

  const financialHealth = calculateFinancialHealth();

  // UI: color coding for Debt-to-Asset KPI
  const debtRatioColor =
    financialHealth.debtToAssetRatio < 20
      ? 'text-green-600 dark:text-green-400'
      : financialHealth.debtToAssetRatio < 40
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'text-green-600';
      case 'Good': return 'text-blue-600';
      case 'Fair': return 'text-yellow-600';
      case 'Poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthBgColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-50 border-green-200';
      case 'Good': return 'bg-blue-50 border-blue-200';
      case 'Fair': return 'bg-yellow-50 border-yellow-200';
      case 'Poor': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'cash-savings': <Wallet className="w-5 h-5" />,
      'investments': <TrendingUp className="w-5 h-5" />,
      'real-estate': <Home className="w-5 h-5" />,
      'vehicles': <Car className="w-5 h-5" />,
      'personal-assets': <Gem className="w-5 h-5" />,
      'business-assets': <Briefcase className="w-5 h-5" />,
      'retirement-funds': <PiggyBank className="w-5 h-5" />,
      'mortgage': <Home className="w-5 h-5" />,
      'credit-cards': <CreditCard className="w-5 h-5" />,
      'student-loans': <Landmark className="w-5 h-5" />,
      'auto-loans': <Car className="w-5 h-5" />,
      'personal-loans': <CreditCard className="w-5 h-5" />,
      'business-loans': <Building2 className="w-5 h-5" />,
      'other-debts': <DollarSign className="w-5 h-5" />,
    };
    return iconMap[category] || <DollarSign className="w-5 h-5" />;
  };

  const getCategoryDisplayName = (category: string) => {
    const nameMap: { [key: string]: string } = {
      'cash-savings': 'Cash & Savings',
      'investments': 'Investments',
      'real-estate': 'Real Estate',
      'vehicles': 'Vehicles',
      'personal-assets': 'Personal Assets',
      'business-assets': 'Business Assets',
      'retirement-funds': 'Retirement Funds',
      'mortgage': 'Mortgage',
      'credit-cards': 'Credit Cards',
      'student-loans': 'Student Loans',
      'auto-loans': 'Auto Loans',
      'personal-loans': 'Personal Loans',
      'business-loans': 'Business Loans',
      'other-debts': 'Other Debts',
    };
    return nameMap[category] || category;
  };

  const getTypeIcon = (type: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      // Asset types
      'primary-residence': <Home className="w-4 h-4" />,
      'rental-property': <Building2 className="w-4 h-4" />,
      'commercial-property': <Building2 className="w-4 h-4" />,
      'land': <Building2 className="w-4 h-4" />,
      'savings-account': <Landmark className="w-4 h-4" />,
      'checking-account': <Landmark className="w-4 h-4" />,
      'money-market': <PiggyBank className="w-4 h-4" />,
      'certificate-deposit': <PiggyBank className="w-4 h-4" />,
      'cash': <DollarSign className="w-4 h-4" />,
      'stocks': <TrendingUp className="w-4 h-4" />,
      'mutual-funds': <BarChart3 className="w-4 h-4" />,
      'bonds': <Briefcase className="w-4 h-4" />,
      'etf': <BarChart3 className="w-4 h-4" />,
      'crypto': <TrendingUp className="w-4 h-4" />,
      'commodities': <Gem className="w-4 h-4" />,
      'car': <Car className="w-4 h-4" />,
      'motorcycle': <Car className="w-4 h-4" />,
      'boat': <Car className="w-4 h-4" />,
      'rv': <Car className="w-4 h-4" />,
      'jewelry': <Gem className="w-4 h-4" />,
      'art': <Gem className="w-4 h-4" />,
      'electronics': <Smartphone className="w-4 h-4" />,
      'furniture': <Home className="w-4 h-4" />,
      'business-equipment': <Briefcase className="w-4 h-4" />,
      'business-vehicle': <Car className="w-4 h-4" />,
      'inventory': <Briefcase className="w-4 h-4" />,
      'business-property': <Building2 className="w-4 h-4" />,
      '401k': <PiggyBank className="w-4 h-4" />,
      'ira': <PiggyBank className="w-4 h-4" />,
      'roth-ira': <PiggyBank className="w-4 h-4" />,
      'pension': <PiggyBank className="w-4 h-4" />,
      // Liability types
      'EMI': <Calculator className="w-4 h-4" />,
      'Regular': <CreditCard className="w-4 h-4" />,
    };
    return iconMap[type] || <DollarSign className="w-4 h-4" />;
  };

  // Form handlers
  const handleAddAsset = (asset: Asset) => {
    if (editingItem && 'value' in editingItem) {
      setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));
    } else {
      setAssets(prev => [...prev, asset]);
    }
    setShowAssetForm(false);
    setEditingItem(null);
  };

  const handleAddLiability = (liability: Liability) => {
    if (editingItem && 'remainingAmount' in editingItem) {
      setLiabilities(prev => prev.map(l => l.id === liability.id ? liability : l));
    } else {
      setLiabilities(prev => [...prev, liability]);
    }
    setShowLiabilityForm(false);
    setEditingItem(null);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingItem(asset);
    setShowAssetForm(true);
  };

  const handleEditLiability = (liability: Liability) => {
    setEditingItem(liability);
    setShowLiabilityForm(true);
  };

  const handleDeleteAsset = (assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));
  };

  const handleDeleteLiability = (liabilityId: string) => {
    setLiabilities(prev => prev.filter(l => l.id !== liabilityId));
  };

  const [presetCategory, setPresetCategory] = useState<string | undefined>(undefined);
  const handleAddItem = (type: 'asset' | 'liability', categoryId?: string) => {
    setEditingItem(null);
    setPresetCategory(categoryId);
    if (type === 'asset') {
      setShowAssetForm(true);
    } else {
      setShowLiabilityForm(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Net Worth Tracker</h1>
          <p className="text-sm text-muted-foreground">Track your financial health and optimize your wealth</p>
        </div>
      </div>

      {/* Always Visible KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(financialHealth.totalAssets)}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Liabilities</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(financialHealth.totalLiabilities)}
              </p>
            </div>
            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Net Worth</p>
              <p className={`text-lg font-bold ${financialHealth.netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(financialHealth.netWorth)}
              </p>
            </div>
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Monthly Cash Flow</p>
              <p className={`text-lg font-bold ${financialHealth.monthlyCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(financialHealth.monthlyCashFlow)}
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-300" />
          </div>
        </Card>
      </div>

      {/* Additional KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Debt-to-Asset Ratio</p>
              <p className={`text-lg font-bold ${debtRatioColor}`}>{financialHealth.debtToAssetRatio.toFixed(1)}%</p>
            </div>
            <Target className="w-5 h-5 text-slate-300" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Liquidity Ratio</p>
              <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                {financialHealth.liquidityRatio.toFixed(1)} months
              </p>
            </div>
            <Shield className="w-5 h-5 text-slate-300" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Monthly Debt Payments</p>
              <p className="text-lg font-bold text-pink-600 dark:text-pink-400">
                {formatCurrency(liabilities.reduce((sum, l) => sum + l.monthlyPayment, 0))}
              </p>
            </div>
            <CreditCard className="w-5 h-5 text-slate-300" />
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700">
        <div className="flex gap-1 sm:gap-2">
          {[
            { id: 'overview', name: 'Overview', icon: <PieChart className="w-4 h-4" /> },
            { id: 'assets', name: 'Assets', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'liabilities', name: 'Liabilities', icon: <TrendingDown className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm rounded-t-md transition-colors ${
                activeTab === tab.id 
                  ? 'bg-muted font-medium border-b-2 border-purple-600' 
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <FinancialInsights assets={assets} liabilities={liabilities} />
      )}

      {/* Assets Tab - Grouped Cards by Category */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {Object.entries(
            assets.reduce((acc, a) => {
              (acc[a.category] = acc[a.category] || []).push(a);
              return acc;
            }, {} as Record<string, Asset[]>)
          ).map(([category, list]) => {
            const total = list.reduce((s, a) => s + a.value, 0);
            return (
              <Card key={category} className="p-4 border-slate-700 bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-700">{getCategoryIcon(category)}</div>
                    <div>
                      <h3 className="text-base font-semibold">{getCategoryDisplayName(category)}</h3>
                      <p className="text-xs text-slate-400">{list.length} {list.length === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="text-sm font-bold text-green-400">{formatCurrency(total)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {list.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-md bg-slate-900 border border-slate-700">
                      <div className="p-1.5 rounded-md bg-green-900/30">{getTypeIcon(a.type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-sm font-semibold text-green-400 shrink-0">{formatCurrency(a.value)}</p>
                        </div>
                      </div>
                      <button onClick={() => handleEditAsset(a)} className="p-1.5 rounded hover:bg-slate-800 text-slate-300" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteAsset(a.id)} className="p-1.5 rounded hover:bg-red-900/20 text-slate-300 hover:text-red-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          {assets.length === 0 && (
            <Card className="p-12 text-center border-0 bg-card/50 backdrop-blur-sm">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20 w-fit mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No Assets Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">Add your first asset to begin calculating your net worth.</p>
              <Button variant="primary" onClick={() => handleAddItem('asset')} leftIcon={<TrendingUp className="w-4 h-4" />}>Add Asset</Button>
            </Card>
          )}
        </div>
      )}

      {/* Liabilities Tab - Grouped Cards by Category */}
      {activeTab === 'liabilities' && (
        <div className="space-y-6">
          {Object.entries(
            liabilities.reduce((acc, l) => {
              (acc[l.category] = acc[l.category] || []).push(l);
              return acc;
            }, {} as Record<string, Liability[]>)
          ).map(([category, list]) => {
            const total = list.reduce((s, l) => s + l.remainingAmount, 0);
            return (
              <Card key={category} className="p-4 border-slate-700 bg-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-700">{getCategoryIcon(category)}</div>
                    <div>
                      <h3 className="text-base font-semibold">{getCategoryDisplayName(category)}</h3>
                      <p className="text-xs text-slate-400">{list.length} {list.length === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Outstanding</p>
                    <p className="text-sm font-bold text-red-400">{formatCurrency(total)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {list.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-3 rounded-md bg-slate-900 border border-slate-700">
                      <div className="p-1.5 rounded-md bg-red-900/30">{getTypeIcon(l.type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{l.name}</p>
                          <p className="text-sm font-semibold text-red-400 shrink-0">{formatCurrency(l.remainingAmount)}</p>
                        </div>
                        {l.monthlyPayment ? (
                          <p className="text-xs text-slate-400">{formatCurrency(l.monthlyPayment)}/mo</p>
                        ) : null}
                      </div>
                      <button onClick={() => handleEditLiability(l)} className="p-1.5 rounded hover:bg-slate-800 text-slate-300" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteLiability(l.id)} className="p-1.5 rounded hover:bg-red-900/20 text-slate-300 hover:text-red-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          {liabilities.length === 0 && (
            <Card className="p-12 text-center border-0 bg-card/50 backdrop-blur-sm">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 w-fit mx-auto mb-4">
                <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No Liabilities Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">Add your first liability to complete your net worth picture.</p>
              <Button variant="primary" onClick={() => handleAddItem('liability')} leftIcon={<TrendingDown className="w-4 h-4" />}>Add Liability</Button>
            </Card>
          )}
        </div>
      )}

      {/* Form Modals */}
      <AssetForm
        isOpen={showAssetForm}
        onClose={() => {
          setShowAssetForm(false);
          setEditingItem(null);
        }}
        onSave={handleAddAsset}
        editingAsset={editingItem as Asset}
        presetCategoryId={presetCategory}
      />

      <LiabilityForm
        isOpen={showLiabilityForm}
        onClose={() => {
          setShowLiabilityForm(false);
          setEditingItem(null);
        }}
        onSave={handleAddLiability}
        editingLiability={editingItem as Liability}
        presetCategoryId={presetCategory}
      />
    </div>
  );
}