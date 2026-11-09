import { Pool, QueryResult, QueryResultRow } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:Kiss0OduwEqtGlqYmAMyedKswhoHiGcy2jkmWxZge95ELjeoV29tRrnmqxZvetuo@161.97.152.98:9374/postgres';

// إنشاء مجمع اتصالات دائم عالي الأداء لقاعدة البيانات
export const pool = new Pool({
  connectionString,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * دالة استعلام عامة ومحمية
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Database Query] executed in ${duration}ms | rows: ${res.rowCount}`);
    }
    return res;
  } catch (error) {
    console.error('[Database Query Error]:', error);
    throw error;
  }
}

/**
 * فحص صحة واستقرار الاتصال بقاعدة البيانات
 */
export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean; version?: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const res = await pool.query('SELECT version();');
    const latencyMs = Date.now() - start;
    return {
      isHealthy: true,
      version: res.rows[0].version,
      latencyMs,
    };
  } catch (error) {
    return {
      isHealthy: false,
      latencyMs: Date.now() - start,
    };
  }
}
