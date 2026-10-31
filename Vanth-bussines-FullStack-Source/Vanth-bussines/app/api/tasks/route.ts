import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {one,query} from '@/lib/db';
import {assertOrigin,body,failure,response,HttpError} from '@/lib/http';
import {taskSchema,uuid} from '@/lib/validation';
export async function GET(){try{const u=await requireUser();return response({items:await query('SELECT t.*,p.name project_name FROM tasks t LEFT JOIN projects p ON p.id=t.project_id WHERE t.workspace_id=$1 ORDER BY CASE t.status WHEN \'done\' THEN 1 ELSE 0 END, t.due_at ASC NULLS LAST,t.created_at DESC LIMIT 500',[u.workspace_id])})}catch(e){return failure(e)}}
export async function POST(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=taskSchema.parse(await body(req));
 if(v.project_id&&!await one('SELECT id FROM projects WHERE workspace_id=$1 AND id=$2',[u.workspace_id,v.project_id]))throw new HttpError(400,'Projeto inválido');
 const item=await one('INSERT INTO tasks(workspace_id,project_id,title,description,status,priority,due_at,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $5=\'done\' THEN now() ELSE NULL END) RETURNING *',[u.workspace_id,v.project_id??null,v.title,v.description,v.status,v.priority,v.due_at??null]);return response({item},201)
 }catch(e){return failure(e)}}
export async function PATCH(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=z.object({id:uuid}).and(taskSchema.partial()).parse(await body(req));
 const existing=await one<Record<string,unknown>>('SELECT * FROM tasks WHERE id=$1 AND workspace_id=$2',[v.id,u.workspace_id]);if(!existing)throw new HttpError(404,'Tarefa não encontrada');
 if(v.project_id&&!await one('SELECT id FROM projects WHERE workspace_id=$1 AND id=$2',[u.workspace_id,v.project_id]))throw new HttpError(400,'Projeto inválido');
 const merged={...existing,...v};
 const item=await one('UPDATE tasks SET title=$3,description=$4,status=$5,priority=$6,due_at=$7,project_id=$8,completed_at=CASE WHEN $5=\'done\' THEN COALESCE(completed_at,now()) ELSE NULL END,updated_at=now() WHERE id=$1 AND workspace_id=$2 RETURNING *',[v.id,u.workspace_id,merged.title,merged.description,merged.status,merged.priority,merged.due_at,merged.project_id]);return response({item});
 }catch(e){return failure(e)}}
export async function DELETE(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const id=uuid.parse(req.nextUrl.searchParams.get('id'));const rows=await query('DELETE FROM tasks WHERE id=$1 AND workspace_id=$2 RETURNING id',[id,u.workspace_id]);if(!rows.length)throw new HttpError(404,'Tarefa não encontrada');return response({ok:true})}catch(e){return failure(e)}}
