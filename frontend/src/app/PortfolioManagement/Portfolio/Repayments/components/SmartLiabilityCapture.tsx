"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { 
  Home, 
  Car, 
  CreditCard, 
  Award, 
  Heart, 
  Star, 
  Settings,
  Calculator,
  Calendar,
  DollarSign,
  Percent,
  Info,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  PartyPopper,
  Trophy,
  Crown,
  Gem,
  Coins,
  Banknote,
  PiggyBank,
  Wallet,
  GraduationCap,
  Briefcase,
  ShoppingBag,
  Plane,
  Camera,
  Music,
  Gamepad,
  BookOpen,
  Dumbbell,
  Utensils,
  Coffee,
  Wine,
  ShoppingCart,
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Glasses,
  Shirt,
  Shoe,
  Bag,
  Key,
  Lock,
  Unlock,
  Bell,
  Mail,
  Phone,
  MessageCircle,
  ThumbsUp,
  Heart as HeartIcon,
  Smile,
  Laugh,
  Wink,
  Hug,
  Kiss,
  Clap,
  Wave,
  Peace,
  Victory,
  Fist,
  Point,
  Hand,
  Fingerprint,
  User,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  UserCog,
  UserEdit,
  UserSearch,
  UserShield,
  UserStar,
  UserHeart,
  UserSmile,
  UserCheck2,
  UserPlus2,
  UserMinus2,
  UserX2,
  UserCog2,
  UserEdit2,
  UserSearch2,
  UserShield2,
  UserStar2,
  UserHeart2,
  UserSmile2
} from "lucide-react";
import { UltraSimpleLiabilityInput, LoanCategory } from "../../../domain/Repaymentadvisor/repaymentEngine";

interface SmartLiabilityCaptureProps {
  onSave: (liability: UltraSimpleLiabilityInput) => void;
  onCancel: () => void;
}

export default function SmartLiabilityCapture({ onSave, onCancel }: SmartLiabilityCaptureProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UltraSimpleLiabilityInput>>({
    type: 'home_loan',
    interest_rate: 0,
    institution: '',
    start_date: '',
    original_amount: 0,
    tenure_months: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loanTypes: { 
    value: LoanCategory; 
    label: string; 
    emoji: string; 
    description: string; 
    defaultTenure: number;
    color: string;
    tips: string[];
  }[] = [
    {
      value: 'home_loan',
      label: 'Home Loan',
      emoji: '🏠',
      description: 'Your dream home investment',
      defaultTenure: 180,
      color: 'from-blue-400 to-cyan-500',
      tips: ['Great for building equity', 'Tax benefits available', 'Long-term investment']
    },
    {
      value: 'car_loan',
      label: 'Car Loan',
      emoji: '🚗',
      description: 'Your wheels to freedom',
      defaultTenure: 60,
      color: 'from-green-400 to-emerald-500',
      tips: ['Essential for mobility', 'Depreciating asset', 'Consider used cars']
    },
    {
      value: 'personal_loan',
      label: 'Personal Loan',
      emoji: '💝',
      description: 'Flexible funds for your needs',
      defaultTenure: 36,
      color: 'from-purple-400 to-pink-500',
      tips: ['Unsecured loan', 'Higher interest rates', 'Quick approval']
    },
    {
      value: 'credit_card',
      label: 'Credit Card',
      emoji: '💳',
      description: 'Convenient spending power',
      defaultTenure: 0,
      color: 'from-red-400 to-orange-500',
      tips: ['High interest rates', 'Minimum payments', 'Build credit history']
    },
    {
      value: 'gold_loan',
      label: 'Gold Loan',
      emoji: '🥇',
      description: 'Quick cash against gold',
      defaultTenure: 12,
      color: 'from-yellow-400 to-amber-500',
      tips: ['Secured against gold', 'Quick disbursal', 'Lower interest rates']
    },
    {
      value: 'education_loan',
      label: 'Education Loan',
      emoji: '🎓',
      description: 'Investment in your future',
      defaultTenure: 84,
      color: 'from-indigo-400 to-blue-500',
      tips: ['Long-term investment', 'Tax benefits', 'Career growth']
    }
  ];

  const handleInputChange = (field: keyof UltraSimpleLiabilityInput, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.type) {
        newErrors.type = 'Please select a loan type';
      }
    }

    if (step === 2) {
      if (!formData.institution?.trim()) {
        newErrors.institution = 'Institution name is required';
      }
      if (!formData.start_date) {
        newErrors.start_date = 'Start date is required';
      } else if (new Date(formData.start_date) > new Date()) {
        newErrors.start_date = 'Start date cannot be in the future';
      }
    }

    if (step === 3) {
      if (!formData.original_amount || formData.original_amount <= 0) {
        newErrors.original_amount = 'Original amount must be positive';
      }
      if (!formData.interest_rate || formData.interest_rate <= 0 || formData.interest_rate > 50) {
        newErrors.interest_rate = 'Interest rate must be between 0% and 50%';
      }
    }

    if (step === 4) {
      const selectedType = loanTypes.find(t => t.value === formData.type);
      if (selectedType && selectedType.defaultTenure > 0) {
        if (!formData.tenure_months || formData.tenure_months <= 0) {
          newErrors.tenure_months = 'Tenure is required for this loan type';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSave = () => {
    if (validateStep(currentStep)) {
      const selectedType = loanTypes.find(t => t.value === formData.type);
      const liability: UltraSimpleLiabilityInput = {
        type: formData.type!,
        institution: formData.institution!,
        start_date: formData.start_date!,
        original_amount: formData.original_amount!,
        interest_rate: formData.interest_rate!,
        tenure_months: formData.tenure_months || selectedType?.defaultTenure
      };
      onSave(liability);
    }
  };

  const selectedLoanType = loanTypes.find(t => t.value === formData.type);

  const getStepEmoji = (step: number) => {
    switch (step) {
      case 1: return '🎯';
      case 2: return '📝';
      case 3: return '💰';
      case 4: return '⏰';
      default: return '✨';
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Choose Your Loan Type';
      case 2: return 'Basic Information';
      case 3: return 'Financial Details';
      case 4: return 'Loan Tenure';
      default: return 'Complete';
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium transition-all duration-300 ${
              step <= currentStep 
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-110' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {step < currentStep ? <CheckCircle className="w-6 h-6" /> : step}
            </div>
            {step < 4 && (
              <div className={`w-16 h-2 mx-3 rounded-full transition-all duration-300 ${
                step < currentStep ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-200 dark:bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Header */}
      <div className="text-center space-y-2">
        <div className="text-4xl">{getStepEmoji(currentStep)}</div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{getStepTitle(currentStep)}</h3>
        <p className="text-gray-600 dark:text-gray-300">Step {currentStep} of 4</p>
      </div>

      {/* Step 1: Loan Type Selection */}
      {currentStep === 1 && (
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loanTypes.map((loanType) => (
                <div
                  key={loanType.value}
                  className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    formData.type === loanType.value
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                  onClick={() => handleInputChange('type', loanType.value)}
                >
                  <div className="text-center space-y-4">
                    <div className="text-6xl">{loanType.emoji}</div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-800 dark:text-white">{loanType.label}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{loanType.description}</p>
                    </div>
                    <div className="space-y-2">
                      {loanType.tips.map((tip, index) => (
                        <div key={index} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.type && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-4 text-center">{errors.type}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Basic Information */}
      {currentStep === 2 && (
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="institution" className="text-lg font-semibold">Institution Name *</Label>
              <Input
                id="institution"
                type="text"
                placeholder="Enter institution name (e.g., HDFC Bank, SBI, etc.)"
                value={formData.institution || ''}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                className={`mt-2 text-lg ${errors.institution ? 'border-red-500' : ''}`}
              />
              {errors.institution && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.institution}</p>
              )}
            </div>

            <div>
              <Label htmlFor="start_date" className="text-lg font-semibold">Loan Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`mt-2 text-lg ${errors.start_date ? 'border-red-500' : ''}`}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                When did you start this loan? 📅
              </p>
              {errors.start_date && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.start_date}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Financial Details */}
      {currentStep === 3 && (
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="original_amount" className="text-lg font-semibold">Original Loan Amount *</Label>
              <Input
                id="original_amount"
                type="number"
                placeholder="Enter original loan amount"
                value={formData.original_amount || ''}
                onChange={(e) => handleInputChange('original_amount', parseFloat(e.target.value) || 0)}
                className={`mt-2 text-lg ${errors.original_amount ? 'border-red-500' : ''}`}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                How much did you borrow originally? 💰
              </p>
              {errors.original_amount && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.original_amount}</p>
              )}
            </div>

            <div>
              <Label htmlFor="interest_rate" className="text-lg font-semibold">Interest Rate (%) *</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.1"
                placeholder="Enter annual interest rate"
                value={formData.interest_rate || ''}
                onChange={(e) => handleInputChange('interest_rate', parseFloat(e.target.value) || 0)}
                className={`mt-2 text-lg ${errors.interest_rate ? 'border-red-500' : ''}`}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Annual interest rate (e.g., 8.5 for 8.5%) 📈
              </p>
              {errors.interest_rate && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.interest_rate}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Tenure (if applicable) */}
      {currentStep === 4 && selectedLoanType && selectedLoanType.defaultTenure > 0 && (
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6 space-y-6">
            <div>
              <Label htmlFor="tenure_months" className="text-lg font-semibold">Loan Tenure (months) *</Label>
              <Input
                id="tenure_months"
                type="number"
                placeholder={`Default: ${selectedLoanType.defaultTenure} months`}
                value={formData.tenure_months || ''}
                onChange={(e) => handleInputChange('tenure_months', parseInt(e.target.value) || selectedLoanType.defaultTenure)}
                className={`mt-2 text-lg ${errors.tenure_months ? 'border-red-500' : ''}`}
              />
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Total loan tenure in months (default: {selectedLoanType.defaultTenure} months) ⏰
              </p>
              {errors.tenure_months && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.tenure_months}</p>
              )}
            </div>

            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="text-3xl">🧠</div>
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 text-lg">Smart Calculation</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Our AI will automatically calculate your EMI, outstanding balance, and remaining tenure based on your inputs. 
                    Get ready for some amazing insights! ✨
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Summary (for non-EMI loans) */}
      {currentStep === 4 && selectedLoanType && selectedLoanType.defaultTenure === 0 && (
        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h4 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Ready to Analyze!</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Your {selectedLoanType.label.toLowerCase()} will be analyzed for interest accumulation and optimization opportunities.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Loan Type:</span>
                  <span className="font-medium text-gray-800 dark:text-white">{selectedLoanType.emoji} {selectedLoanType.label}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Institution:</span>
                  <span className="font-medium text-gray-800 dark:text-white">{formData.institution}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Start Date:</span>
                  <span className="font-medium text-gray-800 dark:text-white">{formData.start_date}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Original Amount:</span>
                  <span className="font-medium text-gray-800 dark:text-white">₹{formData.original_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Interest Rate:</span>
                  <span className="font-medium text-gray-800 dark:text-white">{formData.interest_rate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handlePrevious}
          className="px-6 py-3 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </Button>
        
        {currentStep < 4 ? (
          <Button 
            onClick={handleNext} 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleSave} 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            <PartyPopper className="w-4 h-4 mr-2" />
            Add Liability
          </Button>
        )}
      </div>
    </div>
  );
}