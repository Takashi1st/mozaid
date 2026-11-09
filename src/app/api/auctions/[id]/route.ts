import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. فحص الإغلاق التلقائي إذا كان المزاد منتهياً
    await query(`
      UPDATE listings 
      SET status = 'closed' 
      WHERE (id::text = $1 OR slug = $1)
        AND status IN ('active', 'extended') 
        AND ends_at <= CURRENT_TIMESTAMP;
    `, [id]);

    // 2. استعلام تفاصيل المزاد الحية
    const listingRes = await query(`
      SELECT 
        l.id,
        l.title,
        l.slug,
        l.listing_type,
        l.status,
        l.currency,
        l.current_price,
        l.starting_price,
        l.reserve_price,
        l.buy_now_price,
        l.min_bid_increment,
        l.required_deposit_amount,
        l.starts_at,
        l.ends_at,
        l.times_extended,
        l.description,
        l.ai_generated_specs,
        l.item_condition,
        l.location_city,
        l.inspection_window_hours,
        l.total_bids_count,
        l.views_count,
        c.name_ar as category_name,
        c.slug as category_slug,
        u.id as seller_id,
        u.full_name as seller_name,
        u.is_trusted_seller,
        u.verification_tier,
        u.reputation_score,
        EXTRACT(EPOCH FROM (l.ends_at - CURRENT_TIMESTAMP))::INTEGER as time_left_seconds
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      JOIN users u ON l.user_id = u.id
      WHERE (l.id::text = $1 OR l.slug = $1)
      LIMIT 1;
    `, [id]);

    if (listingRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'المزاد غير موجود أو تم حذفه' },
        { status: 404 }
      );
    }

    const listing = listingRes.rows[0];

    // 3. زيادة عدد المشاهدات
    await query(`UPDATE listings SET views_count = views_count + 1 WHERE id = $1`, [listing.id]);

    // 4. استعلام المزايدات الحية المسجلة
    const bidsRes = await query(`
      SELECT 
        b.id,
        b.amount,
        b.is_winning_bid,
        b.is_extension_trigger,
        b.created_at,
        u.full_name as bidder_name,
        u.verification_tier,
        u.reputation_score
      FROM bids b
      JOIN users u ON b.bidder_id = u.id
      WHERE b.listing_id = $1
      ORDER BY b.amount DESC, b.created_at DESC
      LIMIT 20;
    `, [listing.id]);

    return NextResponse.json({
      success: true,
      auction: {
        ...listing,
        current_price: parseFloat(listing.current_price),
        starting_price: parseFloat(listing.starting_price),
        min_bid_increment: parseFloat(listing.min_bid_increment),
        required_deposit_amount: parseFloat(listing.required_deposit_amount),
        buy_now_price: listing.buy_now_price ? parseFloat(listing.buy_now_price) : null,
      },
      bids: bidsRes.rows.map(b => ({
        id: b.id,
        amount: parseFloat(b.amount),
        bidderName: b.bidder_name,
        verificationTier: b.verification_tier,
        reputation: parseFloat(b.reputation_score || 5.0),
        isWinningBid: b.is_winning_bid,
        isExtensionTrigger: b.is_extension_trigger,
        createdAt: b.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching auction detail:', error);
    return NextResponse.json(
      { success: false, error: 'خطأ أثناء جلب بيانات المزاد الحي' },
      { status: 500 }
    );
  }
}
