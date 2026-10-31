import { NextRequest } from 'next/server';
import { z } from 'zod';
import { one } from '@/lib/db';
import { email } from '@/lib/validation';
import { issueChallenge } from '@/lib/challenges';
import { rateLimit,clientIp } from '@/lib/auth';
import { assertOrigin,body,failure,response } from '@/lib/http';
export async function POST(req:NextRequest){try{assertOrigin(req);await rateLimit('forgot-ip:'+clientIp(req),6,3600);
 const {email:address}=z.object({email}).parse(await body(req));const u=await one<{id:string}>('SELECT id FROM users WHERE email=$1 AND email_verified=true',[address]);
 if(u){await issueChallenge(u.id,address,'reset')}
 return response({ok:true,message:'Se existir uma conta verificada, enviaremos um código.'});
 }catch(e){return failure(e)}}
