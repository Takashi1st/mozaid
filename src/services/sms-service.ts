/**
 * خدمة محاكاة بوابة الرسائل القصيرة والتحقق لشبكات الاتصالات اليمنية
 * (Yemeni SMS & OTP Gateway Service)
 * تدعم شبكات: يمن موبايل (77/78)، يو (73)، سبأفون (71)، وواي (70).
 */

import { PhoneValidationResult, SendOtpResult, VerifyOtpResult, YemenCarrier } from '../types';

interface OtpRecord {
  code: string;
  phone: string;
  expiresAt: number;
  attempts: number;
}

// مخزن الرموز في الذاكرة
const otpStore = new Map<string, OtpRecord>();

// سجل تحديد معدل الطلبات (Rate Limiting) لكل رقم: حد أقصى 3 رسائل خلال 15 دقيقة
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 دقيقة
const MAX_REQUESTS_PER_WINDOW = 3;
const OTP_TTL_MS = 5 * 60 * 1000; // صلاحية الرمز 5 دقائق

/**
 * فحص وتصنيف وتطبيع رقم الهاتف اليمني وفق شبكات الاتصالات المحلية
 */
export function validateYemenPhoneNumber(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      carrier: 'Unknown',
      normalized: '',
      carrierNameAr: 'غير معروف',
    };
  }

  // تنظيف الرقم من المسافات والأقواس والشرطات وعلامة الزائد
  const clean = phone.replace(/[\s\-\(\)\+]/g, '');

  let localNum = '';
  if (clean.startsWith('00967')) {
    localNum = clean.slice(5);
  } else if (clean.startsWith('967')) {
    localNum = clean.slice(3);
  } else if (clean.startsWith('0') && clean.length === 10) {
    localNum = clean.slice(1);
  } else if (clean.length === 9) {
    localNum = clean;
  } else {
    return {
      isValid: false,
      carrier: 'Unknown',
      normalized: clean,
      carrierNameAr: 'رقم غير صالح',
    };
  }

  // فحص أن الرقم يتكون تماماً من 9 أرقام عددية
  if (!/^\d{9}$/.test(localNum)) {
    return {
      isValid: false,
      carrier: 'Unknown',
      normalized: localNum,
      carrierNameAr: 'طول الرقم غير صحيح',
    };
  }

  const prefix = localNum.slice(0, 2);
  let carrier: YemenCarrier = 'Unknown';
  let carrierNameAr = 'غير معروف';

  switch (prefix) {
    case '77':
    case '78':
      carrier = 'YemenMobile';
      carrierNameAr = 'يمن موبايل (Yemen Mobile)';
      break;
    case '73':
      carrier = 'YOU';
      carrierNameAr = 'يو للهاتف النقال (YOU)';
      break;
    case '71':
      carrier = 'Sabafon';
      carrierNameAr = 'سبأفون (Sabafon)';
      break;
    case '70':
      carrier = 'Y';
      carrierNameAr = 'واي للاتصالات (Y)';
      break;
    default:
      carrier = 'Unknown';
      carrierNameAr = 'شبكة يمنية غير معروفة';
  }

  const isValid = carrier !== 'Unknown';
  const normalized = isValid ? `967${localNum}` : localNum;

  return {
    isValid,
    carrier,
    normalized,
    carrierNameAr,
  };
}

/**
 * إرسال رمز التحقق OTP لرقم الهاتف اليمني مع تطبيق محدد معدل الطلب
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const validation = validateYemenPhoneNumber(phone);
  if (!validation.isValid) {
    return {
      success: false,
      verificationId: '',
      error: 'رقم الهاتف غير صالح. يجب أن يبدأ بـ (77 أو 78 أو 73 أو 71 أو 70) ويتكون من 9 أرقام.',
    };
  }

  const now = Date.now();
  const normalizedPhone = validation.normalized;

  // فحص محدد المعدل (Rate Limiting)
  const userTimestamps = rateLimitMap.get(normalizedPhone) || [];
  const validTimestamps = userTimestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      success: false,
      verificationId: '',
      error: 'لقد تجاوزت الحد الأقصى لمحاولات إرسال رمز التحقق (3 محاولات). يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً.',
    };
  }

  validTimestamps.push(now);
  rateLimitMap.set(normalizedPhone, validTimestamps);

  // توليد رمز مكون من 6 أرقام عشوائية
  const simulatedCode = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationId = `v_${now}_${Math.random().toString(36).substring(2, 9)}`;

  otpStore.set(verificationId, {
    code: simulatedCode,
    phone: normalizedPhone,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  });

  return {
    success: true,
    verificationId,
    simulatedCode,
    carrier: validation.carrier,
  };
}

/**
 * التحقق من صحة كود OTP المدخل وإلغاء الرمز فور التحقق لمنع إعادة الاستخدام
 */
export async function verifyOtp(verificationId: string, code: string): Promise<VerifyOtpResult> {
  if (!verificationId || !code) {
    return {
      success: false,
      error: 'معرف التحقق ورمز OTP مطلوبان.',
    };
  }

  const record = otpStore.get(verificationId);

  if (!record) {
    return {
      success: false,
      error: 'رمز التحقق غير موجود أو تم استخدامه مسبقاً أو انتهت صلاحيته.',
    };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    otpStore.delete(verificationId);
    return {
      success: false,
      error: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
    };
  }

  record.attempts += 1;
  if (record.attempts > 3) {
    otpStore.delete(verificationId);
    return {
      success: false,
      error: 'تم تجاوز الحد الأقصى لمحاولات الإدخال الخاطئة. تم إلغاء الرمز.',
    };
  }

  if (record.code !== code.trim()) {
    return {
      success: false,
      error: 'رمز التحقق غير صحيح. يرجى التأكد وإعادة المحاولة.',
    };
  }

  // نجاح التحقق: حذف الرمز لمنع هجمات إعادة التشغيل (Replay Attack Prevention)
  otpStore.delete(verificationId);

  return {
    success: true,
  };
}

/**
 * إعادة تهيئة المخزن بالكامل (لأغراض الاختبارات الآلية)
 */
export function resetSmsSimulationStore(): void {
  otpStore.clear();
  rateLimitMap.clear();
}

export const clearOtpStore = resetSmsSimulationStore;
