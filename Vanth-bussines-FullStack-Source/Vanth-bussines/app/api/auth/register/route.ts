import { NextRequest } from 'next/server';
import { z } from 'zod';
import { one,query,pool } from '@/lib/db';
import { assertOrigin,body,failure,response,HttpError } from '@/lib/http';
import { rateLimit,clientIp } from '@/lib/auth';
import { email,password } from '@/lib/validation';
import { hashPassword } from '@/lib/security';
import { issueChallenge } from '@/lib/challenges';
export async function POST(req:NextRequest){try{
 assertOrigin(req);await rateLimit('register:'+clientIp(req),5,3600);
 if(process.env.ALLOW_REGISTRATION!=='true')throw new HttpError(403,'Cadastro temporariamente desativado');
 const input=z.object({email,name:z.string().trim().min(2).max(80),password}).parse(await body(req));
 const address=email.parse(input.email);
 const allowed=(process.env.ADMIN_ALLOWED_EMAILS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!allowed.includes(address)||!address.endsWith('@gmail.com'))throw new HttpError(403,'Cadastro restrito a contas autorizadas');
 if(await one('SELECT id FROM users WHERE email=$1',[address]))throw new HttpError(409,'Esta conta já foi cadastrada');
 const pass=await hashPassword(input.password);
 const client=await pool.connect();let userId='';
 try{await client.query('BEGIN');const u=await client.query<{id:string}>('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id',[address,input.name,pass]);userId=u.rows[0].id;
 const w=await client.query<{id:string}>('INSERT INTO workspaces(name,owner_id) VALUES($1,$2) RETURNING id',['Vanth',userId]);
 await client.query('INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)',[w.rows[0].id,userId,'owner']);await client.query('COMMIT');}
 catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 await issueChallenge(userId,address,'register');
 return response({ok:true,next:'/verify-email',message:'Código de verificação enviado'},201);
 }catch(e){return failure(e)}}
