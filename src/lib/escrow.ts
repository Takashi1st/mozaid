/**
 * محرك الضمان المالي والوساطة المحلية (Mozaid Escrow Engine)
 * يتولى حساب العمولات، تجميد المبالغ، واحتساب مهلة المعاينة والإفراج المالي.
 */

import { AUCTION_RULES } from './constants';
import { EscrowContract, EscrowStatus } from '../types';

export interface EscrowFinancialBreakdown {
  totalAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  sellerPayoutAmount: number;
}

export interface EscrowSplitBreakdown {
  totalAmount: number;
  buyerRefund: number;
  sellerPayout: number;
  platformFeeAmount: number;
  isValid: boolean;
  leakageAmount: number;
}

/**
 * خريطة الانتقالات المعتمدة لآلة حالات عقود الضمان (6-Stage Escrow State Machine)
 * holding -> dispatched -> inspecting -> completed / disputed -> refunded
 */
export const ESCROW_VALID_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  holding: ['dispatched', 'refunded'],
  dispatched: ['inspecting', 'disputed', 'refunded'],
  inspecting: ['completed', 'disputed', 'refunded'],
  disputed: ['completed', 'refunded', 'inspecting'],
  completed: [],
  refunded: [],
};

/**
 * التحقق من مشروعية الانتقال بين حالات عقد الضمان
 */
export function isValidEscrowTransition(
  currentStatus: EscrowStatus,
  targetStatus: EscrowStatus
): boolean {
  if (currentStatus === targetStatus) {
    return false;
  }
  const allowed = ESCROW_VALID_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(targetStatus));
}

/**
 * رمي استثناء موجه في حال كان الانتقال غير قانوني
 */
export function validateEscrowTransition(
  currentStatus: EscrowStatus,
  targetStatus: EscrowStatus
): void {
  if (!isValidEscrowTransition(currentStatus, targetStatus)) {
    throw new Error(
      `انتقال غير صالح لحالة عقد الضمان من '${currentStatus}' إلى '${targetStatus}'.`
    );
  }
}

/**
 * حساب تفاصيل الضمان واقتطاع عمولة المنصة (2.5% Invariant With Zero Balance Leakage)
 */
export function calculateEscrowBreakdown(totalAmount: number): EscrowFinancialBreakdown {
  if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount < 0) {
    throw new Error('مبلغ الصفقة غير صالح.');
  }

  const platformFeePercent = AUCTION_RULES.PLATFORM_FEE_PERCENT; // 2.5%
  // التقريب لأقرب فلسين عشريين بدقة لمنع أي تسريب مالي
  const rawFee = totalAmount * (platformFeePercent / 100);
  const platformFeeAmount = Math.round(rawFee * 100) / 100;
  const sellerPayoutAmount = Math.round((totalAmount - platformFeeAmount) * 100) / 100;

  return {
    totalAmount,
    platformFeePercent,
    platformFeeAmount,
    sellerPayoutAmount,
  };
}

/**
 * حساب تفاصيل القسمة الودية في التحكيم مع ضمان عدم التسريب المالي
 */
export function calculateSplitBreakdown(
  totalAmount: number,
  buyerRefund: number,
  sellerPayout: number
): EscrowSplitBreakdown {
  const roundedBuyer = Math.round(buyerRefund * 100) / 100;
  const roundedSeller = Math.round(sellerPayout * 100) / 100;
  const allocated = Math.round((roundedBuyer + roundedSeller) * 100) / 100;
  const platformFeeAmount = Math.max(0, Math.round((totalAmount - allocated) * 100) / 100);

  const totalSum = Math.round((roundedBuyer + roundedSeller + platformFeeAmount) * 100) / 100;
  const leakageAmount = Math.round(Math.abs(totalAmount - totalSum) * 100) / 100;
  const isValid = allocated <= totalAmount && leakageAmount === 0 && roundedBuyer >= 0 && roundedSeller >= 0;

  return {
    totalAmount,
    buyerRefund: roundedBuyer,
    sellerPayout: roundedSeller,
    platformFeeAmount,
    isValid,
    leakageAmount,
  };
}

/**
 * حساب مبلغ العربون المطلوب للمزاد (Araboon Requirement)
 * افتراضياً 10% من القيمة التقديرية أو السعر الافتتاحي
 */
export function calculateAraboonRequirement(
  basePrice: number,
  customPercent: number = 10
): number {
  if (basePrice <= 0) return 0;
  const percent = Math.max(1, Math.min(customPercent, 50));
  return Math.round((basePrice * (percent / 100)) * 100) / 100;
}

/**
 * بدء نافذة المعاينة والفحص للمشتري (Inspection Window) عند استلام السلعة
 */
export function startInspectionWindow(
  contract: EscrowContract,
  customWindowHours: number = AUCTION_RULES.DEFAULT_INSPECTION_WINDOW_HOURS
): { status: EscrowStatus; inspectionDeadline: Date } {
  const now = new Date();
  const deadline = new Date(now.getTime() + customWindowHours * 60 * 60 * 1000);

  return {
    status: 'inspecting',
    inspectionDeadline: deadline,
  };
}

/**
 * فحص ما إذا كانت مهلة المعاينة قد انقضت تلقائياً لصالح البائع (Auto-Release on Expiry)
 */
export function shouldAutoReleaseFunds(
  contract: EscrowContract,
  referenceDate?: Date
): boolean {
  if (contract.status !== 'inspecting' || !contract.inspectionDeadline) {
    return false;
  }

  const now = referenceDate ? referenceDate.getTime() : Date.now();
  const deadline = new Date(contract.inspectionDeadline).getTime();

  // إذا انقضت مهلة الـ 48 ساعة ولم يفتح المشتري أي نزاع، يتم صرف المبلغ للبائع تلقائياً
  return now >= deadline;
}

/**
 * التحقق مما إذا كانت مهلة المعاينة ما زالت نشطة
 */
export function isInspectionActive(
  contract: EscrowContract,
  referenceDate?: Date
): boolean {
  if (contract.status !== 'inspecting' || !contract.inspectionDeadline) {
    return false;
  }
  const now = referenceDate ? referenceDate.getTime() : Date.now();
  const deadline = new Date(contract.inspectionDeadline).getTime();
  return now < deadline;
}

/**
 * الوقت المتبقي بالمللي ثانية لمهلة المعاينة
 */
export function getRemainingInspectionTimeMs(
  contract: EscrowContract,
  referenceDate?: Date
): number {
  if (!contract.inspectionDeadline) {
    return 0;
  }
  const now = referenceDate ? referenceDate.getTime() : Date.now();
  const deadline = new Date(contract.inspectionDeadline).getTime();
  return Math.max(0, deadline - now);
}
