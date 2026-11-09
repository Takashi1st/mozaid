'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  UserCheck, 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Camera, 
  FileBadge, 
  Lock, 
  Award, 
  ArrowRight,
  Sparkles,
  PhoneCall,
  Rocket,
  User
} from 'lucide-react';
import { YEMEN_CITIES } from '@/lib/constants';

export default function KycVerificationPage() {
  // مراحل التوثيق
  const [currentStep, setCurrentStep] = useState<number>(2); // الخطوة 2: رفع البطاقة الشخصية
  
  // مدخلات التوثيق بالبطاقة الوطنية
  const [fullName, setFullName] = useState('جمال عبده أحمد القدسي');
  const [nationalIdNumber, setNationalIdNumber] = useState('01010045892');
  const [city, setCity] = useState('صنعاء');
  const [idFrontUploaded, setIdFrontUploaded] = useState(true);
  const [idBackUploaded, setIdBackUploaded] = useState(true);
  const [selfieUploaded, setSelfieUploaded] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [aiOcrConfidence, setAiOcrConfidence] = useState<number>(98.4);

  const handleSubmitKyc = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 700);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام التحقق وتوثيق الهوية الرقمية (KYC & Trust Subsystem)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            توثيق الهوية الوطنية وشارات الثقة
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            توثيق حسابك بالبطاقة الشخصية اليمنية يمنحك شارة "بائع ومورد موثوق" ويؤهلك للمزايدة والمناقصات الكبرى دون قيود.
          </p>
        </div>

        <Link
          href="/wallet"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
        >
          <span>الذهاب للمحفظة</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* شريط مستويات التوثيق الثلاثة الرسمية */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* المستوى 1: المستخدم العادي (رقم الهاتف) */}
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600/70 text-emerald-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold bg-emerald-900/90 text-emerald-200 px-2 py-0.5 rounded-full">المستوى 1</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="font-bold text-sm text-white">المستخدم العادي (الهاتف)</h4>
          <p className="text-[11px] text-slate-300">مسجل برقم الهاتف ومفعل برمز SMS OTP</p>
          <div className="text-[10px] text-emerald-400 pt-1 border-t border-emerald-900/60">
            الصلاحية: تصفح وحفظ المزادات والمزايدة العادية
          </div>
        </div>

        {/* المستوى 2: موثق بالهوية الحية */}
        <div className="p-4 rounded-2xl bg-slate-900 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">المستوى 2</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">أنت هنا (مطلوب)</span>
          </div>
          <h4 className="font-bold text-sm text-white">موثق بالهوية الحية</h4>
          <p className="text-[11px] text-slate-400">البطاقة الشخصية بالرقم الوطني + سيلفي حي</p>
          <div className="text-[10px] text-slate-300 pt-1 border-t border-slate-800">
            الصلاحية: إنشاء وطرح مزادات، والمناقصات الكبرى
          </div>
        </div>

        {/* المستوى 3: تاجر موثوق (10 صفقات بيع أو شراء) */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-500/40 space-y-2 text-slate-400">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full">المستوى 3</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <h4 className="font-bold text-sm text-amber-300">عضو / تاجر موثوق (ذهبي)</h4>
          <p className="text-[11px] text-slate-300">يُمنح تلقائياً عند إتمام 10 صفقات (بيع أو شراء)</p>
          <div className="text-[10px] text-amber-400/90 pt-1 border-t border-slate-800">
            الصلاحية: شارة ذهبية، أولوية العرض، ومزايدة بلا عربون
          </div>
        </div>
      </div>

      {isSubmitted ? (
        <div className="rounded-3xl bg-slate-900 border border-emerald-500 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-white">تم استلام وثائق هويتك بنجاح!</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              قام نظام الذكاء الاصطناعي باستخراج بيانات بطاقتك بنسبة تطابق عالية ({aiOcrConfidence}%)، وجارٍ المراجعة النهائية من قبل مسؤول الامتثال خلال ساعتين.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 max-w-sm mx-auto text-xs space-y-1 text-slate-400">
            <div>الاسم الرباعي: <strong className="text-white">{fullName}</strong></div>
            <div>الرقم الوطني: <strong className="text-emerald-400 font-mono">{nationalIdNumber}</strong></div>
            <div>المحافظة: <strong className="text-slate-200">{city}</strong></div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/auctions"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition"
            >
              تصفح المزادات الحية
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitKyc} className="space-y-8">
          
          {/* قسم استخراج وتدقيق البطاقة الشخصية */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">بيانات الهوية الوطنية (National ID Card)</h3>
              </div>
              <span className="text-xs text-emerald-400 font-mono">
                AI OCR Confidence: {aiOcrConfidence}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">الاسم الرباعي الكامل كما في البطاقة:</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">الرقم الوطني (11 رقماً):</label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={nationalIdNumber}
                  onChange={(e) => setNationalIdNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">المحافظة / مكان الإصدار:</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  {YEMEN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">تاريخ الميلاد:</label>
                <input
                  type="text"
                  defaultValue="1989-05-14"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 font-mono outline-none"
                />
              </div>
            </div>

            {/* رفع وجهي البطاقة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* وجه البطاقة الأمامي */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">وجه البطاقة الأمامي (صورة واضحة):</label>
                <div 
                  onClick={() => setIdFrontUploaded(true)}
                  className="p-5 rounded-2xl bg-slate-950 border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 transition text-center cursor-pointer space-y-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white block">yemen_id_front_scan.jpg</span>
                  <span className="text-[11px] text-emerald-400 block font-mono">تم استخراج النصوص آلياً (OCR Valid)</span>
                </div>
              </div>

              {/* ظهر البطاقة الخلفي */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">ظهر البطاقة الخلفي (بيانات العنوان):</label>
                <div 
                  onClick={() => setIdBackUploaded(true)}
                  className="p-5 rounded-2xl bg-slate-950 border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 transition text-center cursor-pointer space-y-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white block">yemen_id_back_scan.jpg</span>
                  <span className="text-[11px] text-emerald-400 block font-mono">مكتمل ومقروء بوضوح</span>
                </div>
              </div>
            </div>
          </div>

          {/* صورة السيلفي والتحقق الحي (Selfie Liveness) */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">التقاط صورة سيلفي حية (Liveness Facial Match)</h3>
              </div>
              <span className="text-xs text-amber-300 font-mono">مطابقة الوجه 97.4%</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              لمنع انتحال الشخصيات، نقوم بمقارنة ملامح الوجه في صورة السيلفي الحية مع الصورة الشخصية المطبوعة على بطاقتك الوطنية.
            </p>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-inner">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">تم التقاط صورة السيلفي الحية</span>
                  <span className="text-[11px] text-emerald-400 font-mono">Liveness Confirmed: True</span>
                </div>
              </div>

              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                إعادة التقاط الصورة
              </button>
            </div>
          </div>

          {/* إقرار الخصوصية وزر الإرسال */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                تُحفظ وثائق الهوية في حاوية مشفرة ومحمية وفق معايير الخصوصية المصرفية.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition shrink-0 disabled:opacity-50 flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>إرسال وثائق التوثيق للاعتماد</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
