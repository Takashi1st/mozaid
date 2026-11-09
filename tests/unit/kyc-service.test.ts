import { beforeEach, describe, expect, it } from 'vitest';
import {
  evaluateTrustedSellerBadge,
  getKycAuditLogs,
  getPendingKycSubmissions,
  getUserProfile,
  getVerifiedUsers,
  processIdOcr,
  recordSuccessfulDeal,
  requestPhoneKycOtp,
  resetKycStore,
  reviewKycSubmission,
  submitNationalIdKyc,
  submitSelfieLivenessKyc,
  updateUserReputation,
  verifyLivenessAndSelfie,
  verifyPhoneKycOtp,
} from '../../src/services/kyc-service';
import { resetSmsSimulationStore } from '../../src/services/sms-service';

describe('KYC & Trust Verification Service (src/services/kyc-service.ts)', () => {
  const userId = 'user_applicant_101';
  const adminId = 'admin_kyc_officer_77';

  beforeEach(() => {
    resetKycStore();
    resetSmsSimulationStore();
  });

  describe('Tier 1: Phone OTP Verification', () => {
    it('should request and verify Yemeni phone OTP (77x Yemen Mobile)', async () => {
      const phone = '771234567';
      const otpReq = await requestPhoneKycOtp(userId, phone);

      expect(otpReq.success).toBe(true);
      expect(otpReq.verificationId).toBeDefined();
      expect(otpReq.simulatedCode).toBeDefined();

      // التحقق برمز OTP الصحيح
      const verifyRes = await verifyPhoneKycOtp(userId, otpReq.verificationId, otpReq.simulatedCode!);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user.phoneVerifiedAt).toBeDefined();
      expect(verifyRes.user.phoneNumber).toBe('967771234567');
    });

    it('should reject invalid non-Yemeni phone numbers', async () => {
      const invalidPhone = '123456789';
      const otpReq = await requestPhoneKycOtp(userId, invalidPhone);

      expect(otpReq.success).toBe(false);
      expect(otpReq.error).toMatch(/غير صالح/);
    });

    it('should fail verification if incorrect OTP code is provided', async () => {
      const phone = '733000111';
      const otpReq = await requestPhoneKycOtp(userId, phone);

      const verifyRes = await verifyPhoneKycOtp(userId, otpReq.verificationId, '000000');
      expect(verifyRes.success).toBe(false);
      expect(verifyRes.error).toMatch(/غير صحيح/);
    });
  });

  describe('Tier 2: National ID OCR Simulation & Extraction', () => {
    it('should extract fields from Yemeni National ID with high confidence (>0.9)', async () => {
      const validUrl = 'https://cdn.mozaid.ye/kyc/national_id_front_sample.webp';
      const ocr = await processIdOcr(validUrl);

      expect(ocr.ocrConfidence).toBeGreaterThan(0.9);
      expect(ocr.isValidIdFormat).toBe(true);
      expect(ocr.extractedFields.nationalIdNumber).toBeDefined();
      expect(ocr.extractedFields.fullName).toBeDefined();
      expect(ocr.extractedFields.birthDate).toBeDefined();
      expect(ocr.extractedFields.governorate).toBeDefined();
    });

    it('should return low confidence for blurred or corrupted ID image', async () => {
      const blurredUrl = 'https://cdn.mozaid.ye/kyc/blur_photo.jpg';
      const ocr = await processIdOcr(blurredUrl);

      expect(ocr.ocrConfidence).toBeLessThan(0.6);
      expect(ocr.isValidIdFormat).toBe(false);
    });

    it('should submit National ID and transition status to pending_review', async () => {
      const user = await submitNationalIdKyc({
        userId,
        nationalIdNumber: '10012345678',
        fullName: 'عبد الله صالح المفلحي',
        idFrontUrl: 'https://cdn.mozaid.ye/kyc/id_front.jpg',
        idBackUrl: 'https://cdn.mozaid.ye/kyc/id_back.jpg',
        city: 'عدن',
      });

      expect(user.kycStatus).toBe('pending_review');
      expect(user.nationalIdNumber).toBe('10012345678');
      expect(user.fullName).toBe('عبد الله صالح المفلحي');

      const pending = getPendingKycSubmissions();
      expect(pending.some((u) => u.id === userId)).toBe(true);
    });

    it('should prevent duplicate National ID usage across multiple accounts', async () => {
      await submitNationalIdKyc({
        userId: 'user_first_owner',
        nationalIdNumber: '10019998887',
        fullName: 'ماجد محمد',
        idFrontUrl: 'https://cdn.mozaid.ye/kyc/front.jpg',
        idBackUrl: 'https://cdn.mozaid.ye/kyc/back.jpg',
      });

      // مستخدم آخر يحاول استخدام نفس الرقم الوطني
      await expect(
        submitNationalIdKyc({
          userId: 'user_fraud_impersonator',
          nationalIdNumber: '10019998887',
          fullName: 'منتحل صفة',
          idFrontUrl: 'https://cdn.mozaid.ye/kyc/front2.jpg',
          idBackUrl: 'https://cdn.mozaid.ye/kyc/back2.jpg',
        })
      ).rejects.toThrow(/مسجل مسبقاً في حساب مستخدم آخر/);
    });
  });

  describe('Tier 3: Selfie Liveness & Biometric Verification', () => {
    it('should verify genuine selfie with high match and liveness score', async () => {
      const idPhoto = 'https://cdn.mozaid.ye/kyc/id_front.jpg';
      const genuineSelfie = 'https://cdn.mozaid.ye/kyc/live_selfie_camera.webp';

      const liveness = await verifyLivenessAndSelfie(idPhoto, genuineSelfie);
      expect(liveness.isLivenessVerified).toBe(true);
      expect(liveness.matchConfidence).toBeGreaterThan(0.85);
      expect(liveness.checks.featuresMatch).toBe(true);
    });

    it('should reject spoofed or static screen photos', async () => {
      const idPhoto = 'https://cdn.mozaid.ye/kyc/id_front.jpg';
      const spoofedSelfie = 'https://cdn.mozaid.ye/kyc/static_photo_spoof.jpg';

      const liveness = await verifyLivenessAndSelfie(idPhoto, spoofedSelfie);
      expect(liveness.isLivenessVerified).toBe(false);
      expect(liveness.matchConfidence).toBeLessThan(0.5);
    });

    it('should store approved selfie in user profile', async () => {
      await submitNationalIdKyc({
        userId,
        nationalIdNumber: '10012223334',
        fullName: 'خالد سعيد',
        idFrontUrl: 'https://cdn.mozaid.ye/kyc/front.jpg',
        idBackUrl: 'https://cdn.mozaid.ye/kyc/back.jpg',
      });

      const res = await submitSelfieLivenessKyc(
        userId,
        'https://cdn.mozaid.ye/kyc/user_live_selfie.webp'
      );
      expect(res.user.selfieUrl).toBe('https://cdn.mozaid.ye/kyc/user_live_selfie.webp');
      expect(res.livenessResult.isLivenessVerified).toBe(true);
    });
  });

  describe('Admin Approval / Rejection Workflow', () => {
    it('should approve KYC submission and update verified status and audit logs', async () => {
      await submitNationalIdKyc({
        userId,
        nationalIdNumber: '10015556667',
        fullName: 'طارق يحيى',
        idFrontUrl: 'https://cdn.mozaid.ye/kyc/front.jpg',
        idBackUrl: 'https://cdn.mozaid.ye/kyc/back.jpg',
      });

      const approvedUser = await reviewKycSubmission({
        userId,
        adminId,
        approved: true,
      });

      expect(approvedUser.kycStatus).toBe('verified');
      expect(approvedUser.kycVerifiedAt).toBeDefined();
      expect(approvedUser.kycVerifiedBy).toBe(adminId);
      expect(approvedUser.kycRejectionReason).toBeUndefined();

      const verifiedList = getVerifiedUsers();
      expect(verifiedList.some((u) => u.id === userId)).toBe(true);

      const logs = getKycAuditLogs();
      expect(logs.some((l) => l.actionType === 'APPROVE_KYC' && l.targetId === userId)).toBe(true);
    });

    it('should reject KYC submission with mandatory rejection notes', async () => {
      await submitNationalIdKyc({
        userId,
        nationalIdNumber: '10017778889',
        fullName: 'مروان أحمد',
        idFrontUrl: 'https://cdn.mozaid.ye/kyc/front.jpg',
        idBackUrl: 'https://cdn.mozaid.ye/kyc/back.jpg',
      });

      const rejectionReason = 'صورة الهوية غير واضحة وهناك طمس على تاريخ الانتهاء';
      const rejectedUser = await reviewKycSubmission({
        userId,
        adminId,
        approved: false,
        rejectionReason,
      });

      expect(rejectedUser.kycStatus).toBe('rejected');
      expect(rejectedUser.kycRejectionReason).toBe(rejectionReason);

      const logs = getKycAuditLogs();
      expect(logs.some((l) => l.actionType === 'REJECT_KYC' && l.targetId === userId)).toBe(true);
    });

    it('should throw error when rejecting without providing mandatory rejection notes', async () => {
      await submitNationalIdKyc({
        userId,
        nationalIdNumber: '10017778889',
        fullName: 'مروان أحمد',
        idFrontUrl: 'https://cdn.mozaid.ye/kyc/front.jpg',
        idBackUrl: 'https://cdn.mozaid.ye/kyc/back.jpg',
      });

      await expect(
        reviewKycSubmission({
          userId,
          adminId,
          approved: false,
          rejectionReason: '', // سبب فارغ
        })
      ).rejects.toThrow(/سبب الرفض إلزامي/);
    });
  });

  describe('Trusted Seller Badge Evaluation', () => {
    it('should evaluate trusted seller criteria strictly (KYC + >5 deals + >=4.8 rating + !isBanned)', async () => {
      // 1. New user with no deals -> Not eligible
      const u1 = getUserProfile(userId) || (await submitNationalIdKyc({
        userId,
        nationalIdNumber: '10018889990',
        fullName: 'سالم الكندي',
        idFrontUrl: 'https://cdn.mozaid.ye/kyc/front.jpg',
        idBackUrl: 'https://cdn.mozaid.ye/kyc/back.jpg',
      }));

      let evalRes = evaluateTrustedSellerBadge(userId);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.criteria.kycVerified).toBe(false);
      expect(evalRes.criteria.dealsCountMet).toBe(false);

      // 2. Approve KYC
      await reviewKycSubmission(userId, adminId, true);
      evalRes = evaluateTrustedSellerBadge(userId);
      expect(evalRes.criteria.kycVerified).toBe(true);
      expect(evalRes.isEligible).toBe(false); // still < 5 deals

      // 3. Add exactly 5 deals (boundary: strictly > 5 required)
      for (let i = 0; i < 5; i++) {
        await recordSuccessfulDeal(userId);
      }
      evalRes = evaluateTrustedSellerBadge(userId);
      expect(evalRes.criteria.dealsCountMet).toBe(false); // 5 is not > 5
      expect(evalRes.isEligible).toBe(false);

      // 4. Add 6th deal -> Now dealsCountMet = true
      await recordSuccessfulDeal(userId);
      evalRes = evaluateTrustedSellerBadge(userId);
      expect(evalRes.criteria.dealsCountMet).toBe(true);
      expect(evalRes.criteria.reputationMet).toBe(true); // default 5.0
      expect(evalRes.isEligible).toBe(true);
      expect(evalRes.user.isTrustedSeller).toBe(true);

      // 5. Rating drops to 4.75 (< 4.80) -> Revoked!
      await updateUserReputation(userId, 4.75);
      evalRes = evaluateTrustedSellerBadge(userId);
      expect(evalRes.criteria.reputationMet).toBe(false);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.user.isTrustedSeller).toBe(false);

      // 6. Rating recovers to 4.85 (>= 4.80) -> Restored!
      await updateUserReputation(userId, 4.85);
      evalRes = evaluateTrustedSellerBadge(userId);
      expect(evalRes.isEligible).toBe(true);
      expect(evalRes.user.isTrustedSeller).toBe(true);

      // 7. User gets banned -> Immediately Revoked!
      const user = getUserProfile(userId)!;
      user.isBanned = true;
      evalRes = evaluateTrustedSellerBadge(userId);
      expect(evalRes.criteria.notBanned).toBe(false);
      expect(evalRes.isEligible).toBe(false);
      expect(evalRes.user.isTrustedSeller).toBe(false);
    });
  });
});
