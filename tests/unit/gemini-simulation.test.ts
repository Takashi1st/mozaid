import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateAuctionSpecs,
  generateTenderRFP,
  analyzeShillBiddingRisk,
} from '../../src/lib/gemini';

describe('Dual-Mode Gemini AI Simulation (src/lib/gemini.ts)', () => {
  const originalEnvKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    // نضمن أن مفتاح الـ API فارغ لاختبار وضع المحاكاة الصامد (Mock/Fallback Mode)
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env.GEMINI_API_KEY = originalEnvKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  describe('generateAuctionSpecs', () => {
    it('should gracefully return structured Yemeni auction specs when API key is missing', async () => {
      const description = 'سيارة تويوتا هايلوكس دبل 2021 نظيفة جداً مجمرك في صنعاء';
      const result = await generateAuctionSpecs(description);

      expect(result).toBeDefined();
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;

      expect(parsed).toHaveProperty('title');
      expect(parsed).toHaveProperty('category');
      expect(parsed).toHaveProperty('estimatedMarketValue');
      expect(parsed).toHaveProperty('recommendedStartingPrice');
      expect(parsed).toHaveProperty('recommendedMinBidIncrement');
      expect(parsed).toHaveProperty('condition');
      expect(parsed).toHaveProperty('specificationsTable');

      expect(parsed.estimatedMarketValue).toBeGreaterThan(0);
      expect(parsed.recommendedStartingPrice).toBeLessThanOrEqual(parsed.estimatedMarketValue);
      expect(parsed.recommendedMinBidIncrement).toBeGreaterThan(0);
    });

    it('should handle optional base64 image data without throwing errors', async () => {
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = await generateAuctionSpecs('جهاز لابتوب ديل', dummyBase64);
      expect(result).toBeDefined();
    });
  });

  describe('generateTenderRFP', () => {
    it('should generate professional Markdown procurement RFP with all required sections', async () => {
      const title = 'توريد منظومات طاقة شمسية لآبار مياه الشرب في محافظة تعز';
      const rawReqs = 'المطلوب توريد 30 لوح شمسي بقدرة 550 وات مع محولات وغواطس';

      const rfp = await generateTenderRFP(title, rawReqs);
      expect(typeof rfp).toBe('string');
      expect(rfp.length).toBeGreaterThan(100);

      // التأكد من تضمين الأقسام الرئيسية
      expect(rfp).toMatch(/نطاق العمل|Scope/);
      expect(rfp).toMatch(/المواصفات الفنية|Technical/);
      expect(rfp).toMatch(/الشروط المالية|الضمان/);
      expect(rfp).toMatch(/معايير التقييم|Evaluation/);
      expect(rfp).toMatch(/الشروط الجزائية|Penalty/);
    });
  });

  describe('analyzeShillBiddingRisk', () => {
    it('should detect low risk when bidders have distinct IPs and normal timing', async () => {
      const bids = [
        { bidderId: 'u1', amount: 50000, ipAddress: '192.168.1.10', secondsBeforeEnd: 300 },
        { bidderId: 'u2', amount: 60000, ipAddress: '192.168.1.20', secondsBeforeEnd: 240 },
        { bidderId: 'u3', amount: 75000, ipAddress: '192.168.1.30', secondsBeforeEnd: 150 },
      ];
      const sellerIp = '10.0.0.1';

      const analysis = await analyzeShillBiddingRisk(bids, sellerIp);
      const parsed = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;

      expect(parsed.isSuspicious).toBe(false);
      expect(parsed.riskLevel).toBe('LOW');
      expect(parsed.confidenceScore).toBeLessThan(0.4);
    });

    it('should flag CRITICAL/HIGH risk when bidder IP matches seller IP', async () => {
      const sharedIp = '175.45.176.5';
      const bids = [
        { bidderId: 'u1', amount: 50000, ipAddress: '192.168.1.10', secondsBeforeEnd: 300 },
        { bidderId: 'u_shill', amount: 95000, ipAddress: sharedIp, secondsBeforeEnd: 40 },
      ];
      const sellerIp = sharedIp;

      const analysis = await analyzeShillBiddingRisk(bids, sellerIp);
      const parsed = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;

      expect(parsed.isSuspicious).toBe(true);
      expect(['HIGH', 'CRITICAL']).toContain(parsed.riskLevel);
      expect(parsed.confidenceScore).toBeGreaterThanOrEqual(0.7);
      expect(JSON.stringify(parsed.reasons)).toMatch(/IP|تطابق/);
    });
  });
});
