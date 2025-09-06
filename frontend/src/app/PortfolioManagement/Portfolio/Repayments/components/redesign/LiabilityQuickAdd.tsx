"use client";
import React, { useState } from "react";
import { SmartLiability } from "../../../../../lib/smartRepayments";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Plus, CreditCard, Coins, GraduationCap, User, Building2, ToggleLeft, ToggleRight } from "lucide-react";

type Props = { onAdd: (liability: SmartLiability) => void };

export default function LiabilityQuickAdd({ onAdd }: Props) {
  const [type, setType] = useState<SmartLiability['type']>('loan');
  const [principal, setPrincipal] = useState<number>(0);
  const [interest_rate, setRate] = useState<number>(0);
  const [emi_amount, setEmi] = useState<number>(0);
  const [tenure, setTenure] = useState<number>(0);
  const [institution, setInstitution] = useState<string>('');
  const [hasEmi, setHasEmi] = useState<boolean>(false);

  // Check if loan type typically has EMI
  const isEmiOptional = type === 'credit_card' || type === 'gold_loan';
  const shouldShowEmiFields = !isEmiOptional || hasEmi;

  const getLoanTypeIcon = (loanType: string) => {
    switch (loanType) {
      case 'credit_card': return <CreditCard className="w-4 h-4" />;
      case 'gold_loan': return <Coins className="w-4 h-4" />;
      case 'education_loan': return <GraduationCap className="w-4 h-4" />;
      case 'personal_loan': return <User className="w-4 h-4" />;
      default: return <Building2 className="w-4 h-4" />;
    }
  };

  const create = () => {
    const liab: SmartLiability = {
      id: crypto.randomUUID(),
      type,
      category: type === 'credit_card' ? 'revolving' : 'term',
      institution,
      principal,
      interest_rate,
      emi_amount: shouldShowEmiFields ? emi_amount : 0,
      tenure_months: shouldShowEmiFields ? tenure : 0,
      outstanding_balance: principal,
      start_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
      status: 'active'
    };
    onAdd(liab);
    
    // Reset form
    setPrincipal(0);
    setRate(0);
    setEmi(0);
    setTenure(0);
    setInstitution('');
    setHasEmi(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Add New Debt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Loan Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Debt Type</label>
          <select 
            className="w-full p-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base"
            value={type} 
            onChange={(e) => {
              setType(e.target.value as any);
              setHasEmi(false); // Reset EMI toggle when type changes
            }}
          >
            <option value="loan">Home/Auto Loan (EMI)</option>
            <option value="personal_loan">Personal Loan</option>
            <option value="education_loan">Education Loan</option>
            <option value="credit_card">Credit Card</option>
            <option value="gold_loan">Gold Loan</option>
          </select>
        </div>

        {/* Institution */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Bank/Institution</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base"
              placeholder="e.g., HDFC Bank, SBI, ICICI..."
              value={institution} 
              onChange={(e) => setInstitution(e.target.value)} 
            />
          </div>
        </div>

        {/* Principal/Current Balance and Interest Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {type === 'credit_card' ? 'Current Outstanding (₹)' : 'Original Amount (₹)'}
            </label>
            <input 
              type="number" 
              className="w-full p-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base"
              placeholder="0"
              value={principal || ''} 
              onChange={(e) => setPrincipal(parseFloat(e.target.value || '0'))} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Interest Rate (% per year)</label>
            <input 
              type="number" 
              step="0.1"
              className="w-full p-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base"
              placeholder="0.0"
              value={interest_rate || ''} 
              onChange={(e) => setRate(parseFloat(e.target.value || '0'))} 
            />
          </div>
        </div>

        {/* EMI Toggle for Credit Card and Gold Loan */}
        {isEmiOptional && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
              <div className="flex items-center gap-2">
                {getLoanTypeIcon(type)}
                <span className="text-sm font-medium">Does this have monthly EMI?</span>
              </div>
              <button
                type="button"
                onClick={() => setHasEmi(!hasEmi)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {hasEmi ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    Yes
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    No
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* EMI and Tenure Fields */}
        {shouldShowEmiFields && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Monthly EMI (₹)</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base"
                placeholder="0"
                value={emi_amount || ''} 
                onChange={(e) => setEmi(parseFloat(e.target.value || '0'))} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tenure (Months)</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm sm:text-base"
                placeholder="60"
                value={tenure || ''} 
                onChange={(e) => setTenure(parseInt(e.target.value || '0'))} 
              />
            </div>
          </div>
        )}

        {/* Add Button */}
        <div className="pt-2">
          <Button 
            variant="primary" 
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={create}
            className="w-full"
            disabled={!type || !principal || !interest_rate}
          >
            Add Debt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
