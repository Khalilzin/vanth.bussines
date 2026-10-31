import {NextRequest} from 'next/server';
import {requireUser} from '@/lib/auth';
import {query} from '@/lib/db';
import {connection} from '@/lib/google';
import {decrypt} from '@/lib/security';
import {assertOrigin,failure,response} from '@/lib/http';
export async function POST(req:NextRequest){try{assertOrigin(req);const u=await requireUser();const conn=await connection(u.id);if(!conn)return response({ok:true});
 try{await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:decrypt(conn.refresh_token_enc)})})}catch{/* Google may be unreachable, local revocation still proceeds */}
 await query('UPDATE events SET connection_id=NULL,google_event_id=NULL,google_calendar_id=NULL,source=\'imported\' WHERE workspace_id=$1 AND connection_id=$2',[u.workspace_id,conn.id]);
 await query('DELETE FROM calendar_connections WHERE id=$1',[conn.id]);return response({ok:true,message:'Conta desconectada; eventos importados preservados'});
 }catch(e){return failure(e)}}
