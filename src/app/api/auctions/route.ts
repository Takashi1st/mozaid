import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const currency = searchParams.get('currency');

    // 1. إغلاق تلقائي لأي مزاد انتهى وقته في قاعدة البيانات
    await query(`
      UPDATE listings 
      SET status = 'closed' 
      WHERE status IN ('active', 'extended') 
        AND ends_at <= CURRENT_TIMESTAMP;
    `);

    // 2. جلب المزادات الحية فقط بنسبة 100% (المفتوحة التي لم ينته وقتها بعد)
    let sql = `
      SELECT 
        l.id,
        l.title,
        l.slug,
        l.listing_type,
        l.status,
        l.currency,
        l.current_price,
        l.starting_price,
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
        c.icon_name as category_icon,
        u.full_name as seller_name,
        u.is_trusted_seller,
        u.verification_tier,
        u.reputation_score,
        EXTRACT(EPOCH FROM (l.ends_at - CURRENT_TIMESTAMP))::INTEGER as time_left_seconds
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      JOIN users u ON l.user_id = u.id
      WHERE l.listing_type = 'forward_auction'
        AND l.status IN ('active', 'extended')
        AND l.ends_at > CURRENT_TIMESTAMP
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'الكل') {
      sql += ` AND c.name_ar = $${paramIndex++}`;
      params.push(category);
    }

    if (city && city !== 'الكل') {
      sql += ` AND l.location_city = $${paramIndex++}`;
      params.push(city);
    }

    if (currency && currency !== 'الكل') {
      sql += ` AND l.currency = $${paramIndex++}`;
      params.push(currency);
    }

    sql += ` ORDER BY l.ends_at ASC;`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      count: result.rowCount,
      auctions: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching live auctions from PostgreSQL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live auctions from database' },
      { status: 500 }
    );
  }
}
