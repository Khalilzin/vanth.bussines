import {NextRequest} from 'next/server';
import {query} from '@/lib/db';
import {syncGoogleCalendar} from '@/lib/google';
import {failure,response,HttpError} from '@/lib/http';
export async function GET(req:NextRequest){try{
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)throw new HttpError(401,'Não autorizado');
 const connections=await query<{user_id:string,workspace_id:string}>(`SELECT c.user_id,wm.workspace_id FROM calendar_connections c JOIN workspace_members wm ON wm.user_id=c.user_id ORDER BY c.connected_at LIMIT 100`);
 const results=[];
 for(const c of connections){try{const r=await syncGoogleCalendar(c.user_id,c.workspace_id);results.push({userId:c.user_id,ok:true,count:r.synced})}catch(e){results.push({userId:c.user_id,ok:false,error:e instanceof Error?e.message:'Falha'})}}
 return response({processed:results.length,results});
 }catch(e){return failure(e)}}
