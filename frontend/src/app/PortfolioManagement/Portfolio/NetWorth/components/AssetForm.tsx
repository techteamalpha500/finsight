"use client";
import React, { useState } from "react";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Input } from "@/app/components/Input";
import { Select } from "@/app/components/Select";
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
    id: 'real-estate',
    name: 'Real Estate',
    icon: <Home className="w-5 h-5" />,
    types: [
      { id: 'property', name: 'Property', icon: <Home className="w-4 h-4" /> },
      { id: 'land', name: 'Land', icon: <Building2 className="w-4 h-4" /> },
      { id: 'commercial', name: 'Commercial Property', icon: <Building2 className="w-4 h-4" /> },
      { id: 'rental', name: 'Rental Property', icon: <Home className="w-4 h-4" /> }
    ]
  },
  {
    id: 'cash-equivalents',
    name: 'Cash & Equivalents',
    icon: <Wallet className="w-5 h-5" />,
    types: [
      { id: 'savings', name: 'Savings Account', icon: <Landmark className="w-4 h-4" /> },
      { id: 'current', name: 'Current Account', icon: <Landmark className="w-4 h-4" /> },
      { id: 'fd', name: 'Fixed Deposit', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'rd', name: 'Recurring Deposit', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'ppf', name: 'PPF', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'nsc', name: 'NSC', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'sukanya', name: 'Sukanya Samriddhi', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'cash', name: 'Cash', icon: <DollarSign className="w-4 h-4" /> }
    ]
  },
  {
    id: 'investments',
    name: 'Investments',
    icon: <TrendingUp className="w-5 h-5" />,
    types: [
      { id: 'mutual-funds', name: 'Mutual Funds', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'stocks', name: 'Stocks', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'bonds', name: 'Bonds', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'etf', name: 'ETF', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'nps', name: 'NPS', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'ulip', name: 'ULIP', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'crypto', name: 'Cryptocurrency', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'commodities', name: 'Commodities', icon: <Gem className="w-4 h-4" /> }
    ]
  },
  {
    id: 'personal-assets',
    name: 'Personal Assets',
    icon: <Gem className="w-5 h-5" />,
    types: [
      { id: 'vehicle', name: 'Vehicle', icon: <Car className="w-4 h-4" /> },
      { id: 'jewelry', name: 'Jewelry', icon: <Gem className="w-4 h-4" /> },
      { id: 'gold', name: 'Gold', icon: <Gem className="w-4 h-4" /> },
      { id: 'silver', name: 'Silver', icon: <Gem className="w-4 h-4" /> },
      { id: 'electronics', name: 'Electronics', icon: <Smartphone className="w-4 h-4" /> },
      { id: 'art', name: 'Art & Collectibles', icon: <Gem className="w-4 h-4" /> },
      { id: 'furniture', name: 'Furniture', icon: <Home className="w-4 h-4" /> },
      { id: 'other', name: 'Other', icon: <Gem className="w-4 h-4" /> }
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Asset Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Primary Residence, Savings Account"
              required
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="grid grid-cols-2 gap-3">
              {assetCategories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                    formData.category === category.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {category.icon}
                  <span className="font-medium">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Type Selection */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <div className="grid grid-cols-2 gap-3">
                {selectedCategory.types.map((type: any) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                    className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                      formData.type === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type.icon}
                    <span className="font-medium">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Value */}
          <div>
            <label className="block text-sm font-medium mb-2">Current Value (₹)</label>
            <Input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
              placeholder="Enter current market value"
              required
            />
          </div>

          {/* Monthly Income (for income-generating assets) */}
          {(formData.category === 'investments' || formData.category === 'real-estate') && (
            <div>
              <label className="block text-sm font-medium mb-2">Monthly Income (₹)</label>
              <Input
                type="number"
                value={formData.monthlyIncome}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyIncome: parseFloat(e.target.value) || 0 }))}
                placeholder="Monthly income from this asset"
              />
            </div>
          )}

          {/* Interest Rate (for fixed income assets) */}
          {(formData.category === 'cash-equivalents' || formData.category === 'investments') && (
            <div>
              <label className="block text-sm font-medium mb-2">Interest Rate (%)</label>
              <Input
                type="number"
                step="0.1"
                value={formData.interestRate}
                onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                placeholder="Annual interest rate"
              />
            </div>
          )}

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Purchase Date</label>
            <Input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
            />
          </div>

          {/* Maturity Date (for fixed deposits, bonds, etc.) */}
          {(formData.type === 'fd' || formData.type === 'rd' || formData.type === 'bonds') && (
            <div>
              <label className="block text-sm font-medium mb-2">Maturity Date</label>
              <Input
                type="date"
                value={formData.maturityDate}
                onChange={(e) => setFormData(prev => ({ ...prev, maturityDate: e.target.value }))}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this asset"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
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