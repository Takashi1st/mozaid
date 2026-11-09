'use client';

import React, { useState } from 'react';
import { FileText, Clock, TrendingDown, ShieldCheck, Download, Send, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { validateReverseTenderBid } from '../lib/auction-engine';
import { ListingItem } from '../types';

interface TenderRoomProps {
  tender?: ListingItem;
  currentSupplierId?: string;
}

const SAMPLE_TENDER: ListingItem = {
  id: 'tnd-501',
  userId: 'buyer-org-12',
  categoryId: 5,
  title: 'توريد وتركيب منظومة طاقة شمسية هجينة 150 كيلوواط - مستشفى الأمل',
  slug: 'hybrid-solar-system-150kw',
  listingType: 'reverse_tender',
  status: 'active',
  currency: 'USD',
  startingPrice: 85000,
  currentPrice: 72000, // أقل عرض حالي مسجل
  minBidIncrement: 1000,
  requiredDepositAmount: 5000,
  startsAt: new Date(Date.now() - 86400000).toISOString(),
  endsAt: new Date(Date.now() + 43200000).toISOString(), // 12 ساعة متبقية
  timesExtended: 0,
  description: 'مطلوب توريد وتركيب ألواح طاقة شمسية بقدرة إجمالية 150KW مع إنفرترات ذكية وبطاريات ليثيوم للمبنى الرئيسي لمستشفى الأمل النموذجي.',
  aiGeneratedSpecs: {
    'القدرة الإجمالية': '150 kWp',
    'نوع الألواح': 'Tier-1 Monocrystalline Bi-facial 550W+',
    'الإنفرترات': '3x 50kW Hybrid Smart Inverters (IP65)',
    'بنك البطاريات': 'Lithium LiFePO4 200kWh',
    'مدة التوريد والتركيب': 'أقصاها 30 يوماً من توقيع العقد',
    'الضمان المطلوب': '10 سنوات للألواح و 5 سنوات للإنفرتر والبطاريات',
  },
  itemCondition: 'new',
  locationCity: 'صنعاء',
  inspectionWindowHours: 72,
  totalBidsCount: 8,
  viewsCount: 310,
  images: [],
};

export const TenderRoom: React.FC<TenderRoomProps> = ({
  tender = SAMPLE_TENDER,
  currentSupplierId = 'supplier-44',
}) => {
  const [currentLowestPrice, setCurrentLowestPrice] = useState<number>(tender.currentPrice);
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [deliveryDays, setDeliveryDays] = useState<string>('25');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const maxAllowedQuote = currentLowestPrice - tender.minBidIncrement;

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const amount = Number(quoteAmount);
    const validation = validateReverseTenderBid(
      { ...tender, currentPrice: currentLowestPrice },
      currentSupplierId,
      amount
    );

    if (!validation.isValid) {
      setErrorMsg(validation.errorMessage || 'تعذر تقديم العرض.');
      return;
    }

    setCurrentLowestPrice(amount);
    setSuccessMsg(`تم تقديم عرضك التنافسي بنجاح بمبلغ $${amount.toLocaleString()}! أنت الآن صاحب أقل وأفضل سعر.`);
    setQuoteAmount('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" dir="rtl">
      
      {/* عنوان المناقصة وبيانات الجهة الطالبة */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              مناقصة تنافسية مفتوحة (مزايدة عكسية)
            </span>
            <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full">
              المدينة: {tender.locationCity}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>الجهة الطارحة: إدارة مستشفى الأمل النموذجي</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
          {tender.title}
        </h1>

        <p className="text-sm text-slate-300 leading-relaxed">
          {tender.description}
        </p>

        {/* تحميل كراسة الشروط الرسمية المولدة بالـ AI */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-200 block">كراسة الشروط والمواصفات الفنية المعتمدة</span>
              <span className="text-xs text-slate-500">تمت صياغتها واعتماد بنودها بالذكاء الاصطناعي طبقاً لمعايير التوريد</span>
            </div>
          </div>

          <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition">
            <Download className="w-4 h-4 text-blue-400" />
            تحميل الكراسة الكاملة (PDF)
          </button>
        </div>

      </div>

      {/* قسم التنافس اللحظي وتقديم العروض */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* المواصفات الفنية التفصيلية */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            جدول المعايير والمواصفات الفنية الإلزامية
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tender.aiGeneratedSpecs &&
              Object.entries(tender.aiGeneratedSpecs).map(([key, value]) => (
                <div key={key} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
                  <span className="text-xs text-slate-400 block mb-1">{key}</span>
                  <span className="font-semibold text-sm text-slate-200">{String(value)}</span>
                </div>
              ))}
          </div>
        </div>

        {/* لوحة تقديم العرض التنافسي العكسي */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
          
          {/* مؤشر أقل سعر حالي */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
            <span className="text-xs text-slate-400 block flex items-center justify-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              أفضل (أقل) عرض أسعار مسجل حالياً
            </span>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              ${currentLowestPrice.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 block">
              الحد الأقصى لعرضك الجديد: <strong>${maxAllowedQuote.toLocaleString()}</strong>
            </span>
          </div>

          {/* نموذج إرسال العرض */}
          <form onSubmit={handleSubmitQuote} className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">قيمة العرض المالي الإجمالي ($)</label>
              <input
                type="number"
                placeholder={`مثال: ${maxAllowedQuote}`}
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">مدة التنفيذ والتوريد (أيام)</label>
              <input
                type="number"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">ملاحظات والتزام بالمواصفات</label>
              <textarea
                rows={2}
                placeholder="تأكيد التوريد مع شهادات المنشأ والضمان المعتمد..."
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              <Send className="w-4 h-4" />
              تأكيد وإرسال العطاء التنافسي
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};
