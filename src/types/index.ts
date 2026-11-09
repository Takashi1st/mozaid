/**
 * ============================================================================
 * أنواع البيانات الشاملة لمنصة مزايد (Mozaid AI Core Type Definitions)
 * مطابقة لسكيما قاعدة البيانات (PostgreSQL) ومواصفات العقود البرمجية
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. الأنواع المخصصة والقيم المحددة (Enums & Literal Unions)
// ----------------------------------------------------------------------------

export type UserRole =
  | 'bidder'
  | 'seller'
  | 'contractor'
  | 'moderator'
  | 'finance_admin'
  | 'dispute_officer'
  | 'super_admin';

export type KYCStatus = 'unverified' | 'pending_review' | 'verified' | 'rejected';

/**
 * مستويات التوثيق الثلاثة المعتمدة بالمنصة:
 * 1. tier1_phone: المستخدم العادي الذي يسجل برقم الهاتف
 * 2. tier2_id_liveness: من يتحقق بالهوية الحية (البطاقة الشخصية + صورة سيلفي حية)
 * 3. tier3_elite_trader: يمنح تلقائياً عند إتمام 10 صفقات سواء كان بيعاً أم شراءً
 */
export type VerificationTier = 'tier1_phone' | 'tier2_id_liveness' | 'tier3_elite_trader';

export type ListingType = 'forward_auction' | 'reverse_tender';

export type ListingStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'paused'
  | 'extended'
  | 'closed'
  | 'canceled'
  | 'disputed';

export type Currency = 'YER' | 'USD' | 'SAR';

export type PaymentChannel =
  | 'kuraimi_bank'
  | 'one_cash'
  | 'jwali'
  | 'floosak'
  | 'cash_wallet'
  | 'al_najm'
  | 'al_omqy'
  | 'internal_balance';

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'bid_deposit_hold'
  | 'bid_deposit_refund'
  | 'escrow_lock'
  | 'escrow_release'
  | 'escrow_refund'
  | 'platform_fee';

export type TransactionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'canceled';

export type EscrowStatus =
  | 'holding'
  | 'dispatched'
  | 'inspecting'
  | 'completed'
  | 'disputed'
  | 'refunded';

export type DisputeStatus =
  | 'opened'
  | 'under_review'
  | 'resolved_refund'
  | 'resolved_payout'
  | 'resolved_split'
  | 'dismissed';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ViolationType =
  | 'SHILL_BIDDING'
  | 'INAPPROPRIATE_MEDIA'
  | 'COLLUSION'
  | 'UNAUTHORIZED_ACCESS'
  | 'SUSPICIOUS_PAYMENT';

export type AuditActionType =
  | 'PAUSE_AUCTION'
  | 'RESUME_AUCTION'
  | 'ROLLBACK_BID'
  | 'EXTEND_AUCTION'
  | 'APPROVE_KYC'
  | 'REJECT_KYC'
  | 'APPROVE_DEPOSIT'
  | 'REJECT_DEPOSIT'
  | 'RESOLVE_DISPUTE'
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'MANUAL_PAYOUT';

export type YemenCarrier = 'YemenMobile' | 'YOU' | 'Sabafon' | 'Y' | 'Unknown';

// ----------------------------------------------------------------------------
// 2. الكيانات الأساسية (Database Models & Domain Entities)
// ----------------------------------------------------------------------------

/**
 * ملف المستخدم والتوثيق (User Profile & KYC)
 */
export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  phoneNumber: string;
  phoneVerifiedAt?: string;
  role: UserRole;
  avatarUrl?: string;
  kycStatus: KYCStatus;
  verificationTier?: VerificationTier;
  totalCompletedDeals?: number;
  nationalIdNumber?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  selfieUrl?: string;
  kycRejectionReason?: string;
  kycVerifiedAt?: string;
  kycVerifiedBy?: string;
  city: string;
  addressDetails?: string;
  reputationScore: number;
  successfulDealsCount: number;
  isTrustedSeller: boolean;
  isBanned: boolean;
  banReason?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * تصنيفات المزادات والمناقصات (Categories)
 */
export interface Category {
  id: number;
  nameAr: string;
  nameEn?: string;
  slug: string;
  parentId?: number | null;
  iconName?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

/**
 * عنصر المزاد أو المناقصة (Listing Item)
 */
export interface ListingItem {
  id: string;
  userId: string;
  categoryId: number;
  title: string;
  slug: string;
  listingType: ListingType;
  status: ListingStatus;
  currency: Currency;
  startingPrice: number;
  reservePrice?: number;
  currentPrice: number;
  minBidIncrement: number;
  buyNowPrice?: number;
  requiredDepositAmount: number;
  startsAt: string;
  endsAt: string;
  originalEndsAt?: string;
  antiSnipingTriggerSeconds?: number;
  antiSnipingExtensionSeconds?: number;
  timesExtended: number;
  description: string;
  aiGeneratedSpecs?: Record<string, unknown>;
  itemCondition: string;
  locationCity: string;
  locationLatitude?: number;
  locationLongitude?: number;
  inspectionWindowHours: number;
  deliveryType?: 'pickup' | 'shipping' | string;
  winningBidderId?: string;
  winningBidId?: string;
  winningAmount?: number;
  totalBidsCount: number;
  viewsCount: number;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * وسائط وصور السلعة (Listing Media)
 */
export interface ListingMedia {
  id: string;
  listingId: string;
  fileUrl: string;
  mediaType: 'image' | 'video' | 'document';
  isCover: boolean;
  displayOrder: number;
  aiModerationLabels?: Record<string, unknown>;
  createdAt?: string;
}

/**
 * سجل المزايدة اللحظية (Realtime Bid)
 */
export interface RealtimeBid {
  id: string;
  listingId: string;
  bidderId: string;
  bidderName: string;
  bidderReputation: number;
  amount: number;
  isWinningBid: boolean;
  isExtensionTrigger: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  isFlaggedShill?: boolean;
  shillConfidenceScore?: number;
  createdAt: string;
}

/**
 * المحفظة الرقمية للمستخدم (User Wallet)
 */
export interface Wallet {
  id: string;
  userId: string;
  availableBalance: number;
  frozenEscrowBalance: number;
  currency: Currency;
  updatedAt: string;
}

export type WalletRecord = Wallet;

/**
 * سجل المعاملة المالية (Financial Transaction)
 */
export interface Transaction {
  id: string;
  walletId: string;
  userId?: string;
  listingId?: string | null;
  type: TransactionType;
  status: TransactionStatus;
  channel: PaymentChannel;
  amount: number;
  currency: Currency;
  transferReferenceNumber?: string;
  senderName?: string;
  senderPhone?: string;
  receiptImageUrl?: string;
  adminNotes?: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export type TransactionRecord = Transaction;

/**
 * سند إيداع مقدم من المزايد (Payment Deposit Receipt)
 */
export interface PaymentReceipt {
  id?: string;
  transactionId?: string;
  userId: string;
  channel: PaymentChannel;
  amount: number;
  currency: Currency;
  transferRef: string;
  senderName?: string;
  senderPhone?: string;
  receiptUrl: string;
  submittedAt?: string;
}

/**
 * عقد الضمان والوساطة المالية (Escrow Contract)
 */
export interface EscrowContract {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  currency?: Currency;
  platformFeePercent?: number;
  platformFeeAmount: number;
  sellerPayoutAmount: number;
  status: EscrowStatus;
  dispatchedAt?: string;
  inspectionDeadline?: string;
  deliveredConfirmedAt?: string;
  fundsReleasedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * تفاصيل الحساب المالي للضمان (Escrow Breakdown)
 */
export interface EscrowFinancialBreakdown {
  totalAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  sellerPayoutAmount: number;
}

/**
 * سجل النزاع والتحكيم (Dispute Record)
 */
export interface DisputeRecord {
  id: string;
  escrowId: string;
  openedBy: string;
  assignedOfficerId?: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  aiArbitrationSummary?: string;
  aiRecommendedAction?: string;
  aiConfidenceScore?: number;
  resolutionNotes?: string;
  refundAmountBuyer: number;
  payoutAmountSeller: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * رسائل غرفة التحكيم الرقمية (Dispute Message)
 */
export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderName?: string;
  senderRole?: UserRole;
  message: string;
  attachmentUrl?: string;
  isStaffInternalNote: boolean;
  createdAt: string;
}

/**
 * سجل الرقابة والتدقيق الإداري (Audit Log)
 */
export interface AuditLog {
  id: string;
  adminId: string;
  adminName?: string;
  actionType: AuditActionType | string;
  targetTable: string;
  targetId: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

/**
 * سجل مخاطر وتحذيرات الذكاء الاصطناعي (AI Risk Log)
 */
export interface AIRiskLog {
  id: string;
  listingId?: string;
  bidId?: string;
  suspectUserId?: string;
  riskLevel: RiskLevel;
  violationType: ViolationType | string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// 3. عقود المحاكاة والخدمات الخارجية (Simulation & External Services)
// ----------------------------------------------------------------------------

export interface AuctionSpecsParams {
  briefDescription: string;
  images?: string[];
  imageBase64?: string;
}

/**
 * نتيجة تحليل ومواصفات السلعة بالذكاء الاصطناعي (Gemini Vision / Specs)
 */
export interface AuctionSpecsResult {
  title: string;
  category: string;
  estimatedMarketValue: number;
  recommendedStartingPrice: number;
  recommendedMinBidIncrement: number;
  condition: string;
  specificationsTable: Record<string, string>;
  warrantyAndInspectionTerms: string;
  rawResponse?: string;
  rawText?: string;
  isSimulated?: boolean;
}

export interface TenderRFPParams {
  title: string;
  rawRequirements: string;
  category?: string;
  currency?: Currency;
}

/**
 * نتيجة توليد كراسة الشروط والمناقصة (Gemini RFP Generator)
 */
export interface TenderRFPResult {
  markdownContent: string;
  rfpMarkdown?: string;
  summary?: string;
  title: string;
  estimatedBudget?: number;
  currency?: Currency;
  submissionDeadlineDays?: number;
  scopeOfWork?: string;
  technicalSpecifications?: string[];
  financialTerms?: string;
  evaluationCriteria?: string[] | Array<{ criterion: string; weight: number }>;
  isSimulated?: boolean;
}

/**
 * بيانات القياس عن بُعد للمزايدة لفحص الاحتيال (Telemetry Data)
 */
export interface BiddingTelemetry {
  bidderId: string;
  amount: number;
  ipAddress: string;
  secondsBeforeEnd: number;
  userAgent?: string;
  deviceFingerprint?: string;
  bidTime?: string;
  timestamp?: string;
}

export interface ShillBiddingParams {
  listingId?: string;
  bids: BiddingTelemetry[];
  sellerId?: string;
  sellerIp?: string;
}

/**
 * نتيجة فحص التلاعب والمزايدة الوهمية (Shill Bidding Risk Analysis)
 */
export interface ShillBiddingAnalysisResult {
  isSuspicious: boolean;
  confidenceScore: number; // 0.0 - 1.0
  riskLevel: RiskLevel;
  reasons: string[];
  recommendedAction: 'CANCEL_BID' | 'FREEZE_ACCOUNT' | 'ALLOW_MONITOR' | 'DISMISS' | string;
  analyzedBidsCount?: number;
  detectedAnomalies?: {
    sellerIpMatches: number;
    ipClusteringCount: number;
    lastSecondBidsCount: number;
  };
  isSimulated?: boolean;
}

/**
 * نتيجة التحقق من رقم الهاتف اليمني (Yemeni Phone Validation)
 */
export interface PhoneValidationResult {
  isValid: boolean;
  carrier: YemenCarrier;
  normalized: string;
  carrierNameAr: string;
}

/**
 * نتيجة إرسال رمز التحقق OTP
 */
export interface SendOtpResult {
  success: boolean;
  verificationId: string;
  simulatedCode?: string;
  carrier?: YemenCarrier;
  error?: string;
}

/**
 * نتيجة مطابقة رمز التحقق OTP
 */
export interface VerifyOtpResult {
  success: boolean;
  error?: string;
}

/**
 * معاملات تقديم سند إيداع مالي
 */
export interface SubmitDepositVoucherParams {
  userId: string;
  channel: PaymentChannel;
  amount: number;
  currency: Currency;
  transferRef: string;
  receiptUrl: string;
  senderName?: string;
  senderPhone?: string;
}

export interface VerifyDepositVoucherParams {
  transactionId: string;
  adminId: string;
  approved: boolean;
  rejectionReason?: string;
  notes?: string;
  adminNotes?: string;
}

/**
 * نتيجة مراجعة وتدقيق سند الإيداع
 */
export interface VerifyDepositVoucherResult {
  success: boolean;
  newBalance?: number;
  transaction?: Transaction;
  error?: string;
}

// ----------------------------------------------------------------------------
// 4. عقود الغرف اللحظية (Real-Time WebSocket Room Contracts)
// ----------------------------------------------------------------------------

export interface RoomParticipant {
  userId: string;
  name: string;
  role: string;
  socketId: string;
  joinedAt: string;
}

export interface RoomState {
  listingId: string;
  currentPrice: number;
  endsAt: string;
  status: ListingStatus;
  timesExtended: number;
  highestBidderId?: string;
  highestBidderName?: string;
  participantsCount: number;
  bids: RealtimeBid[];
}

export interface BidResult {
  success: boolean;
  bid?: RealtimeBid;
  newEndsAt?: string;
  timesExtended?: number;
  isAntiSnipingTriggered?: boolean;
  error?: string;
}

export interface ReverseBidResult {
  success: boolean;
  lowestBidAmount?: number;
  totalBidsCount?: number;
  error?: string;
}

export interface RollbackResult {
  success: boolean;
  restoredPrice?: number;
  restoredBidderId?: string;
  error?: string;
}

export interface BidValidationResult {
  isValid: boolean;
  errorMessage?: string;
  isAntiSnipingTriggered: boolean;
  newEndsAt?: Date;
  nextMinimumBid: number;
}
