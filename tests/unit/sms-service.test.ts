import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateYemenPhoneNumber,
  sendOtp,
  verifyOtp,
  resetSmsSimulationStore,
} from '../../src/services/sms-service';

describe('Yemeni SMS & OTP Gateway Service (src/services/sms-service.ts)', () => {
  beforeEach(() => {
    resetSmsSimulationStore();
  });

  describe('validateYemenPhoneNumber', () => {
    it('should identify Yemen Mobile numbers (prefix 77)', () => {
      const result = validateYemenPhoneNumber('771234567');
      expect(result.isValid).toBe(true);
      expect(result.carrier).toBe('YemenMobile');
      expect(result.normalized).toBe('967771234567');
    });

    it('should identify YOU numbers (prefix 73)', () => {
      const result = validateYemenPhoneNumber('0731234567');
      expect(result.isValid).toBe(true);
      expect(result.carrier).toBe('YOU');
      expect(result.normalized).toBe('967731234567');
    });

    it('should identify Sabafon numbers (prefix 71)', () => {
      const result = validateYemenPhoneNumber('+967711234567');
      expect(result.isValid).toBe(true);
      expect(result.carrier).toBe('Sabafon');
      expect(result.normalized).toBe('967711234567');
    });

    it('should identify Y Telecom numbers (prefix 70)', () => {
      const result = validateYemenPhoneNumber('00967 70 1234567');
      expect(result.isValid).toBe(true);
      expect(result.carrier).toBe('Y');
      expect(result.normalized).toBe('967701234567');
    });

    it('should reject invalid prefixes or wrong number length', () => {
      expect(validateYemenPhoneNumber('791234567').isValid).toBe(false); // بادئة غير موجودة
      expect(validateYemenPhoneNumber('7712345').isValid).toBe(false);   // رقم قصير
      expect(validateYemenPhoneNumber('77123456789').isValid).toBe(false); // رقم طويل
      expect(validateYemenPhoneNumber('abcdefghi').isValid).toBe(false);
    });
  });

  describe('sendOtp and verifyOtp flow', () => {
    it('should generate a 6-digit OTP code and verification ID', async () => {
      const response = await sendOtp('777111222');
      expect(response.success).toBe(true);
      expect(response.verificationId).toBeDefined();
      expect(response.simulatedCode).toMatch(/^\d{6}$/);
    });

    it('should successfully verify with the correct OTP code', async () => {
      const { verificationId, simulatedCode } = await sendOtp('777111222');
      const verifyResult = await verifyOtp(verificationId, simulatedCode!);
      expect(verifyResult.success).toBe(true);
    });

    it('should fail verification with an incorrect OTP code', async () => {
      const { verificationId } = await sendOtp('777111222');
      const verifyResult = await verifyOtp(verificationId, '000000');
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error).toMatch(/غير صحيح/);
    });

    it('should prevent replay attack (cannot reuse same OTP code)', async () => {
      const { verificationId, simulatedCode } = await sendOtp('777111222');
      const firstTry = await verifyOtp(verificationId, simulatedCode!);
      expect(firstTry.success).toBe(true);

      const secondTry = await verifyOtp(verificationId, simulatedCode!);
      expect(secondTry.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should throttle and reject requests exceeding 3 OTPs within 15 minutes', async () => {
      const phone = '777999888';
      await sendOtp(phone);
      await sendOtp(phone);
      await sendOtp(phone);

      const fourthTry = await sendOtp(phone);
      expect(fourthTry.success).toBe(false);
      expect(fourthTry.error).toMatch(/تجاوزت الحد|انتظر/);
    });
  });
});
