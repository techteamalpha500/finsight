"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/Card";
import { Shield, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { transformRiskLevel, transformRiskScore } from "../domain/languageTransform";
import type { DisplayMode } from "../domain/languageTransform";

interface RiskProfileProps {
  riskLevel?: "Conservative" | "Moderate" | "Aggressive";
  riskScore?: number;
  className?: string;
  compact?: boolean;
  displayMode?: DisplayMode;
}

export default function RiskProfile({ riskLevel, riskScore, className = "", compact = false, displayMode = 'investor' }: RiskProfileProps) {
  if (!riskLevel && !riskScore) return null;

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "Conservative": return <Shield className="w-4 h-4 text-green-600" />;
      case "Moderate": return <Activity className="w-4 h-4 text-yellow-600" />;
      case "Aggressive": return <TrendingUp className="w-4 h-4 text-red-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Conservative": return "text-green-700 bg-green-50 border-green-200";
      case "Moderate": return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "Aggressive": return "text-red-700 bg-red-50 border-red-200";
      default: return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getRiskGradient = (level: string) => {
    switch (level) {
      case "Conservative": return "from-green-50 to-emerald-50 border-green-200";
      case "Moderate": return "from-yellow-50 to-amber-50 border-yellow-200";
      case "Aggressive": return "from-red-50 to-rose-50 border-red-200";
      default: return "from-gray-50 to-slate-50 border-gray-200";
    }
  };

  const getRiskTextColor = (level: string) => {
    switch (level) {
      case "Conservative": return "text-green-800";
      case "Moderate": return "text-yellow-800";
      case "Aggressive": return "text-red-800";
      default: return "text-gray-800";
    }
  };

  const getRiskDescription = (level: string) => {
    if (displayMode === 'advisor') {
      switch (level) {
        case "Conservative": return "Lower risk, stable returns";
        case "Moderate": return "Balanced risk and growth";
        case "Aggressive": return "Higher risk, growth focused";
        default: return "Risk profile";
      }
    } else {
      switch (level) {
        case "Conservative": return "You prefer stable, low-risk investments";
        case "Moderate": return "You're comfortable with some ups and downs for growth";
        case "Aggressive": return "You're comfortable with significant swings for higher growth potential";
        default: return "Your investment style";
      }
    }
  };

  const getScoreDescription = (score: number) => {
    if (displayMode === 'advisor') {
      if (score <= 30) return "Low risk tolerance";
      if (score <= 60) return "Moderate risk tolerance";
      return "High risk tolerance";
    } else {
      if (score <= 30) return "You prefer safety and stability";
      if (score <= 60) return "You're comfortable with moderate risk for growth";
      return "You're comfortable with higher risk for maximum growth potential";
    }
  };

  if (compact) {
    return (
      <div className={`text-center`}>
        <div className="text-sm font-medium text-gray-600 mb-1">
          {displayMode === 'advisor' ? riskLevel : transformRiskLevel(riskLevel || '', displayMode)}
        </div>
        <div className={`text-lg font-bold ${getRiskTextColor(riskLevel || "")}`}>
          {riskScore ? (displayMode === 'advisor' ? `${riskScore}/100` : transformRiskScore(riskScore, displayMode)) : riskLevel}
        </div>
      </div>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getRiskIcon(riskLevel || "")}
          Risk Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {riskLevel && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {displayMode === 'advisor' ? 'Risk Level' : 'Your Investment Style'}
            </span>
            <div className={`px-3 py-1 rounded-full border ${getRiskColor(riskLevel)}`}>
              <span className="text-sm font-medium">
                {displayMode === 'advisor' ? riskLevel : transformRiskLevel(riskLevel, displayMode)}
              </span>
            </div>
          </div>
        )}
        
        {riskScore && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {displayMode === 'advisor' ? 'Risk Score' : 'Your Comfort Level'}
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {displayMode === 'advisor' ? `${riskScore}/100` : transformRiskScore(riskScore, displayMode)}
              </span>
            </div>
            
            {/* Risk Score Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  riskScore <= 30 
                    ? "bg-green-500" 
                    : riskScore <= 60 
                    ? "bg-yellow-500" 
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
              />
            </div>
            
            <p className="text-xs text-gray-500">{getScoreDescription(riskScore)}</p>
          </div>
        )}
        
        {riskLevel && (
          <p className="text-sm text-gray-600 pt-2 border-t">
            {getRiskDescription(riskLevel)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}