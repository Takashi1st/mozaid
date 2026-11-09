import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    // 1. إغلاق تلقائي للمناقصات المنتهية
    await query(`
      UPDATE listings 
      SET status = 'closed' 
      WHERE listing_type = 'reverse_tender'
        AND status IN ('active', 'extended') 
        AND ends_at <= CURRENT_TIMESTAMP;
    `);

    // 2. جلب المناقصات الحية فقط بنسبة 100%
    let sql = `
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
        EXTRACT(EPOCH FROM (l.ends_at - CURRENT_TIMESTAMP))::INTEGER as time_left_seconds
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      JOIN users u ON l.user_id = u.id
      WHERE l.listing_type = 'reverse_tender'
        AND l.status IN ('active', 'extended')
        AND l.ends_at > CURRENT_TIMESTAMP
    `;

    const params: any[] = [];
    if (city && city !== 'الكل') {
      sql += ` AND l.location_city = $1`;
      params.push(city);
    }

    sql += ` ORDER BY l.ends_at ASC;`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      count: result.rowCount,
      tenders: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching live tenders from PostgreSQL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live tenders from database' },
      { status: 500 }
    );
  }
}
