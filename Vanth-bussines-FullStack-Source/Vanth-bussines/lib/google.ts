import {one,query} from '@/lib/db';
import {decrypt,encrypt} from '@/lib/security';
import {HttpError} from '@/lib/http';
export type Connection={id:string,user_id:string,refresh_token_enc:string,access_token_enc:string|null,access_expires_at:Date|null,provider_email:string|null};
export async function connection(userId:string){return one<Connection>('SELECT * FROM calendar_connections WHERE user_id=$1 AND provider=\'google\'',[userId])}
const GOOGLE_TOKEN='https://oauth2.googleapis.com/token';
export async function googleAccess(conn:Connection){
 if(conn.access_token_enc&&conn.access_expires_at&&new Date(conn.access_expires_at).getTime()>Date.now()+60000)return decrypt(conn.access_token_enc);
 const response=await fetch(GOOGLE_TOKEN,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID??'',client_secret:process.env.GOOGLE_CLIENT_SECRET??'',grant_type:'refresh_token',refresh_token:decrypt(conn.refresh_token_enc)})});
 if(!response.ok)throw new HttpError(502,'Não foi possível atualizar a autorização Google. Reconecte sua conta.');
 const data=await response.json() as {access_token:string,expires_in:number};
 await query('UPDATE calendar_connections SET access_token_enc=$2,access_expires_at=now()+($3::int*interval \'1 second\') WHERE id=$1',[conn.id,encrypt(data.access_token),data.expires_in]);
 return data.access_token;
}
export async function googleRequest(conn:Connection,path:string,init:RequestInit={}){
 const auth=await googleAccess(conn);
 const res=await fetch('https://www.googleapis.com/calendar/v3'+path,{...init,headers:{Authorization:`Bearer ${auth}`,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store'});
 if(!res.ok){if(res.status===410)throw new HttpError(410,'Token de sincronização expirado');if(res.status===401||res.status===403)throw new HttpError(502,'Permissão Google expirada ou insuficiente. Reconecte sua conta.');throw new HttpError(502,'Google Calendar indisponível ('+res.status+')')}
 if(res.status===204)return null;
 return await res.json();
}
export type GoogleEvent={id:string,summary?:string,description?:string,location?:string,status?:string,etag?:string,start?:{dateTime?:string,date?:string},end?:{dateTime?:string,date?:string}};
export function normalizedGoogleEvent(e:GoogleEvent){
 const allDay=!!e.start?.date&&!e.start?.dateTime;
 const starts=e.start?.dateTime||(e.start?.date?e.start.date+'T00:00:00.000Z':null);
 const ends=e.end?.dateTime||(e.end?.date?e.end.date+'T00:00:00.000Z':null);
 if(!starts||!ends)return null;
 return {title:e.summary||'(Sem título)',description:e.description||'',location:e.location||'',starts,ends,allDay,etag:e.etag||null};
}
export async function syncGoogleCalendar(userId:string,workspaceId:string){
 const conn=await connection(userId);if(!conn)throw new HttpError(409,'Conecte o Google Calendar primeiro');
 const calendarId='primary';
 const state=await one<{sync_token:string|null}>('SELECT sync_token FROM calendar_sync_states WHERE connection_id=$1 AND calendar_id=$2',[conn.id,calendarId]);
 let syncToken=state?.sync_token??null;let count=0;
 for(let reset=0;reset<2;reset++){
  let pageToken:string|null=null,finalToken:string|null=null,events:GoogleEvent[]=[];
  try{
   do{
    const qs=new URLSearchParams({maxResults:'250',showDeleted:'true',singleEvents:'true'});
    if(syncToken)qs.set('syncToken',syncToken);if(pageToken)qs.set('pageToken',pageToken);
    const data=await googleRequest(conn,`/calendars/primary/events?${qs}`) as {items:GoogleEvent[],nextPageToken?:string,nextSyncToken?:string};
    events=events.concat(data.items??[]);pageToken=data.nextPageToken??null;finalToken=data.nextSyncToken??finalToken;
   }while(pageToken);
   for(const e of events){
    if(e.status==='cancelled'){
      await query('UPDATE events SET cancelled=true,updated_at=now() WHERE connection_id=$1 AND google_calendar_id=$2 AND google_event_id=$3',[conn.id,calendarId,e.id]);continue;
    }
    const v=normalizedGoogleEvent(e);if(!v)continue;
    await query(`INSERT INTO events(workspace_id,title,description,location,starts_at,ends_at,all_day,source,connection_id,google_calendar_id,google_event_id,etag,cancelled) VALUES($1,$2,$3,$4,$5,$6,$7,'google',$8,$9,$10,$11,false)
      ON CONFLICT (connection_id,google_calendar_id,google_event_id) WHERE connection_id IS NOT NULL AND google_event_id IS NOT NULL DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,location=EXCLUDED.location,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,all_day=EXCLUDED.all_day,etag=EXCLUDED.etag,cancelled=false,updated_at=now()`,[workspaceId,v.title,v.description,v.location,v.starts,v.ends,v.allDay,conn.id,calendarId,e.id,v.etag]);count++;
   }
   if(finalToken)await query(`INSERT INTO calendar_sync_states(connection_id,calendar_id,sync_token,last_synced_at) VALUES($1,$2,$3,now()) ON CONFLICT(connection_id,calendar_id) DO UPDATE SET sync_token=EXCLUDED.sync_token,last_synced_at=now()`,[conn.id,calendarId,finalToken]);
   return {synced:count,lastSyncedAt:new Date().toISOString()};
  }catch(err){if(err instanceof HttpError&&err.status===410&&syncToken){syncToken=null;await query('DELETE FROM calendar_sync_states WHERE connection_id=$1 AND calendar_id=$2',[conn.id,calendarId]);continue}throw err}
 }
 throw new HttpError(502,'Não foi possível concluir a sincronização');
}
export async function pushGoogleEvent(userId:string,v:{title:string,description:string,starts_at:string,ends_at:string,location:string,all_day:boolean}){
 const conn=await connection(userId);if(!conn)throw new HttpError(409,'Google Calendar não conectado');
 const body={summary:v.title,description:v.description,location:v.location,start:v.all_day?{date:v.starts_at.slice(0,10)}:{dateTime:v.starts_at},end:v.all_day?{date:v.ends_at.slice(0,10)}:{dateTime:v.ends_at}};
 const data=await googleRequest(conn,'/calendars/primary/events',{method:'POST',body:JSON.stringify(body)}) as GoogleEvent;
 if(!data?.id)throw new HttpError(502,'Google não retornou o identificador do evento');
 return {conn,id:data.id,etag:data.etag};
}
