const { Client } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:Kiss0OduwEqtGlqYmAMyedKswhoHiGcy2jkmWxZge95ELjeoV29tRrnmqxZvetuo@161.97.152.98:9374/postgres';

async function seed() {
  const client = new Client({ connectionString, ssl: false });
  await client.connect();

  console.log('Seeding initial verified users and live auctions into PostgreSQL...');

  // 1. Users
  const userSeller = await client.query(`
    INSERT INTO users (full_name, phone_number, password_hash, role, city, kyc_status, verification_tier, national_id_number, is_trusted_seller, reputation_score)
    VALUES ('معرض القمة للسيارات - بازرعة', '777112233', 'hashed_pass_123', 'seller', 'صنعاء', 'verified', 'tier2_id_liveness', '01010099881', true, 4.95)
    ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id;
  `);
  const sellerId = userSeller.rows[0].id;

  const userBidder = await client.query(`
    INSERT INTO users (full_name, phone_number, password_hash, role, city, kyc_status, verification_tier, national_id_number, is_trusted_seller, reputation_score)
    VALUES ('م. أحمد ناصر الحاشدي', '771234567', 'hashed_pass_456', 'bidder', 'صنعاء', 'verified', 'tier2_id_liveness', '01010045892', false, 5.0)
    ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id;
  `);
  const bidderId = userBidder.rows[0].id;

  const userOrg = await client.query(`
    INSERT INTO users (full_name, phone_number, password_hash, role, city, kyc_status, verification_tier, national_id_number, is_trusted_seller, reputation_score)
    VALUES ('إدارة مستشفى الأمل النموذجي', '733445566', 'hashed_pass_789', 'contractor', 'عدن', 'verified', 'tier2_id_liveness', '02050011223', true, 4.9)
    ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id;
  `);
  const orgId = userOrg.rows[0].id;

  // 2. Wallets
  await client.query(`
    INSERT INTO wallets (user_id, available_balance, frozen_escrow_balance, currency)
    VALUES 
      ('${sellerId}', 12500000, 0, 'YER'),
      ('${bidderId}', 5000000, 1000000, 'YER'),
      ('${orgId}', 250000, 0, 'USD')
    ON CONFLICT (user_id) DO NOTHING;
  `);

  // 3. Categories Check
  const catVehicles = await client.query("SELECT id FROM categories WHERE slug = 'vehicles' LIMIT 1;");
  const vehicleCatId = catVehicles.rows[0]?.id || 1;

  const catTenders = await client.query("SELECT id FROM categories WHERE slug = 'tenders' LIMIT 1;");
  const tenderCatId = catTenders.rows[0]?.id || 5;

  // 4. Live Forward Auction (Ends in 25 minutes from NOW)
  const endsAtLive = new Date(Date.now() + 25 * 60 * 1000).toISOString();
  const startsAtLive = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  await client.query(`
    DELETE FROM listings WHERE slug = 'live-toyota-landcruiser-v8-2022';
  `);

  const liveAuction = await client.query(`
    INSERT INTO listings (
      user_id, category_id, title, slug, listing_type, status, currency,
      starting_price, current_price, min_bid_increment, required_deposit_amount,
      starts_at, ends_at, original_ends_at, anti_sniping_trigger_seconds, anti_sniping_extension_seconds,
      times_extended, description, ai_generated_specs, item_condition, location_city,
      inspection_window_hours, total_bids_count
    ) VALUES (
      '${sellerId}',
      ${vehicleCatId},
      'تويوتا لاندكروزر V8 صالون 2022 نظيف مجمرك - فحص كامل',
      'live-toyota-landcruiser-v8-2022',
      'forward_auction',
      'active',
      'YER',
      38000000,
      42500000,
      250000,
      1000000,
      '${startsAtLive}',
      '${endsAtLive}',
      '${endsAtLive}',
      120,
      120,
      0,
      'سيارة تويوتا لاندكروزر وارد بازرعة، بحالة الوكالة خالية من الصدمات، مجمركة ومرقمة بصنعاء. تم الفحص الفني للماكينة والجير والدبل بنسبة 96%.',
      '{"المحرك": "4.0 لتر V6 توين تيربو", "ناقل الحركة": "أوتوماتيك 10 سرعات", "اللون": "أبيض لؤلؤي", "العداد": "34,000 كم", "مكان المعاينة": "صنعاء - شارع حدة"}',
      'used_mint',
      'صنعاء',
      48,
      1
    ) RETURNING id;
  `);
  const auctionId = liveAuction.rows[0].id;

  // Initial Bid on the live auction
  await client.query(`
    INSERT INTO bids (listing_id, bidder_id, amount, is_winning_bid, ip_address)
    VALUES ('${auctionId}', '${bidderId}', 42500000, true, '161.97.152.98');
  `);

  // 5. Live Reverse Tender (Ends in 12 hours from NOW)
  const tenderEndsAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
  await client.query(`
    DELETE FROM listings WHERE slug = 'live-solar-system-150kw-hospital';
  `);

  await client.query(`
    INSERT INTO listings (
      user_id, category_id, title, slug, listing_type, status, currency,
      starting_price, current_price, min_bid_increment, required_deposit_amount,
      starts_at, ends_at, original_ends_at, anti_sniping_trigger_seconds, anti_sniping_extension_seconds,
      times_extended, description, ai_generated_specs, item_condition, location_city,
      inspection_window_hours, total_bids_count
    ) VALUES (
      '${orgId}',
      ${tenderCatId},
      'توريد وتركيب منظومة طاقة شمسية هجينة 150 كيلوواط - مستشفى الأمل',
      'live-solar-system-150kw-hospital',
      'reverse_tender',
      'active',
      'USD',
      85000,
      72000,
      1000,
      5000,
      '${startsAtLive}',
      '${tenderEndsAt}',
      '${tenderEndsAt}',
      120,
      120,
      0,
      'مطلوب توريد وتركيب ألواح طاقة شمسية بقدرة إجمالية 150KW مع إنفرترات ذكية وبطاريات ليثيوم للمبنى الرئيسي لمستشفى الأمل النموذجي بعدن.',
      '{"القدرة الإجمالية": "150 kWp", "نوع الألواح": "Tier-1 Monocrystalline 550W+", "الضمان": "10 سنوات للألواح"}',
      'new',
      'عدن',
      72,
      1
    );
  `);

  console.log('Seeded 100% LIVE data in PostgreSQL successfully!');
  await client.end();
}

seed().catch(console.error);
