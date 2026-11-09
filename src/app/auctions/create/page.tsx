'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  UploadCloud, 
  Gavel, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Layers, 
  MapPin, 
  FileText,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Rocket
} from 'lucide-react';
import { generateAuctionSpecs } from '@/lib/gemini';
import { YEMEN_CITIES } from '@/lib/constants';
import { AuctionSpecsResult } from '@/types';

export default function CreateAuctionPage() {
  const router = useRouter();

  // مدخلات التوليد بالذكاء الاصطناعي
  const [briefPrompt, setBriefPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // حقول المزاد القابلة للتعديل
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('سيارات ومركبات');
  const [city, setCity] = useState<string>('صنعاء');
  const [currency, setCurrency] = useState<'YER' | 'USD' | 'SAR'>('YER');
  const [startingPrice, setStartingPrice] = useState<number>(35000000);
  const [minBidIncrement, setMinBidIncrement] = useState<number>(250000);
  const [reservePrice, setReservePrice] = useState<number>(40000000);
  const [buyNowPrice, setBuyNowPrice] = useState<number>(46000000);
  const [requiredDeposit, setRequiredDeposit] = useState<number>(1000000);
  const [durationHours, setDurationHours] = useState<number>(24);
  const [description, setDescription] = useState('');
  const [specs, setSpecs] = useState<Record<string, string>>({
    'حالة الفحص': 'فحص فني شامل معتمد',
    'الضمان': '48 ساعة مهلة فحص ومعاينة عبر حساب الضمان Escrow',
  });
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecVal, setNewSpecVal] = useState('');

  // حالة النشر
  const [isPublished, setIsPublished] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);

  // استدعاء Gemini AI لتوليد المواصفات والتسعير
  const handleGenerateWithAi = async () => {
    if (!briefPrompt.trim()) {
      setAiError('يرجى كتابة وصف مختصر أو اسم السلعة ليتمكن الذكاء الاصطناعي من تحليلها.');
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const result: AuctionSpecsResult = await generateAuctionSpecs({
        briefDescription: briefPrompt,
      });

      if (result) {
        setTitle(result.title || briefPrompt);
        if (result.category) setCategory(result.category);
        if (result.recommendedStartingPrice) setStartingPrice(result.recommendedStartingPrice);
        if (result.recommendedMinBidIncrement) setMinBidIncrement(result.recommendedMinBidIncrement);
        if (result.estimatedMarketValue) setReservePrice(result.estimatedMarketValue);
        if (result.specificationsTable) {
          setSpecs((prev) => ({ ...prev, ...result.specificationsTable }));
        }
        if (result.warrantyAndInspectionTerms) {
          setDescription((prev) => (prev ? `${prev}\n${result.warrantyAndInspectionTerms}` : result.warrantyAndInspectionTerms));
        }
      }
    } catch (err) {
      console.error('Error generating specs with AI:', err);
      setAiError('تعذر الاتصال بخدمة الذكاء الاصطناعي، يرجى كتابة البيانات يدوياً.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddSpec = () => {
    if (!newSpecKey.trim() || !newSpecVal.trim()) return;
    setSpecs((prev) => ({ ...prev, [newSpecKey.trim()]: newSpecVal.trim() }));
    setNewSpecKey('');
    setNewSpecVal('');
  };

  const handleRemoveSpec = (keyToRemove: string) => {
    setSpecs((prev) => {
      const next = { ...prev };
      delete next[keyToRemove];
      return next;
    });
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `auc-${Date.now().toString().slice(-4)}`;
    setPublishedListingId(newId);
    setIsPublished(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>إضافة سلعة جديدة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            طرح مزاد جديد
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            قم بتعبئة بيانات ومواصفات سلعتك وتحديد السعر الافتتاحي ومدة المزاد لبدء استقبال المزايدات.
          </p>
        </div>

        <Link
          href="/auctions"
          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
        >
          <span>إلغاء والعودة</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isPublished ? (
        /* نافذة تأكيد نجاح النشر */
        <div className="rounded-3xl bg-slate-900 border border-emerald-500/50 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-white">تم نشر مزادك بنجاح!</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              تم إنشاء غرفة المزايدة الحية، وتفعيل عداد الوقت وحماية Anti-Sniping وربط مبلغ التأمين المحجوز.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 max-w-sm mx-auto text-xs space-y-1 text-slate-400">
            <div>معرف المزاد: <strong className="text-emerald-400 font-mono">{publishedListingId}</strong></div>
            <div>العنوان: <strong className="text-white">{title}</strong></div>
            <div>السعر الافتتاحي: <strong className="text-emerald-400 font-mono">{startingPrice.toLocaleString()} {currency}</strong></div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={`/auctions/${publishedListingId}`}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition"
            >
              دخول غرفة المزاد الحي الآن
            </Link>
            <Link
              href="/auctions"
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              العودة لكافة المزادات
            </Link>
          </div>
        </div>
      ) : (
        /* نموذج الإنشاء والتوليد */
        <form onSubmit={handlePublish} className="space-y-8">
          
          {/* قسم الذكاء الاصطناعي: التوليد من سطر واحد */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-600/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">المساعد الآلي لتوليد المواصفات والتسعير</h3>
                  <p className="text-xs text-slate-400">اكتب نبذة مختصرة عن السلعة لتعبئة المواصفات والأسعار المقترحة تلقائياً</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono">
                تعبئة تلقائية
              </span>
            </div>

            <div className="space-y-2">
              <textarea
                rows={3}
                value={briefPrompt}
                onChange={(e) => setBriefPrompt(e.target.value)}
                placeholder="مثال: لاندكروزر 2022 صالون وارد بازرعة ماشي 34 ألف كيلو نظيف جداً خالي من الصدمات ومجمرك بصنعاء..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl p-4 text-xs text-white placeholder-slate-500 outline-none transition resize-none"
              />

              {aiError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 pt-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={isAiLoading || !briefPrompt.trim()}
                  onClick={handleGenerateWithAi}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحليل والتوليد بالذكاء الاصطناعي...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>توليد المواصفات والتسعير الذكي</span>
                    </>
                  )}
                </button>

                <div className="text-[11px] text-slate-400 hidden sm:block">
                  يدعم: سيارات، عقارات، طاقة شمسية، إلكترونيات، معدات
                </div>
              </div>
            </div>
          </div>

          {/* بيانات المزاد الأساسية */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">
              1. البيانات العامة للسلعة والموقع
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">عنوان المزاد الرسمي:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="عنوان جذاب يوضح اسم السلعة والموديل والحالة"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">التصنيف:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition"
                >
                  <option value="سيارات ومركبات">سيارات ومركبات</option>
                  <option value="عقارات وأراضي">عقارات وأراضي</option>
                  <option value="طاقة شمسية">طاقة شمسية ومولدات</option>
                  <option value="إلكترونيات وأجهزة">إلكترونيات وأجهزة ذكية</option>
                  <option value="معدات ومزارع">معدات ومزارع</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">المحافظة / المدينة (مكان المعاينة):</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition"
                >
                  {YEMEN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الوصف التفصيلي وحالة الاستخدام:</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب كافة التفاصيل المتعلقة بنظافة السلعة والعيوب إن وجدت ومكان الاستلام..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-4 text-xs text-white outline-none transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* التسعير وقواعد المزايدة */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">
              2. خطة التسعير وقواعد المزايدة الحية
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">العملة المعتمدة:</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition font-bold"
                >
                  <option value="YER">ريال يمني (YER)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">السعر الافتتاحي:</label>
                <input
                  type="number"
                  required
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">الحد الأدنى للزيادة لكل عرض:</label>
                <input
                  type="number"
                  required
                  value={minBidIncrement}
                  onChange={(e) => setMinBidIncrement(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">السعر السري المحجوز (Reserve Price):</label>
                <input
                  type="number"
                  value={reservePrice}
                  onChange={(e) => setReservePrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">سعر الشراء المباشر الفوري (اختياري):</label>
                <input
                  type="number"
                  value={buyNowPrice}
                  onChange={(e) => setBuyNowPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">العربون المطلوب لتأمين الدخول:</label>
                <input
                  type="number"
                  required
                  value={requiredDeposit}
                  onChange={(e) => setRequiredDeposit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* جدول المواصفات الفنية المعتمدة */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                3. جدول المواصفات الفنية والشروط
              </h3>
              <span className="text-xs text-slate-400">تظهر للمزايدين كبنود رسمية في الغرفة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(specs).map(([key, val]) => (
                <div key={key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{key}</span>
                    <span className="font-semibold text-slate-200">{val}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpec(key)}
                    className="text-slate-500 hover:text-rose-400 text-xs px-2"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>

            {/* إضافة بند جديد */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="اسم البند (مثال: سعة الخزان)"
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <input
                type="text"
                placeholder="القيمة (مثال: 100 لتر)"
                value={newSpecVal}
                onChange={(e) => setNewSpecVal(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={handleAddSpec}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                + إضافة مواصفة
              </button>
            </div>
          </div>

          {/* شريط الإقرار والزر النهائي */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                تخضع كافة مبيعات المنصة لعمولة الوساطة 2.5% ومهلة فحص ومعاينة 48 ساعة لحماية الطرفين.
              </span>
            </div>

            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition shrink-0 flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>نشر المزاد وتفعيل الغرفة الحية</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
