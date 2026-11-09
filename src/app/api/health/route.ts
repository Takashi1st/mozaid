import { NextResponse } from 'next/server';
import { checkDatabaseHealth, query } from '@/lib/db';

export async function GET() {
  const dbHealth = await checkDatabaseHealth();

  let tablesCount = 0;
  let categoriesCount = 0;

  if (dbHealth.isHealthy) {
    try {
      const tablesRes = await query(`
        SELECT count(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      tablesCount = parseInt(tablesRes.rows[0].count, 10);

      const catRes = await query('SELECT count(*) as count FROM categories;');
      categoriesCount = parseInt(catRes.rows[0].count, 10);
    } catch (err) {
      console.error('Error fetching table metrics:', err);
    }
  }

  return NextResponse.json({
    status: dbHealth.isHealthy ? 'healthy' : 'degraded',
    platform: 'Mozaid AI Platform (منصة مزايد الذكية)',
    environment: process.env.NODE_ENV,
    database: {
      connected: dbHealth.isHealthy,
      engine: 'PostgreSQL 18.6 (Live Remote)',
      latencyMs: dbHealth.latencyMs,
      tablesCount,
      categoriesCount,
    },
    aiModel: process.env.GEMINI_MODEL || 'gemma-4-31b-it',
    timestamp: new Date().toISOString(),
  });
}
