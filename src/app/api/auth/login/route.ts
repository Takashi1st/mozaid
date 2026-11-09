import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  verifyPassword, 
  createSessionToken, 
  isAdminRole, 
  getCookieOptions, 
  SESSION_COOKIE_NAME 
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { phoneNumber, password } = body;

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال رقم الهاتف وكلمة المرور.' },
        { status: 400 }
      );
    }

    // تنظيف رقم الهاتف وإزالة المسافات أو الصفر البدائي
    phoneNumber = String(phoneNumber).trim().replace(/\s+/g, '');
    if (phoneNumber.startsWith('0') && phoneNumber.length === 10) {
      phoneNumber = phoneNumber.substring(1);
    }

    const res = await query(
      `SELECT id, full_name, phone_number, password_hash, role, city 
       FROM users 
       WHERE phone_number = $1 
       LIMIT 1;`,
      [phoneNumber]
    );

    if (res.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' },
        { status: 401 }
      );
    }

    const user = res.rows[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' },
        { status: 401 }
      );
    }

    const role: 'admin' | 'user' = isAdminRole(user.role) ? 'admin' : 'user';

    const sessionUser = {
      id: user.id,
      phoneNumber: user.phone_number,
      fullName: user.full_name,
      role,
      rawRole: user.role,
      city: user.city || 'صنعاء',
    };

    const token = await createSessionToken(sessionUser);

    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح.',
      user: sessionUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions());

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول.' },
      { status: 500 }
    );
  }
}
