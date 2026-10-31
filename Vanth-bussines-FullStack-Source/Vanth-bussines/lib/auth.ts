import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { one,query } from '@/lib/db';
import { HttpError } from '@/lib/http';
import { sha256,token } from '@/lib/security';
export const SESSION_COOKIE='vanth_session';
export type SessionUser={id:string,email:string,name:string,workspace_id:string,role:string};
export async function getUser():Promise<SessionUser|null>{
 const cookie=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!cookie)return null;
 return await one<SessionUser>(`SELECT u.id,u.email,u.name,wm.workspace_id,wm.role FROM sessions s JOIN users u ON u.id=s.user_id JOIN workspace_members wm ON wm.user_id=u.id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.email_verified=true ORDER BY wm.role='owner' DESC LIMIT 1`,[sha256(cookie)]);
}
export async function requireUser(){const u=await getUser();if(!u)throw new HttpError(401,'Autenticação necessária');return u}
export async function createSession(userId:string,agent:string){const raw=token();await query('INSERT INTO sessions(user_id,token_hash,expires_at,user_agent) VALUES($1,$2,now()+interval \'14 days\',$3)',[userId,sha256(raw),agent.slice(0,250)]);(await cookies()).set(SESSION_COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:14*86400});}
export async function revokeSession(){const c=await cookies();const raw=c.get(SESSION_COOKIE)?.value;if(raw)await query('UPDATE sessions SET revoked_at=now() WHERE token_hash=$1',[sha256(raw)]);c.delete(SESSION_COOKIE)}
export async function rateLimit(key:string,max:number,windowSec:number){
 const row=await one<{attempts:number}>(`INSERT INTO rate_limits(key,attempts,window_start) VALUES($1,1,now()) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.window_start<now()-($2::int*interval '1 second') THEN 1 ELSE rate_limits.attempts+1 END,window_start=CASE WHEN rate_limits.window_start<now()-($2::int*interval '1 second') THEN now() ELSE rate_limits.window_start END RETURNING attempts`,[key,windowSec]);
 if(row&&row.attempts>max)throw new HttpError(429,'Muitas tentativas. Tente novamente mais tarde.');
}
export const clientIp=(req:NextRequest)=>req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
