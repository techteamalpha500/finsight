import { useState } from "react";
import { Auth } from "aws-amplify";

interface ConfirmationModalProps {
  email: string;
  onClose: () => void;
}

export default function ConfirmationModal({ email, onClose }: ConfirmationModalProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resent, setResent] = useState("");

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setStatus("loading");
    try {
      await Auth.confirmSignUp(email, code);
      setSuccess("Email confirmed! You can now log in.");
      setStatus("success");
    } catch (err: any) {
      setError(err.message || "Confirmation failed");
      setStatus("idle");
    }
  }

  async function handleResend() {
    setError("");
    setResent("");
    try {
      await Auth.resendSignUp(email);
      setResent("A new code has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Could not resend code");
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.15)", zIndex: 20 }}>
      <div className="bg-card text-foreground rounded-2xl shadow-2xl w-full max-w-md mx-2 p-6 sm:p-8 relative flex flex-col border border-border transition-colors">
        <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-2xl" onClick={onClose} aria-label="Close">&times;</button>
        <div className="flex flex-col items-center mb-4">
          <img src="/finsight-logo.png" alt="FinSight Logo" className="w-20 h-20 mb-2" />
          <h2 className="text-xl font-semibold text-indigo-600 mb-2">Confirm Your Email</h2>
          <p className="text-muted-foreground text-sm mb-2 text-center">Enter the 6-digit code sent to <span className="font-medium">{email}</span></p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleConfirm}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={e => setCode(e.target.value)}
            className="h-12 w-full border-b-2 border-border focus:border-[var(--color-ring)] outline-none bg-transparent text-foreground text-base px-0 tracking-widest text-center"
          />
          <button type="submit" className="h-12 rounded-xl text-white font-semibold text-lg bg-gradient-to-r from-emerald-500 to-indigo-600 shadow-md hover:from-emerald-600 hover:to-indigo-700 transition-all">
            Confirm
          </button>
        </form>
        {error && <div className="text-rose-500 text-sm mt-2">{error}</div>}
        {success && <div className="text-emerald-600 text-sm mt-2">{success}</div>}
        {resent && <div className="text-indigo-600 text-sm mt-2">{resent}</div>}
        <button className="mt-4 text-indigo-600 hover:underline text-sm" onClick={handleResend}>
          Resend Code
        </button>
      </div>
    </div>
  );
}
