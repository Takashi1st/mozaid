'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Camera, 
  FileBadge, 
  ShieldCheck, 
  AlertTriangle,
  MapPin,
  Phone,
  Search,
  Check
} from 'lucide-react';

interface KycSubmission {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  carrier: string;
  nationalIdNumber: string;
  city: string;
  aiOcrMatchScore: number;
  aiFaceMatchScore: number;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
}

const INITIAL_KYC_REQUESTS: KycSubmission[] = [
  {
    id: 'kyc-01',
    userId: 'u-101',
    fullName: 'جمال عبده أحمد القدسي',
    phoneNumber: '771234567',
    carrier: 'يمن موبايل (YemenMobile)',
    nationalIdNumber: '01010045892',
    city: 'تعز',
    aiOcrMatchScore: 98.4,
    aiFaceMatchScore: 97.2,
    submittedAt: 'منذ 15 دقيقة',
    status: 'pending',
  },
  {
    id: 'kyc-02',
    userId: 'u-102',
    fullName: 'مؤسسة صعدة للطاقة والمقاولات (ممثل: يحيى شرف)',
    phoneNumber: '734567890',
    carrier: 'يو (YOU Telecom)',
    nationalIdNumber: '04020011934',
    city: 'صعدة',
    aiOcrMatchScore: 95.1,
    aiFaceMatchScore: 93.8,
    submittedAt: 'منذ ساعة',
    status: 'pending',
  },
  {
    id: 'kyc-03',
    userId: 'u-103',
    fullName: 'وضاح سعيد سالم العامري',
    phoneNumber: '719876543',
    carrier: 'سبأفون (Sabafon)',
    nationalIdNumber: '02050088120',
    city: 'عدن',
    aiOcrMatchScore: 89.2,
    aiFaceMatchScore: 91.0,
    submittedAt: 'منذ ساعتين',
    status: 'pending',
  },
];

export default function AdminKycCenterPage() {
  const [submissions, setSubmissions] = useState<KycSubmission[]>(INITIAL_KYC_REQUESTS);
  const [selectedId, setSelectedId] = useState<string>('kyc-01');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedItem = submissions.find((s) => s.id === selectedId) || submissions[0];

  const handleApprove = (id: string) => {
    setSubmissions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          setFeedback(`تم اعتماد توثيق الهوية للمستخدم (${item.fullName}) ومنحه شارة بائع ومورد موثوق بنجاح.`);
          return { ...item, status: 'verified' };
        }
        return item;
      })
    );
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) return;

    setSubmissions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          setFeedback(`تم رفض طلب التوثيق للمستخدم (${item.fullName}) وإرسال سبب الرفض عبر SMS.`);
          return { ...item, status: 'rejected', rejectionReason: rejectReason };
        }
        return item;
      })
    );

    setShowRejectModal(false);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* رأس المركز */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <UserCheck className="w-4 h-4" />
            <span>مركز تدقيق وتوثيق الهويات</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            تدقيق بطاقات الهوية الشخصية ومطابقة صور السيلفي
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            مراجعة وثائق الهوية الوطنية والتحقق من صحة البيانات لمنح شارات التوثيق المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 bg-amber-950/80 border border-amber-800/80 px-3 py-1.5 rounded-xl font-mono">
            {submissions.filter((s) => s.status === 'pending').length} طلبات قيد الانتظار
          </span>
        </div>
      </div>

      {/* شريط الإشعار بالإجراء */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-600/80 text-emerald-200 text-xs flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* تفاصيل التدقيق */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* العمود الأيمن: طابور الطلبات (5 أعمدة) */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 block">طابور طلبات التوثيق المعلقة:</span>
          
          <div className="space-y-2.5">
            {submissions.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{item.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({item.city})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      بطاقة: {item.nationalIdNumber} • {item.submittedAt}
                    </div>
                  </div>

                  <div>
                    {item.status === 'pending' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                        قيد التدقيق
                      </span>
                    )}
                    {item.status === 'verified' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>معتمد</span>
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-semibold">
                        مرفوض
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* العمود الأيسر: معاينة بطاقة الهوية وصور السيلفي وقرار المشرف (7 أعمدة) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 block">{selectedItem.id}</span>
                <h3 className="font-black text-white text-base mt-0.5">{selectedItem.fullName}</h3>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">شركة الاتصالات المسجلة</span>
                <span className="text-xs font-semibold text-slate-200">{selectedItem.carrier}</span>
              </div>
            </div>

            {/* معلومات مستويات التوثيق الثلاثة للمستخدم */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">المستوى الحالي للمستخدم:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold text-[11px]">
                  المستوى 1 (مسجل برقم هاتف موثق)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                <span>الترقية المطلوبة بالاعتماد: <strong className="text-white">المستوى 2 (موثق بالهوية الحية)</strong></span>
                <span>الصفقات المكتملة: <strong className="text-amber-400 font-mono">4 / 10</strong> صفقات للترقية التلقائية للمستوى 3</span>
              </div>
            </div>

            {/* درجات المطابقة بالذكاء الاصطناعي */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">مطابقة نصوص البطاقة (OCR):</span>
                  <span className="text-emerald-400 font-mono font-black text-base">
                    {selectedItem.aiOcrMatchScore}%
                  </span>
                </div>
                <FileBadge className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">مطابقة صورة الوجه الحية:</span>
                  <span className="text-teal-400 font-mono font-black text-base">
                    {selectedItem.aiFaceMatchScore}%
                  </span>
                </div>
                <Camera className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            {/* معاينة صور الوثائق */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300">معاينة بطاقة الهوية (الوجه الأمامي):</span>
                <div className="h-44 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <FileBadge className="w-12 h-12 text-emerald-400" />
                  <span className="text-xs font-bold text-white block">الجمهورية اليمنية - بطاقة شخصية</span>
                  <span className="text-[10px] text-emerald-400 font-mono">الرقم الوطني: {selectedItem.nationalIdNumber}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300">معاينة صورة السيلفي الحية:</span>
                <div className="h-44 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <UserCheck className="w-12 h-12 text-teal-400" />
                  <span className="text-xs font-bold text-white block">التحقق الحي (Liveness Verified)</span>
                  <span className="text-[10px] text-teal-400 font-mono">مطابقة الملامح: {selectedItem.aiFaceMatchScore}%</span>
                </div>
              </div>
            </div>

            {/* أزرار اتخاذ القرار */}
            {selectedItem.status === 'pending' ? (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleApprove(selectedItem.id)}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>اعتماد التوثيق ومنح الشارة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-700 text-slate-300 border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>رفض الطلب</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>تم البت في هذا الطلب: <strong>{selectedItem.status === 'verified' ? 'معتمد' : 'مرفوض'}</strong></span>
                {selectedItem.rejectionReason && (
                  <span className="text-rose-400">السبب: {selectedItem.rejectionReason}</span>
                )}
              </div>
            )}

            {/* نافذة تحديد سبب الرفض إن تم النقر */}
            {showRejectModal && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 space-y-3 animate-fadeIn">
                <span className="text-xs font-bold text-rose-300 block">حدد سبب رفض طلب التوثيق (يُرسل للمستخدم عبر SMS):</span>
                <input
                  type="text"
                  placeholder="مثال: الصورة غير واضحة، يرجى إعادة تصوير البطاقة في إضاءة جيدة..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-950 border border-rose-700/60 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedItem.id)}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                  >
                    تأكيد الرفض والإشعار
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
