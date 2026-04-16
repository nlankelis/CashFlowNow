import { useState } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import type { AuthResponse, AuthUser } from "../types/auth";

type AuthMode = "login" | "register";

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { email, password }
          : { full_name: name, email, password };

      const response = await axios.post<AuthResponse>(`${API_BASE_URL}${endpoint}`, payload);
      onLoginSuccess(response.data.user);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail ?? "Unable to complete authentication.");
      } else {
        setError("Unable to complete authentication.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-x-3">
            <div className="w-10 h-10 bg-[#ffffff] text-white rounded-2xl flex items-center justify-center text-2xl">
              <img src="/LogoNoBG.png" alt="CashFlowNow" className="h-9 w-auto" />
            </div>
            <span className="heading-font text-4xl font-semibold tracking-tighter text-[#0a2540]">
              CashFlowNow
            </span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex border-b mb-6">
            <button
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 pb-4 text-lg font-medium transition-colors ${
                mode === "login"
                  ? "border-b-4 border-[#00d4c8] text-[#0a2540]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`flex-1 pb-4 text-lg font-medium transition-colors ${
                mode === "register"
                  ? "border-b-4 border-[#00d4c8] text-[#0a2540]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#00d4c8]"
                    placeholder="Alex Rivera"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#00d4c8]"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#00d4c8]"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#00d4c8] hover:bg-[#00b8ae] disabled:opacity-70 text-[#0a2540] font-semibold text-xl py-6 rounded-3xl flex items-center justify-center gap-3 transition-all"
            >
              {isSubmitting ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
              <ArrowRight size={24} />
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-8 text-center">
            <button
              onClick={() =>
                onLoginSuccess({
                  id: 0,
                  full_name: "Demo User",
                  email: "demo@cashflownow.local",
                })
              }
              className="text-[#00d4c8] hover:underline text-sm font-medium"
            >
              Demo Login (skip for presentation)
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Your data is stored in the backend for this MVP.
        </p>
      </div>
    </div>
  );
}
