'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Scale, 
  CheckCircle, 
  MessageSquare, 
  Sparkles, 
  Send,
  Car,
  Search,
  Check,
  ShieldCheck,
  Clock,
  ArrowRight
} from 'lucide-react';

interface DisputeCase {
  id: string;
  listingId: string;
  title: string;
  buyerName: string;
  sellerName: string;
  escrowAmount: number;
  currency: 'YER' | 'USD' | 'SAR';
  claimReason: string;
  aiDifferenceScore: number;
  aiAnalysisSummary: string;
  openedAt: string;
  status: 'under_review' | 'resolved_refund' | 'resolved_payout' | 'resolved_split';
}

const SAMPLE_DISPUTE: DisputeCase = {
  id: 'dsp-701',
  listingId: 'auc-001',
  title: 'تويوتا لاندكروزر V8 صالون 2022 نظيف مجمرك',
  buyerName: 'م. أحمد الحاشدي (المشتري)',
  sellerName: 'معرض القمة للسيارات (البائع)',
  escrowAmount: 42500000,
  currency: 'YER',
  claimReason: 'وجود تهريب زيت من المساعد الهيدروليكي الخلفي لم يُذكر في تقرير الفحص الأولي بالمزاد.',
  aiDifferenceScore: 68.5,
  aiAnalysisSummary: 'بتحليل صور الفحص الأولي مقارنة بصور الاستلام المرفوعة، تبين وجود رطوبة زيتية بالمساعد الخلفي الأيمن لم تكن ظاهرة في صور الوصف. التكلفة التقديرية للإصلاح: 450,000 ريال يمني.',
  openedAt: 'اليوم، 08:30 ص',
  status: 'under_review',
};

interface ChatMessage {
  id: string;
  sender: string;
  role: 'buyer' | 'seller' | 'arbiter';
  content: string;
  time: string;
}

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'm-1',
    sender: 'م. أحمد الحاشدي (المشتري)',
    role: 'buyer',
    content: 'استلمت السيارة وفحصتها عند مهندس معتمد في صنعاء ووجد تهريب في المساعد الخلفي، أطلب خصم قيمة الإصلاح أو استرجاع كامل المبلغ.',
    time: '08:45 ص',
  },
  {
    id: 'm-2',
    sender: 'معرض القمة (البائع)',
    role: 'seller',
    content: 'السيارة تم فحصها قبل تسليمها وكانت سليمة تماماً، ربما حدث التهريب أثناء القيادة في طريق وعر بعد الاستلام.',
    time: '09:10 ص',
  },
  {
    id: 'm-3',
    sender: 'مسؤول التحكيم بالمنصة',
    role: 'arbiter',
    content: 'تم مراجعة تقرير الفحص وصور المعاينة خلال مهلة الـ 48 ساعة. يرجى من الطرفين الاطلاع على تسوية خصم تكلفة الصيانة من رصيد الضمان.',
    time: '09:40 ص',
  },
];

export default function AdminDisputesPage() {
  const [currentCase, setCurrentCase] = useState<DisputeCase>(SAMPLE_DISPUTE);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [newMessageText, setNewMessageText] = useState('');
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);

  // إرسال توجيه رسمي
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'مسؤول التحكيم',
      role: 'arbiter',
      content: newMessageText.trim(),
      time: 'الآن',
    };

    setChatMessages([...chatMessages, msg]);
    setNewMessageText('');
  };

  // إصدار حكم ملزم
  const handleIssueRuling = (rulingType: 'resolved_refund' | 'resolved_payout' | 'resolved_split') => {
    let notice = '';
    if (rulingType === 'resolved_refund') {
      notice = `تم إصدار حكم تحكيم ملزم بالاسترداد الكامل لصالح المشتري بمبلغ ${currentCase.escrowAmount.toLocaleString()} ${currentCase.currency}. تم تحرير المبلغ وإعادته لمحفظة المشتري.`;
    } else if (rulingType === 'resolved_payout') {
      notice = `تم إصدار حكم تحكيم ملزم بالصرف الكامل لصالح البائع بمبلغ ${(currentCase.escrowAmount * 0.975).toLocaleString()} ${currentCase.currency} بعد خصم عمولة المنصة 2.5%.`;
    } else {
      notice = `تم إصدار حكم تسوية جزئية: خصم 450,000 ريال لصالح المشتري تعويضاً عن الصيانة، وصرف باقي المبلغ للبائع.`;
    }

    setCurrentCase({ ...currentCase, status: rulingType });
    setDecisionNotice(notice);
  };

  return (
    <div className="space-y-4">
      
      {/* رأس الصفحة المدمج والأنيق */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white">غرفة التحكيم وفض النزاعات</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-950 border border-rose-800/80 text-rose-300 font-bold">
                قضية #{currentCase.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentCase.title} • {currentCase.openedAt}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">المبلغ المحجوز بالضمان:</span>
            <span className="text-sm font-black text-amber-400 font-mono">
              {currentCase.escrowAmount.toLocaleString()} {currentCase.currency}
            </span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            نافذة فحص 48 ساعة
          </span>
        </div>
      </div>

      {/* تنبيه القرار الملزم عند صدوره */}
      {decisionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold leading-relaxed">{decisionNotice}</span>
          </div>
          <button
            onClick={() => setDecisionNotice(null)}
            className="text-slate-400 hover:text-white text-xs underline shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* تخطيط الشاشة المتوازن: الأدلة والقرارات (يمين) + المحادثة الثلاثية (يسار) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* العمود الأيمن: تفاصيل النزاع وفحص الأدلة والقرارات (7 أعمدة) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* بطاقة الأطراف والادعاء */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">المشتري (مقدم النزاع):</span>
                <span className="font-bold text-slate-200 block truncate">{currentCase.buyerName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">البائع (صاحب السلعة):</span>
                <span className="font-bold text-slate-200 block truncate">{currentCase.sellerName}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">مضمون ادعاء المشتري:</span>
              <p className="p-2.5 rounded-xl bg-slate-950/60 border border-rose-950 text-xs text-rose-300 leading-relaxed">
                "{currentCase.claimReason}"
              </p>
            </div>
          </div>

          {/* تقرير الذكاء الاصطناعي لفحص الصور والأدلة */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>تقرير فحص ومطابقة الأدلة الفنية</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                نسبة الاختلاف: {currentCase.aiDifferenceScore}%
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {currentCase.aiAnalysisSummary}
            </p>

            {/* مقارنة الصور */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">1. صورة الكراسة قبل الشحن:</span>
                <div className="h-28 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-2 text-center">
                  <Car className="w-8 h-8 text-emerald-400 mb-1" />
                  <span className="text-[10px] text-slate-300">سليمة في تقرير الفحص</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">2. صورة الاستلام عند المعاينة:</span>
                <div className="h-28 rounded-xl bg-slate-950 border border-rose-900/40 flex flex-col items-center justify-center p-2 text-center">
                  <Search className="w-8 h-8 text-rose-400 mb-1" />
                  <span className="text-[10px] text-rose-300">رطوبة زيت المساعد الخلفي</span>
                </div>
              </div>
            </div>
          </div>

          {/* قرارات التحكيم الملزمة */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2.5">
            <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>إصدار الحكم الإداري والمالي الملزم</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleIssueRuling('resolved_split')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-amber-950/60 hover:border-amber-500/60 border border-slate-800 text-xs font-bold transition text-center space-y-0.5 group"
              >
                <span className="block text-amber-400 group-hover:text-amber-300 text-[11px]">تسوية ودية ملزمة</span>
                <span className="text-[9px] text-slate-400 block font-normal">خصم 450K وصرف الباقي</span>
              </button>

              <button
                type="button"
                onClick={() => handleIssueRuling('resolved_refund')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-rose-950/60 hover:border-rose-500/60 border border-slate-800 text-xs font-bold transition text-center space-y-0.5 group"
              >
                <span className="block text-rose-400 group-hover:text-rose-300 text-[11px]">استرداد كامل</span>
                <span className="text-[9px] text-slate-400 block font-normal">إعادة الضمان للمشتري</span>
              </button>

              <button
                type="button"
                onClick={() => handleIssueRuling('resolved_payout')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-emerald-950/60 hover:border-emerald-500/60 border border-slate-800 text-xs font-bold transition text-center space-y-0.5 group"
              >
                <span className="block text-emerald-400 group-hover:text-emerald-300 text-[11px]">صرف كامل للبائع</span>
                <span className="text-[9px] text-slate-400 block font-normal">رفض الشكوى وإفراج الرصيد</span>
              </button>
            </div>
          </div>

        </div>

        {/* العمود الأيسر: محادثة التحكيم الثلاثية (5 أعمدة) */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col h-[540px]">
            <div className="border-b border-slate-800 pb-2.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-white text-xs">محادثة التحكيم الثلاثية الملزمة</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">سجل رسمي</span>
            </div>

            {/* مجرى الرسائل */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {chatMessages.map((msg) => {
                const isArbiter = msg.role === 'arbiter';
                const isBuyer = msg.role === 'buyer';
                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl space-y-1 ${
                      isArbiter
                        ? 'bg-amber-950/40 border border-amber-600/40 text-amber-200 mr-2'
                        : isBuyer
                        ? 'bg-slate-950 border border-slate-800 text-slate-200'
                        : 'bg-slate-800/70 border border-slate-700/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-300">{msg.sender}</span>
                      <span className="text-slate-500 font-mono">{msg.time}</span>
                    </div>
                    <p className="leading-relaxed text-[11px]">
                      {msg.content}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* إرسال توجيه رسمي */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="اكتب توجيهاً رسمياً للطرفين..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition shrink-0"
                aria-label="إرسال"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
