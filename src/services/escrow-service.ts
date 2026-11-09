/**
 * ============================================================================
 * خدمة الضمان المالي والوساطة المحلية (Mozaid Escrow & Financial Ledger Service)
 * ============================================================================
 * تدير دورة حياة عقود الوساطة المالية بالكامل:
 * 1. آلة الحالات السداسية (6-Stage State Machine):
 *    holding -> dispatched -> inspecting -> completed / disputed -> refunded
 * 2. احتساب عمولة المنصة (2.5%) مع حماية صارمة لمنع أي تسريب مالي (Zero Balance Leakage).
 * 3. حجز العربون وتأمينات المزايدة وردها تلقائياً للمزايدين الخاسرين عند إغلاق المزاد.
 * 4. مهلة المعاينة الميدانية (48 ساعة)، والتحقق من الصرف التلقائي أو التأكيد اليدوي للمشتري.
 * 5. غرفة التحكيم وفض النزاعات وإصدار الأحكام الإدارية الملزمة (استرداد، صرف، أو قسمة ودية).
 * 6. دفتر حسابات عمولات المنصة ومطابقة أرصدة المحافظ (Available vs Frozen).
 */

import {
  AuditLog,
  Currency,
  DisputeMessage,
  DisputeRecord,
  DisputeStatus,
  EscrowContract,
  EscrowStatus,
  TransactionRecord,
  UserRole,
} from '../types';
import {
  calculateEscrowBreakdown,
  calculateSplitBreakdown,
  isInspectionActive,
  shouldAutoReleaseFunds,
  validateEscrowTransition,
} from '../lib/escrow';
import { paymentStore } from './payment-simulation';

// ============================================================================
// تعريفات السجلات والأنواع الداخلية للخدمة
// ============================================================================

export interface BidDepositHoldRecord {
  id: string;
  userId: string;
  listingId: string;
  amount: number;
  currency: Currency;
  status: 'held' | 'refunded' | 'applied_to_escrow' | 'forfeited';
  heldAt: string;
  refundedAt?: string;
  appliedAt?: string;
}

export interface PlatformFeeLedgerSummary {
  currency: Currency;
  cumulativeFee: number;
  totalVolume: number;
  dealCount: number;
  lastUpdated: string;
}

export interface CreateEscrowContractParams {
  listingId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  currency?: Currency;
  inspectionWindowHours?: number;
  useWinnerDeposit?: boolean;
}

export interface FileDisputeParams {
  escrowId: string;
  buyerId: string;
  reason: string;
  description?: string;
  evidenceUrls?: string[];
}

export interface AddDisputeMessageParams {
  disputeId: string;
  senderId: string;
  senderRole?: UserRole;
  senderName?: string;
  message: string;
  attachmentUrl?: string;
  isStaffInternalNote?: boolean;
}

export interface SettleDisputeParams {
  disputeId: string;
  adminId: string;
  ruling: 'resolved_refund' | 'resolved_payout' | 'resolved_split';
  splitDetails?: {
    buyerRefund: number;
    sellerPayout: number;
  };
  resolutionNotes?: string;
}

// ============================================================================
// مخزن حالة الضمان في الذاكرة (Escrow Simulation Store)
// ============================================================================

class EscrowSimulationStore {
  public contracts: Map<string, EscrowContract> = new Map();
  public listingContracts: Map<string, string> = new Map(); // listingId -> escrowId
  public disputes: Map<string, DisputeRecord> = new Map();
  public escrowDisputes: Map<string, string> = new Map(); // escrowId -> disputeId
  public disputeMessages: Map<string, DisputeMessage[]> = new Map(); // disputeId -> messages
  public depositHolds: Map<string, BidDepositHoldRecord> = new Map(); // depositHoldId -> record
  public auditLogs: AuditLog[] = [];
  public feeLedger: Map<Currency, PlatformFeeLedgerSummary> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const currencies: Currency[] = ['YER', 'USD', 'SAR'];
    for (const cur of currencies) {
      this.feeLedger.set(cur, {
        currency: cur,
        cumulativeFee: 0,
        totalVolume: 0,
        dealCount: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  public reset() {
    this.contracts.clear();
    this.listingContracts.clear();
    this.disputes.clear();
    this.escrowDisputes.clear();
    this.disputeMessages.clear();
    this.depositHolds.clear();
    this.auditLogs = [];
    this.feeLedger.clear();
    this.seedDefaults();
  }
}

export const escrowStore = new EscrowSimulationStore();

// ============================================================================
// 1. إدارة العربون وتأمينات المزايدة (Araboon / Bid Deposit Locking & Refund)
// ============================================================================

/**
 * تجميد مبلغ العربون في محفظة المزايد كشرط لدخول مزاد
 */
export async function lockBidDeposit(params: {
  userId: string;
  listingId: string;
  depositAmount: number;
  currency?: Currency;
}): Promise<{ success: boolean; depositRecord: BidDepositHoldRecord; newFrozenBalance: number }> {
  const { userId, listingId, depositAmount, currency = 'YER' } = params;

  if (!userId || !userId.trim()) {
    throw new Error('معرف المستخدم مطلوب لحجز تأمين المزاد.');
  }
  if (!listingId || !listingId.trim()) {
    throw new Error('معرف المزاد مطلوب لحجز تأمين المزاد.');
  }
  if (typeof depositAmount !== 'number' || depositAmount <= 0) {
    throw new Error('مبلغ العربون يجب أن يكون قيمة موجبة.');
  }

  const wallet = paymentStore.getOrCreateWallet(userId, currency);

  if (wallet.availableBalance < depositAmount) {
    throw new Error(
      `رصيد المحفظة المتاح (${wallet.availableBalance.toLocaleString()} ${currency}) غير كافٍ لحجز عربون المزاد المطلـوب (${depositAmount.toLocaleString()} ${currency}).`
    );
  }

  // تجميد المبلغ في المحفظة
  wallet.availableBalance = Math.round((wallet.availableBalance - depositAmount) * 100) / 100;
  wallet.frozenEscrowBalance = Math.round((wallet.frozenEscrowBalance + depositAmount) * 100) / 100;
  wallet.updatedAt = new Date().toISOString();
  paymentStore.setWallet(wallet);

  const holdId = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const depositRecord: BidDepositHoldRecord = {
    id: holdId,
    userId,
    listingId,
    amount: depositAmount,
    currency,
    status: 'held',
    heldAt: new Date().toISOString(),
  };

  escrowStore.depositHolds.set(holdId, depositRecord);

  // تسجيل العملية في سجل المعاملات المالية
  const tx: TransactionRecord = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    walletId: wallet.id,
    userId,
    listingId,
    type: 'bid_deposit_hold',
    status: 'approved',
    channel: 'internal_balance',
    amount: depositAmount,
    currency,
    adminNotes: `حجز عربون لدخول المزاد ${listingId}`,
    createdAt: new Date().toISOString(),
  };
  paymentStore.setTransaction(tx);

  return {
    success: true,
    depositRecord,
    newFrozenBalance: wallet.frozenEscrowBalance,
  };
}

/**
 * فك تجميد وإرجاع مبالغ العربون لجميع المزايدين الخاسرين تلقائياً عند انتهاء المزاد
 */
export async function refundBidDepositsForLosers(params: {
  listingId: string;
  winningBidderId?: string | null;
  currency?: Currency;
}): Promise<{
  refundedBiddersCount: number;
  totalRefundedAmount: number;
  refundedUserIds: string[];
}> {
  const { listingId, winningBidderId, currency = 'YER' } = params;

  if (!listingId || !listingId.trim()) {
    throw new Error('معرف المزاد مطلوب لتنفيذ استرجاع العربونات.');
  }

  const allHolds = Array.from(escrowStore.depositHolds.values()).filter(
    (h) => h.listingId === listingId && h.status === 'held'
  );

  let refundedBiddersCount = 0;
  let totalRefundedAmount = 0;
  const refundedUserIds: string[] = [];

  for (const hold of allHolds) {
    // إذا كان هذا المستخدم هو الفائز النهائي، يتم الإبقاء على عربونه لتسويته في عقد الضمان
    if (winningBidderId && hold.userId === winningBidderId) {
      continue;
    }

    const wallet = paymentStore.getOrCreateWallet(hold.userId, hold.currency || currency);

    // إلغاء التجميد وإعادة المبلغ للرصيد المتاح
    wallet.frozenEscrowBalance = Math.max(
      0,
      Math.round((wallet.frozenEscrowBalance - hold.amount) * 100) / 100
    );
    wallet.availableBalance = Math.round((wallet.availableBalance + hold.amount) * 100) / 100;
    wallet.updatedAt = new Date().toISOString();
    paymentStore.setWallet(wallet);

    hold.status = 'refunded';
    hold.refundedAt = new Date().toISOString();
    escrowStore.depositHolds.set(hold.id, hold);

    // تسجيل معاملة الاسترجاع
    const tx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      walletId: wallet.id,
      userId: hold.userId,
      listingId,
      type: 'bid_deposit_refund',
      status: 'approved',
      channel: 'internal_balance',
      amount: hold.amount,
      currency: hold.currency,
      adminNotes: `استرجاع عربون المزاد ${listingId} لعدم رسو المزاد`,
      createdAt: new Date().toISOString(),
    };
    paymentStore.setTransaction(tx);

    refundedBiddersCount += 1;
    totalRefundedAmount = Math.round((totalRefundedAmount + hold.amount) * 100) / 100;
    refundedUserIds.push(hold.userId);
  }

  return {
    refundedBiddersCount,
    totalRefundedAmount,
    refundedUserIds,
  };
}

/**
 * جلب سجلات العربون المحجوزة لمزاد محدد
 */
export function getListingDepositHolds(listingId: string): BidDepositHoldRecord[] {
  return Array.from(escrowStore.depositHolds.values()).filter((h) => h.listingId === listingId);
}

// ============================================================================
// 2. إنشاء عقد الضمان وتمويله (Escrow Contract Creation & Invariant Engine)
// ============================================================================

/**
 * إنشاء عقد الضمان وتمويله من رصيد المشتري
 * يدعم الاستدعاء بكائن المعلمات أو بالمعاملات المنفصلة
 */
export async function createEscrowContract(
  paramsOrListingId: CreateEscrowContractParams | string,
  legacyBuyerId?: string,
  legacySellerId?: string,
  legacyTotalAmount?: number,
  legacyCurrency?: Currency
): Promise<EscrowContract> {
  let listingId = '';
  let buyerId = '';
  let sellerId = '';
  let totalAmount = 0;
  let currency: Currency = 'YER';
  let inspectionWindowHours = 48;
  let useWinnerDeposit = true;

  if (typeof paramsOrListingId === 'string') {
    listingId = paramsOrListingId;
    buyerId = legacyBuyerId || '';
    sellerId = legacySellerId || '';
    totalAmount = Number(legacyTotalAmount) || 0;
    currency = legacyCurrency || 'YER';
  } else {
    listingId = paramsOrListingId.listingId;
    buyerId = paramsOrListingId.buyerId;
    sellerId = paramsOrListingId.sellerId;
    totalAmount = paramsOrListingId.totalAmount;
    currency = paramsOrListingId.currency || 'YER';
    inspectionWindowHours = paramsOrListingId.inspectionWindowHours || 48;
    useWinnerDeposit = paramsOrListingId.useWinnerDeposit !== false;
  }

  if (!listingId || !listingId.trim()) throw new Error('معرف المزاد مطلوب لإنشاء عقد الضمان.');
  if (!buyerId || !buyerId.trim()) throw new Error('معرف المشتري مطلوب.');
  if (!sellerId || !sellerId.trim()) throw new Error('معرف البائع مطلوب.');
  if (buyerId === sellerId) throw new Error('لا يمكن للمشتري والبائع أن يكونا نفس الطرف.');
  if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
    throw new Error('إجمالي قيمة الصفقة يجب أن يكون رقماً موجباً أكبر من الصفر.');
  }

  // فحص ما إذا كان هناك عقد ضمان مسبق لهذا المزاد
  const existingEscrowId = escrowStore.listingContracts.get(listingId);
  if (existingEscrowId) {
    const existing = escrowStore.contracts.get(existingEscrowId);
    if (existing && existing.status !== 'refunded') {
      return existing;
    }
  }

  // حساب عمولة المنصة (2.5%) مع التأكد من عدم التسريب المالي
  const breakdown = calculateEscrowBreakdown(totalAmount);

  // إدارة تجميد الأموال في محفظة المشتري
  const buyerWallet = paymentStore.getOrCreateWallet(buyerId, currency);

  // التحقق من وجود عربون سابق تم حجزه للمشتري في هذا المزاد
  let depositHoldApplied = 0;
  if (useWinnerDeposit) {
    const winnerHolds = Array.from(escrowStore.depositHolds.values()).filter(
      (h) => h.listingId === listingId && h.userId === buyerId && h.status === 'held'
    );
    for (const hold of winnerHolds) {
      depositHoldApplied = Math.round((depositHoldApplied + hold.amount) * 100) / 100;
      hold.status = 'applied_to_escrow';
      hold.appliedAt = new Date().toISOString();
      escrowStore.depositHolds.set(hold.id, hold);
    }
  }

  // المبلغ الإضافي المطلوب خصمه من الرصيد المتاح للمشتري
  const remainingRequired = Math.max(0, Math.round((totalAmount - depositHoldApplied) * 100) / 100);

  if (buyerWallet.availableBalance < remainingRequired) {
    throw new Error(
      `رصيد المشتري المتاح (${buyerWallet.availableBalance.toLocaleString()} ${currency}) غير كافٍ لتمويل الصفقة. المطلوب بعد احتساب العربون: ${remainingRequired.toLocaleString()} ${currency}.`
    );
  }

  // خصم المبلغ المتبقي من المتاح وإضافته للمجمد
  if (remainingRequired > 0) {
    buyerWallet.availableBalance =
      Math.round((buyerWallet.availableBalance - remainingRequired) * 100) / 100;
    buyerWallet.frozenEscrowBalance =
      Math.round((buyerWallet.frozenEscrowBalance + remainingRequired) * 100) / 100;
    buyerWallet.updatedAt = new Date().toISOString();
    paymentStore.setWallet(buyerWallet);
  }

  const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const contract: EscrowContract = {
    id: escrowId,
    listingId,
    buyerId,
    sellerId,
    totalAmount,
    currency,
    platformFeePercent: breakdown.platformFeePercent,
    platformFeeAmount: breakdown.platformFeeAmount,
    sellerPayoutAmount: breakdown.sellerPayoutAmount,
    status: 'holding',
    createdAt: now,
    updatedAt: now,
  };

  escrowStore.contracts.set(escrowId, contract);
  escrowStore.listingContracts.set(listingId, escrowId);

  // تسجيل المعاملة في دفتر العمليات المالية
  const tx: TransactionRecord = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    walletId: buyerWallet.id,
    userId: buyerId,
    listingId,
    type: 'escrow_lock',
    status: 'approved',
    channel: 'internal_balance',
    amount: totalAmount,
    currency,
    adminNotes: `تجميد قيمة الصفقة في حساب الضمان (شامل العربون: ${depositHoldApplied})`,
    createdAt: now,
  };
  paymentStore.setTransaction(tx);

  return contract;
}

// ============================================================================
// 3. مسار آلة الحالات وانتقالات الضمان (6-Stage Escrow Transitions)
// ============================================================================

/**
 * تحديث حالة الشحن والتجهيز من قبل البائع (holding -> dispatched)
 */
export async function markAsDispatched(
  escrowId: string,
  sellerId: string,
  notes?: string
): Promise<EscrowContract> {
  const contract = escrowStore.contracts.get(escrowId);
  if (!contract) {
    throw new Error('عقد الضمان المطلوب غير موجود.');
  }

  if (contract.sellerId !== sellerId) {
    throw new Error('فقط بائع الصفقة يملك صلاحية تأكيد الشحن والتسليم.');
  }

  validateEscrowTransition(contract.status, 'dispatched');

  const now = new Date().toISOString();
  contract.status = 'dispatched';
  contract.dispatchedAt = now;
  contract.updatedAt = now;
  escrowStore.contracts.set(escrowId, contract);

  return contract;
}

/**
 * تأكيد استلام السلعة وبدء عداد المعاينة (48 ساعة) للمشتري (dispatched -> inspecting)
 */
export async function confirmDeliveryAndStartInspection(
  escrowId: string,
  buyerId: string,
  customWindowHours: number = 48
): Promise<EscrowContract> {
  const contract = escrowStore.contracts.get(escrowId);
  if (!contract) {
    throw new Error('عقد الضمان المطلوب غير موجود.');
  }

  if (contract.buyerId !== buyerId) {
    throw new Error('فقط المشتري يملك صلاحية تأكيد الاستلام الميداني وبدء المعاينة.');
  }

  validateEscrowTransition(contract.status, 'inspecting');

  const now = new Date();
  const deadline = new Date(now.getTime() + customWindowHours * 3600 * 1000);

  contract.status = 'inspecting';
  contract.deliveredConfirmedAt = now.toISOString();
  contract.inspectionDeadline = deadline.toISOString();
  contract.updatedAt = now.toISOString();

  escrowStore.contracts.set(escrowId, contract);
  return contract;
}

/**
 * بدء نافذة المعاينة والعد التنازلي وفق عقد الواجهة البرمجية (PROJECT.md Interface Contract)
 */
export async function startInspectionCountdown(
  escrowId: string,
  hours: number = 48
): Promise<{ deadline: Date }> {
  const contract = escrowStore.contracts.get(escrowId);
  if (!contract) {
    throw new Error('عقد الضمان المطلوب غير موجود.');
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + hours * 3600 * 1000);

  contract.status = 'inspecting';
  contract.inspectionDeadline = deadline.toISOString();
  contract.updatedAt = now.toISOString();

  escrowStore.contracts.set(escrowId, contract);
  return { deadline };
}

/**
 * انتقال الحالة العام وفق آلة الحالات السداسية
 */
export async function transitionEscrowStatus(
  escrowId: string,
  targetStatus: EscrowStatus,
  actorId: string,
  notes?: string
): Promise<EscrowContract> {
  const contract = escrowStore.contracts.get(escrowId);
  if (!contract) {
    throw new Error('عقد الضمان المطلوب غير موجود.');
  }

  validateEscrowTransition(contract.status, targetStatus);

  const now = new Date().toISOString();

  if (targetStatus === 'dispatched') {
    contract.dispatchedAt = now;
  } else if (targetStatus === 'inspecting') {
    contract.deliveredConfirmedAt = now;
    if (!contract.inspectionDeadline) {
      contract.inspectionDeadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    }
  } else if (targetStatus === 'completed') {
    return (await confirmGoodsAcceptance(escrowId, actorId)).contract;
  }

  contract.status = targetStatus;
  contract.updatedAt = now;
  escrowStore.contracts.set(escrowId, contract);

  return contract;
}

// ============================================================================
// 4. الإفراج المالي للمستحقات (Manual Confirmation & Automated Auto-Release)
// ============================================================================

/**
 * موافقة المشتري اليدوية على استلام ومطابقة السلعة وصرف المبلغ للبائع
 */
export async function confirmGoodsAcceptance(
  escrowId: string,
  buyerId: string
): Promise<{
  contract: EscrowContract;
  sellerPayout: number;
  platformFee: number;
}> {
  const contract = escrowStore.contracts.get(escrowId);
  if (!contract) {
    throw new Error('عقد الضمان المطلوب غير موجود.');
  }

  if (contract.buyerId !== buyerId && buyerId !== 'admin' && buyerId !== 'system') {
    throw new Error('فقط المشتري صاحب الصفقة يملك صلاحية اعتماد مطابقة السلعة.');
  }

  if (contract.status === 'completed') {
    return {
      contract,
      sellerPayout: contract.sellerPayoutAmount,
      platformFee: contract.platformFeeAmount,
    };
  }

  if (contract.status !== 'inspecting' && contract.status !== 'dispatched' && contract.status !== 'holding') {
    throw new Error(`لا يمكن صرف الضمان في حالة العقد الحالية: ${contract.status}`);
  }

  const currency = contract.currency || 'YER';
  const now = new Date().toISOString();

  // 1. خصم المبلغ المجمد من محفظة المشتري
  const buyerWallet = paymentStore.getOrCreateWallet(contract.buyerId, currency);
  buyerWallet.frozenEscrowBalance = Math.max(
    0,
    Math.round((buyerWallet.frozenEscrowBalance - contract.totalAmount) * 100) / 100
  );
  buyerWallet.updatedAt = now;
  paymentStore.setWallet(buyerWallet);

  // 2. إيداع صافي المبلغ في الرصيد المتاح للبائع (بعد خصم 2.5% عمولة)
  const sellerWallet = paymentStore.getOrCreateWallet(contract.sellerId, currency);
  sellerWallet.availableBalance =
    Math.round((sellerWallet.availableBalance + contract.sellerPayoutAmount) * 100) / 100;
  sellerWallet.updatedAt = now;
  paymentStore.setWallet(sellerWallet);

  // 3. تقييد عمولة المنصة في دفتر المحاسبة المالي
  creditPlatformCommission(currency, contract.platformFeeAmount, contract.totalAmount);

  // 4. تسجيل المعاملات في السجل المالي
  const payoutTx: TransactionRecord = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    walletId: sellerWallet.id,
    userId: contract.sellerId,
    listingId: contract.listingId,
    type: 'escrow_release',
    status: 'approved',
    channel: 'internal_balance',
    amount: contract.sellerPayoutAmount,
    currency,
    adminNotes: `صرف مستحقات البائع بعد إتمام المعاينة بنجاح (المبلغ الإجمالي: ${contract.totalAmount})`,
    createdAt: now,
  };
  paymentStore.setTransaction(payoutTx);

  const feeTx: TransactionRecord = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    walletId: sellerWallet.id,
    userId: contract.sellerId,
    listingId: contract.listingId,
    type: 'platform_fee',
    status: 'approved',
    channel: 'internal_balance',
    amount: contract.platformFeeAmount,
    currency,
    adminNotes: `اقتطاع عمولة المنصة (2.5%) للصفقة ${contract.id}`,
    createdAt: now,
  };
  paymentStore.setTransaction(feeTx);

  // 5. تحديث حالة العقد إلى مكتمل
  contract.status = 'completed';
  contract.fundsReleasedAt = now;
  contract.updatedAt = now;
  escrowStore.contracts.set(escrowId, contract);

  return {
    contract,
    sellerPayout: contract.sellerPayoutAmount,
    platformFee: contract.platformFeeAmount,
  };
}

/**
 * فحص وتقييم الإفراج التلقائي عند انتهاء مهلة الـ 48 ساعة دون نزاع
 */
export async function evaluateAutoRelease(
  escrowId: string,
  referenceDate?: Date
): Promise<{ released: boolean; reason?: string; contract?: EscrowContract }> {
  const contract = escrowStore.contracts.get(escrowId);
  if (!contract) {
    return { released: false, reason: 'عقد الضمان غير موجود.' };
  }

  if (contract.status === 'completed') {
    return { released: true, reason: 'تم الإفراج المالي مسبقاً عن هذا العقد.', contract };
  }

  if (contract.status === 'disputed') {
    return { released: false, reason: 'العقد قيد النزاع، لا يمكن تنفيذ الإفراج التلقائي.', contract };
  }

  if (contract.status !== 'inspecting') {
    return { released: false, reason: `العقد ليس في فترة المعاينة (الحالة الحالية: ${contract.status}).`, contract };
  }

  if (!contract.inspectionDeadline) {
    return { released: false, reason: 'لم يتم تحديد موعد انتهاء مهلة المعاينة.', contract };
  }

  const expired = shouldAutoReleaseFunds(contract, referenceDate);
  if (!expired) {
    const isStillActive = isInspectionActive(contract, referenceDate);
    return {
      released: false,
      reason: isStillActive
        ? 'مهلة المعاينة (48 ساعة) لا تزال سارية للمشتري.'
        : 'لم تنقضِ مهلة المعاينة بعد.',
      contract,
    };
  }

  // انقضت المهلة دون نزاع -> تنفيذ الصرف التلقائي للبائع
  const result = await confirmGoodsAcceptance(escrowId, 'system');
  return {
    released: true,
    reason: 'انقضت مهلة المعاينة (48 ساعة) دون تسجيل أي نزاع، وتم صرف المبلغ للبائع تلقائياً.',
    contract: result.contract,
  };
}

/**
 * مسح جميع العقود المفتوحة وتنفيذ الإفراج التلقائي للعقود المؤهلة
 */
export async function sweepAndExecuteAutoReleases(
  referenceDate?: Date
): Promise<{ evaluated: number; releasedCount: number }> {
  const allContracts = Array.from(escrowStore.contracts.values()).filter(
    (c) => c.status === 'inspecting'
  );

  let releasedCount = 0;
  for (const contract of allContracts) {
    const res = await evaluateAutoRelease(contract.id, referenceDate);
    if (res.released) {
      releasedCount += 1;
    }
  }

  return {
    evaluated: allContracts.length,
    releasedCount,
  };
}

// ============================================================================
// 5. نظام إدارة النزاعات والتحكيم الملزم (Dispute & Binding Arbitration)
// ============================================================================

/**
 * فتح نزاع رسمي على عقد الضمان
 * يدعم الاستدعاء بكائن المعلمات أو بالمعاملات المنفصلة
 */
export async function fileDispute(
  paramsOrEscrowId: FileDisputeParams | string,
  legacyBuyerId?: string,
  legacyReason?: string,
  legacyEvidenceUrls?: string[]
): Promise<DisputeRecord> {
  let escrowId = '';
  let buyerId = '';
  let reason = '';
  let description = '';
  let evidenceUrls: string[] = [];

  if (typeof paramsOrEscrowId === 'string') {
    escrowId = paramsOrEscrowId;
    buyerId = legacyBuyerId || '';
    reason = legacyReason || 'نزاع على مواصفات السلعة';
    description = legacyReason || 'فتح نزاع رسمي';
    evidenceUrls = legacyEvidenceUrls || [];
  } else {
    escrowId = paramsOrEscrowId.escrowId;
    buyerId = paramsOrEscrowId.buyerId;
    reason = paramsOrEscrowId.reason;
    description = paramsOrEscrowId.description || paramsOrEscrowId.reason;
    evidenceUrls = paramsOrEscrowId.evidenceUrls || [];
  }

  if (!escrowId || !escrowId.trim()) throw new Error('معرف عقد الضمان مطلوب لفتح النزاع.');
  if (!buyerId || !buyerId.trim()) throw new Error('معرف المشتري مطلوب.');
  if (!reason || !reason.trim()) throw new Error('سبب النزاع إلزامي.');

  const contract = escrowStore.contracts.get(escrowId);
  if (!contract) {
    throw new Error('عقد الضمان المطلوب لفتح النزاع غير موجود.');
  }

  if (contract.buyerId !== buyerId && buyerId !== 'admin') {
    throw new Error('فقط المشتري المعني بالصفقة يملك حق فتح النزاع.');
  }

  if (contract.status === 'completed' || contract.status === 'refunded') {
    throw new Error(
      `لا يمكن فتح نزاع على عقد مغلق أو تم صرفه مسبقاً (الحالة الحالية: ${contract.status}).`
    );
  }

  // فحص ما إذا كان هناك نزاع مفتوح مسبقاً
  const existingDisputeId = escrowStore.escrowDisputes.get(escrowId);
  if (existingDisputeId) {
    const existing = escrowStore.disputes.get(existingDisputeId);
    if (existing && existing.status !== 'dismissed') {
      return existing;
    }
  }

  // تحويل حالة عقد الضمان إلى قيد النزاع وتجميد كافة المبالغ
  contract.status = 'disputed';
  contract.updatedAt = new Date().toISOString();
  escrowStore.contracts.set(escrowId, contract);

  const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const dispute: DisputeRecord = {
    id: disputeId,
    escrowId,
    openedBy: buyerId,
    reason: reason.trim(),
    description: description.trim(),
    status: 'opened',
    refundAmountBuyer: 0,
    payoutAmountSeller: 0,
    createdAt: now,
    updatedAt: now,
  };

  escrowStore.disputes.set(disputeId, dispute);
  escrowStore.escrowDisputes.set(escrowId, disputeId);

  // إدراج أول رسالة في غرفة التحكيم الرقمية
  const initialMsg: DisputeMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    disputeId,
    senderId: buyerId,
    senderRole: 'bidder',
    message: description.trim(),
    attachmentUrl: evidenceUrls.length > 0 ? evidenceUrls[0] : undefined,
    isStaffInternalNote: false,
    createdAt: now,
  };

  escrowStore.disputeMessages.set(disputeId, [initialMsg]);

  return dispute;
}

/**
 * إرسال رسالة في غرفة التحكيم الرقمية الثلاثية (مشتري / بائع / مشرف)
 */
export async function addDisputeMessage(
  params: AddDisputeMessageParams
): Promise<DisputeMessage> {
  const {
    disputeId,
    senderId,
    senderRole = 'bidder',
    senderName,
    message,
    attachmentUrl,
    isStaffInternalNote = false,
  } = params;

  if (!disputeId || !disputeId.trim()) throw new Error('معرف النزاع مطلوب.');
  if (!senderId || !senderId.trim()) throw new Error('معرف المرسل مطلوب.');
  if (!message || !message.trim()) throw new Error('نص الرسالة مطلوب.');

  const dispute = escrowStore.disputes.get(disputeId);
  if (!dispute) {
    throw new Error('ملف النزاع غير موجود.');
  }

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const disputeMessage: DisputeMessage = {
    id: msgId,
    disputeId,
    senderId,
    senderRole,
    senderName: senderName || 'مستخدم',
    message: message.trim(),
    attachmentUrl: attachmentUrl?.trim(),
    isStaffInternalNote,
    createdAt: new Date().toISOString(),
  };

  const existingMsgs = escrowStore.disputeMessages.get(disputeId) || [];
  existingMsgs.push(disputeMessage);
  escrowStore.disputeMessages.set(disputeId, existingMsgs);

  return disputeMessage;
}

/**
 * استرجاع سجل رسائل غرفة التحكيم مع حجب الملاحظات الداخلية عن المستخدمين العاديين
 */
export function getDisputeMessages(
  disputeId: string,
  userRole?: UserRole
): DisputeMessage[] {
  const allMsgs = escrowStore.disputeMessages.get(disputeId) || [];
  const isStaff =
    userRole === 'moderator' ||
    userRole === 'finance_admin' ||
    userRole === 'dispute_officer' ||
    userRole === 'super_admin';

  if (isStaff) {
    return allMsgs;
  }

  return allMsgs.filter((m) => !m.isStaffInternalNote);
}

/**
 * إصدار حكم تحكيمي ملزم (Binding Arbitration Ruling)
 * يدعم: الاسترداد الكامل للمشتري، الصرف الكامل للبائع، أو التسوية الودية (Split)
 */
export async function settleDispute(
  paramsOrDisputeId: SettleDisputeParams | string,
  legacyAdminId?: string,
  legacyRuling?: 'resolved_refund' | 'resolved_payout' | 'resolved_split',
  legacySplitDetails?: { buyerRefund: number; sellerPayout: number },
  legacyNotes?: string
): Promise<DisputeRecord> {
  let disputeId = '';
  let adminId = '';
  let ruling: 'resolved_refund' | 'resolved_payout' | 'resolved_split' = 'resolved_refund';
  let splitDetails: { buyerRefund: number; sellerPayout: number } | undefined;
  let resolutionNotes = '';

  if (typeof paramsOrDisputeId === 'string') {
    disputeId = paramsOrDisputeId;
    adminId = legacyAdminId || '';
    ruling = legacyRuling || 'resolved_refund';
    splitDetails = legacySplitDetails;
    resolutionNotes = legacyNotes || '';
  } else {
    disputeId = paramsOrDisputeId.disputeId;
    adminId = paramsOrDisputeId.adminId;
    ruling = paramsOrDisputeId.ruling;
    splitDetails = paramsOrDisputeId.splitDetails;
    resolutionNotes = paramsOrDisputeId.resolutionNotes || '';
  }

  if (!disputeId || !disputeId.trim()) throw new Error('معرف النزاع مطلوب.');
  if (!adminId || !adminId.trim()) throw new Error('معرف المشرف/المحكم مطلوب.');

  const dispute = escrowStore.disputes.get(disputeId);
  if (!dispute) {
    throw new Error('ملف النزاع المطلوب غير موجود.');
  }

  if (
    dispute.status === 'resolved_refund' ||
    dispute.status === 'resolved_payout' ||
    dispute.status === 'resolved_split'
  ) {
    throw new Error(`تم إصدار حكم مسبق في هذا النزاع (الحالة: ${dispute.status}).`);
  }

  const contract = escrowStore.contracts.get(dispute.escrowId);
  if (!contract) {
    throw new Error('عقد الضمان المرتبط بالنزاع غير موجود.');
  }

  const currency = contract.currency || 'YER';
  const totalAmount = contract.totalAmount;
  const buyerWallet = paymentStore.getOrCreateWallet(contract.buyerId, currency);
  const sellerWallet = paymentStore.getOrCreateWallet(contract.sellerId, currency);
  const now = new Date().toISOString();

  if (ruling === 'resolved_refund') {
    // حكم لصالح المشتري: استرداد 100% وإلغاء عمولة المنصة
    buyerWallet.frozenEscrowBalance = Math.max(
      0,
      Math.round((buyerWallet.frozenEscrowBalance - totalAmount) * 100) / 100
    );
    buyerWallet.availableBalance =
      Math.round((buyerWallet.availableBalance + totalAmount) * 100) / 100;
    buyerWallet.updatedAt = now;
    paymentStore.setWallet(buyerWallet);

    const tx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      walletId: buyerWallet.id,
      userId: contract.buyerId,
      listingId: contract.listingId,
      type: 'escrow_refund',
      status: 'approved',
      channel: 'internal_balance',
      amount: totalAmount,
      currency,
      adminNotes: `استرداد كامل للمشتري بقرار التحكيم الإداري (${disputeId})`,
      createdAt: now,
    };
    paymentStore.setTransaction(tx);

    contract.status = 'refunded';
    contract.updatedAt = now;
    escrowStore.contracts.set(contract.id, contract);

    dispute.status = 'resolved_refund';
    dispute.refundAmountBuyer = totalAmount;
    dispute.payoutAmountSeller = 0;
    dispute.resolvedAt = now;
    dispute.resolutionNotes = resolutionNotes || 'حكم التحكيم: استرداد كامل للمشتري لثبوت العيب أو عدم التسليم.';
  } else if (ruling === 'resolved_payout') {
    // حكم لصالح البائع: صرف كامل بعد خصم عمولة المنصة
    buyerWallet.frozenEscrowBalance = Math.max(
      0,
      Math.round((buyerWallet.frozenEscrowBalance - totalAmount) * 100) / 100
    );
    buyerWallet.updatedAt = now;
    paymentStore.setWallet(buyerWallet);

    sellerWallet.availableBalance =
      Math.round((sellerWallet.availableBalance + contract.sellerPayoutAmount) * 100) / 100;
    sellerWallet.updatedAt = now;
    paymentStore.setWallet(sellerWallet);

    creditPlatformCommission(currency, contract.platformFeeAmount, totalAmount);

    const tx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      walletId: sellerWallet.id,
      userId: contract.sellerId,
      listingId: contract.listingId,
      type: 'escrow_release',
      status: 'approved',
      channel: 'internal_balance',
      amount: contract.sellerPayoutAmount,
      currency,
      adminNotes: `صرف كامل للبائع بقرار التحكيم الإداري (${disputeId})`,
      createdAt: now,
    };
    paymentStore.setTransaction(tx);

    contract.status = 'completed';
    contract.fundsReleasedAt = now;
    contract.updatedAt = now;
    escrowStore.contracts.set(contract.id, contract);

    dispute.status = 'resolved_payout';
    dispute.refundAmountBuyer = 0;
    dispute.payoutAmountSeller = contract.sellerPayoutAmount;
    dispute.resolvedAt = now;
    dispute.resolutionNotes = resolutionNotes || 'حكم التحكيم: صرف كامل للبائع لسلامة الموقف ومطابقة السلعة.';
  } else if (ruling === 'resolved_split') {
    // تسوية ودية وقسمة جزئية
    if (!splitDetails) {
      throw new Error('تفاصيل القسمة الودية (مبلغ المشتري ومبلغ البائع) مطلوبة.');
    }

    const split = calculateSplitBreakdown(
      totalAmount,
      splitDetails.buyerRefund,
      splitDetails.sellerPayout
    );

    if (!split.isValid) {
      throw new Error(
        `تفاصيل القسمة غير صالحة. مجموع المبالغ يتجاوز قيمة الصفقة (${totalAmount} ${currency}) أو يحتوي على تسريب مالي.`
      );
    }

    // خصم كامل المبلغ المجمد
    buyerWallet.frozenEscrowBalance = Math.max(
      0,
      Math.round((buyerWallet.frozenEscrowBalance - totalAmount) * 100) / 100
    );

    // إضافة حصة المشتري
    buyerWallet.availableBalance =
      Math.round((buyerWallet.availableBalance + split.buyerRefund) * 100) / 100;
    buyerWallet.updatedAt = now;
    paymentStore.setWallet(buyerWallet);

    // إضافة حصة البائع
    sellerWallet.availableBalance =
      Math.round((sellerWallet.availableBalance + split.sellerPayout) * 100) / 100;
    sellerWallet.updatedAt = now;
    paymentStore.setWallet(sellerWallet);

    // إضافة عمولة المنصة المتبقية (إن وجدت)
    if (split.platformFeeAmount > 0) {
      creditPlatformCommission(currency, split.platformFeeAmount, totalAmount);
    }

    // تسجيل المعاملات
    const refundTx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      walletId: buyerWallet.id,
      userId: contract.buyerId,
      listingId: contract.listingId,
      type: 'escrow_refund',
      status: 'approved',
      channel: 'internal_balance',
      amount: split.buyerRefund,
      currency,
      adminNotes: `تسوية جزئية: استرداد للمشتري (${disputeId})`,
      createdAt: now,
    };
    paymentStore.setTransaction(refundTx);

    const payoutTx: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      walletId: sellerWallet.id,
      userId: contract.sellerId,
      listingId: contract.listingId,
      type: 'escrow_release',
      status: 'approved',
      channel: 'internal_balance',
      amount: split.sellerPayout,
      currency,
      adminNotes: `تسوية جزئية: صرف للبائع (${disputeId})`,
      createdAt: now,
    };
    paymentStore.setTransaction(payoutTx);

    contract.status = 'completed';
    contract.fundsReleasedAt = now;
    contract.updatedAt = now;
    escrowStore.contracts.set(contract.id, contract);

    dispute.status = 'resolved_split';
    dispute.refundAmountBuyer = split.buyerRefund;
    dispute.payoutAmountSeller = split.sellerPayout;
    dispute.resolvedAt = now;
    dispute.resolutionNotes = resolutionNotes || `تسوية ودية: استرداد ${split.buyerRefund} للمشتري وصرف ${split.sellerPayout} للبائع.`;
  }

  dispute.assignedOfficerId = adminId;
  dispute.updatedAt = now;
  escrowStore.disputes.set(disputeId, dispute);

  // تسجيل قرار المشرف في سجل الرقابة
  const auditLog: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    adminId,
    actionType: 'RESOLVE_DISPUTE',
    targetTable: 'disputes',
    targetId: disputeId,
    details: {
      ruling,
      refundAmountBuyer: dispute.refundAmountBuyer,
      payoutAmountSeller: dispute.payoutAmountSeller,
      resolutionNotes: dispute.resolutionNotes,
    },
    createdAt: now,
  };
  escrowStore.auditLogs.push(auditLog);

  return dispute;
}

// ============================================================================
// 6. دفتر عمولات المنصة والمحاسبة والتقارير (Platform Accounting & Invariants)
// ============================================================================

/**
 * تقييد عمولة المنصة
 */
function creditPlatformCommission(currency: Currency, feeAmount: number, dealVolume: number): void {
  const current = escrowStore.feeLedger.get(currency) || {
    currency,
    cumulativeFee: 0,
    totalVolume: 0,
    dealCount: 0,
    lastUpdated: new Date().toISOString(),
  };

  current.cumulativeFee = Math.round((current.cumulativeFee + feeAmount) * 100) / 100;
  current.totalVolume = Math.round((current.totalVolume + dealVolume) * 100) / 100;
  current.dealCount += 1;
  current.lastUpdated = new Date().toISOString();

  escrowStore.feeLedger.set(currency, current);
}

/**
 * جلب كشف حساب عمولات المنصة
 */
export function getPlatformFeeLedger(currency: Currency = 'YER'): PlatformFeeLedgerSummary {
  return (
    escrowStore.feeLedger.get(currency) || {
      currency,
      cumulativeFee: 0,
      totalVolume: 0,
      dealCount: 0,
      lastUpdated: new Date().toISOString(),
    }
  );
}

/**
 * جلب جميع سجلات عقود الضمان
 */
export function getAllEscrowContracts(): EscrowContract[] {
  return Array.from(escrowStore.contracts.values());
}

/**
 * جلب عقد ضمان بالمعرف
 */
export function getEscrowContract(escrowId: string): EscrowContract | undefined {
  return escrowStore.contracts.get(escrowId);
}

/**
 * جلب عقد ضمان بحسب معرف المزاد
 */
export function getEscrowByListingId(listingId: string): EscrowContract | undefined {
  const escrowId = escrowStore.listingContracts.get(listingId);
  return escrowId ? escrowStore.contracts.get(escrowId) : undefined;
}

/**
 * جلب سجل نزاع بالمعرف
 */
export function getDispute(disputeId: string): DisputeRecord | undefined {
  return escrowStore.disputes.get(disputeId);
}

/**
 * جلب سجل النزاع المرتبط بعقد ضمان
 */
export function getDisputeByEscrowId(escrowId: string): DisputeRecord | undefined {
  const disputeId = escrowStore.escrowDisputes.get(escrowId);
  return disputeId ? escrowStore.disputes.get(disputeId) : undefined;
}

/**
 * جلب كافة النزاعات المفتوحة أو المسجلة
 */
export function getAllDisputes(): DisputeRecord[] {
  return Array.from(escrowStore.disputes.values());
}

/**
 * جلب سجلات التدقيق الإداري
 */
export function getAdminAuditLogs(): AuditLog[] {
  return [...escrowStore.auditLogs];
}

/**
 * إعادة ضبط مخزن الضمان بالكامل (لأغراض الاختبارات الآلية)
 */
export function resetEscrowStore(): void {
  escrowStore.reset();
}
