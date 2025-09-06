import React from 'react';
import { 
  Calendar, 
  CreditCard, 
  Coins, 
  Home, 
  Car,
  GraduationCap,
  Clock,
  Calculator,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export default function LoanTypeGuide() {
  const loanTypes = [
    {
      type: 'EMI Loans',
      icon: <Home className="w-6 h-6" />,
      examples: ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan'],
      calculation: 'Auto-calculated from start date + tenure',
      features: [
        'Fixed EMI amount',
        'Predetermined tenure',
        'Interest calculated on reducing balance',
        'Months paid = Current Date - Start Date'
      ],
      color: 'blue'
    },
    {
      type: 'Credit Card',
      icon: <CreditCard className="w-6 h-6" />,
      examples: ['Credit Card Outstanding'],
      calculation: 'Based on payment history',
      features: [
        'No fixed tenure (revolving credit)',
        'Daily compounding interest',
        'Minimum payment requirements',
        'Months active = Account opening date'
      ],
      color: 'red'
    },
    {
      type: 'Gold Loan',
      icon: <Coins className="w-6 h-6" />,
      examples: ['Gold Loan', 'Jewelry Loan'],
      calculation: 'Simple or compound interest',
      features: [
        'Short tenure (typically 6-12 months)',
        'Can be renewed/extended',
        'Interest-only or bullet payment',
        'Months calculated from loan date'
      ],
      color: 'yellow'
    }
  ];

  const getColorClasses = (color: string) => {
    const classes = {
      blue: {
        border: 'border-blue-200 dark:border-blue-800',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        icon: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-100 dark:bg-blue-900/50'
      },
      red: {
        border: 'border-red-200 dark:border-red-800',
        bg: 'bg-red-50 dark:bg-red-950/30',
        icon: 'text-red-600 dark:text-red-400',
        iconBg: 'bg-red-100 dark:bg-red-900/50'
      },
      yellow: {
        border: 'border-yellow-200 dark:border-yellow-800',
        bg: 'bg-yellow-50 dark:bg-yellow-950/30',
        icon: 'text-yellow-600 dark:text-yellow-400',
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/50'
      }
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Smart Loan Type Detection & Calculation
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our Smart Repayment Advisor automatically detects different loan types and calculates 
            months paid based on the loan characteristics and start date.
          </p>
        </div>

        {/* Auto-Calculation Process */}
        <div className="mb-12 p-6 border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Calculator className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Automatic Calculation Process</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 dark:text-green-400 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Detect Loan Type</h3>
              <p className="text-sm text-muted-foreground">
                Identify if it's EMI-based, Credit Card, or Gold Loan
              </p>
            </div>
            
            <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 dark:text-green-400 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Calculate Elapsed Time</h3>
              <p className="text-sm text-muted-foreground">
                Use start date and current date to determine months paid
              </p>
            </div>
            
            <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 dark:text-green-400 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Optimize Strategy</h3>
              <p className="text-sm text-muted-foreground">
                Apply loan-specific calculations for accurate savings
              </p>
            </div>
          </div>
        </div>

        {/* Loan Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loanTypes.map((loan, index) => {
            const colorClasses = getColorClasses(loan.color);
            
            return (
              <div key={index} className={`border-2 rounded-xl p-6 ${colorClasses.border} ${colorClasses.bg}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${colorClasses.iconBg}`}>
                    <div className={colorClasses.icon}>{loan.icon}</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{loan.type}</h3>
                    <p className="text-sm text-muted-foreground">{loan.calculation}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Examples:</h4>
                    <div className="flex flex-wrap gap-2">
                      {loan.examples.map((example, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-white/50 dark:bg-gray-900/50 rounded-full text-muted-foreground">
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Key Features:</h4>
                    <ul className="space-y-1">
                      {loan.features.map((feature, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-xs mt-1.5">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Special Cases */}
        <div className="mt-12 p-6 border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Special Handling Cases</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Credit Cards without EMI</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                  <span>Uses account opening date as start reference</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                  <span>Calculates based on payment history and balance changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                  <span>Higher impact due to compounding daily interest</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Gold Loans without Fixed EMI</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                  <span>Often interest-only payments during tenure</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                  <span>Principal + interest due at maturity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                  <span>Prepayment reduces total interest burden significantly</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-12 text-center p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-foreground">Why Auto-Calculation Matters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Accurate Timeline</h3>
              <p className="text-sm text-muted-foreground">
                Precise calculation of remaining tenure based on actual payments made
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mx-auto mb-3">
                <Calculator className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Smart Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                AI considers loan type and payment history for optimal strategies
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Maximized Savings</h3>
              <p className="text-sm text-muted-foreground">
                Different calculation methods for each loan type ensure maximum benefit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
