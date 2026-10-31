import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {requireUser} from '@/lib/auth';
import {query} from '@/lib/db';
import {encrypt} from '@/lib/security';
export async function GET(req:NextRequest){
 const dest=new URL('/app/settings/integrations',process.env.APP_URL??'http://localhost:3000');
 try{
 const u=await requireUser();const jar=await cookies();const expected=jar.get('vanth_google_state')?.value;jar.delete('vanth_google_state');
 const state=req.nextUrl.searchParams.get('state'),code=req.nextUrl.searchParams.get('code');if(!expected||state!==expected||!code)throw Error('state ou code inválido');
 const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID??'',client_secret:process.env.GOOGLE_CLIENT_SECRET??'',redirect_uri:(process.env.APP_URL??'')+'/api/google/callback',grant_type:'authorization_code'})});
 if(!res.ok)throw Error('Falha na autorização Google');
 const data=await res.json() as {refresh_token?:string,access_token:string,expires_in:number};
 if(!data.refresh_token)throw Error('Google não forneceu refresh token. Remova acesso anterior e tente novamente.');
 await query(`INSERT INTO calendar_connections(user_id,refresh_token_enc,access_token_enc,access_expires_at)
 VALUES($1,$2,$3,now()+($4::int*interval '1 second')) ON CONFLICT(user_id,provider) DO UPDATE SET refresh_token_enc=EXCLUDED.refresh_token_enc,access_token_enc=EXCLUDED.access_token_enc,access_expires_at=EXCLUDED.access_expires_at,connected_at=now()`,[u.id,encrypt(data.refresh_token),encrypt(data.access_token),data.expires_in]);
 dest.searchParams.set('connected','1');
 }catch(e){dest.searchParams.set('error',e instanceof Error?e.message.slice(0,150):'Erro no OAuth')}
 return NextResponse.redirect(dest);
}
