"use client";
import React, { useState } from "react";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Input } from "@/app/components/Input";
import { Modal } from "@/app/components/Modal";
import { 
  Home, 
  CreditCard, 
  Car, 
  Building2,
  Landmark,
  Calculator,
  DollarSign,
  X
} from "lucide-react";

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

interface LiabilityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (liability: Liability) => void;
  editingLiability?: Liability | null;
  presetCategoryId?: string; // optional quick-add preset
}

const liabilityCategories = [
  { id: 'mortgage', name: 'Mortgage', icon: <Home className="w-5 h-5 text-violet-400" /> },
  { id: 'credit-cards', name: 'Credit Cards', icon: <CreditCard className="w-5 h-5 text-rose-400" /> },
  { id: 'student-loans', name: 'Student Loans', icon: <Landmark className="w-5 h-5 text-blue-400" /> },
  { id: 'auto-loans', name: 'Auto Loans', icon: <Car className="w-5 h-5 text-amber-400" /> },
  { id: 'personal-loans', name: 'Personal Loans', icon: <CreditCard className="w-5 h-5 text-rose-400" /> },
  { id: 'business-loans', name: 'Business Loans', icon: <Building2 className="w-5 h-5 text-indigo-400" /> },
  { id: 'other-debts', name: 'Other Debts', icon: <DollarSign className="w-5 h-5 text-slate-300" /> }
];

// Suggestions for the Name field based on selected liability category
const liabilityNameSuggestions: Record<string, string[]> = {
  // Loans
  'mortgage': ['Home Loan'],
  'auto-loans': ['Car Loan', 'Two-Wheeler Loan'],
  'personal-loans': ['Personal Loan'],
  'student-loans': ['Education Loan'],
  'business-loans': ['Business Loan'],
  // Credit cards & overdrafts
  'credit-cards': ['Credit Card Outstanding', 'Overdraft Facility'],
  // Others
  'other-debts': ['Buy-Now-Pay-Later (BNPL)', 'Informal Debt', 'Tax Dues']
};

export default function LiabilityForm({ isOpen, onClose, onSave, editingLiability, presetCategoryId }: LiabilityFormProps) {
  const [formData, setFormData] = useState<Partial<Liability>>({
    name: '',
    category: '',
    type: 'Regular',
    remainingAmount: 0,
    monthlyPayment: 0,
    interestRate: 0
  });

  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [useCustomName, setUseCustomName] = useState<boolean>(false);
  const [selectedNameOption, setSelectedNameOption] = useState<string>('');

  React.useEffect(() => {
    if (editingLiability) {
      setFormData({
        id: editingLiability.id,
        name: editingLiability.name,
        category: editingLiability.category,
        type: editingLiability.type,
        remainingAmount: editingLiability.remainingAmount,
        monthlyPayment: editingLiability.monthlyPayment
      });
      const category = liabilityCategories.find(cat => cat.id === editingLiability.category);
      setSelectedCategory(category);
      setUseCustomName(true);
      setSelectedNameOption('custom');
    } else {
      setFormData({ name: '', category: '', type: 'Regular', remainingAmount: 0, monthlyPayment: 0, interestRate: 0 });
      if (presetCategoryId) {
        const cat = liabilityCategories.find(c => c.id === presetCategoryId) || null;
        setSelectedCategory(cat);
        setFormData(prev => ({ ...prev, category: presetCategoryId }));
      } else {
        setSelectedCategory(null);
      }
      setUseCustomName(false);
      setSelectedNameOption('');
    }
  }, [editingLiability, isOpen]);

  const handleCategoryChange = (categoryId: string) => {
    const category = liabilityCategories.find(cat => cat.id === categoryId);
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category: categoryId }));
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
    if (!formData.name || !formData.category || !formData.remainingAmount) {
      return;
    }

    const liability: Liability = {
      id: editingLiability?.id || Date.now().toString(),
      name: formData.name,
      category: formData.category,
      type: formData.type as 'EMI' | 'Regular',
      principalAmount: 0,
      remainingAmount: formData.remainingAmount,
      monthlyPayment: formData.monthlyPayment || 0,
      interestRate: formData.interestRate || 0,
      startDate: '',
      endDate: '',
      remainingMonths: 0,
      totalMonths: 0,
      description: ''
    };

    onSave(liability);
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Card className="w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingLiability ? 'Edit Liability' : 'Add Liability'}
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
              {liabilityCategories.map(category => {
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

          {/* Basic Information with suggestion dropdown and optional custom input */}
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
                  {(liabilityNameSuggestions[formData.category || ''] || []).map(s => (
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
                value={formData.remainingAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, remainingAmount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Debt Type Segmented */}
          <div>
            <label className="block text-sm font-medium mb-2">Debt Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'Regular' }))}
                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border ${formData.type === 'Regular' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
              >
                <span className="text-sm font-medium">Regular Debt</span>
                <span className="text-[10px] opacity-80">Credit cards, etc.</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'EMI' }))}
                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border ${formData.type === 'EMI' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
              >
                <span className="text-sm font-medium">EMI Loan</span>
                <span className="text-[10px] opacity-80">Monthly payments</span>
              </button>
            </div>
          </div>

          {/* Optional Interest Rate */}
          <div>
            <label className="block text-sm font-medium mb-2">Interest Rate (%) - Optional</label>
            <Input
              type="number"
              value={formData.interestRate}
              onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
              placeholder="19.5"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="accent">
              {editingLiability ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Card>
    </Modal>
  );
}