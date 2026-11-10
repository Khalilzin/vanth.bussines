import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
 const dir = resolve(process.cwd(), 'db/migrations');
 const files = readdirSync(dir).filter(name => /^\d+_[\w-]+\.sql$/.test(name)).sort();
 if (!files.length) throw new Error('Nenhuma migração encontrada');
 const client = await pool.connect();
 try {
  await client.query('BEGIN');
  for (const name of files) {
   await client.query(readFileSync(resolve(dir, name), 'utf8'));
   console.log('Migração aplicada:', name);
  }
  await client.query('COMMIT');
 } catch (error) {
  await client.query('ROLLBACK');
  throw error;
 } finally {
  client.release();
  await pool.end();
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
