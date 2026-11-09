/**
 * Deterministic In-Memory Mozaid AI Platform Simulator
 * Implements all 48 features and business invariants from PRD, USECASES, and PROJECT.md
 */

import type {
  UserAccount,
  ListingModel,
  WalletLedger,
  DepositVoucher,
  BidRecord,
  EscrowModel,
  DisputeModel,
  DisputeChatMessage,
  AuditLogEntry,
  ContractorCertificate,
  RealtimeRoomEvent,
  Currency,
  PaymentChannel,
  UserRole,
} from './types.ts';
import { AUCTION_RULES, YEMEN_CITIES } from '../../../src/lib/constants.ts';

export class MozaidMockPlatform {
  public users = new Map<string, UserAccount>();
  public wallets = new Map<string, Map<Currency, WalletLedger>>();
  public listings = new Map<string, ListingModel>();
  public bids = new Map<string, BidRecord[]>(); // listingId -> bids[]
  public escrows = new Map<string, EscrowModel>();
  public disputes = new Map<string, DisputeModel>();
  public disputeMessages = new Map<string, DisputeChatMessage[]>();
  public vouchers = new Map<string, DepositVoucher>();
  public certificates = new Map<string, ContractorCertificate>();
  public auditLogs: AuditLogEntry[] = [];
  public roomEvents: RealtimeRoomEvent[] = [];
  public activeRoomUsers = new Map<string, Set<string>>(); // listingId -> Set<userId>

  // OTP state: phone -> { code: string; expiresAt: number; attempts: number }
  public otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

  // Commission Ledger: currency -> total accrued fees
  public platformFeeLedger: Record<Currency, number> = {
    YER: 0,
    USD: 0,
    SAR: 0,
  };

  // Blacklist: banned device fingerprints
  public bannedFingerprints = new Set<string>();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.users.clear();
    this.wallets.clear();
    this.listings.clear();
    this.bids.clear();
    this.escrows.clear();
    this.disputes.clear();
    this.disputeMessages.clear();
    this.vouchers.clear();
    this.certificates.clear();
    this.auditLogs = [];
    this.roomEvents = [];
    this.activeRoomUsers.clear();
    this.otpStore.clear();
    this.bannedFingerprints.clear();
    this.platformFeeLedger = { YER: 0, USD: 0, SAR: 0 };
  }

  // ============================================================================
  // F46: Yemeni SMS OTP Gateway
  // ============================================================================
  public validateYemeniPhone(phone: string): { isValid: boolean; carrier?: string; normalized: string } {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    let local = cleaned;
    if (local.startsWith('+967')) local = local.substring(4);
    else if (local.startsWith('00967')) local = local.substring(5);
    else if (local.startsWith('0')) local = local.substring(1);

    if (!/^\d{9}$/.test(local)) {
      return { isValid: false, normalized: cleaned };
    }

    const prefix = local.substring(0, 2);
    let carrier: string | undefined;
    if (prefix === '77' || prefix === '78') carrier = 'YemenMobile';
    else if (prefix === '73') carrier = 'YOU';
    else if (prefix === '71') carrier = 'Sabafon';
    else if (prefix === '70') carrier = 'Y';

    return {
      isValid: carrier !== undefined,
      carrier,
      normalized: `+967${local}`,
    };
  }

  public sendSMSOtp(phone: string): { success: boolean; verificationId: string; simulatedCode: string } {
    const val = this.validateYemeniPhone(phone);
    if (!val.isValid) {
      throw new Error(`Invalid Yemeni phone number format: ${phone}`);
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 300_000; // 5 minutes
    this.otpStore.set(val.normalized, { code, expiresAt, attempts: 0 });
    return { success: true, verificationId: val.normalized, simulatedCode: code };
  }

  public verifySMSOtp(phone: string, inputCode: string): { success: boolean; message: string } {
    const val = this.validateYemeniPhone(phone);
    const entry = this.otpStore.get(val.normalized);
    if (!entry) throw new Error('No OTP requested for this phone number.');
    if (Date.now() > entry.expiresAt) throw new Error('OTP code has expired.');
    if (entry.attempts >= 5) throw new Error('Maximum OTP attempts exceeded. Code blocked.');

    entry.attempts++;
    if (entry.code !== inputCode) {
      return { success: false, message: 'Invalid OTP code.' };
    }
    this.otpStore.delete(val.normalized);
    return { success: true, message: 'Phone verified successfully.' };
  }

  // ============================================================================
  // F39, F40, F41: National ID OCR, Selfie Liveness, KYC Workflow
  // ============================================================================
  public registerUser(user: UserAccount): UserAccount {
    if (this.users.has(user.id)) throw new Error(`User ${user.id} already exists.`);
    if (user.deviceFingerprint && this.bannedFingerprints.has(user.deviceFingerprint)) {
      throw new Error('Device is blacklisted due to security policy.');
    }
    this.users.set(user.id, { ...user });
    // Initialize default wallets
    const currs: Currency[] = ['YER', 'USD', 'SAR'];
    const uWallets = new Map<Currency, WalletLedger>();
    for (const c of currs) {
      uWallets.set(c, {
        userId: user.id,
        currency: c,
        availableBalance: 0,
        frozenEscrowBalance: 0,
      });
    }
    this.wallets.set(user.id, uWallets);
    return this.users.get(user.id)!;
  }

  public simulateIdOCR(idFrontUrl: string): {
    extractedName: string;
    nationalIdNumber: string;
    birthDate: string;
    issuingCity: string;
    confidence: number;
  } {
    if (!idFrontUrl || !idFrontUrl.startsWith('http')) {
      throw new Error('Invalid or unreadable ID image URL.');
    }
    return {
      extractedName: 'صالح محمد قاسم الحاشدي',
      nationalIdNumber: '01010098765',
      birthDate: '1985-04-12',
      issuingCity: 'صنعاء',
      confidence: 0.96,
    };
  }

  public simulateSelfieLiveness(idCardPhotoUrl: string, selfiePhotoUrl: string): {
    isLivenessPassed: boolean;
    facialMatchScore: number;
  } {
    if (!idCardPhotoUrl || !selfiePhotoUrl) {
      throw new Error('Both ID portrait and selfie are required.');
    }
    return {
      isLivenessPassed: true,
      facialMatchScore: 0.94,
    };
  }

  public submitKYC(userId: string, data: { nationalIdNumber: string; idCardFront: string; idCardBack: string; selfie: string }): UserAccount {
    const u = this.users.get(userId);
    if (!u) throw new Error('User not found');
    u.nationalIdNumber = data.nationalIdNumber;
    u.idCardFrontUrl = data.idCardFront;
    u.idCardBackUrl = data.idCardBack;
    u.selfieUrl = data.selfie;
    u.kycStatus = 'pending_review';
    return u;
  }

  public reviewKYC(adminId: string, userId: string, approved: boolean, rejectionReason?: string): UserAccount {
    const admin = this.users.get(adminId);
    if (!admin || (admin.role !== 'super_admin' && admin.role !== 'moderator')) {
      throw new Error('Unauthorized: only admin or moderator can review KYC.');
    }
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    if (approved) {
      user.kycStatus = 'verified';
    } else {
      if (!rejectionReason) throw new Error('Rejection reason is required.');
      user.kycStatus = 'rejected';
    }
    this.logAudit(adminId, admin.role, 'REVIEW_KYC', 'user', userId, { approved, rejectionReason });
    return user;
  }

  // F19: Trusted Seller Badge Acquisition
  public evaluateTrustedSellerBadge(userId: string): boolean {
    const u = this.users.get(userId);
    if (!u) return false;
    const qualifies = u.kycStatus === 'verified' && u.successfulDealsCount > 5 && u.reputationScore >= 4.8 && !u.isBanned;
    u.isTrustedSeller = qualifies;
    return qualifies;
  }

  // F38: Shadow Account Blacklisting & Device Ban
  public banUserAndDevice(adminId: string, targetUserId: string, reason: string): void {
    const admin = this.users.get(adminId);
    if (!admin || admin.role !== 'super_admin') {
      throw new Error('Unauthorized: only super_admin can ban accounts and devices.');
    }
    const target = this.users.get(targetUserId);
    if (!target) throw new Error('Target user not found.');
    target.isBanned = true;
    if (target.deviceFingerprint) {
      this.bannedFingerprints.add(target.deviceFingerprint);
    }
    this.logAudit(adminId, admin.role, 'BAN_USER_AND_DEVICE', 'user', targetUserId, {
      reason,
      fingerprint: target.deviceFingerprint,
    });
  }

  // ============================================================================
  // F45, F32, F33, F34, F35, F36: Wallet & Yemeni Banking & Hawala
  // ============================================================================
  public getWallet(userId: string, currency: Currency): WalletLedger {
    const userWallets = this.wallets.get(userId);
    if (!userWallets) throw new Error(`No wallet for user ${userId}`);
    const ledger = userWallets.get(currency);
    if (!ledger) throw new Error(`No ${currency} ledger for user ${userId}`);
    return ledger;
  }

  public submitDepositVoucher(params: {
    userId: string;
    channel: PaymentChannel;
    amount: number;
    currency: Currency;
    transferRef: string;
    receiptUrl: string;
  }): DepositVoucher {
    if (params.amount <= 0) throw new Error('Deposit amount must be positive.');
    if (!params.transferRef) throw new Error('Transfer reference is required.');
    const voucher: DepositVoucher = {
      id: `vch_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: params.userId,
      channel: params.channel,
      amount: params.amount,
      currency: params.currency,
      transferRef: params.transferRef,
      receiptUrl: params.receiptUrl,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.vouchers.set(voucher.id, voucher);
    return voucher;
  }

  public approveDepositVoucher(adminId: string, voucherId: string): DepositVoucher {
    const admin = this.users.get(adminId);
    if (!admin || (admin.role !== 'finance_admin' && admin.role !== 'super_admin')) {
      throw new Error('Unauthorized: only finance_admin can approve deposit vouchers.');
    }
    const voucher = this.vouchers.get(voucherId);
    if (!voucher) throw new Error('Voucher not found.');
    if (voucher.status !== 'pending') throw new Error(`Voucher is already ${voucher.status}.`);

    voucher.status = 'approved';
    voucher.adminId = adminId;
    voucher.processedAt = Date.now();

    const ledger = this.getWallet(voucher.userId, voucher.currency);
    ledger.availableBalance += voucher.amount;

    this.logAudit(adminId, admin.role, 'APPROVE_DEPOSIT_VOUCHER', 'wallet', voucher.userId, {
      voucherId,
      amount: voucher.amount,
      currency: voucher.currency,
      channel: voucher.channel,
    });
    return voucher;
  }

  public rejectDepositVoucher(adminId: string, voucherId: string, reason: string): DepositVoucher {
    const admin = this.users.get(adminId);
    if (!admin || (admin.role !== 'finance_admin' && admin.role !== 'super_admin')) {
      throw new Error('Unauthorized: only finance_admin can reject deposit vouchers.');
    }
    const voucher = this.vouchers.get(voucherId);
    if (!voucher) throw new Error('Voucher not found.');
    if (voucher.status !== 'pending') throw new Error(`Voucher is already ${voucher.status}.`);
    if (!reason) throw new Error('Rejection reason must be provided.');

    voucher.status = 'rejected';
    voucher.adminId = adminId;
    voucher.rejectionReason = reason;
    voucher.processedAt = Date.now();

    this.logAudit(adminId, admin.role, 'REJECT_DEPOSIT_VOUCHER', 'wallet', voucher.userId, {
      voucherId,
      reason,
    });
    return voucher;
  }

  // F5: Araboon / Bid Deposit Lock
  public lockBidDeposit(userId: string, currency: Currency, amount: number): void {
    if (amount <= 0) return;
    const ledger = this.getWallet(userId, currency);
    if (ledger.availableBalance < amount) {
      throw new Error(`Insufficient available balance to lock required deposit of ${amount} ${currency}.`);
    }
    ledger.availableBalance -= amount;
    ledger.frozenEscrowBalance += amount;
  }

  // F6: Deposit Refund for Outbid/Losers
  public refundBidDeposit(userId: string, currency: Currency, amount: number): void {
    if (amount <= 0) return;
    const ledger = this.getWallet(userId, currency);
    if (ledger.frozenEscrowBalance < amount) {
      throw new Error('Inconsistent state: frozen escrow balance less than refund amount.');
    }
    ledger.frozenEscrowBalance -= amount;
    ledger.availableBalance += amount;
  }

  // F35: Seller Payout Disbursement
  public disburseSellerPayout(adminId: string, sellerId: string, currency: Currency, amount: number, payoutChannel: PaymentChannel): {
    payoutRef: string;
    newBalance: number;
  } {
    const admin = this.users.get(adminId);
    if (!admin || (admin.role !== 'finance_admin' && admin.role !== 'super_admin')) {
      throw new Error('Unauthorized: only finance_admin can disburse payouts.');
    }
    const ledger = this.getWallet(sellerId, currency);
    if (ledger.availableBalance < amount) {
      throw new Error('Payout amount exceeds seller available balance.');
    }
    ledger.availableBalance -= amount;
    const payoutRef = `PAY_${payoutChannel.toUpperCase()}_${Date.now()}`;
    this.logAudit(adminId, admin.role, 'SELLER_PAYOUT_DISBURSED', 'wallet', sellerId, {
      amount,
      currency,
      payoutChannel,
      payoutRef,
    });
    return { payoutRef, newBalance: ledger.availableBalance };
  }

  // ============================================================================
  // F13, F14, F15, F20, F21, F4: AI & Listing Operations
  // ============================================================================
  public generateAIListingSpecs(briefDescription: string, imageCount: number = 1): {
    suggestedTitle: string;
    category: string;
    estimatedValue: number;
    recommendedStartingPrice: number;
    recommendedMinIncrement: number;
    specsTable: Record<string, string>;
    inspectionTerms: string;
  } {
    if (!briefDescription.trim()) throw new Error('Brief description cannot be empty.');
    return {
      suggestedTitle: `عرض مميز: ${briefDescription.substring(0, 40)}`,
      category: briefDescription.includes('سيارة') || briefDescription.includes('شاحنة') ? 'سيارات ومحركات' : 'عقارات',
      estimatedValue: 12_000_000,
      recommendedStartingPrice: 6_000_000,
      recommendedMinIncrement: 200_000,
      specsTable: {
        'سنة الصنع': '2021',
        'الحالة': 'مستعمل بحالة ممتازة',
        'بلد المنشأ': 'اليابان',
      },
      inspectionTerms: 'فحص ميكانيكي كامل لدى ورشة معتمدة خلال مهلة 48 ساعة.',
    };
  }

  public generateAITenderRFP(title: string, rawRequirements: string): {
    markdownRFP: string;
    scopeOfWork: string;
    technicalSpecs: string[];
    financialTerms: string;
    evaluationMatrix: Record<string, number>;
  } {
    if (!title.trim() || !rawRequirements.trim()) throw new Error('Title and requirements are mandatory.');
    return {
      markdownRFP: `# كراسة شروط ومواصفات مناقصة: ${title}\n\n## نطاق العمل\n${rawRequirements}`,
      scopeOfWork: `تنفيذ وتوريد كامل متطلبات المشروع حسب المعايير الهندسية: ${rawRequirements}`,
      technicalSpecs: ['مطابقة معايير الجودة الدولية ISO', 'ضمان تشغيل وصيانة لمدة 24 شهراً'],
      financialTerms: 'دفعة مقدمة 20% مقابل خطاب ضمان بنكي، و80% عند الفحص والاستلام النهائي.',
      evaluationMatrix: { 'العرض الفني': 60, 'العرض المالي': 40 },
    };
  }

  public scanImageModeration(imageUrl: string): { isSafe: boolean; safetyScore: number } {
    if (!imageUrl) throw new Error('Image URL is empty.');
    if (imageUrl.includes('explicit') || imageUrl.includes('illegal')) {
      return { isSafe: false, safetyScore: 0.1 };
    }
    return { isSafe: true, safetyScore: 0.99 };
  }

  public createListing(sellerId: string, listing: Partial<ListingModel>): ListingModel {
    const seller = this.users.get(sellerId);
    if (!seller) throw new Error('Seller not found.');
    if (seller.isBanned) throw new Error('Banned user cannot create listings.');
    if (seller.kycStatus !== 'verified') throw new Error('KYC verification required before publishing listings.');

    if (!listing.title) throw new Error('Listing title is required.');
    if (!listing.startingPrice || listing.startingPrice <= 0) throw new Error('Starting price must be greater than zero.');
    if (listing.reservePrice && listing.reservePrice < listing.startingPrice) {
      throw new Error('Reserve price cannot be less than starting price.');
    }
    if (!listing.minBidIncrement || listing.minBidIncrement <= 0) {
      throw new Error('Minimum bid increment must be positive.');
    }
    if (listing.endsAt && listing.endsAt <= Date.now()) {
      throw new Error('Listing end time must be in the future.');
    }

    const id = listing.id || `lst_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newListing: ListingModel = {
      id,
      sellerId,
      title: listing.title,
      category: listing.category || 'عام',
      listingType: listing.listingType || 'forward_auction',
      status: listing.status || 'active',
      currency: listing.currency || 'YER',
      startingPrice: listing.startingPrice,
      reservePrice: listing.reservePrice,
      currentPrice: listing.startingPrice,
      minBidIncrement: listing.minBidIncrement,
      buyNowPrice: listing.buyNowPrice,
      requiredDepositAmount: listing.requiredDepositAmount || 0,
      startsAt: listing.startsAt || Date.now(),
      endsAt: listing.endsAt || Date.now() + 86400_000,
      timesExtended: 0,
      description: listing.description || '',
      city: listing.city || 'صنعاء',
      inspectionWindowHours: listing.inspectionWindowHours || AUCTION_RULES.DEFAULT_INSPECTION_WINDOW_HOURS,
      images: listing.images || [],
      isModerationApproved: true,
      budgetCeiling: listing.budgetCeiling,
      qualificationCriteria: listing.qualificationCriteria,
    };
    this.listings.set(id, newListing);
    this.bids.set(id, []);
    return newListing;
  }

  public discoverListings(filters: {
    category?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    query?: string;
    listingType?: 'forward_auction' | 'reverse_tender';
  }): ListingModel[] {
    let result = Array.from(this.listings.values());
    if (filters.category) result = result.filter((l) => l.category === filters.category);
    if (filters.city) result = result.filter((l) => l.city === filters.city);
    if (filters.minPrice !== undefined) result = result.filter((l) => l.currentPrice >= filters.minPrice!);
    if (filters.maxPrice !== undefined) result = result.filter((l) => l.currentPrice <= filters.maxPrice!);
    if (filters.listingType) result = result.filter((l) => l.listingType === filters.listingType);
    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter((l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
    }
    return result;
  }

  // ============================================================================
  // F1, F2, F3, F12, F16, F22, F26, F29, F30, F31, F37: Real-Time Bidding & Rooms
  // ============================================================================
  public joinRoom(listingId: string, userId: string): { viewerCount: number; currentPrice: number; endsAt: number } {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing room not found.');
    let set = this.activeRoomUsers.get(listingId);
    if (!set) {
      set = new Set();
      this.activeRoomUsers.set(listingId, set);
    }
    set.add(userId);
    this.roomEvents.push({
      type: 'USER_JOINED',
      listingId,
      payload: { userId, viewerCount: set.size },
      timestamp: Date.now(),
    });
    return { viewerCount: set.size, currentPrice: listing.currentPrice, endsAt: listing.endsAt };
  }

  public leaveRoom(listingId: string, userId: string): void {
    const set = this.activeRoomUsers.get(listingId);
    if (set) {
      set.delete(userId);
      this.roomEvents.push({
        type: 'USER_LEFT',
        listingId,
        payload: { userId, viewerCount: set.size },
        timestamp: Date.now(),
      });
    }
  }

  public submitForwardBid(listingId: string, bidderId: string, amount: number, ipAddress: string = '127.0.0.1'): {
    bid: BidRecord;
    isExtended: boolean;
    newEndsAt: number;
  } {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found.');
    if (listing.status !== 'active' && listing.status !== 'extended') {
      throw new Error('Auction is not open for bidding.');
    }
    if (Date.now() >= listing.endsAt) {
      throw new Error('Auction has officially ended.');
    }
    if (bidderId === listing.sellerId) {
      throw new Error('Seller cannot bid on own listing.');
    }

    const bidder = this.users.get(bidderId);
    if (!bidder) throw new Error('Bidder not found.');
    if (bidder.isBanned) throw new Error('Banned user cannot submit bids.');

    const listingBids = this.bids.get(listingId) || [];
    const highestBid = listingBids.find((b) => b.isWinning);
    if (highestBid && highestBid.bidderId === bidderId) {
      throw new Error('You already hold the highest bid.');
    }

    const minRequired = listing.currentPrice + listing.minBidIncrement;
    if (amount < minRequired) {
      throw new Error(`Bid amount must be at least ${minRequired} ${listing.currency}.`);
    }

    // Check anti-sniping extension
    const remainingSeconds = Math.floor((listing.endsAt - Date.now()) / 1000);
    let isExtended = false;
    if (
      remainingSeconds <= AUCTION_RULES.ANTI_SNIPING_TRIGGER_WINDOW_SECONDS &&
      listing.timesExtended < AUCTION_RULES.MAX_TIMES_EXTENDED
    ) {
      isExtended = true;
      listing.timesExtended++;
      listing.endsAt += AUCTION_RULES.ANTI_SNIPING_EXTENSION_SECONDS * 1000;
      listing.status = 'extended';
      this.roomEvents.push({
        type: 'AUCTION_EXTENDED',
        listingId,
        payload: {
          timesExtended: listing.timesExtended,
          newEndsAt: listing.endsAt,
          extensionSeconds: AUCTION_RULES.ANTI_SNIPING_EXTENSION_SECONDS,
        },
        timestamp: Date.now(),
      });
    }

    // Unmark previous winning bid
    for (const b of listingBids) {
      b.isWinning = false;
    }

    const newBid: BidRecord = {
      id: `bid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      listingId,
      bidderId,
      bidderName: bidder.fullName,
      amount,
      timestamp: Date.now(),
      ipAddress,
      deviceFingerprint: bidder.deviceFingerprint,
      isWinning: true,
    };
    listingBids.push(newBid);
    listing.currentPrice = amount;

    this.roomEvents.push({
      type: 'NEW_BID',
      listingId,
      payload: { bid: newBid, currentPrice: amount },
      timestamp: Date.now(),
    });

    return { bid: newBid, isExtended, newEndsAt: listing.endsAt };
  }

  // F22, F26: Reverse Tender Bidding
  public submitReverseBid(listingId: string, supplierId: string, amount: number): {
    bid: BidRecord;
    newLowestPrice: number;
  } {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Tender not found.');
    if (listing.listingType !== 'reverse_tender') throw new Error('Listing is not a reverse tender.');
    if (listing.status !== 'active') throw new Error('Tender is not active.');
    if (supplierId === listing.sellerId) throw new Error('Issuer cannot bid on own tender.');

    const maxAllowed = listing.currentPrice - listing.minBidIncrement;
    if (amount > maxAllowed) {
      throw new Error(`Reverse bid must be less than or equal to ${maxAllowed} ${listing.currency}.`);
    }

    const listingBids = this.bids.get(listingId) || [];
    for (const b of listingBids) b.isWinning = false;

    const supplierIndex = listingBids.filter((b) => b.bidderId === supplierId).length + 1;
    const newBid: BidRecord = {
      id: `rbid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      listingId,
      bidderId: supplierId,
      bidderName: `المورد #${supplierIndex}`,
      amount,
      timestamp: Date.now(),
      isWinning: true,
      isAnonymous: true,
    };
    listingBids.push(newBid);
    listing.currentPrice = amount;

    this.roomEvents.push({
      type: 'NEW_BID',
      listingId,
      payload: { anonymousBid: newBid, lowestPrice: amount },
      timestamp: Date.now(),
    });

    return { bid: newBid, newLowestPrice: amount };
  }

  // F12: Buy-Now Direct Purchase
  public buyNowDirect(listingId: string, buyerId: string): EscrowModel {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found.');
    if (!listing.buyNowPrice) throw new Error('Buy-Now is not enabled for this listing.');
    if (listing.status !== 'active' && listing.status !== 'extended') {
      throw new Error('Auction is not open.');
    }
    if (buyerId === listing.sellerId) throw new Error('Seller cannot buy own listing.');

    const buyer = this.users.get(buyerId);
    if (!buyer) throw new Error('Buyer not found.');

    listing.currentPrice = listing.buyNowPrice;
    listing.status = 'closed';

    this.roomEvents.push({
      type: 'AUCTION_CLOSED',
      listingId,
      payload: { winnerId: buyerId, finalPrice: listing.buyNowPrice, reason: 'buy_now' },
      timestamp: Date.now(),
    });

    // Create escrow contract directly
    return this.createEscrowContract(listingId, buyerId, listing.sellerId, listing.buyNowPrice, listing.currency);
  }

  // F29: Emergency Auction Pause & Resume
  public pauseAuction(adminId: string, listingId: string, reason: string): void {
    const admin = this.users.get(adminId);
    if (!admin || (admin.role !== 'moderator' && admin.role !== 'super_admin')) {
      throw new Error('Unauthorized: only admin/moderator can pause auctions.');
    }
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found.');
    if (listing.status === 'paused') throw new Error('Listing is already paused.');

    listing.status = 'paused';
    this.roomEvents.push({
      type: 'AUCTION_PAUSED',
      listingId,
      payload: { reason, adminId },
      timestamp: Date.now(),
    });
    this.logAudit(adminId, admin.role, 'PAUSE_AUCTION', 'listing', listingId, { reason });
  }

  public resumeAuction(adminId: string, listingId: string): void {
    const admin = this.users.get(adminId);
    if (!admin || (admin.role !== 'moderator' && admin.role !== 'super_admin')) {
      throw new Error('Unauthorized: only admin/moderator can resume auctions.');
    }
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found.');
    if (listing.status !== 'paused') throw new Error('Listing is not paused.');

    listing.status = 'active';
    this.roomEvents.push({
      type: 'AUCTION_RESUMED',
      listingId,
      payload: { adminId, endsAt: listing.endsAt },
      timestamp: Date.now(),
    });
    this.logAudit(adminId, admin.role, 'RESUME_AUCTION', 'listing', listingId, {});
  }

  // F30: Erroneous Bid Rollback
  public rollbackBid(adminId: string, listingId: string, bidId: string): { restoredPrice: number } {
    const admin = this.users.get(adminId);
    if (!admin || (admin.role !== 'moderator' && admin.role !== 'super_admin')) {
      throw new Error('Unauthorized: only admin/moderator can rollback bids.');
    }
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found.');
    const listingBids = this.bids.get(listingId) || [];
    const index = listingBids.findIndex((b) => b.id === bidId);
    if (index === -1) throw new Error('Bid not found to rollback.');

    listingBids.splice(index, 1);
    const prevBid = listingBids[listingBids.length - 1];
    const restoredPrice = prevBid ? prevBid.amount : listing.startingPrice;
    listing.currentPrice = restoredPrice;
    if (prevBid) prevBid.isWinning = true;

    this.roomEvents.push({
      type: 'BID_ROLLED_BACK',
      listingId,
      payload: { canceledBidId: bidId, restoredPrice },
      timestamp: Date.now(),
    });
    this.logAudit(adminId, admin.role, 'ROLLBACK_BID', 'bid', bidId, { listingId, restoredPrice });
    return { restoredPrice };
  }

  // F31: Manual Time Extension
  public extendAuctionManually(adminId: string, listingId: string, extraSeconds: number, reason: string): number {
    const admin = this.users.get(adminId);
    if (!admin || (admin.role !== 'moderator' && admin.role !== 'super_admin')) {
      throw new Error('Unauthorized: only admin/moderator can manually extend auctions.');
    }
    if (extraSeconds <= 0) throw new Error('Extra seconds must be positive.');
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found.');

    listing.endsAt += extraSeconds * 1000;
    this.roomEvents.push({
      type: 'AUCTION_EXTENDED',
      listingId,
      payload: { manual: true, extraSeconds, newEndsAt: listing.endsAt, reason },
      timestamp: Date.now(),
    });
    this.logAudit(adminId, admin.role, 'MANUAL_TIME_EXTENSION', 'listing', listingId, { extraSeconds, reason });
    return listing.endsAt;
  }

  // F37: Real-Time Shill Bidding Sentinel
  public analyzeShillBidding(listingId: string): { isSuspicious: boolean; riskScore: number; reason?: string } {
    const listing = this.listings.get(listingId);
    if (!listing) throw new Error('Listing not found.');
    const seller = this.users.get(listing.sellerId);
    const listingBids = this.bids.get(listingId) || [];

    for (const b of listingBids) {
      const bidder = this.users.get(b.bidderId);
      if (bidder && bidder.deviceFingerprint && seller && seller.deviceFingerprint) {
        if (bidder.deviceFingerprint === seller.deviceFingerprint) {
          return {
            isSuspicious: true,
            riskScore: 0.98,
            reason: 'تطابق بصمة جهاز المزايد مع بصمة جهاز صاحب المزاد (Shill Bidding Fingerprint Match).',
          };
        }
      }
    }
    return { isSuspicious: false, riskScore: 0.05 };
  }

  // ============================================================================
  // F7, F8, F9, F10, F11, F17, F18, F42, F43: Escrow & Disputes
  // ============================================================================
  public createEscrowContract(
    listingId: string,
    buyerId: string,
    sellerId: string,
    totalAmount: number,
    currency: Currency
  ): EscrowModel {
    const buyerLedger = this.getWallet(buyerId, currency);
    if (buyerLedger.availableBalance < totalAmount) {
      throw new Error(`Insufficient wallet balance. Total required: ${totalAmount} ${currency}.`);
    }

    // Deduct available balance and freeze in escrow
    buyerLedger.availableBalance -= totalAmount;
    buyerLedger.frozenEscrowBalance += totalAmount;

    // Platform fee invariant = 2.5%
    const platformFee = Math.round(totalAmount * (AUCTION_RULES.PLATFORM_FEE_PERCENT / 100) * 100) / 100;
    const sellerPayout = totalAmount - platformFee;

    const escrow: EscrowModel = {
      id: `esc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      listingId,
      buyerId,
      sellerId,
      totalAmount,
      platformFeeAmount: platformFee,
      sellerPayoutAmount: sellerPayout,
      currency,
      status: 'holding',
      createdAt: Date.now(),
    };
    this.escrows.set(escrow.id, escrow);
    return escrow;
  }

  // F17: Dispatch & Delivery Notification
  public notifyDispatched(sellerId: string, escrowId: string): EscrowModel {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) throw new Error('Escrow not found.');
    if (escrow.sellerId !== sellerId) throw new Error('Only the seller can dispatch items.');
    if (escrow.status !== 'holding') throw new Error('Escrow is not in holding state.');

    escrow.status = 'dispatched';
    escrow.dispatchedAt = Date.now();
    return escrow;
  }

  // F8: Inspection Window Countdown (48h)
  public startInspectionWindow(escrowId: string, windowHours: number = 48): EscrowModel {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) throw new Error('Escrow not found.');
    if (escrow.status !== 'dispatched') throw new Error('Item must be dispatched before inspection starts.');

    escrow.status = 'inspecting';
    escrow.inspectionDeadline = Date.now() + windowHours * 3600_000;
    return escrow;
  }

  // F9: Goods Acceptance & Fund Release
  public acceptGoodsAndRelease(buyerId: string, escrowId: string): EscrowModel {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) throw new Error('Escrow not found.');
    if (escrow.buyerId !== buyerId) throw new Error('Only the buyer can accept goods.');
    if (escrow.status !== 'inspecting') throw new Error('Escrow must be in inspecting state.');

    const buyerLedger = this.getWallet(buyerId, escrow.currency);
    buyerLedger.frozenEscrowBalance -= escrow.totalAmount;

    // Credit seller net payout
    const sellerLedger = this.getWallet(escrow.sellerId, escrow.currency);
    sellerLedger.availableBalance += escrow.sellerPayoutAmount;

    // Platform fee accrual
    this.platformFeeLedger[escrow.currency] += escrow.platformFeeAmount;

    escrow.status = 'completed';
    escrow.releasedAt = Date.now();

    // Increment seller successful deals count
    const seller = this.users.get(escrow.sellerId);
    if (seller) seller.successfulDealsCount++;

    return escrow;
  }

  // F18: Automated Escrow Auto-Release
  public evaluateAutoRelease(escrowId: string): { released: boolean; reason?: string } {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) throw new Error('Escrow not found.');
    if (escrow.status !== 'inspecting') return { released: false, reason: 'Not inspecting' };
    if (!escrow.inspectionDeadline || Date.now() < escrow.inspectionDeadline) {
      return { released: false, reason: 'Inspection window has not expired.' };
    }

    // Auto-release to seller
    const buyerLedger = this.getWallet(escrow.buyerId, escrow.currency);
    buyerLedger.frozenEscrowBalance -= escrow.totalAmount;

    const sellerLedger = this.getWallet(escrow.sellerId, escrow.currency);
    sellerLedger.availableBalance += escrow.sellerPayoutAmount;

    this.platformFeeLedger[escrow.currency] += escrow.platformFeeAmount;

    escrow.status = 'completed';
    escrow.releasedAt = Date.now();

    const seller = this.users.get(escrow.sellerId);
    if (seller) seller.successfulDealsCount++;

    return { released: true, reason: '48h expired without dispute' };
  }

  // F10: Formal Dispute Filing
  public fileDispute(buyerId: string, escrowId: string, reason: string, defectPhotoUrls: string[]): DisputeModel {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) throw new Error('Escrow not found.');
    if (escrow.buyerId !== buyerId) throw new Error('Only buyer can file dispute.');
    if (escrow.status !== 'inspecting') throw new Error('Disputes can only be opened during inspecting phase.');
    if (!reason.trim()) throw new Error('Dispute reason is required.');
    if (!defectPhotoUrls.length) throw new Error('At least one defect evidence photo is required.');

    escrow.status = 'disputed';

    const dispute: DisputeModel = {
      id: `disp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      escrowId,
      buyerId,
      sellerId: escrow.sellerId,
      reason,
      defectPhotoUrls,
      status: 'opened',
      createdAt: Date.now(),
    };
    this.disputes.set(dispute.id, dispute);
    this.disputeMessages.set(dispute.id, [
      {
        id: `msg_sys_01`,
        disputeId: dispute.id,
        senderId: 'system',
        senderRole: 'system',
        message: 'تم فتح غرفة التحكيم الرقمية وتجميد أموال الضمان.',
        timestamp: Date.now(),
      },
    ]);
    return dispute;
  }

  // F11: Digital Arbitration Room Chat
  public postDisputeMessage(disputeId: string, senderId: string, message: string): DisputeChatMessage {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found.');
    if (dispute.status !== 'opened' && dispute.status !== 'under_review') {
      throw new Error('Dispute chat is closed.');
    }
    const sender = this.users.get(senderId);
    if (!sender) throw new Error('Sender not found.');

    const newMsg: DisputeChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      disputeId,
      senderId,
      senderRole: sender.role,
      message,
      timestamp: Date.now(),
    };
    const list = this.disputeMessages.get(disputeId) || [];
    list.push(newMsg);
    this.disputeMessages.set(disputeId, list);
    return newMsg;
  }

  // F42: AI Evidence Difference Analyzer
  public analyzeDisputeEvidence(disputeId: string): { discrepancyFound: boolean; summary: string; recommendedSplit: { buyer: number; seller: number } } {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found.');
    return {
      discrepancyFound: true,
      summary: 'رصد كسر ميكانيكي جوهري غير مذكور في صور ووصف المزاد الأصلي.',
      recommendedSplit: { buyer: 0.3, seller: 0.7 },
    };
  }

  // F43: Binding Arbitration Ruling
  public issueDisputeRuling(
    officerId: string,
    disputeId: string,
    ruling: 'resolved_refund' | 'resolved_payout' | 'resolved_split',
    splitRatio?: { buyer: number; seller: number }
  ): DisputeModel {
    const officer = this.users.get(officerId);
    if (!officer || (officer.role !== 'dispute_officer' && officer.role !== 'super_admin')) {
      throw new Error('Unauthorized: only dispute_officer can issue arbitration rulings.');
    }
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found.');
    const escrow = this.escrows.get(dispute.escrowId);
    if (!escrow) throw new Error('Escrow contract not found.');

    const buyerLedger = this.getWallet(escrow.buyerId, escrow.currency);
    const sellerLedger = this.getWallet(escrow.sellerId, escrow.currency);

    buyerLedger.frozenEscrowBalance -= escrow.totalAmount;

    if (ruling === 'resolved_refund') {
      buyerLedger.availableBalance += escrow.totalAmount;
      escrow.status = 'refunded';
      escrow.refundedAt = Date.now();
    } else if (ruling === 'resolved_payout') {
      sellerLedger.availableBalance += escrow.sellerPayoutAmount;
      this.platformFeeLedger[escrow.currency] += escrow.platformFeeAmount;
      escrow.status = 'completed';
      escrow.releasedAt = Date.now();
    } else if (ruling === 'resolved_split') {
      if (!splitRatio || splitRatio.buyer + splitRatio.seller !== 1.0) {
        throw new Error('Split ratios must sum to 1.0');
      }
      const buyerPart = Math.round(escrow.totalAmount * splitRatio.buyer * 100) / 100;
      const sellerGross = escrow.totalAmount - buyerPart;
      const fee = Math.round(sellerGross * (AUCTION_RULES.PLATFORM_FEE_PERCENT / 100) * 100) / 100;
      const sellerNet = sellerGross - fee;

      buyerLedger.availableBalance += buyerPart;
      sellerLedger.availableBalance += sellerNet;
      this.platformFeeLedger[escrow.currency] += fee;

      dispute.splitBuyerRefund = buyerPart;
      dispute.splitSellerPayout = sellerNet;
      escrow.status = 'completed';
      escrow.releasedAt = Date.now();
    }

    dispute.status = ruling;
    dispute.assignedOfficerId = officerId;
    dispute.resolvedAt = Date.now();

    this.logAudit(officerId, officer.role, 'ARBITRATION_RULING', 'dispute', disputeId, {
      ruling,
      splitRatio,
    });
    return dispute;
  }

  // ============================================================================
  // F23, F24, F25, F27: Procurement & Reverse Tender Workflows
  // ============================================================================
  public uploadContractorCertificate(cert: ContractorCertificate): void {
    if (cert.commercialRegisterExpiry < Date.now()) {
      throw new Error('Commercial register is expired.');
    }
    this.certificates.set(cert.contractorId, { ...cert });
  }

  public reviewSupplierCompliance(contractorId: string): { isCompliant: boolean; score: number } {
    const cert = this.certificates.get(contractorId);
    if (!cert) return { isCompliant: false, score: 0 };
    const valid = cert.isVerified && cert.commercialRegisterExpiry > Date.now() && cert.taxCardExpiry > Date.now();
    return { isCompliant: valid, score: valid ? 95 : 40 };
  }

  public awardConditionalTender(
    issuerId: string,
    tenderId: string,
    supplierId: string,
    conditionsNotice: string
  ): ListingModel {
    const tender = this.listings.get(tenderId);
    if (!tender) throw new Error('Tender not found.');
    if (tender.sellerId !== issuerId) throw new Error('Only the tender issuer can award tenders.');
    if (tender.listingType !== 'reverse_tender') throw new Error('Listing is not a reverse tender.');

    tender.status = 'closed';
    tender.awardedSupplierId = supplierId;
    tender.conditionalAwardNotice = conditionsNotice;
    return tender;
  }

  // ============================================================================
  // F48: Audit Logging
  // ============================================================================
  public logAudit(
    actorId: string,
    actorRole: UserRole,
    action: string,
    targetType: AuditLogEntry['targetType'],
    targetId: string,
    details: Record<string, unknown>
  ): void {
    this.auditLogs.push({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      details,
      timestamp: Date.now(),
    });
  }

  public queryAuditLogs(filter: { targetId?: string; actorId?: string; action?: string }): AuditLogEntry[] {
    let res = this.auditLogs;
    if (filter.targetId) res = res.filter((l) => l.targetId === filter.targetId);
    if (filter.actorId) res = res.filter((l) => l.actorId === filter.actorId);
    if (filter.action) res = res.filter((l) => l.action === filter.action);
    return res;
  }
}
