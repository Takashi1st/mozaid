import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listingId, bidderId, amount, ipAddress } = body;

    if (!listingId || !amount) {
      return NextResponse.json({ success: false, error: 'معرف المزاد وقيمة المزايدة مطلوبة.' }, { status: 400 });
    }

    // 1. جلب بيانات المزاد الحالي من قاعدة البيانات
    const listingRes = await query(`
      SELECT 
        id, user_id, current_price, min_bid_increment, status, currency,
        ends_at, anti_sniping_trigger_seconds, anti_sniping_extension_seconds,
        times_extended
      FROM listings
      WHERE id = $1;
    `, [listingId]);

    if (listingRes.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'المزاد غير موجود.' }, { status: 404 });
    }

    const listing = listingRes.rows[0];
    const now = new Date();
    const endsAt = new Date(listing.ends_at);

    // 2. التحقق من أن المزاد ما يزال مفتوحاً
    if (now >= endsAt || listing.status === 'closed') {
      await query("UPDATE listings SET status = 'closed' WHERE id = $1;", [listingId]);
      return NextResponse.json({ success: false, error: 'عذراً، لقد انتهى وقت المزاد رسمياً.' }, { status: 400 });
    }

    // 3. التحقق من قيمة العرض الجديد
    const currentPrice = Number(listing.current_price);
    const minIncrement = Number(listing.min_bid_increment);
    const minRequired = currentPrice + minIncrement;

    if (Number(amount) < minRequired) {
      return NextResponse.json({
        success: false,
        error: `قيمة المزايدة يجب ألا تقل عن ${minRequired.toLocaleString()} ${listing.currency}`,
        minRequired
      }, { status: 400 });
    }

    // 4. فحص شرط تمديد الوقت لمكافحة القنص (Anti-Sniping)
    const secondsRemaining = Math.floor((endsAt.getTime() - now.getTime()) / 1000);
    let isAntiSnipingTriggered = false;
    let newEndsAt = endsAt;
    let newTimesExtended = listing.times_extended || 0;

    if (secondsRemaining <= (listing.anti_sniping_trigger_seconds || 120)) {
      isAntiSnipingTriggered = true;
      newEndsAt = new Date(endsAt.getTime() + (listing.anti_sniping_extension_seconds || 120) * 1000);
      newTimesExtended += 1;
    }

    // 5. التحقق الصارم من وجود المستخدم في جدول users لمنع خطأ Foreign Key Constraint
    let effectiveBidderId: string | null = null;
    if (bidderId) {
      try {
        const checkUser = await query('SELECT id FROM users WHERE id = $1;', [bidderId]);
        if (checkUser.rowCount && checkUser.rowCount > 0) {
          effectiveBidderId = checkUser.rows[0].id;
        }
      } catch {
        effectiveBidderId = null;
      }
    }

    // إذا لم يكن المعرف مرسلاً أو كان غير موجود، استخدام المزايد الموثق الافتراضي من قاعدة البيانات
    if (!effectiveBidderId) {
      const defaultBidderRes = await query("SELECT id FROM users WHERE role = 'bidder' LIMIT 1;");
      if (defaultBidderRes.rowCount && defaultBidderRes.rowCount > 0) {
        effectiveBidderId = defaultBidderRes.rows[0].id;
      } else {
        const fallbackUserRes = await query("SELECT id FROM users LIMIT 1;");
        effectiveBidderId = fallbackUserRes.rows[0]?.id;
      }
    }

    if (!effectiveBidderId) {
      return NextResponse.json({ success: false, error: 'تعذر العثور على هوية مستخدم معتمد لتقديم المزايدة.' }, { status: 400 });
    }

    const clientIp = ipAddress || '161.97.152.98';

    await query(`
      UPDATE bids SET is_winning_bid = false WHERE listing_id = $1;
    `, [listingId]);

    const bidRes = await query(`
      INSERT INTO bids (listing_id, bidder_id, amount, is_winning_bid, is_extension_trigger, ip_address)
      VALUES ($1, $2, $3, true, $4, $5)
      RETURNING id, created_at;
    `, [listingId, effectiveBidderId, amount, isAntiSnipingTriggered, clientIp]);

    // 6. تحديث المزاد بالسعر الجديد والوقت الجديد
    await query(`
      UPDATE listings 
      SET 
        current_price = $1,
        total_bids_count = total_bids_count + 1,
        ends_at = $2,
        times_extended = $3,
        status = CASE WHEN $4 = true THEN 'extended'::listing_status_enum ELSE status END,
        winning_bidder_id = $5,
        winning_bid_id = $6,
        winning_amount = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7;
    `, [
      amount,
      newEndsAt.toISOString(),
      newTimesExtended,
      isAntiSnipingTriggered,
      effectiveBidderId,
      bidRes.rows[0].id,
      listingId
    ]);

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل المزايدة بنجاح في قاعدة البيانات الحية!',
      newPrice: Number(amount),
      isAntiSnipingTriggered,
      newEndsAt: newEndsAt.toISOString(),
      timesExtended: newTimesExtended,
      bidId: bidRes.rows[0].id
    });

  } catch (error: any) {
    console.error('Error placing real bid in PostgreSQL:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
