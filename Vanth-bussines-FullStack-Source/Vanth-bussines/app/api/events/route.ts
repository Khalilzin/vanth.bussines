import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {query,one} from '@/lib/db';
import {assertOrigin,body,failure,response,HttpError} from '@/lib/http';
import {eventSchema,uuid} from '@/lib/validation';
import {connection,googleRequest,pushGoogleEvent} from '@/lib/google';
export async function GET(req:NextRequest){try{const u=await requireUser();const from=req.nextUrl.searchParams.get('from');const to=req.nextUrl.searchParams.get('to');const items=await query('SELECT * FROM events WHERE workspace_id=$1 AND cancelled=false AND ($2::timestamptz IS NULL OR ends_at>=$2::timestamptz) AND ($3::timestamptz IS NULL OR starts_at<=$3::timestamptz) ORDER BY starts_at ASC LIMIT 2000',[u.workspace_id,from,to]);return response({items})}catch(e){return failure(e)}}
export async function POST(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=eventSchema.parse(await body(req));
 let google:null|{conn:{id:string},id:string,etag?:string}=null;
 if(v.destination==='google')google=await pushGoogleEvent(u.id,v);
 const item=await one('INSERT INTO events(workspace_id,title,description,starts_at,ends_at,all_day,location,category,source,connection_id,google_calendar_id,google_event_id,etag) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',[u.workspace_id,v.title,v.description,v.starts_at,v.ends_at,v.all_day,v.location,v.category,google?'google':'local',google?.conn.id??null,google?'primary':null,google?.id??null,google?.etag??null]);return response({item},201)
 }catch(e){return failure(e)}}
export async function PATCH(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const v=z.object({id:uuid}).and(eventSchema.partial()).parse(await body(req));const old=await one<Record<string,unknown>>('SELECT * FROM events WHERE id=$1 AND workspace_id=$2',[v.id,u.workspace_id]);if(!old)throw new HttpError(404,'Evento não encontrado');const d={...old,...v};
 if(new Date(String(d.ends_at))<=new Date(String(d.starts_at)))throw new HttpError(400,'Datas inconsistentes');
 if(old.google_event_id){const conn=await connection(u.id);if(!conn||conn.id!==old.connection_id)throw new HttpError(409,'Conexão Google indisponível');await googleRequest(conn,`/calendars/${encodeURIComponent(String(old.google_calendar_id))}/events/${encodeURIComponent(String(old.google_event_id))}`,{method:'PATCH',body:JSON.stringify({summary:d.title,description:d.description,location:d.location,start:d.all_day?{date:new Date(String(d.starts_at)).toISOString().slice(0,10)}:{dateTime:new Date(String(d.starts_at)).toISOString()},end:d.all_day?{date:new Date(String(d.ends_at)).toISOString().slice(0,10)}:{dateTime:new Date(String(d.ends_at)).toISOString()}})});}
 const item=await one('UPDATE events SET title=$3,description=$4,starts_at=$5,ends_at=$6,all_day=$7,location=$8,category=$9,updated_at=now() WHERE id=$1 AND workspace_id=$2 RETURNING *',[v.id,u.workspace_id,d.title,d.description,d.starts_at,d.ends_at,d.all_day,d.location,d.category]);return response({item})
 }catch(e){return failure(e)}}
export async function DELETE(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const id=uuid.parse(req.nextUrl.searchParams.get('id'));const old=await one<{connection_id:string|null,google_event_id:string|null,google_calendar_id:string|null}>('SELECT * FROM events WHERE id=$1 AND workspace_id=$2',[id,u.workspace_id]);if(!old)throw new HttpError(404,'Evento não encontrado');
 if(old.google_event_id){const conn=await connection(u.id);if(!conn||conn.id!==old.connection_id)throw new HttpError(409,'Conexão Google indisponível');await googleRequest(conn,`/calendars/${encodeURIComponent(old.google_calendar_id||'primary')}/events/${encodeURIComponent(old.google_event_id)}`,{method:'DELETE'});}
 await query('DELETE FROM events WHERE id=$1 AND workspace_id=$2',[id,u.workspace_id]);return response({ok:true})
 }catch(e){return failure(e)}}
