import type { NextRequest } from 'next/server';
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export function assertOrigin(req:NextRequest){
 const origin=req.headers.get('origin');
 if(!origin)throw new HttpError(403,'Origem ausente. Requisição bloqueada.');
 const wanted=new URL(process.env.APP_URL??'http://localhost:3000');
 if(new URL(origin).origin!==wanted.origin)throw new HttpError(403,'Origem não autorizada.');
}
export const response=(payload:unknown,status=200)=>Response.json(payload,{status,headers:{'Cache-Control':'no-store'}});
export function failure(err:unknown){if(err instanceof HttpError)return response({error:err.message},err.status);if(err instanceof Error&&err.name==='ZodError')return response({error:'Dados inválidos',details:err.message},400); console.error('Server error:',err instanceof Error?err.message:'unhandled');return response({error:'Não foi possível processar a solicitação.'},500)}
export async function body(req:NextRequest){try{return await req.json()}catch{throw new HttpError(400,'JSON inválido')}}
