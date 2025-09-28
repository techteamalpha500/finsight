"use client";
import React, { useState } from "react";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import { Input } from "@/app/components/Input";
import { Select } from "@/app/components/Select";
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
    id: 'real-estate',
    name: 'Real Estate',
    icon: <Home className="w-5 h-5" />,
    types: [
      { id: 'home-loan', name: 'Home Loan', icon: <Home className="w-4 h-4" /> },
      { id: 'plot-loan', name: 'Plot Loan', icon: <Building2 className="w-4 h-4" /> },
      { id: 'construction-loan', name: 'Construction Loan', icon: <Building2 className="w-4 h-4" /> }
    ]
  },
  {
    id: 'personal',
    name: 'Personal',
    icon: <CreditCard className="w-5 h-5" />,
    types: [
      { id: 'personal-loan', name: 'Personal Loan', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'credit-card', name: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'education-loan', name: 'Education Loan', icon: <Landmark className="w-4 h-4" /> },
      { id: 'medical-loan', name: 'Medical Loan', icon: <Landmark className="w-4 h-4" /> },
      { id: 'wedding-loan', name: 'Wedding Loan', icon: <CreditCard className="w-4 h-4" /> }
    ]
  },
  {
    id: 'vehicle',
    name: 'Vehicle',
    icon: <Car className="w-5 h-5" />,
    types: [
      { id: 'car-loan', name: 'Car Loan', icon: <Car className="w-4 h-4" /> },
      { id: 'bike-loan', name: 'Bike Loan', icon: <Car className="w-4 h-4" /> },
      { id: 'commercial-vehicle', name: 'Commercial Vehicle Loan', icon: <Car className="w-4 h-4" /> }
    ]
  },
  {
    id: 'business',
    name: 'Business',
    icon: <Building2 className="w-5 h-5" />,
    types: [
      { id: 'business-loan', name: 'Business Loan', icon: <Building2 className="w-4 h-4" /> },
      { id: 'working-capital', name: 'Working Capital', icon: <Building2 className="w-4 h-4" /> },
      { id: 'equipment-loan', name: 'Equipment Loan', icon: <Building2 className="w-4 h-4" /> },
      { id: 'overdraft', name: 'Overdraft', icon: <CreditCard className="w-4 h-4" /> }
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Liability Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Liability Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Home Loan, Credit Card Debt"
              required
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <div className="grid grid-cols-2 gap-3">
              {liabilityCategories.map(category => (
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
          <div>
            <label className="block text-sm font-medium mb-2">Loan Type</label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(loanTypeInfo).map(([type, info]) => (
                <div key={type}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type as 'EMI' | 'Regular' }))}
                    className={`w-full p-4 border rounded-lg text-left transition-colors ${
                      formData.type === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {type === 'EMI' ? <Calculator className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                      <span className="font-medium">{info.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Type Selection */}
          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium mb-2">Specific Type</label>
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

          {/* EMI vs Regular specific fields */}
          {formData.type === 'EMI' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Principal Amount (₹)</label>
                  <Input
                    type="number"
                    value={formData.principalAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, principalAmount: parseFloat(e.target.value) || 0 }))}
                    placeholder="Original loan amount"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Total Tenure (months)</label>
                  <Input
                    type="number"
                    value={formData.totalMonths}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalMonths: parseInt(e.target.value) || 0 }))}
                    placeholder="Total loan tenure"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Remaining Tenure (months)</label>
                  <Input
                    type="number"
                    value={formData.remainingMonths}
                    onChange={(e) => setFormData(prev => ({ ...prev, remainingMonths: parseInt(e.target.value) || 0 }))}
                    placeholder="Remaining months"
                  />
                </div>
              </div>

              {/* EMI Calculator */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-800">EMI Calculator</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCalculations(!showCalculations)}
                  >
                    {showCalculations ? 'Hide' : 'Show'} Calculations
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-700">Calculated EMI</p>
                    <p className="text-lg font-bold text-blue-800">
                      ₹{calculatedEMI.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Remaining Amount</p>
                    <p className="text-lg font-bold text-blue-800">
                      ₹{calculatedRemaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                {showCalculations && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <p className="text-sm text-gray-600 mb-2">Calculation Details:</p>
                    <div className="text-xs space-y-1">
                      <p>Principal: ₹{formData.principalAmount?.toLocaleString()}</p>
                      <p>Rate: {formData.interestRate}% p.a. ({(formData.interestRate || 0) / 12}% monthly)</p>
                      <p>Tenure: {formData.totalMonths} months</p>
                      <p>EMI Formula: P × r × (1+r)^n / ((1+r)^n - 1)</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Monthly Payment (₹)</label>
                <Input
                  type="number"
                  value={formData.monthlyPayment}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyPayment: parseFloat(e.target.value) || 0 }))}
                  placeholder="Actual monthly EMI"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use calculated EMI or enter actual EMI if different
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Remaining Amount (₹)</label>
                <Input
                  type="number"
                  value={formData.remainingAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, remainingAmount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Outstanding amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use calculated amount or enter actual outstanding
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium mb-2">Monthly Payment (₹)</label>
                <Input
                  type="number"
                  value={formData.monthlyPayment}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyPayment: parseFloat(e.target.value) || 0 }))}
                  placeholder="Monthly payment amount"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum payment or planned payment amount
                </p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            {formData.type === 'EMI' && (
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
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
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this liability"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
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