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
  const [assets, setAssets] = useState<Asset[]>(sampleAssets);
  const [liabilities, setLiabilities] = useState<Liability[]>(sampleLiabilities);
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
    const cashAssets = assets.filter(asset => 
      asset.category === 'Cash & Equivalents' || asset.type === 'Bank Account'
    ).reduce((sum, asset) => sum + asset.value, 0);
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

  const handleAddItem = (type: 'asset' | 'liability') => {
    setEditingItem(null);
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
        <div className="flex gap-2">
          <Button 
            variant="primary"
            onClick={() => handleAddItem('asset')}
            leftIcon={<TrendingUp className="w-4 h-4" />}
          >
            Add Asset
          </Button>
          <Button 
            variant="primary"
            onClick={() => handleAddItem('liability')}
            leftIcon={<TrendingDown className="w-4 h-4" />}
          >
            Add Liability
          </Button>
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

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="space-y-8">
          {/* Assets by Category - Only show categories with items */}
          {Object.entries(
            assets.reduce((acc, asset) => {
              if (!acc[asset.category]) acc[asset.category] = [];
              acc[asset.category].push(asset);
              return acc;
            }, {} as { [key: string]: Asset[] })
          ).map(([category, categoryAssets], index) => (
            <div key={category} className="space-y-4">
              {/* Category Header with Better Sum Display */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 rounded-lg border border-green-200 dark:border-green-800/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-200 dark:bg-green-800/30 shadow-sm">
                    {getCategoryIcon(category)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {getCategoryDisplayName(category)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {categoryAssets.length} {categoryAssets.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-green-200 dark:border-green-800/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(categoryAssets.reduce((sum, asset) => sum + asset.value, 0))}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Assets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categoryAssets.map(asset => (
                  <Card key={asset.id} className="p-4 hover:shadow-lg transition-all duration-200 border-0 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20 flex-shrink-0">
                          {getTypeIcon(asset.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate text-foreground">{asset.name}</h4>
                          <p className="text-xs text-muted-foreground capitalize">
                            {asset.type.replace('-', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEditAsset(asset)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Edit asset"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                          title="Delete asset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Value</span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(asset.value)}
                        </span>
                      </div>
                      {asset.monthlyIncome && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Monthly Income</span>
                          <span className="text-sm text-green-600 dark:text-green-400">
                            +{formatCurrency(asset.monthlyIncome)}
                          </span>
                        </div>
                      )}
                      {asset.interestRate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Interest Rate</span>
                          <span className="text-sm text-muted-foreground">
                            {asset.interestRate}% p.a.
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Empty State */}
          {assets.length === 0 && (
            <Card className="p-12 text-center border-0 bg-card/50 backdrop-blur-sm">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20 w-fit mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No Assets Added</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start building your wealth by adding your first asset. Track your investments, savings, and property.
              </p>
              <Button 
                variant="primary"
                onClick={() => handleAddItem('asset')}
                leftIcon={<TrendingUp className="w-4 h-4" />}
              >
                Add Your First Asset
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Liabilities Tab */}
      {activeTab === 'liabilities' && (
        <div className="space-y-8">
          {/* Liabilities by Category - Only show categories with items */}
          {Object.entries(
            liabilities.reduce((acc, liability) => {
              if (!acc[liability.category]) acc[liability.category] = [];
              acc[liability.category].push(liability);
              return acc;
            }, {} as { [key: string]: Liability[] })
          ).map(([category, categoryLiabilities], index) => (
            <div key={category} className="space-y-4">
              {/* Category Header with Better Sum Display */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/10 dark:to-red-800/10 rounded-lg border border-red-200 dark:border-red-800/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-200 dark:bg-red-800/30 shadow-sm">
                    {getCategoryIcon(category)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {getCategoryDisplayName(category)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {categoryLiabilities.length} {categoryLiabilities.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800/20">
                    <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(categoryLiabilities.reduce((sum, l) => sum + l.remainingAmount, 0))}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Liabilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categoryLiabilities.map(liability => (
                  <Card key={liability.id} className="p-4 hover:shadow-lg transition-all duration-200 border-0 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20 flex-shrink-0">
                          {getTypeIcon(liability.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate text-foreground">{liability.name}</h4>
                          <p className="text-xs text-muted-foreground capitalize">
                            {liability.type === 'EMI' ? 'EMI Loan' : 'Regular Debt'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEditLiability(liability)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Edit liability"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLiability(liability.id)}
                          className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                          title="Delete liability"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Outstanding</span>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(liability.remainingAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Monthly Payment</span>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {formatCurrency(liability.monthlyPayment)}
                        </span>
                      </div>
                      {liability.interestRate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Interest Rate</span>
                          <span className="text-sm text-muted-foreground">
                            {liability.interestRate}% p.a.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* EMI Progress Bar */}
                    {liability.type === 'EMI' && liability.remainingMonths && liability.totalMonths && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-muted-foreground">
                            {liability.totalMonths - liability.remainingMonths}/{liability.totalMonths} mo
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-red-600 dark:bg-red-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((liability.totalMonths - liability.remainingMonths) / liability.totalMonths) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Empty State */}
          {liabilities.length === 0 && (
            <Card className="p-12 text-center border-0 bg-card/50 backdrop-blur-sm">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 w-fit mx-auto mb-4">
                <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No Liabilities Added</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Track your debts and loans to better manage your finances and improve your financial health.
              </p>
              <Button 
                variant="primary"
                onClick={() => handleAddItem('liability')}
                leftIcon={<TrendingDown className="w-4 h-4" />}
              >
                Add Your First Liability
              </Button>
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
      />

      <LiabilityForm
        isOpen={showLiabilityForm}
        onClose={() => {
          setShowLiabilityForm(false);
          setEditingItem(null);
        }}
        onSave={handleAddLiability}
        editingLiability={editingItem as Liability}
      />
    </div>
  );
}