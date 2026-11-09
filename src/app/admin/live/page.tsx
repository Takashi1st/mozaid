'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Pause, 
  Play, 
  RotateCcw, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Zap, 
  Eye, 
  MapPin,
  Flame,
  ArrowRight
} from 'lucide-react';

interface SupervisedRoom {
  id: string;
  title: string;
  type: 'forward_auction' | 'reverse_tender';
  city: string;
  currency: string;
  currentPrice: number;
  previousPrice: number;
  highestBidder: string;
  timeLeftSeconds: number;
  isPaused: boolean;
  timesExtended: number;
  shillScore: number; // 0 - 100
  status: 'active' | 'extended' | 'paused';
}

const INITIAL_ROOMS: SupervisedRoom[] = [
  {
    id: 'auc-001',
    title: 'تويوتا لاندكروزر V8 صالون 2022 نظيف مجمرك - فحص كامل',
    type: 'forward_auction',
    city: 'صنعاء',
    currency: 'YER',
    currentPrice: 42500000,
    previousPrice: 42250000,
    highestBidder: 'م. أحمد الحاشدي (u-101)',
    timeLeftSeconds: 165,
    isPaused: false,
    timesExtended: 2,
    shillScore: 12, // آمن
    status: 'extended',
  },
  {
    id: 'auc-002',
    title: 'أرض سكنية تجارية 8 لبن حر على شارع 24م بيت بوس',
    type: 'forward_auction',
    city: 'صنعاء',
    currency: 'YER',
    currentPrice: 185000000,
    previousPrice: 184000000,
    highestBidder: 'مكتب الأندلس (u-204)',
    timeLeftSeconds: 3840,
    isPaused: false,
    timesExtended: 0,
    shillScore: 84, // اشتباه تلاعب
    status: 'active',
  },
  {
    id: 'tnd-501',
    title: 'توريد وتركيب منظومة طاقة شمسية هجينة 150 كيلوواط - مستشفى الأمل',
    type: 'reverse_tender',
    city: 'عدن',
    currency: 'USD',
    currentPrice: 72000,
    previousPrice: 74500,
    highestBidder: 'مورد معتمد #8 (s-44)',
    timeLeftSeconds: 39600,
    isPaused: false,
    timesExtended: 0,
    shillScore: 8,
    status: 'active',
  },
];

export default function AdminLiveSupervisionPage() {
  const [rooms, setRooms] = useState<SupervisedRoom[]>(INITIAL_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('auc-001');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  // أوامر الطوارئ
  const handleTogglePause = (roomId: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const nextPaused = !r.isPaused;
          setActionFeedback(
            nextPaused
              ? `تم تجميد الغرفة (${r.id}) مؤقتاً وإيقاف استقبال العروض اللحظية.`
              : `تم استئناف الغرفة (${r.id}) وعادت المزايدة للعمل بشكل طبيعي.`
          );
          return {
            ...r,
            isPaused: nextPaused,
            status: nextPaused ? 'paused' : r.timeLeftSeconds <= 120 ? 'extended' : 'active',
          };
        }
        return r;
      })
    );
  };

  const handleRollbackBid = (roomId: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          setActionFeedback(
            `تم التراجع عن آخر مزايدة ملغاة في الغرفة (${r.id}). تم استعادة السعر السابق: ${r.previousPrice.toLocaleString()} ${r.currency}.`
          );
          return {
            ...r,
            currentPrice: r.previousPrice,
            highestBidder: 'المزايد السابق المعتمد',
          };
        }
        return r;
      })
    );
  };

  const handleManualExtend = (roomId: string, extraSeconds: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const newTime = r.timeLeftSeconds + extraSeconds;
          setActionFeedback(
            `تم تمديد وقت الغرفة (${r.id}) يدوياً بـ +${extraSeconds / 60} دقائق لتعويض انقطاع الاتصالات.`
          );
          return {
            ...r,
            timeLeftSeconds: newTime,
            timesExtended: r.timesExtended + 1,
            status: 'extended',
          };
        }
        return r;
      })
    );
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      
      {/* عنوان المركز ورسائل الطوارئ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>مركز المراقبة اللحظية للطوارئ</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            المراقبة الحية والتدخل الفوري في غرف المزادات
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            متابعة دقيقة لكل مزايدة لحظية، والتدخل الفوري بإيقاف المزاد، التراجع عن العروض الوهمية، أو تمديد الوقت عند طوارئ الشبكة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1.5 rounded-xl font-mono">
            {rooms.length} غرف تحت المراقبة اللحظية
          </span>
        </div>
      </div>

      {/* شريط الإشعار بالإجراء الإداري */}
      {actionFeedback && (
        <div className="p-4 rounded-2xl bg-amber-950/90 border border-amber-600/80 text-amber-200 text-xs flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold leading-relaxed">{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-white text-xs underline shrink-0"
          >
            إغلاق التنبيه
          </button>
        </div>
      )}

      {/* قائمة الغرف الحية وأدوات التحكم */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* العمود الأيمن: قائمة الغرف المتزامنة (7 أعمدة) */}
        <div className="lg:col-span-7 space-y-4">
          <span className="text-xs font-bold text-slate-400 block">اختر غرفة للمعاينة والتحكم:</span>
          
          <div className="space-y-3">
            {rooms.map((room) => {
              const isSelected = room.id === selectedRoomId;
              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-950/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        {room.id}
                      </span>
                      <span className="text-slate-400">{room.city}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      {room.isPaused ? (
                        <span className="text-rose-400 bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-800 text-[11px] font-bold">
                          مجمد مؤقتاً ⏸
                        </span>
                      ) : (
                        <span className="text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800 text-[11px] font-bold">
                          بث حي متزامن ●
                        </span>
                      )}
                      <span className="text-xs text-white font-bold bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                        {formatTimer(room.timeLeftSeconds)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-sm leading-snug">{room.title}</h3>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                      <span>أعلى عرض: <strong className="text-emerald-400 font-mono text-sm">{room.currentPrice.toLocaleString()} {room.currency}</strong></span>
                      <span>صاحب العرض: <strong className="text-slate-200">{room.highestBidder}</strong></span>
                    </div>
                  </div>

                  {/* شريط مؤشر الاشتباه */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>مؤشر الاشتباه:</span>
                    </span>
                    <span className={`font-mono font-bold ${
                      room.shillScore > 70 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {room.shillScore}% {room.shillScore > 70 ? '(اشتباه مرتفع)' : '(طبيعي)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* العمود الأيسر: لوحة أوامر الطوارئ الفورية (5 أعمدة) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 sticky top-20 shadow-2xl">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[11px] text-amber-400 font-mono font-bold block">
                غرفة التحكم المباشرة • {selectedRoom.id}
              </span>
              <h2 className="text-lg font-black text-white mt-1">
                أزرار التدخل الإداري الفوري
              </h2>
            </div>

            {/* بطاقة السعر والوقت للغرفة المحددة */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">السعر النشط الحالي:</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {selectedRoom.currentPrice.toLocaleString()} {selectedRoom.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">السعر السابق المعتمد:</span>
                <span className="text-xs font-mono text-slate-300">
                  {selectedRoom.previousPrice.toLocaleString()} {selectedRoom.currency}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">عدد مرات التمديد لمنع الاحتكار:</span>
                <span className="font-bold text-amber-400 font-mono">
                  {selectedRoom.timesExtended} / 20
                </span>
              </div>
            </div>

            {/* أزرار الطوارئ الإدارية */}
            <div className="space-y-3">
              
              {/* زر تجميد / استئناف المزاد */}
              <button
                type="button"
                onClick={() => handleTogglePause(selectedRoom.id)}
                className={`w-full py-3.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                  selectedRoom.isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                }`}
              >
                {selectedRoom.isPaused ? (
                  <>
                    <Play className="w-4 h-4" />
                    <span>استئناف تشغيل المزاد الحي</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>تجميد المزاد مؤقتاً للطوارئ</span>
                  </>
                )}
              </button>

              {/* زر التراجع عن المزايدة الخاطئة / الوهمية */}
              <button
                type="button"
                onClick={() => handleRollbackBid(selectedRoom.id)}
                className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>إلغاء المزايدة واسترجاع السعر السابق</span>
              </button>

              {/* زر التمديد اليدوي لوقت المزاد */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleManualExtend(selectedRoom.id, 300)}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-teal-400" />
                  <span>تمديد +5 دقائق</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleManualExtend(selectedRoom.id, 600)}
                  className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-teal-400" />
                  <span>تمديد +10 دقائق</span>
                </button>
              </div>

            </div>

            {/* معاينة الغرفة من منظور المستخدم */}
            <div className="pt-2 border-t border-slate-800">
              <Link
                href={`/auctions/${selectedRoom.id}`}
                target="_blank"
                className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs flex items-center justify-center gap-2 transition"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>فتح الغرفة في نافذة المزايد الحية</span>
              </Link>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
