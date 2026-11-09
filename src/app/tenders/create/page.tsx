'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  Clock, 
  DollarSign, 
  Layers, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  Loader2,
  Download,
  Rocket
} from 'lucide-react';
import { generateTenderRFP } from '@/lib/gemini';
import { YEMEN_CITIES } from '@/lib/constants';
import { TenderRFPResult } from '@/types';

export default function CreateTenderPage() {
  // مدخلات التوليد بالذكاء الاصطناعي
  const [rfpTitle, setRfpTitle] = useState('');
  const [rawRequirements, setRawRequirements] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // حقول الكراسة والمناقصة القابلة للتعديل
  const [issuerOrg, setIssuerOrg] = useState('مؤسسة الصالح التجارية والصناعية');
  const [category, setCategory] = useState('طاقة ومولدات');
  const [city, setCity] = useState('صنعاء');
  const [currency, setCurrency] = useState<'USD' | 'YER' | 'SAR'>('USD');
  const [budgetCap, setBudgetCap] = useState<number>(65000);
  const [minDecrement, setMinDecrement] = useState<number>(1000);
  const [requiredDeposit, setRequiredDeposit] = useState<number>(3000);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [generatedMarkdown, setGeneratedMarkdown] = useState('');
  const [qualifications, setQualifications] = useState<string[]>([
    'سجل تجاري ساري المفعول في اليمن',
    'بطاقة ضريبية وتأمينية معتمدة',
    'سابقة أعمال مماثلة لا تقل عن 3 مشاريع',
    'ضمان بنكي أو شيك مصدق لجدية التوريد',
  ]);
  const [newQualification, setNewQualification] = useState('');

  // حالة النشر
  const [isPublished, setIsPublished] = useState(false);
  const [publishedTenderId, setPublishedTenderId] = useState<string | null>(null);

  // استدعاء Gemini AI لتوليد كراسة الشروط والمواصفات (RFP)
  const handleGenerateRFPWithAi = async () => {
    if (!rfpTitle.trim() || !rawRequirements.trim()) {
      setAiError('يرجى إدخال عنوان المناقصة ووصف مختصر للمتطلبات ليتمكن الذكاء الاصطناعي من صياغة الكراسة.');
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const result: TenderRFPResult = await generateTenderRFP({
        title: rfpTitle,
        rawRequirements,
        category,
      });

      if (result) {
        if (result.title) setRfpTitle(result.title);
        const md = result.markdownContent || result.rfpMarkdown || '';
        if (md) {
          setGeneratedMarkdown(md);
          setScopeOfWork(md.slice(0, 300) + '...');
        }
        if (result.estimatedBudget) setBudgetCap(result.estimatedBudget);
        if (result.currency) setCurrency(result.currency);
        if (result.technicalSpecifications && result.technicalSpecifications.length > 0) {
          setQualifications(result.technicalSpecifications);
        } else if (result.evaluationCriteria && Array.isArray(result.evaluationCriteria)) {
          const stringCriteria = result.evaluationCriteria.map((c) =>
            typeof c === 'string' ? c : `${c.criterion} (${c.weight}%)`
          );
          setQualifications(stringCriteria);
        }
      }
    } catch (err) {
      console.error('Error generating tender RFP with AI:', err);
      setAiError('تعذر توليد الكراسة بالذكاء الاصطناعي، يرجى كتابة الشروط يدوياً.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddQualification = () => {
    if (!newQualification.trim()) return;
    setQualifications([...qualifications, newQualification.trim()]);
    setNewQualification('');
  };

  const handleRemoveQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `tnd-${Date.now().toString().slice(-4)}`;
    setPublishedTenderId(newId);
    setIsPublished(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>بوابة المشتريات المؤسسية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            طرح مناقصة / كراسة شروط
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            صياغة كراسة الشروط والمواصفات الفنية المعتمدة وفتح التنافس العكسي السري للموردين.
          </p>
        </div>

        <Link
          href="/tenders"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
        >
          <span>إلغاء والعودة</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isPublished ? (
        <div className="rounded-3xl bg-slate-900 border border-amber-500/50 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-white">تم نشر المناقصة بنجاح!</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              تم إطلاق غرفة المناقصة العكسية بالوقت الفعلي، وجارٍ إشعار الموردين المؤهلين المسجلين في تخصصك.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 max-w-sm mx-auto text-xs space-y-1 text-slate-400">
            <div>معرف المناقصة: <strong className="text-amber-400 font-mono">{publishedTenderId}</strong></div>
            <div>العنوان: <strong className="text-white">{rfpTitle}</strong></div>
            <div>سقف الميزانية: <strong className="text-amber-400 font-mono">{budgetCap.toLocaleString()} {currency}</strong></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={`/tenders/${publishedTenderId}/live`}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-600/30 transition"
            >
              دخول غرفة المناقصة الحية
            </Link>
            <Link
              href="/tenders"
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              العودة لكافة المناقصات
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePublish} className="space-y-8">
          
          {/* قسم توليد كراسة الشروط بالذكاء الاصطناعي */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-600/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">الصياغة التلقائية للمواصفات الفنية والشروط</h3>
                  <p className="text-xs text-slate-400">أدخل متطلبات التوريد لتوليد بنود المواصفات وجدول الكميات المقترح</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-950 border border-amber-700 text-amber-300 font-mono">
                صياغة تلقائية
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">عنوان طلب التوريد / المشروع:</label>
                <input
                  type="text"
                  value={rfpTitle}
                  onChange={(e) => setRfpTitle(e.target.value)}
                  placeholder="مثال: توريد وتركيب منظومة طاقة شمسية هجينة 150 كيلوواط لمستشفى..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">المتطلبات الأولية والملاحظات:</label>
                <textarea
                  rows={3}
                  value={rawRequirements}
                  onChange={(e) => setRawRequirements(e.target.value)}
                  placeholder="مثال: نحتاج ألواح مونوكرستالين 550W مع إنفرترات ثلاثية الطور وبطاريات ليثيوم ومدة توريد خلال 30 يوم مع ضمان 5 سنوات..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none resize-none"
                />
              </div>
            </div>

            {aiError && (
              <div className="flex items-center gap-2 text-xs text-rose-400 pt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                disabled={isAiLoading || !rfpTitle.trim()}
                onClick={handleGenerateRFPWithAi}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-600/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري صياغة كراسة الشروط بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>صياغة الكراسة وتحديد سقف الميزانية</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                متوافق مع معايير المناقصات اليمنية والبنك الدولي
              </span>
            </div>

            {/* معاينة نص الكراسة المولد */}
            {generatedMarkdown && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 mt-3">
                <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                  <span>معاينة كراسة الشروط (Markdown RFP Preview):</span>
                  <span className="text-slate-400 font-mono text-[11px]">جاهز للاعتماد</span>
                </div>
                <div className="text-xs text-slate-300 font-mono max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {generatedMarkdown}
                </div>
              </div>
            )}
          </div>

          {/* بيانات الجهة والموقع والميزانية */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">
              1. بيانات الجهة الطارحة ونطاق الميزانية
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">اسم الجهة / المؤسسة الطارحة:</label>
                <input
                  type="text"
                  required
                  value={issuerOrg}
                  onChange={(e) => setIssuerOrg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">مجال التوريد / التصنيف:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="طاقة ومولدات">طاقة ومولدات</option>
                  <option value="مقاولات وبناء">مقاولات وبناء</option>
                  <option value="تقنية ومعلومات">تقنية ومعلومات</option>
                  <option value="خدمات لوجستية ومحروقات">خدمات لوجستية ومحروقات</option>
                  <option value="مستلزمات طبية">مستلزمات طبية</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">المحافظة (مكان التسليم / التنفيذ):</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  {YEMEN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">العملة المعتمدة:</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-bold"
                >
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="YER">ريال يمني (YER)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">سقف الميزانية التقديرية (الحد الأقصى):</label>
                <input
                  type="number"
                  required
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">خطوة التناقص الإلزامية لكل عرض جديد:</label>
                <input
                  type="number"
                  required
                  value={minDecrement}
                  onChange={(e) => setMinDecrement(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>
          </div>

          {/* معايير التأهيل وشروط الموردين */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                2. معايير تأهيل الموردين والمتطلبات الفنية
              </h3>
              <span className="text-xs text-slate-400">يلتزم المورد بإرفاق إثباتاتها عند الترسية</span>
            </div>

            <div className="space-y-2">
              {qualifications.map((q, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold font-mono text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200 font-medium">{q}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQualification(idx)}
                    className="text-slate-500 hover:text-rose-400 text-xs px-2"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="إضافة معيار تأهيل جديد (مثال: شهادة الآيزو أو وكالة تجارية)"
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={handleAddQualification}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0"
              >
                + إضافة معيار
              </button>
            </div>
          </div>

          {/* شريط الإقرار وزر النشر */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                تخضع المناقصة لنظام الترسية المشروطة مع حماية سرية العروض وهوية الموردين المتنافسين.
              </span>
            </div>

            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-600/30 transition shrink-0 flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>نشر المناقصة وفتح الغرفة العكسية</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
