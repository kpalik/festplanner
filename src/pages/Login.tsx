```
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Login() {
  const [searchParams] = useSearchParams();
  const isInvited = searchParams.get('invited') === 'true';
  const initialEmail = searchParams.get('email') || '';

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { signInWithOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const isInvited = searchParams.get('invited') === 'true';

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await signInWithOtp(email);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    } else {
      setMessage({
        type: 'success',
        text: 'Code sent! Check your email.',
      });
      setStep('otp');
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await verifyOtp(email, otp);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    } else {
      // Login successful
      const redirectPath = searchParams.get('redirect');
      navigate(redirectPath || '/');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md relative group">
        {/* Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>

        <div className="relative bg-slate-900 ring-1 ring-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6">
              <img src="/logo.png" alt="FestPlanner Logo" className="w-24 h-24 rounded-2xl shadow-lg shadow-purple-500/20" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 text-center">
              {step === 'email'
                ? (isInvited ? 'Welcome to FestPlanner!' : 'Welcome to FestPlanner!!!')
                : 'Enter Code'}
            </h1>
            <p className="text-slate-400 text-center">
              {step === 'email'
                ? (isInvited
                  ? "You've been invited to a festival! Register or log in to cast your votes for shows!"
                  : 'Enter your email to receive a login code')
                : `We sent a code to ${ email } `}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="you@example.com"
                  />
                  <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                </div>
              </div>

              {message && (
                <div className={`p - 4 rounded - lg text - sm ${ message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20' } `}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg shadow-lg shadow-purple-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center">Send Code <ArrowRight className="ml-2 w-4 h-4" /></span>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-2">
                  Verification Code
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={8}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition tracking-widest text-center text-lg"
                    placeholder="00000000"
                  />
                  <KeyRound className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                </div>
              </div>

              {message && (
                <div className={`p - 4 rounded - lg text - sm ${ message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20' } `}>
                  {message.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg shadow-lg shadow-purple-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
