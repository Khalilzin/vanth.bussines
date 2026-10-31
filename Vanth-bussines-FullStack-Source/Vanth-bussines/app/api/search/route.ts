import {NextRequest} from 'next/server';
import {requireUser} from '@/lib/auth';
import {query} from '@/lib/db';
import {response,failure} from '@/lib/http';
export async function GET(req:NextRequest){try{const u=await requireUser();const q=(req.nextUrl.searchParams.get('q')??'').trim().slice(0,100);if(q.length<2)return response({items:[]});const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';const items=await query(`SELECT id,title,'task' AS type FROM tasks WHERE workspace_id=$1 AND title ILIKE $2 UNION ALL SELECT id,title,'note' AS type FROM notes WHERE workspace_id=$1 AND title ILIKE $2 UNION ALL SELECT id,name AS title,'project' AS type FROM projects WHERE workspace_id=$1 AND name ILIKE $2 UNION ALL SELECT id,title,'event' AS type FROM events WHERE workspace_id=$1 AND title ILIKE $2 LIMIT 40`,[u.workspace_id,pattern]);return response({items})}catch(e){return failure(e)}}
