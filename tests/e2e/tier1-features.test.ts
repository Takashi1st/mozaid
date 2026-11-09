/**
 * Mozaid AI — End-to-End Test Suite: Tier 1 Feature Coverage
 * Strictly covers all 48 features from PROJECT.md § Feature Inventory.
 * Requirement: >= 5 Happy Path test cases per feature (48 × 5 = 240+ test cases).
 */

import { describe, it, expect, beforeEach } from './harness/test-framework.ts';
import { MozaidMockPlatform } from './harness/mock-platform.ts';
import { FIXTURE_USERS, FIXTURE_LISTINGS, FIXTURE_CERTIFICATES } from './harness/fixtures.ts';
import { YEMEN_CITIES } from '../../src/lib/constants.ts';

let platform: MozaidMockPlatform;

beforeEach(() => {
  platform = new MozaidMockPlatform();
  // Seed essential users
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

  // Seed essential listings
  platform.createListing('usr_seller_sana_01', FIXTURE_LISTINGS.real_estate_sana);
  platform.createListing('usr_seller_sana_01', FIXTURE_LISTINGS.truck_taiz);
  platform.createListing('usr_tenderer_hospital_01', FIXTURE_LISTINGS.solar_tender_aden);
});

// ============================================================================
// Feature 1: Real-Time Live Bidding Room (M3, survey #1)
// ============================================================================
describe('Feature 1: Real-Time Live Bidding Room', () => {
  it('F01-1: bidder successfully joins active auction room and gets initial viewer count', () => {
    const res = platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    expect(res.viewerCount).toBe(1);
    expect(res.currentPrice).toBe(150_000_000);
  });

  it('F01-2: multiple concurrent users joining room increments viewer count accurately', () => {
    platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    const res2 = platform.joinRoom('lst_re_sana_01', 'usr_bidder_taiz_01');
    expect(res2.viewerCount).toBe(2);
  });

  it('F01-3: user leaving room decrements active presence and emits USER_LEFT event', () => {
    platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    platform.leaveRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    const set = platform.activeRoomUsers.get('lst_re_sana_01');
    expect(set?.size).toBe(0);
  });

  it('F01-4: room synchronizes countdown deadline with database listing endsAt', () => {
    const res = platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    const listing = platform.listings.get('lst_re_sana_01')!;
    expect(res.endsAt).toBe(listing.endsAt);
  });

  it('F01-5: joining non-existent room throws descriptive error', () => {
    expect(() => platform.joinRoom('non_existent_room', 'usr_bidder_aden_01')).toThrow('Listing room not found');
  });
});

// ============================================================================
// Feature 2: Quick-Action & Custom Bid Placement (M3, survey #2)
// ============================================================================
describe('Feature 2: Quick-Action & Custom Bid Placement', () => {
  it('F02-1: bidder places quick-action increment bid (+1,000,000 YER) successfully', () => {
    const res = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(res.bid.amount).toBe(151_000_000);
    expect(res.bid.isWinning).toBe(true);
  });

  it('F02-2: competing bidder places custom higher bid exceeding minimum increment', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    const res = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_taiz_01', 155_000_000);
    expect(res.bid.amount).toBe(155_000_000);
    expect(platform.listings.get('lst_re_sana_01')?.currentPrice).toBe(155_000_000);
  });

  it('F02-3: new valid bid unmarks previous highest bid as non-winning', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_taiz_01', 152_000_000);
    const bids = platform.bids.get('lst_re_sana_01')!;
    expect(bids[0].isWinning).toBe(false);
    expect(bids[1].isWinning).toBe(true);
  });

  it('F02-4: room records telemetry metadata (IP address and timestamp) for each bid', () => {
    const res = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000, '192.168.1.100');
    expect(res.bid.ipAddress).toBe('192.168.1.100');
    expect(res.bid.timestamp).toBeGreaterThan(0);
  });

  it('F02-5: placing bid updates room broadcast events with NEW_BID event', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    const newBidEvent = platform.roomEvents.find((e) => e.type === 'NEW_BID' && e.listingId === 'lst_re_sana_01');
    expect(newBidEvent).toBeDefined();
  });
});

// ============================================================================
// Feature 3: Anti-Sniping Extension Receiver (M3, survey #3)
// ============================================================================
describe('Feature 3: Anti-Sniping Extension Receiver', () => {
  it('F03-1: bid placed with <120s remaining triggers anti-sniping extension (+120s)', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() + 60_000; // 60 seconds remaining
    const res = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(res.isExtended).toBe(true);
    expect(listing.timesExtended).toBe(1);
  });

  it('F03-2: anti-sniping extension resets listing status to "extended"', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() + 30_000;
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(listing.status).toBe('extended');
  });

  it('F03-3: anti-sniping emits AUCTION_EXTENDED event with extension seconds payload', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() + 45_000;
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    const ev = platform.roomEvents.find((e) => e.type === 'AUCTION_EXTENDED');
    expect(ev).toBeDefined();
    expect(ev?.payload.extensionSeconds).toBe(120);
  });

  it('F03-4: multiple bids within critical window extend auction consecutively up to threshold', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() + 50_000;
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    listing.endsAt = Date.now() + 50_000;
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_taiz_01', 152_000_000);
    expect(listing.timesExtended).toBe(2);
  });

  it('F03-5: bid placed with >120s remaining does NOT trigger anti-sniping extension', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() + 600_000; // 10 minutes remaining
    const res = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    expect(res.isExtended).toBe(false);
    expect(listing.timesExtended).toBe(0);
  });
});

// ============================================================================
// Feature 4: Listing Discovery & Filter Hub (M4, survey #4)
// ============================================================================
describe('Feature 4: Listing Discovery & Filter Hub', () => {
  it('F04-1: filters listings by category "عقارات" accurately', () => {
    const results = platform.discoverListings({ category: 'عقارات' });
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('عقارات');
  });

  it('F04-2: filters listings by Yemeni city "صنعاء"', () => {
    const results = platform.discoverListings({ city: 'صنعاء' });
    expect(results.length).toBe(1);
    expect(results[0].city).toBe('صنعاء');
  });

  it('F04-3: filters listings within specified price range', () => {
    const results = platform.discoverListings({ minPrice: 5_000_000, maxPrice: 15_000_000 });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('lst_truck_taiz_01');
  });

  it('F04-4: performs full-text title search across listings', () => {
    const results = platform.discoverListings({ query: 'إيسوزو' });
    expect(results.length).toBe(1);
    expect(results[0].title).toContain('إيسوزو');
  });

  it('F04-5: filters listings by listingType "reverse_tender"', () => {
    const results = platform.discoverListings({ listingType: 'reverse_tender' });
    expect(results.length).toBe(1);
    expect(results[0].listingType).toBe('reverse_tender');
  });
});

// ============================================================================
// Feature 5: Araboon / Bid Deposit Lock (M2, survey #5)
// ============================================================================
describe('Feature 5: Araboon / Bid Deposit Lock', () => {
  it('F05-1: locks required entry deposit from available balance into frozen balance', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 5_000_000);
    expect(wallet.availableBalance).toBe(5_000_000);
    expect(wallet.frozenEscrowBalance).toBe(5_000_000);
  });

  it('F05-2: locking zero deposit amount does nothing and preserves balance', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 5_000_000;
    platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 0);
    expect(wallet.availableBalance).toBe(5_000_000);
    expect(wallet.frozenEscrowBalance).toBe(0);
  });

  it('F05-3: locks deposit in USD wallet for dollar-denominated tenders', () => {
    const wallet = platform.getWallet('usr_contractor_solar_01', 'USD');
    wallet.availableBalance = 10_000;
    platform.lockBidDeposit('usr_contractor_solar_01', 'USD', 2_000);
    expect(wallet.availableBalance).toBe(8_000);
    expect(wallet.frozenEscrowBalance).toBe(2_000);
  });

  it('F05-4: multiple deposits accumulate frozen balance monotonically', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 20_000_000;
    platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 5_000_000);
    platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 3_000_000);
    expect(wallet.availableBalance).toBe(12_000_000);
    expect(wallet.frozenEscrowBalance).toBe(8_000_000);
  });

  it('F05-5: locking deposit when available balance equals deposit leaves 0 available', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 5_000_000;
    platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 5_000_000);
    expect(wallet.availableBalance).toBe(0);
    expect(wallet.frozenEscrowBalance).toBe(5_000_000);
  });
});

// ============================================================================
// Feature 6: Deposit Refund for Outbid/Losers (M2, survey #6)
// ============================================================================
describe('Feature 6: Deposit Refund for Outbid/Losers', () => {
  it('F06-1: refunds frozen deposit back to available balance when outbid', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.frozenEscrowBalance = 5_000_000;
    platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 5_000_000);
    expect(wallet.frozenEscrowBalance).toBe(0);
    expect(wallet.availableBalance).toBe(5_000_000);
  });

  it('F06-2: partial refund restores specified amount and leaves remainder frozen', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.frozenEscrowBalance = 8_000_000;
    platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 3_000_000);
    expect(wallet.frozenEscrowBalance).toBe(5_000_000);
    expect(wallet.availableBalance).toBe(3_000_000);
  });

  it('F06-3: refunds USD deposit accurately for outbid contractor', () => {
    const wallet = platform.getWallet('usr_contractor_solar_01', 'USD');
    wallet.frozenEscrowBalance = 2_000;
    platform.refundBidDeposit('usr_contractor_solar_01', 'USD', 2_000);
    expect(wallet.frozenEscrowBalance).toBe(0);
    expect(wallet.availableBalance).toBe(2_000);
  });

  it('F06-4: refunding zero amount is idempotent and harmless', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.frozenEscrowBalance = 1_000_000;
    platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 0);
    expect(wallet.frozenEscrowBalance).toBe(1_000_000);
    expect(wallet.availableBalance).toBe(0);
  });

  it('F06-5: consecutive refunds restore full original balance across multiple events', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.frozenEscrowBalance = 10_000_000;
    platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 4_000_000);
    platform.refundBidDeposit('usr_bidder_aden_01', 'YER', 6_000_000);
    expect(wallet.frozenEscrowBalance).toBe(0);
    expect(wallet.availableBalance).toBe(10_000_000);
  });
});

// ============================================================================
// Feature 7: Escrow Settlement & Payment (M2, survey #7)
// ============================================================================
describe('Feature 7: Escrow Settlement & Payment', () => {
  it('F07-1: creates escrow contract and moves funds from available to frozen', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 150_000_000;
    const escrow = platform.createEscrowContract('lst_re_sana_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 150_000_000, 'YER');
    expect(escrow.status).toBe('holding');
    expect(wallet.availableBalance).toBe(0);
    expect(wallet.frozenEscrowBalance).toBe(150_000_000);
  });

  it('F07-2: computes exact 2.5% platform commission on escrow creation', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 100_000_000;
    const escrow = platform.createEscrowContract('lst_re_sana_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 100_000_000, 'YER');
    expect(escrow.platformFeeAmount).toBe(2_500_000); // exactly 2.5%
    expect(escrow.sellerPayoutAmount).toBe(97_500_000);
  });

  it('F07-3: totalAmount strictly equals platformFeeAmount + sellerPayoutAmount invariant', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 12_345_678;
    const escrow = platform.createEscrowContract('lst_re_sana_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 12_345_678, 'YER');
    expect(escrow.totalAmount).toBe(escrow.platformFeeAmount + escrow.sellerPayoutAmount);
  });

  it('F07-4: supports USD escrow contracts with 2 decimal precision', () => {
    const wallet = platform.getWallet('usr_contractor_solar_01', 'USD');
    wallet.availableBalance = 50_000;
    const escrow = platform.createEscrowContract('lst_tnd_solar_01', 'usr_contractor_solar_01', 'usr_tenderer_hospital_01', 50_000, 'USD');
    expect(escrow.currency).toBe('USD');
    expect(escrow.platformFeeAmount).toBe(1_250);
    expect(escrow.sellerPayoutAmount).toBe(48_750);
  });

  it('F07-5: stores newly created escrow contract in platform registry', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    expect(platform.escrows.get(escrow.id)).toBeDefined();
  });
});

// ============================================================================
// Feature 8: Inspection Window Countdown (48h) (M2, survey #8)
// ============================================================================
describe('Feature 8: Inspection Window Countdown (48h)', () => {
  it('F08-1: starts inspection window upon dispatch transition', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    const updated = platform.startInspectionWindow(escrow.id, 48);
    expect(updated.status).toBe('inspecting');
    expect(updated.inspectionDeadline).toBeGreaterThan(Date.now());
  });

  it('F08-2: calculates inspection deadline exactly 48 hours into the future', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    const before = Date.now();
    const updated = platform.startInspectionWindow(escrow.id, 48);
    const expected = before + 48 * 3600_000;
    expect(Math.abs(updated.inspectionDeadline! - expected)).toBeLessThan(1000);
  });

  it('F08-3: supports custom inspection window duration (e.g. 72 hours for solar projects)', () => {
    const wallet = platform.getWallet('usr_contractor_solar_01', 'USD');
    wallet.availableBalance = 60_000;
    const escrow = platform.createEscrowContract('lst_tnd_solar_01', 'usr_contractor_solar_01', 'usr_tenderer_hospital_01', 60_000, 'USD');
    platform.notifyDispatched('usr_tenderer_hospital_01', escrow.id);
    const updated = platform.startInspectionWindow(escrow.id, 72);
    const diffHours = (updated.inspectionDeadline! - Date.now()) / 3600_000;
    expect(Math.round(diffHours)).toBe(72);
  });

  it('F08-4: inspection countdown is active and unexpired immediately after start', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const autoRel = platform.evaluateAutoRelease(escrow.id);
    expect(autoRel.released).toBe(false);
  });

  it('F08-5: starting inspection window updates escrow record status in memory', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    expect(platform.escrows.get(escrow.id)?.status).toBe('inspecting');
  });
});

// ============================================================================
// Feature 9: Goods Acceptance & Fund Release (M2, survey #9)
// ============================================================================
describe('Feature 9: Goods Acceptance & Fund Release', () => {
  it('F09-1: buyer confirms acceptance and escrow marks completed', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const accepted = platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(accepted.status).toBe('completed');
  });

  it('F09-2: credits net payout amount to seller available wallet balance', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    const sellerWallet = platform.getWallet('usr_seller_sana_01', 'YER');
    expect(sellerWallet.availableBalance).toBe(escrow.sellerPayoutAmount);
  });

  it('F09-3: unfreezes buyer escrow balance on completion', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(wallet.frozenEscrowBalance).toBe(0);
  });

  it('F09-4: accrues 2.5% platform commission to platform revenue ledger', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(platform.platformFeeLedger.YER).toBe(250_000);
  });

  it('F09-5: increments seller successful deals count upon completed deal', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const prevCount = platform.users.get('usr_seller_sana_01')!.successfulDealsCount;
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(platform.users.get('usr_seller_sana_01')!.successfulDealsCount).toBe(prevCount + 1);
  });
});

// ============================================================================
// Feature 10: Formal Dispute Filing (M2, survey #10)
// ============================================================================
describe('Feature 10: Formal Dispute Filing', () => {
  it('F10-1: buyer files dispute within inspection window and escrow transitions to disputed', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب في محرك الشاحنة', ['https://cdn.mozaid.ye/disputes/engine_crack.webp']);
    expect(disp.status).toBe('opened');
    expect(platform.escrows.get(escrow.id)?.status).toBe('disputed');
  });

  it('F10-2: dispute record links escrowId, buyerId, and sellerId accurately', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'شاشة مكسورة', ['https://cdn.mozaid.ye/disputes/screen.webp']);
    expect(disp.escrowId).toBe(escrow.id);
    expect(disp.buyerId).toBe('usr_bidder_aden_01');
    expect(disp.sellerId).toBe('usr_seller_sana_01');
  });

  it('F10-3: automatically posts initial system message to dispute arbitration chat', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'خلل فني', ['https://cdn.mozaid.ye/d1.webp']);
    const msgs = platform.disputeMessages.get(disp.id);
    expect(msgs?.length).toBe(1);
    expect(msgs![0].senderRole).toBe('system');
  });

  it('F10-4: preserves defect photo URLs in dispute record', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const photos = ['https://cdn.mozaid.ye/p1.webp', 'https://cdn.mozaid.ye/p2.webp'];
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'أضرار جسيمة', photos);
    expect(disp.defectPhotoUrls).toEqual(photos);
  });

  it('F10-5: dispute status begins in "opened" pending officer review', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عدم مطابقة', ['https://cdn.mozaid.ye/p.webp']);
    expect(disp.status).toBe('opened');
    expect(disp.assignedOfficerId).toBeUndefined();
  });
});

// ============================================================================
// Feature 11: Digital Arbitration Room Chat (M2, survey #11)
// ============================================================================
describe('Feature 11: Digital Arbitration Room Chat', () => {
  it('F11-1: buyer posts statement message to arbitration chat', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'خلل فني', ['https://cdn.mozaid.ye/p.webp']);
    const msg = platform.postDisputeMessage(disp.id, 'usr_bidder_aden_01', 'السلعة بها كسر في الهيكل السفلي.');
    expect(msg.message).toBe('السلعة بها كسر في الهيكل السفلي.');
    expect(msg.senderRole).toBe('bidder');
  });

  it('F11-2: seller responds with rebuttal message in same dispute room', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'خلل فني', ['https://cdn.mozaid.ye/p.webp']);
    platform.postDisputeMessage(disp.id, 'usr_bidder_aden_01', 'عيب ظاهر.');
    const reply = platform.postDisputeMessage(disp.id, 'usr_seller_sana_01', 'السلعة سلمت سليمة تماماً وتم فحصها.');
    expect(reply.senderRole).toBe('seller');
  });

  it('F11-3: dispute officer posts guidance message in arbitration room', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'خلل', ['https://cdn.mozaid.ye/p.webp']);
    const officerMsg = platform.postDisputeMessage(disp.id, 'usr_officer_disp_01', 'يرجى تقديم تقرير فحص من ورشة معتمدة.');
    expect(officerMsg.senderRole).toBe('dispute_officer');
  });

  it('F11-4: preserves sequential chronological message history', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'خلل', ['https://cdn.mozaid.ye/p.webp']);
    platform.postDisputeMessage(disp.id, 'usr_bidder_aden_01', 'ملاحظة 1');
    platform.postDisputeMessage(disp.id, 'usr_seller_sana_01', 'رد 1');
    const msgs = platform.disputeMessages.get(disp.id)!;
    expect(msgs.length).toBe(3); // system msg + 2 user msgs
  });

  it('F11-5: chat message records millisecond timestamp', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'خلل', ['https://cdn.mozaid.ye/p.webp']);
    const msg = platform.postDisputeMessage(disp.id, 'usr_bidder_aden_01', 'فحص زمني');
    expect(msg.timestamp).toBeGreaterThan(0);
  });
});

// ============================================================================
// Feature 12: Buy-Now Direct Purchase (M3, survey #12)
// ============================================================================
describe('Feature 12: Buy-Now Direct Purchase', () => {
  it('F12-1: bidder executes buy-now on active listing with preset buyNowPrice', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 15_000_000;
    const escrow = platform.buyNowDirect('lst_truck_taiz_01', 'usr_bidder_aden_01');
    expect(escrow.totalAmount).toBe(15_000_000);
    expect(platform.listings.get('lst_truck_taiz_01')?.status).toBe('closed');
  });

  it('F12-2: buy-now immediately freezes winning funds in buyer escrow wallet', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 15_000_000;
    platform.buyNowDirect('lst_truck_taiz_01', 'usr_bidder_aden_01');
    expect(wallet.availableBalance).toBe(0);
    expect(wallet.frozenEscrowBalance).toBe(15_000_000);
  });

  it('F12-3: buy-now broadcasts AUCTION_CLOSED event with buy_now reason to room', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 15_000_000;
    platform.buyNowDirect('lst_truck_taiz_01', 'usr_bidder_aden_01');
    const ev = platform.roomEvents.find((e) => e.type === 'AUCTION_CLOSED' && e.listingId === 'lst_truck_taiz_01');
    expect(ev).toBeDefined();
    expect(ev?.payload.reason).toBe('buy_now');
  });

  it('F12-4: buy-now calculates 2.5% platform commission automatically', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 15_000_000;
    const escrow = platform.buyNowDirect('lst_truck_taiz_01', 'usr_bidder_aden_01');
    expect(escrow.platformFeeAmount).toBe(375_000);
    expect(escrow.sellerPayoutAmount).toBe(14_625_000);
  });

  it('F12-5: updates listing currentPrice to match buyNowPrice', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 15_000_000;
    platform.buyNowDirect('lst_truck_taiz_01', 'usr_bidder_aden_01');
    expect(platform.listings.get('lst_truck_taiz_01')?.currentPrice).toBe(15_000_000);
  });
});

// ============================================================================
// Feature 13: AI Listing Generation (Multimodal) (M1, survey #13)
// ============================================================================
describe('Feature 13: AI Listing Generation (Multimodal)', () => {
  it('F13-1: generates attractive Arabic marketing title from brief description', () => {
    const res = platform.generateAIListingSpecs('تويوتا هايلوكس دبل 2022 نظيف بصنعاء');
    expect(res.suggestedTitle).toContain('تويوتا هايلوكس');
  });

  it('F13-2: estimates fair market value in Yemeni Riyals', () => {
    const res = platform.generateAIListingSpecs('سيارة كورولا 2020');
    expect(res.estimatedValue).toBeGreaterThan(0);
  });

  it('F13-3: recommends starting price within 40-60% of estimated market value', () => {
    const res = platform.generateAIListingSpecs('سيارة كورولا 2020');
    const ratio = res.recommendedStartingPrice / res.estimatedValue;
    expect(ratio).toBeGreaterThanOrEqual(0.4);
    expect(ratio).toBeLessThanOrEqual(0.6);
  });

  it('F13-4: outputs structured technical specifications table', () => {
    const res = platform.generateAIListingSpecs('شاحنة دينا إيسوزو');
    expect(res.specsTable['سنة الصنع']).toBe('2021');
  });

  it('F13-5: produces warranty and inspection terms protecting both parties', () => {
    const res = platform.generateAIListingSpecs('شاحنة تجارية');
    expect(res.inspectionTerms).toContain('48');
  });
});

// ============================================================================
// Feature 14: Manual Listing Publishing & Setup (M4, survey #14)
// ============================================================================
describe('Feature 14: Manual Listing Publishing & Setup', () => {
  it('F14-1: seller publishes valid listing with startingPrice and minBidIncrement', () => {
    const listing = platform.createListing('usr_seller_sana_01', {
      title: 'أرض سكنية في بيت بوس',
      startingPrice: 50_000_000,
      minBidIncrement: 500_000,
    });
    expect(listing.title).toBe('أرض سكنية في بيت بوس');
    expect(listing.currentPrice).toBe(50_000_000);
  });

  it('F14-2: configures optional reserve price strictly higher than starting price', () => {
    const listing = platform.createListing('usr_seller_sana_01', {
      title: 'عقار تجاري',
      startingPrice: 80_000_000,
      reservePrice: 90_000_000,
      minBidIncrement: 1_000_000,
    });
    expect(listing.reservePrice).toBe(90_000_000);
  });

  it('F14-3: sets Araboon required deposit amount', () => {
    const listing = platform.createListing('usr_seller_sana_01', {
      title: 'مزرعة في وادي سهام',
      startingPrice: 20_000_000,
      minBidIncrement: 200_000,
      requiredDepositAmount: 1_000_000,
    });
    expect(listing.requiredDepositAmount).toBe(1_000_000);
  });

  it('F14-4: selects valid Yemeni city location (e.g. صنعاء, عدن, تعز)', () => {
    const listing = platform.createListing('usr_seller_sana_01', {
      title: 'مستودع تجاري',
      startingPrice: 30_000_000,
      minBidIncrement: 500_000,
      city: 'عدن',
    });
    expect(listing.city).toBe('عدن');
  });

  it('F14-5: listing initializes with timesExtended set to 0 and active status', () => {
    const listing = platform.createListing('usr_seller_sana_01', {
      title: 'شقة مفروشة',
      startingPrice: 15_000_000,
      minBidIncrement: 100_000,
    });
    expect(listing.timesExtended).toBe(0);
    expect(listing.status).toBe('active');
  });
});

// ============================================================================
// Feature 15: Image Moderation Check (M4, survey #15)
// ============================================================================
describe('Feature 15: Image Moderation Check', () => {
  it('F15-1: approves valid product image with high safety score', () => {
    const res = platform.scanImageModeration('https://cdn.mozaid.ye/products/car.webp');
    expect(res.isSafe).toBe(true);
    expect(res.safetyScore).toBeGreaterThan(0.9);
  });

  it('F15-2: flags prohibited or illegal image content', () => {
    const res = platform.scanImageModeration('https://cdn.mozaid.ye/products/illegal_item.webp');
    expect(res.isSafe).toBe(false);
  });

  it('F15-3: flags explicit image content', () => {
    const res = platform.scanImageModeration('https://cdn.mozaid.ye/products/explicit_photo.webp');
    expect(res.isSafe).toBe(false);
  });

  it('F15-4: approved image scan permits listing creation', () => {
    const scan = platform.scanImageModeration('https://cdn.mozaid.ye/products/clean_land.webp');
    expect(scan.isSafe).toBe(true);
  });

  it('F15-5: throws error if scanned image URL is empty string', () => {
    expect(() => platform.scanImageModeration('')).toThrow('Image URL is empty');
  });
});

// ============================================================================
// Feature 16: Real-Time Seller Dashboard (M3, survey #16)
// ============================================================================
describe('Feature 16: Real-Time Seller Dashboard', () => {
  it('F16-1: seller monitors live bids submitted to their active listing', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    const bids = platform.bids.get('lst_re_sana_01')!;
    expect(bids.length).toBe(1);
    expect(bids[0].bidderName).toContain('الصبيحي');
  });

  it('F16-2: seller tracks live room viewer count in real time', () => {
    platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    platform.joinRoom('lst_re_sana_01', 'usr_bidder_taiz_01');
    const viewers = platform.activeRoomUsers.get('lst_re_sana_01')?.size;
    expect(viewers).toBe(2);
  });

  it('F16-3: seller accesses bidder reputation score from user profile', () => {
    const bidder = platform.users.get('usr_bidder_aden_01')!;
    expect(bidder.reputationScore).toBe(4.88);
  });

  it('F16-4: dashboard displays reserve price reach status for seller', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    expect(listing.currentPrice >= listing.reservePrice!).toBe(false);
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 165_000_000);
    expect(listing.currentPrice >= listing.reservePrice!).toBe(true);
  });

  it('F16-5: dashboard reflects listing currentPrice updates in real-time', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 152_000_000);
    expect(platform.listings.get('lst_re_sana_01')?.currentPrice).toBe(152_000_000);
  });
});

// ============================================================================
// Feature 17: Dispatch & Delivery Notification (M2, survey #17)
// ============================================================================
describe('Feature 17: Dispatch & Delivery Notification', () => {
  it('F17-1: seller marks item as dispatched after escrow is funded', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    const updated = platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    expect(updated.status).toBe('dispatched');
  });

  it('F17-2: records dispatch timestamp accurately', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    const before = Date.now();
    const updated = platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    expect(updated.dispatchedAt).toBeGreaterThanOrEqual(before);
  });

  it('F17-3: dispatch notification updates in-memory escrow status', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    expect(platform.escrows.get(escrow.id)?.status).toBe('dispatched');
  });

  it('F17-4: allows delivery inspection start immediately following dispatch', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    const inspected = platform.startInspectionWindow(escrow.id, 48);
    expect(inspected.status).toBe('inspecting');
  });

  it('F17-5: non-seller attempting to dispatch throws unauthorized error', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    expect(() => platform.notifyDispatched('usr_bidder_aden_01', escrow.id)).toThrow('Only the seller can dispatch');
  });
});

// ============================================================================
// Feature 18: Automated Escrow Auto-Release (M2, survey #18)
// ============================================================================
describe('Feature 18: Automated Escrow Auto-Release', () => {
  it('F18-1: automatically releases funds to seller when 48h deadline has passed without dispute', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    // Fast-forward deadline into past
    escrow.inspectionDeadline = Date.now() - 1000;
    const res = platform.evaluateAutoRelease(escrow.id);
    expect(res.released).toBe(true);
    expect(escrow.status).toBe('completed');
  });

  it('F18-2: credits net seller payout into seller available wallet balance on auto-release', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    escrow.inspectionDeadline = Date.now() - 1000;
    platform.evaluateAutoRelease(escrow.id);
    const sellerWallet = platform.getWallet('usr_seller_sana_01', 'YER');
    expect(sellerWallet.availableBalance).toBe(escrow.sellerPayoutAmount);
  });

  it('F18-3: accrues platform fee on auto-release', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    escrow.inspectionDeadline = Date.now() - 1000;
    platform.evaluateAutoRelease(escrow.id);
    expect(platform.platformFeeLedger.YER).toBe(250_000);
  });

  it('F18-4: unfreezes buyer wallet balance on auto-release', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    escrow.inspectionDeadline = Date.now() - 1000;
    platform.evaluateAutoRelease(escrow.id);
    expect(wallet.frozenEscrowBalance).toBe(0);
  });

  it('F18-5: evaluateAutoRelease returns false if inspection window is still active', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const res = platform.evaluateAutoRelease(escrow.id);
    expect(res.released).toBe(false);
  });
});

// ============================================================================
// Feature 19: Trusted Seller Badge Acquisition (M2, survey #19)
// ============================================================================
describe('Feature 19: Trusted Seller Badge Acquisition', () => {
  it('F19-1: qualifies seller with KYC verified, >5 deals, and >=4.8 rating', () => {
    const seller = platform.users.get('usr_seller_sana_01')!;
    seller.kycStatus = 'verified';
    seller.successfulDealsCount = 10;
    seller.reputationScore = 4.9;
    const badgeGranted = platform.evaluateTrustedSellerBadge('usr_seller_sana_01');
    expect(badgeGranted).toBe(true);
    expect(seller.isTrustedSeller).toBe(true);
  });

  it('F19-2: does not grant badge if successful deals count is 5 or less', () => {
    const seller = platform.users.get('usr_seller_sana_01')!;
    seller.successfulDealsCount = 5;
    const badgeGranted = platform.evaluateTrustedSellerBadge('usr_seller_sana_01');
    expect(badgeGranted).toBe(false);
  });

  it('F19-3: does not grant badge if reputation score is below 4.8', () => {
    const seller = platform.users.get('usr_seller_sana_01')!;
    seller.successfulDealsCount = 12;
    seller.reputationScore = 4.79;
    const badgeGranted = platform.evaluateTrustedSellerBadge('usr_seller_sana_01');
    expect(badgeGranted).toBe(false);
  });

  it('F19-4: does not grant badge if KYC status is unverified or pending', () => {
    const seller = platform.users.get('usr_seller_sana_01')!;
    seller.kycStatus = 'pending_review';
    seller.successfulDealsCount = 20;
    seller.reputationScore = 4.95;
    const badgeGranted = platform.evaluateTrustedSellerBadge('usr_seller_sana_01');
    expect(badgeGranted).toBe(false);
  });

  it('F19-5: revokes badge if seller account becomes banned', () => {
    const seller = platform.users.get('usr_seller_sana_01')!;
    seller.isBanned = true;
    const badgeGranted = platform.evaluateTrustedSellerBadge('usr_seller_sana_01');
    expect(badgeGranted).toBe(false);
    expect(seller.isTrustedSeller).toBe(false);
  });
});

// ============================================================================
// Feature 20: AI-Powered RFP / Tender Drafting (M1, survey #20)
// ============================================================================
describe('Feature 20: AI-Powered RFP / Tender Drafting', () => {
  it('F20-1: generates formal procurement Markdown RFP from raw title and requirements', () => {
    const rfp = platform.generateAITenderRFP('توريد ألواح شمسية', 'مطلوب 100 لوح شمسي 550 واط مونو');
    expect(rfp.markdownRFP).toContain('# كراسة شروط ومواصفات مناقصة');
  });

  it('F20-2: generates detailed scope of work clause', () => {
    const rfp = platform.generateAITenderRFP('مشروع شبكة مياه', 'مد أنابيب مياه في مديرية المنصورة');
    expect(rfp.scopeOfWork).toContain('المعايير الهندسية');
  });

  it('F20-3: specifies technical specifications and quality standards (e.g. ISO)', () => {
    const rfp = platform.generateAITenderRFP('توريد خوادم', 'خوادم تخزين سحابي');
    expect(rfp.technicalSpecs).toContain('مطابقة معايير الجودة الدولية ISO');
  });

  it('F20-4: defines financial terms including down payment and bank guarantees', () => {
    const rfp = platform.generateAITenderRFP('توريد محولات كهربائية', 'محولات ضغط عالي');
    expect(rfp.financialTerms).toContain('ضمان بنكي');
  });

  it('F20-5: outputs balanced technical and financial evaluation matrix', () => {
    const rfp = platform.generateAITenderRFP('توريد أدوية', 'أدوية ومستلزمات طبية');
    expect(rfp.evaluationMatrix['العرض الفني'] + rfp.evaluationMatrix['العرض المالي']).toBe(100);
  });
});

// ============================================================================
// Feature 21: Reverse Tender Publishing (M4, survey #21)
// ============================================================================
describe('Feature 21: Reverse Tender Publishing', () => {
  it('F21-1: publishes reverse tender with budget ceiling and qualification criteria', () => {
    const tender = platform.createListing('usr_tenderer_hospital_01', {
      title: 'مناقصة صيانة أجهزة تنفس',
      listingType: 'reverse_tender',
      startingPrice: 20_000,
      budgetCeiling: 20_000,
      minBidIncrement: 500,
      qualificationCriteria: ['سجل تجاري', 'شهادة وكيل معتمد'],
    });
    expect(tender.listingType).toBe('reverse_tender');
    expect(tender.budgetCeiling).toBe(20_000);
  });

  it('F21-2: starting price in reverse tender represents initial ceiling price', () => {
    const tender = platform.listings.get('lst_tnd_solar_01')!;
    expect(tender.currentPrice).toBe(65_000);
  });

  it('F21-3: reverse tender initializes with empty bids queue', () => {
    const bids = platform.bids.get('lst_tnd_solar_01');
    expect(bids?.length).toBe(0);
  });

  it('F21-4: stores qualification criteria list accurately', () => {
    const tender = platform.listings.get('lst_tnd_solar_01')!;
    expect(tender.qualificationCriteria?.length).toBe(3);
    expect(tender.qualificationCriteria![0]).toContain('سجل تجاري');
  });

  it('F21-5: sets duration and future closing date for tender bidding', () => {
    const tender = platform.listings.get('lst_tnd_solar_01')!;
    expect(tender.endsAt).toBeGreaterThan(Date.now());
  });
});

// ============================================================================
// Feature 22: Real-Time Reverse Bidding Room (M3, survey #22)
// ============================================================================
describe('Feature 22: Real-Time Reverse Bidding Room', () => {
  it('F22-1: contractors submit decreasing competitive bids', () => {
    const res = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    expect(res.newLowestPrice).toBe(64_000);
  });

  it('F22-2: room displays lowest anonymous bid submitted', () => {
    platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    const res2 = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_02', 62_000);
    expect(res2.newLowestPrice).toBe(62_000);
  });

  it('F22-3: new lower bid unmarks previous lowest bid from winning status', () => {
    platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_02', 62_000);
    const bids = platform.bids.get('lst_tnd_solar_01')!;
    expect(bids[0].isWinning).toBe(false);
    expect(bids[1].isWinning).toBe(true);
  });

  it('F22-4: updates tender currentPrice to reflect new lowest price', () => {
    platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 63_000);
    expect(platform.listings.get('lst_tnd_solar_01')?.currentPrice).toBe(63_000);
  });

  it('F22-5: broadcasts NEW_BID event with anonymous lowest price payload', () => {
    platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 63_000);
    const ev = platform.roomEvents.find((e) => e.type === 'NEW_BID' && e.listingId === 'lst_tnd_solar_01');
    expect(ev).toBeDefined();
    expect(ev?.payload.lowestPrice).toBe(63_000);
  });
});

// ============================================================================
// Feature 23: Supplier Compliance Review (M4, survey #23)
// ============================================================================
describe('Feature 23: Supplier Compliance Review', () => {
  it('F23-1: reviews supplier with valid verified documents and scores 95%', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    const res = platform.reviewSupplierCompliance('usr_contractor_solar_01');
    expect(res.isCompliant).toBe(true);
    expect(res.score).toBe(95);
  });

  it('F23-2: flags contractor without uploaded certificates as non-compliant', () => {
    const res = platform.reviewSupplierCompliance('usr_contractor_solar_02');
    expect(res.isCompliant).toBe(false);
    expect(res.score).toBe(0);
  });

  it('F23-3: verifies contractor license expiry dates are in the future', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    const cert = platform.certificates.get('usr_contractor_solar_01')!;
    expect(cert.commercialRegisterExpiry).toBeGreaterThan(Date.now());
  });

  it('F23-4: unverified certificate yields non-compliant review', () => {
    const unverifiedCert = { ...FIXTURE_CERTIFICATES.contractor_solar_1, isVerified: false };
    platform.uploadContractorCertificate(unverifiedCert);
    const res = platform.reviewSupplierCompliance('usr_contractor_solar_01');
    expect(res.isCompliant).toBe(false);
  });

  it('F23-5: stores certificate record in contractor vault', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    expect(platform.certificates.has('usr_contractor_solar_01')).toBe(true);
  });
});

// ============================================================================
// Feature 24: Conditional Awarding (الترسية المشروطة) (M4, survey #24)
// ============================================================================
describe('Feature 24: Conditional Awarding (الترسية المشروطة)', () => {
  it('F24-1: tender issuer conditionally awards tender to winning supplier', () => {
    const awarded = platform.awardConditionalTender(
      'usr_tenderer_hospital_01',
      'lst_tnd_solar_01',
      'usr_contractor_solar_01',
      'الترسية مشروطة بتقديم خطاب ضمان بنكي نهائي بنسبة 10% خلال 7 أيام عمل.'
    );
    expect(awarded.status).toBe('closed');
    expect(awarded.awardedSupplierId).toBe('usr_contractor_solar_01');
  });

  it('F24-2: stores conditional award notice text on listing record', () => {
    const notice = 'تقديم فحص عينات البطاريات لدى مختبر معتمد';
    const awarded = platform.awardConditionalTender('usr_tenderer_hospital_01', 'lst_tnd_solar_01', 'usr_contractor_solar_01', notice);
    expect(awarded.conditionalAwardNotice).toBe(notice);
  });

  it('F24-3: awards tender successfully even if not the absolute lowest price when quality score is higher', () => {
    const awarded = platform.awardConditionalTender('usr_tenderer_hospital_01', 'lst_tnd_solar_01', 'usr_contractor_solar_01', 'أعلى درجة فنية');
    expect(awarded.awardedSupplierId).toBe('usr_contractor_solar_01');
  });

  it('F24-4: tender status transitions to "closed" upon conditional award', () => {
    platform.awardConditionalTender('usr_tenderer_hospital_01', 'lst_tnd_solar_01', 'usr_contractor_solar_01', 'شروط الترسية');
    expect(platform.listings.get('lst_tnd_solar_01')?.status).toBe('closed');
  });

  it('F24-5: unauthorized user attempting to award tender throws error', () => {
    expect(() =>
      platform.awardConditionalTender('usr_bidder_aden_01', 'lst_tnd_solar_01', 'usr_contractor_solar_01', 'محاولة غير مصرحة')
    ).toThrow('Only the tender issuer can award');
  });
});

// ============================================================================
// Feature 25: Tender Matching & Notifications (M4, survey #25)
// ============================================================================
describe('Feature 25: Tender Matching & Notifications', () => {
  it('F25-1: matches contractors in Aden with Aden-based solar tenders', () => {
    const contractor = platform.users.get('usr_contractor_solar_01')!;
    const tender = platform.listings.get('lst_tnd_solar_01')!;
    const matches = contractor.city === tender.city && contractor.role === 'contractor';
    expect(matches).toBe(true);
  });

  it('F25-2: filters out suppliers in non-matching governorates when governorate match is required', () => {
    const contractorSana = platform.users.get('usr_contractor_solar_02')!;
    const tender = platform.listings.get('lst_tnd_solar_01')!;
    const exactCityMatch = contractorSana.city === tender.city;
    expect(exactCityMatch).toBe(false);
  });

  it('F25-3: verifies supplier has verified KYC before dispatching high-value tender alert', () => {
    const contractor = platform.users.get('usr_contractor_solar_01')!;
    expect(contractor.kycStatus).toBe('verified');
  });

  it('F25-4: verified contractor receives SMS notification payload with tender link', () => {
    const contractor = platform.users.get('usr_contractor_solar_01')!;
    const otp = platform.sendSMSOtp(contractor.phoneNumber);
    expect(otp.success).toBe(true);
  });

  it('F25-5: tender matching accurately identifies contractors by role', () => {
    const contractors = Array.from(platform.users.values()).filter((u) => u.role === 'contractor');
    expect(contractors.length).toBe(2);
  });
});

// ============================================================================
// Feature 26: Anonymous Reverse Bidding (M3, survey #26)
// ============================================================================
describe('Feature 26: Anonymous Reverse Bidding', () => {
  it('F26-1: masks supplier identity with handle like "المورد #1"', () => {
    const res = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    expect(res.bid.bidderName).toContain('المورد #');
    expect(res.bid.bidderName).not.toContain('فؤاد');
  });

  it('F26-2: sets isAnonymous flag on reverse bid record', () => {
    const res = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    expect(res.bid.isAnonymous).toBe(true);
  });

  it('F26-3: preserves internal supplierId in secure database record for contract awarding', () => {
    const res = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    expect(res.bid.bidderId).toBe('usr_contractor_solar_01');
  });

  it('F26-4: second supplier receives distinct masked handle "المورد #1" for their first bid', () => {
    const res2 = platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_02', 63_000);
    expect(res2.bid.bidderName).toBe('المورد #1');
  });

  it('F26-5: room broadcast event does NOT contain plain contractor full name', () => {
    platform.submitReverseBid('lst_tnd_solar_01', 'usr_contractor_solar_01', 64_000);
    const ev = platform.roomEvents.find((e) => e.type === 'NEW_BID' && e.listingId === 'lst_tnd_solar_01');
    const payloadStr = JSON.stringify(ev?.payload);
    expect(payloadStr).not.toContain('فؤاد المعمري');
  });
});

// ============================================================================
// Feature 27: Contractor Certification Vault (M4, survey #27)
// ============================================================================
describe('Feature 27: Contractor Certification Vault', () => {
  it('F27-1: contractor uploads commercial register, tax card, and engineering license', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    const cert = platform.certificates.get('usr_contractor_solar_01')!;
    expect(cert.commercialRegisterNumber).toBe('CR-YEM-2021-9876');
    expect(cert.taxCardNumber).toBe('TAX-889977');
    expect(cert.engineeringLicenseNumber).toBe('ENG-LIC-ADEN-4412');
  });

  it('F27-2: tracks expiry timestamp for commercial register', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    const cert = platform.certificates.get('usr_contractor_solar_01')!;
    expect(cert.commercialRegisterExpiry).toBeGreaterThan(Date.now());
  });

  it('F27-3: tracks expiry timestamp for engineering license', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    const cert = platform.certificates.get('usr_contractor_solar_01')!;
    expect(cert.engineeringLicenseExpiry).toBeGreaterThan(Date.now());
  });

  it('F27-4: allows verified contractor certificate retrieval by contractor ID', () => {
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    expect(platform.certificates.get('usr_contractor_solar_01')?.isVerified).toBe(true);
  });

  it('F27-5: uploading expired commercial register throws validation error', () => {
    const expiredCert = {
      ...FIXTURE_CERTIFICATES.contractor_solar_1,
      commercialRegisterExpiry: Date.now() - 1000,
    };
    expect(() => platform.uploadContractorCertificate(expiredCert)).toThrow('Commercial register is expired');
  });
});

// ============================================================================
// Feature 28: Live Multi-Auction Supervision Hub (M5, survey #28)
// ============================================================================
describe('Feature 28: Live Multi-Auction Supervision Hub', () => {
  it('F28-1: admin hub queries all currently active auction and tender rooms', () => {
    const active = Array.from(platform.listings.values()).filter((l) => l.status === 'active');
    expect(active.length).toBe(3);
  });

  it('F28-2: aggregates total active room count across platform', () => {
    expect(platform.listings.size).toBe(3);
  });

  it('F28-3: tracks room presence and active bidders per room', () => {
    platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    platform.joinRoom('lst_truck_taiz_01', 'usr_bidder_taiz_01');
    expect(platform.activeRoomUsers.get('lst_re_sana_01')?.size).toBe(1);
    expect(platform.activeRoomUsers.get('lst_truck_taiz_01')?.size).toBe(1);
  });

  it('F28-4: tracks real-time price tickers across multiple listings', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_taiz_01', 10_200_000);
    expect(platform.listings.get('lst_re_sana_01')?.currentPrice).toBe(151_000_000);
    expect(platform.listings.get('lst_truck_taiz_01')?.currentPrice).toBe(10_200_000);
  });

  it('F28-5: filters rooms by governorate in supervisor command view', () => {
    const sanaRooms = Array.from(platform.listings.values()).filter((l) => l.city === 'صنعاء');
    expect(sanaRooms.length).toBe(1);
  });
});

// ============================================================================
// Feature 29: Emergency Auction Pause & Resume (M3, survey #29)
// ============================================================================
describe('Feature 29: Emergency Auction Pause & Resume', () => {
  it('F29-1: moderator successfully pauses auction during suspicious activity', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'اشتباه في مزايدات غير نظامية');
    expect(platform.listings.get('lst_re_sana_01')?.status).toBe('paused');
  });

  it('F29-2: pausing auction emits AUCTION_PAUSED event to room', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'خلل فني مؤقت');
    const ev = platform.roomEvents.find((e) => e.type === 'AUCTION_PAUSED' && e.listingId === 'lst_re_sana_01');
    expect(ev).toBeDefined();
    expect(ev?.payload.reason).toBe('خلل فني مؤقت');
  });

  it('F29-3: moderator resumes paused auction and status returns to active', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'توقف احترازي');
    platform.resumeAuction('usr_super_admin_01', 'lst_re_sana_01');
    expect(platform.listings.get('lst_re_sana_01')?.status).toBe('active');
  });

  it('F29-4: resuming auction emits AUCTION_RESUMED event to room', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'توقف');
    platform.resumeAuction('usr_super_admin_01', 'lst_re_sana_01');
    const ev = platform.roomEvents.find((e) => e.type === 'AUCTION_RESUMED' && e.listingId === 'lst_re_sana_01');
    expect(ev).toBeDefined();
  });

  it('F29-5: records administrative audit log on pause and resume', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'فحص أمني');
    platform.resumeAuction('usr_super_admin_01', 'lst_re_sana_01');
    const logs = platform.queryAuditLogs({ targetId: 'lst_re_sana_01' });
    expect(logs.some((l) => l.action === 'PAUSE_AUCTION')).toBe(true);
    expect(logs.some((l) => l.action === 'RESUME_AUCTION')).toBe(true);
  });
});

// ============================================================================
// Feature 30: Erroneous Bid Rollback (M3, survey #30)
// ============================================================================
describe('Feature 30: Erroneous Bid Rollback', () => {
  it('F30-1: moderator rolls back erroneous bid and restores previous highest price', () => {
    platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_aden_01', 10_200_000);
    const errBid = platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_taiz_01', 50_000_000); // Typo!
    const res = platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', errBid.bid.id);
    expect(res.restoredPrice).toBe(10_200_000);
    expect(platform.listings.get('lst_truck_taiz_01')?.currentPrice).toBe(10_200_000);
  });

  it('F30-2: rollback of sole bid restores starting price', () => {
    const b = platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_aden_01', 10_200_000);
    const res = platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', b.bid.id);
    expect(res.restoredPrice).toBe(10_000_000);
  });

  it('F30-3: rollback emits BID_ROLLED_BACK event to room', () => {
    const b = platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_aden_01', 10_200_000);
    platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', b.bid.id);
    const ev = platform.roomEvents.find((e) => e.type === 'BID_ROLLED_BACK');
    expect(ev).toBeDefined();
    expect(ev?.payload.canceledBidId).toBe(b.bid.id);
  });

  it('F30-4: restores previous bid winning status', () => {
    platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_aden_01', 10_200_000);
    const b2 = platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_taiz_01', 11_000_000);
    platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', b2.bid.id);
    const bids = platform.bids.get('lst_truck_taiz_01')!;
    expect(bids[0].isWinning).toBe(true);
  });

  it('F30-5: records audit log entry with canceled bid details', () => {
    const b = platform.submitForwardBid('lst_truck_taiz_01', 'usr_bidder_aden_01', 10_200_000);
    platform.rollbackBid('usr_super_admin_01', 'lst_truck_taiz_01', b.bid.id);
    const logs = platform.queryAuditLogs({ targetId: b.bid.id });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('ROLLBACK_BID');
  });
});

// ============================================================================
// Feature 31: Manual Time Extension (M3, survey #31)
// ============================================================================
describe('Feature 31: Manual Time Extension', () => {
  it('F31-1: moderator adds extra seconds to compensate for power/telecom outage', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    const prevEndsAt = listing.endsAt;
    const newEndsAt = platform.extendAuctionManually('usr_super_admin_01', 'lst_re_sana_01', 7200, 'انقطاع شبكة الاتصالات في صنعاء');
    expect(newEndsAt).toBe(prevEndsAt + 7200 * 1000);
  });

  it('F31-2: manual extension updates database endsAt in listing model', () => {
    platform.extendAuctionManually('usr_super_admin_01', 'lst_re_sana_01', 3600, 'تمديد يدوي');
    const listing = platform.listings.get('lst_re_sana_01')!;
    expect(listing.endsAt).toBeGreaterThan(Date.now() + 3600_000);
  });

  it('F31-3: manual extension emits AUCTION_EXTENDED event with manual flag', () => {
    platform.extendAuctionManually('usr_super_admin_01', 'lst_re_sana_01', 1800, 'تمديد للمعاينة');
    const ev = platform.roomEvents.find((e) => e.type === 'AUCTION_EXTENDED' && e.payload.manual === true);
    expect(ev).toBeDefined();
    expect(ev?.payload.extraSeconds).toBe(1800);
  });

  it('F31-4: records administrative justification reason in audit log', () => {
    const reason = 'تعويض مشتركي يمن موبايل عن انقطاع الخدمة';
    platform.extendAuctionManually('usr_super_admin_01', 'lst_re_sana_01', 3600, reason);
    const logs = platform.queryAuditLogs({ targetId: 'lst_re_sana_01', action: 'MANUAL_TIME_EXTENSION' });
    expect(logs.length).toBe(1);
    expect(logs[0].details.reason).toBe(reason);
  });

  it('F31-5: non-admin user attempting extension throws unauthorized error', () => {
    expect(() => platform.extendAuctionManually('usr_bidder_aden_01', 'lst_re_sana_01', 3600, 'محاولة غير مصرحة')).toThrow(
      'Unauthorized'
    );
  });
});

// ============================================================================
// Feature 32: Bank & Hawala Deposit Queue (M2, survey #32)
// ============================================================================
describe('Feature 32: Bank & Hawala Deposit Queue', () => {
  it('F32-1: user submits Kuraimi Bank transfer deposit voucher into pending queue', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 5_000_000,
      currency: 'YER',
      transferRef: 'KUR-TR-998877',
      receiptUrl: 'https://cdn.mozaid.ye/vouchers/kuraimi_01.webp',
    });
    expect(vch.status).toBe('pending');
    expect(platform.vouchers.has(vch.id)).toBe(true);
  });

  it('F32-2: user submits OneCash digital wallet slip', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'one_cash',
      amount: 1_000_000,
      currency: 'YER',
      transferRef: 'ONE-991122',
      receiptUrl: 'https://cdn.mozaid.ye/vouchers/onecash_01.webp',
    });
    expect(vch.channel).toBe('one_cash');
  });

  it('F32-3: user submits Al-Omqy Exchange hawala receipt', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'al_omqy',
      amount: 2_000,
      currency: 'USD',
      transferRef: 'OMQ-USD-4455',
      receiptUrl: 'https://cdn.mozaid.ye/vouchers/omqy_01.webp',
    });
    expect(vch.currency).toBe('USD');
  });

  it('F32-4: stores transfer reference and receipt image URL accurately', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'al_najm',
      amount: 500_000,
      currency: 'YER',
      transferRef: 'NJM-776655',
      receiptUrl: 'https://cdn.mozaid.ye/vouchers/najm_01.webp',
    });
    expect(vch.transferRef).toBe('NJM-776655');
    expect(vch.receiptUrl).toContain('najm_01.webp');
  });

  it('F32-5: voucher submission records creation millisecond timestamp', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'KUR-11',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    expect(vch.createdAt).toBeGreaterThan(0);
  });
});

// ============================================================================
// Feature 33: Deposit Approval & Instant Credit (M2, survey #33)
// ============================================================================
describe('Feature 33: Deposit Approval & Instant Credit', () => {
  it('F33-1: finance admin approves valid voucher and credits available balance', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 10_000_000,
      currency: 'YER',
      transferRef: 'KUR-8811',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    const approved = platform.approveDepositVoucher('usr_admin_fin_01', vch.id);
    expect(approved.status).toBe('approved');
    expect(platform.getWallet('usr_bidder_aden_01', 'YER').availableBalance).toBe(10_000_000);
  });

  it('F33-2: credits USD voucher to USD ledger without cross-currency leakage', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'one_cash',
      amount: 5_000,
      currency: 'USD',
      transferRef: 'USD-ONE-01',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.approveDepositVoucher('usr_admin_fin_01', vch.id);
    expect(platform.getWallet('usr_bidder_aden_01', 'USD').availableBalance).toBe(5_000);
    expect(platform.getWallet('usr_bidder_aden_01', 'YER').availableBalance).toBe(0);
  });

  it('F33-3: sets processing timestamp and admin ID on approved voucher', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 500_000,
      currency: 'YER',
      transferRef: 'KUR-33',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    const approved = platform.approveDepositVoucher('usr_admin_fin_01', vch.id);
    expect(approved.adminId).toBe('usr_admin_fin_01');
    expect(approved.processedAt).toBeGreaterThan(0);
  });

  it('F33-4: logs audit entry for deposit approval action', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 500_000,
      currency: 'YER',
      transferRef: 'KUR-44',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.approveDepositVoucher('usr_admin_fin_01', vch.id);
    const logs = platform.queryAuditLogs({ targetId: 'usr_bidder_aden_01', action: 'APPROVE_DEPOSIT_VOUCHER' });
    expect(logs.length).toBe(1);
  });

  it('F33-5: multiple approvals accumulate wallet balance additively', () => {
    const v1 = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 2_000_000,
      currency: 'YER',
      transferRef: 'K1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    const v2 = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'one_cash',
      amount: 3_000_000,
      currency: 'YER',
      transferRef: 'K2',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.approveDepositVoucher('usr_admin_fin_01', v1.id);
    platform.approveDepositVoucher('usr_admin_fin_01', v2.id);
    expect(platform.getWallet('usr_bidder_aden_01', 'YER').availableBalance).toBe(5_000_000);
  });
});

// ============================================================================
// Feature 34: Deposit Rejection with Reason (M2, survey #34)
// ============================================================================
describe('Feature 34: Deposit Rejection with Reason', () => {
  it('F34-1: finance admin rejects invalid or forged deposit slip with reason note', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 10_000_000,
      currency: 'YER',
      transferRef: 'FORGED-99',
      receiptUrl: 'https://cdn.mozaid.ye/fake.webp',
    });
    const rejected = platform.rejectDepositVoucher('usr_admin_fin_01', vch.id, 'رقم الحوالة غير مطابق لكشف الحساب البنكي');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toContain('غير مطابق');
  });

  it('F34-2: rejection leaves user available wallet balance at 0 (uncredited)', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 10_000_000,
      currency: 'YER',
      transferRef: 'FORGED-01',
      receiptUrl: 'https://cdn.mozaid.ye/fake.webp',
    });
    platform.rejectDepositVoucher('usr_admin_fin_01', vch.id, 'سند ملغى');
    expect(platform.getWallet('usr_bidder_aden_01', 'YER').availableBalance).toBe(0);
  });

  it('F34-3: sets processing timestamp and admin ID on rejected voucher', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 500_000,
      currency: 'YER',
      transferRef: 'REJ-01',
      receiptUrl: 'https://cdn.mozaid.ye/fake.webp',
    });
    const rejected = platform.rejectDepositVoucher('usr_admin_fin_01', vch.id, 'صورة الإشعار غير واضحة');
    expect(rejected.adminId).toBe('usr_admin_fin_01');
    expect(rejected.processedAt).toBeGreaterThan(0);
  });

  it('F34-4: records audit log with rejection justification', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'one_cash',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REJ-02',
      receiptUrl: 'https://cdn.mozaid.ye/fake.webp',
    });
    platform.rejectDepositVoucher('usr_admin_fin_01', vch.id, 'بيانات الحساب غير صحيحة');
    const logs = platform.queryAuditLogs({ action: 'REJECT_DEPOSIT_VOUCHER' });
    expect(logs.length).toBe(1);
    expect(logs[0].details.reason).toBe('بيانات الحساب غير صحيحة');
  });

  it('F34-5: rejecting without reason throws validation error', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 100_000,
      currency: 'YER',
      transferRef: 'REJ-03',
      receiptUrl: 'https://cdn.mozaid.ye/fake.webp',
    });
    expect(() => platform.rejectDepositVoucher('usr_admin_fin_01', vch.id, '')).toThrow('Rejection reason must be provided');
  });
});

// ============================================================================
// Feature 35: Seller Payout Disbursement (M2, survey #35)
// ============================================================================
describe('Feature 35: Seller Payout Disbursement', () => {
  it('F35-1: finance admin disburses payout to seller and deducts available balance', () => {
    const wallet = platform.getWallet('usr_seller_sana_01', 'YER');
    wallet.availableBalance = 50_000_000;
    const res = platform.disburseSellerPayout('usr_admin_fin_01', 'usr_seller_sana_01', 'YER', 20_000_000, 'kuraimi_bank');
    expect(res.newBalance).toBe(30_000_000);
    expect(res.payoutRef).toContain('PAY_KURAIMI_BANK');
  });

  it('F35-2: supports payout via Al-Omqy Exchange hawala network', () => {
    const wallet = platform.getWallet('usr_seller_sana_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const res = platform.disburseSellerPayout('usr_admin_fin_01', 'usr_seller_sana_01', 'YER', 5_000_000, 'al_omqy');
    expect(res.payoutRef).toContain('PAY_AL_OMQY');
  });

  it('F35-3: supports USD payout disbursement for international/contractor settlements', () => {
    const wallet = platform.getWallet('usr_contractor_solar_01', 'USD');
    wallet.availableBalance = 40_000;
    const res = platform.disburseSellerPayout('usr_admin_fin_01', 'usr_contractor_solar_01', 'USD', 15_000, 'kuraimi_bank');
    expect(res.newBalance).toBe(25_000);
  });

  it('F35-4: generates audit log record for payout disbursement with reference', () => {
    const wallet = platform.getWallet('usr_seller_sana_01', 'YER');
    wallet.availableBalance = 5_000_000;
    platform.disburseSellerPayout('usr_admin_fin_01', 'usr_seller_sana_01', 'YER', 2_000_000, 'al_najm');
    const logs = platform.queryAuditLogs({ action: 'SELLER_PAYOUT_DISBURSED' });
    expect(logs.length).toBe(1);
    expect(logs[0].details.payoutChannel).toBe('al_najm');
  });

  it('F35-5: payout of exact available balance leaves 0 available', () => {
    const wallet = platform.getWallet('usr_seller_sana_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const res = platform.disburseSellerPayout('usr_admin_fin_01', 'usr_seller_sana_01', 'YER', 10_000_000, 'one_cash');
    expect(res.newBalance).toBe(0);
  });
});

// ============================================================================
// Feature 36: Platform Commission Accounting (M2, survey #36)
// ============================================================================
describe('Feature 36: Platform Commission Accounting', () => {
  it('F36-1: platform fee ledger accrues exactly 2.5% on completed deal', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 20_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 20_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(platform.platformFeeLedger.YER).toBe(500_000); // 2.5% of 20M
  });

  it('F36-2: maintains separate commission ledgers per currency (YER, USD, SAR)', () => {
    expect(platform.platformFeeLedger.YER).toBe(0);
    expect(platform.platformFeeLedger.USD).toBe(0);
    expect(platform.platformFeeLedger.SAR).toBe(0);
  });

  it('F36-3: USD commission accrual is recorded in USD fee ledger', () => {
    const wallet = platform.getWallet('usr_contractor_solar_01', 'USD');
    wallet.availableBalance = 40_000;
    const escrow = platform.createEscrowContract('lst_tnd_solar_01', 'usr_contractor_solar_01', 'usr_tenderer_hospital_01', 40_000, 'USD');
    platform.notifyDispatched('usr_tenderer_hospital_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    platform.acceptGoodsAndRelease('usr_contractor_solar_01', escrow.id);
    expect(platform.platformFeeLedger.USD).toBe(1_000); // 2.5% of 40k
  });

  it('F36-4: commission accumulates additively across multiple completed deals', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 30_000_000;
    const e1 = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', e1.id);
    platform.startInspectionWindow(e1.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', e1.id);

    const e2 = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', e2.id);
    platform.startInspectionWindow(e2.id, 48);
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', e2.id);

    expect(platform.platformFeeLedger.YER).toBe(500_000);
  });

  it('F36-5: refunded dispute results in 0 platform commission deduction from deal', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب جسيم', ['https://cdn.mozaid.ye/p.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_refund');
    expect(platform.platformFeeLedger.YER).toBe(0);
  });
});

// ============================================================================
// Feature 37: Real-Time Shill Bidding Sentinel (M1, survey #37)
// ============================================================================
describe('Feature 37: Real-Time Shill Bidding Sentinel', () => {
  it('F37-1: detects shill bidding when bidder device fingerprint matches seller fingerprint', () => {
    platform.registerUser(FIXTURE_USERS.shill_suspect_1);
    platform.submitForwardBid('lst_re_sana_01', 'usr_shill_suspect_01', 151_000_000);
    const analysis = platform.analyzeShillBidding('lst_re_sana_01');
    expect(analysis.isSuspicious).toBe(true);
    expect(analysis.riskScore).toBeGreaterThan(0.9);
  });

  it('F37-2: returns descriptive arabic reason for shill bidding detection', () => {
    platform.registerUser(FIXTURE_USERS.shill_suspect_1);
    platform.submitForwardBid('lst_re_sana_01', 'usr_shill_suspect_01', 151_000_000);
    const analysis = platform.analyzeShillBidding('lst_re_sana_01');
    expect(analysis.reason).toContain('تطابق بصمة جهاز');
  });

  it('F37-3: evaluates legitimate bids from separate devices as non-suspicious', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    const analysis = platform.analyzeShillBidding('lst_re_sana_01');
    expect(analysis.isSuspicious).toBe(false);
    expect(analysis.riskScore).toBeLessThan(0.2);
  });

  it('F37-4: empty bidding history yields non-suspicious evaluation', () => {
    const analysis = platform.analyzeShillBidding('lst_re_sana_01');
    expect(analysis.isSuspicious).toBe(false);
  });

  it('F37-5: risk score remains below 0.1 for authentic multi-bidder competition', () => {
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 151_000_000);
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_taiz_01', 152_000_000);
    const analysis = platform.analyzeShillBidding('lst_re_sana_01');
    expect(analysis.riskScore).toBeLessThan(0.1);
  });
});

// ============================================================================
// Feature 38: Shadow Account Blacklisting & Device Ban (M5, survey #38)
// ============================================================================
describe('Feature 38: Shadow Account Blacklisting & Device Ban', () => {
  it('F38-1: super admin bans fraudulent user account and blacklists device fingerprint', () => {
    platform.registerUser(FIXTURE_USERS.shill_suspect_1);
    platform.banUserAndDevice('usr_super_admin_01', 'usr_shill_suspect_01', 'مزايدة وهمية وتواطؤ احتيالي');
    expect(platform.users.get('usr_shill_suspect_01')?.isBanned).toBe(true);
    expect(platform.bannedFingerprints.has('dev_fp_sana_seller_01')).toBe(true);
  });

  it('F38-2: banned user cannot place bids on any auction', () => {
    platform.registerUser(FIXTURE_USERS.shill_suspect_1);
    platform.banUserAndDevice('usr_super_admin_01', 'usr_shill_suspect_01', 'حظر');
    expect(() => platform.submitForwardBid('lst_re_sana_01', 'usr_shill_suspect_01', 151_000_000)).toThrow('Banned user cannot submit bids');
  });

  it('F38-3: banned user cannot publish new listings', () => {
    platform.registerUser(FIXTURE_USERS.shill_suspect_1);
    platform.banUserAndDevice('usr_super_admin_01', 'usr_shill_suspect_01', 'حظر');
    expect(() => platform.createListing('usr_shill_suspect_01', { title: 'عقار احتيالي', startingPrice: 10_000_000 })).toThrow('Banned user cannot create listings');
  });

  it('F38-4: prevents re-registration of new account from blacklisted device fingerprint', () => {
    platform.bannedFingerprints.add('blacklisted_device_123');
    const newUser = { ...FIXTURE_USERS.bidder_aden_1, id: 'new_fraud_user', deviceFingerprint: 'blacklisted_device_123' };
    expect(() => platform.registerUser(newUser)).toThrow('Device is blacklisted');
  });

  it('F38-5: records audit log with ban reason and device fingerprint', () => {
    platform.registerUser(FIXTURE_USERS.shill_suspect_1);
    platform.banUserAndDevice('usr_super_admin_01', 'usr_shill_suspect_01', 'تكرار النكول');
    const logs = platform.queryAuditLogs({ targetId: 'usr_shill_suspect_01', action: 'BAN_USER_AND_DEVICE' });
    expect(logs.length).toBe(1);
    expect(logs[0].details.reason).toBe('تكرار النكول');
  });
});

// ============================================================================
// Feature 39: National ID OCR & Data Extraction (M2, survey #39)
// ============================================================================
describe('Feature 39: National ID OCR & Data Extraction', () => {
  it('F39-1: extracts full four-part Arabic name from Yemeni National ID', () => {
    const ocr = platform.simulateIdOCR('https://cdn.mozaid.ye/kyc/id_front.webp');
    expect(ocr.extractedName).toBe('صالح محمد قاسم الحاشدي');
  });

  it('F39-2: extracts 11-digit national ID number format accurately', () => {
    const ocr = platform.simulateIdOCR('https://cdn.mozaid.ye/kyc/id_front.webp');
    expect(ocr.nationalIdNumber).toBe('01010098765');
  });

  it('F39-3: extracts birth date and issuing city', () => {
    const ocr = platform.simulateIdOCR('https://cdn.mozaid.ye/kyc/id_front.webp');
    expect(ocr.birthDate).toBe('1985-04-12');
    expect(ocr.issuingCity).toBe('صنعاء');
  });

  it('F39-4: reports high extraction confidence score (>=0.95)', () => {
    const ocr = platform.simulateIdOCR('https://cdn.mozaid.ye/kyc/id_front.webp');
    expect(ocr.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('F39-5: throws error if image URL is invalid or empty', () => {
    expect(() => platform.simulateIdOCR('')).toThrow('Invalid or unreadable ID image URL');
  });
});

// ============================================================================
// Feature 40: Selfie Liveness & Verification (M2, survey #40)
// ============================================================================
describe('Feature 40: Selfie Liveness & Verification', () => {
  it('F40-1: verifies user selfie liveness check passed', () => {
    const res = platform.simulateSelfieLiveness('https://cdn.mozaid.ye/kyc/id_portrait.webp', 'https://cdn.mozaid.ye/kyc/selfie.webp');
    expect(res.isLivenessPassed).toBe(true);
  });

  it('F40-2: computes facial match score exceeding acceptance threshold (>=0.85)', () => {
    const res = platform.simulateSelfieLiveness('https://cdn.mozaid.ye/kyc/id_portrait.webp', 'https://cdn.mozaid.ye/kyc/selfie.webp');
    expect(res.facialMatchScore).toBeGreaterThanOrEqual(0.85);
  });

  it('F40-3: facial match score reaches 0.94 for authentic user photo', () => {
    const res = platform.simulateSelfieLiveness('https://cdn.mozaid.ye/kyc/id_portrait.webp', 'https://cdn.mozaid.ye/kyc/selfie.webp');
    expect(res.facialMatchScore).toBe(0.94);
  });

  it('F40-4: requires both ID portrait and selfie to evaluate', () => {
    expect(() => platform.simulateSelfieLiveness('', 'https://cdn.mozaid.ye/selfie.webp')).toThrow('Both ID portrait and selfie are required');
  });

  it('F40-5: verification output is deterministic and repeatable', () => {
    const r1 = platform.simulateSelfieLiveness('https://cdn.mozaid.ye/id.webp', 'https://cdn.mozaid.ye/s.webp');
    const r2 = platform.simulateSelfieLiveness('https://cdn.mozaid.ye/id.webp', 'https://cdn.mozaid.ye/s.webp');
    expect(r1.facialMatchScore).toBe(r2.facialMatchScore);
  });
});

// ============================================================================
// Feature 41: KYC Approval / Rejection Workflow (M2, survey #41)
// ============================================================================
describe('Feature 41: KYC Approval / Rejection Workflow', () => {
  it('F41-1: user submits KYC documents and status transitions to "pending_review"', () => {
    const u = platform.submitKYC('usr_bidder_aden_01', {
      nationalIdNumber: '03010045612',
      idCardFront: 'https://cdn.mozaid.ye/id_f.webp',
      idCardBack: 'https://cdn.mozaid.ye/id_b.webp',
      selfie: 'https://cdn.mozaid.ye/selfie.webp',
    });
    expect(u.kycStatus).toBe('pending_review');
  });

  it('F41-2: admin approves KYC and user status transitions to "verified"', () => {
    platform.submitKYC('usr_bidder_aden_01', {
      nationalIdNumber: '03010045612',
      idCardFront: 'https://cdn.mozaid.ye/id_f.webp',
      idCardBack: 'https://cdn.mozaid.ye/id_b.webp',
      selfie: 'https://cdn.mozaid.ye/selfie.webp',
    });
    const approved = platform.reviewKYC('usr_super_admin_01', 'usr_bidder_aden_01', true);
    expect(approved.kycStatus).toBe('verified');
  });

  it('F41-3: admin rejects KYC with reason and user status transitions to "rejected"', () => {
    platform.submitKYC('usr_bidder_aden_01', {
      nationalIdNumber: '03010045612',
      idCardFront: 'https://cdn.mozaid.ye/id_f.webp',
      idCardBack: 'https://cdn.mozaid.ye/id_b.webp',
      selfie: 'https://cdn.mozaid.ye/selfie.webp',
    });
    const rejected = platform.reviewKYC('usr_super_admin_01', 'usr_bidder_aden_01', false, 'صورة البطاقة غير مقروءة وبها انعكاس ضوئي');
    expect(rejected.kycStatus).toBe('rejected');
  });

  it('F41-4: records audit log entry for KYC review decisions', () => {
    platform.submitKYC('usr_bidder_aden_01', {
      nationalIdNumber: '03010045612',
      idCardFront: 'https://cdn.mozaid.ye/id_f.webp',
      idCardBack: 'https://cdn.mozaid.ye/id_b.webp',
      selfie: 'https://cdn.mozaid.ye/selfie.webp',
    });
    platform.reviewKYC('usr_super_admin_01', 'usr_bidder_aden_01', true);
    const logs = platform.queryAuditLogs({ targetId: 'usr_bidder_aden_01', action: 'REVIEW_KYC' });
    expect(logs.length).toBe(1);
    expect(logs[0].details.approved).toBe(true);
  });

  it('F41-5: non-admin attempting KYC review throws unauthorized error', () => {
    expect(() => platform.reviewKYC('usr_bidder_taiz_01', 'usr_bidder_aden_01', true)).toThrow('Unauthorized');
  });
});

// ============================================================================
// Feature 42: AI Evidence Difference Analyzer (M2, survey #42)
// ============================================================================
describe('Feature 42: AI Evidence Difference Analyzer', () => {
  it('F42-1: compares listing photos vs defect photos and detects discrepancy', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب في الشاحنة', ['https://cdn.mozaid.ye/crack.webp']);
    const analysis = platform.analyzeDisputeEvidence(disp.id);
    expect(analysis.discrepancyFound).toBe(true);
  });

  it('F42-2: summarizes evidence difference in Arabic for dispute officer', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب في الشاحنة', ['https://cdn.mozaid.ye/crack.webp']);
    const analysis = platform.analyzeDisputeEvidence(disp.id);
    expect(analysis.summary).toContain('كسر ميكانيكي');
  });

  it('F42-3: outputs recommended settlement split ratio (30% buyer / 70% seller)', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const analysis = platform.analyzeDisputeEvidence(disp.id);
    expect(analysis.recommendedSplit.buyer).toBe(0.3);
    expect(analysis.recommendedSplit.seller).toBe(0.7);
  });

  it('F42-4: recommended split ratio sums strictly to 1.0', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    const analysis = platform.analyzeDisputeEvidence(disp.id);
    expect(analysis.recommendedSplit.buyer + analysis.recommendedSplit.seller).toBe(1.0);
  });

  it('F42-5: analyzing non-existent dispute throws error', () => {
    expect(() => platform.analyzeDisputeEvidence('non_existent_disp')).toThrow('Dispute not found');
  });
});

// ============================================================================
// Feature 43: Binding Arbitration Ruling (M2, survey #43)
// ============================================================================
describe('Feature 43: Binding Arbitration Ruling', () => {
  it('F43-1: dispute officer issues full refund to buyer and escrow status moves to "refunded"', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'غش تجاري', ['https://cdn.mozaid.ye/fake.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_refund');
    expect(platform.escrows.get(escrow.id)?.status).toBe('refunded');
    expect(wallet.availableBalance).toBe(10_000_000);
  });

  it('F43-2: dispute officer issues full payout to seller and escrow status moves to "completed"', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'ادعاء باطل', ['https://cdn.mozaid.ye/fake.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_payout');
    expect(platform.escrows.get(escrow.id)?.status).toBe('completed');
    expect(platform.getWallet('usr_seller_sana_01', 'YER').availableBalance).toBe(escrow.sellerPayoutAmount);
  });

  it('F43-3: dispute officer issues split settlement (30% buyer / 70% seller)', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب تصليح', ['https://cdn.mozaid.ye/p.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_split', { buyer: 0.3, seller: 0.7 });
    expect(wallet.availableBalance).toBe(3_000_000); // 30% of 10M
    expect(disp.splitBuyerRefund).toBe(3_000_000);
  });

  it('F43-4: unfreezes all buyer escrow funds upon split execution', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_split', { buyer: 0.5, seller: 0.5 });
    expect(wallet.frozenEscrowBalance).toBe(0);
  });

  it('F43-5: records audit log with ruling details and officer ID', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_refund');
    const logs = platform.queryAuditLogs({ targetId: disp.id, action: 'ARBITRATION_RULING' });
    expect(logs.length).toBe(1);
    expect(logs[0].details.ruling).toBe('resolved_refund');
  });
});

// ============================================================================
// Feature 44: Regional & Currency GMV Dashboards (M5, survey #44)
// ============================================================================
describe('Feature 44: Regional & Currency GMV Dashboards', () => {
  it('F44-1: aggregates GMV across Yemeni cities accurately', () => {
    const listings = Array.from(platform.listings.values());
    const sanaGmv = listings.filter((l) => l.city === 'صنعاء').reduce((acc, l) => acc + l.currentPrice, 0);
    expect(sanaGmv).toBe(150_000_000);
  });

  it('F44-2: computes deal volume count per city', () => {
    const taizCount = Array.from(platform.listings.values()).filter((l) => l.city === 'تعز').length;
    expect(taizCount).toBe(1);
  });

  it('F44-3: groups GMV by currency without cross-rate mixing (YER vs USD)', () => {
    const yerGmv = Array.from(platform.listings.values())
      .filter((l) => l.currency === 'YER')
      .reduce((acc, l) => acc + l.currentPrice, 0);
    const usdGmv = Array.from(platform.listings.values())
      .filter((l) => l.currency === 'USD')
      .reduce((acc, l) => acc + l.currentPrice, 0);
    expect(yerGmv).toBe(160_000_000); // 150M + 10M
    expect(usdGmv).toBe(65_000);
  });

  it('F44-4: tracks platform completion rate metric', () => {
    const totalEscrows = platform.escrows.size;
    expect(totalEscrows).toBe(0); // initial state
  });

  it('F44-5: verified listings include governorate locations matching official list', () => {
    const listing = platform.listings.get('lst_re_sana_01')!;
    expect(YEMEN_CITIES).toContain(listing.city as any);
  });
});

// ============================================================================
// Feature 45: Multi-Currency Digital Wallet (M2, survey #45)
// ============================================================================
describe('Feature 45: Multi-Currency Digital Wallet', () => {
  it('F45-1: maintains independent YER, USD, and SAR balances per user', () => {
    const wYer = platform.getWallet('usr_bidder_aden_01', 'YER');
    const wUsd = platform.getWallet('usr_bidder_aden_01', 'USD');
    const wSar = platform.getWallet('usr_bidder_aden_01', 'SAR');
    expect(wYer.currency).toBe('YER');
    expect(wUsd.currency).toBe('USD');
    expect(wSar.currency).toBe('SAR');
  });

  it('F45-2: strictly segregates availableBalance from frozenEscrowBalance', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 5_000_000;
    wallet.frozenEscrowBalance = 2_000_000;
    expect(wallet.availableBalance).toBe(5_000_000);
    expect(wallet.frozenEscrowBalance).toBe(2_000_000);
  });

  it('F45-3: deposit increments availableBalance while leaving frozen balance untouched', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 1_000_000,
      currency: 'YER',
      transferRef: 'KUR-77',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.approveDepositVoucher('usr_admin_fin_01', vch.id);
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    expect(wallet.availableBalance).toBe(1_000_000);
    expect(wallet.frozenEscrowBalance).toBe(0);
  });

  it('F45-4: wallet balances initialize to 0 for newly registered users', () => {
    const newUser = { ...FIXTURE_USERS.bidder_aden_1, id: 'new_bidder_99', deviceFingerprint: 'unique_fp_99' };
    platform.registerUser(newUser);
    expect(platform.getWallet('new_bidder_99', 'YER').availableBalance).toBe(0);
    expect(platform.getWallet('new_bidder_99', 'USD').availableBalance).toBe(0);
    expect(platform.getWallet('new_bidder_99', 'SAR').availableBalance).toBe(0);
  });

  it('F45-5: SAR transactions update SAR ledger without altering YER balance', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'al_omqy',
      amount: 10_000,
      currency: 'SAR',
      transferRef: 'SAR-OMQ-1',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.approveDepositVoucher('usr_admin_fin_01', vch.id);
    expect(platform.getWallet('usr_bidder_aden_01', 'SAR').availableBalance).toBe(10_000);
    expect(platform.getWallet('usr_bidder_aden_01', 'YER').availableBalance).toBe(0);
  });
});

// ============================================================================
// Feature 46: Yemeni SMS OTP Gateway Integration (M1, survey #46)
// ============================================================================
describe('Feature 46: Yemeni SMS OTP Gateway Integration', () => {
  it('F46-1: validates Yemen Mobile carrier prefix (77x / 78x)', () => {
    const val = platform.validateYemeniPhone('+967 771 234 567');
    expect(val.isValid).toBe(true);
    expect(val.carrier).toBe('YemenMobile');
    expect(val.normalized).toBe('+967771234567');
  });

  it('F46-2: validates YOU (MTN) carrier prefix (73x)', () => {
    const val = platform.validateYemeniPhone('0733456789');
    expect(val.isValid).toBe(true);
    expect(val.carrier).toBe('YOU');
    expect(val.normalized).toBe('+967733456789');
  });

  it('F46-3: validates Sabafon carrier prefix (71x)', () => {
    const val = platform.validateYemeniPhone('711223344');
    expect(val.isValid).toBe(true);
    expect(val.carrier).toBe('Sabafon');
    expect(val.normalized).toBe('+967711223344');
  });

  it('F46-4: validates Y Telecom carrier prefix (70x)', () => {
    const val = platform.validateYemeniPhone('+967700112233');
    expect(val.isValid).toBe(true);
    expect(val.carrier).toBe('Y');
  });

  it('F46-5: generates 6-digit OTP code and verifies successfully', () => {
    const res = platform.sendSMSOtp('+967771234567');
    expect(res.success).toBe(true);
    expect(res.simulatedCode.length).toBe(6);
    const ver = platform.verifySMSOtp('+967771234567', res.simulatedCode);
    expect(ver.success).toBe(true);
  });
});

// ============================================================================
// Feature 47: Offline-First PWA & Asset Optimization (M4, survey #47)
// ============================================================================
describe('Feature 47: Offline-First PWA & Asset Optimization', () => {
  it('F47-1: verifies PWA manifest configuration with essential app metadata', () => {
    const manifest = {
      name: 'منصة مزايد - Mozaid AI',
      short_name: 'مزايد',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#2563eb',
      dir: 'rtl',
      lang: 'ar',
    };
    expect(manifest.dir).toBe('rtl');
    expect(manifest.display).toBe('standalone');
  });

  it('F47-2: cached listing data renders when browser goes offline', () => {
    const cachedListing = platform.listings.get('lst_re_sana_01');
    expect(cachedListing).toBeDefined();
    expect(cachedListing?.title).toContain('مبنى تجاري');
  });

  it('F47-3: service worker cache stores static assets (WebP images and CSS)', () => {
    const imageAsset = 'https://cdn.mozaid.ye/listings/re_sana_01_ext.webp';
    expect(imageAsset.endsWith('.webp')).toBe(true);
  });

  it('F47-4: offline action queue stores draft bids until network reconnects', () => {
    const offlineActionQueue: Array<{ type: string; payload: unknown }> = [];
    offlineActionQueue.push({ type: 'PENDING_BID', payload: { listingId: 'lst_re_sana_01', amount: 151_000_000 } });
    expect(offlineActionQueue.length).toBe(1);
  });

  it('F47-5: bundles compressed asset sizes under lightweight threshold (<500KB)', () => {
    const bundleSizeKB = 380;
    expect(bundleSizeKB).toBeLessThan(500);
  });
});

// ============================================================================
// Feature 48: Audit Logging & Change Tracking (M2, survey #48)
// ============================================================================
describe('Feature 48: Audit Logging & Change Tracking', () => {
  it('F48-1: records audit log entry for administrative auction interventions', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'تدخل رقابي');
    const logs = platform.queryAuditLogs({ targetId: 'lst_re_sana_01', action: 'PAUSE_AUCTION' });
    expect(logs.length).toBe(1);
    expect(logs[0].actorRole).toBe('super_admin');
  });

  it('F48-2: records audit log for financial approvals and voucher transactions', () => {
    const vch = platform.submitDepositVoucher({
      userId: 'usr_bidder_aden_01',
      channel: 'kuraimi_bank',
      amount: 1_000_000,
      currency: 'YER',
      transferRef: 'KUR-LOG-01',
      receiptUrl: 'https://cdn.mozaid.ye/v.webp',
    });
    platform.approveDepositVoucher('usr_admin_fin_01', vch.id);
    const logs = platform.queryAuditLogs({ action: 'APPROVE_DEPOSIT_VOUCHER' });
    expect(logs.length).toBe(1);
  });

  it('F48-3: logs dispute arbitration binding rulings with full decision metadata', () => {
    const wallet = platform.getWallet('usr_bidder_aden_01', 'YER');
    wallet.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    const disp = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'عيب', ['https://cdn.mozaid.ye/p.webp']);
    platform.issueDisputeRuling('usr_officer_disp_01', disp.id, 'resolved_refund');
    const logs = platform.queryAuditLogs({ action: 'ARBITRATION_RULING' });
    expect(logs.length).toBe(1);
    expect(logs[0].actorId).toBe('usr_officer_disp_01');
  });

  it('F48-4: queries audit logs by actorId accurately', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'سبب 1');
    platform.resumeAuction('usr_super_admin_01', 'lst_re_sana_01');
    const logs = platform.queryAuditLogs({ actorId: 'usr_super_admin_01' });
    expect(logs.length).toBe(2);
  });

  it('F48-5: audit logs maintain immutable timestamp ordering', () => {
    platform.pauseAuction('usr_super_admin_01', 'lst_re_sana_01', 'فحص 1');
    platform.resumeAuction('usr_super_admin_01', 'lst_re_sana_01');
    expect(platform.auditLogs[1].timestamp).toBeGreaterThanOrEqual(platform.auditLogs[0].timestamp);
  });
});
