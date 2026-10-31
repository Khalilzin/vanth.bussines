import {requireUser} from '@/lib/auth';
import {connection,googleRequest} from '@/lib/google';
import {failure,response,HttpError} from '@/lib/http';
export async function GET(){try{const u=await requireUser();const conn=await connection(u.id);if(!conn)throw new HttpError(409,'Conecte sua conta Google');const calendars=await googleRequest(conn,'/users/me/calendarList?maxResults=100') as {items?:Array<{id:string,summary:string,accessRole:string,primary?:boolean}>};return response({items:calendars.items||[]})}catch(e){return failure(e)}}
