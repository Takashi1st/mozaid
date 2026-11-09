/**
 * ============================================================================
 * خدمة التحقق من الهوية الوطنية اليمنية (Mozaid KYC & Trust Verification Subsystem)
 * ============================================================================
 * تطبق نظام التحقق التدريجي المتوافق مع البيئة والسوق اليمني:
 * - المستوى 0: غير موثق (Unverified).
 * - المستوى 1 (Tier 1): التحقق من رقم الهاتف اليمني عبر رمز SMS OTP (77x, 73x, 71x, 70x).
 * - المستوى 2 (Tier 2): استخراج بيانات البطاقة الشخصية وجواز السفر عبر المحاكاة الذكية للـ OCR
 *   (الرقم الوطني 11 رقماً، الاسم الرباعي، تاريخ الميلاد، المحافظة، ونسبة الدقة).
 * - المستوى 3 (Tier 3): مطابقة الصورة الشخصية الحية (Selfie) وفحص الحيوية (Liveness Detection).
 * - مسار اعتماد المشرفين الإداريين (Admin Review Workflow) مع الإلزام الصارم بذكر سبب الرفض.
 * - محرك تقييم واكتساب شارة "بائع موثوق" (Trusted Seller Badge):
 *   (KYC موثق + أكثر من 5 صفقات ناجحة + تقييم لا يقل عن 4.8 + غير محظور).
 */

import { AuditLog, KYCStatus, UserProfile, UserRole } from '../types';
import { sendOtp, validateYemenPhoneNumber, verifyOtp } from './sms-service';

// ============================================================================
// تعريفات المعاملات والواجهات
// ============================================================================

export interface NationalIdKycData {
  nationalIdNumber: string;
  fullName: string;
  idFrontUrl: string;
  idBackUrl: string;
  birthDate?: string;
  city?: string;
}

export interface SubmitNationalIdParams {
  userId: string;
  nationalIdNumber: string;
  fullName: string;
  idFrontUrl: string;
  idBackUrl: string;
  birthDate?: string;
  city?: string;
}

export interface IdOcrResult {
  ocrConfidence: number;
  extractedFields: {
    fullName: string;
    nationalIdNumber: string;
    birthDate: string;
    governorate: string;
    issueDate?: string;
    documentType: 'yemeni_national_id' | 'yemeni_passport' | 'unknown';
  };
  isValidIdFormat: boolean;
  isSimulated: boolean;
}

export interface LivenessVerificationResult {
  matchConfidence: number; // 0.0 - 1.0
  isLivenessVerified: boolean;
  confidenceScore: number;
  checks: {
    faceDetected: boolean;
    lightingAdequate: boolean;
    glareAbsent: boolean;
    featuresMatch: boolean;
  };
  message: string;
}

export interface TrustedSellerEvaluationResult {
  isEligible: boolean;
  criteria: {
    kycVerified: boolean;
    dealsCountMet: boolean;
    reputationMet: boolean;
    notBanned: boolean;
  };
  user: UserProfile;
}

export interface ReviewKycParams {
  userId: string;
  adminId: string;
  approved: boolean;
  rejectionReason?: string;
}

// ============================================================================
// مخزن بيانات المستخدمين والتوثيق (In-Memory KYC Store)
// ============================================================================

class KycSimulationStore {
  public users: Map<string, UserProfile> = new Map();
  // فهرس لمنع تكرار استخدام نفس الرقم الوطني في أكثر من حساب
  public nationalIdRegistry: Map<string, string> = new Map(); // nationalIdNumber -> userId
  public auditLogs: AuditLog[] = [];

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    const defaultSellerId = 'user-seller-trusted-seed';
    this.users.set(defaultSellerId, {
      id: defaultSellerId,
      fullName: 'هاشم عبد الله الأهدل',
      email: 'hashem@mozaid.ye',
      phoneNumber: '967771234567',
      phoneVerifiedAt: '2026-01-10T12:00:00.000Z',
      role: 'seller',
      kycStatus: 'verified',
      nationalIdNumber: '10019882345',
      idCardFrontUrl: 'https://cdn.mozaid.ye/kyc/seed_front.webp',
      idCardBackUrl: 'https://cdn.mozaid.ye/kyc/seed_back.webp',
      selfieUrl: 'https://cdn.mozaid.ye/kyc/seed_selfie.webp',
      kycVerifiedAt: '2026-01-11T10:00:00.000Z',
      kycVerifiedBy: 'admin-seed',
      city: 'صنعاء',
      reputationScore: 4.95,
      successfulDealsCount: 12,
      isTrustedSeller: true,
      isBanned: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-11T10:00:00.000Z',
    });
    this.nationalIdRegistry.set('10019882345', defaultSellerId);
  }

  public reset() {
    this.users.clear();
    this.nationalIdRegistry.clear();
    this.auditLogs = [];
    this.seedDefaultUsers();
  }

  public getUser(userId: string): UserProfile | undefined {
    return this.users.get(userId);
  }

  public setUser(user: UserProfile) {
    this.users.set(user.id, {
      ...user,
      updatedAt: new Date().toISOString(),
    });
    if (user.nationalIdNumber && (user.kycStatus === 'verified' || user.kycStatus === 'pending_review')) {
      this.nationalIdRegistry.set(user.nationalIdNumber.trim(), user.id);
    }
  }

  public getOrCreateUser(userId: string, defaults?: Partial<UserProfile>): UserProfile {
    let user = this.users.get(userId);
    if (!user) {
      user = {
        id: userId,
        fullName: defaults?.fullName || `مستخدم_${userId.substring(0, 6)}`,
        phoneNumber: defaults?.phoneNumber || '967770000000',
        role: defaults?.role || 'bidder',
        kycStatus: defaults?.kycStatus || 'unverified',
        city: defaults?.city || 'صنعاء',
        reputationScore: defaults?.reputationScore ?? 5.0,
        successfulDealsCount: defaults?.successfulDealsCount ?? 0,
        isTrustedSeller: Boolean(defaults?.isTrustedSeller),
        isBanned: Boolean(defaults?.isBanned),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...defaults,
      };
      this.users.set(userId, user);
    }
    return user;
  }
}

export const kycStore = new KycSimulationStore();

// ============================================================================
// 1. المستوى 1: التحقق عبر الهاتف ورمز OTP (Tier 1 SMS Verification)
// ============================================================================

/**
 * إرسال كود التحقق OTP لرقم هاتف المستخدم
 */
export async function requestPhoneKycOtp(
  userId: string,
  phoneNumber: string
): Promise<{ success: boolean; verificationId: string; simulatedCode?: string; error?: string }> {
  const user = kycStore.getOrCreateUser(userId);

  const validation = validateYemenPhoneNumber(phoneNumber);
  if (!validation.isValid) {
    return {
      success: false,
      verificationId: '',
      error: 'رقم الهاتف اليمني غير صالح. يجب أن يتبع إحدى الشبكات (77x, 78x, 73x, 71x, 70x).',
    };
  }

  const result = await sendOtp(validation.normalized);
  if (!result.success) {
    return {
      success: false,
      verificationId: '',
      error: result.error,
    };
  }

  user.phoneNumber = validation.normalized;
  kycStore.setUser(user);

  return {
    success: true,
    verificationId: result.verificationId,
    simulatedCode: result.simulatedCode,
  };
}

/**
 * تأكيد رمز OTP وترقية المستخدم إلى Tier 1 (رقم موثق)
 */
export async function verifyPhoneKycOtp(
  userId: string,
  verificationId: string,
  otpCode: string
): Promise<{ success: boolean; user: UserProfile; error?: string }> {
  const user = kycStore.getOrCreateUser(userId);

  const result = await verifyOtp(verificationId, otpCode);
  if (!result.success) {
    return {
      success: false,
      user,
      error: result.error || 'رمز التحقق غير صحيح أو انتهت صلاحيته.',
    };
  }

  const now = new Date().toISOString();
  user.phoneVerifiedAt = now;
  user.updatedAt = now;
  kycStore.setUser(user);

  return {
    success: true,
    user,
  };
}

// ============================================================================
// 2. المستوى 2: المعالجة الذكية للهوية اليمنية واستخراج الـ OCR (Tier 2 ID OCR)
// ============================================================================

/**
 * محاكاة استخراج وتحليل بيانات البطاقة الشخصية اليمنية وجواز السفر عبر الذكاء الاصطناعي (OCR)
 * متوافقة مع متطلبات الواجهة البرمجية المحددة في PROJECT.md
 */
export async function processIdOcr(idFrontUrl: string): Promise<IdOcrResult> {
  if (!idFrontUrl || !idFrontUrl.trim()) {
    throw new Error('رابط صورة البطاقة الشخصية / جواز السفر مطلوب لإجراء المعالجة.');
  }

  const cleanUrl = idFrontUrl.trim().toLowerCase();

  // فحص الحالات المرفوضة في صور المحاكاة (غير واضحة، مطموسة، تالفة)
  const isBlurred = cleanUrl.includes('blur') || cleanUrl.includes('corrupt') || cleanUrl.includes('invalid');

  if (isBlurred) {
    return {
      ocrConfidence: 0.35,
      extractedFields: {
        fullName: '',
        nationalIdNumber: '',
        birthDate: '',
        governorate: '',
        documentType: 'unknown',
      },
      isValidIdFormat: false,
      isSimulated: true,
    };
  }

  // استخراج ذكي يحاكي قراءة البطاقة الوطنية اليمنية (11 رقماً تبدأ غالباً بكود المحافظة 01 أو 10)
  const isPassport = cleanUrl.includes('passport');
  const nationalIdNumber = isPassport
    ? `P${Math.floor(1000000 + Math.random() * 9000000)}`
    : `1001${Math.floor(1000000 + Math.random() * 9000000)}`;

  const extractedFields = {
    fullName: isPassport ? 'صالح محمد أحمد العولقي' : 'عمر عبد الرحمن قائد الشميري',
    nationalIdNumber,
    birthDate: '1992-08-24',
    governorate: isPassport ? 'عدن' : 'تعز',
    issueDate: '2022-03-15',
    documentType: (isPassport ? 'yemeni_passport' : 'yemeni_national_id') as
      | 'yemeni_national_id'
      | 'yemeni_passport',
  };

  return {
    ocrConfidence: 0.96,
    extractedFields,
    isValidIdFormat: true,
    isSimulated: true,
  };
}

/**
 * تقديم طلب التوثيق بالبطاقة الوطنية (National ID KYC Submission)
 * يدعم الاستدعاء بكائن المعلمات أو بالمعاملات المنفصلة (مطابق لعقد PROJECT.md)
 */
export async function submitNationalIdKyc(
  paramsOrUserId: SubmitNationalIdParams | string,
  legacyData?: NationalIdKycData
): Promise<UserProfile> {
  let userId = '';
  let nationalIdNumber = '';
  let fullName = '';
  let idFrontUrl = '';
  let idBackUrl = '';
  let birthDate: string | undefined;
  let city: string | undefined;

  if (typeof paramsOrUserId === 'string') {
    userId = paramsOrUserId;
    if (!legacyData) throw new Error('بيانات الهوية الوطنية مطلوبة.');
    nationalIdNumber = legacyData.nationalIdNumber;
    fullName = legacyData.fullName;
    idFrontUrl = legacyData.idFrontUrl;
    idBackUrl = legacyData.idBackUrl;
    birthDate = legacyData.birthDate;
    city = legacyData.city;
  } else {
    userId = paramsOrUserId.userId;
    nationalIdNumber = paramsOrUserId.nationalIdNumber;
    fullName = paramsOrUserId.fullName;
    idFrontUrl = paramsOrUserId.idFrontUrl;
    idBackUrl = paramsOrUserId.idBackUrl;
    birthDate = paramsOrUserId.birthDate;
    city = paramsOrUserId.city;
  }

  if (!userId || !userId.trim()) throw new Error('معرف المستخدم مطلوب لتقديم طلب التوثيق.');
  if (!nationalIdNumber || !nationalIdNumber.trim()) throw new Error('الرقم الوطني للهوية مطلوب.');
  if (!fullName || !fullName.trim()) throw new Error('الاسم الكامل بالهوية مطلوب.');
  if (!idFrontUrl || !idFrontUrl.trim()) throw new Error('صورة البطاقة من الأمام مطلوبة.');
  if (!idBackUrl || !idBackUrl.trim()) throw new Error('صورة البطاقة من الخلف مطلوبة.');

  const cleanId = nationalIdNumber.trim();

  // فحص منع انتحال الهوية وتكرار استخدام الرقم الوطني في حسابات مختلفة
  const existingOwnerId = kycStore.nationalIdRegistry.get(cleanId);
  if (existingOwnerId && existingOwnerId !== userId) {
    throw new Error(
      `الرقم الوطني (${cleanId}) مسجل مسبقاً في حساب مستخدم آخر. لا يمكن تكرار الهوية الوطنية.`
    );
  }

  // إجراء فحص الـ OCR للتحقق من جودة وصحة المستند
  const ocrResult = await processIdOcr(idFrontUrl);
  if (ocrResult.ocrConfidence < 0.6) {
    throw new Error(
      'صورة البطاقة غير واضحة أو غير قابلة للقراءة آلياً. يرجى إعادة التقاط الصورة بإضاءة واضحة.'
    );
  }

  const user = kycStore.getOrCreateUser(userId);

  // تحديث بيانات المستخدم وتحويل حالته إلى بانتظار المراجعة
  user.nationalIdNumber = cleanId;
  user.fullName = fullName.trim();
  user.idCardFrontUrl = idFrontUrl.trim();
  user.idCardBackUrl = idBackUrl.trim();
  user.kycStatus = 'pending_review';
  user.kycRejectionReason = undefined;
  if (city) user.city = city.trim();

  kycStore.setUser(user);
  return user;
}

// ============================================================================
// 3. المستوى 3: مطابقة الصورة الحية وفحص الحيوية (Tier 3 Selfie Liveness)
// ============================================================================

/**
 * مطابقة الصورة الشخصية الحية مع صورة بطاقة الهوية وفحص الحيوية
 * متوافقة مع متطلبات الواجهة البرمجية في PROJECT.md
 */
export async function verifyLivenessAndSelfie(
  idPortraitUrl: string,
  selfieUrl: string
): Promise<LivenessVerificationResult> {
  if (!idPortraitUrl || !idPortraitUrl.trim()) {
    throw new Error('رابط صورة بطاقة الهوية مطلوب للمقارنة البيومترية.');
  }
  if (!selfieUrl || !selfieUrl.trim()) {
    throw new Error('رابط الصورة الشخصية الحية (Selfie) مطلوب لإجراء فحص الحيوية.');
  }

  const cleanSelfie = selfieUrl.trim().toLowerCase();

  // محاكاة الكشف عن التزوير أو الصور الثابتة أو غير الواضحة
  const isSpoofed =
    cleanSelfie.includes('spoof') ||
    cleanSelfie.includes('mask') ||
    cleanSelfie.includes('static_photo') ||
    cleanSelfie.includes('fake');

  if (isSpoofed) {
    return {
      matchConfidence: 0.28,
      confidenceScore: 0.28,
      isLivenessVerified: false,
      checks: {
        faceDetected: true,
        lightingAdequate: true,
        glareAbsent: false,
        featuresMatch: false,
      },
      message: 'فشل التحقق البيومتري: تم اكتشاف محاولة استخدام صورة شاشة أو صورة غير حية.',
    };
  }

  // نجاح التحقق مع دقة مطابقة عالية
  return {
    matchConfidence: 0.94,
    confidenceScore: 0.94,
    isLivenessVerified: true,
    checks: {
      faceDetected: true,
      lightingAdequate: true,
      glareAbsent: true,
      featuresMatch: true,
    },
    message: 'تمت مطابقة ملامح الوجه بنجاح واجتياز اختبار الحيوية البيومترية.',
  };
}

/**
 * رفع وتأكيد الصورة الحية للمستخدم
 */
export async function submitSelfieLivenessKyc(
  userId: string,
  selfieUrl: string
): Promise<{ user: UserProfile; livenessResult: LivenessVerificationResult }> {
  const user = kycStore.getOrCreateUser(userId);

  if (!user.idCardFrontUrl) {
    throw new Error('يجب رفع صورة البطاقة الشخصية أولاً قبل إجراء المطابقة الحية.');
  }

  const livenessResult = await verifyLivenessAndSelfie(user.idCardFrontUrl, selfieUrl);

  if (!livenessResult.isLivenessVerified) {
    throw new Error(livenessResult.message);
  }

  user.selfieUrl = selfieUrl.trim();
  kycStore.setUser(user);

  return {
    user,
    livenessResult,
  };
}

// ============================================================================
// 4. مسار اعتماد المشرفين الإداريين (Admin Approval / Rejection Workflow)
// ============================================================================

/**
 * مراجعة واعتماد أو رفض طلب التوثيق من قبل المشرف الإداري
 * يدعم الاستدعاء بكائن المعلمات أو بالمعاملات المنفصلة (مطابق لعقد PROJECT.md)
 */
export async function reviewKycSubmission(
  paramsOrUserId: ReviewKycParams | string,
  legacyAdminId?: string,
  legacyApproved?: boolean,
  legacyRejectionReason?: string
): Promise<UserProfile> {
  let userId = '';
  let adminId = '';
  let approved = false;
  let rejectionReason: string | undefined;

  if (typeof paramsOrUserId === 'string') {
    userId = paramsOrUserId;
    adminId = legacyAdminId || '';
    approved = Boolean(legacyApproved);
    rejectionReason = legacyRejectionReason;
  } else {
    userId = paramsOrUserId.userId;
    adminId = paramsOrUserId.adminId;
    approved = paramsOrUserId.approved;
    rejectionReason = paramsOrUserId.rejectionReason;
  }

  if (!userId || !userId.trim()) throw new Error('معرف المستخدم مطلوب للمراجعة الإدارية.');
  if (!adminId || !adminId.trim()) throw new Error('معرف المشرف الإداري مطلوب.');

  const user = kycStore.getUser(userId);
  if (!user) {
    throw new Error('المستخدم المطلوب مراجعة توثيقه غير موجود في النظام.');
  }

  const now = new Date().toISOString();

  if (approved) {
    // اعتماد الهوية وترقية المستخدم إلى verified
    user.kycStatus = 'verified';
    user.kycVerifiedAt = now;
    user.kycVerifiedBy = adminId;
    user.kycRejectionReason = undefined;

    // إعادة فحص شارة البائع الموثوق
    evaluateTrustedSellerBadge(user.id);

    // تسجيل التدقيق الإداري
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      adminId,
      actionType: 'APPROVE_KYC',
      targetTable: 'users',
      targetId: userId,
      details: {
        nationalIdNumber: user.nationalIdNumber,
        verifiedAt: now,
      },
      createdAt: now,
    };
    kycStore.auditLogs.push(auditLog);
  } else {
    // رفض الهوية مع الإلزام الصارم بذكر سبب الرفض
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('سبب الرفض إلزامي عند رفض طلب التحقق من الهوية.');
    }

    user.kycStatus = 'rejected';
    user.kycRejectionReason = rejectionReason.trim();
    user.kycVerifiedAt = undefined;
    user.kycVerifiedBy = undefined;
    user.isTrustedSeller = false; // لا يمكن أن يحمل شارة البائع الموثوق إذا كانت الهوية مرفوضة

    // تسجيل التدقيق الإداري
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      adminId,
      actionType: 'REJECT_KYC',
      targetTable: 'users',
      targetId: userId,
      details: {
        nationalIdNumber: user.nationalIdNumber,
        rejectionReason: rejectionReason.trim(),
        rejectedAt: now,
      },
      createdAt: now,
    };
    kycStore.auditLogs.push(auditLog);
  }

  kycStore.setUser(user);
  return user;
}

// ============================================================================
// 5. محرك شارة البائع الموثوق (Trusted Seller Badge Evaluation)
// ============================================================================

/**
 * تقييم استحقاق وترقية مستويات التوثيق الثلاثة:
 * المستوى 1 (tier1_phone): المستخدم العادي المسجل برقم الهاتف الموثق
 * المستوى 2 (tier2_id_liveness): من تم التحقق من هويته بالبطاقة الشخصية وصورة السيلفي الحية
 * المستوى 3 (tier3_elite_trader): يُمنح تلقائياً عند إتمام 10 صفقات مكتملة سواء كان بيعاً أم شراءً
 */
export function evaluateTrustedSellerBadge(userId: string): TrustedSellerEvaluationResult {
  const user = kycStore.getOrCreateUser(userId);

  // حساب إجمالي الصفقات (بيع أو شراء)
  const totalDeals = (user.successfulDealsCount || 0) + (user.totalCompletedDeals || 0);

  // التحقق من المستوى 2
  const isTier2 = user.kycStatus === 'verified' && Boolean(user.selfieUrl) && Boolean(user.nationalIdNumber);

  // التحقق من المستوى 3: إتمام 10 صفقات بيع أو شراء بنجاح
  const dealsCountMet = totalDeals >= 10;
  const reputationMet = user.reputationScore >= 4.5;
  const notBanned = !user.isBanned;

  const isTier3Eligible = isTier2 && dealsCountMet && reputationMet && notBanned;

  if (isTier3Eligible) {
    user.verificationTier = 'tier3_elite_trader';
    user.isTrustedSeller = true;
  } else if (isTier2) {
    user.verificationTier = 'tier2_id_liveness';
    user.isTrustedSeller = false;
  } else {
    user.verificationTier = 'tier1_phone';
    user.isTrustedSeller = false;
  }

  kycStore.setUser(user);

  return {
    isEligible: isTier3Eligible,
    criteria: {
      kycVerified: isTier2,
      dealsCountMet,
      reputationMet,
      notBanned,
    },
    user,
  };
}

/**
 * تسجيل صفقة ناجحة إضافية للمستخدم (بيع أو شراء) وإعادة تقييم الترقية للمستوى 3 تلقائياً
 */
export async function recordSuccessfulDeal(userId: string, isBuyerDeal: boolean = false): Promise<UserProfile> {
  const user = kycStore.getOrCreateUser(userId);
  if (isBuyerDeal) {
    user.totalCompletedDeals = (user.totalCompletedDeals || 0) + 1;
  } else {
    user.successfulDealsCount = (user.successfulDealsCount || 0) + 1;
  }
  kycStore.setUser(user);

  evaluateTrustedSellerBadge(userId);
  return kycStore.getOrCreateUser(userId);
}

/**
 * تحديث تقييم ثقة المستخدم وإعادة فحص الشارة
 */
export async function updateUserReputation(
  userId: string,
  newReputationScore: number
): Promise<UserProfile> {
  const user = kycStore.getOrCreateUser(userId);
  user.reputationScore = Math.max(1.0, Math.min(5.0, Math.round(newReputationScore * 100) / 100));
  kycStore.setUser(user);

  evaluateTrustedSellerBadge(userId);
  return kycStore.getOrCreateUser(userId);
}

// ============================================================================
// 6. استعلامات وتصفح بيانات التوثيق (Queries & Store Helpers)
// ============================================================================

/**
 * جلب الملف الشخصي للمستخدم
 */
export function getUserProfile(userId: string): UserProfile | undefined {
  return kycStore.getUser(userId);
}

/**
 * حفظ أو تحديث بيانات مستخدم
 */
export function upsertUserProfile(user: Partial<UserProfile> & { id: string }): UserProfile {
  const existing = kycStore.getOrCreateUser(user.id, user);
  const updated: UserProfile = { ...existing, ...user, updatedAt: new Date().toISOString() };
  kycStore.setUser(updated);
  return updated;
}

/**
 * جلب قائمة الطلبات المعلقة بانتظار مراجعة الإدارة (Pending KYC Submissions)
 */
export function getPendingKycSubmissions(): UserProfile[] {
  return Array.from(kycStore.users.values()).filter((u) => u.kycStatus === 'pending_review');
}

/**
 * جلب قائمة المستخدمين الموثقين
 */
export function getVerifiedUsers(): UserProfile[] {
  return Array.from(kycStore.users.values()).filter((u) => u.kycStatus === 'verified');
}

/**
 * جلب قائمة سجلات التدقيق الإداري
 */
export function getKycAuditLogs(): AuditLog[] {
  return [...kycStore.auditLogs];
}

/**
 * إعادة تهيئة مخزن الـ KYC بالكامل (لأغراض الاختبارات الآلية)
 */
export function resetKycStore(): void {
  kycStore.reset();
}
