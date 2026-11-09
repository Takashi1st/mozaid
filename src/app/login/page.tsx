'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Gavel, 
  Lock, 
  Phone, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const urlError = searchParams.get('error');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    urlError === 'login_required'
      ? 'يرجى تسجيل الدخول أولاً للوصول إلى هذه الصفحة.'
      : urlError === 'unauthorized_admin'
      ? 'عفواً، هذه الصفحة مخصصة لمدير النظام فقط.'
      : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !password) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'فشل تسجيل الدخول. تحقق من البيانات المدخلة.');
        setLoading(false);
        return;
      }

      if (data.user?.role === 'admin') {
        router.push(redirectPath.startsWith('/admin') ? redirectPath : '/admin');
      } else {
        router.push(redirectPath);
      }
      router.refresh();
    } catch {
      setErrorMsg('تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.');
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setPhoneNumber('781345866');
    setPassword('781345866');
    setErrorMsg('');
  };

  return (
    <div className="w-full max-w-md space-y-6">
      
      {/* الشعار والترويسة */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Gavel className="w-6 h-6" />
          </div>
        </Link>
        <h1 className="text-2xl font-black text-white tracking-tight">
          تسجيل الدخول إلى مـزايـد
        </h1>
        <p className="text-xs text-slate-400">
          أدخل رقم هاتفك وكلمة المرور للمتابعة إلى محفظتك وغرف المزايدة
        </p>
      </div>

      {/* بطاقة تسجيل الدخول */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* رسالة الخطأ إن وجدت */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* رقم الهاتف */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              رقم الهاتف اليمني
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                dir="ltr"
                placeholder="78XXXXXXX أو 77XXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition font-mono text-right"
                required
              />
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 block">
                كلمة المرور
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-right"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* زر الدخول */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* تعبئة تجريبية سريعة لحساب الإدارة */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] text-slate-400 block text-center">
            دخول سريع معتمد للاختبار:
          </span>
          <button
            type="button"
            onClick={fillAdminCredentials}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>تعبئة بيانات حساب مدير النظام (781345866)</span>
          </button>
        </div>

        {/* الرابط لإنشاء حساب جديد */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            ليس لديك حساب بعد؟{' '}
            <Link 
              href="/register" 
              className="text-emerald-400 font-bold hover:underline"
            >
              إنشاء حساب جديد مجاناً
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-slate-400 text-sm">جاري التحميل...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
