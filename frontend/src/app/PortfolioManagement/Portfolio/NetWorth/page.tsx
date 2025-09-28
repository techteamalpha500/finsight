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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Net Worth Tracker</h1>
          <p className="text-muted-foreground">Track your financial health and optimize your wealth</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleAddItem('asset')}
            className="bg-green-600 hover:bg-green-700"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
          <Button 
            onClick={() => handleAddItem('liability')}
            className="bg-red-600 hover:bg-red-700"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Add Liability
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex gap-2">
          {[
            { id: 'overview', name: 'Overview', icon: <PieChart className="w-4 h-4" /> },
            { id: 'assets', name: 'Assets', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'liabilities', name: 'Liabilities', icon: <TrendingDown className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-md transition-colors ${
                activeTab === tab.id 
                  ? 'bg-muted font-medium border-b-2 border-blue-600' 
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {tab.icon}
              {tab.name}
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Assets</h2>
            <Button 
              onClick={() => handleAddItem('asset')}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>

          {/* Assets by Category */}
          {Object.entries(
            assets.reduce((acc, asset) => {
              if (!acc[asset.category]) acc[asset.category] = [];
              acc[asset.category].push(asset);
              return acc;
            }, {} as { [key: string]: Asset[] })
          ).map(([category, categoryAssets]) => (
            <Card key={category} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getCategoryIcon(category)}
                  <h3 className="text-lg font-semibold">{category}</h3>
                  <Badge variant="secondary">
                    {categoryAssets.length} items
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(categoryAssets.reduce((sum, asset) => sum + asset.value, 0))}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                {categoryAssets.map(asset => (
                  <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 group transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      {getTypeIcon(asset.type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{asset.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {asset.type.replace('-', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-green-600 text-sm">{formatCurrency(asset.value)}</p>
                        {asset.monthlyIncome && (
                          <p className="text-xs text-muted-foreground">
                            +{formatCurrency(asset.monthlyIncome)}/mo
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditAsset(asset)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Liabilities Tab */}
      {activeTab === 'liabilities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Liabilities</h2>
            <Button 
              onClick={() => handleAddItem('liability')}
              className="bg-red-600 hover:bg-red-700"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Add Liability
            </Button>
          </div>

          {/* EMI Loans */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5" />
                <h3 className="text-lg font-semibold">EMI Loans</h3>
                <Badge variant="secondary">
                  {liabilities.filter(l => l.type === 'EMI').length} loans
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              {liabilities.filter(l => l.type === 'EMI').map(liability => (
                <div key={liability.id} className="p-3 border rounded-lg group hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      {getTypeIcon(liability.type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{liability.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {liability.category.replace('-', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-red-600 text-sm">
                          {formatCurrency(liability.remainingAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(liability.monthlyPayment)}/mo
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditLiability(liability)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLiability(liability.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {liability.remainingMonths && liability.totalMonths && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{liability.totalMonths - liability.remainingMonths}/{liability.totalMonths} months</span>
                      </div>
                      <Progress 
                        value={((liability.totalMonths - liability.remainingMonths) / liability.totalMonths) * 100} 
                        className="h-1.5"
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Rate: {liability.interestRate}%</span>
                    <span>Remaining: {liability.remainingMonths}mo</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Regular Debts */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Regular Debts</h3>
                <Badge variant="secondary">
                  {liabilities.filter(l => l.type === 'Regular').length} debts
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              {liabilities.filter(l => l.type === 'Regular').map(liability => (
                <div key={liability.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 group transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    {getTypeIcon(liability.type)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{liability.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {liability.category.replace('-', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-red-600 text-sm">
                        {formatCurrency(liability.remainingAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(liability.monthlyPayment)}/mo
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditLiability(liability)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteLiability(liability.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
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