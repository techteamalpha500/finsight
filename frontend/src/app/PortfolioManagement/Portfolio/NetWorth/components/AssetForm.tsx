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
  presetCategoryId?: string; // optional quick-add preset
}

const assetCategories = [
  {
    id: 'cash-savings',
    name: 'Cash & Savings',
    icon: <Wallet className="w-5 h-5 text-emerald-400" />,
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
    icon: <TrendingUp className="w-5 h-5 text-sky-400" />,
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
    icon: <Home className="w-5 h-5 text-violet-400" />,
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
    icon: <Car className="w-5 h-5 text-amber-400" />,
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
    icon: <Gem className="w-5 h-5 text-pink-400" />,
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
    icon: <Briefcase className="w-5 h-5 text-indigo-400" />,
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
    icon: <PiggyBank className="w-5 h-5 text-purple-400" />,
    types: [
      { id: '401k', name: '401(k)', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'ira', name: 'IRA', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'roth-ira', name: 'Roth IRA', icon: <PiggyBank className="w-4 h-4" /> },
      { id: 'pension', name: 'Pension', icon: <PiggyBank className="w-4 h-4" /> }
    ]
  }
];

// Suggestions for the Name field based on selected category
const assetNameSuggestions: Record<string, string[]> = {
  'cash-savings': [
    'Bank Account - Savings',
    'Bank Account - Current',
    'Fixed Deposit (FD)',
    'Recurring Deposit (RD)',
    'Digital Wallet - Paytm',
    'Digital Wallet - GPay'
  ],
  investments: [
    'Stocks',
    'Mutual Fund - Equity',
    'Mutual Fund - Debt',
    'Mutual Fund - Hybrid',
    'Bonds / Debentures',
    'ETF',
    'PPF',
    'NSC',
    'SSY'
  ],
  'personal-assets': [
    'Physical Gold / Jewelry',
    'Digital Gold',
    'Sovereign Gold Bonds'
  ],
  'real-estate': [
    'Residential Property',
    'Commercial Property',
    'Land / Plot'
  ],
  vehicles: [
    'Car',
    'Two-Wheeler',
    'Boat / Caravan / Other'
  ],
  'retirement-funds': [
    'EPF',
    'VPF',
    'NPS',
    'Pension Account'
  ],
  // Optional buckets
  'business-assets': [
    'Business Ownership / Equity'
  ],
};

export default function AssetForm({ isOpen, onClose, onSave, editingAsset, presetCategoryId }: AssetFormProps) {
  // Only keep fields we actually need now
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    category: '',
    value: 0,
    type: 'item'
  });

  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [useCustomName, setUseCustomName] = useState<boolean>(false);
  const [selectedNameOption, setSelectedNameOption] = useState<string>('');

  React.useEffect(() => {
    if (editingAsset) {
      setFormData({ id: editingAsset.id, name: editingAsset.name, category: editingAsset.category, value: editingAsset.value, type: 'item' });
      const category = assetCategories.find(cat => cat.id === editingAsset.category);
      setSelectedCategory(category);
      setUseCustomName(true);
      setSelectedNameOption('custom');
    } else {
      setFormData({ name: '', category: '', value: 0, type: 'item' });
      // Apply preset category for quick add
      if (presetCategoryId) {
        const cat = assetCategories.find(c => c.id === presetCategoryId) || null;
        setSelectedCategory(cat);
        setFormData(prev => ({ ...prev, category: presetCategoryId }));
      } else {
        setSelectedCategory(null);
      }
      setUseCustomName(false);
      setSelectedNameOption('');
    }
  }, [editingAsset, isOpen]);

  const handleCategoryChange = (categoryId: string) => {
    const category = assetCategories.find(cat => cat.id === categoryId);
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category: categoryId }));
    // Reset name-related selections on category change
    setUseCustomName(false);
    setSelectedNameOption('');
    setFormData(prev => ({ ...prev, name: '' }));
  };

  const handleSuggestedNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedNameOption(value);
    if (value === 'custom') {
      setUseCustomName(true);
      setFormData(prev => ({ ...prev, name: '' }));
    } else if (value) {
      setUseCustomName(false);
      setFormData(prev => ({ ...prev, name: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.value) {
      return;
    }

    const asset: Asset = {
      id: editingAsset?.id || Date.now().toString(),
      name: formData.name,
      category: formData.category,
      type: 'item',
      value: formData.value
    };

    onSave(asset);
    onClose();
  };

  const selectedCategoryData = assetCategories.find(cat => cat.id === formData.category);

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Card className="w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingAsset ? 'Edit Asset' : 'Add Asset'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Selection - Visual Grid (first) */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Category</label>
            <div className="grid grid-cols-2 gap-3">
              {assetCategories.map(category => {
                const isSelected = formData.category === category.id;
                return (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-slate-700 border-purple-600' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-md ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-200'}`}>{category.icon}</div>
                    <div className="font-medium">{category.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Basic Information: Name selector then optional custom input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <div className="space-y-2">
                <select
                  value={selectedNameOption}
                  onChange={handleSuggestedNameChange}
                  disabled={!formData.category}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:opacity-50"
                >
                  <option value="" disabled>
                    {formData.category ? 'Select from suggestions' : 'Select category first'}
                  </option>
                  {(assetNameSuggestions[formData.category || ''] || []).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="custom">Custom Entry</option>
                </select>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter custom name"
                  disabled={!useCustomName}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Value ($)</label>
              <Input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              {editingAsset ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Card>
    </Modal>
  );
}