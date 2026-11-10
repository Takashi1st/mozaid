import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. فحص الإغلاق التلقائي
    await query(`
      UPDATE listings 
      SET status = 'closed' 
      WHERE (id::text = $1 OR slug = $1)
        AND listing_type = 'reverse_tender'
        AND status IN ('active', 'extended') 
        AND ends_at <= CURRENT_TIMESTAMP;
    `, [id]);

    // 2. جلب المناقصة
    const tenderRes = await query(`
      SELECT 
        l.id,
        l.title,
        l.slug,
        l.listing_type,
        l.status,
        l.currency,
        l.current_price as lowest_bid,
        l.starting_price as budget_cap,
        l.min_bid_increment,
        l.required_deposit_amount,
        l.starts_at,
        l.ends_at,
        l.description,
        l.ai_generated_specs,
        l.location_city,
        l.total_bids_count as offers_count,
        c.name_ar as category_name,
        u.full_name as requester_org,
        u.is_trusted_seller,
        u.verification_tier,
        EXTRACT(EPOCH FROM (l.ends_at - CURRENT_TIMESTAMP))::INTEGER as time_left_seconds
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      JOIN users u ON l.user_id = u.id
      WHERE (l.id::text = $1 OR l.slug = $1)
        AND l.listing_type = 'reverse_tender'
      LIMIT 1;
    `, [id]);

    if (tenderRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'المناقصة غير موجودة' },
        { status: 404 }
      );
    }

    const tender = tenderRes.rows[0];

    // 3. عروض الأسعار التنافسية المقدمة
    const bidsRes = await query(`
      SELECT 
        b.id,
        b.amount,
        b.is_winning_bid,
        b.created_at,
        u.full_name as bidder_name,
        u.verification_tier
      FROM bids b
      JOIN users u ON b.bidder_id = u.id
      WHERE b.listing_id = $1
      ORDER BY b.amount ASC, b.created_at DESC
      LIMIT 20;
    `, [tender.id]);

    return NextResponse.json({
      success: true,
      tender: {
        ...tender,
        lowest_bid: parseFloat(tender.lowest_bid),
        budget_cap: parseFloat(tender.budget_cap),
      },
      bids: bidsRes.rows.map(b => ({
        id: b.id,
        amount: parseFloat(b.amount),
        bidderName: b.bidder_name,
        verificationTier: b.verification_tier,
        isWinningBid: b.is_winning_bid,
        createdAt: b.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching tender detail:', error);
    return NextResponse.json(
      { success: false, error: 'خطأ أثناء جلب تفاصيل المناقصة' },
      { status: 500 }
    );
  }
}
