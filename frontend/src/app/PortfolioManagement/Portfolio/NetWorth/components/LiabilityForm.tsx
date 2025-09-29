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
  X,
  AlertTriangle,
  Info
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
}

const liabilityCategories = [
  {
    id: 'mortgage',
    name: 'Mortgage',
    icon: <Home className="w-5 h-5" />,
    types: [
      { id: 'home-mortgage', name: 'Home Mortgage', icon: <Home className="w-4 h-4" /> },
      { id: 'rental-mortgage', name: 'Rental Property Mortgage', icon: <Building2 className="w-4 h-4" /> },
      { id: 'commercial-mortgage', name: 'Commercial Mortgage', icon: <Building2 className="w-4 h-4" /> }
    ]
  },
  {
    id: 'credit-cards',
    name: 'Credit Cards',
    icon: <CreditCard className="w-5 h-5" />,
    types: [
      { id: 'credit-card', name: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'store-card', name: 'Store Card', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'business-card', name: 'Business Credit Card', icon: <CreditCard className="w-4 h-4" /> }
    ]
  },
  {
    id: 'student-loans',
    name: 'Student Loans',
    icon: <Landmark className="w-5 h-5" />,
    types: [
      { id: 'federal-student-loan', name: 'Federal Student Loan', icon: <Landmark className="w-4 h-4" /> },
      { id: 'private-student-loan', name: 'Private Student Loan', icon: <Landmark className="w-4 h-4" /> },
      { id: 'parent-plus-loan', name: 'Parent PLUS Loan', icon: <Landmark className="w-4 h-4" /> }
    ]
  },
  {
    id: 'auto-loans',
    name: 'Auto Loans',
    icon: <Car className="w-5 h-5" />,
    types: [
      { id: 'car-loan', name: 'Car Loan', icon: <Car className="w-4 h-4" /> },
      { id: 'motorcycle-loan', name: 'Motorcycle Loan', icon: <Car className="w-4 h-4" /> },
      { id: 'boat-loan', name: 'Boat Loan', icon: <Car className="w-4 h-4" /> },
      { id: 'rv-loan', name: 'RV Loan', icon: <Car className="w-4 h-4" /> }
    ]
  },
  {
    id: 'personal-loans',
    name: 'Personal Loans',
    icon: <CreditCard className="w-5 h-5" />,
    types: [
      { id: 'personal-loan', name: 'Personal Loan', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'medical-loan', name: 'Medical Loan', icon: <Landmark className="w-4 h-4" /> },
      { id: 'wedding-loan', name: 'Wedding Loan', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'home-improvement', name: 'Home Improvement Loan', icon: <Home className="w-4 h-4" /> }
    ]
  },
  {
    id: 'business-loans',
    name: 'Business Loans',
    icon: <Building2 className="w-5 h-5" />,
    types: [
      { id: 'business-loan', name: 'Business Loan', icon: <Building2 className="w-4 h-4" /> },
      { id: 'working-capital', name: 'Working Capital', icon: <Building2 className="w-4 h-4" /> },
      { id: 'equipment-loan', name: 'Equipment Loan', icon: <Building2 className="w-4 h-4" /> },
      { id: 'business-line-credit', name: 'Business Line of Credit', icon: <CreditCard className="w-4 h-4" /> }
    ]
  },
  {
    id: 'other-debts',
    name: 'Other Debts',
    icon: <DollarSign className="w-5 h-5" />,
    types: [
      { id: 'tax-debt', name: 'Tax Debt', icon: <DollarSign className="w-4 h-4" /> },
      { id: 'legal-debt', name: 'Legal Debt', icon: <DollarSign className="w-4 h-4" /> },
      { id: 'family-loan', name: 'Family Loan', icon: <DollarSign className="w-4 h-4" /> },
      { id: 'other', name: 'Other', icon: <DollarSign className="w-4 h-4" /> }
    ]
  }
];

const loanTypeInfo = {
  'EMI': {
    title: 'EMI Loan',
    description: 'Fixed monthly payments with principal and interest',
    features: ['Fixed monthly payments', 'Principal + Interest', 'Defined tenure', 'Prepayment options']
  },
  'Regular': {
    title: 'Regular Debt',
    description: 'Variable payments or interest-only loans',
    features: ['Variable payments', 'Interest-only options', 'Flexible repayment', 'Higher interest rates']
  }
};

export default function LiabilityForm({ isOpen, onClose, onSave, editingLiability }: LiabilityFormProps) {
  const [formData, setFormData] = useState<Partial<Liability>>({
    name: '',
    category: '',
    type: 'EMI',
    principalAmount: 0,
    remainingAmount: 0,
    monthlyPayment: 0,
    interestRate: 0,
    startDate: '',
    endDate: '',
    remainingMonths: 0,
    totalMonths: 0,
    description: ''
  });

  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showCalculations, setShowCalculations] = useState(false);

  React.useEffect(() => {
    if (editingLiability) {
      setFormData(editingLiability);
      const category = liabilityCategories.find(cat => cat.id === editingLiability.category);
      setSelectedCategory(category);
    } else {
      setFormData({
        name: '',
        category: '',
        type: 'EMI',
        principalAmount: 0,
        remainingAmount: 0,
        monthlyPayment: 0,
        interestRate: 0,
        startDate: '',
        endDate: '',
        remainingMonths: 0,
        totalMonths: 0,
        description: ''
      });
      setSelectedCategory(null);
    }
  }, [editingLiability, isOpen]);

  const handleCategoryChange = (categoryId: string) => {
    const category = liabilityCategories.find(cat => cat.id === categoryId);
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category: categoryId, type: 'EMI' }));
  };

  const calculateEMI = () => {
    if (!formData.principalAmount || !formData.interestRate || !formData.totalMonths) return 0;
    
    const principal = formData.principalAmount;
    const rate = formData.interestRate / 100 / 12; // Monthly rate
    const months = formData.totalMonths;
    
    if (rate === 0) return principal / months;
    
    const emi = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    return Math.round(emi);
  };

  const calculateRemainingAmount = () => {
    if (!formData.principalAmount || !formData.monthlyPayment || !formData.interestRate) return 0;
    
    const principal = formData.principalAmount;
    const monthlyPayment = formData.monthlyPayment;
    const rate = formData.interestRate / 100 / 12;
    const monthsPaid = (formData.totalMonths || 0) - (formData.remainingMonths || 0);
    
    if (rate === 0) return Math.max(0, principal - (monthlyPayment * monthsPaid));
    
    let remaining = principal;
    for (let i = 0; i < monthsPaid; i++) {
      const interest = remaining * rate;
      const principalPayment = monthlyPayment - interest;
      remaining -= principalPayment;
    }
    
    return Math.max(0, remaining);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.type || !formData.remainingAmount || !formData.monthlyPayment) {
      return;
    }

    const liability: Liability = {
      id: editingLiability?.id || Date.now().toString(),
      name: formData.name,
      category: formData.category,
      type: formData.type,
      principalAmount: formData.principalAmount || 0,
      remainingAmount: formData.remainingAmount,
      monthlyPayment: formData.monthlyPayment,
      interestRate: formData.interestRate || 0,
      startDate: formData.startDate,
      endDate: formData.endDate,
      remainingMonths: formData.remainingMonths,
      totalMonths: formData.totalMonths,
      description: formData.description
    };

    onSave(liability);
    onClose();
  };

  const selectedCategoryData = liabilityCategories.find(cat => cat.id === formData.category);
  const calculatedEMI = calculateEMI();
  const calculatedRemaining = calculateRemainingAmount();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Card className="w-full max-w-3xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {editingLiability ? 'Edit Liability' : 'Add New Liability'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Information */}
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
                placeholder="Current outstanding amount"
                required
              />
            </div>
          </div>

          {/* Category Selection - Visual Grid */}
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

          {/* Loan Type - Visual Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2">Loan Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['EMI','Regular'] as const).map((t) => {
                const isSelected = formData.type === t;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      isSelected ? 'border-purple-600 bg-purple-50' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium">{loanTypeInfo[t].title}</div>
                    <div className="text-xs text-muted-foreground">{loanTypeInfo[t].description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Essential Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Monthly Payment (₹)</label>
              <Input
                type="number"
                value={formData.monthlyPayment}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyPayment: parseFloat(e.target.value) || 0 }))}
                placeholder="Monthly payment amount"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Interest Rate (% p.a.)</label>
              <Input
                type="number"
                step="0.1"
                value={formData.interestRate}
                onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                placeholder="Annual interest rate"
              />
            </div>
          </div>

          {/* Optional Fields - Collapsible */}
          <div className="space-y-3">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                Additional Details (Optional)
              </summary>
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                {/* EMI Specific Fields */}
                {formData.type === 'EMI' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Principal Amount (₹)</label>
                      <Input
                        type="number"
                        value={formData.principalAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, principalAmount: parseFloat(e.target.value) || 0 }))}
                        placeholder="Original loan amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Total Tenure (months)</label>
                      <Input
                        type="number"
                        value={formData.totalMonths}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalMonths: parseInt(e.target.value) || 0 }))}
                        placeholder="Total loan tenure"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Remaining Tenure (months)</label>
                      <Input
                        type="number"
                        value={formData.remainingMonths}
                        onChange={(e) => setFormData(prev => ({ ...prev, remainingMonths: parseInt(e.target.value) || 0 }))}
                        placeholder="Remaining months"
                      />
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  {formData.type === 'EMI' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">End Date</label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
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
                    placeholder="Additional details about this liability"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </details>
          </div>

          {/* High Interest Warning */}
          {formData.interestRate && formData.interestRate > 15 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">High Interest Rate</p>
                <p className="text-sm text-yellow-700">
                  This debt has a high interest rate ({formData.interestRate}%). Consider prioritizing repayment.
                </p>
              </div>
            </div>
          )}

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