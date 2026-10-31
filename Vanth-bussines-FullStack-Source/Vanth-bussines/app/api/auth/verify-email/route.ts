import { NextRequest } from 'next/server';
import { z } from 'zod';
import { one,query } from '@/lib/db';
import { email,code } from '@/lib/validation';
import { consumeChallenge } from '@/lib/challenges';
import { assertOrigin,body,failure,response,HttpError } from '@/lib/http';
export async function POST(req:NextRequest){try{assertOrigin(req);
 const data=z.object({email,code}).parse(await body(req));const u=await one<{id:string}>('SELECT id FROM users WHERE email=$1',[data.email]);if(!u)throw new HttpError(400,'Código inválido');
 await consumeChallenge(u.id,'register',data.code);await query('UPDATE users SET email_verified=true,updated_at=now() WHERE id=$1',[u.id]);
 return response({ok:true,next:'/login',message:'E-mail verificado. Faça seu login.'});
 }catch(e){return failure(e)}}
