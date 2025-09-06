"use client";
import { useState, useEffect } from "react";
import { Amplify, Auth } from "aws-amplify";
import { authConfig } from "../Authentication/amplify-config";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Eye, EyeOff, LogIn, UserPlus, Mail, Lock, User, Sparkles, Shield } from "lucide-react";
import ConfirmationModal from "../Authentication/components/ConfirmationModal";

export default function AuthPage() {
  useEffect(() => {
    Amplify.configure({ Auth: authConfig as any });
  }, []);

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");
    setIsLoggingIn(true);
    try {
      await Auth.signIn(loginEmail, loginPassword);
      setLoginSuccess("Login successful!");
      window.location.href = "/PortfolioManagement/Onboarding";
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
      setIsLoggingIn(false);
    }
  }
  
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess("");
    try {
      await Auth.signUp({ 
        username: signupEmail, 
        password: signupPassword, 
        attributes: { email: signupEmail, name: signupName } 
      });
      setSignupSuccess("Sign up successful! Check your email for a confirmation code.");
      setConfirmEmail(signupEmail);
      setShowConfirm(true);
    } catch (err: any) {
      setSignupError(err.message || "Sign up failed");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-lg border border-border bg-card">
        <CardHeader className="text-center pb-2 px-4 sm:px-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img 
                src="/finsight-logo.png" 
                alt="FinSight Logo" 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-lg" 
              />
              <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
            </div>
          </div>
          
          <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
            Welcome to FinSight
          </CardTitle>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {tab === "login" ? "Login to your account" : "Create your account"}
          </p>
          
          {/* Tab switcher */}
          <div className="flex bg-muted rounded-xl p-1 mt-4 sm:mt-6">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                tab === "login" 
                  ? "bg-background text-foreground shadow-sm border border-border" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Login
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                tab === "signup" 
                  ? "bg-background text-foreground shadow-sm border border-border" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Signup
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {tab === "login" ? (
            isLoggingIn ? (
              <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                <div className="relative">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-muted-foreground mt-3 sm:mt-4 font-medium text-sm sm:text-base">Logging you in...</p>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-10 sm:h-11 text-sm sm:text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error/Success Messages */}
                {loginError && (
                  <div className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs sm:text-sm">
                    {loginError}
                  </div>
                )}
                {loginSuccess && (
                  <div className="p-2.5 sm:p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-xs sm:text-sm">
                    {loginSuccess}
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="md"
                  leftIcon={<LogIn className="w-4 h-4" />}
                  className="w-full"
                >
                  Login
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
              {/* Name Input */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-10 sm:h-11 text-sm sm:text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>
                </div>
              </div>

              {/* Error/Success Messages */}
              {signupError && (
                <div className="p-2.5 sm:p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-xs sm:text-sm">
                  {signupError}
                </div>
              )}
              {signupSuccess && (
                <div className="p-2.5 sm:p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-xs sm:text-sm">
                  {signupSuccess}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                variant="primary" 
                size="md"
                leftIcon={<UserPlus className="w-4 h-4" />}
                className="w-full"
              >
                Create Account
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmationModal 
          email={confirmEmail} 
          onClose={() => setShowConfirm(false)} 
        />
      )}
    </div>
  );
}
