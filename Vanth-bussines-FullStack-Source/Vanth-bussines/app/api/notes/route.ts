import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {one,query} from '@/lib/db';
import {assertOrigin,body,failure,response,HttpError} from '@/lib/http';
import {noteSchema,uuid} from '@/lib/validation';
export async function GET(){try{const u=await requireUser();return response({items:await query('SELECT * FROM notes WHERE workspace_id=$1 ORDER BY pinned DESC,updated_at DESC',[u.workspace_id])})}catch(e){return failure(e)}}
export async function POST(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=noteSchema.parse(await body(req));const item=await one('INSERT INTO notes(workspace_id,title,content,pinned) VALUES($1,$2,$3,$4) RETURNING *',[u.workspace_id,v.title,v.content,v.pinned]);return response({item},201)}catch(e){return failure(e)}}
export async function PATCH(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=z.object({id:uuid}).and(noteSchema.partial()).parse(await body(req));const x=await one<Record<string,unknown>>('SELECT * FROM notes WHERE id=$1 AND workspace_id=$2',[v.id,u.workspace_id]);if(!x)throw new HttpError(404,'Nota não encontrada');const d={...x,...v};const item=await one('UPDATE notes SET title=$3,content=$4,pinned=$5,updated_at=now() WHERE id=$1 AND workspace_id=$2 RETURNING *',[v.id,u.workspace_id,d.title,d.content,d.pinned]);return response({item})}catch(e){return failure(e)}}
export async function DELETE(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const id=uuid.parse(req.nextUrl.searchParams.get('id'));const rows=await query('DELETE FROM notes WHERE id=$1 AND workspace_id=$2 RETURNING id',[id,u.workspace_id]);if(!rows.length)throw new HttpError(404,'Nota não encontrada');return response({ok:true})}catch(e){return failure(e)}}
