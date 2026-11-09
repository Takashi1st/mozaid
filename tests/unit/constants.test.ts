import { describe, it, expect } from 'vitest';
import { YEMEN_CITIES, PAYMENT_CHANNELS_CONFIG, AUCTION_RULES } from '../../src/lib/constants';

describe('Mozaid AI Constants (src/lib/constants.ts)', () => {
  describe('YEMEN_CITIES', () => {
    it('should be a non-empty array of Yemeni cities and governorates', () => {
      expect(Array.isArray(YEMEN_CITIES)).toBe(true);
      expect(YEMEN_CITIES.length).toBeGreaterThanOrEqual(16);
    });

    it('should include major economic and population hubs', () => {
      const requiredCities = ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'المكلا', 'إب', 'مأرب'];
      requiredCities.forEach((city) => {
        expect(YEMEN_CITIES).toContain(city);
      });
    });

    it('should not contain duplicate city names', () => {
      const uniqueCities = new Set(YEMEN_CITIES);
      expect(uniqueCities.size).toBe(YEMEN_CITIES.length);
    });
  });

  describe('PAYMENT_CHANNELS_CONFIG', () => {
    it('should define configurations for all 7 Yemeni payment channels', () => {
      const channelIds = PAYMENT_CHANNELS_CONFIG.map((c) => c.id);
      expect(channelIds).toContain('kuraimi_bank');
      expect(channelIds).toContain('one_cash');
      expect(channelIds).toContain('jwali');
      expect(channelIds).toContain('floosak');
      expect(channelIds).toContain('cash_wallet');
      expect(channelIds).toContain('al_najm');
      expect(channelIds).toContain('al_omqy');
    });

    it('should have valid metadata (Arabic name, English name, and type)', () => {
      PAYMENT_CHANNELS_CONFIG.forEach((channel) => {
        expect(channel.id).toBeDefined();
        expect(channel.nameAr).toBeTruthy();
        expect(channel.nameEn).toBeTruthy();
        expect(['bank', 'wallet', 'exchange']).toContain(channel.type);
      });
    });

    it('should have account numbers for banks and wallets, and recipient names for exchanges', () => {
      PAYMENT_CHANNELS_CONFIG.forEach((channel) => {
        if (channel.type === 'bank' || channel.type === 'wallet') {
          expect('accountNumber' in channel && Boolean(channel.accountNumber)).toBe(true);
        } else if (channel.type === 'exchange') {
          expect('recipientName' in channel && Boolean(channel.recipientName)).toBe(true);
        }
      });
    });
  });

  describe('AUCTION_RULES', () => {
    it('should configure anti-sniping trigger window to 120 seconds (2 minutes)', () => {
      expect(AUCTION_RULES.ANTI_SNIPING_TRIGGER_WINDOW_SECONDS).toBe(120);
    });

    it('should configure anti-sniping extension duration to 120 seconds', () => {
      expect(AUCTION_RULES.ANTI_SNIPING_EXTENSION_SECONDS).toBe(120);
    });

    it('should enforce max extension count of 20 times to prevent infinite bidding lock', () => {
      expect(AUCTION_RULES.MAX_TIMES_EXTENDED).toBe(20);
    });

    it('should set default inspection window to 48 hours', () => {
      expect(AUCTION_RULES.DEFAULT_INSPECTION_WINDOW_HOURS).toBe(48);
    });

    it('should enforce platform escrow commission fee invariant of exactly 2.5%', () => {
      expect(AUCTION_RULES.PLATFORM_FEE_PERCENT).toBe(2.5);
    });
  });
});
