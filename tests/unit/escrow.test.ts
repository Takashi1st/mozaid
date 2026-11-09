import { describe, it, expect } from 'vitest';
import {
  calculateEscrowBreakdown,
  startInspectionWindow,
  shouldAutoReleaseFunds,
} from '../../src/lib/escrow';
import { EscrowContract } from '../../src/types';

describe('Escrow & Financial Ledger Engine (src/lib/escrow.ts)', () => {
  describe('calculateEscrowBreakdown (2.5% Commission Invariant)', () => {
    it('should correctly calculate 2.5% platform fee with zero leakage', () => {
      const totalAmount = 1000000; // 1,000,000 YER
      const breakdown = calculateEscrowBreakdown(totalAmount);

      expect(breakdown.platformFeePercent).toBe(2.5);
      expect(breakdown.platformFeeAmount).toBe(25000);
      expect(breakdown.sellerPayoutAmount).toBe(975000);

      // التأكد من تطابق المجموع مع الأصل تماماً
      expect(breakdown.platformFeeAmount + breakdown.sellerPayoutAmount).toBe(totalAmount);
    });

    it('should round cents accurately without loss for fractional values', () => {
      const totalAmount = 1234.56;
      const breakdown = calculateEscrowBreakdown(totalAmount);

      // 1234.56 * 0.025 = 30.864 -> 30.86
      expect(breakdown.platformFeeAmount).toBe(30.86);
      expect(breakdown.sellerPayoutAmount).toBe(1203.7);
      expect(
        Math.round((breakdown.platformFeeAmount + breakdown.sellerPayoutAmount) * 100) / 100
      ).toBe(totalAmount);
    });
  });

  describe('startInspectionWindow', () => {
    it('should transition status to inspecting and set 48h deadline by default', () => {
      const dummyContract: EscrowContract = {
        id: 'escrow-1',
        listingId: 'listing-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        totalAmount: 50000,
        platformFeeAmount: 1250,
        sellerPayoutAmount: 48750,
        status: 'dispatched',
      };

      const result = startInspectionWindow(dummyContract);
      expect(result.status).toBe('inspecting');

      const expectedDiffHours =
        (result.inspectionDeadline.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(Math.round(expectedDiffHours)).toBe(48);
    });
  });

  describe('shouldAutoReleaseFunds', () => {
    const baseContract: EscrowContract = {
      id: 'escrow-1',
      listingId: 'listing-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      totalAmount: 50000,
      platformFeeAmount: 1250,
      sellerPayoutAmount: 48750,
      status: 'inspecting',
      inspectionDeadline: new Date(Date.now() + 3600000).toISOString(), // في المستقبل
    };

    it('should NOT auto-release funds if inspection deadline has not arrived yet', () => {
      expect(shouldAutoReleaseFunds(baseContract)).toBe(false);
    });

    it('should auto-release funds if inspection deadline has elapsed (48h passed)', () => {
      const expiredContract: EscrowContract = {
        ...baseContract,
        inspectionDeadline: new Date(Date.now() - 10000).toISOString(), // انقضت المهلة
      };
      expect(shouldAutoReleaseFunds(expiredContract)).toBe(true);
    });

    it('should NOT auto-release if contract is disputed or not in inspecting status', () => {
      const disputedContract: EscrowContract = {
        ...baseContract,
        status: 'disputed',
        inspectionDeadline: new Date(Date.now() - 10000).toISOString(),
      };
      expect(shouldAutoReleaseFunds(disputedContract)).toBe(false);
    });
  });
});
