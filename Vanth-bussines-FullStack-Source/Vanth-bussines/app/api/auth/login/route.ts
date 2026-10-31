import { NextRequest } from 'next/server';
import { z } from 'zod';
import { one } from '@/lib/db';
import { assertOrigin,body,failure,response,HttpError } from '@/lib/http';
import { rateLimit,clientIp } from '@/lib/auth';
import { email } from '@/lib/validation';
import { verifyPassword } from '@/lib/security';
import { issueChallenge } from '@/lib/challenges';
import { cookies } from 'next/headers';
export async function POST(req:NextRequest){try{
 assertOrigin(req);await rateLimit('login-ip:'+clientIp(req),12,900);
 const data=z.object({email,password:z.string().min(1)}).parse(await body(req));const address=email.parse(data.email);
 await rateLimit('login-user:'+address,8,900);
 const found=await one<{id:string,email:string,password_hash:string,email_verified:boolean}>('SELECT id,email,password_hash,email_verified FROM users WHERE email=$1',[address]);
 if(!found||!found.email_verified||!(await verifyPassword(data.password,found.password_hash)))throw new HttpError(401,'Credenciais inválidas');
 const {pending}=await issueChallenge(found.id,found.email,'login');
 (await cookies()).set('vanth_login_pending',pending!,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:600,path:'/'});
 return response({ok:true,next:'/verify-login',message:'Código de segurança enviado'});
 }catch(e){return failure(e)}}
