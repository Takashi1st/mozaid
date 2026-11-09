import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateAuctionSpecs,
  generateTenderRFP,
  analyzeShillBiddingRisk,
} from '../../src/lib/gemini';
import {
  validateYemenPhoneNumber,
  sendOtp,
  verifyOtp,
  resetSmsSimulationStore,
} from '../../src/services/sms-service';

describe('Challenger Stress Suite: M1 Simulation Services & Resiliency', () => {
  describe('Gemini AI Simulation (src/lib/gemini.ts) Zero-Crash & Arabic Specs', () => {
    const originalApiKey = process.env.GEMINI_API_KEY;

    afterEach(() => {
      if (originalApiKey !== undefined) {
        process.env.GEMINI_API_KEY = originalApiKey;
      } else {
        delete process.env.GEMINI_API_KEY;
      }
    });

    const unsetKeyScenarios = [
      { desc: 'undefined key', setup: () => { delete process.env.GEMINI_API_KEY; } },
      { desc: 'empty string key', setup: () => { process.env.GEMINI_API_KEY = ''; } },
      { desc: 'whitespace key', setup: () => { process.env.GEMINI_API_KEY = '   '; } },
      { desc: 'mock key', setup: () => { process.env.GEMINI_API_KEY = 'mock'; } },
      { desc: 'placeholder key', setup: () => { process.env.GEMINI_API_KEY = 'placeholder'; } },
      { desc: 'short invalid key (<10 chars)', setup: () => { process.env.GEMINI_API_KEY = 'short'; } },
    ];

    unsetKeyScenarios.forEach(({ desc, setup }) => {
      it(`never crashes and returns valid Arabic specs when GEMINI_API_KEY is ${desc}`, async () => {
        setup();

        const result = await generateAuctionSpecs({
          briefDescription: 'منظومة طاقة شمسية مع انفرتر وبطارية ليثيوم',
        });

        expect(result).toBeDefined();
        expect(result.isSimulated).toBe(true);
        expect(result.category).toBe('طاقة وأجهزة');
        expect(result.title).toContain('طاقة شمسية');
        expect(result.estimatedMarketValue).toBeGreaterThan(0);
        expect(result.recommendedStartingPrice).toBeGreaterThan(0);
        expect(result.recommendedMinBidIncrement).toBeGreaterThan(0);
        expect(result.condition).toBeTruthy();
        expect(result.warrantyAndInspectionTerms).toMatch(/معاينة|ضمان|مزايد/);
        expect(Object.keys(result.specificationsTable).length).toBeGreaterThan(0);
      });
    });

    it('handles all 5 market verticals deterministically and accurately', async () => {
      delete process.env.GEMINI_API_KEY;

      // 1. Solar / Energy
      const solar = await generateAuctionSpecs('لوح شمسي 550 وات مع ماطور ومولد');
      expect(solar.category).toBe('طاقة وأجهزة');

      // 2. Vehicles
      const car = await generateAuctionSpecs('سيارة لاندكروزر برادو 2020 صالون');
      expect(car.category).toBe('سيارات ومحركات');

      // 3. Real Estate
      const realEstate = await generateAuctionSpecs('عمارة سكنية استثمارية في صنعاء 4 لبن');
      expect(realEstate.category).toBe('عقارات');

      // 4. Electronics
      const electronics = await generateAuctionSpecs('هاتف ايفون 15 برو ماكس مع شاشة');
      expect(electronics.category).toBe('إلكترونيات');

      // 5. General fallback
      const general = await generateAuctionSpecs('معدات ورشة نجارة متنوعة ومستلزمات');
      expect(general.category).toBe('بضائع عامة');
    });

    it('survives extreme, malformed, and boundary inputs without crashing', async () => {
      delete process.env.GEMINI_API_KEY;

      // Empty string
      const emptyRes = await generateAuctionSpecs('');
      expect(emptyRes).toBeDefined();
      expect(emptyRes.title).toBeTruthy();

      // Whitespace
      const wsRes = await generateAuctionSpecs('     ');
      expect(wsRes).toBeDefined();

      // Extremely long input (5,000 chars)
      const longText = 'سيارة '.repeat(1000);
      const longRes = await generateAuctionSpecs(longText);
      expect(longRes).toBeDefined();
      expect(longRes.category).toBe('سيارات ومحركات');

      // Object with empty params
      const objRes = await generateAuctionSpecs({ briefDescription: '' });
      expect(objRes).toBeDefined();
    });

    it('generates valid Markdown RFP under simulation mode with dual signatures', async () => {
      delete process.env.GEMINI_API_KEY;

      // Positional call returning string
      const rfpStr = await generateTenderRFP('مناقصة إنشاء شبكة مياه', 'توريد أنابيب ومضخات غاطسة');
      expect(typeof rfpStr).toBe('string');
      expect(rfpStr).toContain('كراسة الشروط والمواصفات');
      expect(rfpStr).toContain('نطاق العمل');
      expect(rfpStr).toContain('الكريمي');

      // Object call returning TenderRFPResult
      const rfpObj = await generateTenderRFP({
        title: 'مناقصة توريد حواسيب',
        rawRequirements: '50 جهاز كمبيوتر محمول',
        currency: 'USD',
      });
      expect(typeof rfpObj).toBe('object');
      expect(rfpObj.isSimulated).toBe(true);
      expect(rfpObj.currency).toBe('USD');
      expect(rfpObj.submissionDeadlineDays).toBe(14);
      expect(rfpObj.technicalSpecifications?.length).toBeGreaterThan(0);
    });

    it('evaluates shill bidding heuristics accurately with boundary conditions', async () => {
      delete process.env.GEMINI_API_KEY;

      // Empty bids
      const emptyBids = await analyzeShillBiddingRisk([]);
      expect(emptyBids.isSuspicious).toBe(false);
      expect(emptyBids.riskLevel).toBe('LOW');

      // Seller IP collision
      const sellerIp = '192.168.10.50';
      const shillBids = await analyzeShillBiddingRisk({
        listingId: 'lst-100',
        sellerId: 'seller-abc',
        sellerIp,
        bids: [
          { bidderId: 'buyer-1', amount: 10000, ipAddress: '10.0.0.1', secondsBeforeEnd: 300 },
          { bidderId: 'buyer-2', amount: 15000, ipAddress: sellerIp, secondsBeforeEnd: 100 },
        ],
      });
      expect(shillBids.isSuspicious).toBe(true);
      expect(shillBids.confidenceScore).toBeGreaterThanOrEqual(0.7);
      expect(shillBids.detectedAnomalies?.sellerIpMatches).toBe(1);

      // Rapid bot snipes in final 5 seconds
      const rapidSnipes = await analyzeShillBiddingRisk({
        listingId: 'lst-200',
        sellerId: 'seller-xyz',
        bids: [
          { bidderId: 'b1', amount: 20000, ipAddress: '1.1.1.1', secondsBeforeEnd: 4 },
          { bidderId: 'b2', amount: 22000, ipAddress: '1.1.1.2', secondsBeforeEnd: 3 },
          { bidderId: 'b3', amount: 25000, ipAddress: '1.1.1.3', secondsBeforeEnd: 1 },
        ],
      });
      expect(rapidSnipes.detectedAnomalies?.lastSecondBidsCount).toBe(3);
      expect(rapidSnipes.reasons.some(r => r.includes('الثواني الخمس'))).toBe(true);
    });
  });

  describe('SMS Gateway (src/services/sms-service.ts) Lifecycle & Rate Limiting', () => {
    beforeEach(() => {
      resetSmsSimulationStore();
    });

    it('strictly normalizes and classifies all Yemeni carriers with various formats', () => {
      // Yemen Mobile: 77 & 78
      expect(validateYemenPhoneNumber('770000000')).toEqual({
        isValid: true,
        carrier: 'YemenMobile',
        normalized: '967770000000',
        carrierNameAr: 'يمن موبايل (Yemen Mobile)',
      });
      expect(validateYemenPhoneNumber('0780000000').carrier).toBe('YemenMobile');
      expect(validateYemenPhoneNumber('+967780000000').normalized).toBe('967780000000');
      expect(validateYemenPhoneNumber('00967 77 000 0000').normalized).toBe('967770000000');

      // YOU: 73
      expect(validateYemenPhoneNumber('730000000').carrier).toBe('YOU');
      expect(validateYemenPhoneNumber('0730000000').normalized).toBe('967730000000');

      // Sabafon: 71
      expect(validateYemenPhoneNumber('710000000').carrier).toBe('Sabafon');
      expect(validateYemenPhoneNumber('+967 71 000 0000').normalized).toBe('967710000000');

      // Y Telecom: 70
      expect(validateYemenPhoneNumber('700000000').carrier).toBe('Y');
      expect(validateYemenPhoneNumber('0700000000').normalized).toBe('967700000000');

      // Invalid carriers & lengths
      expect(validateYemenPhoneNumber('790000000').isValid).toBe(false); // Unknown prefix 79
      expect(validateYemenPhoneNumber('720000000').isValid).toBe(false); // Unknown prefix 72
      expect(validateYemenPhoneNumber('77000000').isValid).toBe(false);  // 8 digits
      expect(validateYemenPhoneNumber('7700000000').isValid).toBe(false); // 10 digits
      expect(validateYemenPhoneNumber('').isValid).toBe(false);
      expect(validateYemenPhoneNumber('not-a-number').isValid).toBe(false);
    });

    it('enforces single-use OTP tokens and prevents replay attacks', async () => {
      const phone = '777333444';
      const sendRes = await sendOtp(phone);
      expect(sendRes.success).toBe(true);
      expect(sendRes.verificationId).toBeTruthy();
      expect(sendRes.simulatedCode).toMatch(/^\d{6}$/);

      // First verification succeeds
      const firstVerify = await verifyOtp(sendRes.verificationId, sendRes.simulatedCode!);
      expect(firstVerify.success).toBe(true);

      // Immediate second attempt with same verificationId must fail
      const replayAttempt = await verifyOtp(sendRes.verificationId, sendRes.simulatedCode!);
      expect(replayAttempt.success).toBe(false);
      expect(replayAttempt.error).toMatch(/غير موجود|استخدامه مسبقاً/);
    });

    it('invalidates OTP after 4 incorrect attempts', async () => {
      const phone = '771122334';
      const sendRes = await sendOtp(phone);
      const vid = sendRes.verificationId;
      const validCode = sendRes.simulatedCode!;

      // Attempt 1: wrong
      const a1 = await verifyOtp(vid, '111111');
      expect(a1.success).toBe(false);
      expect(a1.error).toMatch(/غير صحيح/);

      // Attempt 2: wrong
      const a2 = await verifyOtp(vid, '222222');
      expect(a2.success).toBe(false);

      // Attempt 3: wrong
      const a3 = await verifyOtp(vid, '333333');
      expect(a3.success).toBe(false);

      // Attempt 4: wrong -> token gets invalidated
      const a4 = await verifyOtp(vid, '444444');
      expect(a4.success).toBe(false);
      expect(a4.error).toMatch(/تم تجاوز الحد الأقصى/);

      // Attempt 5 with the REAL valid code must now fail because token was deleted
      const a5 = await verifyOtp(vid, validCode);
      expect(a5.success).toBe(false);
      expect(a5.error).toMatch(/غير موجود/);
    });

    it('enforces strict 3-attempt rate limit per number within 15 minutes and isolates users', async () => {
      const phoneA = '775555555';
      const phoneB = '736666666';

      // Phone A: 3 requests allowed
      const r1 = await sendOtp(phoneA);
      const r2 = await sendOtp(phoneA);
      const r3 = await sendOtp(phoneA);
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r3.success).toBe(true);

      // Phone A: 4th request blocked
      const r4 = await sendOtp(phoneA);
      expect(r4.success).toBe(false);
      expect(r4.error).toMatch(/تجاوزت الحد الأقصى/);

      // Phone B must NOT be blocked by Phone A's rate limit (isolation test)
      const rB1 = await sendOtp(phoneB);
      expect(rB1.success).toBe(true);
      expect(rB1.carrier).toBe('YOU');
    });

    it('rejects empty or malformed verificationId or code cleanly', async () => {
      const res1 = await verifyOtp('', '123456');
      expect(res1.success).toBe(false);
      expect(res1.error).toMatch(/مطلوبان/);

      const res2 = await verifyOtp('v_dummy_123', '');
      expect(res2.success).toBe(false);
      expect(res2.error).toMatch(/مطلوبان/);
    });
  });
});
