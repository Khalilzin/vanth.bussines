import {NextRequest} from 'next/server';
import {cookies} from 'next/headers';
import {z} from 'zod';
import {one} from '@/lib/db';
import {email} from '@/lib/validation';
import {issueChallenge} from '@/lib/challenges';
import {assertOrigin,body,failure,response,HttpError} from '@/lib/http';
import {rateLimit,clientIp} from '@/lib/auth';
import {sha256} from '@/lib/security';
export async function POST(req:NextRequest){try{assertOrigin(req);await rateLimit('resend:'+clientIp(req),10,3600);
 const data=z.object({email,type:z.enum(['register','login'])}).parse(await body(req));
 const user=await one<{id:string,email_verified:boolean}>('SELECT id,email_verified FROM users WHERE email=$1',[data.email]);if(!user)throw new HttpError(400,'Solicitação inválida');
 const jar=await cookies();
 if(data.type==='register'){if(user.email_verified)throw new HttpError(400,'Conta já verificada')}
 else{
 const pending=jar.get('vanth_login_pending')?.value;
 const ch=await one<{login_token_hash:string|null}>(`SELECT login_token_hash FROM auth_challenges WHERE user_id=$1 AND type='login' AND expires_at>now() AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`,[user.id]);
 if(!pending||!ch?.login_token_hash||sha256(pending)!==ch.login_token_hash)throw new HttpError(401,'Confirme sua senha novamente para solicitar um código');
 }
 const result=await issueChallenge(user.id,data.email,data.type);
 if(data.type==='login')jar.set('vanth_login_pending',result.pending!,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:600,path:'/'});
 return response({ok:true,message:'Novo código enviado. Verifique seu Gmail.'});
 }catch(e){return failure(e)}}
