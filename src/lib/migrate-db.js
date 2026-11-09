const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:Kiss0OduwEqtGlqYmAMyedKswhoHiGcy2jkmWxZge95ELjeoV29tRrnmqxZvetuo@161.97.152.98:9374/postgres';

  const schemaPath = path.join(__dirname, '../../docs/DATABASE_SCHEMA.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = new Client({
    connectionString,
    ssl: false,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');
    console.log('Executing DATABASE_SCHEMA.sql...');
    
    await client.query(sql);
    console.log('Schema executed successfully!');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('Live Tables created in PostgreSQL:');
    console.table(res.rows);

    // Seed default categories if empty
    const catCheck = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      console.log('Seeding initial categories...');
      await client.query(`
        INSERT INTO categories (name_ar, name_en, slug, icon_name, description) VALUES
        ('سيارات ومركبات', 'Vehicles & Motors', 'vehicles', 'Car', 'سيارات، شاحنات، معدات ثقيلة، ودراجات نارية'),
        ('عقارات وأراضي', 'Real Estate', 'real-estate', 'Building', 'أراضي تجارية وسكنية، بيوت، عمائر، وشقق'),
        ('طاقة شمسية', 'Solar Energy', 'solar-energy', 'Sun', 'منظومات طاقة شمسية، بطاريات ليثيوم، وإنفرترات'),
        ('إلكترونيات وأجهزة', 'Electronics', 'electronics', 'Laptop', 'أجهزة لابتوب، هواتف ذكية، وشبكات'),
        ('مناقصات وتوريدات', 'Tenders & Procurement', 'tenders', 'FileText', 'مناقصات مقاولات، توريدات طبية، وخدمات');
      `);
      console.log('Initial categories seeded successfully!');
    }

  } catch (error) {
    console.error('Migration Error:', error);
  } finally {
    await client.end();
  }
}

migrate();
