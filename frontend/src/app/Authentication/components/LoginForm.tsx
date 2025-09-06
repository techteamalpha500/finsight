import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { LogIn } from "lucide-react";
import { Button } from "../../components/Button";
import "./floating-label.css";

interface LoginFormProps {
  email: string;
  password: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  success: string;
}

export default function LoginForm({ email, password, onEmailChange, onPasswordChange, onSubmit, error, success }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form className="flex flex-col gap-6 text-foreground" autoComplete="off" onSubmit={onSubmit}>
      <div className="relative overflow-hidden">
        <input
          type="email"
          id="login-email"
          name="email"
          required
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          className={`peer h-12 w-full border-b-2 border-border focus:border-[var(--color-ring)] outline-none bg-transparent transition-all text-foreground text-base px-0 ${email ? 'not-empty' : ''}`}
          placeholder=" "
        />
        <label
          htmlFor="login-email"
          className={`absolute left-0 top-3 text-muted-foreground text-base transition-all pointer-events-none
            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
            peer-focus:-top-4 peer-focus:text-sm peer-focus:text-[color:var(--color-ring)]
            ${email ? 'not-empty-label' : ''}`}
        >
          Email address
        </label>
      </div>
      <div className="relative overflow-hidden">
        <input
          type={showPassword ? "text" : "password"}
          id="login-password"
          name="password"
          required
          value={password}
          onChange={e => onPasswordChange(e.target.value)}
          className={`peer h-12 w-full border-b-2 border-border focus:border-[var(--color-ring)] outline-none bg-transparent transition-all text-foreground text-base px-0 ${password ? 'not-empty' : ''}`}
          placeholder=" "
        />
        <label
          htmlFor="login-password"
          className={`absolute left-0 top-3 text-muted-foreground text-base transition-all pointer-events-none
            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
            peer-focus:-top-4 peer-focus:text-sm peer-focus:text-[color:var(--color-ring)]
            ${password ? 'not-empty-label' : ''}`}
        >
          Password
        </label>
        <button
          type="button"
          className="absolute right-2 top-3 flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground focus:outline-none"
          tabIndex={-1}
          onClick={() => setShowPassword(v => !v)}
        >
          {showPassword ? (
            <EyeIcon className="w-6 h-6 mx-auto my-auto" />
          ) : (
            <EyeSlashIcon className="w-6 h-6 mx-auto my-auto" />
          )}
        </button>
      </div>
      {error && <div className="text-rose-500 text-sm mb-2">{error}</div>}
      {success && <div className="text-emerald-600 text-sm mb-2">{success}</div>}
      <Button
        type="submit"
        variant="outline"
        size="sm"
        leftIcon={<LogIn className="h-4 w-4" />}
        className="mt-2"
      >
        Login
      </Button>
    </form>
  );
}
