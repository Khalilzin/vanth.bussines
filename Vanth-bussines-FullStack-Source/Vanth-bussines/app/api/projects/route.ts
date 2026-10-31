import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {one,query} from '@/lib/db';
import {assertOrigin,body,failure,response,HttpError} from '@/lib/http';
import {projectSchema,uuid} from '@/lib/validation';
export async function GET(){try{const u=await requireUser();return response({items:await query('SELECT p.*, (SELECT count(*)::int FROM tasks t WHERE t.project_id=p.id) task_count FROM projects p WHERE workspace_id=$1 ORDER BY created_at DESC',[u.workspace_id])})}catch(e){return failure(e)}}
export async function POST(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=projectSchema.parse(await body(req));const item=await one('INSERT INTO projects(workspace_id,name,description,status,color) VALUES($1,$2,$3,$4,$5) RETURNING *',[u.workspace_id,v.name,v.description,v.status,v.color]);return response({item},201)}catch(e){return failure(e)}}
export async function PATCH(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=z.object({id:uuid}).and(projectSchema.partial()).parse(await body(req));const x=await one<Record<string,unknown>>('SELECT * FROM projects WHERE id=$1 AND workspace_id=$2',[v.id,u.workspace_id]);if(!x)throw new HttpError(404,'Projeto não encontrado');const d={...x,...v};const item=await one('UPDATE projects SET name=$3,description=$4,status=$5,color=$6,updated_at=now() WHERE id=$1 AND workspace_id=$2 RETURNING *',[v.id,u.workspace_id,d.name,d.description,d.status,d.color]);return response({item})}catch(e){return failure(e)}}
export async function DELETE(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const id=uuid.parse(req.nextUrl.searchParams.get('id'));const rows=await query('DELETE FROM projects WHERE id=$1 AND workspace_id=$2 RETURNING id',[id,u.workspace_id]);if(!rows.length)throw new HttpError(404,'Projeto não encontrado');return response({ok:true})}catch(e){return failure(e)}}
