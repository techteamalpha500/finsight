"use client";
import React, { useState } from "react";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";

import { Calendar, ArrowLeft, ArrowRight, Save } from "lucide-react";
import { REPAYMENT_TYPES, INSTITUTIONS, calculateEMI as calculateEMIUtil, type RepaymentFormData } from "@/lib/repayments";

// RepaymentFormData is now imported from lib/repayments.ts

interface AddRepaymentFormProps {
  selectedType: string;
  onBack: () => void;
  onSave: (data: RepaymentFormData) => void;
  onCancel: () => void;
}

// REPAYMENT_TYPES and INSTITUTIONS are now imported from lib/repayments.ts

export default function AddRepaymentForm({ selectedType, onBack, onSave, onCancel }: AddRepaymentFormProps) {
  const [formData, setFormData] = useState<RepaymentFormData>({
    type: selectedType,
    institution: '',
    principal: 0,
    interest_rate: 0,
    emi_amount: 0,
    tenure_months: 0,
    start_date: '',
    due_date: ''
  });

  const [errors, setErrors] = useState<Partial<RepaymentFormData>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  const handleInputChange = (field: keyof RepaymentFormData, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate end date when start date or tenure changes
      if (field === 'start_date' || field === 'tenure_months') {
        if (newData.start_date && newData.tenure_months) {
          const startDate = new Date(newData.start_date);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + newData.tenure_months);
          newData.due_date = endDate.toISOString().split('T')[0];
        }
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RepaymentFormData> = {};

    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution is required';
    }
    if (!formData.principal || formData.principal <= 0) {
      newErrors.principal = 'Principal amount must be greater than 0';
    }
    if (formData.interest_rate < 0) {
      newErrors.interest_rate = 'Interest rate must be 0 or greater';
    }
    if (formData.emi_amount < 0) {
      newErrors.emi_amount = 'EMI amount cannot be negative';
    }
    if (!formData.tenure_months || formData.tenure_months <= 0) {
      newErrors.tenure_months = 'Tenure must be greater than 0 months';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateEMI = () => {
    if (!formData.principal || !formData.interest_rate || !formData.tenure_months) {
      return;
    }

    setIsCalculating(true);
    
    const emi = calculateEMIUtil(formData.principal, formData.interest_rate, formData.tenure_months);
    setFormData(prev => ({ ...prev, emi_amount: Math.round(emi) }));
    
    setIsCalculating(false);
  };

  const handleSave = () => {
    console.log('Form data before validation:', formData);
    if (validateForm()) {
      console.log('Form is valid, saving:', formData);
      onSave(formData);
    } else {
      console.log('Form validation failed');
    }
  };

  const getTypeLabel = () => {
    return REPAYMENT_TYPES.find(t => t.value === selectedType)?.label || selectedType;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add {getTypeLabel()}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the details of your repayment
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Institution */}
        <div>
          <Label htmlFor="institution">Institution *</Label>
          <Input
            id="institution"
            type="text"
            placeholder="Enter institution name (e.g., HDFC Bank, Local Bank, etc.)"
            value={formData.institution}
            onChange={(e) => {
              console.log('Institution entered:', e.target.value);
              handleInputChange('institution', e.target.value);
            }}
            className={errors.institution ? 'border-red-500' : ''}
          />
          {errors.institution && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.institution}</p>
          )}
        </div>

        {/* Principal Amount */}
        <div>
          <Label htmlFor="principal">Principal Amount (₹) *</Label>
          <Input
            id="principal"
            type="number"
            placeholder="Enter principal amount"
            value={formData.principal || ''}
            onChange={(e) => handleInputChange('principal', parseFloat(e.target.value) || 0)}
            className={errors.principal ? 'border-red-500' : ''}
          />
          {errors.principal && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.principal}</p>
          )}
        </div>

        {/* Interest Rate */}
        <div>
          <Label htmlFor="interest_rate">Interest Rate (% per annum) *</Label>
          <Input
            id="interest_rate"
            type="number"
            step="0.01"
            placeholder="Enter interest rate"
            value={formData.interest_rate || ''}
            onChange={(e) => handleInputChange('interest_rate', parseFloat(e.target.value) || 0)}
            className={errors.interest_rate ? 'border-red-500' : ''}
          />
          {errors.interest_rate && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.interest_rate}</p>
          )}
        </div>

        {/* Tenure */}
        <div>
          <Label htmlFor="tenure_months">Tenure (months) *</Label>
          <Input
            id="tenure_months"
            type="number"
            placeholder="Enter tenure in months"
            value={formData.tenure_months || ''}
            onChange={(e) => handleInputChange('tenure_months', parseInt(e.target.value) || 0)}
            className={errors.tenure_months ? 'border-red-500' : ''}
          />
          {errors.tenure_months && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.tenure_months}</p>
          )}
        </div>

        {/* EMI Amount */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="emi_amount">EMI Amount (₹) *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={calculateEMI}
              disabled={isCalculating || !formData.principal || formData.interest_rate === undefined || !formData.tenure_months}
              className="text-xs"
            >
              {isCalculating ? 'Calculating...' : 'Calculate EMI'}
            </Button>
          </div>
          <Input
            id="emi_amount"
            type="number"
            placeholder="Enter EMI amount (0 for gold loans, etc.)"
            value={formData.emi_amount || ''}
            onChange={(e) => handleInputChange('emi_amount', parseFloat(e.target.value) || 0)}
            className={errors.emi_amount ? 'border-red-500' : ''}
          />
          {errors.emi_amount && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.emi_amount}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Set to 0 for loans without regular EMI (like gold loans)
          </p>
        </div>

        {/* Start Date */}
        <div>
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            className={errors.start_date ? 'border-red-500' : ''}
          />
          {errors.start_date && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.start_date}</p>
          )}
        </div>

        {/* Due Date */}
        <div>
          <Label htmlFor="due_date">Next Due Date *</Label>
          <Input
            id="due_date"
            type="date"
            value={formData.due_date}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
            className={errors.due_date ? 'border-red-500' : ''}
          />
          {errors.due_date && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.due_date}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Auto-calculated from start date + tenure (can be edited)
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Repayment
        </Button>
      </div>
    </div>
  );
}