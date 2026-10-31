import {NextRequest} from 'next/server';
import {requireUser} from '@/lib/auth';
import {connection} from '@/lib/google';
import {one} from '@/lib/db';
import {response,failure} from '@/lib/http';
export async function GET(_req:NextRequest){try{const u=await requireUser();const conn=await connection(u.id);const state=conn?await one('SELECT last_synced_at FROM calendar_sync_states WHERE connection_id=$1 AND calendar_id=\'primary\'',[conn.id]):null;return response({connected:!!conn,lastSync:state,providerEmail:conn?.provider_email??null})}catch(e){return failure(e)}}
