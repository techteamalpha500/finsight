import React from 'react';
import { 
  Sparkles, 
  Calendar, 
  Banknote, 
  Crown, 
  PiggyBank, 
  Timer, 
  BarChart3, 
  Target,
  CheckCircle,
  Clock,
  Coins
} from 'lucide-react';

// Demo component showing key design elements
export default function ModalDesignShowcase() {
  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Smart Repayment Modal - Design Showcase</h1>
        
        {/* Header Design */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">🎨 Beautiful Header Design</h2>
          <div className="relative p-6 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-xl text-white">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Smart Repayment Advisor</h2>
                <p className="text-white/90 text-sm">Optimize your loan repayments with AI-powered insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📋 Strategy Selection Cards</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 rounded-xl border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Monthly Top-up</p>
                  <p className="text-xs text-muted-foreground">Add extra to EMI monthly</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 rounded-xl border-2 border-border bg-card hover:border-purple-300">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Banknote className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Lump Sum</p>
                  <p className="text-xs text-muted-foreground">One-time large payment</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* AI Toggle */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">🤖 AI Advisor Toggle</h2>
          <div className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Crown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">AI Advisor Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Let AI select the optimal loan for maximum savings
                  </p>
                </div>
              </div>
              <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-blue-600">
                <span className="inline-block h-5 w-5 transform rounded-full bg-white translate-x-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">🎉 Success Results Header</h2>
          <div className="text-center space-y-2 p-6 border rounded-xl">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold text-foreground">Optimization Complete!</h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              AI selected your personal loan because it has the highest interest rate (14.5%) and this strategy saves ₹45,000 in interest.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📊 KPI Metric Cards</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <PiggyBank className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  Reduced
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Interest Saved</p>
                <p className="text-lg font-bold text-foreground">₹45,000</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Time Saved</p>
                <p className="text-lg font-bold text-foreground">8 months</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">⏱️ Timeline Comparison</h2>
          <div className="border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              <h3 className="font-semibold">Payoff Timeline Comparison</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Plan</span>
                <span className="font-medium">36 months</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div className="bg-gray-400 dark:bg-gray-500 h-3 rounded-full" style={{ width: '100%' }} />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">With Monthly Top-up</span>
                <span className="font-medium text-green-600 dark:text-green-400">28 months</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: '78%' }} />
              </div>
            </div>

            <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-xl mt-4">
              <p className="text-green-700 dark:text-green-300 font-semibold">
                🎉 You'll finish 8 months earlier!
              </p>
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">💰 Financial Impact Breakdown</h2>
          <div className="border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="w-5 h-5" />
              <h3 className="font-semibold">Financial Impact</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Interest (New)</span>
                <span className="font-medium">₹1,05,000</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Interest Savings</span>
                <span className="font-medium text-green-600">₹45,000</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Monthly Extra</span>
                <span className="font-medium">₹5,000</span>
              </div>
              <div className="flex justify-between py-2 font-semibold text-lg">
                <span>ROI per Rupee</span>
                <span className="text-purple-600">₹0.32</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">🚀 Action Buttons</h2>
          <div className="flex gap-3">
            <button className="flex-1 h-12 rounded-xl border border-border bg-card hover:bg-muted text-foreground">
              Try Another Strategy
            </button>
            <button className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium">
              Apply This Strategy
            </button>
          </div>
        </div>

        {/* Design Principles */}
        <div className="mt-12 p-6 border rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <h2 className="text-xl font-semibold mb-4">✨ Design Principles Applied</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">🎨 Visual Design</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Gradient backgrounds for depth</li>
                <li>• Consistent spacing and typography</li>
                <li>• Color-coded information hierarchy</li>
                <li>• Smooth animations and transitions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🧠 User Experience</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Step-by-step guided flow</li>
                <li>• Clear call-to-action buttons</li>
                <li>• Contextual help and explanations</li>
                <li>• Celebration moments for engagement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
