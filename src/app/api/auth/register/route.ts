import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  hashPassword, 
  createSessionToken, 
  getCookieOptions, 
  SESSION_COOKIE_NAME 
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { fullName, phoneNumber, password, city } = body;

    if (!fullName || !phoneNumber || !password) {
      return NextResponse.json(
        { success: false, error: 'الاسم الكامل، رقم الهاتف، وكلمة المرور مطلوبة.' },
        { status: 400 }
      );
    }

    fullName = String(fullName).trim();
    city = String(city || 'صنعاء').trim();
    phoneNumber = String(phoneNumber).trim().replace(/\s+/g, '');
    if (phoneNumber.startsWith('0') && phoneNumber.length === 10) {
      phoneNumber = phoneNumber.substring(1);
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'يجب أن لا تقل كلمة المرور عن 6 أحرف أو أرقام.' },
        { status: 400 }
      );
    }

    // 1. التحقق من عدم تكرار رقم الهاتف
    const checkUser = await query(
      `SELECT id FROM users WHERE phone_number = $1 LIMIT 1;`,
      [phoneNumber]
    );

    if (checkUser.rowCount && checkUser.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف هذا مسجل بالفعل. يرجى تسجيل الدخول.' },
        { status: 409 }
      );
    }

    // 2. تشفير كلمة المرور
    const passwordHash = await hashPassword(password);

    // 3. إدراج المستخدم الجديد
    // نستخدم دور 'bidder' المتوافق مع enum قاعدة البيانات (والذي يمثل دور المستخدم العادي)
    const newUserRes = await query(
      `INSERT INTO users (full_name, phone_number, password_hash, role, city, kyc_status, verification_tier, is_trusted_seller, reputation_score)
       VALUES ($1, $2, $3, 'bidder', $4, 'unverified', 'tier1_phone', false, 5.0)
       RETURNING id, full_name, phone_number, role, city;`,
      [fullName, phoneNumber, passwordHash, city]
    );

    const newUser = newUserRes.rows[0];

    // 4. إنشاء محفظة رقمية للمستخدم الجديد
    await query(
      `INSERT INTO wallets (user_id, available_balance, frozen_escrow_balance, currency)
       VALUES ($1, 0, 0, 'YER')
       ON CONFLICT (user_id) DO NOTHING;`,
      [newUser.id]
    );

    const sessionUser = {
      id: newUser.id,
      phoneNumber: newUser.phone_number,
      fullName: newUser.full_name,
      role: 'user' as const,
      rawRole: newUser.role,
      city: newUser.city,
    };

    // 5. إنشاء التوكن وضبط الكوكي
    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح.',
      user: sessionUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions());

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقاً.' },
      { status: 500 }
    );
  }
}
