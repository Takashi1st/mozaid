'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Gavel, 
  Lock, 
  Phone, 
  User, 
  MapPin, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

const YEMEN_CITIES = [
  'صنعاء',
  'عدن',
  'تعز',
  'حضرموت (المكلا)',
  'حضرموت (سيئون)',
  'مأرب',
  'الحديدة',
  'إب',
  'ذمار',
  'صعدة',
  'شبوة',
  'المهرة',
  'لحج',
  'أبين',
];

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('صنعاء');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !phoneNumber.trim() || !password) {
      setErrorMsg('يرجى ملء كافة الحقول الأساسية.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('يجب ألا تقل كلمة المرور عن 6 خانات.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phoneNumber,
          city,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر إنشاء الحساب. تأكد من البيانات المدخلة.');
        setLoading(false);
        return;
      }

      // الانتقال مباشرة إلى الصفحة الرئيسية
      router.push('/?registered=true');
      router.refresh();
    } catch (err) {
      setErrorMsg('تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* الترويسة والشعار */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Gavel className="w-6 h-6" />
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight">
            إنشاء حساب جديد في مـزايـد
          </h1>
          <p className="text-xs text-slate-400">
            انضم لمنصة المزادات الحية والضمان المالي الأولى في اليمن
          </p>
        </div>

        {/* بطاقة التسجيل */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* الاسم الكامل */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                الاسم الكامل أو اسم المؤسسة / المعرض
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="مثال: م. أحمد الحاشدي"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  required
                />
              </div>
            </div>

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
                  placeholder="77XXXXXXX أو 73XXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition font-mono text-right"
                  required
                />
              </div>
            </div>

            {/* المحافظة */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                المحافظة
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition appearance-none cursor-pointer"
                >
                  {YEMEN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* كلمة المرور */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder="لا تقل عن 6 أحرف"
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

            {/* تأكيد كلمة المرور */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                تأكيد كلمة المرور
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder="أعد إدخال كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition text-right"
                required
              />
            </div>

            {/* زر إنشاء الحساب */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>إنشاء الحساب والمحفظة</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* الرابط لتسجيل الدخول */}
          <div className="text-center pt-2 border-t border-slate-800/80">
            <p className="text-xs text-slate-400">
              لديك حساب بالفعل؟{' '}
              <Link 
                href="/login" 
                className="text-emerald-400 font-bold hover:underline"
              >
                تسجيل الدخول هنا
              </Link>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
