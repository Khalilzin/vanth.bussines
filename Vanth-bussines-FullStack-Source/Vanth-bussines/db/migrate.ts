import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
const pool = new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{
 const sql=readFileSync(resolve(process.cwd(),'db/migrations/0001_init.sql'),'utf8');
 const client=await pool.connect();
 try {await client.query('BEGIN');await client.query(sql);await client.query('COMMIT'); console.log('Migration 0001 applied');}
 catch(err){await client.query('ROLLBACK');throw err;} finally {client.release();await pool.end();}
})().catch(err=>{console.error(err);process.exit(1)});
