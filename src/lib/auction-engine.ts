/**
 * محرك المزادات والمناقصات اللحظي (Mozaid Real-Time Auction Engine)
 * يتولى فحص صحة المزايدة، تطبيق تمديد الوقت (Anti-Sniping)، وحساب الترسية.
 */

import { AUCTION_RULES } from './constants';
import { ListingItem, RealtimeBid } from '../types';

export interface BidValidationResult {
  isValid: boolean;
  errorMessage?: string;
  isAntiSnipingTriggered: boolean;
  newEndsAt?: Date;
  nextMinimumBid: number;
}

/**
 * التحقق الفوري من صحة العرض الجديد في المزاد التصاعدي
 */
export function validateForwardBid(
  listing: ListingItem,
  bidderId: string,
  newBidAmount: number,
  currentHighestBid?: RealtimeBid
): BidValidationResult {
  const now = new Date();
  const endsAt = new Date(listing.endsAt);

  // 1. التحقق من أن المزاد نشط ولم ينته وقته
  if (listing.status !== 'active' && listing.status !== 'extended') {
    return {
      isValid: false,
      errorMessage: 'هذا المزاد غير متاح لتلقي العروض حالياً.',
      isAntiSnipingTriggered: false,
      nextMinimumBid: listing.currentPrice + listing.minBidIncrement,
    };
  }

  if (now.getTime() >= endsAt.getTime()) {
    return {
      isValid: false,
      errorMessage: 'عذراً، لقد انتهى وقت المزاد رسمياً.',
      isAntiSnipingTriggered: false,
      nextMinimumBid: listing.currentPrice,
    };
  }

  // 2. التحقق من أن المزايد ليس هو صاحب المزاد نفسه
  if (bidderId === listing.userId) {
    return {
      isValid: false,
      errorMessage: 'لا يُسمح للبائع بالمزايدة على سلعته الخاصة منعاً للتلاعب.',
      isAntiSnipingTriggered: false,
      nextMinimumBid: listing.currentPrice + listing.minBidIncrement,
    };
  }

  // 3. التحقق من أن المزايد ليس هو صاحب أعلى عرض حالي بالفعل
  if (currentHighestBid && currentHighestBid.bidderId === bidderId) {
    return {
      isValid: false,
      errorMessage: 'أنت صاحب أعلى عرض حالياً بالفعل! انتظر حتى يزايد منافس آخر.',
      isAntiSnipingTriggered: false,
      nextMinimumBid: listing.currentPrice + listing.minBidIncrement,
    };
  }

  // 4. التحقق من أن السعر الجديد يحقق الحد الأدنى للزيادة
  const minimumRequired = listing.currentPrice + listing.minBidIncrement;
  if (newBidAmount < minimumRequired) {
    return {
      isValid: false,
      errorMessage: `قيمة المزايدة يجب ألا تقل عن ${minimumRequired.toLocaleString()} ${listing.currency}`,
      isAntiSnipingTriggered: false,
      nextMinimumBid: minimumRequired,
    };
  }

  // 5. فحص شرط تمديد الوقت لمكافحة القنص (Anti-Sniping Extension)
  const secondsRemaining = Math.floor((endsAt.getTime() - now.getTime()) / 1000);
  let isAntiSnipingTriggered = false;
  let newEndsAt = endsAt;

  if (
    secondsRemaining <= AUCTION_RULES.ANTI_SNIPING_TRIGGER_WINDOW_SECONDS &&
    listing.timesExtended < AUCTION_RULES.MAX_TIMES_EXTENDED
  ) {
    isAntiSnipingTriggered = true;
    newEndsAt = new Date(endsAt.getTime() + AUCTION_RULES.ANTI_SNIPING_EXTENSION_SECONDS * 1000);
  }

  return {
    isValid: true,
    isAntiSnipingTriggered,
    newEndsAt,
    nextMinimumBid: newBidAmount + listing.minBidIncrement,
  };
}

/**
 * التحقق من عرض المناقصة العكسية (Reverse Tender Bid)
 * في المناقصة: العرض الجديد يجب أن يكون أقل من السعر الحالي
 */
export function validateReverseTenderBid(
  listing: ListingItem,
  supplierId: string,
  newBidAmount: number
): BidValidationResult {
  const now = new Date();
  const endsAt = new Date(listing.endsAt);

  if (now.getTime() >= endsAt.getTime() || listing.status !== 'active') {
    return {
      isValid: false,
      errorMessage: 'انتهت فترة تقديم العروض لهذه المناقصة.',
      isAntiSnipingTriggered: false,
      nextMinimumBid: listing.currentPrice,
    };
  }

  if (supplierId === listing.userId) {
    return {
      isValid: false,
      errorMessage: 'لا يمكنك تقديم عرض في مناقصة قمت بطرحها بنفسك.',
      isAntiSnipingTriggered: false,
      nextMinimumBid: listing.currentPrice,
    };
  }

  // السعر يجب أن يكون أقل من السعر الحالي بمقدار خطوة التناقص
  const maximumAllowed = listing.currentPrice - listing.minBidIncrement;
  if (newBidAmount > maximumAllowed) {
    return {
      isValid: false,
      errorMessage: `يجب أن يكون عرضك أقل من ${maximumAllowed.toLocaleString()} ${listing.currency} للتنافس.`,
      isAntiSnipingTriggered: false,
      nextMinimumBid: maximumAllowed,
    };
  }

  return {
    isValid: true,
    isAntiSnipingTriggered: false,
    nextMinimumBid: newBidAmount - listing.minBidIncrement,
  };
}
