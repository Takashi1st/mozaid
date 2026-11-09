const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function test() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:Kiss0OduwEqtGlqYmAMyedKswhoHiGcy2jkmWxZge95ELjeoV29tRrnmqxZvetuo@161.97.152.98:9374/postgres';

  const client = new Client({ connectionString, ssl: false });
  await client.connect();

  console.log('Testing Admin Credentials: 781345866 / 781345866...');
  const res = await client.query(
    'SELECT id, full_name, phone_number, password_hash, role FROM users WHERE phone_number = $1',
    ['781345866']
  );

  const admin = res.rows[0];
  console.log('Found user:', {
    id: admin.id,
    fullName: admin.full_name,
    phone: admin.phone_number,
    role: admin.role,
  });

  const isPasswordMatch = await bcrypt.compare('781345866', admin.password_hash);
  console.log('✅ Password match verified:', isPasswordMatch);

  const walletRes = await client.query(
    'SELECT available_balance, currency FROM wallets WHERE user_id = $1',
    [admin.id]
  );
  console.log('✅ Admin wallet verified:', walletRes.rows[0]);

  await client.end();
}

test().catch(console.error);
