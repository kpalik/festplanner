import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Mail, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Tent } from 'lucide-react';

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'action'?: string }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function Login() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const isInvited = searchParams.get('invited') === 'true';
  const initialEmail = searchParams.get('email') || '';

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);

  const { signInWithOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<any[]>([]);

  React.useEffect(() => {
    supabase.from('festivals').select('id, name, start_date').order('start_date', { ascending: true }).limit(5)
      .then(({ data }) => setFestivals(data || []));
  }, []);

  React.useEffect(() => {
    if (step === 'email' && turnstileRef.current && !widgetIdRef.current) {
        const renderTurnstile = () => {
            if (window.turnstile && turnstileRef.current) {
                // Clear any existing content to be safe
                turnstileRef.current.innerHTML = '';
                widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
                    sitekey: '0x4AAAAAACLfOboKtS6kl0xJ',
                    callback: (token: string) => setCaptchaToken(token),
                });
            } else {
                setTimeout(renderTurnstile, 100);
            }
        };
        renderTurnstile();
    }

    return () => {
        if (widgetIdRef.current && window.turnstile) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
        }
    };
  }, [step]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Optional: Validate captcha token presence if strictly required on client side
    // if (!captchaToken) {
    //    setMessage({ type: 'error', text: 'Please complete the captcha' });
    //    setLoading(false);
    //    return;
    // }

    const { error } = await signInWithOtp(email, captchaToken || undefined);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
      // Reset captcha on error
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setCaptchaToken(null);
      }
    } else {
      setMessage({
        type: 'success',
        text: t('login.code_sent_success'),
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        
        {/* Left Side: Info */}
        <div className="text-white space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
               <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                  {t('login.intro_title')}
               </h2>
               <p className="text-slate-400 text-lg leading-relaxed">
                  {t('login.intro_desc')}
               </p>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('login.supported_events')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {festivals.map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-purple-500/30 transition-colors">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-500">
                                <Tent className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-sm">{f.name}</div>
                                <div className="text-xs text-slate-500">{new Date(f.start_date).getFullYear()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full max-w-md mx-auto relative group order-1 lg:order-2">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>

            <div className="relative bg-slate-900 ring-1 ring-slate-800 p-8 rounded-2xl shadow-xl">
            <div className="flex flex-col items-center mb-8">
                <div className="mb-6">
                <img src="/logo.png" alt="FestPlanner Logo" className="w-24 h-24 rounded-2xl shadow-lg shadow-purple-500/20" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2 text-center">
                {step === 'email'
                    ? (isInvited ? t('login.welcome') : t('login.welcome_enthusiastic'))
                    : t('login.enter_code')}
                </h1>
                <p className="text-slate-400 text-center text-sm">
                {step === 'email'
                    ? (isInvited
                    ? t('login.invited_msg')
                    : t('login.enter_email_msg'))
                    : t('login.code_sent_msg', { email })}
                </p>
            </div>

            {step === 'email' ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    {t('login.email_label')}
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
                    <div className={`p - 4 rounded - lg text - sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'} `}>
                    {message.text}
                    </div>
                )}

                <div ref={turnstileRef} className="flex justify-center mb-4"></div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg shadow-lg shadow-purple-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="flex items-center">{t('login.send_code_btn')} <ArrowRight className="ml-2 w-4 h-4" /></span>}
                </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-2">
                    {t('login.verification_code_label')}
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
                    <div className={`p - 4 rounded - lg text - sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'} `}>
                    {message.text}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                    {t('login.back_btn')}
                    </button>
                    <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-lg shadow-lg shadow-purple-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('login.verify_login_btn')}
                    </button>
                </div>
                </form>
            )}
            </div>
        </div>
      </div>
    </div>
  );
}
