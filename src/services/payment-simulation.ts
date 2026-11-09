/**
 * خدمة محاكاة قنوات الدفع والتحويلات المالية اليمنية (Yemeni Payment & Hawala Simulation Service)
 * تدعم محاكاة شبكات البنوك والمحافظ وشركات الصرافة اليمنية:
 * بنك الكريمي الإسلامي، ون كاش، جوالي، فلوسك، كاش، النجم للحوالات، والعمقي للصرافة.
 */

import {
  Currency,
  PaymentChannel,
  SubmitDepositVoucherParams,
  TransactionRecord,
  VerifyDepositVoucherParams,
  VerifyDepositVoucherResult,
  WalletRecord,
} from '../types';
import { PAYMENT_CHANNELS_CONFIG } from '../lib/constants';

// ============================================================================
// مخزن الحالة في الذاكرة (In-Memory Store for Simulation & Testing)
// ============================================================================

class PaymentSimulationStore {
  private transactions: Map<string, TransactionRecord> = new Map();
  // key: `${userId}_${currency}`
  private wallets: Map<string, WalletRecord> = new Map();
  // key: normalized transfer reference number (uppercase, trimmed) -> transactionId
  private referenceRegistry: Map<string, string> = new Map();

  constructor() {
    this.seedDefaultWallets();
  }

  private seedDefaultWallets() {
    const defaultUserId = 'user-test-default';
    this.wallets.set(`${defaultUserId}_YER`, {
      id: `wallet-${defaultUserId}-yer`,
      userId: defaultUserId,
      availableBalance: 250000,
      frozenEscrowBalance: 0,
      currency: 'YER',
      updatedAt: new Date().toISOString(),
    });
  }

  public reset() {
    this.transactions.clear();
    this.wallets.clear();
    this.referenceRegistry.clear();
    this.seedDefaultWallets();
  }

  public getOrCreateWallet(userId: string, currency: Currency): WalletRecord {
    const key = `${userId}_${currency}`;
    let wallet = this.wallets.get(key);
    if (!wallet) {
      wallet = {
        id: `wallet-${userId}-${currency.toLowerCase()}`,
        userId,
        availableBalance: 0,
        frozenEscrowBalance: 0,
        currency,
        updatedAt: new Date().toISOString(),
      };
      this.wallets.set(key, wallet);
    }
    return wallet;
  }

  public getWallet(userId: string, currency: Currency): WalletRecord | undefined {
    return this.wallets.get(`${userId}_${currency}`);
  }

  public setWallet(wallet: WalletRecord) {
    this.wallets.set(`${wallet.userId}_${wallet.currency}`, {
      ...wallet,
      updatedAt: new Date().toISOString(),
    });
  }

  public getTransaction(transactionId: string): TransactionRecord | undefined {
    return this.transactions.get(transactionId);
  }

  public setTransaction(tx: TransactionRecord) {
    this.transactions.set(tx.id, tx);
  }

  public getAllTransactions(): TransactionRecord[] {
    return Array.from(this.transactions.values());
  }

  public isReferenceUsed(ref: string): boolean {
    const normalized = ref.trim().toUpperCase();
    return this.referenceRegistry.has(normalized);
  }

  public registerReference(ref: string, transactionId: string) {
    const normalized = ref.trim().toUpperCase();
    this.referenceRegistry.set(normalized, transactionId);
  }
}

// النسخة المشتركة من المخزن
export const paymentStore = new PaymentSimulationStore();

// ============================================================================
// دوال الخدمة الأساسية (Core Service Functions)
// ============================================================================

/**
 * 1. الحصول على محفظة المستخدم أو تهيئتها برصيد صفري
 */
export function getOrCreateWallet(userId: string, currency: Currency = 'YER'): WalletRecord {
  return paymentStore.getOrCreateWallet(userId, currency);
}

/**
 * 2. تقديم سند إيداع بنكي أو إشعار تحويل صرافة يمنية
 */
export async function submitDepositVoucher(
  params: SubmitDepositVoucherParams
): Promise<TransactionRecord> {
  const { userId, channel, amount, currency, transferRef, receiptUrl, senderName, senderPhone } = params;

  if (!userId || !userId.trim()) {
    throw new Error('معرف المستخدم مطلوب.');
  }

  if (channel === 'internal_balance') {
    throw new Error('لا يمكن تقديم سند إيداع لقناة الرصيد الداخلي.');
  }

  // التحقق من صحة القناة مع القنوات المعتمدة
  const isValidChannel = PAYMENT_CHANNELS_CONFIG.some((c) => c.id === channel);
  if (!isValidChannel) {
    throw new Error(`قناة الدفع المحددة غير مدعومة: ${channel}`);
  }

  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    throw new Error('مبلغ الإيداع يجب أن يكون رقماً موجباً أكبر من الصفر.');
  }

  if (!transferRef || !transferRef.trim()) {
    throw new Error('رقم الحوالة أو السند البنكي مطلوب.');
  }

  if (!receiptUrl || !receiptUrl.trim()) {
    throw new Error('رابط صورة السند أو إشعار التحويل مطلوب.');
  }

  const normalizedRef = transferRef.trim();

  // فحص منع الإنفاق المزدوج وتكرار رقم الحوالة (Idempotency Protection)
  if (paymentStore.isReferenceUsed(normalizedRef)) {
    throw new Error(`رقم الحوالة أو السند مستخدم مسبقاً في عملية أخرى: ${normalizedRef}`);
  }

  // جلب أو إنشاء محفظة المستخدم للعملة المحددة
  const wallet = paymentStore.getOrCreateWallet(userId, currency);

  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const transaction: TransactionRecord = {
    id: transactionId,
    walletId: wallet.id,
    userId,
    type: 'deposit',
    status: 'pending',
    channel,
    amount,
    currency,
    transferReferenceNumber: normalizedRef,
    senderName: senderName?.trim() || 'غير محدد',
    senderPhone: senderPhone?.trim() || '',
    receiptImageUrl: receiptUrl.trim(),
    createdAt: new Date().toISOString(),
  };

  // حفظ المعاملة وتسجيل المرجع في الفهرس
  paymentStore.setTransaction(transaction);
  paymentStore.registerReference(normalizedRef, transactionId);

  return transaction;
}

/**
 * 3. تدقيق واعتماد أو رفض سند الإيداع من قبل المشرف المالي (Admin Action)
 * تدعم الاستدعاء بكائن المعلمات أو بالمعلمات المنفصلة
 */
export async function verifyDepositVoucher(
  params: VerifyDepositVoucherParams
): Promise<VerifyDepositVoucherResult>;
export async function verifyDepositVoucher(
  transactionId: string,
  adminId: string,
  approved: boolean,
  notes?: string
): Promise<VerifyDepositVoucherResult>;
export async function verifyDepositVoucher(
  paramsOrId: VerifyDepositVoucherParams | string,
  legacyAdminId?: string,
  legacyApproved?: boolean,
  legacyNotes?: string
): Promise<VerifyDepositVoucherResult> {
  let transactionId = '';
  let adminId = '';
  let approved = false;
  let rejectionReason: string | undefined;
  let adminNotes: string | undefined;

  if (typeof paramsOrId === 'string') {
    transactionId = paramsOrId;
    adminId = legacyAdminId || '';
    approved = Boolean(legacyApproved);
    adminNotes = legacyNotes;
    rejectionReason = legacyNotes;
  } else if (paramsOrId && typeof paramsOrId === 'object') {
    transactionId = paramsOrId.transactionId;
    adminId = paramsOrId.adminId;
    approved = paramsOrId.approved;
    rejectionReason = paramsOrId.rejectionReason;
    adminNotes = paramsOrId.adminNotes || paramsOrId.notes;
  }

  if (!transactionId || !transactionId.trim()) {
    return { success: false, error: 'معرف المعاملة مطلوب.' };
  }

  if (!adminId || !adminId.trim()) {
    return { success: false, error: 'معرف المشرف المالي مطلوب.' };
  }

  const transaction = paymentStore.getTransaction(transactionId);
  if (!transaction) {
    return { success: false, error: 'لم يتم العثور على المعاملة المالية المطلوبة.' };
  }

  if (transaction.status !== 'pending') {
    return {
      success: false,
      error: `لا يمكن معالجة معاملة تمت مراجعتها مسبقاً (الحالة الحالية: ${transaction.status}).`,
    };
  }

  const now = new Date().toISOString();

  if (approved) {
    // اعتماد الإيداع وشحن رصيد المحفظة المتاح
    const walletUserId = transaction.userId || transaction.walletId.replace('wallet-', '').replace(new RegExp(`-${transaction.currency.toLowerCase()}$`), '');
    const wallet = paymentStore.getOrCreateWallet(walletUserId, transaction.currency);
    wallet.availableBalance += transaction.amount;
    wallet.updatedAt = now;
    paymentStore.setWallet(wallet);

    const updatedTx: TransactionRecord = {
      ...transaction,
      status: 'approved',
      verifiedBy: adminId,
      verifiedAt: now,
      adminNotes: adminNotes || 'تم الاعتماد وإيداع المبلغ في المحفظة بنجاح.',
    };
    paymentStore.setTransaction(updatedTx);

    return {
      success: true,
      transaction: updatedTx,
      newBalance: wallet.availableBalance,
    };
  } else {
    // رفض السند مع اشتراط بيان سبب الرفض
    const reason = rejectionReason || adminNotes;
    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'يجب توضيح سبب الرفض عند عدم اعتماد السند المالي.',
      };
    }

    const updatedTx: TransactionRecord = {
      ...transaction,
      status: 'rejected',
      verifiedBy: adminId,
      verifiedAt: now,
      adminNotes: reason.trim(),
    };
    paymentStore.setTransaction(updatedTx);

    return {
      success: true,
      transaction: updatedTx,
    };
  }
}

/**
 * 4. جلب تفاصيل محفظة المستخدم
 */
export async function getUserWallet(userId: string, currency: Currency = 'YER'): Promise<WalletRecord> {
  return paymentStore.getOrCreateWallet(userId, currency);
}

/**
 * 5. جلب سجل المعاملات المالية لمستخدم
 */
export async function getUserTransactions(userId: string): Promise<TransactionRecord[]> {
  return paymentStore
    .getAllTransactions()
    .filter((tx) => tx.userId === userId || tx.walletId === `wallet-${userId}-${tx.currency.toLowerCase()}` || tx.walletId === `wal_${userId}`)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 6. جلب سندات الإيداع قيد الانتظار لمراجعة الإدارة المالية
 */
export async function getPendingDepositVouchers(): Promise<TransactionRecord[]> {
  return paymentStore
    .getAllTransactions()
    .filter((tx) => tx.type === 'deposit' && tx.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * 7. إعادة تهيئة المخزن للاختبارات الآلية
 */
export function resetPaymentSimulationStore(): void {
  paymentStore.reset();
}

export const resetPaymentStore = resetPaymentSimulationStore;
