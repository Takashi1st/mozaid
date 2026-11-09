/**
 * Mozaid AI — End-to-End Test Suite: Tier 4 Real-World Application Scenarios
 * Implements the 5 complete end-to-end workflows from TEST_INFRA.md § 5:
 * 1. Sana'a Prime Real Estate Auction with Araboon, Anti-Sniping & Escrow
 * 2. Aden Hospital Solar Energy Reverse Procurement Tender & Conditional Award
 * 3. Taiz Cargo Truck Auction with Defect Dispute, AI Analysis & Split Settlement
 * 4. Hodeidah Agricultural Machinery Auction under Telecom Outage & Intervention
 * 5. Multi-Currency Digital Wallet, SMS OTP, Hawala Vouchers & Regional BI
 */

import { describe, it, expect, beforeEach } from './harness/test-framework.ts';
import { MozaidMockPlatform } from './harness/mock-platform.ts';
import { FIXTURE_USERS, FIXTURE_LISTINGS, FIXTURE_CERTIFICATES } from './harness/fixtures.ts';

let platform: MozaidMockPlatform;

beforeEach(() => {
  platform = new MozaidMockPlatform();
  // Register all system actors
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

  // Default listings
  platform.createListing('usr_seller_sana_01', FIXTURE_LISTINGS.real_estate_sana);
  platform.createListing('usr_seller_sana_01', FIXTURE_LISTINGS.truck_taiz);
  platform.createListing('usr_tenderer_hospital_01', FIXTURE_LISTINGS.solar_tender_aden);
});

// ============================================================================
// Scenario 1: Prime Commercial Real Estate Forward Auction (Sana'a - Hadda)
// ============================================================================
describe('Scenario 1: Prime Commercial Real Estate Forward Auction in Sana\'a', () => {
  it('runs complete real estate workflow from AI appraisal to fund release and trusted badge', () => {
    // 1. Seller uses AI to evaluate commercial property specs
    const appraisal = platform.generateAIListingSpecs('مبنى تجاري واستثماري 4 أدوار حدة صنعاء');
    expect(appraisal.category).toBe('عقارات');
    expect(appraisal.estimatedValue).toBeGreaterThan(0);

    // 2. Three bidders prepare wallets with 5,000,000 YER Araboon entry deposit
    const wAden = platform.getWallet('usr_bidder_aden_01', 'YER');
    wAden.availableBalance = 180_000_000;
    const wTaiz = platform.getWallet('usr_bidder_taiz_01', 'YER');
    wTaiz.availableBalance = 170_000_000;
    const wHod = platform.getWallet('usr_bidder_hodeidah_01', 'YER');
    wHod.availableBalance = 160_000_000;

    platform.lockBidDeposit('usr_bidder_aden_01', 'YER', 5_000_000);
    platform.lockBidDeposit('usr_bidder_taiz_01', 'YER', 5_000_000);
    platform.lockBidDeposit('usr_bidder_hodeidah_01', 'YER', 5_000_000);

    expect(wAden.frozenEscrowBalance).toBe(5_000_000);
    expect(wTaiz.frozenEscrowBalance).toBe(5_000_000);
    expect(wHod.frozenEscrowBalance).toBe(5_000_000);

    // 3. All bidders join live auction room
    platform.joinRoom('lst_re_sana_01', 'usr_bidder_aden_01');
    platform.joinRoom('lst_re_sana_01', 'usr_bidder_taiz_01');
    const room = platform.joinRoom('lst_re_sana_01', 'usr_bidder_hodeidah_01');
    expect(room.viewerCount).toBe(3);

    // 4. Bids escalate rapidly: 152M -> 155M -> 158M
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 152_000_000);
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_taiz_01', 155_000_000);
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_hodeidah_01', 158_000_000);

    // 5. Anti-sniping trigger at T-45s
    const listing = platform.listings.get('lst_re_sana_01')!;
    listing.endsAt = Date.now() + 45_000;

    const bidExt = platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 160_000_000);
    expect(bidExt.isExtended).toBe(true);
    expect(listing.timesExtended).toBe(1);

    // 6. Winning bid: Bidder Aden places final 165M YER bid (exceeds reserve price of 160M)
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_taiz_01', 162_000_000);
    platform.submitForwardBid('lst_re_sana_01', 'usr_bidder_aden_01', 165_000_000);
    expect(listing.currentPrice).toBe(165_000_000);
    expect(listing.currentPrice >= listing.reservePrice!).toBe(true);

    // 7. Losing bidders deposits unlocked immediately
    platform.refundBidDeposit('usr_bidder_taiz_01', 'YER', 5_000_000);
    platform.refundBidDeposit('usr_bidder_hodeidah_01', 'YER', 5_000_000);
    expect(wTaiz.frozenEscrowBalance).toBe(0);
    expect(wHod.frozenEscrowBalance).toBe(0);

    // 8. Winner funds winning bid into escrow contract
    const escrow = platform.createEscrowContract('lst_re_sana_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 165_000_000, 'YER');
    expect(escrow.status).toBe('holding');

    // 9. Seller marks property deeds dispatched and buyer inspects
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);
    expect(escrow.status).toBe('inspecting');

    // 10. Buyer confirms acceptance
    platform.acceptGoodsAndRelease('usr_bidder_aden_01', escrow.id);
    expect(escrow.status).toBe('completed');

    // Invariant: 2.5% platform fee = 4,125,000 YER, Net seller payout = 160,875,000 YER
    expect(platform.platformFeeLedger.YER).toBe(4_125_000);
    const sellerWallet = platform.getWallet('usr_seller_sana_01', 'YER');
    expect(sellerWallet.availableBalance).toBe(160_875_000);

    // 11. Seller qualifies for Trusted Seller Badge
    const seller = platform.users.get('usr_seller_sana_01')!;
    seller.successfulDealsCount = 15;
    seller.reputationScore = 4.95;
    const badge = platform.evaluateTrustedSellerBadge('usr_seller_sana_01');
    expect(badge).toBe(true);
    expect(seller.isTrustedSeller).toBe(true);
  });
});

// ============================================================================
// Scenario 2: Hospital Solar Energy System Reverse Procurement (Aden)
// ============================================================================
describe('Scenario 2: Hospital Solar Energy System Reverse Procurement in Aden', () => {
  it('runs complete reverse tender workflow from AI RFP to conditional awarding and escrow guarantee', () => {
    // 1. Hospital Director uses AI RFP generator
    const rfp = platform.generateAITenderRFP(
      'مناقصة توريد وتركيب منظومة طاقة شمسية 100 كيلوواط',
      'مستشفى الأمل - عدن: منظومة شمسية هجينة مع بطاريات ليثيوم 200 كيلوواط ساعة'
    );
    expect(rfp.markdownRFP).toContain('# كراسة شروط ومواصفات مناقصة');

    // 2. Publish reverse tender with 65,000 USD ceiling
    const tender = platform.createListing('usr_tenderer_hospital_01', {
      title: 'توريد وتركيب منظومة طاقة شمسية - مستشفى الأمل',
      listingType: 'reverse_tender',
      currency: 'USD',
      startingPrice: 65_000,
      budgetCeiling: 65_000,
      minBidIncrement: 1_000,
      city: 'عدن',
      qualificationCriteria: ['سجل تجاري ساري', 'بطاقة ضريبية معتمدة', 'شهادة مزاولة مهنة هندسية'],
    });

    // 3. Contractors submit anonymous lower bids
    const b1 = platform.submitReverseBid(tender.id, 'usr_contractor_solar_01', 63_000);
    const b2 = platform.submitReverseBid(tender.id, 'usr_contractor_solar_02', 61_000);
    const b3 = platform.submitReverseBid(tender.id, 'usr_contractor_solar_01', 59_000);

    expect(b3.newLowestPrice).toBe(59_000);
    expect(tender.currentPrice).toBe(59_000);
    expect(b3.bid.isAnonymous).toBe(true);

    // 4. Contractor certification vault review
    platform.uploadContractorCertificate(FIXTURE_CERTIFICATES.contractor_solar_1);
    const compliance = platform.reviewSupplierCompliance('usr_contractor_solar_01');
    expect(compliance.isCompliant).toBe(true);
    expect(compliance.score).toBe(95);

    // 5. Conditional Awarding (الترسية المشروطة)
    const awarded = platform.awardConditionalTender(
      'usr_tenderer_hospital_01',
      tender.id,
      'usr_contractor_solar_01',
      'الترسية مشروطة بتقديم جدول زمني مفصل وشهادات الضمان المصنعية للألواح والبطاريات.'
    );
    expect(awarded.status).toBe('closed');
    expect(awarded.awardedSupplierId).toBe('usr_contractor_solar_01');

    // 6. Tenderer funds escrow in USD
    const wHospital = platform.getWallet('usr_tenderer_hospital_01', 'USD');
    wHospital.availableBalance = 60_000;
    const escrow = platform.createEscrowContract(tender.id, 'usr_tenderer_hospital_01', 'usr_contractor_solar_01', 59_000, 'USD');
    expect(escrow.currency).toBe('USD');
    expect(escrow.platformFeeAmount).toBe(1_475); // 2.5% of 59,000 USD
    expect(escrow.sellerPayoutAmount).toBe(57_525);
  });
});

// ============================================================================
// Scenario 3: Commercial Cargo Truck Auction & Disputed Transmission (Taiz)
// ============================================================================
describe('Scenario 3: Cargo Truck Auction with Disputed Transmission in Taiz', () => {
  it('runs complete dispute lifecycle with AI difference analysis and binding split ruling', () => {
    // 1. Bidder funds wallet with 10M YER and wins truck auction
    const wBuyer = platform.getWallet('usr_bidder_aden_01', 'YER');
    wBuyer.availableBalance = 10_000_000;
    const escrow = platform.createEscrowContract('lst_truck_taiz_01', 'usr_bidder_aden_01', 'usr_seller_sana_01', 10_000_000, 'YER');

    // 2. Seller marks truck as dispatched; 48-hour inspection begins
    platform.notifyDispatched('usr_seller_sana_01', escrow.id);
    platform.startInspectionWindow(escrow.id, 48);

    // 3. Buyer mechanical inspection discovers hidden crack in transmission housing
    const dispute = platform.fileDispute('usr_bidder_aden_01', escrow.id, 'شرخ ميكانيكي جوهري في جيربوكس الشاحنة غير مذكور بالإعلان', [
      'https://cdn.mozaid.ye/disputes/gearbox_crack_photo1.webp',
      'https://cdn.mozaid.ye/disputes/workshop_report.webp',
    ]);
    expect(escrow.status).toBe('disputed');

    // 4. Tripartite arbitration chat exchange
    platform.postDisputeMessage(dispute.id, 'usr_bidder_aden_01', 'تقرير ورشة النور الهندسية بتعز يؤكد ضرورة تغيير علبة التروس.');
    platform.postDisputeMessage(dispute.id, 'usr_seller_sana_01', 'الشرخ لم يكن ظاهراً أثناء الفحص المبدئي ونقبل بالحل الودي.');
    platform.postDisputeMessage(dispute.id, 'usr_officer_disp_01', 'سيتم فحص الأدلة وتطبيق التسوية المتوازنة.');

    // 5. AI Evidence Difference Analyzer verifies discrepancy
    const aiAnalysis = platform.analyzeDisputeEvidence(dispute.id);
    expect(aiAnalysis.discrepancyFound).toBe(true);
    expect(aiAnalysis.recommendedSplit.buyer).toBe(0.3);

    // 6. Dispute Officer issues binding ruling: 30% buyer refund / 70% seller payout
    const ruled = platform.issueDisputeRuling('usr_officer_disp_01', dispute.id, 'resolved_split', { buyer: 0.3, seller: 0.7 });
    expect(ruled.status).toBe('resolved_split');

    // 7. Verify settlement balances
    // Buyer receives 3,000,000 YER refund
    expect(wBuyer.availableBalance).toBe(3_000_000);
    expect(wBuyer.frozenEscrowBalance).toBe(0);

    // Seller gross share: 7,000,000 YER minus 2.5% fee on seller share (175,000 YER) = 6,825,000 YER
    const wSeller = platform.getWallet('usr_seller_sana_01', 'YER');
    expect(wSeller.availableBalance).toBe(6_825_000);
    expect(platform.platformFeeLedger.YER).toBe(175_000);
  });
});

// ============================================================================
// Scenario 4: Agricultural Water Well Machinery Auction Under Grid Outage (Hodeidah)
// ============================================================================
describe('Scenario 4: Agricultural Machinery Auction under Telecom Outage in Hodeidah', () => {
  it('runs complete supervisor intervention: typo bid -> outage -> emergency pause -> rollback -> extension -> resume', () => {
    // 1. Create industrial pump listing in Hodeidah
    const pumpListing = platform.createListing('usr_seller_sana_01', {
      title: 'مضخة مياه زراعية عملاقة 75 حصان - الحديدة',
      category: 'بضائع ومعدات عامة',
      city: 'الحديدة',
      startingPrice: 5_000_000,
      minBidIncrement: 200_000,
    });

    // 2. Legitimate bid placed at 5,200_000 YER
    platform.submitForwardBid(pumpListing.id, 'usr_bidder_hodeidah_01', 5_200_000);

    // 3. Mobile lag causes bidder to type extra zero: 52,000,000 YER instead of 5,400,000 YER
    const errBid = platform.submitForwardBid(pumpListing.id, 'usr_bidder_aden_01', 52_000_000);
    expect(pumpListing.currentPrice).toBe(52_000_000);

    // 4. Grid outage hits local area; Supervisor activates Emergency Auction Pause
    platform.pauseAuction('usr_super_admin_01', pumpListing.id, 'انقطاع شبكة الاتصالات وورود مزايدة خاطئة غير معقولة');
    expect(pumpListing.status).toBe('paused');

    // 5. Supervisor executes Erroneous Bid Rollback
    const rollback = platform.rollbackBid('usr_super_admin_01', pumpListing.id, errBid.bid.id);
    expect(rollback.restoredPrice).toBe(5_200_000);
    expect(pumpListing.currentPrice).toBe(5_200_000);

    // 6. Supervisor grants Manual Time Extension (+7200 seconds / 2 hours) for outage compensation
    const prevEndsAt = pumpListing.endsAt;
    const newEndsAt = platform.extendAuctionManually('usr_super_admin_01', pumpListing.id, 7200, 'تعويض المشتركين عن انقطاع التغطية بالحديدة');
    expect(newEndsAt).toBe(prevEndsAt + 7200 * 1000);

    // 7. Supervisor resumes auction
    platform.resumeAuction('usr_super_admin_01', pumpListing.id);
    expect(pumpListing.status).toBe('active');

    // 8. Honest competition resumes and closes smoothly
    platform.submitForwardBid(pumpListing.id, 'usr_bidder_aden_01', 5_400_000);
    expect(pumpListing.currentPrice).toBe(5_400_000);

    // 9. Verify full administrative audit trail
    const logs = platform.queryAuditLogs({ targetId: pumpListing.id });
    expect(logs.some((l) => l.action === 'PAUSE_AUCTION')).toBe(true);
    expect(logs.some((l) => l.action === 'MANUAL_TIME_EXTENSION')).toBe(true);
    expect(logs.some((l) => l.action === 'RESUME_AUCTION')).toBe(true);
  });
});

// ============================================================================
// Scenario 5: Multi-Currency Digital Wallet, SMS OTP & Hawala Cycle
// ============================================================================
describe('Scenario 5: Multi-Currency Digital Wallet, SMS OTP & Regional Hawala Accounting', () => {
  it('runs complete financial onboarding, multi-channel voucher approval, and regional GMV aggregation', () => {
    // 1. User registration with Yemen Mobile carrier
    const phoneVal = platform.validateYemeniPhone('0777000111');
    expect(phoneVal.isValid).toBe(true);
    expect(phoneVal.carrier).toBe('YemenMobile');

    const otp = platform.sendSMSOtp(phoneVal.normalized);
    const ver = platform.verifySMSOtp(phoneVal.normalized, otp.simulatedCode);
    expect(ver.success).toBe(true);

    const newUser = {
      id: 'usr_new_investor_01',
      phoneNumber: phoneVal.normalized,
      fullName: 'م. نبيل الأصبحي',
      role: 'bidder' as const,
      city: 'تعز',
      kycStatus: 'pending_review' as const,
      reputationScore: 5.0,
      successfulDealsCount: 0,
      isTrustedSeller: false,
      isBanned: false,
      deviceFingerprint: 'dev_fp_investor_01',
    };
    platform.registerUser(newUser);

    // 2. KYC Approval
    platform.reviewKYC('usr_super_admin_01', 'usr_new_investor_01', true);
    expect(platform.users.get('usr_new_investor_01')?.kycStatus).toBe('verified');

    // 3. Deposits across 3 Yemeni channels:
    // a. Kuraimi Bank: 10,000,000 YER
    const vKur = platform.submitDepositVoucher({
      userId: 'usr_new_investor_01',
      channel: 'kuraimi_bank',
      amount: 10_000_000,
      currency: 'YER',
      transferRef: 'KUR-INV-9900',
      receiptUrl: 'https://cdn.mozaid.ye/vouchers/kuraimi_slip.webp',
    });
    // b. OneCash: 5,000 USD
    const vOne = platform.submitDepositVoucher({
      userId: 'usr_new_investor_01',
      channel: 'one_cash',
      amount: 5_000,
      currency: 'USD',
      transferRef: 'ONE-INV-4422',
      receiptUrl: 'https://cdn.mozaid.ye/vouchers/onecash_slip.webp',
    });
    // c. Al-Omqy: 20,000 SAR
    const vOmq = platform.submitDepositVoucher({
      userId: 'usr_new_investor_01',
      channel: 'al_omqy',
      amount: 20_000,
      currency: 'SAR',
      transferRef: 'OMQ-INV-1133',
      receiptUrl: 'https://cdn.mozaid.ye/vouchers/omqy_slip.webp',
    });

    // 4. Financial Admin approves all 3 vouchers
    platform.approveDepositVoucher('usr_admin_fin_01', vKur.id);
    platform.approveDepositVoucher('usr_admin_fin_01', vOne.id);
    platform.approveDepositVoucher('usr_admin_fin_01', vOmq.id);

    // 5. Verify isolated wallet ledgers
    expect(platform.getWallet('usr_new_investor_01', 'YER').availableBalance).toBe(10_000_000);
    expect(platform.getWallet('usr_new_investor_01', 'USD').availableBalance).toBe(5_000);
    expect(platform.getWallet('usr_new_investor_01', 'SAR').availableBalance).toBe(20_000);

    // 6. Regional GMV Dashboard checks across governorates
    const listings = Array.from(platform.listings.values());
    const sanaGmv = listings.filter((l) => l.city === 'صنعاء').reduce((acc, l) => acc + l.currentPrice, 0);
    const taizGmv = listings.filter((l) => l.city === 'تعز').reduce((acc, l) => acc + l.currentPrice, 0);
    const adenGmv = listings.filter((l) => l.city === 'عدن').reduce((acc, l) => acc + l.currentPrice, 0);

    expect(sanaGmv).toBe(150_000_000);
    expect(taizGmv).toBe(10_000_000);
    expect(adenGmv).toBe(65_000); // USD
  });
});
