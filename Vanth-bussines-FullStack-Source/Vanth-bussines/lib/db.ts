import { Pool } from 'pg';
const globalDb = globalThis as typeof globalThis & { __vanthPool?: Pool };
export const pool = globalDb.__vanthPool ?? new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:8000});
if(process.env.NODE_ENV!=='production') globalDb.__vanthPool=pool;
export async function query<T extends object = Record<string,unknown>>(statement:string, params:unknown[]=[]):Promise<T[]> {
 const result = await pool.query(statement,params);
 return result.rows as T[];
}
export async function one<T extends object = Record<string,unknown>>(statement:string,params:unknown[]=[]):Promise<T | null>{return (await query<T>(statement,params))[0]??null}
