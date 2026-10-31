import { NextRequest } from 'next/server';
import { z } from 'zod';
import { one } from '@/lib/db';
import { email,code } from '@/lib/validation';
import { consumeChallenge } from '@/lib/challenges';
import { assertOrigin,body,failure,response,HttpError } from '@/lib/http';
import {createSession,rateLimit,clientIp} from '@/lib/auth';
import {cookies} from 'next/headers';
export async function POST(req:NextRequest){try{assertOrigin(req);await rateLimit('otp-ip:'+clientIp(req),30,900);
 const data=z.object({email,code}).parse(await body(req));const u=await one<{id:string}>('SELECT id FROM users WHERE email=$1 AND email_verified=true',[data.email]);if(!u)throw new HttpError(400,'Código inválido');
 const jar=await cookies();const pending=jar.get('vanth_login_pending')?.value;await consumeChallenge(u.id,'login',data.code,pending);jar.delete('vanth_login_pending');await createSession(u.id,req.headers.get('user-agent')??'');
 return response({ok:true,next:'/app/dashboard'});
 }catch(e){return failure(e)}}
