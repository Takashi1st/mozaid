import { describe, it, expect, beforeEach } from 'vitest';
import {
  submitDepositVoucher,
  verifyDepositVoucher,
  getUserWallet,
  resetPaymentSimulationStore,
  getPendingDepositVouchers,
  getUserTransactions,
  paymentStore,
} from '../../src/services/payment-simulation';
import { Currency, PaymentChannel } from '../../src/types';

describe('Empirical Challenger: Payment Simulation Stress & Invariant Harness', () => {
  beforeEach(() => {
    resetPaymentSimulationStore();
  });

  describe('1. Duplicate Voucher Detection & Replay Resistance', () => {
    it('rejects exact duplicate transfer reference for the same user', async () => {
      await submitDepositVoucher({
        userId: 'user-alpha',
        channel: 'kuraimi_bank',
        amount: 50000,
        currency: 'YER',
        transferRef: 'KUR-REF-1001',
        receiptUrl: 'https://example.com/receipt1.jpg',
      });

      await expect(
        submitDepositVoucher({
          userId: 'user-alpha',
          channel: 'kuraimi_bank',
          amount: 50000,
          currency: 'YER',
          transferRef: 'KUR-REF-1001',
          receiptUrl: 'https://example.com/receipt2.jpg',
        })
      ).rejects.toThrow(/مستخدم مسبقاً/);
    });

    it('rejects duplicate transfer reference across different users (replay / theft attack)', async () => {
      await submitDepositVoucher({
        userId: 'legitimate-user',
        channel: 'one_cash',
        amount: 25000,
        currency: 'YER',
        transferRef: 'OC-998877',
        receiptUrl: 'https://example.com/legit.png',
      });

      await expect(
        submitDepositVoucher({
          userId: 'malicious-user',
          channel: 'one_cash',
          amount: 25000,
          currency: 'YER',
          transferRef: 'OC-998877',
          receiptUrl: 'https://example.com/fake.png',
        })
      ).rejects.toThrow(/مستخدم مسبقاً/);
    });

    it('detects duplicate voucher reference case-insensitively', async () => {
      await submitDepositVoucher({
        userId: 'user-1',
        channel: 'jwali',
        amount: 15000,
        currency: 'YER',
        transferRef: 'jwali-lowercase-ref',
        receiptUrl: 'https://example.com/receipt1.png',
      });

      await expect(
        submitDepositVoucher({
          userId: 'user-2',
          channel: 'jwali',
          amount: 15000,
          currency: 'YER',
          transferRef: 'JWALI-LOWERCASE-REF',
          receiptUrl: 'https://example.com/receipt2.png',
        })
      ).rejects.toThrow(/مستخدم مسبقاً/);
    });

    it('detects duplicate voucher reference with leading/trailing whitespaces', async () => {
      await submitDepositVoucher({
        userId: 'user-1',
        channel: 'floosak',
        amount: 20000,
        currency: 'YER',
        transferRef: 'FLK-4455',
        receiptUrl: 'https://example.com/receipt.png',
      });

      await expect(
        submitDepositVoucher({
          userId: 'user-2',
          channel: 'floosak',
          amount: 20000,
          currency: 'YER',
          transferRef: '   FLK-4455   ',
          receiptUrl: 'https://example.com/receipt_copy.png',
        })
      ).rejects.toThrow(/مستخدم مسبقاً/);
    });

    it('prevents voucher reference reuse even across different channels', async () => {
      await submitDepositVoucher({
        userId: 'user-1',
        channel: 'al_najm',
        amount: 70000,
        currency: 'YER',
        transferRef: 'GLOBAL-HAWALA-8811',
        receiptUrl: 'https://example.com/najm.png',
      });

      await expect(
        submitDepositVoucher({
          userId: 'user-2',
          channel: 'al_omqy',
          amount: 70000,
          currency: 'YER',
          transferRef: 'GLOBAL-HAWALA-8811',
          receiptUrl: 'https://example.com/omqy.png',
        })
      ).rejects.toThrow(/مستخدم مسبقاً/);
    });

    it('maintains reference registry lock after voucher rejection (no re-submission of rejected voucher)', async () => {
      const tx = await submitDepositVoucher({
        userId: 'fraud-attempt',
        channel: 'kuraimi_bank',
        amount: 90000,
        currency: 'YER',
        transferRef: 'REJECT-THEN-RETRY-01',
        receiptUrl: 'https://example.com/invalid.jpg',
      });

      // Reject the voucher
      const rejectRes = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-auditor',
        approved: false,
        rejectionReason: 'مزور أو ملغي من البنك',
      });
      expect(rejectRes.success).toBe(true);

      // Attempting to re-submit same ref must still be blocked
      await expect(
        submitDepositVoucher({
          userId: 'fraud-attempt',
          channel: 'kuraimi_bank',
          amount: 90000,
          currency: 'YER',
          transferRef: 'REJECT-THEN-RETRY-01',
          receiptUrl: 'https://example.com/retry.jpg',
        })
      ).rejects.toThrow(/مستخدم مسبقاً/);
    });
  });

  describe('2. Multi-Currency Balances Isolation (YER, USD, SAR)', () => {
    const testUser = 'user-multicurrency-tester';
    const currencies: Currency[] = ['YER', 'USD', 'SAR'];

    it('initializes all 3 currency wallets independently with zero balance', async () => {
      for (const curr of currencies) {
        const wallet = await getUserWallet(testUser, curr);
        expect(wallet.currency).toBe(curr);
        expect(wallet.availableBalance).toBe(0);
        expect(wallet.frozenEscrowBalance).toBe(0);
      }
    });

    it('credits each currency independently without leaking between currencies', async () => {
      // 1. Deposit 500,000 YER via Kuraimi
      const txYer = await submitDepositVoucher({
        userId: testUser,
        channel: 'kuraimi_bank',
        amount: 500000,
        currency: 'YER',
        transferRef: 'YER-TX-500K',
        receiptUrl: 'https://example.com/yer.png',
      });
      const approvalYer = await verifyDepositVoucher({
        transactionId: txYer.id,
        adminId: 'admin-yer',
        approved: true,
      });
      expect(approvalYer.success).toBe(true);
      expect(approvalYer.newBalance).toBe(500000);

      // Verify intermediate balances
      let yerWallet = await getUserWallet(testUser, 'YER');
      let usdWallet = await getUserWallet(testUser, 'USD');
      let sarWallet = await getUserWallet(testUser, 'SAR');
      expect(yerWallet.availableBalance).toBe(500000);
      expect(usdWallet.availableBalance).toBe(0);
      expect(sarWallet.availableBalance).toBe(0);

      // 2. Deposit 1,200 USD via OneCash
      const txUsd = await submitDepositVoucher({
        userId: testUser,
        channel: 'one_cash',
        amount: 1200,
        currency: 'USD',
        transferRef: 'USD-TX-1200',
        receiptUrl: 'https://example.com/usd.png',
      });
      const approvalUsd = await verifyDepositVoucher({
        transactionId: txUsd.id,
        adminId: 'admin-usd',
        approved: true,
      });
      expect(approvalUsd.success).toBe(true);
      expect(approvalUsd.newBalance).toBe(1200);

      // Verify intermediate balances
      yerWallet = await getUserWallet(testUser, 'YER');
      usdWallet = await getUserWallet(testUser, 'USD');
      sarWallet = await getUserWallet(testUser, 'SAR');
      expect(yerWallet.availableBalance).toBe(500000);
      expect(usdWallet.availableBalance).toBe(1200);
      expect(sarWallet.availableBalance).toBe(0);

      // 3. Deposit 4,500 SAR via Al-Omqy
      const txSar = await submitDepositVoucher({
        userId: testUser,
        channel: 'al_omqy',
        amount: 4500,
        currency: 'SAR',
        transferRef: 'SAR-TX-4500',
        receiptUrl: 'https://example.com/sar.png',
      });
      const approvalSar = await verifyDepositVoucher({
        transactionId: txSar.id,
        adminId: 'admin-sar',
        approved: true,
      });
      expect(approvalSar.success).toBe(true);
      expect(approvalSar.newBalance).toBe(4500);

      // Verify final balances across all 3 currencies
      yerWallet = await getUserWallet(testUser, 'YER');
      usdWallet = await getUserWallet(testUser, 'USD');
      sarWallet = await getUserWallet(testUser, 'SAR');
      expect(yerWallet.availableBalance).toBe(500000);
      expect(usdWallet.availableBalance).toBe(1200);
      expect(sarWallet.availableBalance).toBe(4500);

      // Frozen balances must remain intact (0)
      expect(yerWallet.frozenEscrowBalance).toBe(0);
      expect(usdWallet.frozenEscrowBalance).toBe(0);
      expect(sarWallet.frozenEscrowBalance).toBe(0);
    });

    it('isolates multi-currency balances across multiple distinct users', async () => {
      const userA = 'user-A';
      const userB = 'user-B';

      // User A deposits SAR
      const txA = await submitDepositVoucher({
        userId: userA,
        channel: 'al_najm',
        amount: 3000,
        currency: 'SAR',
        transferRef: 'USER-A-SAR',
        receiptUrl: 'https://example.com/a.png',
      });
      await verifyDepositVoucher({ transactionId: txA.id, adminId: 'admin', approved: true });

      // User B deposits SAR
      const txB = await submitDepositVoucher({
        userId: userB,
        channel: 'al_najm',
        amount: 7000,
        currency: 'SAR',
        transferRef: 'USER-B-SAR',
        receiptUrl: 'https://example.com/b.png',
      });
      await verifyDepositVoucher({ transactionId: txB.id, adminId: 'admin', approved: true });

      const walletA = await getUserWallet(userA, 'SAR');
      const walletB = await getUserWallet(userB, 'SAR');

      expect(walletA.availableBalance).toBe(3000);
      expect(walletB.availableBalance).toBe(7000);
    });
  });

  describe('3. Concurrency, State Machine & Double Credit Prevention', () => {
    it('strictly prevents double credit from repeated approvals on the same voucher', async () => {
      const tx = await submitDepositVoucher({
        userId: 'double-credit-target',
        channel: 'kuraimi_bank',
        amount: 100000,
        currency: 'YER',
        transferRef: 'DOUBLE-CREDIT-TEST',
        receiptUrl: 'https://example.com/receipt.png',
      });

      // First approval
      const first = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-1',
        approved: true,
      });
      expect(first.success).toBe(true);
      expect(first.newBalance).toBe(100000);

      // Second approval attempt
      const second = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-2',
        approved: true,
      });
      expect(second.success).toBe(false);
      expect(second.error).toMatch(/مسبقاً/);

      // Third approval attempt via positional arguments
      const third = await verifyDepositVoucher(tx.id, 'admin-3', true);
      expect(third.success).toBe(false);

      // Balance must remain strictly 100,000 YER (not 200,000 or 300,000)
      const wallet = await getUserWallet('double-credit-target', 'YER');
      expect(wallet.availableBalance).toBe(100000);
    });

    it('strictly prevents approving an already rejected voucher', async () => {
      const tx = await submitDepositVoucher({
        userId: 'target-user',
        channel: 'jwali',
        amount: 40000,
        currency: 'YER',
        transferRef: 'REJECT-THEN-APPROVE',
        receiptUrl: 'https://example.com/receipt.png',
      });

      // Reject first
      const rejectRes = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-1',
        approved: false,
        rejectionReason: 'سند مزور',
      });
      expect(rejectRes.success).toBe(true);

      // Attempt to approve
      const approveRes = await verifyDepositVoucher({
        transactionId: tx.id,
        adminId: 'admin-2',
        approved: true,
      });
      expect(approveRes.success).toBe(false);
      expect(approveRes.error).toMatch(/مسبقاً/);

      // Wallet must not be credited
      const wallet = await getUserWallet('target-user', 'YER');
      expect(wallet.availableBalance).toBe(0);
    });

    it('correctly tracks and filters pending vouchers queue', async () => {
      expect(await getPendingDepositVouchers()).toHaveLength(0);

      const tx1 = await submitDepositVoucher({
        userId: 'user-1',
        channel: 'floosak',
        amount: 10000,
        currency: 'YER',
        transferRef: 'PENDING-1',
        receiptUrl: 'url1',
      });
      const tx2 = await submitDepositVoucher({
        userId: 'user-2',
        channel: 'one_cash',
        amount: 20000,
        currency: 'YER',
        transferRef: 'PENDING-2',
        receiptUrl: 'url2',
      });

      let pending = await getPendingDepositVouchers();
      expect(pending).toHaveLength(2);

      // Approve tx1 -> only tx2 should remain in pending
      await verifyDepositVoucher({ transactionId: tx1.id, adminId: 'admin', approved: true });
      pending = await getPendingDepositVouchers();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(tx2.id);

      // Reject tx2 -> pending should be empty
      await verifyDepositVoucher({
        transactionId: tx2.id,
        adminId: 'admin',
        approved: false,
        rejectionReason: 'غير مطابق',
      });
      pending = await getPendingDepositVouchers();
      expect(pending).toHaveLength(0);
    });

    it('correctly returns complete user transaction history across currencies', async () => {
      const u = 'history-user';
      const tx1 = await submitDepositVoucher({
        userId: u,
        channel: 'kuraimi_bank',
        amount: 100000,
        currency: 'YER',
        transferRef: 'HIST-1',
        receiptUrl: 'url1',
      });
      const tx2 = await submitDepositVoucher({
        userId: u,
        channel: 'one_cash',
        amount: 50,
        currency: 'USD',
        transferRef: 'HIST-2',
        receiptUrl: 'url2',
      });

      const userTxs = await getUserTransactions(u);
      expect(userTxs).toHaveLength(2);
      expect(userTxs.map((t) => t.id)).toContain(tx1.id);
      expect(userTxs.map((t) => t.id)).toContain(tx2.id);
    });
  });

  describe('4. Input Validation & Edge Cases', () => {
    it('rejects invalid or missing channel', async () => {
      await expect(
        submitDepositVoucher({
          userId: 'u',
          channel: 'unsupported_network' as PaymentChannel,
          amount: 1000,
          currency: 'YER',
          transferRef: 'REF-BAD-CHAN',
          receiptUrl: 'url',
        })
      ).rejects.toThrow(/غير مدعومة/);
    });

    it('rejects internal_balance channel for deposit vouchers', async () => {
      await expect(
        submitDepositVoucher({
          userId: 'u',
          channel: 'internal_balance',
          amount: 1000,
          currency: 'YER',
          transferRef: 'REF-INT-CHAN',
          receiptUrl: 'url',
        })
      ).rejects.toThrow(/الرصيد الداخلي/);
    });

    it('rejects empty or whitespace-only transfer reference', async () => {
      await expect(
        submitDepositVoucher({
          userId: 'u',
          channel: 'kuraimi_bank',
          amount: 1000,
          currency: 'YER',
          transferRef: '   ',
          receiptUrl: 'url',
        })
      ).rejects.toThrow(/رقم الحوالة أو السند البنكي مطلوب/);
    });

    it('rejects negative or NaN amount', async () => {
      await expect(
        submitDepositVoucher({
          userId: 'u',
          channel: 'kuraimi_bank',
          amount: -500,
          currency: 'YER',
          transferRef: 'REF-NEG',
          receiptUrl: 'url',
        })
      ).rejects.toThrow(/أكبر من الصفر/);

      await expect(
        submitDepositVoucher({
          userId: 'u',
          channel: 'kuraimi_bank',
          amount: NaN,
          currency: 'YER',
          transferRef: 'REF-NAN',
          receiptUrl: 'url',
        })
      ).rejects.toThrow(/أكبر من الصفر/);
    });

    it('fails gracefully when verifying non-existent transaction', async () => {
      const res = await verifyDepositVoucher({
        transactionId: 'tx_non_existent',
        adminId: 'admin-1',
        approved: true,
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/لم يتم العثور/);
    });
  });
});
