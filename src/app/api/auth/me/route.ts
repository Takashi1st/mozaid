import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    // جلب رصيد المحفظة الحي
    const walletRes = await query(
      `SELECT available_balance, frozen_escrow_balance, currency 
       FROM wallets 
       WHERE user_id = $1 
       LIMIT 1;`,
      [user.id]
    );

    const wallet = walletRes.rows[0] || {
      available_balance: 0,
      frozen_escrow_balance: 0,
      currency: 'YER',
    };

    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        wallet: {
          availableBalance: Number(wallet.available_balance || 0),
          frozenBalance: Number(wallet.frozen_escrow_balance || 0),
          currency: wallet.currency || 'YER',
        },
      },
    });
  } catch (error) {
    console.error('Auth /me error:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
