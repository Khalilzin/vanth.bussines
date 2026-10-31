import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {one,query} from '@/lib/db';
import {assertOrigin,body,failure,response} from '@/lib/http';
export async function GET(){try{const u=await requireUser();const item=await one('SELECT id,name,email,preferences,created_at FROM users WHERE id=$1',[u.id]);return response({item})}catch(e){return failure(e)}}
export async function PATCH(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=z.object({name:z.string().trim().min(2).max(80),theme:z.enum(['dark','light']),timezone:z.string().max(80)}).parse(await body(req));const item=await one('UPDATE users SET name=$2,preferences=jsonb_set(jsonb_set(preferences,\'{theme}\',to_jsonb($3::text)),\'{timezone}\',to_jsonb($4::text)),updated_at=now() WHERE id=$1 RETURNING id,name,email,preferences',[u.id,v.name,v.theme,v.timezone]);return response({item})}catch(e){return failure(e)}}
