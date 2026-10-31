import { NextRequest } from 'next/server';
import { z } from 'zod';
import { one,query } from '@/lib/db';
import {email,password,code} from '@/lib/validation';
import {consumeChallenge} from '@/lib/challenges';
import { hashPassword } from '@/lib/security';
import {assertOrigin,body,failure,response,HttpError} from '@/lib/http';
export async function POST(req:NextRequest){try{assertOrigin(req);const data=z.object({email,code,password}).parse(await body(req));const u=await one<{id:string}>('SELECT id FROM users WHERE email=$1 AND email_verified=true',[data.email]);if(!u)throw new HttpError(400,'Código inválido');await consumeChallenge(u.id,'reset',data.code);await query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2',[await hashPassword(data.password),u.id]);await query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1',[u.id]);return response({ok:true,next:'/login'});}catch(e){return failure(e)}}
