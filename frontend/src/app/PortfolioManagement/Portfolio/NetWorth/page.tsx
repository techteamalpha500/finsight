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
import { 
  fetchNetWorthData, 
  createAsset, 
  createLiability, 
  updateAsset, 
  updateLiability, 
  deleteAsset, 
  deleteLiability,
  calculateFinancialHealth,
  type Asset,
  type Liability,
  type NetWorthData
} from "../../../../lib/networth";

// Types are now imported from networth.ts

// Sample data removed - now using real data from API

export default function NetWorthPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'liabilities'>('overview');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Asset | Liability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadNetWorthData();
  }, []);

  const loadNetWorthData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNetWorthData();
      setAssets(data.assets);
      setLiabilities(data.liabilities);
    } catch (err) {
      console.error('Error loading net worth data:', err);
      setError('Failed to load net worth data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate financial health using the imported function
  const financialHealth = calculateFinancialHealth(assets, liabilities);

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

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'cash-savings': 'bg-emerald-900/30 text-emerald-400',
      'investments': 'bg-sky-900/30 text-sky-400',
      'real-estate': 'bg-violet-900/30 text-violet-400',
      'vehicles': 'bg-amber-900/30 text-amber-400',
      'personal-assets': 'bg-pink-900/30 text-pink-400',
      'business-assets': 'bg-indigo-900/30 text-indigo-400',
      'retirement-funds': 'bg-purple-900/30 text-purple-400',
      'mortgage': 'bg-violet-900/30 text-violet-400',
      'credit-cards': 'bg-rose-900/30 text-rose-400',
      'student-loans': 'bg-blue-900/30 text-blue-400',
      'auto-loans': 'bg-amber-900/30 text-amber-400',
      'personal-loans': 'bg-rose-900/30 text-rose-400',
      'business-loans': 'bg-indigo-900/30 text-indigo-400',
      'other-debts': 'bg-slate-900/30 text-slate-300',
    };
    return colorMap[category] || 'bg-slate-700 text-slate-200';
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

  // Form handlers with API integration
  const handleAddAsset = async (asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingItem && 'value' in editingItem) {
        // Update existing asset
        await updateAsset(editingItem.id, asset);
        setAssets(prev => prev.map(a => a.id === editingItem.id ? { ...a, ...asset } : a));
      } else {
        // Create new asset
        const result = await createAsset(asset);
        const newAsset = { ...asset, id: result.asset_id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        setAssets(prev => [...prev, newAsset]);
      }
      setShowAssetForm(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Failed to save asset. Please try again.');
    }
  };

  const handleAddLiability = async (liability: Omit<Liability, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingItem && 'remainingAmount' in editingItem) {
        // Update existing liability
        await updateLiability(editingItem.id, liability);
        setLiabilities(prev => prev.map(l => l.id === editingItem.id ? { ...l, ...liability } : l));
      } else {
        // Create new liability
        const result = await createLiability(liability);
        const newLiability = { ...liability, id: result.liability_id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        setLiabilities(prev => [...prev, newLiability]);
      }
      setShowLiabilityForm(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving liability:', error);
      alert('Failed to save liability. Please try again.');
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingItem(asset);
    setShowAssetForm(true);
  };

  const handleEditLiability = (liability: Liability) => {
    setEditingItem(liability);
    setShowLiabilityForm(true);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      try {
        await deleteAsset(assetId);
        setAssets(prev => prev.filter(a => a.id !== assetId));
      } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Failed to delete asset. Please try again.');
      }
    }
  };

  const handleDeleteLiability = async (liabilityId: string) => {
    if (confirm('Are you sure you want to delete this liability?')) {
      try {
        await deleteLiability(liabilityId);
        setLiabilities(prev => prev.filter(l => l.id !== liabilityId));
      } catch (error) {
        console.error('Error deleting liability:', error);
        alert('Failed to delete liability. Please try again.');
      }
    }
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading net worth data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">{error}</div>
            <Button onClick={loadNetWorthData}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Net Worth Tracker</h1>
          <p className="text-sm text-muted-foreground">Track your financial health and optimize your wealth</p>
        </div>
        <Button 
          onClick={loadNetWorthData} 
          variant="outline" 
          size="sm"
        >
          Refresh Data
        </Button>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-emerald-900/40 border border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-lg font-bold text-emerald-400">
                {formatCurrency(financialHealth.totalAssets)}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
        </Card>

        <Card className="p-4 bg-rose-900/40 border border-rose-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Liabilities</p>
              <p className="text-lg font-bold text-rose-400">
                {formatCurrency(financialHealth.totalLiabilities)}
              </p>
            </div>
            <TrendingDown className="w-5 h-5 text-rose-400" />
          </div>
        </Card>

        <Card className="p-4 bg-violet-900/50 border border-violet-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Net Worth</p>
              <p className={`text-lg font-bold ${financialHealth.netWorth >= 0 ? 'text-white' : 'text-rose-200'}`}>
                {formatCurrency(financialHealth.netWorth)}
              </p>
            </div>
            <DollarSign className="w-5 h-5 text-purple-300" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Monthly Cash Flow</p>
              <p className={`text-lg font-bold ${financialHealth.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}> 
                {formatCurrency(financialHealth.monthlyCashFlow)}
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-300" />
          </div>
        </Card>
      </div>

      {/* Metrics Row */}
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

      {/* Smart Financial Insights */}
      <Card className="p-4 border border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium">Smart Financial Insights</span>
        </div>
        {/* High-interest credit card insight */}
        {(() => {
          const highCards = liabilities.filter(l => l.category === 'credit-cards' && l.interestRate > 20);
          if (highCards.length === 0) return null;
          return (
            <div className="rounded-md border border-slate-700 bg-slate-900 p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400" />
                <div className="space-y-1">
                  <div className="text-sm font-medium">Pay Off High-Interest Credit Cards</div>
                  <div className="text-xs text-muted-foreground">You have {highCards.length} credit card(s) with interest rates above 20%. Consider paying these off first.</div>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Tab Navigation - Segmented control */}
      <div className="flex justify-center">
        <div className="inline-flex w-full max-w-md items-center gap-1 rounded-full bg-slate-800 p-1">
          {[
            { id: 'overview', name: 'Overview', icon: <PieChart className="w-4 h-4" /> },
            { id: 'assets', name: 'Assets', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'liabilities', name: 'Liabilities', icon: <TrendingDown className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white' 
                  : 'text-foreground hover:bg-slate-700'
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold">Assets</h2>
            </div>
            <Button variant="accent" onClick={() => handleAddItem('asset')} leftIcon={<TrendingUp className="w-4 h-4" />}>Add Asset</Button>
          </div>
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
                    <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>{getCategoryIcon(category)}</div>
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
                          <div className="flex items-center gap-2 shrink-0">
                            {a.monthlyIncome ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-900/30 text-emerald-400">
                                +{formatCurrency(a.monthlyIncome)}/mo
                              </span>
                            ) : null}
                            <p className="text-sm font-semibold text-green-400">{formatCurrency(a.value)}</p>
                          </div>
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
              <Button variant="accent" onClick={() => handleAddItem('asset')} leftIcon={<TrendingUp className="w-4 h-4" />}>Add Asset</Button>
            </Card>
          )}
          </div>
        </div>
      )}

      {/* Liabilities Tab - Grouped Cards by Category */}
      {activeTab === 'liabilities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <h2 className="text-base font-semibold">Liabilities</h2>
            </div>
            <Button variant="accent" onClick={() => handleAddItem('liability')} leftIcon={<TrendingDown className="w-4 h-4" />}>Add Liability</Button>
          </div>
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
                    <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>{getCategoryIcon(category)}</div>
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
              <Button variant="accent" onClick={() => handleAddItem('liability')} leftIcon={<TrendingDown className="w-4 h-4" />}>Add Liability</Button>
            </Card>
          )}
          </div>
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