import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {token} from '@/lib/security';
import {requireUser} from '@/lib/auth';
import {failure,HttpError} from '@/lib/http';
export async function GET(_req:NextRequest){try{await requireUser();const clientId=process.env.GOOGLE_CLIENT_ID;if(!clientId)throw new HttpError(503,'OAuth Google ainda não configurado');const state=token();(await cookies()).set('vanth_google_state',state,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:600,path:'/'});
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:clientId,redirect_uri:(process.env.APP_URL??'')+'/api/google/callback',response_type:'code',access_type:'offline',prompt:'consent',scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.calendarlist.readonly',state}).toString();return NextResponse.redirect(url);
 }catch(e){return failure(e)}}
