'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ListingItem,
  ListingStatus,
  RealtimeBid,
  RoomState,
  BidResult,
  ReverseBidResult,
  RollbackResult,
} from '../types';
import {
  auctionRoomManager,
  RealtimeRoomEvent,
  RoomSnapshot,
} from '../lib/realtime/auction-room';

export interface UseAuctionRoomOptions {
  /**
   * معرف السلعة أو المناقصة
   */
  listingId: string;

  /**
   * بيانات المستخدم الحالي المسجل دخوله
   */
  currentUser?: {
    userId: string;
    name: string;
    role?: string;
  };

  /**
   * البيانات الأولية للمزاد (من Server Component أو Cache)
   */
  initialData?: Partial<ListingItem>;

  /**
   * مسار خادم الـ WebSockets (اختياري)
   */
  serverUrl?: string;

  /**
   * الاتصال التلقائي عند تركيب المكون (الافتراضي: true)
   */
  autoConnect?: boolean;
}

export interface UseAuctionRoomReturn {
  // حالة الغرفة الأساسية
  roomState: RoomState | null;
  currentPrice: number;
  endsAt: string;
  status: ListingStatus;
  bids: RealtimeBid[];
  viewerCount: number;
  activeBiddersCount: number;
  highestBid: RealtimeBid | null;
  highestBidderId?: string;
  highestBidderName?: string;
  timesExtended: number;
  isAntiSnipingExtended: boolean;
  serverOffsetMs: number;
  minBidIncrement: number;
  nextMinimumBid: number;

  // حالة الاتصال والشبكة
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastError: string | null;
  lastBidSuccess: boolean;
  clearError: () => void;

  // إجراءات المزايدة والمناقصة
  placeBid: (amount: number) => Promise<BidResult>;
  quickBid: (increment?: number) => Promise<BidResult>;
  placeReverseBid: (amount: number) => Promise<ReverseBidResult>;

  // لوحة تحكم الإدارة الطارئة (Admin Controls)
  adminPause: (reason?: string) => Promise<boolean>;
  adminResume: () => Promise<boolean>;
  adminRollback: (bidId: string) => Promise<RollbackResult>;
  adminExtend: (seconds: number) => Promise<boolean>;

  // إعادة المزامنة يدوياً
  resync: () => void;
}

/**
 * خطاف إدارة غرفة المزاد الحية (Real-Time Auction & Tender Room Hook)
 * يوفر اتصال Socket.io قوي، مع مزامنة لحظية، مزايدة تفاؤلية (Optimistic Bidding)، ودعم كامل لمكافحة القنص.
 */
export function useAuctionRoom({
  listingId,
  currentUser = {
    userId: 'guest_' + Math.random().toString(36).substring(2, 7),
    name: 'مزايد زائر',
    role: 'bidder',
  },
  initialData,
  serverUrl,
  autoConnect = true,
}: UseAuctionRoomOptions): UseAuctionRoomReturn {
  // الحالة اللحظية للغرفة
  const [currentPrice, setCurrentPrice] = useState<number>(() => {
    return initialData?.currentPrice || initialData?.startingPrice || 100000;
  });

  const [endsAt, setEndsAt] = useState<string>(() => {
    return initialData?.endsAt || new Date(Date.now() + 15 * 60 * 1000).toISOString();
  });

  const [status, setStatus] = useState<ListingStatus>(() => {
    return initialData?.status || 'active';
  });

  const [timesExtended, setTimesExtended] = useState<number>(() => {
    return initialData?.timesExtended || 0;
  });

  const [bids, setBids] = useState<RealtimeBid[]>([]);
  const [viewerCount, setViewerCount] = useState<number>(1);
  const [activeBiddersCount, setActiveBiddersCount] = useState<number>(0);
  const [isAntiSnipingExtended, setIsAntiSnipingExtended] = useState<boolean>(false);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);

  // حالة الاتصال والأخطاء
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(autoConnect);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastBidSuccess, setLastBidSuccess] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const minBidIncrement = initialData?.minBidIncrement || 5000;
  const currency = initialData?.currency || 'YER';

  const clearError = useCallback(() => {
    setLastError(null);
    setConnectionError(null);
  }, []);

  // أعلى عطاء حالي
  const highestBid = useMemo(() => {
    return bids.find((b) => b.isWinningBid) || bids[0] || null;
  }, [bids]);

  const highestBidderId = highestBid?.bidderId || initialData?.winningBidderId;
  const highestBidderName = highestBid?.bidderName;

  // الحد الأدنى للمزايدة القادمة
  const nextMinimumBid = currentPrice + minBidIncrement;

  // كائن حالة الغرفة المتكامل
  const roomState: RoomState = useMemo(() => {
    return {
      listingId,
      currentPrice,
      endsAt,
      status,
      timesExtended,
      highestBidderId,
      highestBidderName,
      participantsCount: viewerCount,
      bids,
    };
  }, [
    listingId,
    currentPrice,
    endsAt,
    status,
    timesExtended,
    highestBidderId,
    highestBidderName,
    viewerCount,
    bids,
  ]);

  // تطبيق لقطة الحالة الكاملة عند إعادة الاتصال
  const applySnapshot = useCallback((snapshot: RoomSnapshot) => {
    setCurrentPrice(snapshot.currentPrice);
    setEndsAt(snapshot.endsAt);
    setStatus(snapshot.status);
    setTimesExtended(snapshot.timesExtended);
    setViewerCount(snapshot.viewerCount);
    setActiveBiddersCount(snapshot.activeBiddersCount);
    setBids(snapshot.bids);
    if (snapshot.timesExtended > 0) {
      setIsAntiSnipingExtended(true);
    }
    const offset = snapshot.serverTime ? Date.now() - snapshot.serverTime : 0;
    setServerOffsetMs(offset);
  }, []);

  // إعادة المزامنة الفورية مع المحرك
  const resync = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        'get_room_state',
        { listingId },
        (res: { success: boolean; snapshot?: RoomSnapshot }) => {
          if (res?.success && res.snapshot) {
            applySnapshot(res.snapshot);
          }
        }
      );
    } else {
      // مزامنة مباشرة مع AuctionRoomManager الداخلي
      const snapshot = auctionRoomManager.getRoomSnapshot(listingId);
      if (snapshot) {
        applySnapshot(snapshot);
      }
    }
  }, [listingId, applySnapshot]);

  // معالجة الأحداث اللحظية الواردة
  const handleRoomEvent = useCallback(
    (event: RealtimeRoomEvent) => {
      if (event.listingId !== listingId) return;

      switch (event.type) {
        case 'NEW_BID': {
          const payload = event.payload;
          if (payload.bid) {
            const incomingBid = payload.bid as RealtimeBid;
            setBids((prev) => [
              incomingBid,
              ...prev.map((b) => ({ ...b, isWinningBid: false })),
            ]);
            setCurrentPrice(incomingBid.amount);
          } else if (payload.anonymousBid) {
            const anonBid = payload.anonymousBid as RealtimeBid;
            setBids((prev) => [
              anonBid,
              ...prev.map((b) => ({ ...b, isWinningBid: false })),
            ]);
            if (typeof payload.lowestPrice === 'number') {
              setCurrentPrice(payload.lowestPrice);
            }
          }
          break;
        }

        case 'AUCTION_EXTENDED': {
          const payload = event.payload;
          if (payload.newEndsAt) {
            setEndsAt(String(payload.newEndsAt));
          }
          if (typeof payload.timesExtended === 'number') {
            setTimesExtended(payload.timesExtended);
          } else {
            setTimesExtended((prev) => prev + 1);
          }
          setStatus('extended');
          setIsAntiSnipingExtended(true);
          break;
        }

        case 'AUCTION_PAUSED': {
          setStatus('paused');
          break;
        }

        case 'AUCTION_RESUMED': {
          const payload = event.payload;
          if (payload.endsAt) {
            setEndsAt(String(payload.endsAt));
          }
          setStatus('active');
          break;
        }

        case 'BID_ROLLED_BACK': {
          const payload = event.payload;
          const canceledId = payload.canceledBidId;
          const restored = Number(payload.restoredPrice);
          setBids((prev) => {
            const filtered = prev.filter((b) => b.id !== canceledId);
            if (filtered.length > 0) {
              filtered[0].isWinningBid = true;
            }
            return filtered;
          });
          if (!isNaN(restored)) {
            setCurrentPrice(restored);
          }
          break;
        }

        case 'AUCTION_CLOSED': {
          setStatus('closed');
          break;
        }

        case 'USER_JOINED': {
          const payload = event.payload;
          if (typeof payload.viewerCount === 'number') {
            setViewerCount(payload.viewerCount);
          }
          break;
        }

        case 'USER_LEFT': {
          const payload = event.payload;
          if (typeof payload.viewerCount === 'number') {
            setViewerCount(payload.viewerCount);
          }
          break;
        }

        case 'TIMER_SYNC': {
          const payload = event.payload;
          if (payload.endsAt) {
            setEndsAt(String(payload.endsAt));
          }
          if (typeof payload.serverTime === 'number') {
            setServerOffsetMs(Date.now() - payload.serverTime);
          }
          break;
        }
      }
    },
    [listingId]
  );

  // إدارة الاتصال عبر WebSockets ومحرك الغرفة الداخلي
  useEffect(() => {
    if (!autoConnect) return;

    let isMounted = true;
    const socketId = 'client_' + Math.random().toString(36).substring(2, 9);

    // 1. تسجيل المستمع الداخلي لـ AuctionRoomManager كقناة احتياطية متزامنة
    const unsubscribeLocal = auctionRoomManager.subscribeToRoom(
      listingId,
      (ev) => {
        if (isMounted) handleRoomEvent(ev);
      }
    );

    // تسجيل انضمام المستخدم في المحرك الداخلي
    const initialLocalState = auctionRoomManager.joinRoom(socketId, listingId, {
      userId: currentUser.userId,
      name: currentUser.name,
      role: currentUser.role || 'bidder',
    });

    if (initialLocalState) {
      setCurrentPrice(initialLocalState.currentPrice);
      setEndsAt(initialLocalState.endsAt);
      setStatus(initialLocalState.status);
      setTimesExtended(initialLocalState.timesExtended);
      setViewerCount(initialLocalState.participantsCount);
      setBids(initialLocalState.bids);
      setIsConnected(true);
      setIsConnecting(false);
    }

    // 2. إذا تم تحديد serverUrl أو وجود بيئة socket.io في المتصفح، تهيئة اتصال Socket.io
    const wsUrl =
      serverUrl ||
      (typeof window !== 'undefined'
        ? (window as unknown as { __MOZAID_WS_URL__?: string }).__MOZAID_WS_URL__ || ''
        : '');

    if (wsUrl) {
      try {
        const socket = io(wsUrl, {
          path: '/api/socket',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          if (!isMounted) return;
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionError(null);

          // الانضمام لغرفة المزاد
          socket.emit(
            'join_room',
            {
              listingId,
              user: currentUser,
            },
            (response: { success: boolean; snapshot?: RoomSnapshot }) => {
              if (response?.success && response.snapshot) {
                applySnapshot(response.snapshot);
              }
            }
          );
        });

        socket.on('disconnect', (reason) => {
          if (!isMounted) return;
          setIsConnected(false);
          if (reason === 'io server disconnect') {
            socket.connect();
          }
        });

        socket.on('connect_error', (err) => {
          if (!isMounted) return;
          setIsConnecting(false);
          setConnectionError(err.message || 'تعذر الاتصال بخادم المزايدة');
        });

        socket.on('reconnect', () => {
          if (!isMounted) return;
          resync();
        });

        // الاستماع لأحداث الغرفة من السوكت
        socket.on('room_event', (event: RealtimeRoomEvent) => {
          if (isMounted) handleRoomEvent(event);
        });
      } catch (err) {
        console.warn('Socket.IO connection skipped or failed, using local engine bus.', err);
      }
    }

    return () => {
      isMounted = false;
      unsubscribeLocal();
      auctionRoomManager.leaveRoom(socketId);

      if (socketRef.current) {
        socketRef.current.emit('leave_room', { listingId, socketId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [
    listingId,
    autoConnect,
    currentUser.userId,
    currentUser.name,
    currentUser.role,
    serverUrl,
    handleRoomEvent,
    applySnapshot,
    resync,
  ]);

  // تقديم مزايدة تصاعدية مع التحديث التفاؤلي (Optimistic Bid Submission)
  const placeBid = useCallback(
    async (amount: number): Promise<BidResult> => {
      setLastError(null);
      setLastBidSuccess(false);

      if (amount < nextMinimumBid) {
        const errorMsg = `قيمة المزايدة يجب ألا تقل عن ${nextMinimumBid.toLocaleString()} ${currency}`;
        setLastError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // حفظ الحالة السابقة لإمكانية التراجع عند الفشل
      const previousPrice = currentPrice;
      const previousBids = [...bids];

      // 1. التحديث التفاؤلي الفوري (Optimistic Update)
      const optimisticBid: RealtimeBid = {
        id: `optimistic_${Date.now()}`,
        listingId,
        bidderId: currentUser.userId,
        bidderName: `${currentUser.name} (أنت)`,
        bidderReputation: 5.0,
        amount,
        isWinningBid: true,
        isExtensionTrigger: false,
        createdAt: 'الآن',
      };

      setCurrentPrice(amount);
      setBids([optimisticBid, ...previousBids.map((b) => ({ ...b, isWinningBid: false }))]);

      // 2. الإرسال للمحرك الحقيقي (عبر WebSockets أو مدير الغرفة)
      if (socketRef.current && socketRef.current.connected) {
        return new Promise((resolve) => {
          socketRef.current?.emit(
            'submit_bid',
            {
              listingId,
              bid: {
                bidderId: currentUser.userId,
                amount,
                bidderName: currentUser.name,
              },
            },
            (res: BidResult) => {
              if (res.success && res.bid) {
                // استبدال العطاء التفاؤلي بالعطاء المعتمد من الخادم
                setBids((prev) => [
                  res.bid!,
                  ...prev.filter((b) => b.id !== optimisticBid.id).map((b) => ({
                    ...b,
                    isWinningBid: false,
                  })),
                ]);
                setLastBidSuccess(true);
                resolve(res);
              } else {
                // التراجع عن التحديث التفاؤلي
                setCurrentPrice(previousPrice);
                setBids(previousBids);
                setLastError(res.error || 'فشلت المزايدة');
                resolve(res);
              }
            }
          );
        });
      } else {
        // الإرسال لـ AuctionRoomManager
        const result = auctionRoomManager.submitBid(listingId, {
          bidderId: currentUser.userId,
          amount,
          bidderName: currentUser.name,
        });

        if (result.success && result.bid) {
          setBids((prev) => [
            result.bid!,
            ...prev.filter((b) => b.id !== optimisticBid.id).map((b) => ({
              ...b,
              isWinningBid: false,
            })),
          ]);
          setLastBidSuccess(true);
        } else {
          setCurrentPrice(previousPrice);
          setBids(previousBids);
          setLastError(result.error || 'فشلت المزايدة');
        }

        return result;
      }
    },
    [
      nextMinimumBid,
      currency,
      currentPrice,
      bids,
      listingId,
      currentUser.userId,
      currentUser.name,
    ]
  );

  // المزايدة السريعة بضغطة واحدة (+5000 أو +10000 أو خطوة التزايد)
  const quickBid = useCallback(
    async (increment: number = minBidIncrement): Promise<BidResult> => {
      const targetAmount = currentPrice + increment;
      return placeBid(targetAmount);
    },
    [currentPrice, minBidIncrement, placeBid]
  );

  // تقديم عطاء في المناقصة العكسية
  const placeReverseBid = useCallback(
    async (amount: number): Promise<ReverseBidResult> => {
      setLastError(null);

      if (socketRef.current && socketRef.current.connected) {
        return new Promise((resolve) => {
          socketRef.current?.emit(
            'submit_reverse_bid',
            {
              listingId,
              bid: {
                supplierId: currentUser.userId,
                amount,
              },
            },
            (res: ReverseBidResult) => {
              if (!res.success) {
                setLastError(res.error || 'تعذر تقديم العطاء في المناقصة');
              }
              resolve(res);
            }
          );
        });
      } else {
        const result = auctionRoomManager.submitReverseBid(listingId, {
          supplierId: currentUser.userId,
          amount,
        });
        if (!result.success) {
          setLastError(result.error || 'تعذر تقديم العطاء في المناقصة');
        }
        return result;
      }
    },
    [listingId, currentUser.userId]
  );

  // أوامر الإدارة والتحكم الطارئ
  const adminPause = useCallback(
    async (reason: string = 'إيقاف احترازي من الإدارة'): Promise<boolean> => {
      const success = auctionRoomManager.pauseAuction(
        listingId,
        currentUser.userId,
        reason
      );
      if (success) setStatus('paused');
      return success;
    },
    [listingId, currentUser.userId]
  );

  const adminResume = useCallback(async (): Promise<boolean> => {
    const success = auctionRoomManager.resumeAuction(listingId, currentUser.userId);
    if (success) setStatus('active');
    return success;
  }, [listingId, currentUser.userId]);

  const adminRollback = useCallback(
    async (bidId: string): Promise<RollbackResult> => {
      const res = auctionRoomManager.rollbackBid(listingId, bidId, currentUser.userId);
      if (res.success && typeof res.restoredPrice === 'number') {
        setCurrentPrice(res.restoredPrice);
        setBids((prev) => prev.filter((b) => b.id !== bidId));
      }
      return res;
    },
    [listingId, currentUser.userId]
  );

  const adminExtend = useCallback(
    async (seconds: number): Promise<boolean> => {
      const success = auctionRoomManager.extendAuction(
        listingId,
        seconds,
        currentUser.userId
      );
      return success;
    },
    [listingId, currentUser.userId]
  );

  return {
    roomState,
    currentPrice,
    endsAt,
    status,
    bids,
    viewerCount,
    activeBiddersCount,
    highestBid,
    highestBidderId,
    highestBidderName,
    timesExtended,
    isAntiSnipingExtended,
    serverOffsetMs,
    minBidIncrement,
    nextMinimumBid,
    isConnected,
    isConnecting,
    connectionError,
    lastError,
    lastBidSuccess,
    clearError,
    placeBid,
    quickBid,
    placeReverseBid,
    adminPause,
    adminResume,
    adminRollback,
    adminExtend,
    resync,
  };
}
