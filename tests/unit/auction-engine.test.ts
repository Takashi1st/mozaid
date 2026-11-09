import { describe, it, expect } from 'vitest';
import { validateForwardBid, validateReverseTenderBid } from '../../src/lib/auction-engine';
import { ListingItem, RealtimeBid } from '../../src/types';

describe('Real-Time Auction & Anti-Sniping Engine (src/lib/auction-engine.ts)', () => {
  const baseListing: ListingItem = {
    id: 'listing-1',
    userId: 'seller-100',
    categoryId: 1,
    title: 'تويوتا برادو 2020',
    slug: 'toyota-prado-2020',
    listingType: 'forward_auction',
    status: 'active',
    currency: 'YER',
    startingPrice: 10000000,
    currentPrice: 10000000,
    minBidIncrement: 100000,
    requiredDepositAmount: 500000,
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    endsAt: new Date(Date.now() + 600000).toISOString(), // ينتهي بعد 10 دقائق
    timesExtended: 0,
    description: 'سيارة بحالة الوكالة',
    itemCondition: 'used',
    locationCity: 'صنعاء',
    inspectionWindowHours: 48,
    totalBidsCount: 0,
    viewsCount: 15,
    images: [],
  };

  describe('validateForwardBid (Rules and Restrictions)', () => {
    it('should reject bid if listing is not active or extended', () => {
      const closedListing = { ...baseListing, status: 'closed' as const };
      const res = validateForwardBid(closedListing, 'bidder-1', 10100000);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/غير متاح/);
    });

    it('should reject bid if auction time has expired', () => {
      const expiredListing = {
        ...baseListing,
        endsAt: new Date(Date.now() - 1000).toISOString(),
      };
      const res = validateForwardBid(expiredListing, 'bidder-1', 10100000);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/انتهى وقت المزاد/);
    });

    it('should prevent seller from bidding on their own item (anti-shill)', () => {
      const res = validateForwardBid(baseListing, 'seller-100', 10100000);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/لا يُسمح للبائع/);
    });

    it('should prevent current highest bidder from bidding over themselves consecutively', () => {
      const currentHighest: RealtimeBid = {
        id: 'bid-1',
        listingId: baseListing.id,
        bidderId: 'bidder-champion',
        bidderName: 'الأول',
        bidderReputation: 5,
        amount: 10100000,
        isWinningBid: true,
        isExtensionTrigger: false,
        createdAt: new Date().toISOString(),
      };
      const res = validateForwardBid(baseListing, 'bidder-champion', 10200000, currentHighest);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/صاحب أعلى عرض حالياً/);
    });

    it('should reject bid below minimum increment', () => {
      // المطلوب 10,100,000 بينما المقدم 10,050,000
      const res = validateForwardBid(baseListing, 'bidder-2', 10050000);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/يجب ألا تقل عن/);
      expect(res.nextMinimumBid).toBe(10100000);
    });

    it('should accept valid bid meeting increment rule', () => {
      const res = validateForwardBid(baseListing, 'bidder-2', 10200000);
      expect(res.isValid).toBe(true);
      expect(res.nextMinimumBid).toBe(10300000);
    });
  });

  describe('Anti-Sniping Dynamic Candle Extension', () => {
    it('should NOT trigger extension when bid is placed outside trigger window (>120s remaining)', () => {
      // متبقي 10 دقائق (600 ثانية)
      const res = validateForwardBid(baseListing, 'bidder-2', 10200000);
      expect(res.isValid).toBe(true);
      expect(res.isAntiSnipingTriggered).toBe(false);
      expect(res.newEndsAt?.getTime()).toBe(new Date(baseListing.endsAt).getTime());
    });

    it('should trigger +120s extension when bid placed in final 120s and timesExtended < 20', () => {
      const snipListing = {
        ...baseListing,
        endsAt: new Date(Date.now() + 60000).toISOString(), // متبقي دقيقة واحدة (60 ثانية)
        timesExtended: 2,
      };

      const res = validateForwardBid(snipListing, 'bidder-sniper', 10500000);
      expect(res.isValid).toBe(true);
      expect(res.isAntiSnipingTriggered).toBe(true);

      const expectedNewEndsAt = new Date(new Date(snipListing.endsAt).getTime() + 120000);
      expect(res.newEndsAt?.getTime()).toBe(expectedNewEndsAt.getTime());
    });

    it('should NOT extend auction if timesExtended has reached maximum allowed (20)', () => {
      const maxedListing = {
        ...baseListing,
        endsAt: new Date(Date.now() + 30000).toISOString(), // متبقي 30 ثانية
        timesExtended: 20, // بلغ الحد الأقصى
      };

      const res = validateForwardBid(maxedListing, 'bidder-3', 10500000);
      expect(res.isValid).toBe(true);
      expect(res.isAntiSnipingTriggered).toBe(false);
      expect(res.newEndsAt?.getTime()).toBe(new Date(maxedListing.endsAt).getTime());
    });
  });

  describe('validateReverseTenderBid', () => {
    const tenderListing: ListingItem = {
      ...baseListing,
      listingType: 'reverse_tender',
      currentPrice: 5000000,
      minBidIncrement: 50000,
    };

    it('should reject reverse tender bid if amount is higher than current price minus decrement', () => {
      // الحد الأقصى المسموح 4,950,000 بينما العرض 4,980,000
      const res = validateReverseTenderBid(tenderListing, 'supplier-1', 4980000);
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toMatch(/يجب أن يكون عرضك أقل/);
    });

    it('should accept lower competitive bid in reverse tender', () => {
      const res = validateReverseTenderBid(tenderListing, 'supplier-1', 4900000);
      expect(res.isValid).toBe(true);
      expect(res.nextMinimumBid).toBe(4850000);
    });
  });
});
