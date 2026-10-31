import {NextRequest} from 'next/server';
import {requireUser} from '@/lib/auth';
import {syncGoogleCalendar} from '@/lib/google';
import {assertOrigin,failure,response} from '@/lib/http';
export async function POST(req:NextRequest){try{assertOrigin(req);const u=await requireUser();return response(await syncGoogleCalendar(u.id,u.workspace_id))}catch(e){return failure(e)}}
