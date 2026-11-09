/**
 * ============================================================================
 * محرك غرف المزايدة والمناقصات اللحظية (Real-Time Auction & Tender Room Engine)
 * منصة مزايد (Mozaid AI) — المكون الأساسي لـ WebSockets Realtime
 * ============================================================================
 */

import { AUCTION_RULES } from '../constants';
import { validateForwardBid, validateReverseTenderBid } from '../auction-engine';
import {
  ListingItem,
  ListingStatus,
  ListingType,
  RealtimeBid,
  RoomParticipant,
  RoomState,
  BidResult,
  ReverseBidResult,
  RollbackResult,
  Currency,
} from '../../types';

export type RoomEventType =
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'NEW_BID'
  | 'AUCTION_EXTENDED'
  | 'AUCTION_PAUSED'
  | 'AUCTION_RESUMED'
  | 'BID_ROLLED_BACK'
  | 'AUCTION_CLOSED'
  | 'TIMER_SYNC';

export interface RealtimeRoomEvent {
  type: RoomEventType;
  listingId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface RoomSnapshot {
  listingId: string;
  currentPrice: number;
  endsAt: string;
  serverTime: number;
  remainingSeconds: number;
  status: ListingStatus;
  timesExtended: number;
  highestBidderId?: string;
  highestBidderName?: string;
  viewerCount: number;
  activeBiddersCount: number;
  bids: RealtimeBid[];
  minBidIncrement: number;
  currency: Currency;
  isPaused: boolean;
  listingType: ListingType;
}

export interface ManagedRoom {
  listing: ListingItem;
  participants: Map<string, RoomParticipant>; // socketId -> participant
  bids: RealtimeBid[];
  anonymousSupplierHandles: Map<string, string>; // supplierId -> 'المورد #N'
  pausedAt: number | null;
  pauseReason: string | null;
}

type EventListener = (event: RealtimeRoomEvent) => void;

/**
 * مدير غرف المزادات اللحظي (Auction Room Manager)
 * يدير حالة الغرف، العطاءات التنافسية، تمديدات مكافحة القنص، والمناقصات العكسية.
 */
export class AuctionRoomManager {
  private rooms: Map<string, ManagedRoom> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private listeners: Map<string, Set<EventListener>> = new Map();
  private globalListeners: Set<EventListener> = new Set();

  /**
   * تسجيل أو تهيئة مزاد في المحرك اللحظي
   */
  public registerListing(listing: ListingItem): ManagedRoom {
    const existing = this.rooms.get(listing.id);
    if (existing) {
      existing.listing = { ...existing.listing, ...listing };
      return existing;
    }

    const room: ManagedRoom = {
      listing: { ...listing },
      participants: new Map(),
      bids: [],
      anonymousSupplierHandles: new Map(),
      pausedAt: null,
      pauseReason: null,
    };

    this.rooms.set(listing.id, room);
    return room;
  }

  /**
   * استرجاع غرفة موجودة أو تهيئتها افتراضياً
   */
  private getOrCreateRoom(listingId: string): ManagedRoom {
    let room = this.rooms.get(listingId);
    if (!room) {
      const now = new Date();
      const defaultEndsAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      const defaultListing: ListingItem = {
        id: listingId,
        userId: 'system_seller',
        categoryId: 1,
        title: `مزاد ${listingId}`,
        slug: `listing-${listingId}`,
        listingType: 'forward_auction',
        status: 'active',
        currency: 'YER',
        startingPrice: 100000,
        currentPrice: 100000,
        minBidIncrement: 5000,
        requiredDepositAmount: 10000,
        startsAt: now.toISOString(),
        endsAt: defaultEndsAt,
        timesExtended: 0,
        description: 'مزاد افتراضي مهيأ تلقائياً',
        itemCondition: 'used_good',
        locationCity: 'صنعاء',
        inspectionWindowHours: 48,
        totalBidsCount: 0,
        viewsCount: 1,
        images: [],
      };
      room = this.registerListing(defaultListing);
    }
    return room;
  }

  /**
   * انضمام مستخدم إلى غرفة المزاد اللحظية (Presence & Viewer Tracking)
   */
  public joinRoom(
    socketId: string,
    listingId: string,
    user: { userId: string; role: string; name: string }
  ): RoomState {
    const room = this.getOrCreateRoom(listingId);

    const participant: RoomParticipant = {
      userId: user.userId,
      name: user.name,
      role: user.role,
      socketId,
      joinedAt: new Date().toISOString(),
    };

    room.participants.set(socketId, participant);
    this.socketToRoom.set(socketId, listingId);
    room.listing.viewsCount = Math.max(room.listing.viewsCount, room.participants.size);

    const uniqueUsersCount = new Set(
      Array.from(room.participants.values()).map((p) => p.userId)
    ).size;

    this.emitEvent({
      type: 'USER_JOINED',
      listingId,
      payload: {
        userId: user.userId,
        userName: user.name,
        role: user.role,
        viewerCount: room.participants.size,
        uniqueUsersCount,
      },
      timestamp: Date.now(),
    });

    return this.getRoomState(listingId)!;
  }

  /**
   * مغادرة مستخدم من غرفة المزاد
   */
  public leaveRoom(socketId: string): void {
    const listingId = this.socketToRoom.get(socketId);
    if (!listingId) return;

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(listingId);
    if (!room) return;

    const participant = room.participants.get(socketId);
    if (participant) {
      room.participants.delete(socketId);

      const uniqueUsersCount = new Set(
        Array.from(room.participants.values()).map((p) => p.userId)
      ).size;

      this.emitEvent({
        type: 'USER_LEFT',
        listingId,
        payload: {
          socketId,
          userId: participant.userId,
          viewerCount: room.participants.size,
          uniqueUsersCount,
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * تقديم مزايدة جديدة في المزاد التصاعدي مع تطبيق قواعد مكافحة القنص (Anti-Sniping)
   */
  public submitBid(
    listingId: string,
    bid: {
      bidderId: string;
      amount: number;
      bidderName: string;
      ipAddress?: string;
      deviceFingerprint?: string;
    }
  ): BidResult {
    const room = this.rooms.get(listingId);
    if (!room) {
      return { success: false, error: 'غرفة المزاد غير موجودة.' };
    }

    const currentHighest = room.bids.find((b) => b.isWinningBid) || room.bids[0];

    // 1. التحقق الفوري باستخدام محرك القواعد
    const validation = validateForwardBid(
      room.listing,
      bid.bidderId,
      bid.amount,
      currentHighest
    );

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errorMessage || 'المزايدة غير صالحة وفقاً لشروط المزاد.',
      };
    }

    const now = Date.now();
    const endsAtMs = new Date(room.listing.endsAt).getTime();
    const remainingSeconds = Math.floor((endsAtMs - now) / 1000);

    // 2. التحقق من تمديد مكافحة القنص (Anti-Sniping Dynamic Candle Extension)
    let isAntiSnipingTriggered = false;
    if (
      remainingSeconds <= AUCTION_RULES.ANTI_SNIPING_TRIGGER_WINDOW_SECONDS &&
      room.listing.timesExtended < AUCTION_RULES.MAX_TIMES_EXTENDED
    ) {
      isAntiSnipingTriggered = true;
      room.listing.timesExtended++;
      const newEndsAt = new Date(
        endsAtMs + AUCTION_RULES.ANTI_SNIPING_EXTENSION_SECONDS * 1000
      ).toISOString();

      room.listing.endsAt = newEndsAt;
      room.listing.status = 'extended';

      this.emitEvent({
        type: 'AUCTION_EXTENDED',
        listingId,
        payload: {
          timesExtended: room.listing.timesExtended,
          newEndsAt,
          extensionSeconds: AUCTION_RULES.ANTI_SNIPING_EXTENSION_SECONDS,
          triggerBidderId: bid.bidderId,
          reason: 'anti_sniping',
        },
        timestamp: now,
      });
    }

    // 3. إلغاء صفة الفوز عن العطاءات السابقة
    for (const existingBid of room.bids) {
      existingBid.isWinningBid = false;
    }

    // 4. إنشاء وتوثيق سجل المزايدة اللحظية
    const newBid: RealtimeBid = {
      id: `bid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      listingId,
      bidderId: bid.bidderId,
      bidderName: bid.bidderName,
      bidderReputation: 5.0,
      amount: bid.amount,
      isWinningBid: true,
      isExtensionTrigger: isAntiSnipingTriggered,
      ipAddress: bid.ipAddress || '127.0.0.1',
      deviceFingerprint: bid.deviceFingerprint,
      createdAt: new Date().toISOString(),
    };

    room.bids.unshift(newBid);
    room.listing.currentPrice = bid.amount;
    room.listing.winningBidderId = bid.bidderId;
    room.listing.winningBidId = newBid.id;
    room.listing.winningAmount = bid.amount;
    room.listing.totalBidsCount = room.bids.length;

    // 5. بث الأحداث للغرفة
    this.emitEvent({
      type: 'NEW_BID',
      listingId,
      payload: {
        bid: newBid,
        currentPrice: bid.amount,
        highestBidderId: bid.bidderId,
        highestBidderName: bid.bidderName,
        totalBidsCount: room.bids.length,
      },
      timestamp: now,
    });

    this.emitEvent({
      type: 'TIMER_SYNC',
      listingId,
      payload: {
        endsAt: room.listing.endsAt,
        serverTime: now,
        remainingSeconds: Math.max(
          0,
          Math.floor((new Date(room.listing.endsAt).getTime() - now) / 1000)
        ),
      },
      timestamp: now,
    });

    return {
      success: true,
      bid: newBid,
      newEndsAt: room.listing.endsAt,
      timesExtended: room.listing.timesExtended,
      isAntiSnipingTriggered,
    };
  }

  /**
   * تقديم عطاء في المناقصة العكسية مع حجب هوية المقاول (Anonymous Reverse Tender Bid)
   */
  public submitReverseBid(
    listingId: string,
    bid: { supplierId: string; amount: number }
  ): ReverseBidResult {
    const room = this.rooms.get(listingId);
    if (!room) {
      return { success: false, error: 'المناقصة غير موجودة.' };
    }

    if (room.listing.listingType !== 'reverse_tender') {
      return { success: false, error: 'هذا العنصر ليس مناقصة عكسية.' };
    }

    const validation = validateReverseTenderBid(room.listing, bid.supplierId, bid.amount);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errorMessage || 'قيمة العطاء لا تستوفي شروط التناقص في المناقصة.',
      };
    }

    // توليد أو جلب الاسم المستعار للمورد (المورد #1، المورد #2...) لضمان التكتم الكامل
    let maskedHandle = room.anonymousSupplierHandles.get(bid.supplierId);
    if (!maskedHandle) {
      const nextIndex = room.anonymousSupplierHandles.size + 1;
      maskedHandle = `المورد #${nextIndex}`;
      room.anonymousSupplierHandles.set(bid.supplierId, maskedHandle);
    }

    for (const existingBid of room.bids) {
      existingBid.isWinningBid = false;
    }

    const newBid: RealtimeBid = {
      id: `rbid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      listingId,
      bidderId: bid.supplierId,
      bidderName: maskedHandle,
      bidderReputation: 5.0,
      amount: bid.amount,
      isWinningBid: true,
      isExtensionTrigger: false,
      createdAt: new Date().toISOString(),
    };

    room.bids.unshift(newBid);
    room.listing.currentPrice = bid.amount;
    room.listing.winningBidderId = bid.supplierId;
    room.listing.winningBidId = newBid.id;
    room.listing.winningAmount = bid.amount;
    room.listing.totalBidsCount = room.bids.length;

    // بث العرض الأقل مجهول الهوية إلى جميع المشتركين دون كشف اسم المقاول
    this.emitEvent({
      type: 'NEW_BID',
      listingId,
      payload: {
        anonymousBid: {
          id: newBid.id,
          listingId: newBid.listingId,
          amount: newBid.amount,
          bidderName: maskedHandle,
          isWinning: true,
          createdAt: newBid.createdAt,
        },
        lowestPrice: bid.amount,
        totalBidsCount: room.bids.length,
      },
      timestamp: Date.now(),
    });

    return {
      success: true,
      lowestBidAmount: bid.amount,
      totalBidsCount: room.bids.length,
    };
  }

  /**
   * إيقاف المزاد اضطرارياً بواسطة الإدارة (Emergency Pause)
   */
  public pauseAuction(listingId: string, adminId: string, reason: string): boolean {
    const room = this.rooms.get(listingId);
    if (!room || room.listing.status === 'paused') return false;

    room.listing.status = 'paused';
    room.pausedAt = Date.now();
    room.pauseReason = reason;

    this.emitEvent({
      type: 'AUCTION_PAUSED',
      listingId,
      payload: {
        adminId,
        reason,
        pausedAt: room.pausedAt,
      },
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * استئناف المزاد المتوقف بواسطة الإدارة (Emergency Resume)
   */
  public resumeAuction(listingId: string, adminId: string): boolean {
    const room = this.rooms.get(listingId);
    if (!room || room.listing.status !== 'paused') return false;

    // تعويض الوقت الذي مضى أثناء التوقف لضمان عدالة المنافسة
    if (room.pausedAt) {
      const pausedDurationMs = Date.now() - room.pausedAt;
      const previousEndsAtMs = new Date(room.listing.endsAt).getTime();
      room.listing.endsAt = new Date(previousEndsAtMs + pausedDurationMs).toISOString();
      room.pausedAt = null;
      room.pauseReason = null;
    }

    room.listing.status = room.listing.timesExtended > 0 ? 'extended' : 'active';

    this.emitEvent({
      type: 'AUCTION_RESUMED',
      listingId,
      payload: {
        adminId,
        endsAt: room.listing.endsAt,
        resumedAt: Date.now(),
      },
      timestamp: Date.now(),
    });

    this.emitEvent({
      type: 'TIMER_SYNC',
      listingId,
      payload: {
        endsAt: room.listing.endsAt,
        serverTime: Date.now(),
      },
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * التراجع عن عطاء خاطئ وإعادة السعر السابق (Bid Rollback)
   */
  public rollbackBid(listingId: string, bidId: string, adminId: string): RollbackResult {
    const room = this.rooms.get(listingId);
    if (!room) {
      return { success: false, error: 'غرفة المزاد غير موجودة.' };
    }

    const bidIndex = room.bids.findIndex((b) => b.id === bidId);
    if (bidIndex === -1) {
      return { success: false, error: 'العطاء المحدد غير موجود للتراجع عنه.' };
    }

    room.bids.splice(bidIndex, 1);

    const prevBid = room.bids[0];
    let restoredPrice = room.listing.startingPrice;
    let restoredBidderId: string | undefined = undefined;

    if (prevBid) {
      prevBid.isWinningBid = true;
      restoredPrice = prevBid.amount;
      restoredBidderId = prevBid.bidderId;
      room.listing.currentPrice = restoredPrice;
      room.listing.winningBidderId = restoredBidderId;
      room.listing.winningBidId = prevBid.id;
      room.listing.winningAmount = restoredPrice;
    } else {
      room.listing.currentPrice = restoredPrice;
      room.listing.winningBidderId = undefined;
      room.listing.winningBidId = undefined;
      room.listing.winningAmount = undefined;
    }

    room.listing.totalBidsCount = room.bids.length;

    this.emitEvent({
      type: 'BID_ROLLED_BACK',
      listingId,
      payload: {
        canceledBidId: bidId,
        restoredPrice,
        restoredBidderId,
        adminId,
      },
      timestamp: Date.now(),
    });

    return {
      success: true,
      restoredPrice,
      restoredBidderId,
    };
  }

  /**
   * تمديد مدة المزاد يدوياً بواسطة الإدارة (Manual Time Extension)
   */
  public extendAuction(
    listingId: string,
    additionalSeconds: number,
    adminId: string
  ): boolean {
    const room = this.rooms.get(listingId);
    if (!room || additionalSeconds <= 0) return false;

    const currentEndsAtMs = new Date(room.listing.endsAt).getTime();
    room.listing.endsAt = new Date(currentEndsAtMs + additionalSeconds * 1000).toISOString();
    room.listing.timesExtended++;
    room.listing.status = 'extended';

    this.emitEvent({
      type: 'AUCTION_EXTENDED',
      listingId,
      payload: {
        manual: true,
        extraSeconds: additionalSeconds,
        newEndsAt: room.listing.endsAt,
        adminId,
      },
      timestamp: Date.now(),
    });

    this.emitEvent({
      type: 'TIMER_SYNC',
      listingId,
      payload: {
        endsAt: room.listing.endsAt,
        serverTime: Date.now(),
      },
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * الشراء الفوري المباشر (Buy-Now Direct Purchase)
   */
  public buyNowDirect(
    listingId: string,
    buyerId: string
  ): { success: boolean; finalPrice?: number; error?: string } {
    const room = this.rooms.get(listingId);
    if (!room) return { success: false, error: 'المزاد غير موجود.' };
    if (!room.listing.buyNowPrice) {
      return { success: false, error: 'خاصية الشراء الفوري غير مفعلة في هذا المزاد.' };
    }
    if (room.listing.status === 'closed' || room.listing.status === 'canceled') {
      return { success: false, error: 'المزاد مغلق بالفعل.' };
    }
    if (buyerId === room.listing.userId) {
      return { success: false, error: 'لا يمكن للبائع شراء سلعته الخاصة.' };
    }

    const finalPrice = room.listing.buyNowPrice;
    room.listing.currentPrice = finalPrice;
    room.listing.winningBidderId = buyerId;
    room.listing.winningAmount = finalPrice;
    room.listing.status = 'closed';

    this.emitEvent({
      type: 'AUCTION_CLOSED',
      listingId,
      payload: {
        winnerId: buyerId,
        finalPrice,
        reason: 'buy_now',
      },
      timestamp: Date.now(),
    });

    return { success: true, finalPrice };
  }

  /**
   * الحصول على الحالة الحالية للغرفة (Room State)
   */
  public getRoomState(listingId: string): RoomState | undefined {
    const room = this.rooms.get(listingId);
    if (!room) return undefined;

    const highestBid = room.bids.find((b) => b.isWinningBid) || room.bids[0];

    return {
      listingId: room.listing.id,
      currentPrice: room.listing.currentPrice,
      endsAt: room.listing.endsAt,
      status: room.listing.status,
      timesExtended: room.listing.timesExtended,
      highestBidderId: room.listing.winningBidderId || highestBid?.bidderId,
      highestBidderName: highestBid?.bidderName,
      participantsCount: room.participants.size,
      bids: [...room.bids],
    };
  }

  /**
   * استخراج لقطة حالة متكاملة عند إعادة الاتصال (State Snapshot on Reconnect)
   */
  public getRoomSnapshot(listingId: string): RoomSnapshot | undefined {
    const room = this.rooms.get(listingId);
    if (!room) return undefined;

    const now = Date.now();
    const endsAtMs = new Date(room.listing.endsAt).getTime();
    const remainingSeconds = Math.max(0, Math.floor((endsAtMs - now) / 1000));
    const highestBid = room.bids.find((b) => b.isWinningBid) || room.bids[0];

    const uniqueBidders = new Set(room.bids.map((b) => b.bidderId)).size;

    return {
      listingId: room.listing.id,
      currentPrice: room.listing.currentPrice,
      endsAt: room.listing.endsAt,
      serverTime: now,
      remainingSeconds,
      status: room.listing.status,
      timesExtended: room.listing.timesExtended,
      highestBidderId: room.listing.winningBidderId || highestBid?.bidderId,
      highestBidderName: highestBid?.bidderName,
      viewerCount: room.participants.size,
      activeBiddersCount: uniqueBidders,
      bids: room.bids.slice(0, 50),
      minBidIncrement: room.listing.minBidIncrement,
      currency: room.listing.currency,
      isPaused: room.listing.status === 'paused',
      listingType: room.listing.listingType,
    };
  }

  /**
   * الاشتراك في أحداث غرفة محددة (Pub/Sub)
   */
  public subscribeToRoom(
    listingId: string,
    listener: EventListener
  ): () => void {
    let roomListeners = this.listeners.get(listingId);
    if (!roomListeners) {
      roomListeners = new Set();
      this.listeners.set(listingId, roomListeners);
    }
    roomListeners.add(listener);

    return () => {
      roomListeners?.delete(listener);
      if (roomListeners && roomListeners.size === 0) {
        this.listeners.delete(listingId);
      }
    };
  }

  /**
   * الاشتراك الشامل في جميع أحداث المنصة (Global Listener for Admin Command Center)
   */
  public subscribeGlobal(listener: EventListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * بث الأحداث للمشتركين المحليين والعموميين
   */
  private emitEvent(event: RealtimeRoomEvent): void {
    const roomListeners = this.listeners.get(event.listingId);
    if (roomListeners) {
      for (const listener of roomListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error(`Error in room listener [${event.listingId}]:`, err);
        }
      }
    }

    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in global room listener:', err);
      }
    }
  }

  /**
   * مسح جميع الغرف والبيانات (للاختبارات أو إعادة التهيئة)
   */
  public reset(): void {
    this.rooms.clear();
    this.socketToRoom.clear();
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// إنشاء النسخة الأحادية للمحرك (Singleton Instance)
export const auctionRoomManager = new AuctionRoomManager();

// ============================================================================
// دوال الواجهة المستقلة المتطابقة مع مواصفات PROJECT.md
// ============================================================================

export function joinRoom(
  socketId: string,
  listingId: string,
  user: { userId: string; role: string; name: string }
): RoomState {
  return auctionRoomManager.joinRoom(socketId, listingId, user);
}

export function leaveRoom(socketId: string): void {
  auctionRoomManager.leaveRoom(socketId);
}

export function submitBid(
  listingId: string,
  bid: {
    bidderId: string;
    amount: number;
    bidderName: string;
    ipAddress?: string;
    deviceFingerprint?: string;
  }
): BidResult {
  return auctionRoomManager.submitBid(listingId, bid);
}

export function submitReverseBid(
  listingId: string,
  bid: { supplierId: string; amount: number }
): ReverseBidResult {
  return auctionRoomManager.submitReverseBid(listingId, bid);
}

export function pauseAuction(
  listingId: string,
  adminId: string,
  reason: string
): boolean {
  return auctionRoomManager.pauseAuction(listingId, adminId, reason);
}

export function resumeAuction(listingId: string, adminId: string): boolean {
  return auctionRoomManager.resumeAuction(listingId, adminId);
}

export function rollbackBid(
  listingId: string,
  bidId: string,
  adminId: string
): RollbackResult {
  return auctionRoomManager.rollbackBid(listingId, bidId, adminId);
}

export function extendAuction(
  listingId: string,
  additionalSeconds: number,
  adminId: string
): boolean {
  return auctionRoomManager.extendAuction(listingId, additionalSeconds, adminId);
}

export function getRoomState(listingId: string): RoomState | undefined {
  return auctionRoomManager.getRoomState(listingId);
}

export function getRoomSnapshot(listingId: string): RoomSnapshot | undefined {
  return auctionRoomManager.getRoomSnapshot(listingId);
}

export function subscribeToRoom(
  listingId: string,
  listener: (event: RealtimeRoomEvent) => void
): () => void {
  return auctionRoomManager.subscribeToRoom(listingId, listener);
}
