import { beforeEach, describe, expect, it } from 'vitest';
import {
  addDisputeMessage,
  confirmDeliveryAndStartInspection,
  confirmGoodsAcceptance,
  createEscrowContract,
  evaluateAutoRelease,
  fileDispute,
  getDispute,
  getDisputeMessages,
  getEscrowContract,
  getPlatformFeeLedger,
  lockBidDeposit,
  markAsDispatched,
  refundBidDepositsForLosers,
  resetEscrowStore,
  settleDispute,
  startInspectionCountdown,
  transitionEscrowStatus,
} from '../../src/services/escrow-service';
import { paymentStore, resetPaymentStore } from '../../src/services/payment-simulation';

describe('Escrow & Financial Ledger Service (src/services/escrow-service.ts)', () => {
  const buyerId = 'buyer_user_101';
  const sellerId = 'seller_user_202';
  const loser1Id = 'bidder_loser_303';
  const loser2Id = 'bidder_loser_404';
  const listingId = 'listing_toyota_hilux_2024';

  beforeEach(() => {
    resetPaymentStore();
    resetEscrowStore();

    // تجهيز محافظ الاختبار بأرصدة كافية
    const buyerWallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
    buyerWallet.availableBalance = 5000000; // 5,000,000 YER
    paymentStore.setWallet(buyerWallet);

    const loser1Wallet = paymentStore.getOrCreateWallet(loser1Id, 'YER');
    loser1Wallet.availableBalance = 1000000;
    paymentStore.setWallet(loser1Wallet);

    const loser2Wallet = paymentStore.getOrCreateWallet(loser2Id, 'YER');
    loser2Wallet.availableBalance = 1000000;
    paymentStore.setWallet(loser2Wallet);
  });

  describe('Araboon / Bid Deposit Locking & Refund for Losers', () => {
    it('should freeze Araboon in wallet availableBalance -> frozenEscrowBalance', async () => {
      const depositAmount = 200000; // 200,000 YER
      const res = await lockBidDeposit({
        userId: buyerId,
        listingId,
        depositAmount,
        currency: 'YER',
      });

      expect(res.success).toBe(true);
      expect(res.depositRecord.status).toBe('held');
      expect(res.newFrozenBalance).toBe(200000);

      const wallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
      expect(wallet.availableBalance).toBe(4800000);
      expect(wallet.frozenEscrowBalance).toBe(200000);
    });

    it('should throw error when wallet has insufficient available balance for Araboon', async () => {
      await expect(
        lockBidDeposit({
          userId: buyerId,
          listingId,
          depositAmount: 10000000, // أكثر من الرصيد
          currency: 'YER',
        })
      ).rejects.toThrow(/غير كافٍ لحجز عربون/);
    });

    it('should refund Araboon to all losers when auction closes, keeping winner deposit', async () => {
      // حجز عربون للمشتري الفائز والمزايدين الخاسرين
      await lockBidDeposit({ userId: buyerId, listingId, depositAmount: 150000 });
      await lockBidDeposit({ userId: loser1Id, listingId, depositAmount: 150000 });
      await lockBidDeposit({ userId: loser2Id, listingId, depositAmount: 150000 });

      // فحص أن الأرصدة مجمدة
      expect(paymentStore.getOrCreateWallet(loser1Id, 'YER').frozenEscrowBalance).toBe(150000);
      expect(paymentStore.getOrCreateWallet(loser2Id, 'YER').frozenEscrowBalance).toBe(150000);

      // استرجاع العربونات لجميع الخاسرين وتحديد الفائز
      const refundResult = await refundBidDepositsForLosers({
        listingId,
        winningBidderId: buyerId,
      });

      expect(refundResult.refundedBiddersCount).toBe(2);
      expect(refundResult.totalRefundedAmount).toBe(300000);
      expect(refundResult.refundedUserIds).toContain(loser1Id);
      expect(refundResult.refundedUserIds).toContain(loser2Id);

      // التأكد من استعادة الخاسرين لأموالهم وفك التجميد
      const l1Wallet = paymentStore.getOrCreateWallet(loser1Id, 'YER');
      expect(l1Wallet.availableBalance).toBe(1000000);
      expect(l1Wallet.frozenEscrowBalance).toBe(0);

      const l2Wallet = paymentStore.getOrCreateWallet(loser2Id, 'YER');
      expect(l2Wallet.availableBalance).toBe(1000000);
      expect(l2Wallet.frozenEscrowBalance).toBe(0);

      // التأكد من بقاء عربون الفائز مجمداً
      const winnerWallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
      expect(winnerWallet.frozenEscrowBalance).toBe(150000);
    });
  });

  describe('6-Stage Escrow State Machine & 2.5% Fee Invariant', () => {
    it('should create escrow contract in holding status and calculate 2.5% fee with zero leakage', async () => {
      const totalAmount = 2000000; // 2,000,000 YER
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount,
        currency: 'YER',
      });

      expect(contract.status).toBe('holding');
      expect(contract.totalAmount).toBe(2000000);
      expect(contract.platformFeePercent).toBe(2.5);
      expect(contract.platformFeeAmount).toBe(50000); // 2.5%
      expect(contract.sellerPayoutAmount).toBe(1950000);

      // Invariant: Zero balance leakage
      expect(contract.platformFeeAmount + contract.sellerPayoutAmount).toBe(totalAmount);

      // فحص تجميد المبلغ في محفظة المشتري
      const buyerWallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
      expect(buyerWallet.frozenEscrowBalance).toBe(2000000);
      expect(buyerWallet.availableBalance).toBe(3000000);
    });

    it('should seamlessly apply winner locked Araboon towards final escrow amount', async () => {
      // حجز عربون مسبق 200,000 YER
      await lockBidDeposit({ userId: buyerId, listingId, depositAmount: 200000 });

      // تمويل صفقة بقيمة 1,000,000 YER
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount: 1000000,
        currency: 'YER',
        useWinnerDeposit: true,
      });

      expect(contract.totalAmount).toBe(1000000);

      // المجموع المجمد يجب أن يكون تماماً 1,000,000 YER (العربون 200,000 + المتبقي 800,000)
      const buyerWallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
      expect(buyerWallet.frozenEscrowBalance).toBe(1000000);
      expect(buyerWallet.availableBalance).toBe(4000000); // 5M - 1M = 4M
    });

    it('should correctly progress from holding -> dispatched -> inspecting', async () => {
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount: 500000,
      });

      // 1. Seller marks as dispatched
      const dispatched = await markAsDispatched(contract.id, sellerId, 'تم الشحن عبر النقل البري');
      expect(dispatched.status).toBe('dispatched');
      expect(dispatched.dispatchedAt).toBeDefined();

      // Unauthorized actor cannot dispatch
      await expect(markAsDispatched(contract.id, 'random_intruder')).rejects.toThrow(/فقط بائع الصفقة/);

      // 2. Buyer confirms receipt and starts inspection (48h countdown)
      const inspecting = await confirmDeliveryAndStartInspection(contract.id, buyerId, 48);
      expect(inspecting.status).toBe('inspecting');
      expect(inspecting.deliveredConfirmedAt).toBeDefined();
      expect(inspecting.inspectionDeadline).toBeDefined();

      const deadlineDiffHours =
        (new Date(inspecting.inspectionDeadline!).getTime() - Date.now()) / (1000 * 3600);
      expect(Math.round(deadlineDiffHours)).toBe(48);
    });

    it('should throw error on illegal state transitions', async () => {
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount: 500000,
      });

      // Cannot jump from holding directly to completed without dispatch/inspection
      await expect(
        transitionEscrowStatus(contract.id, 'completed', buyerId)
      ).rejects.toThrow(/انتقال غير صالح/);
    });
  });

  describe('Buyer Confirmation & Fund Release (Manual vs Auto-Release)', () => {
    it('should release net payout to seller and platform fee to ledger upon buyer manual confirmation', async () => {
      const totalAmount = 1000000; // 1,000,000 YER
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId);

      const releaseResult = await confirmGoodsAcceptance(contract.id, buyerId);
      expect(releaseResult.contract.status).toBe('completed');
      expect(releaseResult.sellerPayout).toBe(975000);
      expect(releaseResult.platformFee).toBe(25000);

      // فحص تفريغ رصيد الضمان المجمد للمشتري
      const buyerWallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
      expect(buyerWallet.frozenEscrowBalance).toBe(0);

      // فحص إيداع صافي الأرباح في رصيد البائع
      const sellerWallet = paymentStore.getOrCreateWallet(sellerId, 'YER');
      expect(sellerWallet.availableBalance).toBe(975000);

      // فحص قيد العمولة في دفتر المنصة
      const feeLedger = getPlatformFeeLedger('YER');
      expect(feeLedger.cumulativeFee).toBe(25000);
      expect(feeLedger.dealCount).toBe(1);
    });

    it('should NOT auto-release funds if 48h inspection window is still active', async () => {
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount: 500000,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId, 48);

      const autoRelease = await evaluateAutoRelease(contract.id);
      expect(autoRelease.released).toBe(false);
      expect(autoRelease.reason).toMatch(/لا تزال سارية/);

      const current = getEscrowContract(contract.id);
      expect(current?.status).toBe('inspecting');
    });

    it('should auto-release funds to seller if 48h deadline elapsed without dispute', async () => {
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount: 1000000,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId, 48);

      // محاكاة مرور 49 ساعة
      const futureDate = new Date(Date.now() + 49 * 3600 * 1000);
      const autoRelease = await evaluateAutoRelease(contract.id, futureDate);

      expect(autoRelease.released).toBe(true);
      expect(autoRelease.contract?.status).toBe('completed');

      const sellerWallet = paymentStore.getOrCreateWallet(sellerId, 'YER');
      expect(sellerWallet.availableBalance).toBe(975000);
    });

    it('should NOT auto-release funds if contract is disputed', async () => {
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount: 500000,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId, 48);
      await fileDispute({
        escrowId: contract.id,
        buyerId,
        reason: 'وجود كسر في الشاشة غير مذكور',
      });

      const futureDate = new Date(Date.now() + 50 * 3600 * 1000);
      const autoRelease = await evaluateAutoRelease(contract.id, futureDate);

      expect(autoRelease.released).toBe(false);
      expect(autoRelease.reason).toMatch(/قيد النزاع/);
    });
  });

  describe('Formal Dispute Filing & Binding Arbitration Rulings', () => {
    it('should open formal dispute and record messages in arbitration room', async () => {
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount: 800000,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId);

      const dispute = await fileDispute({
        escrowId: contract.id,
        buyerId,
        reason: 'السلعة مقلدة وليست أصلية',
        description: 'تم فحص الهاتف وثبت أنه ليس الإصدار الأصلي',
        evidenceUrls: ['https://cdn.mozaid.ye/evidence/defect1.jpg'],
      });

      expect(dispute.status).toBe('opened');
      expect(dispute.openedBy).toBe(buyerId);

      // Escrow contract transitioned to disputed
      const updatedContract = getEscrowContract(contract.id);
      expect(updatedContract?.status).toBe('disputed');

      // Add message by seller
      await addDisputeMessage({
        disputeId: dispute.id,
        senderId: sellerId,
        senderRole: 'seller',
        message: 'الجهاز تم شراؤه من الوكيل الرسمي ومعي فاتورة الشراء الأصلية',
        attachmentUrl: 'https://cdn.mozaid.ye/evidence/invoice.jpg',
      });

      // Add staff internal note
      await addDisputeMessage({
        disputeId: dispute.id,
        senderId: 'dispute_officer_1',
        senderRole: 'dispute_officer',
        message: 'ملاحظة سرية للمشرفين: الفاتورة تبدو سليمة، بحاجة لتقرير فحص محلي',
        isStaffInternalNote: true,
      });

      // Buyer should not see staff internal notes
      const buyerView = getDisputeMessages(dispute.id, 'bidder');
      expect(buyerView.length).toBe(2);

      // Staff sees all messages including internal notes
      const staffView = getDisputeMessages(dispute.id, 'dispute_officer');
      expect(staffView.length).toBe(3);
    });

    it('should execute binding ruling: 100% refund to buyer (resolved_refund)', async () => {
      const totalAmount = 600000;
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId);
      const dispute = await fileDispute(contract.id, buyerId, 'عدم تسليم الملحقات الأساسية');

      const resolved = await settleDispute(
        dispute.id,
        'admin_officer_9',
        'resolved_refund',
        undefined,
        'تم إقرار استرداد كامل للمشتري لثبوت المخالفة'
      );

      expect(resolved.status).toBe('resolved_refund');
      expect(resolved.refundAmountBuyer).toBe(totalAmount);
      expect(resolved.payoutAmountSeller).toBe(0);

      // Buyer receives 100% back to availableBalance, frozenEscrowBalance is 0
      const buyerWallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
      expect(buyerWallet.availableBalance).toBe(5000000);
      expect(buyerWallet.frozenEscrowBalance).toBe(0);

      // Seller receives 0
      const sellerWallet = paymentStore.getOrCreateWallet(sellerId, 'YER');
      expect(sellerWallet.availableBalance).toBe(0);

      // Escrow contract status is refunded
      const updatedContract = getEscrowContract(contract.id);
      expect(updatedContract?.status).toBe('refunded');
    });

    it('should execute binding ruling: full payout to seller (resolved_payout)', async () => {
      const totalAmount = 1000000;
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId);
      const dispute = await fileDispute(contract.id, buyerId, 'ادعاء غير حقيقي');

      const resolved = await settleDispute(
        dispute.id,
        'admin_officer_9',
        'resolved_payout',
        undefined,
        'تم رفض ادعاء المشتري لعدم ثبوت العيب'
      );

      expect(resolved.status).toBe('resolved_payout');
      expect(resolved.refundAmountBuyer).toBe(0);
      expect(resolved.payoutAmountSeller).toBe(975000);

      const sellerWallet = paymentStore.getOrCreateWallet(sellerId, 'YER');
      expect(sellerWallet.availableBalance).toBe(975000);

      const buyerWallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
      expect(buyerWallet.frozenEscrowBalance).toBe(0);

      const updatedContract = getEscrowContract(contract.id);
      expect(updatedContract?.status).toBe('completed');
    });

    it('should execute binding ruling: amicable split settlement (resolved_split) with zero leakage', async () => {
      const totalAmount = 1000000;
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId);
      const dispute = await fileDispute(contract.id, buyerId, 'نقص طفيف في الإكسسوارات');

      // تسوية: 200,000 للمشتري، 775,000 للبائع، و 25,000 للمنصة
      const resolved = await settleDispute(
        dispute.id,
        'admin_officer_9',
        'resolved_split',
        { buyerRefund: 200000, sellerPayout: 775000 },
        'اتفاق الطرفين على خصم 20% تعويضاً عن النقص'
      );

      expect(resolved.status).toBe('resolved_split');
      expect(resolved.refundAmountBuyer).toBe(200000);
      expect(resolved.payoutAmountSeller).toBe(775000);

      // Invariant: Zero balance leakage (200,000 + 775,000 + 25,000 platform fee = 1,000,000)
      const buyerWallet = paymentStore.getOrCreateWallet(buyerId, 'YER');
      expect(buyerWallet.availableBalance).toBe(4200000); // 5M - 1M + 200K
      expect(buyerWallet.frozenEscrowBalance).toBe(0);

      const sellerWallet = paymentStore.getOrCreateWallet(sellerId, 'YER');
      expect(sellerWallet.availableBalance).toBe(775000);

      const feeLedger = getPlatformFeeLedger('YER');
      expect(feeLedger.cumulativeFee).toBe(25000);
    });

    it('should reject split settlement if amounts exceed total contract value', async () => {
      const contract = await createEscrowContract({
        listingId,
        buyerId,
        sellerId,
        totalAmount: 500000,
      });

      await markAsDispatched(contract.id, sellerId);
      await confirmDeliveryAndStartInspection(contract.id, buyerId);
      const dispute = await fileDispute(contract.id, buyerId, 'نزاع مالي');

      await expect(
        settleDispute(dispute.id, 'admin_officer_9', 'resolved_split', {
          buyerRefund: 400000,
          sellerPayout: 200000, // 400K + 200K = 600K > 500K!
        })
      ).rejects.toThrow(/يتجاوز قيمة الصفقة/);
    });
  });
});
