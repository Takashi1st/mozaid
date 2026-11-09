'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Radar, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  Ban, 
  RotateCcw, 
  Server, 
  Users, 
  Lock, 
  Eye, 
  Smartphone,
  Network
} from 'lucide-react';

interface ShillIncident {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  suspectBidderId: string;
  suspectBidderName: string;
  sharedIp: string;
  carrierProvider: string;
  shillRiskScore: number; // 0 - 100%
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detectionReason: string;
  detectedAt: string;
  status: 'monitoring' | 'banned' | 'dismissed';
}

const INITIAL_INCIDENTS: ShillIncident[] = [
  {
    id: 'inc-901',
    listingId: 'auc-002',
    listingTitle: 'أرض سكنية تجارية 8 لبن حر على شارع 24م بيت بوس',
    sellerId: 'seller-33',
    suspectBidderId: 'u-109',
    suspectBidderName: 'حساب ظل (صقر اليمن)',
    sharedIp: '175.45.176.22 (يمن نت ADSL)',
    carrierProvider: 'YemenNet Sanaa Subnet',
    shillRiskScore: 88,
    riskLevel: 'CRITICAL',
    detectionReason: 'تطابق كامل لعنوان IP بين البائع والمزايد مع رفع السعر بـ 4 مزايدات متتالية ثم التوقف التام.',
    detectedAt: 'منذ 12 دقيقة',
    status: 'monitoring',
  },
  {
    id: 'inc-902',
    listingId: 'auc-004',
    listingTitle: 'دفعة أجهزة لابتوب ديل ولينوفو ThinkPad الجيل الـ 12',
    sellerId: 'seller-88',
    suspectBidderId: 'u-214',
    suspectBidderName: 'مزايد سريع #214',
    sharedIp: '185.80.220.14',
    carrierProvider: 'YOU 4G Taiz',
    shillRiskScore: 64,
    riskLevel: 'HIGH',
    detectionReason: 'نمط مزايدة آلي بفارق 400 مللي ثانية متكرر لرفع الحد الأدنى.',
    detectedAt: 'منذ 35 دقيقة',
    status: 'monitoring',
  },
  {
    id: 'inc-903',
    listingId: 'auc-001',
    listingTitle: 'تويوتا لاندكروزر V8 صالون 2022 نظيف مجمرك',
    sellerId: 'seller-99',
    suspectBidderId: 'u-101',
    suspectBidderName: 'م. أحمد الحاشدي',
    sharedIp: '134.35.12.90',
    carrierProvider: 'YemenMobile 4G LTE',
    shillRiskScore: 12,
    riskLevel: 'LOW',
    detectionReason: 'مزايد طبيعي موثق KYC بالبطاقة الوطنية من محافظة مختلفة.',
    detectedAt: 'منذ ساعة',
    status: 'dismissed',
  },
];

export default function AdminAiSecurityPage() {
  const [incidents, setIncidents] = useState<ShillIncident[]>(INITIAL_INCIDENTS);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  // حظر حساب الظل وبصمة جهازه
  const handleBanUserAndDevice = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          setActionAlert(
            `تم حظر الحساب المشبوه (${inc.suspectBidderName}) وتجميد بصمة جهازه وعنوان IP (${inc.sharedIp}) نهائياً.`
          );
          return { ...inc, status: 'banned' };
        }
        return inc;
      })
    );
  };

  // استبعاد وتبرئة الحالة
  const handleDismissIncident = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id === incidentId) {
          setActionAlert(`تم استبعاد التنبيه للحادثة (${inc.id}) وتصنيفها كحركة طبيعية.`);
          return { ...inc, status: 'dismissed' };
        }
        return inc;
      })
    );
  };

  return (
    <div className="space-y-6">
      
      {/* رأس المركز */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1">
            <Radar className="w-4 h-4" />
            <span>نظام مكافحة الاحتيال والتلاعب في المزايدات</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            رصد المزايدات الوهمية وحماية عدالة الأسعار
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            رصد أنماط المزايدات المشبوهة وحسابات رفع الأسعار بالتواطؤ وحظر الأجهزة المخالفة لحماية حقوق المزايدين.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-rose-400 bg-rose-950/80 border border-rose-800/80 px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>الدرع الأمني نشط</span>
          </span>
        </div>
      </div>

      {/* شريط الإشعار بالإجراء */}
      {actionAlert && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/80 text-indigo-200 text-xs flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-semibold leading-relaxed">{actionAlert}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* لوحة التهديدات والحوادث المرصودة */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* العمود الأيمن: قائمة التنبيهات المكتشفة (8 أعمدة) */}
        <div className="lg:col-span-8 space-y-4">
          <span className="text-xs font-bold text-slate-400 block">
            الحسابات والمزايدات المشتبه بها قيد المراقبة:
          </span>

          <div className="space-y-4">
            {incidents.map((inc) => {
              const isCritical = inc.riskLevel === 'CRITICAL';
              const isHigh = inc.riskLevel === 'HIGH';
              return (
                <div
                  key={inc.id}
                  className={`rounded-3xl p-6 border transition space-y-4 ${
                    inc.status === 'banned'
                      ? 'bg-slate-950/70 border-slate-800 opacity-60'
                      : isCritical
                      ? 'bg-slate-900 border-rose-500/70 shadow-lg shadow-rose-950/20'
                      : isHigh
                      ? 'bg-slate-900 border-amber-500/60'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {inc.id}
                      </span>
                      <span className="text-xs text-white font-bold">{inc.listingTitle}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono ${
                        isCritical
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : isHigh
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        مخاطرة {inc.riskLevel} • {inc.shillRiskScore}%
                      </span>
                    </div>
                  </div>

                  {/* بيانات تقارب الشبكة والأجهزة */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">المزايد المشبوه:</span>
                      <span className="font-bold text-white block">{inc.suspectBidderName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({inc.suspectBidderId})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">عنوان IP المشترك:</span>
                      <span className="font-mono font-bold text-rose-400 block">{inc.sharedIp}</span>
                      <span className="text-[10px] text-slate-500">{inc.carrierProvider}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">صاحب المزاد (البائع):</span>
                      <span className="font-bold text-white block">{inc.sellerId}</span>
                      <span className="text-[10px] text-slate-500">نفس الشبكة المحلية</span>
                    </div>
                  </div>

                  {/* تقرير سبب الكشف */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400">تحليل رادار الذكاء الاصطناعي للحادثة:</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {inc.detectionReason}
                    </p>
                  </div>

                  {/* أزرار الإجراء الإداري */}
                  {inc.status === 'monitoring' ? (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-[11px] text-slate-500 font-mono">{inc.detectedAt}</span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDismissIncident(inc.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          استبعاد التنبيه
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBanUserAndDevice(inc.id)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>حظر الحساب وبصمة الجهاز نهائياً</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span>الحالة الحالية: <strong className={inc.status === 'banned' ? 'text-rose-400 inline-flex items-center gap-1' : 'text-slate-300'}>
                        {inc.status === 'banned' ? (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            <span>تم الحظر وإدراج الجهاز بالقائمة السوداء</span>
                          </>
                        ) : (
                          'مستبعد ومغلق'
                        )}
                      </strong></span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* العمود الأيسر: إحصائيات الرادار والقائمة السوداء (4 أعمدة) */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
            <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>معايير درع كشف الاحتيال</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">1. تتبع نطاقات الاتصال:</span>
                <p className="text-slate-400 text-[11px]">
                  مقارنة عناوين الاتصال بين صاحب المزاد وأي مزايد على نفس السلعة لمنع رفع الأسعار المصطنع.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">2. بصمة الجهاز التقنية:</span>
                <p className="text-slate-400 text-[11px]">
                  تجميد بصمة متصفح الهاتف أو الكمبيوتر لمنع المحتال من إعادة إنشاء حسابات بديلة من نفس الجهاز.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">3. فحص روبوتات المزايدة:</span>
                <p className="text-slate-400 text-[11px]">
                  رصد المزايدات فائقة السرعة التي تقل عن 500 مللي ثانية وتجميدها آلياً.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-3 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" />
              <span>القائمة السوداء النشطة</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-300 block">FP-994102-ANDR</span>
                  <span className="text-[10px] text-slate-500">جهاز سامسونج - صنعاء</span>
                </div>
                <span className="text-rose-400 text-[10px] font-bold">محظور نهائياً</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-slate-300 block">IP: 185.80.220.14</span>
                  <span className="text-[10px] text-slate-500">نطاق شبكة مشبوه</span>
                </div>
                <span className="text-rose-400 text-[10px] font-bold">محظور</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
