'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AUCTION_RULES } from '../lib/constants';

export interface UseRealtimeCountdownOptions {
  /**
   * موعد انتهاء المزاد (ISO String, Date, or Epoch timestamp in ms)
   */
  targetDate: string | Date | number | null | undefined;

  /**
   * فارق التوقيت بين خادم مزايد وجهاز المستخدم بالمللي ثانية (Server Offset)
   */
  serverOffsetMs?: number;

  /**
   * دالة الاستدعاء عند انتهاء الوقت رسمياً
   */
  onExpire?: () => void;

  /**
   * حد نافذة مكافحة القنص بالثواني (الافتراضي: 120 ثانية)
   */
  antiSnipingThresholdSeconds?: number;

  /**
   * دقة التحديث: 'seconds' | 'milliseconds' | 'adaptive' (الافتراضي: adaptive)
   */
  precision?: 'seconds' | 'milliseconds' | 'adaptive';

  /**
   * مؤشر تمديد المزاد لتفعيل نبض التمديد البصري
   */
  isExtended?: boolean;
}

export type PulseLevel = 'none' | 'warning' | 'critical' | 'extended';

export interface RealtimeCountdownResult {
  totalSeconds: number;
  remainingMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  formatted: string;
  formattedArabic: string;
  isExpired: boolean;
  isCritical: boolean;
  isUrgent: boolean;
  isPulsing: boolean;
  pulseLevel: PulseLevel;
  pulseClassName: string;
}

/**
 * خطاف العد التنازلي فائق الدقة (Millisecond-Precision Synchronized Realtime Countdown Hook)
 * مصمم لتتبع الثواني والأجزاء من الثانية بدقة عالية، وتوفير مؤشرات التحريك لنظام مكافحة القنص (Anti-Sniping).
 */
export function useRealtimeCountdown({
  targetDate,
  serverOffsetMs = 0,
  onExpire,
  antiSnipingThresholdSeconds = AUCTION_RULES.ANTI_SNIPING_TRIGGER_WINDOW_SECONDS,
  precision = 'adaptive',
  isExtended = false,
}: UseRealtimeCountdownOptions): RealtimeCountdownResult {
  const targetTimeMs = useMemo(() => {
    if (!targetDate) return null;
    if (typeof targetDate === 'number') return targetDate;
    if (targetDate instanceof Date) return targetDate.getTime();
    const parsed = new Date(targetDate).getTime();
    return isNaN(parsed) ? null : parsed;
  }, [targetDate]);

  const calculateRemaining = useCallback((): number => {
    if (!targetTimeMs) return 0;
    const nowSynced = Date.now() + serverOffsetMs;
    const diff = targetTimeMs - nowSynced;
    return Math.max(0, diff);
  }, [targetTimeMs, serverOffsetMs]);

  const [remainingMs, setRemainingMs] = useState<number>(() => calculateRemaining());
  const hasTriggeredExpireRef = useRef<boolean>(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    hasTriggeredExpireRef.current = false;
  }, [targetTimeMs]);

  useEffect(() => {
    if (!targetTimeMs) {
      setRemainingMs(0);
      return;
    }

    let isMounted = true;
    let animationFrameId: number | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const updateTimer = () => {
      if (!isMounted) return;
      const currentRemaining = calculateRemaining();
      setRemainingMs(currentRemaining);

      if (currentRemaining <= 0) {
        if (!hasTriggeredExpireRef.current) {
          hasTriggeredExpireRef.current = true;
          onExpireRef.current?.();
        }
      }
    };

    updateTimer();

    // اختيار تردد التحديث بناء على الدقة والوقت المتبقي
    const initialRemaining = calculateRemaining();
    const useHighFrequency =
      precision === 'milliseconds' ||
      (precision === 'adaptive' && initialRemaining <= 60000 && initialRemaining > 0);

    if (useHighFrequency) {
      let lastUpdate = performance.now();
      const tick = (now: number) => {
        if (!isMounted) return;
        // تحديث بمعدل ~30-60 إطار في الثانية للنعومة الفائقة
        if (now - lastUpdate >= 50) {
          updateTimer();
          lastUpdate = now;
        }
        if (calculateRemaining() > 0) {
          animationFrameId = requestAnimationFrame(tick);
        }
      };
      animationFrameId = requestAnimationFrame(tick);
    } else {
      // تردد منخفض للحفاظ على الموارد والبطارية في شبكات الجوال
      intervalId = setInterval(updateTimer, 500);
    }

    return () => {
      isMounted = false;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [targetTimeMs, calculateRemaining, precision]);

  // تفكيك أجزاء الوقت
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = remainingMs % 1000;
  const isExpired = remainingMs <= 0 && targetTimeMs !== null;

  // مؤشرات التنبيه ومكافحة القنص
  const isCritical = totalSeconds <= antiSnipingThresholdSeconds && !isExpired;
  const isUrgent = totalSeconds <= 30 && !isExpired;
  const isPulsing = (isCritical || isExtended) && !isExpired;

  // تحديد مستوى التوهج والنبض
  let pulseLevel: PulseLevel = 'none';
  if (isExtended) {
    pulseLevel = 'extended';
  } else if (isUrgent) {
    pulseLevel = 'critical';
  } else if (isCritical) {
    pulseLevel = 'warning';
  }

  // كلاس Tailwind للنبضات
  let pulseClassName = '';
  switch (pulseLevel) {
    case 'extended':
      pulseClassName = 'animate-pulse text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]';
      break;
    case 'critical':
      pulseClassName = 'animate-ping text-rose-500 drop-shadow-[0_0_16px_rgba(244,63,94,0.8)]';
      break;
    case 'warning':
      pulseClassName = 'animate-pulse text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]';
      break;
    default:
      pulseClassName = 'text-slate-100';
      break;
  }

  // التنسيق الرقمي القياسي
  const pad = (n: number) => n.toString().padStart(2, '0');
  let formatted = '';
  if (isExpired) {
    formatted = '00:00';
  } else if (days > 0) {
    formatted = `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (hours > 0) {
    formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else if (totalSeconds < 10 && precision === 'milliseconds') {
    const tenths = Math.floor(milliseconds / 100);
    formatted = `${pad(minutes)}:${pad(seconds)}.${tenths}`;
  } else {
    formatted = `${pad(minutes)}:${pad(seconds)}`;
  }

  // التنسيق العربي الواضح
  let formattedArabic = '';
  if (isExpired) {
    formattedArabic = 'انتهى المزاد';
  } else if (days > 0) {
    formattedArabic = `${days} يوم و ${hours} ساعة`;
  } else if (hours > 0) {
    formattedArabic = `${hours} ساعة و ${minutes} دقيقة`;
  } else if (minutes > 0) {
    formattedArabic = `${minutes} دقيقة و ${seconds} ثانية`;
  } else {
    formattedArabic = `${seconds} ثانية`;
  }

  return {
    totalSeconds,
    remainingMs,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    formatted,
    formattedArabic,
    isExpired,
    isCritical,
    isUrgent,
    isPulsing,
    pulseLevel,
    pulseClassName,
  };
}
