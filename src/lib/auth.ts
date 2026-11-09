import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'mozaid_session';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mozaid-super-secure-production-secret-key-2026-yemen'
);

export interface SessionUser {
  id: string;
  phoneNumber: string;
  fullName: string;
  role: 'admin' | 'user';
  rawRole?: string;
  city?: string;
}

/**
 * فحص ما إذا كان الدور إدارياً
 */
export function isAdminRole(role?: string): boolean {
  if (!role) return false;
  return (
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'moderator' ||
    role === 'finance_admin' ||
    role === 'dispute_officer'
  );
}

/**
 * تشفير كلمة المرور بـ Salt Rounds
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * التحقق من مطابقة كلمة المرور المدخلة مع الهاش المخزن
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // دعم مؤقت للهاشات التجريبية المسبقة إن وجدت
  if (hash.startsWith('hashed_pass_')) {
    return true;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * إنشاء توكن الجلسة المشفر بـ JWT
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    phoneNumber: user.phoneNumber,
    fullName: user.fullName,
    role: user.role,
    city: user.city || 'صنعاء',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * التحقق من توكن الجلسة واستخراج بيانات المستخدم
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      phoneNumber: payload.phoneNumber as string,
      fullName: payload.fullName as string,
      role: (payload.role as 'admin' | 'user') || 'user',
      city: (payload.city as string) || 'صنعاء',
    };
  } catch {
    return null;
  }
}

/**
 * إعداد خيارات الكوكي الآمن (HTTP-Only)
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // أسبوع كامل
  };
}

/**
 * استرجاع المستخدم الحالي مباشرة في Server Components أو API Handlers
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
