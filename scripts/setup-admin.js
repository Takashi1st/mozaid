const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:Kiss0OduwEqtGlqYmAMyedKswhoHiGcy2jkmWxZge95ELjeoV29tRrnmqxZvetuo@161.97.152.98:9374/postgres';

  const client = new Client({ connectionString, ssl: false });
  await client.connect();

  console.log('Adding "admin" and "user" to user_role_enum if not present...');
  try {
    await client.query("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'admin';");
    await client.query("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'user';");
  } catch (err) {
    console.log('Enum alteration notice:', err.message);
  }

  console.log('Setting up Admin account 781345866...');
  const passwordHash = await bcrypt.hash('781345866', 10);

  // Note: PostgreSQL does not allow using newly added enum values in the same transaction,
  // so we can use 'super_admin' or reconnect to use 'admin'. Both map to Admin role!
  const res = await client.query(`
    INSERT INTO users (full_name, phone_number, password_hash, role, city, kyc_status, verification_tier, is_trusted_seller, reputation_score)
    VALUES ('مدير النظام العام', '781345866', $1, 'super_admin', 'صنعاء', 'verified', 'tier3_elite_trader', true, 5.0)
    ON CONFLICT (phone_number) 
    DO UPDATE SET password_hash = $1, role = 'super_admin', full_name = 'مدير النظام العام'
    RETURNING id, full_name, phone_number, role;
  `, [passwordHash]);

  const adminUser = res.rows[0];
  console.log('Admin account created/updated successfully:', adminUser);

  await client.query(`
    INSERT INTO wallets (user_id, available_balance, frozen_escrow_balance, currency)
    VALUES ($1, 50000000, 0, 'YER')
    ON CONFLICT (user_id) DO NOTHING;
  `, [adminUser.id]);

  console.log('Admin wallet created/verified successfully.');
  await client.end();
}

run().catch((err) => {
  console.error('Error creating admin account:', err);
  process.exit(1);
});
