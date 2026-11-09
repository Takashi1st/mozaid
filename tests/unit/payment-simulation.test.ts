import { describe, it, expect, beforeEach } from 'vitest';
import {
  submitDepositVoucher,
  verifyDepositVoucher,
  getUserWallet,
  resetPaymentSimulationStore,
  getPendingDepositVouchers,
} from '../../src/services/payment-simulation';

describe('Yemeni Payment & Hawala Simulation Service (src/services/payment-simulation.ts)', () => {
  beforeEach(() => {
    resetPaymentSimulationStore();
  });

  describe('submitDepositVoucher', () => {
    it('should submit a valid Kuraimi Bank deposit voucher in pending status', async () => {
      const tx = await submitDepositVoucher({
        userId: 'bidder-123',
        channel: 'kuraimi_bank',
        amount: 75000,
        currency: 'YER',
        transferRef: 'KUR-2026-9901',
        receiptUrl: 'https://storage.mozaid.ye/receipts/kur_9901.jpg',
        senderName: 'محمد أحمد صالح',
        senderPhone: '777123456',
      });

      expect(tx.id).toBeDefined();
      expect(tx.status).toBe('pending');
      expect(tx.amount).toBe(75000);
      expect(tx.currency).toBe('YER');
      expect(tx.transferReferenceNumber).toBe('KUR-2026-9901');

      // المحفظة لا تشحن عند التقديم المبدئي
      const wallet = await getUserWallet('bidder-123', 'YER');
      expect(wallet.availableBalance).toBe(0);
    });

    it('should reject invalid amount (zero or negative)', async () => {
      await expect(
        submitDepositVoucher({
          userId: 'bidder-123',
          channel: 'one_cash',
          amount: 0,
          currency: 'YER',
          transferRef: 'ONE-101',
          receiptUrl: 'https://example.com/receipt.png',
        })
      ).rejects.toThrow(/أكبر من الصفر/);
    });

    it('should enforce double-spend protection against duplicate transfer references', async () => {
      const voucherParams = {
        userId: 'bidder-123',
        channel: 'jwali' as const,
        amount: 50000,
        currency: 'YER' as const,
        transferRef: 'JWALI-REF-8877',
        receiptUrl: 'https://example.com/jwali.png',
      };

      await submitDepositVoucher(voucherParams);

      // محاولة تقديم نفس رقم الحوالة من مستخدم آخر أو نفس المستخدم
      await expect(
        submitDepositVoucher({
          ...voucherParams,
          userId: 'attacker-456',
          amount: 100000,
        })
      ).rejects.toThrow(/مستخدم مسبقاً/);
    });
  });

  describe('verifyDepositVoucher (Approval Flow)', () => {
    it('should approve voucher, credit wallet available_balance, and update status', async () => {
      const tx = await submitDepositVoucher({
        userId: 'user-approved-test',
        channel: 'one_cash',
        amount: 120000,
        currency: 'YER',
        transferRef: 'ONE-REF-3344',
        receiptUrl: 'https://example.com/one.png',
      });

      const approval = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'finance-admin-01',
        approved: true,
        adminNotes: 'تمت مطابقة الحوالة مع كشف الحساب البنكي.',
      });

      expect(approval.success).toBe(true);
      expect(approval.transaction?.status).toBe('approved');
      expect(approval.newBalance).toBe(120000);

      // التأكد من أن رصيد المحفظة تم تحديثه فعلياً
      const wallet = await getUserWallet('user-approved-test', 'YER');
      expect(wallet.availableBalance).toBe(120000);
      expect(wallet.frozenEscrowBalance).toBe(0); // لم يتأثر رصيد الضمان
    });

    it('should reject re-verifying an already approved transaction', async () => {
      const tx = await submitDepositVoucher({
        userId: 'user-once',
        channel: 'floosak',
        amount: 45000,
        currency: 'YER',
        transferRef: 'FLOOSAK-5522',
        receiptUrl: 'https://example.com/floosak.png',
      });

      await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-1',
        approved: true,
      });

      const secondApproval = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-1',
        approved: true,
      });

      expect(secondApproval.success).toBe(false);
      expect(secondApproval.error).toMatch(/مسبقاً/);
    });
  });

  describe('verifyDepositVoucher (Rejection Flow)', () => {
    it('should require a rejection reason and leave wallet balance untouched', async () => {
      const tx = await submitDepositVoucher({
        userId: 'user-rejected-test',
        channel: 'al_najm',
        amount: 30000,
        currency: 'YER',
        transferRef: 'NAJM-4411',
        receiptUrl: 'https://example.com/fake.png',
      });

      // محاولة الرفض بدون سبب
      const failedReject = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-1',
        approved: false,
        rejectionReason: '',
      });
      expect(failedReject.success).toBe(false);
      expect(failedReject.error).toMatch(/سبب الرفض/);

      // الرفض الصحيح مع ذكر السبب
      const validReject = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-1',
        approved: false,
        rejectionReason: 'صورة السند غير واضحة ورقم الحوالة غير مطابق لشبكة النجم.',
      });
      expect(validReject.success).toBe(true);
      expect(validReject.transaction?.status).toBe('rejected');

      const wallet = await getUserWallet('user-rejected-test', 'YER');
      expect(wallet.availableBalance).toBe(0);
    });
  });

  describe('Multi-Currency Isolation', () => {
    it('should keep balances completely separate for YER, USD, and SAR', async () => {
      const userId = 'multi-curr-user';

      // إيداع بالريال اليمني
      const txYer = await submitDepositVoucher({
        userId,
        channel: 'kuraimi_bank',
        amount: 500000,
        currency: 'YER',
        transferRef: 'KUR-YER-001',
        receiptUrl: 'url1',
      });
      await verifyDepositVoucher({ transactionId: txYer.id, adminId: 'admin', approved: true });

      // إيداع بالدولار الأمريكي
      const txUsd = await submitDepositVoucher({
        userId,
        channel: 'one_cash',
        amount: 250,
        currency: 'USD',
        transferRef: 'ONE-USD-002',
        receiptUrl: 'url2',
      });
      await verifyDepositVoucher({ transactionId: txUsd.id, adminId: 'admin', approved: true });

      const yerWallet = await getUserWallet(userId, 'YER');
      const usdWallet = await getUserWallet(userId, 'USD');

      expect(yerWallet.availableBalance).toBe(500000);
      expect(usdWallet.availableBalance).toBe(250);
    });
  });
});
