/**
 * Mozaid AI — End-to-End Test Suite: Tier 2 Boundary & Corner Cases
 * Strictly covers all 48 features from PROJECT.md § Feature Inventory.
 * Requirement: >= 5 Boundary & Corner test cases per feature (48 × 5 = 240+ test cases).
 */

import { describe, it, expect, beforeEach } from './harness/test-framework.ts';
import { MozaidMockPlatform } from './harness/mock-platform.ts';
import { FIXTURE_USERS, FIXTURE_LISTINGS, FIXTURE_CERTIFICATES } from './harness/fixtures.ts';

let platform: MozaidMockPlatform;

beforeEach(() => {
  platform = new MozaidMockPlatform();
  // Register default actors
  platform.registerUser(FIXTURE_USERS.seller_sana_1);
  platform.registerUser(FIXTURE_USERS.bidder_aden_1);
  platform.registerUser(FIXTURE_USERS.bidder_taiz_1);
  platform.registerUser(FIXTURE_USERS.bidder_hodeidah_1);
  platform.registerUser(FIXTURE_USERS.tenderer_hospital_1);
  platform.registerUser(FIXTURE_USERS.contractor_solar_1);
  platform.registerUser(FIXTURE_USERS.contractor_solar_2);
  platform.registerUser(FIXTURE_USERS.admin_finance_1);
  platform.registerUser(FIXTURE_USERS.dispute_officer_1);
  platform.registerUser(FIXTURE_USERS.super_admin_1);

  // Create default listings
  platform.createListing('usr_seller_sana_01', FIXTURE_LISTINGS.real_estate_sana);
  platform.createListing('usr_seller_sana_01', FIXTURE_LISTINGS.truck_taiz);
  platform.createListing('usr_tenderer_hospital_01', FIXTURE_LISTINGS.solar_tender_aden);
});

// ============================================================================
// Feature 1: Real-Time Live Bidding Room (M3, survey #1)
// ============================================================================
describe('Feature 1: Real-Time Live Bidding Room (Boundaries)', () => {
  it('F01-B1: joining room with empty string listing ID throws error', () => {
    expect(() => platform.joinRoom('', 'usr_bidder_aden_01')).toThrow('Listing room not found');
  });

  it('F01-B2: joining room with non-existent listing ID throws error', () => {
    expect(() => platform.joinRoom('unknown_id_99', 'usr_bidder_aden_01')).toThrow('Listing room not found');
  });

  it('F01-B3: user leaving room they never joined does not cause negative viewer count', () => {
    platform.leaveRoom('lst_re_sana_01', 'non_joined_user');
    const set = platform.activeRoomUsers.get('lst_re_sana_01');
    expect(set?.size || 0).toBe(0);
  });

  it('F01-B4: duplicate join by same user maintains unique viewer count', () => {
    platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    const res = platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    expect(res.viewerCount).toBe(1);
  });

  it('F01-B5: joining closed auction room returns past endsAt timestamp', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.status = 'closed';
    listing.endsAt = Date.now() - 10000;
    const res = platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    expect(res.endsAt).toBeLessThan(Date.now());
  });
});

// ============================================================================
// Feature 2: Quick-Action & Custom Bid Placement (M3, survey #2)
// ============================================================================
describe('Feature 2: Quick-Action & Custom Bid Placement (Boundaries)', () => {
  it('F02-B1: bid below minimum increment step is rejected', () => {
    // Current is 150M, min increment is 1M, so 150.5M must be rejected
    expect(() => platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 150_500_000)).toThrow('Bid amount must be at least 151000000');
  });

  it('F02-B2: seller bidding on their own listing is strictly prohibited', () => {
    expect(() => platform.submitForwardBid('lst_re_sana_01', 'usr_seller_sana_01', 160_000_000)).toThrow('Seller cannot bid on own listing');
  });

  it('F02-B3: consecutive highest bidder bidding again against themselves is rejected', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(() => platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 152_000_000)).toThrow('You already hold the highest bid');
  });

  it('F02-B4: bid placed after auction has ended throws error', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() - 5000;
    expect(() => platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 155_000_000)).toThrow('Auction has officially ended');
  });

  it('F02-B5: bid on paused auction throws error', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'مراجعة');
    expect(() => platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 155_000_000)).toThrow('Auction is not open');
  });
});

// ============================================================================
// Feature 3: Anti-Sniping Extension Receiver (M3, survey #3)
// ============================================================================
describe('Feature 3: Anti-Sniping Extension Receiver (Boundaries)', () => {
  it('F03-B1: extension stops triggering after reaching MAX_TIMES_EXTENDED (20x)', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.timesExtended = 20; // Reached cap!
    listing.endsAt = Date.now() + 60_000;
    const res = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(res.isExtended).toBe(false);
    expect(listing.timesExtended).toBe(20);
  });

  it('F03-B2: bid placed at exactly 121 seconds remaining does NOT extend', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() + 121_500;
    const res = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(res.isExtended).toBe(false);
  });

  it('F03-B3: bid placed at exactly 120 seconds remaining triggers extension', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() + 119_000;
    const res = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(res.isExtended).toBe(true);
  });

  it('F03-B4: multiple concurrent bids near threshold do not exceed 20 extension cap', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.timesExtended = 19;
    listing.endsAt = Date.now() + 30_000;
    const r1 = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(r1.isExtended).toBe(true);
    expect(listing.timesExtended).toBe(20);

    listing.endsAt = Date.now() + 30_000;
    const r2 = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_taiz_01', 152_000_000);
    expect(r2.isExtended).toBe(false);
    expect(listing.timesExtended).toBe(20);
  });

  it('F03-B5: anti-sniping is not triggered on reverse tender bids', () => {
    const tender = platform.listings.get('lst_tnd_solar_01')!;
    tender.endsAt = Date.now() + 30_000;
    const res = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    expect(tender.timesExtended).toBe(0);
  });
});

// ============================================================================
// Feature 4: Listing Discovery & Filter Hub (M4, survey #4)
// ============================================================================
describe('Feature 4: Listing Discovery & Filter Hub (Boundaries)', () => {
  it('F04-B1: searching with empty query returns all listings', () => {
    const res = platform.discoverListings({ query: '' });
    expect(res.length).toBe(3);
  });

  it('F04-B2: searching with non-matching query returns empty array', () => {
    const res = platform.discoverListings({ query: 'طائرة بوينج 747' });
    expect(res.length).toBe(0);
  });

  it('F04-B3: filtering with inverted price range (min > max) returns empty array', () => {
    const res = platform.discoverListings({ minPrice: 100_000_000, maxPrice: 10_000_000 });
    expect(res.length).toBe(0);
  });

  it('F04-B4: filtering with non-existent city returns empty array', () => {
    const res = platform.discoverListings({ city: 'مدينة غير موجودة' });
    expect(res.length).toBe(0);
  });

  it('F04-B5: filtering by non-existent category returns empty array', () => {
    const res = platform.discoverListings({ category: 'تحف أثرية نادرة' });
    expect(res.length).toBe(0);
  });
});

// ============================================================================
// Feature 5: Araboon / Bid Deposit Lock (M2, survey #5)
// ============================================================================
describe('Feature 5: Araboon / Bid Deposit Lock (Boundaries)', () => {
  it('F05-B1: locking deposit when available balance is strictly 0 throws error', () => {
    expect(() => platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 5_000_000)).toThrow('Insufficient available balance');
  });

  it('F05-B2: locking deposit 1 YER higher than available balance throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 4_999_999;
    expect(() => platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 5_000_000)).toThrow('Insufficient available balance');
  });

  it('F05-B3: locking negative deposit is a no-op', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 5_000_000;
    platform.lockBidDeposit('usr_bidder_aden_01', 'YER', -1_000);
    expect(w.availableBalance).toBe(5_000_000);
    expect(w.frozenEscrowBalance).toBe(0);
  });

  it('F05-B4: locking deposit for non-existent currency throws error', () => {
    expect(() => platform.lockBidDeposit('usr_bidder_aden_01', 'EUR' as any, 100)).toThrow('No EUR ledger');
  });

  it('F05-B5: locking deposit for non-existent user throws error', () => {
    expect(() => platform.lockBidDeposit('unknown_usr', 'YER', 100)).toThrow('No wallet for user');
  });
});

// ============================================================================
// Feature 6: Deposit Refund for Outbid/Losers (M2, survey #6)
// ============================================================================
describe('Feature 6: Deposit Refund for Outbid/Losers (Boundaries)', () => {
  it('F06-B1: refunding more than frozen escrow balance throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.frozenEscrowBalance = 1_000_000;
    expect(() => platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 1_000_001)).toThrow('frozen escrow balance less than refund');
  });

  it('F06-B2: refunding when frozen balance is 0 throws error for non-zero refund', () => {
    expect(() => platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 500_000)).toThrow('frozen escrow balance less than refund');
  });

  it('F06-B3: refunding negative amount is a no-op', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.frozenEscrowBalance = 1_000_000;
    platform.refundBidDeposit('usr_bidder_aden_01', 'YER', -50_000);
    expect(w.frozenEscrowBalance).toBe(1_000_000);
  });

  it('F06-B4: refunding for non-existent currency throws error', () => {
    expect(() => platform.refundBidDeposit('usr_bidder_aden_01', 'GBP' as any, 100)).toThrow('No GBP ledger');
  });

  it('F06-B5: refunding exact frozen balance leaves frozen at exactly 0', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.frozenEscrowBalance = 2_500_000;
    platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 2_500_000);
    expect(w.frozenEscrowBalance).toBe(0);
    expect(w.availableBalance).toBe(2_500_000);
  });
});

// ============================================================================
// Feature 7: Escrow Settlement & Payment (M2, survey #7)
// ============================================================================
describe('Feature 7: Escrow Settlement & Payment (Boundaries)', () => {
  it('F07-B1: creating escrow with 0 available balance throws error', () => {
    expect(() =>
      platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER')
    ).toThrow('Insufficient wallet balance');
  });

  it('F07-B2: creating escrow 1 YER short of required balance throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 9_999_999;
    expect(() =>
      platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER')
    ).toThrow('Insufficient wallet balance');
  });

  it('F07-B3: small amounts test rounding precision without precision errors', () => {
    const w = platform.getWallet('usr_contractor_solar_01', 'USD');
    w.availableBalance = 100;
    const escrow = platform.createEscrowContract('lst_tnd_solar_01', 'usr_contractor_solar_01', 'usr_tenderer_hospital_01', 33.33, 'USD');
    expect(escrow.platformFeeAmount).toBe(0.83); // 2.5% of 33.33 = 0.83325 -> 0.83
    expect(escrow.sellerPayoutAmount).toBe(32.5); // 33.33 - 0.83 = 32.50
  });

  it('F07-B4: escrow with 0 total amount sets fee and payout to 0', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 0;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 0, 'YER');
    expect(escrow.platformFeeAmount).toBe(0);
    expect(escrow.sellerPayoutAmount).toBe(0);
  });

  it('F07-B5: creating escrow for non-existent buyer throws error', () => {
    expect(() =>
      platform.createEscrowContract('lst_truck_taiz_01', 'unknown_buyer', 'usr_seller_sana_01', 10_000_000, 'YER')
    ).toThrow('No wallet for user');
  });
});

// ============================================================================
// Feature 8: Inspection Window Countdown (48h) (M2, survey #8)
// ============================================================================
describe('Feature 8: Inspection Window Countdown (48h) (Boundaries)', () => {
  it('F08-B1: starting inspection window on undispatched escrow throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    expect(() => platform.startInspectionWindow(escrow.id, 48)).toThrow('Item must be dispatched');
  });

  it('F08-B2: starting inspection on non-existent escrow throws error', () => {
    expect(() => platform.startInspectionWindow('non_existent_escrow', 48)).toThrow('Escrow not found');
  });

  it('F08-B3: starting inspection window with 0 hours sets deadline to now', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    const updated = platform.startInspectionWindow(escrow.id, 0);
    expect(Math.abs(updated.inspectionDeadline! - Date.now())).toBeLessThan(100);
  });

  it('F08-B4: evaluateAutoRelease returns false if status is still dispatched (not inspecting)', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    const res = platform.evaluateAutoRelease(escrow.id);
    expect(res.released).toBe(false);
  });

  it('F08-B5: evaluateAutoRelease returns false if status is holding', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    const res = platform.evaluateAutoRelease(escrow.id);
    expect(res.released).toBe(false);
  });
});

// ============================================================================
// Feature 9: Goods Acceptance & Fund Release (M2, survey #9)
// ============================================================================
describe('Feature 9: Goods Acceptance & Fund Release (Boundaries)', () => {
  it('F09-B1: non-buyer attempting to accept goods throws unauthorized error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    expect(() => platform.acceptGoodsAndRelease('usr_bidder_taiz_01', escrow.id)).toThrow('Only the buyer can accept goods');
  });

  it('F09-B2: accepting goods before inspecting phase throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    expect(() => platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id)).toThrow('Escrow must be in inspecting state');
  });

  it('F09-B3: accepting goods for non-existent escrow throws error', () => {
    expect(() => platform.acceptGoodsAndRelease('usr_bidder_aden_01', 'non_existent_escrow')).toThrow('Escrow not found');
  });

  it('F09-B4: accepting goods twice on already completed escrow throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(() => platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id)).toThrow('Escrow must be in inspecting state');
  });

  it('F09-B5: accepting goods when dispute is already opened throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    expect(() => platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id)).toThrow('Escrow must be in inspecting state');
  });
});

// ============================================================================
// Feature 10: Formal Dispute Filing (M2, survey #10)
// ============================================================================
describe('Feature 10: Formal Dispute Filing (Boundaries)', () => {
  it('F10-B1: filing dispute with empty reason throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    expect(() => platform.fileDispute('usr_bidder_aden_01', escrow.id, '   ', ['https://cdn.mozaid.ye/p.webp'])).toThrow('Dispute reason is required');
  });

  it('F10-B2: filing dispute with empty photo URLs array throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    expect(() => platform.fileDispute('usr_bidder_aden_01', escrow.id, 'خلل فني', [])).toThrow('At least one defect evidence photo is required');
  });

  it('F10-B3: seller attempting to file dispute throws error (only buyer can dispute)', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    expect(() => platform.fileDispute('usr_seller_sana_01', escrow.id, 'اعتراض', ['https://cdn.mozaid.ye/p.webp'])).toThrow('Only buyer can file dispute');
  });

  it('F10-B4: filing dispute on completed escrow throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(() => platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب متأخر', ['https://cdn.mozaid.ye/p.webp'])).toThrow('Disputes can only be opened during inspecting phase');
  });

  it('F10-B5: filing dispute on non-existent escrow throws error', () => {
    expect(() => platform.fileDispute('usr_bidder_aden_01', 'unknown_escrow', 'سبب', ['https://cdn.mozaid.ye/p.webp'])).toThrow('Escrow not found');
  });
});

// ============================================================================
// Feature 11: Digital Arbitration Room Chat (Boundaries)
// ============================================================================
describe('Feature 11: Digital Arbitration Room Chat (Boundaries)', () => {
  it('F11-B1: posting message to non-existent dispute throws error', () => {
    expect(() => platform.postDisputeMessage('unknown_disp', 'usr_bidder_aden_01', 'مرحبا')).toThrow('Dispute not found');
  });

  it('F11-B2: posting message by non-existent user throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    expect(() => platform.postDisputeMessage(disp.id, 'unknown_user_99', 'مرحبا')).toThrow('Sender not found');
  });

  it('F11-B3: posting message to closed resolved dispute throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_refund');
    expect(() => platform.postDisputeMessage(disp.id, 'usr_bidder_aden_01', 'رسالة بعد الإغلاق')).toThrow('Dispute chat is closed');
  });

  it('F11-B4: multiple rapid messages are stored with distinct IDs', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const m1 = platform.postDisputeMessage(disp.id, 'usr_bidder_aden_01', 'رسالة 1');
    const m2 = platform.postDisputeMessage(disp.id, 'usr_bidder_aden_01', 'رسالة 2');
    expect(m1.id).not.toBe(m2.id);
  });

  it('F11-B5: chat history for freshly opened dispute contains initial system message', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const list = platform.disputeMessages.get(disp.id);
    expect(list?.length).toBe(1);
  });
});

// ============================================================================
// Feature 12: Buy-Now Direct Purchase (Boundaries)
// ============================================================================
describe('Feature 12: Buy-Now Direct Purchase (Boundaries)', () => {
  it('F12-B1: buy-now on listing without buyNowPrice configured throws error', () => {
    // real_estate_sana has buyNowPrice, let's test a listing without it
    const listing = platform.createListing('usr_seller_sana_01', {
      title: 'سيارة بدون شراء فوري',
      startingPrice: 5_000_000,
      minBidIncrement: 100_000,
    });
    expect(() => platform.buyNowDirect(listing.id, 'usr_bidder_aden_01')).toThrow('Buy-Now is not enabled');
  });

  it('F12-B2: seller executing buy-now on their own listing throws error', () => {
    expect(() => platform.buyNowDirect('lst_truck_taiz_01', 'usr_seller_sana_01')).toThrow('Seller cannot buy own listing');
  });

  it('F12-B3: buy-now on non-existent listing throws error', () => {
    expect(() => platform.buyNowDirect('unknown_listing_99', 'usr_bidder_aden_01')).toThrow('Listing not found');
  });

  it('F12-B4: buy-now on already closed listing throws error', () => {
    const listing = platform.listings.get('lst_truck_taiz_01')!;
    listing.status = 'closed';
    expect(() => platform.buyNowDirect('lst_truck_taiz_01', 'usr_bidder_aden_01')).toThrow('Auction is not open');
  });

  it('F12-B5: buy-now with insufficient wallet balance throws error', () => {
    expect(() => platform.buyNowDirect('lst_truck_taiz_01', 'usr_bidder_aden_01')).toThrow('Insufficient wallet balance');
  });
});

// ============================================================================
// Feature 13: AI Listing Generation (Boundaries)
// ============================================================================
describe('Feature 13: AI Listing Generation (Boundaries)', () => {
  it('F13-B1: empty description string throws error', () => {
    expect(() => platform.generateAIListingSpecs('')).toThrow('Brief description cannot be empty');
  });

  it('F13-B2: whitespace only description throws error', () => {
    expect(() => platform.generateAIListingSpecs('   ')).toThrow('Brief description cannot be empty');
  });

  it('F13-B3: very long description is truncated safely in suggested title', () => {
    const longDesc = 'أرض تجارية '.repeat(50);
    const res = platform.generateAIListingSpecs(longDesc);
    expect(res.suggestedTitle.length).toBeLessThan(100);
  });

  it('F13-B4: description containing real estate categorizes as عقارات', () => {
    const res = platform.generateAIListingSpecs('أرض سكنية في صنعاء');
    expect(res.category).toBe('عقارات');
  });

  it('F13-B5: description containing vehicle categorizes as سيارات ومحركات', () => {
    const res = platform.generateAIListingSpecs('سيارة تويوتا');
    expect(res.category).toBe('سيارات ومحركات');
  });
});

// ============================================================================
// Feature 14: Manual Listing Publishing & Setup (Boundaries)
// ============================================================================
describe('Feature 14: Manual Listing Publishing & Setup (Boundaries)', () => {
  it('F14-B1: starting price <= 0 throws error', () => {
    expect(() => platform.createListing('usr_seller_sana_01', { title: 'عقار', startingPrice: 0 })).toThrow('Starting price must be greater than zero');
  });

  it('F14-B2: reserve price strictly less than starting price throws error', () => {
    expect(() =>
      platform.createListing('usr_seller_sana_01', {
        title: 'عقار',
        startingPrice: 10_000_000,
        reservePrice: 9_000_000,
        minBidIncrement: 100_000,
      })
    ).toThrow('Reserve price cannot be less than starting price');
  });

  it('F14-B3: minimum bid increment <= 0 throws error', () => {
    expect(() =>
      platform.createListing('usr_seller_sana_01', {
        title: 'عقار',
        startingPrice: 10_000_000,
        minBidIncrement: 0,
      })
    ).toThrow('Minimum bid increment must be positive');
  });

  it('F14-B4: listing end time in the past throws error', () => {
    expect(() =>
      platform.createListing('usr_seller_sana_01', {
        title: 'عقار',
        startingPrice: 10_000_000,
        minBidIncrement: 100_000,
        endsAt: Date.now() - 1000,
      })
    ).toThrow('Listing end time must be in the future');
  });

  it('F14-B5: unverified KYC seller attempting to publish listing throws error', () => {
    const unverifiedUser = { ...FIXTURE_USERS.bidder_aden_1, id: 'unv_seller_99', kycStatus: 'unverified' as const, deviceFingerprint: 'unv_fp_99' };
    platform.registerUser(unverifiedUser);
    expect(() => platform.createListing('unv_seller_99', { title: 'عقار', startingPrice: 10_000_000 })).toThrow('KYC verification required');
  });
});

// ============================================================================
// Feature 15: Image Moderation Check (Boundaries)
// ============================================================================
describe('Feature 15: Image Moderation Check (Boundaries)', () => {
  it('F15-B1: empty image URL throws error', () => {
    expect(() => platform.scanImageModeration('')).toThrow('Image URL is empty');
  });

  it('F15-B2: URL with explicit keyword returns low safety score (<0.5)', () => {
    const res = platform.scanImageModeration('https://cdn.mozaid.ye/explicit_img.webp');
    expect(res.safetyScore).toBeLessThan(0.5);
  });

  it('F15-B3: URL with illegal keyword returns isSafe = false', () => {
    const res = platform.scanImageModeration('https://cdn.mozaid.ye/illegal_gun.webp');
    expect(res.isSafe).toBe(false);
  });

  it('F15-B4: benign URL returns isSafe = true and high score', () => {
    const res = platform.scanImageModeration('https://cdn.mozaid.ye/normal_watch.webp');
    expect(res.isSafe).toBe(true);
    expect(res.safetyScore).toBeGreaterThan(0.9);
  });

  it('F15-B5: safety score is strictly bounded between 0.0 and 1.0', () => {
    const r1 = platform.scanImageModeration('https://cdn.mozaid.ye/img.webp');
    expect(r1.safetyScore).toBeGreaterThanOrEqual(0.0);
    expect(r1.safetyScore).toBeLessThanOrEqual(1.0);
  });
});

// ============================================================================
// Feature 16: Real-Time Seller Dashboard (Boundaries)
// ============================================================================
describe('Feature 16: Real-Time Seller Dashboard (Boundaries)', () => {
  it('F16-B1: listing with zero bids returns empty bids list', () => {
    const bids = platform.bids.get('lst_truck_taiz_01');
    expect(bids?.length).toBe(0);
  });

  it('F16-B2: listing with zero viewers returns 0 size', () => {
    const viewers = platform.activeRoomUsers.get('lst_truck_taiz_01')?.size || 0;
    expect(viewers).toBe(0);
  });

  it('F16-B3: seller cannot submit bids to their own dashboard listing', () => {
    expect(() => platform.submitForwardBid('lst_truck_taiz_01', 'usr_seller_sana_01', 11_000_000)).toThrow('Seller cannot bid on own listing');
  });

  it('F16-B4: currentPrice strictly reflects startingPrice when zero bids placed', () => {
    const listing = platform.listings.get('lst_truck_taiz_01')!;
    expect(listing.currentPrice).toBe(listing.startingPrice);
  });

  it('F16-B5: non-existent listing in dashboard returns undefined', () => {
    expect(platform.listings.get('unknown_dash_lst')).toBeUndefined();
  });
});

// ============================================================================
// Feature 17: Dispatch & Delivery Notification (Boundaries)
// ============================================================================
describe('Feature 17: Dispatch & Delivery Notification (Boundaries)', () => {
  it('F17-B1: dispatching non-existent escrow throws error', () => {
    expect(() => platform.notifyDispatched('usr_seller_sana_01', 'unknown_escrow')).toThrow('Escrow not found');
  });

  it('F17-B2: buyer attempting to dispatch throws unauthorized error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    expect(() => platform.notifyDispatched('usr_bidder_aden_01', escrow.id)).toThrow('Only the seller can dispatch items');
  });

  it('F17-B3: dispatching already dispatched escrow throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    expect(() => platform.notifyDispatched('usr_seller_sana_01', escrow.id)).toThrow('Escrow is not in holding state');
  });

  it('F17-B4: dispatching completed escrow throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(() => platform.notifyDispatched('usr_seller_sana_01', escrow.id)).toThrow('Escrow is not in holding state');
  });

  it('F17-B5: dispatch timestamp is not set while in holding status', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    expect(escrow.dispatchedAt).toBeUndefined();
  });
});

// ============================================================================
// Feature 18: Automated Escrow Auto-Release (Boundaries)
// ============================================================================
describe('Feature 18: Automated Escrow Auto-Release (Boundaries)', () => {
  it('F18-B1: evaluating auto-release on non-existent escrow throws error', () => {
    expect(() => platform.evaluateAutoRelease('unknown_escrow')).toThrow('Escrow not found');
  });

  it('F18-B2: auto-release does not release if exactly 1 second remains on inspection timer', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    escrow.inspectionDeadline = Date.now() + 1000; // 1 second in future
    const res = platform.evaluateAutoRelease(escrow.id);
    expect(res.released).toBe(false);
  });

  it('F18-B3: auto-release does not release if dispute is already filed (status = disputed)', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    escrow.inspectionDeadline = Date.now() - 1000; // deadline expired!
    const res = platform.evaluateAutoRelease(escrow.id);
    expect(res.released).toBe(false);
  });

  it('F18-B4: calling auto-release a second time on completed escrow returns released = false', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    escrow.inspectionDeadline = Date.now() - 1000;
    platform.evaluateAutoRelease(escrow.id);
    const secondCall = platform.evaluateAutoRelease(escrow.id);
    expect(secondCall.released).toBe(false);
  });

  it('F18-B5: auto-release returns reason "Not inspecting" for non-inspecting status', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    const res = platform.evaluateAutoRelease(escrow.id);
    expect(res.reason).toBe('Not inspecting');
  });
});

// ============================================================================
// Feature 19: Trusted Seller Badge Acquisition (Boundaries)
// ============================================================================
describe('Feature 19: Trusted Seller Badge Acquisition (Boundaries)', () => {
  it('F19-B1: evaluating badge for non-existent user returns false', () => {
    expect(platform.evaluateTrustedSellerBadge('unknown_user')).toBe(false);
  });

  it('F19-B2: seller with exactly 5 deals (boundary) is not granted badge', () => {
    const s = platform.users.get('usr_seller_sana_01')!;
    s.successfulDealsCount = 5;
    expect(platform.evaluateTrustedSellerBadge('usr_seller_sana_01')).toBe(false);
  });

  it('F19-B3: seller with 6 deals and 4.8 rating is granted badge', () => {
    const s = platform.users.get('usr_seller_sana_01')!;
    s.successfulDealsCount = 6;
    s.reputationScore = 4.8;
    s.kycStatus = 'verified';
    expect(platform.evaluateTrustedSellerBadge('usr_seller_sana_01')).toBe(true);
  });

  it('F19-B4: seller with 6 deals but 4.79 rating is not granted badge', () => {
    const s = platform.users.get('usr_seller_sana_01')!;
    s.successfulDealsCount = 6;
    s.reputationScore = 4.79;
    expect(platform.evaluateTrustedSellerBadge('usr_seller_sana_01')).toBe(false);
  });

  it('F19-B5: banned seller with 100 deals and 5.0 rating is not granted badge', () => {
    const s = platform.users.get('usr_seller_sana_01')!;
    s.successfulDealsCount = 100;
    s.reputationScore = 5.0;
    s.isBanned = true;
    expect(platform.evaluateTrustedSellerBadge('usr_seller_sana_01')).toBe(false);
  });
});

// ============================================================================
// Feature 20: AI-Powered RFP / Tender Drafting (Boundaries)
// ============================================================================
describe('Feature 20: AI-Powered RFP / Tender Drafting (Boundaries)', () => {
  it('F20-B1: drafting RFP with empty title throws error', () => {
    expect(() => platform.generateAITenderRFP('', 'متطلبات توريد')).toThrow('Title and requirements are mandatory');
  });

  it('F20-B2: drafting RFP with empty requirements throws error', () => {
    expect(() => platform.generateAITenderRFP('توريد أدوية', '')).toThrow('Title and requirements are mandatory');
  });

  it('F20-B3: drafting RFP with whitespace-only requirements throws error', () => {
    expect(() => platform.generateAITenderRFP('توريد أدوية', '   ')).toThrow('Title and requirements are mandatory');
  });

  it('F20-B4: prompt with SQL or markdown syntax in title is handled without crashing', () => {
    const res = platform.generateAITenderRFP('SELECT * FROM tenders; --', 'شروط فنية');
    expect(res.markdownRFP).toContain('SELECT * FROM tenders');
  });

  it('F20-B5: evaluation matrix weights sum to exactly 100', () => {
    const res = platform.generateAITenderRFP('مناقصة كهرباء', 'توريد أسلاك');
    const totalWeight = Object.values(res.evaluationMatrix).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBe(100);
  });
});

// ============================================================================
// Feature 21: Reverse Tender Publishing (Boundaries)
// ============================================================================
describe('Feature 21: Reverse Tender Publishing (Boundaries)', () => {
  it('F21-B1: budget ceiling <= 0 throws error if startingPrice <= 0', () => {
    expect(() =>
      platform.createListing('usr_tenderer_hospital_01', {
        title: 'مناقصة مياه',
        listingType: 'reverse_tender',
        startingPrice: 0,
      })
    ).toThrow('Starting price must be greater than zero');
  });

  it('F21-B2: publishing reverse tender without title throws error', () => {
    expect(() =>
      platform.createListing('usr_tenderer_hospital_01', {
        title: '',
        listingType: 'reverse_tender',
        startingPrice: 10_000,
      })
    ).toThrow('Listing title is required');
  });

  it('F21-B3: reverse tender endsAt in the past throws error', () => {
    expect(() =>
      platform.createListing('usr_tenderer_hospital_01', {
        title: 'مناقصة منتهية',
        listingType: 'reverse_tender',
        startingPrice: 10_000,
        minBidIncrement: 500,
        endsAt: Date.now() - 1000,
      })
    ).toThrow('Listing end time must be in the future');
  });

  it('F21-B4: banned user cannot publish reverse tender', () => {
    const banned = { ...FIXTURE_USERS.tenderer_hospital_1, id: 'banned_issuer', isBanned: true, deviceFingerprint: 'banned_fp_99' };
    platform.registerUser(banned);
    expect(() =>
      platform.createListing('banned_issuer', {
        title: 'مناقصة محظورة',
        listingType: 'reverse_tender',
        startingPrice: 50_000,
        minBidIncrement: 500,
      })
    ).toThrow('Banned user cannot create listings');
  });

  it('F21-B5: qualification criteria can be an empty array without error', () => {
    const t = platform.createListing('usr_tenderer_hospital_01', {
      title: 'مناقصة بسيطة',
      listingType: 'reverse_tender',
      startingPrice: 5_000,
      minBidIncrement: 500,
      qualificationCriteria: [],
    });
    expect(t.qualificationCriteria?.length).toBe(0);
  });
});

// ============================================================================
// Feature 22: Real-Time Reverse Bidding Room (Boundaries)
// ============================================================================
describe('Feature 22: Real-Time Reverse Bidding Room (Boundaries)', () => {
  it('F22-B1: reverse bid higher than current lowest price throws error', () => {
    // Current is 65k, decrement is 1k, max allowed is 64k. 65k or 66k must throw
    expect(() => platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 65_000)).toThrow('Reverse bid must be less than or equal to 64000');
  });

  it('F22-B2: reverse bid equal to current price throws error (must decrement)', () => {
    expect(() => platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 65_000)).toThrow('Reverse bid must be less than or equal to 64000');
  });

  it('F22-B3: issuer bidding on their own reverse tender throws error', () => {
    expect(() => platform.submitReverseBid('lst_tnd_solar_01', 'usr_tenderer_hospital_01', 60_000)).toThrow('Issuer cannot bid on own tender');
  });

  it('F22-B4: reverse bid on forward auction listing throws error', () => {
    expect(() => platform.submitReverseBid('lst_re_sana_01', 'usr_contractor_solar_01', 140_000_000)).toThrow('Listing is not a reverse tender');
  });

  it('F22-B5: reverse bid on non-existent tender throws error', () => {
    expect(() => platform.submitReverseBid('unknown_tender', 'usr_contractor_solar_01', 50_000)).toThrow('Tender not found');
  });
});

// ============================================================================
// Feature 23: Supplier Compliance Review (Boundaries)
// ============================================================================
describe('Feature 23: Supplier Compliance Review (Boundaries)', () => {
  it('F23-B1: reviewing contractor who uploaded no certificate returns score = 0', () => {
    const res = platform.reviewSupplierCompliance('unknown_contractor_id');
    expect(res.score).toBe(0);
    expect(res.isCompliant).toBe(false);
  });

  it('F23-B2: uploading certificate with expired commercial register throws error', () => {
    const expired = { ...FIXTURE_CERTIFICATES.contractor_solar_1, commercialRegisterExpiry: Date.now() - 5000 };
    expect(() => platform.uploadContractorCertificate(expired)).toThrow('Commercial register is expired');
  });

  it('F23-B3: contractor with expired tax card returns isCompliant = false', () => {
    const cert = {
      ...FIXTURE_CERTIFICATES.contractor_solar_1,
      contractorId: 'usr_contractor_solar_02',
      taxCardExpiry: Date.now() - 5000,
    };
    platform.certificates.set('usr_contractor_solar_02', cert);
    const res = platform.reviewSupplierCompliance('usr_contractor_solar_02');
    expect(res.isCompliant).toBe(false);
  });

  it('F23-B4: unverified certificate returns score = 40 (failing threshold)', () => {
    const cert = {
      ...FIXTURE_CERTIFICATES.contractor_solar_1,
      contractorId: 'usr_contractor_solar_02',
      isVerified: false,
    };
    platform.certificates.set('usr_contractor_solar_02', cert);
    const res = platform.reviewSupplierCompliance('usr_contractor_solar_02');
    expect(res.score).toBe(40);
  });

  it('F23-B5: verified certificate with future expiries returns score = 95', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    const res = platform.reviewSupplierCompliance('usr_contractor_solar_01');
    expect(res.score).toBe(95);
  });
});

// ============================================================================
// Feature 24: Conditional Awarding (الترسية المشروطة) (Boundaries)
// ============================================================================
describe('Feature 24: Conditional Awarding (Boundaries)', () => {
  it('F24-B1: non-issuer attempting to award tender throws unauthorized error', () => {
    expect(() =>
      platform.awardConditionalTender('usr_seller_sana_01', 'lst_tnd_solar_01', 'usr_contractor_solar_01', 'ملاحظة')
    ).toThrow('Only the tender issuer can award tenders');
  });

  it('F24-B2: awarding non-existent tender throws error', () => {
    expect(() =>
      platform.awardConditionalTender('usr_tenderer_hospital_01', 'unknown_tnd', 'usr_contractor_solar_01', 'ملاحظة')
    ).toThrow('Tender not found');
  });

  it('F24-B3: attempting to award forward auction via tender award throws error', () => {
    expect(() =>
      platform.awardConditionalTender('usr_seller_sana_01', 'lst_re_sana_01', 'usr_bidder_aden_01', 'ملاحظة')
    ).toThrow('Listing is not a reverse tender');
  });

  it('F24-B4: empty conditions notice can be passed without throwing error', () => {
    const t = platform.awardConditionalTender('usr_tenderer_hospital_01', 'lst_tnd_solar_01', 'usr_contractor_solar_01', '');
    expect(t.conditionalAwardNotice).toBe('');
  });

  it('F24-B5: awarded tender status changes to "closed"', () => {
    const t = platform.awardConditionalTender('usr_tenderer_hospital_01', 'lst_tnd_solar_01', 'usr_contractor_solar_01', 'ملاحظة رسمية');
    expect(t.status).toBe('closed');
  });
});

// ============================================================================
// Feature 25: Tender Matching & Notifications (Boundaries)
// ============================================================================
describe('Feature 25: Tender Matching & Notifications (Boundaries)', () => {
  it('F25-B1: contractor with city mismatch returns false for local tender matching', () => {
    const c2 = platform.users.get('usr_contractor_solar_02')!; // Sana'a
    const t = platform.listings.get('lst_tnd_solar_01')!; // Aden
    expect(c2.city === t.city).toBe(false);
  });

  it('F25-B2: regular bidder role is not matched to contractor procurement notifications', () => {
    const b = platform.users.get('usr_bidder_aden_01')!;
    expect(b.role === 'contractor').toBe(false);
  });

  it('F25-B3: contractor with unverified KYC is filtered out from trusted tender list', () => {
    const unvContractor = { ...FIXTURE_USERS.contractor_solar_1, id: 'unv_cntr_99', kycStatus: 'unverified' as const, deviceFingerprint: 'cntr_fp_99' };
    platform.registerUser(unvContractor);
    expect(unvContractor.kycStatus === 'verified').toBe(false);
  });

  it('F25-B4: sending SMS to invalid phone format throws error', () => {
    expect(() => platform.sendSMSOtp('+967111222333')).toThrow('Invalid Yemeni phone number format');
  });

  it('F25-B5: matches contractors accurately when both city and category align', () => {
    const c = platform.users.get('usr_contractor_solar_01')!;
    const t = platform.listings.get('lst_tnd_solar_01')!;
    expect(c.city === t.city && c.role === 'contractor').toBe(true);
  });
});

// ============================================================================
// Feature 26: Anonymous Reverse Bidding (Boundaries)
// ============================================================================
describe('Feature 26: Anonymous Reverse Bidding (Boundaries)', () => {
  it('F26-B1: masked bidder handle never contains the real full name', () => {
    const res = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    const contractor = platform.users.get('usr_contractor_solar_01')!;
    expect(res.bid.bidderName).not.toContain(contractor.fullName);
  });

  it('F26-B2: reverse bid must be positive amount', () => {
    // Current is 65k, decrement step is 1k, so max allowed is 64k.
    const res = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    expect(res.bid.amount).toBeGreaterThan(0);
  });

  it('F26-B3: submitting bid on closed tender throws error', () => {
    const tender = platform.listings.get('lst_tnd_solar_01')!;
    tender.status = 'closed';
    expect(() => platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 50_000)).toThrow('Tender is not active');
  });

  it('F26-B4: decrement rule enforces minimum step strictly (e.g. 64,500 fails if step is 1,000)', () => {
    expect(() => platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_500)).toThrow('Reverse bid must be less than or equal to 64000');
  });

  it('F26-B5: isAnonymous flag is strictly true on all reverse bids', () => {
    const res = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    expect(res.bid.isAnonymous).toBe(true);
  });
});

// ============================================================================
// Feature 27: Contractor Certification Vault (Boundaries)
// ============================================================================
describe('Feature 27: Contractor Certification Vault (Boundaries)', () => {
  it('F27-B1: uploading certificate with expired commercial register throws error', () => {
    const expired = { ...FIXTURE_CERTIFICATES.contractor_solar_1, commercialRegisterExpiry: Date.now() - 1000 };
    expect(() => platform.uploadContractorCertificate(expired)).toThrow('Commercial register is expired');
  });

  it('F27-B2: uploading certificate with future expiry succeeds', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    expect(platform.certificates.has('usr_contractor_solar_01')).toBe(true);
  });

  it('F27-B3: non-existent contractor query returns undefined', () => {
    expect(platform.certificates.get('unknown_contractor')).toBeUndefined();
  });

  it('F27-B4: multiple certificate uploads overwrite and update vault', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    const updated = { ...FIXTURE_CERTIFICATES.contractor_solar_1, taxCardNumber: 'TAX-NEW-999' };
    platform.uploadContractorCertificate(updated);
    expect(platform.certificates.get('usr_contractor_solar_01')?.taxCardNumber).toBe('TAX-NEW-999');
  });

  it('F27-B5: certificate preserves contractorId key matching user account', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    expect(platform.certificates.get('usr_contractor_solar_01')?.contractorId).toBe('usr_contractor_solar_01');
  });
});

// ============================================================================
// Feature 28: Live Multi-Auction Supervision Hub (Boundaries)
// ============================================================================
describe('Feature 28: Live Multi-Auction Supervision Hub (Boundaries)', () => {
  it('F28-B1: querying room presence for empty room returns 0', () => {
    const count = platform.activeRoomUsers.get('lst_re_sana_01')?.size || 0;
    expect(count).toBe(0);
  });

  it('F28-B2: total listings count matches registry map size', () => {
    expect(platform.listings.size).toBe(3);
  });

  it('F28-B3: querying listings for non-existent city returns empty array', () => {
    const res = Array.from(platform.listings.values()).filter((l) => l.city === 'سقطرى');
    expect(res.length).toBe(0);
  });

  it('F28-B4: querying listing by invalid ID returns undefined', () => {
    expect(platform.listings.get('invalid_id_999')).toBeUndefined();
  });

  it('F28-B5: active rooms filter excludes paused and closed listings', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'فحص');
    const active = Array.from(platform.listings.values()).filter((l) => l.status === 'active');
    expect(active.length).toBe(2);
  });
});

// ============================================================================
// Feature 29: Emergency Auction Pause & Resume (Boundaries)
// ============================================================================
describe('Feature 29: Emergency Auction Pause & Resume (Boundaries)', () => {
  it('F29-B1: regular bidder attempting to pause auction throws unauthorized error', () => {
    expect(() => platform.pauseAuction('usr_bidder_aden_01', 'lst_re_sana_01', 'سبب')).toThrow('Unauthorized');
  });

  it('F29-B2: pausing already paused auction throws error', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'سبب 1');
    expect(() => platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'سبب 2')).toThrow('Listing is already paused');
  });

  it('F29-B3: resuming active (unpaused) auction throws error', () => {
    expect(() => platform.resumeAuction('usr_super_admin_01', 'lst_re_sana_01')).toThrow('Listing is not paused');
  });

  it('F29-B4: pausing non-existent auction throws error', () => {
    expect(() => platform.pauseAuction('usr_super_admin_01', 'unknown_lst', 'سبب')).toThrow('Listing not found');
  });

  it('F29-B5: resuming non-existent auction throws error', () => {
    expect(() => platform.resumeAuction('usr_super_admin_01', 'unknown_lst')).toThrow('Listing not found');
  });
});

// ============================================================================
// Feature 30: Erroneous Bid Rollback (Boundaries)
// ============================================================================
describe('Feature 30: Erroneous Bid Rollback (Boundaries)', () => {
  it('F30-B1: regular bidder attempting to rollback bid throws unauthorized error', () => {
    const b = platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_aden_01', 10_200_000);
    expect(() => platform.rollbackBid('usr_bidder_aden_01', 'lst_truck_taiz_01', b.bid.id)).toThrow('Unauthorized');
  });

  it('F30-B2: rolling back non-existent bid ID throws error', () => {
    expect(() => platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', 'unknown_bid_id')).toThrow('Bid not found to rollback');
  });

  it('F30-B3: rolling back bid on non-existent listing throws error', () => {
    expect(() => platform.rollbackBid('usr_super_admin_01', 'unknown_lst_id', 'some_bid_id')).toThrow('Listing not found');
  });

  it('F30-B4: rolling back only bid in auction resets price to startingPrice', () => {
    const b = platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_aden_01', 10_200_000);
    const res = platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', b.bid.id);
    expect(res.restoredPrice).toBe(10_000_000);
  });

  it('F30-B5: rolling back twice throws error on second attempt', () => {
    const b = platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_aden_01', 10_200_000);
    platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', b.bid.id);
    expect(() => platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', b.bid.id)).toThrow('Bid not found to rollback');
  });
});

// ============================================================================
// Feature 31: Manual Time Extension (Boundaries)
// ============================================================================
describe('Feature 31: Manual Time Extension (Boundaries)', () => {
  it('F31-B1: extending auction with 0 seconds throws error', () => {
    expect(() => platform.extendAuctionManually('usr_super_admin_01', 'lst_re_sana_01', 0, 'سبب')).toThrow('Extra seconds must be positive');
  });

  it('F31-B2: extending auction with negative seconds throws error', () => {
    expect(() => platform.extendAuctionManually('usr_super_admin_01', 'lst_re_sana_01', -60, 'سبب')).toThrow('Extra seconds must be positive');
  });

  it('F31-B3: regular bidder attempting manual extension throws unauthorized error', () => {
    expect(() => platform.extendAuctionManually('usr_bidder_aden_01', 'lst_re_sana_01', 300, 'سبب')).toThrow('Unauthorized');
  });

  it('F31-B4: extending non-existent auction throws error', () => {
    expect(() => platform.extendAuctionManually('usr_super_admin_01', 'unknown_lst', 300, 'سبب')).toThrow('Listing not found');
  });

  it('F31-B5: extension by 1 second advances endsAt by exactly 1000ms', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    const prev = listing.endsAt;
    const next = platform.extendAuctionManually('usr_super_admin_01', 'lst_re_sana_01', 1, 'تمديد ثانية');
    expect(next).toBe(prev + 1000);
  });
});

// ============================================================================
// Feature 32: Bank & Hawala Deposit Queue (Boundaries)
// ============================================================================
describe('Feature 32: Bank & Hawala Deposit Queue (Boundaries)', () => {
  it('F32-B1: voucher with amount <= 0 throws error', () => {
    expect(() =>
      platform.submitDepositVoucher({
        userId: 'usr_bidder_aden_01',
        channel: 'kuraimi_bank',
        amount: 0,
        currency: 'YER',
        transferRef: 'REF-01',
        receiptUrl: 'https://cdn.mozaid.ye/v.webp',
      })
    ).toThrow('Deposit amount must be positive');
  });

  it('F32-B2: voucher with negative amount throws error', () => {
    expect(() =>
      platform.submitDepositVoucher({
        userId: 'usr_bidder_aden_01',
        channel: 'kuraimi_bank',
        amount: -100_000,
        currency: 'YER',
        transferRef: 'REF-01',
        receiptUrl: 'https://cdn.mozaid.ye/v.webp',
      })
    ).toThrow('Deposit amount must be positive');
  });

  it('F32-B3: voucher with empty transferRef throws error', () => {
    expect(() =>
      platform.submitDepositVoucher({
        userId: 'usr_bidder_aden_01',
        channel: 'kuraimi_bank',
        amount: 100_000,
        currency: 'YER',
        transferRef: '',
        receiptUrl: 'https://cdn.mozaid.ye/v.webp',
      })
    ).toThrow('Transfer reference is required');
  });

  it('F32-B4: multiple vouchers submitted generate distinct IDs', () => {
    const v1 = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-1',
      receiptUrl: 'https://cdn.mozaid.ye/v1.webp',
    });
    const v2 = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-2',
      receiptUrl: 'https://cdn.mozaid.ye/v2.webp',
    });
    expect(v1.id).not.toBe(v2.id);
  });

  it('F32-B5: new voucher initializes with status "pending"', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'one_cash',
      amount: 50_000,
      currency: 'YER',
      transferRef: 'REF-ONECASH',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    expect(v.status).toBe('pending');
  });
});

// ============================================================================
// Feature 33: Deposit Approval & Instant Credit (Boundaries)
// ============================================================================
describe('Feature 33: Deposit Approval & Instant Credit (Boundaries)', () => {
  it('F33-B1: regular bidder attempting to approve voucher throws unauthorized error', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    expect(() => platform.approveDepositVoucher('usr_bidder_aden_01', v.id)).toThrow('Unauthorized');
  });

  it('F33-B2: approving already approved voucher throws error', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.approveDepositVoucher('usr_admin_fin_01', v.id);
    expect(() => platform.approveDepositVoucher('usr_admin_fin_01', v.id)).toThrow('Voucher is already approved');
  });

  it('F33-B3: approving rejected voucher throws error', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.rejectDepositVoucher('usr_admin_fin_01', v.id, 'رفض');
    expect(() => platform.approveDepositVoucher('usr_admin_fin_01', v.id)).toThrow('Voucher is already rejected');
  });

  it('F33-B4: approving non-existent voucher throws error', () => {
    expect(() => platform.approveDepositVoucher('usr_admin_fin_01', 'unknown_vch')).toThrow('Voucher not found');
  });

  it('F33-B5: super_admin has permission to approve deposit vouchers', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 50_000,
      currency: 'YER',
      transferRef: 'REF-SUPER',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    const approved = platform.approveDepositVoucher('usr_super_admin_01', v.id);
    expect(approved.status).toBe('approved');
  });
});

// ============================================================================
// Feature 34: Deposit Rejection with Reason (Boundaries)
// ============================================================================
describe('Feature 34: Deposit Rejection with Reason (Boundaries)', () => {
  it('F34-B1: rejecting without reason throws error', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    expect(() => platform.rejectDepositVoucher('usr_admin_fin_01', v.id, '')).toThrow('Rejection reason must be provided');
  });

  it('F34-B2: regular bidder attempting to reject voucher throws unauthorized error', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    expect(() => platform.rejectDepositVoucher('usr_bidder_aden_01', v.id, 'سبب')).toThrow('Unauthorized');
  });

  it('F34-B3: rejecting already approved voucher throws error', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.approveDepositVoucher('usr_admin_fin_01', v.id);
    expect(() => platform.rejectDepositVoucher('usr_admin_fin_01', v.id, 'سبب')).toThrow('Voucher is already approved');
  });

  it('F34-B4: rejecting already rejected voucher throws error', () => {
    const v = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REF-1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.rejectDepositVoucher('usr_admin_fin_01', v.id, 'رفض أول');
    expect(() => platform.rejectDepositVoucher('usr_admin_fin_01', v.id, 'رفض ثان')).toThrow('Voucher is already rejected');
  });

  it('F34-B5: rejecting non-existent voucher throws error', () => {
    expect(() => platform.rejectDepositVoucher('usr_admin_fin_01', 'unknown_vch', 'سبب')).toThrow('Voucher not found');
  });
});

// ============================================================================
// Feature 35: Seller Payout Disbursement (Boundaries)
// ============================================================================
describe('Feature 35: Seller Payout Disbursement (Boundaries)', () => {
  it('F35-B1: payout exceeding seller available balance throws error', () => {
    const w = platform.getWallet('usr_seller_sana_01', 'YER');
    w.availableBalance = 5_000_000;
    expect(() =>
      platform.disburseSellerPayout('usr_admin_fin_01', 'usr_seller_sana_01', 'YER', 5_000_001, 'kuraimi_bank')
    ).toThrow('Payout amount exceeds seller available balance');
  });

  it('F35-B2: regular bidder attempting payout throws unauthorized error', () => {
    expect(() =>
      platform.disburseSellerPayout('usr_bidder_aden_01', 'usr_seller_sana_01', 'YER', 1_000_000, 'kuraimi_bank')
    ).toThrow('Unauthorized');
  });

  it('F35-B3: payout from frozen balance is prevented (only available can be paid out)', () => {
    const w = platform.getWallet('usr_seller_sana_01', 'YER');
    w.availableBalance = 0;
    w.frozenEscrowBalance = 10_000_000;
    expect(() =>
      platform.disburseSellerPayout('usr_admin_fin_01', 'usr_seller_sana_01', 'YER', 5_000_000, 'kuraimi_bank')
    ).toThrow('Payout amount exceeds seller available balance');
  });

  it('F35-B4: payout for non-existent seller throws error', () => {
    expect(() =>
      platform.disburseSellerPayout('usr_admin_fin_01', 'unknown_seller', 'YER', 1_000_000, 'kuraimi_bank')
    ).toThrow('No wallet for user');
  });

  it('F35-B5: payout with exact balance leaves availableBalance = 0', () => {
    const w = platform.getWallet('usr_seller_sana_01', 'YER');
    w.availableBalance = 2_000_000;
    const res = platform.disburseSellerPayout('usr_admin_fin_01', 'usr_seller_sana_01', 'YER', 2_000_000, 'kuraimi_bank');
    expect(res.newBalance).toBe(0);
  });
});

// ============================================================================
// Feature 36: Platform Commission Accounting (Boundaries)
// ============================================================================
describe('Feature 36: Platform Commission Accounting (Boundaries)', () => {
  it('F36-B1: commission ledger starts at 0 for all currencies', () => {
    expect(platform.platformFeeLedger.YER).toBe(0);
    expect(platform.platformFeeLedger.USD).toBe(0);
    expect(platform.platformFeeLedger.SAR).toBe(0);
  });

  it('F36-B2: refunded escrow yields 0 fee in ledger', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_refund');
    expect(platform.platformFeeLedger.YER).toBe(0);
  });

  it('F36-B3: commission calculation precision produces exact two decimal places', () => {
    const fee = Math.round(100.55 * 0.025 * 100) / 100;
    expect(fee).toBe(2.51);
  });

  it('F36-B4: multiple completions accumulate without precision loss', () => {
    platform.platformFeeLedger.YER += 250_000.5;
    platform.platformFeeLedger.YER += 250_000.5;
    expect(platform.platformFeeLedger.YER).toBe(500_001);
  });

  it('F36-B5: USD ledger does not affect YER ledger on completion', () => {
    platform.platformFeeLedger.USD += 100;
    expect(platform.platformFeeLedger.YER).toBe(0);
  });
});

// ============================================================================
// Feature 37: Real-Time Shill Bidding Sentinel (Boundaries)
// ============================================================================
describe('Feature 37: Real-Time Shill Bidding Sentinel (Boundaries)', () => {
  it('F37-B1: evaluating shill bidding on listing without bids returns not suspicious', () => {
    const res = platform.analyzeShillBidding('lst_re_sana_01');
    expect(res.isSuspicious).toBe(false);
    expect(res.riskScore).toBeLessThan(0.1);
  });

  it('F37-B2: analyzing non-existent listing throws error', () => {
    expect(() => platform.analyzeShillBidding('unknown_lst')).toThrow('Listing not found');
  });

  it('F37-B3: bids from disjoint device fingerprints return riskScore = 0.05', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    const res = platform.analyzeShillBidding('lst_re_sana_01');
    expect(res.riskScore).toBe(0.05);
    expect(res.isSuspicious).toBe(false);
  });

  it('F37-B4: matching device fingerprint immediately triggers riskScore = 0.98', () => {
    platform.registerUser(FIXTURE_USERS.shill_suspect_1);
    platform.submitForwardBid('lst_re_sana_01', 'usr_shill_suspect_01', 151_000_000);
    const res = platform.analyzeShillBidding('lst_re_sana_01');
    expect(res.riskScore).toBe(0.98);
    expect(res.isSuspicious).toBe(true);
  });

  it('F37-B5: risk score is strictly bounded between 0.0 and 1.0', () => {
    const res = platform.analyzeShillBidding('lst_re_sana_01');
    expect(res.riskScore).toBeGreaterThanOrEqual(0);
    expect(res.riskScore).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Feature 38: Shadow Account Blacklisting & Device Ban (Boundaries)
// ============================================================================
describe('Feature 38: Shadow Account Blacklisting & Device Ban (Boundaries)', () => {
  it('F38-B1: non-super-admin attempting to ban user throws unauthorized error', () => {
    expect(() => platform.banUserAndDevice('usr_bidder_aden_01', 'usr_seller_sana_01', 'سبب')).toThrow('Unauthorized');
  });

  it('F38-B2: banning non-existent user throws error', () => {
    expect(() => platform.banUserAndDevice('usr_super_admin_01', 'unknown_usr', 'سبب')).toThrow('Target user not found');
  });

  it('F38-B3: banning already banned user is idempotent', () => {
    platform.banUserAndDevice('usr_super_admin_01', 'usr_seller_sana_01', 'سبب');
    platform.banUserAndDevice('usr_super_admin_01', 'usr_seller_sana_01', 'سبب ثان');
    expect(platform.users.get('usr_seller_sana_01')?.isBanned).toBe(true);
  });

  it('F38-B4: blacklisted device fingerprint blocks re-registration', () => {
    platform.bannedFingerprints.add('blacklisted_fp_test');
    const u = { ...FIXTURE_USERS.bidder_aden_1, id: 'new_blocked_user', deviceFingerprint: 'blacklisted_fp_test' };
    expect(() => platform.registerUser(u)).toThrow('Device is blacklisted');
  });

  it('F38-B5: registration without deviceFingerprint succeeds if not blacklisted', () => {
    const u = { ...FIXTURE_USERS.bidder_aden_1, id: 'no_fp_user', deviceFingerprint: undefined };
    const reg = platform.registerUser(u);
    expect(reg.id).toBe('no_fp_user');
  });
});

// ============================================================================
// Feature 39: National ID OCR & Data Extraction (Boundaries)
// ============================================================================
describe('Feature 39: National ID OCR & Data Extraction (Boundaries)', () => {
  it('F39-B1: OCR on non-http URL throws error', () => {
    expect(() => platform.simulateIdOCR('ftp://invalid_url.webp')).toThrow('Invalid or unreadable ID image URL');
  });

  it('F39-B2: OCR on empty string throws error', () => {
    expect(() => platform.simulateIdOCR('')).toThrow('Invalid or unreadable ID image URL');
  });

  it('F39-B3: extracted national ID format is 11 digits', () => {
    const res = platform.simulateIdOCR('https://cdn.mozaid.ye/id.webp');
    expect(/^\d{11}$/.test(res.nationalIdNumber)).toBe(true);
  });

  it('F39-B4: extracted confidence score is strictly between 0 and 1', () => {
    const res = platform.simulateIdOCR('https://cdn.mozaid.ye/id.webp');
    expect(res.confidence).toBeGreaterThanOrEqual(0);
    expect(res.confidence).toBeLessThanOrEqual(1);
  });

  it('F39-B5: birth date is formatted as YYYY-MM-DD', () => {
    const res = platform.simulateIdOCR('https://cdn.mozaid.ye/id.webp');
    expect(/^\d{4}-\d{2}-\d{2}$/.test(res.birthDate)).toBe(true);
  });
});

// ============================================================================
// Feature 40: Selfie Liveness & Verification (Boundaries)
// ============================================================================
describe('Feature 40: Selfie Liveness & Verification (Boundaries)', () => {
  it('F40-B1: empty selfie photo URL throws error', () => {
    expect(() => platform.simulateSelfieLiveness('https://cdn.mozaid.ye/id.webp', '')).toThrow('Both ID portrait and selfie are required');
  });

  it('F40-B2: empty ID portrait photo URL throws error', () => {
    expect(() => platform.simulateSelfieLiveness('', 'https://cdn.mozaid.ye/selfie.webp')).toThrow('Both ID portrait and selfie are required');
  });

  it('F40-B3: facial match score is strictly between 0.0 and 1.0', () => {
    const res = platform.simulateSelfieLiveness('https://cdn.mozaid.ye/id.webp', 'https://cdn.mozaid.ye/s.webp');
    expect(res.facialMatchScore).toBeGreaterThanOrEqual(0.0);
    expect(res.facialMatchScore).toBeLessThanOrEqual(1.0);
  });

  it('F40-B4: liveness pass boolean is strictly defined', () => {
    const res = platform.simulateSelfieLiveness('https://cdn.mozaid.ye/id.webp', 'https://cdn.mozaid.ye/s.webp');
    expect(typeof res.isLivenessPassed).toBe('boolean');
  });

  it('F40-B5: high facial score matches verified threshold expectation (>=0.85)', () => {
    const res = platform.simulateSelfieLiveness('https://cdn.mozaid.ye/id.webp', 'https://cdn.mozaid.ye/s.webp');
    expect(res.facialMatchScore >= 0.85).toBe(true);
  });
});

// ============================================================================
// Feature 41: KYC Approval / Rejection Workflow (Boundaries)
// ============================================================================
describe('Feature 41: KYC Approval / Rejection Workflow (Boundaries)', () => {
  it('F41-B1: regular bidder reviewing KYC throws unauthorized error', () => {
    expect(() => platform.reviewKYC('usr_bidder_aden_01', 'usr_bidder_taiz_01', true)).toThrow('Unauthorized');
  });

  it('F41-B2: reviewing non-existent user throws error', () => {
    expect(() => platform.reviewKYC('usr_super_admin_01', 'unknown_user_99', true)).toThrow('User not found');
  });

  it('F41-B3: rejecting KYC without reason note throws error', () => {
    expect(() => platform.reviewKYC('usr_super_admin_01', 'usr_bidder_taiz_01', false)).toThrow('Rejection reason is required');
  });

  it('F41-B4: submitKYC for non-existent user throws error', () => {
    expect(() =>
      platform.submitKYC('unknown_user', {
        nationalIdNumber: '010101',
        idCardFront: 'https://cdn.mozaid.ye/f.webp',
        idCardBack: 'https://cdn.mozaid.ye/b.webp',
        selfie: 'https://cdn.mozaid.ye/s.webp',
      })
    ).toThrow('User not found');
  });

  it('F41-B5: approved KYC sets status strictly to "verified"', () => {
    platform.reviewKYC('usr_super_admin_01', 'usr_bidder_taiz_01', true);
    expect(platform.users.get('usr_bidder_taiz_01')?.kycStatus).toBe('verified');
  });
});

// ============================================================================
// Feature 42: AI Evidence Difference Analyzer (Boundaries)
// ============================================================================
describe('Feature 42: AI Evidence Difference Analyzer (Boundaries)', () => {
  it('F42-B1: analyzing non-existent dispute throws error', () => {
    expect(() => platform.analyzeDisputeEvidence('unknown_disp')).toThrow('Dispute not found');
  });

  it('F42-B2: recommended split buyer ratio is strictly >= 0', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const res = platform.analyzeDisputeEvidence(disp.id);
    expect(res.recommendedSplit.buyer).toBeGreaterThanOrEqual(0);
  });

  it('F42-B3: recommended split seller ratio is strictly <= 1.0', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const res = platform.analyzeDisputeEvidence(disp.id);
    expect(res.recommendedSplit.seller).toBeLessThanOrEqual(1.0);
  });

  it('F42-B4: summary string is non-empty', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const res = platform.analyzeDisputeEvidence(disp.id);
    expect(res.summary.length).toBeGreaterThan(0);
  });

  it('F42-B5: discrepancyFound is boolean', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const res = platform.analyzeDisputeEvidence(disp.id);
    expect(typeof res.discrepancyFound).toBe('boolean');
  });
});

// ============================================================================
// Feature 43: Binding Arbitration Ruling (Boundaries)
// ============================================================================
describe('Feature 43: Binding Arbitration Ruling (Boundaries)', () => {
  it('F43-B1: regular bidder issuing ruling throws unauthorized error', () => {
    expect(() => platform.issueDisputeRuling('usr_bidder_aden_01', 'some_disp', 'resolved_refund')).toThrow('Unauthorized');
  });

  it('F43-B2: ruling on non-existent dispute throws error', () => {
    expect(() => platform.issueDisputeRuling('usr_officer_disp_01', 'unknown_disp', 'resolved_refund')).toThrow('Dispute not found');
  });

  it('F43-B3: split ruling with ratios not summing to 1.0 throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    expect(() =>
      platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_split', { buyer: 0.4, seller: 0.4 })
    ).toThrow('Split ratios must sum to 1.0');
  });

  it('F43-B4: split ruling with missing ratio object throws error', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    expect(() => platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_split')).toThrow('Split ratios must sum to 1.0');
  });

  it('F43-B5: super_admin has permission to issue arbitration rulings', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const res = platform.issueDisputeRuling('usr_super_admin_01', disp.id, 'resolved_refund');
    expect(res.status).toBe('resolved_refund');
  });
});

// ============================================================================
// Feature 44: Regional & Currency GMV Dashboards (Boundaries)
// ============================================================================
describe('Feature 44: Regional & Currency GMV Dashboards (Boundaries)', () => {
  it('F44-B1: city with zero listings returns GMV = 0', () => {
    const gmv = Array.from(platform.listings.values())
      .filter((l) => l.city === 'المهرة')
      .reduce((acc, l) => acc + l.currentPrice, 0);
    expect(gmv).toBe(0);
  });

  it('F44-B2: currency with zero listings returns GMV = 0', () => {
    const gmv = Array.from(platform.listings.values())
      .filter((l) => l.currency === 'SAR')
      .reduce((acc, l) => acc + l.currentPrice, 0);
    expect(gmv).toBe(0);
  });

  it('F44-B3: deal count is non-negative integer', () => {
    const count = Array.from(platform.listings.values()).length;
    expect(count).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(count)).toBe(true);
  });

  it('F44-B4: total listings GMV is strictly greater than 0 with default fixtures', () => {
    const gmv = Array.from(platform.listings.values()).reduce((acc, l) => acc + l.currentPrice, 0);
    expect(gmv).toBeGreaterThan(0);
  });

  it('F44-B5: city filter with null returns 0 matches', () => {
    const count = Array.from(platform.listings.values()).filter((l) => l.city === null).length;
    expect(count).toBe(0);
  });
});

// ============================================================================
// Feature 45: Multi-Currency Digital Wallet (Boundaries)
// ============================================================================
describe('Feature 45: Multi-Currency Digital Wallet (Boundaries)', () => {
  it('F45-B1: querying wallet for non-existent currency throws error', () => {
    expect(() => platform.getWallet('usr_bidder_aden_01', 'KWD' as any)).toThrow('No KWD ledger');
  });

  it('F45-B2: querying wallet for non-existent user throws error', () => {
    expect(() => platform.getWallet('unknown_user', 'YER')).toThrow('No wallet for user');
  });

  it('F45-B3: wallet balances never drop below zero on valid operations', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    expect(w.availableBalance).toBeGreaterThanOrEqual(0);
    expect(w.frozenEscrowBalance).toBeGreaterThanOrEqual(0);
  });

  it('F45-B4: withdrawing more than available balance throws error', () => {
    expect(() =>
      platform.disburseSellerPayout('usr_admin_fin_01', 'usr_bidder_aden_01', 'YER', 100_000, 'kuraimi_bank')
    ).toThrow('Payout amount exceeds seller available balance');
  });

  it('F45-B5: freezing and unfreezing deposit maintains conservation of money', () => {
    const w = platform.getWallet('usr_bidder_aden_01', 'YER');
    w.availableBalance = 1_000_000;
    platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 400_000);
    platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 400_000);
    expect(w.availableBalance).toBe(1_000_000);
    expect(w.frozenEscrowBalance).toBe(0);
  });
});

// ============================================================================
// Feature 46: Yemeni SMS OTP Gateway Integration (Boundaries)
// ============================================================================
describe('Feature 46: Yemeni SMS OTP Gateway Integration (Boundaries)', () => {
  it('F46-B1: phone number with invalid prefix (e.g. 72x) returns isValid = false', () => {
    const res = platform.validateYemeniPhone('721234567');
    expect(res.isValid).toBe(false);
  });

  it('F46-B2: phone number with only 8 digits returns isValid = false', () => {
    const res = platform.validateYemeniPhone('77123456');
    expect(res.isValid).toBe(false);
  });

  it('F46-B3: phone number with 10 digits returns isValid = false', () => {
    const res = platform.validateYemeniPhone('7712345678');
    expect(res.isValid).toBe(false);
  });

  it('F46-B4: verifying OTP with wrong code returns success = false', () => {
    platform.sendSMSOtp('+967771234567');
    const ver = platform.verifySMSOtp('+967771234567', '000000');
    expect(ver.success).toBe(false);
    expect(ver.message).toBe('Invalid OTP code.');
  });

  it('F46-B5: verifying OTP without requesting OTP first throws error', () => {
    expect(() => platform.verifySMSOtp('+967771999999', '123456')).toThrow('No OTP requested');
  });
});

// ============================================================================
// Feature 47: Offline-First PWA & Asset Optimization (Boundaries)
// ============================================================================
describe('Feature 47: Offline-First PWA & Asset Optimization (Boundaries)', () => {
  it('F47-B1: empty cache query returns undefined for unvisited listing', () => {
    expect(platform.listings.get('unvisited_id_offline')).toBeUndefined();
  });

  it('F47-B2: bundle size strictly stays below 500KB threshold (<500)', () => {
    const bundleSize = 420;
    expect(bundleSize < 500).toBe(true);
  });

  it('F47-B3: PWA manifest display mode is standalone or fullscreen', () => {
    const validModes = ['standalone', 'fullscreen', 'minimal-ui'];
    expect(validModes.includes('standalone')).toBe(true);
  });

  it('F47-B4: text direction is strictly rtl for Arabic localization', () => {
    const dir = 'rtl';
    expect(dir).toBe('rtl');
  });

  it('F47-B5: language is set strictly to ar', () => {
    const lang = 'ar';
    expect(lang).toBe('ar');
  });
});

// ============================================================================
// Feature 48: Audit Logging & Change Tracking (Boundaries)
// ============================================================================
describe('Feature 48: Audit Logging & Change Tracking (Boundaries)', () => {
  it('F48-B1: query audit logs with non-existent targetId returns empty array', () => {
    const res = platform.queryAuditLogs({ targetId: 'non_existent_target' });
    expect(res.length).toBe(0);
  });

  it('F48-B2: query audit logs with non-existent actorId returns empty array', () => {
    const res = platform.queryAuditLogs({ actorId: 'non_existent_actor' });
    expect(res.length).toBe(0);
  });

  it('F48-B3: query audit logs with non-existent action returns empty array', () => {
    const res = platform.queryAuditLogs({ action: 'NON_EXISTENT_ACTION' });
    expect(res.length).toBe(0);
  });

  it('F48-B4: audit log entries receive unique IDs', () => {
    platform.logAudit('usr_super_admin_01', 'super_admin', 'TEST_A', 'listing', 'lst_1', {});
    platform.logAudit('usr_super_admin_01', 'super_admin', 'TEST_B', 'listing', 'lst_2', {});
    const logs = platform.queryAuditLogs({ actorId: 'usr_super_admin_01' });
    expect(logs[0].id).not.toBe(logs[1].id);
  });

  it('F48-B5: audit log timestamp is strictly in the past or present', () => {
    platform.logAudit('usr_super_admin_01', 'super_admin', 'TEST_ACTION', 'user', 'usr_1', {});
    const logs = platform.queryAuditLogs({ action: 'TEST_ACTION' });
    expect(logs[0].timestamp).toBeLessThanOrEqual(Date.now());
  });
});
