'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowDownLeft, 
  FileText, 
  ShieldCheck, 
  DollarSign, 
  RefreshCw,
  Search,
  Check,
  Building,
  TrendingUp,
  Receipt
} from 'lucide-react';

interface DepositSlip {
  id: string;
  senderName: string;
  channel: string;
  refNumber: string;
  amount: number;
  currency: 'YER' | 'USD' | 'SAR';
  bankMatchConfidence: number; // %
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const INITIAL_DEPOSITS: DepositSlip[] = [
  {
    id: 'tx-101',
    senderName: 'ياسر محمد الآنسي',
    channel: 'بنك الكريمي الإسلامي (حساب مميز)',
    refNumber: 'KR-982410',
    amount: 1500000,
    currency: 'YER',
    bankMatchConfidence: 100, // متطابق مع كشف البنك
    submittedAt: 'منذ 10 دقائق',
    status: 'pending',
  },
  {
    id: 'tx-102',
    senderName: 'شركة تهامة للاستيراد والتصدير',
    channel: 'محفظة ون كاش الإلكترونية',
    refNumber: 'OC-554109',
    amount: 4500000,
    currency: 'YER',
    bankMatchConfidence: 98.5,
    submittedAt: 'منذ 25 دقيقة',
    status: 'pending',
  },
  {
    id: 'tx-103',
    senderName: 'موسى صالح الحاوري',
    channel: 'شبكة النجم للحوالات',
    refNumber: 'NJ-331298',
    amount: 800000,
    currency: 'YER',
    bankMatchConfidence: 100,
    submittedAt: 'منذ 40 دقيقة',
    status: 'pending',
  },
  {
    id: 'tx-104',
    senderName: 'المركز اليمني للطاقة المتجددة',
    channel: 'محفظة جوالي',
    refNumber: 'JW-770411',
    amount: 5000,
    currency: 'USD',
    bankMatchConfidence: 100,
    submittedAt: 'منذ ساعة',
    status: 'pending',
  },
];

interface EscrowFeeRecord {
  dealId: string;
  title: string;
  currency: 'YER' | 'USD' | 'SAR';
  totalAmount: number;
  feeAmount: number; // 2.5%
  sellerPayout: number; // 97.5%
  closedAt: string;
}

const SAMPLE_FEE_LEDGER: EscrowFeeRecord[] = [
  {
    dealId: 'DL-8801',
    title: 'تويوتا برادو 2020 وارد بازرعة',
    currency: 'YER',
    totalAmount: 34000000,
    feeAmount: 850000, // 2.5%
    sellerPayout: 33150000,
    closedAt: 'أمس، 02:30 م',
  },
  {
    dealId: 'DL-8802',
    title: 'منظومة طاقة شمسية 50KW لمزرعة العند',
    currency: 'USD',
    totalAmount: 28000,
    feeAmount: 700, // 2.5%
    sellerPayout: 27300,
    closedAt: '04 نوفمبر 2026',
  },
  {
    dealId: 'DL-8803',
    title: 'شحنة أجهزة لابتوب ديل ThinkPad فئة أ+',
    currency: 'SAR',
    totalAmount: 45000,
    feeAmount: 1125, // 2.5%
    sellerPayout: 43875,
    closedAt: '03 نوفمبر 2026',
  },
];

export default function AdminFinanceCenterPage() {
  const [deposits, setDeposits] = useState<DepositSlip[]>(INITIAL_DEPOSITS);
  const [selectedTxId, setSelectedTxId] = useState<string>('tx-101');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const selectedDeposit = deposits.find((d) => d.id === selectedTxId) || deposits[0];

  // اعتماد وشحن المحفظة بضغطة زر واحدة
  const handleApproveDeposit = (id: string) => {
    setDeposits((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          setActionNotice(
            `تم اعتماد الإيداع بنجاح وقيد مبلغ ${item.amount.toLocaleString()} ${item.currency} فوراً في محفظة المستخدم (${item.senderName}).`
          );
          return { ...item, status: 'approved' };
        }
        return item;
      })
    );
  };

  // رفض السند مع توضيح السبب
  const handleRejectDeposit = (id: string) => {
    setDeposits((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          setActionNotice(`تم رفض سند الإيداع رقم (${item.refNumber}) لعدم مطابقة كشف الحساب البنكي.`);
          return { ...item, status: 'rejected', rejectionReason: 'لم يتم العثور على الإشعار في كشف البنك الرسمي' };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-8">
      
      {/* رأس المركز */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs mb-1">
            <Wallet className="w-4 h-4" />
            <span>مركز التدقيق المالي والوساطة (Financial Audit & Escrow Center)</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            طابور تدقيق سندات الإيداع ودفتر عمولات الوساطة 2.5%
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            مطابقة إشعارات التحويل المصرفي وشبكات الصرافة مع كشوفات الحسابات البنكية والشحن الفوري للأرصدة.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block leading-tight">إجمالي العمولات المحصلة (2.5%)</span>
            <span className="text-base font-black text-emerald-400 font-mono">5,687,500 ر.ي + $4,800</span>
          </div>
        </div>
      </div>

      {/* شريط الإشعار بالإجراء */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-teal-950/90 border border-teal-600/80 text-teal-200 text-xs flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="font-semibold leading-relaxed">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 1. قسم تدقيق سندات الإيداع */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* قائمة السندات قيد الانتظار (5 أعمدة) */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 block">سندات الإيداع المرفوعة من العملاء:</span>
          
          <div className="space-y-2.5">
            {deposits.map((slip) => {
              const isSelected = slip.id === selectedTxId;
              return (
                <div
                  key={slip.id}
                  onClick={() => setSelectedTxId(slip.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-teal-500 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold text-white text-xs block">{slip.senderName}</span>
                    <span className="text-[11px] text-slate-400 block">{slip.channel}</span>
                    <span className="text-[10px] text-slate-500 font-mono">مرجع: {slip.refNumber} • {slip.submittedAt}</span>
                  </div>

                  <div className="text-left space-y-1">
                    <span className="font-mono font-black text-emerald-400 text-sm block">
                      {slip.amount.toLocaleString()} {slip.currency}
                    </span>
                    {slip.status === 'pending' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-semibold block">
                        قيد المطابقة
                      </span>
                    )}
                    {slip.status === 'approved' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1 justify-center">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                        <span>تم القيد</span>
                      </span>
                    )}
                    {slip.status === 'rejected' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-semibold block">
                        مرفوض
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* تفاصيل السند والمطابقة المصرفية وزر الشحن (7 أعمدة) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-mono text-teal-400 block">{selectedDeposit.id}</span>
                <h3 className="font-black text-white text-base mt-0.5">{selectedDeposit.senderName}</h3>
              </div>
              <div className="text-left font-mono">
                <span className="text-[10px] text-slate-400 block">المبلغ المطلوب شحنه</span>
                <span className="text-xl font-black text-emerald-400">
                  {selectedDeposit.amount.toLocaleString()} {selectedDeposit.currency}
                </span>
              </div>
            </div>

            {/* نتيجة مطابقة كشف الحساب البنكي */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>نتيجة المطابقة الآلية مع كشف الحساب البنكي:</span>
                </span>
                <span className="text-emerald-400 font-mono font-bold">
                  تطابق {selectedDeposit.bankMatchConfidence}%
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                تم العثور على قيد وارد مطابق لرقم الإشعار <strong>({selectedDeposit.refNumber})</strong> في كشف بنك الكريمي بنفس القيمة وتوقيت الإيداع.
              </p>
            </div>

            {/* بطاقة صورة السند أو إشعار التحويل */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">معاينة صورة السند المرفوع:</span>
              <div className="h-44 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 text-center space-y-2">
                <Receipt className="w-12 h-12 text-teal-400" />
                <span className="text-xs font-bold text-white block">إشعار قيد مصرفي رسمي</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  القناة: {selectedDeposit.channel} • رقم القيد: {selectedDeposit.refNumber}
                </span>
              </div>
            </div>

            {/* أزرار الإجراء الإداري */}
            {selectedDeposit.status === 'pending' ? (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleApproveDeposit(selectedDeposit.id)}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>تأكيد الإيداع وقيد الرصيد فوراً في المحفظة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRejectDeposit(selectedDeposit.id)}
                  className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-700 text-slate-300 border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>رفض السند</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>حالة السند الحالية: <strong>{selectedDeposit.status === 'approved' ? 'معتمد ومقيد' : 'مرفوض'}</strong></span>
                {selectedDeposit.rejectionReason && (
                  <span className="text-rose-400">{selectedDeposit.rejectionReason}</span>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 2. دفتر أستاذ عمولات المنصة 2.5% */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-white text-base">دفتر أستاذ عمولات الوساطة والضمان (2.5%)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">صفر تسريب مالي • حساب دقيق</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-3 font-semibold">معرف الصفقة</th>
                <th className="py-3 px-3 font-semibold">عنوان السلعة / المزاد</th>
                <th className="py-3 px-3 font-semibold">إجمالي قيمة الصفقة</th>
                <th className="py-3 px-3 font-semibold">عمولة المنصة 2.5%</th>
                <th className="py-3 px-3 font-semibold">صافي المحول للبائع (97.5%)</th>
                <th className="py-3 px-3 font-semibold">تاريخ الإغلاق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {SAMPLE_FEE_LEDGER.map((record) => (
                <tr key={record.dealId} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-3 font-mono font-bold text-teal-400">{record.dealId}</td>
                  <td className="py-3.5 px-3 font-bold text-white">{record.title}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-300">
                    {record.totalAmount.toLocaleString()} {record.currency}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-emerald-400">
                    +{record.feeAmount.toLocaleString()} {record.currency}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-400">
                    {record.sellerPayout.toLocaleString()} {record.currency}
                  </td>
                  <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{record.closedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
