import { NextRequest } from 'next/server';
import { assertOrigin,failure,response } from '@/lib/http';
import { revokeSession } from '@/lib/auth';
export async function POST(req:NextRequest){try{assertOrigin(req);await revokeSession();return response({ok:true})}catch(e){return failure(e)}}
