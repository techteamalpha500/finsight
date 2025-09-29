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
  { id: 'mortgage', name: 'Mortgage', icon: <Home className="w-5 h-5" /> },
  { id: 'credit-cards', name: 'Credit Cards', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'student-loans', name: 'Student Loans', icon: <Landmark className="w-5 h-5" /> },
  { id: 'auto-loans', name: 'Auto Loans', icon: <Car className="w-5 h-5" /> },
  { id: 'personal-loans', name: 'Personal Loans', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'business-loans', name: 'Business Loans', icon: <Building2 className="w-5 h-5" /> },
  { id: 'other-debts', name: 'Other Debts', icon: <DollarSign className="w-5 h-5" /> }
];

export default function LiabilityForm({ isOpen, onClose, onSave, editingLiability, presetCategoryId }: LiabilityFormProps) {
  const [formData, setFormData] = useState<Partial<Liability>>({
    name: '',
    category: '',
    type: 'EMI',
    remainingAmount: 0,
    monthlyPayment: 0
  });

  const [selectedCategory, setSelectedCategory] = useState<any>(null);

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
    } else {
      setFormData({ name: '', category: '', type: 'EMI', remainingAmount: 0, monthlyPayment: 0 });
      if (presetCategoryId) {
        const cat = liabilityCategories.find(c => c.id === presetCategoryId) || null;
        setSelectedCategory(cat);
        setFormData(prev => ({ ...prev, category: presetCategoryId }));
      } else {
        setSelectedCategory(null);
      }
    }
  }, [editingLiability, isOpen]);

  const handleCategoryChange = (categoryId: string) => {
    const category = liabilityCategories.find(cat => cat.id === categoryId);
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category: categoryId }));
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
      interestRate: 0,
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
            {editingLiability ? 'Edit Liability' : 'Add New Liability'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Selection - Visual Grid (first) */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="grid grid-cols-2 gap-3">
              {liabilityCategories.map(category => {
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

          {/* Basic Information: Name & Outstanding only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Liability Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Home Mortgage"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Outstanding Amount (₹)</label>
              <Input
                type="number"
                value={formData.remainingAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, remainingAmount: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter amount"
                required
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
              {editingLiability ? 'Update Liability' : 'Add Liability'}
            </Button>
          </div>
        </form>
      </Card>
    </Modal>
  );
}