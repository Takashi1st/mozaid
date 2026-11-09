-- ============================================================================
-- قاعدة بيانات منصة مزايد (Mozaid AI) - سكيما متكاملة لـ PostgreSQL
-- الإصدار: 1.0.0
-- تدعم: المزادات التصاعدية، المناقصات العكسية، المحافظ وسندات الدفع اليمنية،
--       الضمان المالي (Escrow)، التوثيق (KYC)، وغرف النزاعات، وكشف الاحتيال.
-- ============================================================================

-- تفعيل إضافات الأمان ودعم المعرفات الفريدة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. أنواع البيانات المخصصة (ENUMS)
-- ============================================================================

CREATE TYPE user_role_enum AS ENUM (
    'bidder',           -- مشتري / مزايد عادي
    'seller',           -- بائع أصول وسلع
    'contractor',       -- مقاول / مورد معتمد
    'moderator',        -- مشرف محتوى ومراقبة حية
    'finance_admin',    -- مشرف تدقيق مالي ومحافظ
    'dispute_officer',  -- محكم ومسؤول فض نزاعات
    'super_admin'       -- مدير النظام العام
);

CREATE TYPE kyc_status_enum AS ENUM (
    'unverified',       -- غير موثق
    'pending_review',   -- بانتظار المراجعة والتدقيق
    'verified',         -- موثق بالبطاقة الوطنية
    'rejected'          -- مرفوض (هوية غير واضحة أو مزورة)
);

CREATE TYPE listing_type_enum AS ENUM (
    'forward_auction',  -- مزاد تصاعدي لبيع سلعة/أصل (أعلى سعر يفوز)
    'reverse_tender'    -- مناقصة ومزايدة عكسية للشراء والتوريد (أفضل/أقل سعر يفوز)
);

CREATE TYPE listing_status_enum AS ENUM (
    'draft',            -- مسودة قيد الإعداد
    'pending_approval', -- بانتظار موافقة الإدارة (للمزادات الكبرى)
    'active',           -- مفتوح ونشط يتلقى العروض بالوقت الفعلي
    'paused',           -- متوقف مؤقتاً بواسطة المشرف
    'extended',         -- تم تمديد وقته (Anti-Sniping)
    'closed',           -- انتهى الوقت ورسى على فائز
    'canceled',         -- تم إلغاؤه
    'disputed'          -- تحت النزاع
);

CREATE TYPE currency_enum AS ENUM (
    'YER',              -- ريال يمني
    'USD',              -- دولار أمريكي
    'SAR'               -- ريال سعودي
);

CREATE TYPE payment_channel_enum AS ENUM (
    'kuraimi_bank',     -- بنك الكريمي للتمويل الأصغر الإسلامي
    'one_cash',         -- محفظة ون كاش
    'jwali',            -- محفظة جوالي
    'floosak',          -- محفظة فلوسك
    'cash_wallet',      -- محفظة كاش
    'al_najm',          -- شبكة النجم للحوالات
    'al_omqy',          -- شركة العمقي وإخوانه للصرافة
    'internal_balance'  -- الرصيد الداخلي للمحفظة
);

CREATE TYPE transaction_type_enum AS ENUM (
    'deposit',          -- إيداع رصيد
    'withdrawal',       -- طلب سحب رصيد
    'bid_deposit_hold', -- تجميد عربون لدخول مزاد
    'bid_deposit_refund',-- استرجاع عربون لمزايد خاسر
    'escrow_lock',      -- تجميد قيمة الصفقة في حساب الضمان
    'escrow_release',   -- صرف قيمة الصفقة للبائع
    'escrow_refund',    -- إعادة المبلغ للمشتري عند إلغاء الصفقة
    'platform_fee'      -- عمولة المنصة
);

CREATE TYPE transaction_status_enum AS ENUM (
    'pending',          -- قيد المراجعة
    'approved',         -- معتمد ومكتمل
    'rejected',         -- مرفوض
    'canceled'          -- ملغى
);

CREATE TYPE escrow_status_enum AS ENUM (
    'holding',          -- المبلغ محجوز في الضمان
    'dispatched',       -- السلعة شُحنت / بانتظار استلام المشتري
    'inspecting',       -- في فترة المعاينة (48 ساعة)
    'completed',        -- تمت المعاينة بنجاح وصرف المبلغ للبائع
    'disputed',         -- مفتوح عليه نزاع
    'refunded'          -- تم الاسترداد للمشتري
);

CREATE TYPE dispute_status_enum AS ENUM (
    'opened',           -- نزاع مفتوح
    'under_review',     -- قيد مراجعة المحكم
    'resolved_refund',  -- حُسم لصالح المشتري (استرداد كامل)
    'resolved_payout',  -- حُسم لصالح البائع (صرف كامل)
    'resolved_split',   -- تسوية ودية وقسمة جزئية
    'dismissed'         -- رُفض النزاع لعدم كفاية الأدلة
);

-- ============================================================================
-- 2. جدول المستخدمين والتوثيق (USERS & KYC)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,       -- رقم الهاتف اليمني (77x, 73x, 71x, 70x)
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'bidder',
    avatar_url TEXT,
    
    -- بيانات التوثيق الوطني اليمني (KYC)
    kyc_status kyc_status_enum NOT NULL DEFAULT 'unverified',
    national_id_number VARCHAR(30) UNIQUE,          -- الرقم الوطني بالبطاقة الشخصية
    id_card_front_url TEXT,                         -- صورة البطاقة من الأمام
    id_card_back_url TEXT,                          -- صورة البطاقة من الخلف
    selfie_url TEXT,                                -- صورة شخصية حية للمطابقة
    kyc_rejection_reason TEXT,
    kyc_verified_at TIMESTAMP WITH TIME ZONE,
    kyc_verified_by UUID,                           -- المشرف الذي دقق الهوية

    -- السمعة والموقع
    city VARCHAR(50) NOT NULL DEFAULT 'صنعاء',       -- المدينة (صنعاء، عدن، تعز، الحديدة، حضرموت...)
    address_details TEXT,
    reputation_score DECIMAL(3, 2) DEFAULT 5.00,    -- تقييم الثقة (من 1 إلى 5)
    successful_deals_count INT DEFAULT 0,
    is_trusted_seller BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_kyc ON users(kyc_status);

-- ============================================================================
-- 3. تصنيفات السلع والمناقصات (CATEGORIES)
-- ============================================================================

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id INT REFERENCES categories(id) ON DELETE SET NULL,
    icon_name VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. جدول المزادات والمناقصات (LISTINGS: Auctions & Tenders)
-- ============================================================================

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    listing_type listing_type_enum NOT NULL DEFAULT 'forward_auction',
    status listing_status_enum NOT NULL DEFAULT 'draft',
    currency currency_enum NOT NULL DEFAULT 'YER',

    -- الأسعار والعطاءات
    starting_price DECIMAL(15, 2) NOT NULL,         -- السعر الافتتاحي
    reserve_price DECIMAL(15, 2),                   -- السعر الأدنى المقبول للبائع (اختياري)
    current_price DECIMAL(15, 2) NOT NULL,          -- السعر الحالي في الوقت الفعلي
    min_bid_increment DECIMAL(12, 2) NOT NULL,      -- خطوة المزايدة الصغرى (مثلاً 10,000 ريال)
    buy_now_price DECIMAL(15, 2),                   -- سعر الشراء المباشر الفوري (إن وجد)
    required_deposit_amount DECIMAL(12, 2) DEFAULT 0.00, -- تأمين دخول المزاد المطلوب

    -- مواعيد المزاد وقواعد التمديد
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,       -- وقت الإغلاق الرسمي
    original_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    anti_sniping_trigger_seconds INT DEFAULT 120,   -- آخر دقيقتين
    anti_sniping_extension_seconds INT DEFAULT 120, -- مدة التمديد عند كل مزايدة
    times_extended INT DEFAULT 0,

    -- تفاصيل السلعة والمواصفات المولدة بالذكاء الاصطناعي
    description TEXT NOT NULL,
    ai_generated_specs JSONB,                       -- المواصفات الفنية والجداول المستخرجة بالـ AI
    item_condition VARCHAR(50) DEFAULT 'used',      -- حالة السلعة (جديد، مستعمل كالجديد، مجدد...)
    location_city VARCHAR(50) NOT NULL,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),

    -- شروط الضمان والمعاينة
    inspection_window_hours INT DEFAULT 48,         -- مهلة المعاينة للمشتري بعد التسليم بالساعات
    delivery_type VARCHAR(50) DEFAULT 'pickup',     -- استلام يدوي أو شحن

    -- الفائز النهائي
    winning_bidder_id UUID REFERENCES users(id),
    winning_bid_id UUID,
    winning_amount DECIMAL(15, 2),

    total_bids_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_type ON listings(listing_type);
CREATE INDEX idx_listings_ends_at ON listings(ends_at);
CREATE INDEX idx_listings_category ON listings(category_id);

-- ============================================================================
-- 5. جدول الوسائط والصور (LISTING MEDIA)
-- ============================================================================

CREATE TABLE listing_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    media_type VARCHAR(20) DEFAULT 'image',         -- image, video, document
    is_cover BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    ai_moderation_labels JSONB,                     -- نتائج فحص المحتوى والأمان بالذكاء الاصطناعي
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. جدول المزايدات والعطاءات اللحظية (BIDS)
-- ============================================================================

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount DECIMAL(15, 2) NOT NULL,
    is_winning_bid BOOLEAN DEFAULT FALSE,
    is_extension_trigger BOOLEAN DEFAULT FALSE,     -- هل تسببت هذه المزايدة بتمديد وقت المزاد؟
    
    -- بيانات كشف الاحتيال والمزايدات الوهمية (Anti-Shill Telemetry)
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(100),
    is_flagged_shill BOOLEAN DEFAULT FALSE,         -- هل تم تصنيفها كمزايدة وهمية بواسطة الذكاء الاصطناعي؟
    shill_confidence_score DECIMAL(3, 2) DEFAULT 0.00,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bids_listing ON bids(listing_id, created_at DESC);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);
CREATE INDEX idx_bids_amount ON bids(listing_id, amount DESC);

-- ============================================================================
-- 7. جدول المحافظ والعمليات المالية (WALLETS & TRANSACTIONS)
-- ============================================================================

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    available_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    frozen_escrow_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- المبالغ المحجوزة للضمان أو العربون
    currency currency_enum NOT NULL DEFAULT 'YER',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    type transaction_type_enum NOT NULL,
    status transaction_status_enum NOT NULL DEFAULT 'pending',
    channel payment_channel_enum NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency currency_enum NOT NULL DEFAULT 'YER',

    -- تفاصيل التحويلات وسندات الصرافة اليمنية
    transfer_reference_number VARCHAR(100),         -- رقم الحوالة / رقم السند
    sender_name VARCHAR(150),                       -- اسم المودع في الحوالة
    sender_phone VARCHAR(30),                       -- هاتف المودع
    receipt_image_url TEXT,                         -- صورة السند البنكي أو إشعار التحويل
    admin_notes TEXT,
    verified_by UUID REFERENCES users(id),          -- المشرف المالي الذي اعتمد العملية
    verified_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_ref ON transactions(transfer_reference_number);

-- ============================================================================
-- 8. جدول عقود الضمان والوساطة المالية (ESCROW CONTRACTS)
-- ============================================================================

CREATE TABLE escrow_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL UNIQUE REFERENCES listings(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    total_amount DECIMAL(15, 2) NOT NULL,           -- إجمالي قيمة الصفقة
    platform_fee_percent DECIMAL(4, 2) DEFAULT 2.50,-- نسبة عمولة المنصة
    platform_fee_amount DECIMAL(12, 2) NOT NULL,    -- قيمة العمولة المقتطعة
    seller_payout_amount DECIMAL(15, 2) NOT NULL,   -- صافي مستحقات البائع

    status escrow_status_enum NOT NULL DEFAULT 'holding',
    
    dispatched_at TIMESTAMP WITH TIME ZONE,         -- وقت شحن / بدء تسليم السلعة
    inspection_deadline TIMESTAMP WITH TIME ZONE,   -- نهاية مهلة الـ 48 ساعة للمعاينة
    delivered_confirmed_at TIMESTAMP WITH TIME ZONE,-- تأكيد الاستلام من قبل المشتري
    funds_released_at TIMESTAMP WITH TIME ZONE,     -- وقت تحويل المبلغ لمحفظة البائع

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. جدول النزاعات وغرفة التحكيم الرقمية (DISPUTES & ARBITRATION)
-- ============================================================================

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escrow_id UUID NOT NULL UNIQUE REFERENCES escrow_contracts(id) ON DELETE RESTRICT,
    opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_officer_id UUID REFERENCES users(id),  -- المشرف المعين للقضية
    
    reason VARCHAR(100) NOT NULL,                   -- سبب النزاع (عيوب مخفية، تأخر تسليم، سلعة غير مطابقة...)
    description TEXT NOT NULL,
    status dispute_status_enum NOT NULL DEFAULT 'opened',

    -- تحليل الذكاء الاصطناعي للأدلة والمطابقة
    ai_arbitration_summary TEXT,                    -- تقرير التلخيص التلقائي للأدلة
    ai_recommended_action VARCHAR(50),              -- التوصية المقترحة من الـ AI
    ai_confidence_score DECIMAL(3, 2),

    -- الحكم والقرار الإداري
    resolution_notes TEXT,
    refund_amount_buyer DECIMAL(15, 2) DEFAULT 0.00,
    payout_amount_seller DECIMAL(15, 2) DEFAULT 0.00,
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispute_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    attachment_url TEXT,                            -- صورة العيب أو مستند فني
    is_staff_internal_note BOOLEAN DEFAULT FALSE,   -- ملاحظة داخلية للمشرفين فقط
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. جدول سجلات رقابة الإدارة ومكافحة التلاعب (AUDIT & AI LOGS)
-- ============================================================================

CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_type VARCHAR(100) NOT NULL,              -- PAUSE_AUCTION, ROLLBACK_BID, APPROVE_KYC, RESOLVE_DISPUTE
    target_table VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_risk_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
    suspect_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    risk_level VARCHAR(20) NOT NULL,                -- LOW, MEDIUM, CRITICAL
    violation_type VARCHAR(50) NOT NULL,            -- SHILL_BIDDING, INAPPROPRIATE_MEDIA, COLLUSION
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. الإجراءات التلقائية والمحفزات (Triggers)
-- ============================================================================

-- دالة تحديث توقيت updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escrow_updated_at BEFORE UPDATE ON escrow_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
