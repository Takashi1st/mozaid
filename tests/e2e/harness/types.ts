/**
 * Domain Types & Interfaces for Mozaid AI E2E Testing Harness
 * Directly mapped to PROJECT.md, docs/PRD.md, and docs/DATABASE_SCHEMA.sql
 */

export type UserRole =
  | 'bidder'
  | 'seller'
  | 'contractor'
  | 'moderator'
  | 'finance_admin'
  | 'dispute_officer'
  | 'super_admin';

export type KYCStatus = 'unverified' | 'pending_review' | 'verified' | 'rejected';

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

export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'canceled';

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

export interface UserAccount {
  id: string;
  phoneNumber: string;
  fullName: string;
  role: UserRole;
  city: string;
  kycStatus: KYCStatus;
  reputationScore: number;
  successfulDealsCount: number;
  isTrustedSeller: boolean;
  isBanned: boolean;
  deviceFingerprint?: string;
  nationalIdNumber?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  selfieUrl?: string;
}

export interface WalletLedger {
  userId: string;
  currency: Currency;
  availableBalance: number;
  frozenEscrowBalance: number;
}

export interface DepositVoucher {
  id: string;
  userId: string;
  channel: PaymentChannel;
  amount: number;
  currency: Currency;
  transferRef: string;
  receiptUrl: string;
  status: TransactionStatus;
  adminId?: string;
  rejectionReason?: string;
  createdAt: number;
  processedAt?: number;
}

export interface ListingModel {
  id: string;
  sellerId: string;
  title: string;
  category: string;
  listingType: ListingType;
  status: ListingStatus;
  currency: Currency;
  startingPrice: number;
  reservePrice?: number;
  currentPrice: number;
  minBidIncrement: number;
  buyNowPrice?: number;
  requiredDepositAmount: number;
  startsAt: number;
  endsAt: number;
  timesExtended: number;
  description: string;
  city: string;
  inspectionWindowHours: number;
  images: string[];
  specs?: Record<string, unknown>;
  isModerationApproved: boolean;
  budgetCeiling?: number; // for reverse tenders
  qualificationCriteria?: string[];
  awardedSupplierId?: string;
  conditionalAwardNotice?: string;
}

export interface BidRecord {
  id: string;
  listingId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: number;
  ipAddress?: string;
  deviceFingerprint?: string;
  isWinning: boolean;
  isAnonymous?: boolean;
}

export interface EscrowModel {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  platformFeeAmount: number;
  sellerPayoutAmount: number;
  currency: Currency;
  status: EscrowStatus;
  createdAt: number;
  inspectionDeadline?: number;
  dispatchedAt?: number;
  releasedAt?: number;
  refundedAt?: number;
}

export interface DisputeModel {
  id: string;
  escrowId: string;
  buyerId: string;
  sellerId: string;
  reason: string;
  defectPhotoUrls: string[];
  status: DisputeStatus;
  assignedOfficerId?: string;
  aiComparisonSummary?: string;
  splitBuyerRefund?: number;
  splitSellerPayout?: number;
  createdAt: number;
  resolvedAt?: number;
}

export interface DisputeChatMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderRole: UserRole | 'system';
  message: string;
  timestamp: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetType: 'listing' | 'escrow' | 'wallet' | 'user' | 'dispute' | 'bid';
  targetId: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface ContractorCertificate {
  contractorId: string;
  commercialRegisterNumber: string;
  commercialRegisterExpiry: number;
  taxCardNumber: string;
  taxCardExpiry: number;
  engineeringLicenseNumber: string;
  engineeringLicenseExpiry: number;
  isVerified: boolean;
}

export interface RealtimeRoomEvent {
  type:
    | 'USER_JOINED'
    | 'USER_LEFT'
    | 'NEW_BID'
    | 'AUCTION_EXTENDED'
    | 'AUCTION_PAUSED'
    | 'AUCTION_RESUMED'
    | 'BID_ROLLED_BACK'
    | 'AUCTION_CLOSED'
    | 'TIMER_SYNC';
  listingId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}
