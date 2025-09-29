"use client";
import React, { useState } from "react";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Input } from "@/app/components/Input";
import { Modal } from "@/app/components/Modal";
import { 
  Home, 
  Wallet, 
  TrendingUp, 
  Gem, 
  Car, 
  Building2,
  Landmark,
  PiggyBank,
  BarChart3,
  Briefcase,
  Smartphone,
  Laptop,
  Watch,
  DollarSign,
  X
} from "lucide-react";

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

interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
  editingAsset?: Asset | null;
}

const assetCategories = [
  {
    id: 'cash-savings',
    name: 'Cash & Savings',
    icon: <Wallet className="w-5 h-5" />,
    types: [
      { id: 'savings-account', name: 'Savings Account', icon: <Landmark className="w-4 h-4" /> },
      { id: 'checking-account', name: 'Checking Account', icon: <Landmark className="w-4 h-4" /> },
      { id: 'money-market', name: 'Money Market', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'certificate-deposit', name: 'Certificate of Deposit', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'cash', name: 'Cash', icon: <DollarSign className="w-4 h-4" /> }
    ]
  },
  {
    id: 'investments',
    name: 'Investments',
    icon: <TrendingUp className="w-5 h-5" />,
    types: [
      { id: 'stocks', name: 'Stocks', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'mutual-funds', name: 'Mutual Funds', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'bonds', name: 'Bonds', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'etf', name: 'ETF', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'crypto', name: 'Cryptocurrency', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'commodities', name: 'Commodities', icon: <Gem className="w-4 h-4" /> }
    ]
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: <Home className="w-5 h-5" />,
    types: [
      { id: 'primary-residence', name: 'Primary Residence', icon: <Home className="w-4 h-4" /> },
      { id: 'rental-property', name: 'Rental Property', icon: <Building2 className="w-4 h-4" /> },
      { id: 'commercial-property', name: 'Commercial Property', icon: <Building2 className="w-4 h-4" /> },
      { id: 'land', name: 'Land', icon: <Building2 className="w-4 h-4" /> }
    ]
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    icon: <Car className="w-5 h-5" />,
    types: [
      { id: 'car', name: 'Car', icon: <Car className="w-4 h-4" /> },
      { id: 'motorcycle', name: 'Motorcycle', icon: <Car className="w-4 h-4" /> },
      { id: 'boat', name: 'Boat', icon: <Car className="w-4 h-4" /> },
      { id: 'rv', name: 'RV', icon: <Car className="w-4 h-4" /> }
    ]
  },
  {
    id: 'personal-assets',
    name: 'Personal Assets',
    icon: <Gem className="w-5 h-5" />,
    types: [
      { id: 'jewelry', name: 'Jewelry', icon: <Gem className="w-4 h-4" /> },
      { id: 'art', name: 'Art & Collectibles', icon: <Gem className="w-4 h-4" /> },
      { id: 'electronics', name: 'Electronics', icon: <Smartphone className="w-4 h-4" /> },
      { id: 'furniture', name: 'Furniture', icon: <Home className="w-4 h-4" /> }
    ]
  },
  {
    id: 'business-assets',
    name: 'Business Assets',
    icon: <Briefcase className="w-5 h-5" />,
    types: [
      { id: 'business-equipment', name: 'Business Equipment', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'business-vehicle', name: 'Business Vehicle', icon: <Car className="w-4 h-4" /> },
      { id: 'inventory', name: 'Inventory', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'business-property', name: 'Business Property', icon: <Building2 className="w-4 h-4" /> }
    ]
  },
  {
    id: 'retirement-funds',
    name: 'Retirement Funds',
    icon: <PiggyBank className="w-5 h-5" />,
    types: [
      { id: '401k', name: '401(k)', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'ira', name: 'IRA', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'roth-ira', name: 'Roth IRA', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'pension', name: 'Pension', icon: <PiggyBank className="w-4 h-4" /> }
    ]
  }
];

export default function AssetForm({ isOpen, onClose, onSave, editingAsset }: AssetFormProps) {
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    category: '',
    type: '',
    value: 0,
    monthlyIncome: 0,
    interestRate: 0,
    purchaseDate: '',
    maturityDate: '',
    description: ''
  });

  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  React.useEffect(() => {
    if (editingAsset) {
      setFormData(editingAsset);
      const category = assetCategories.find(cat => cat.id === editingAsset.category);
      setSelectedCategory(category);
    } else {
      setFormData({
        name: '',
        category: '',
        type: '',
        value: 0,
        monthlyIncome: 0,
        interestRate: 0,
        purchaseDate: '',
        maturityDate: '',
        description: ''
      });
      setSelectedCategory(null);
    }
  }, [editingAsset, isOpen]);

  const handleCategoryChange = (categoryId: string) => {
    const category = assetCategories.find(cat => cat.id === categoryId);
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category: categoryId, type: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.type || !formData.value) {
      return;
    }

    const asset: Asset = {
      id: editingAsset?.id || Date.now().toString(),
      name: formData.name,
      category: formData.category,
      type: formData.type,
      value: formData.value,
      monthlyIncome: formData.monthlyIncome || 0,
      interestRate: formData.interestRate || 0,
      purchaseDate: formData.purchaseDate,
      maturityDate: formData.maturityDate,
      description: formData.description
    };

    onSave(asset);
    onClose();
  };

  const selectedCategoryData = assetCategories.find(cat => cat.id === formData.category);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Card className="w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingAsset ? 'Edit Asset' : 'Add New Asset'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Asset Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Primary Residence"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Current Value (₹)</label>
              <Input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter current value"
                required
              />
            </div>
          </div>

          {/* Category Selection - Visual Grid */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="grid grid-cols-2 gap-3">
              {assetCategories.map(category => {
                const isSelected = formData.category === category.id;
                return (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                      isSelected ? 'border-purple-600 bg-purple-50' : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`p-2 rounded-md ${isSelected ? 'bg-purple-100' : 'bg-muted'}`}>{category.icon}</div>
                    <div className="font-medium">{category.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type Selection - Visual Grid */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <div className="grid grid-cols-2 gap-3">
                {selectedCategory.types.map((type: any) => {
                  const isSelected = formData.type === type.id;
                  return (
                    <button
                      type="button"
                      key={type.id}
                      onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                      className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                        isSelected ? 'border-purple-600 bg-purple-50' : 'hover:bg-muted'
                      }`}
                    >
                      <div className={`p-2 rounded-md ${isSelected ? 'bg-purple-100' : 'bg-muted'}`}>{type.icon}</div>
                      <div className="font-medium">{type.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Fields - Collapsible */}
          <div className="space-y-3">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                Additional Details (Optional)
              </summary>
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                {/* Monthly Income */}
                {(formData.category === 'investments' || formData.category === 'real-estate') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Monthly Income (₹)</label>
                    <Input
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthlyIncome: parseFloat(e.target.value) || 0 }))}
                      placeholder="Monthly income from this asset"
                    />
                  </div>
                )}

                {/* Interest Rate */}
                {(formData.category === 'cash-savings' || formData.category === 'investments') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.interestRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                      placeholder="Annual interest rate"
                    />
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Date</label>
                    <Input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    />
                  </div>
                  {(formData.type === 'certificate-deposit' || formData.type === 'bonds') && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Maturity Date</label>
                      <Input
                        type="date"
                        value={formData.maturityDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, maturityDate: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional details about this asset"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </details>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              {editingAsset ? 'Update Asset' : 'Add Asset'}
            </Button>
          </div>
        </form>
      </Card>
    </Modal>
  );
}