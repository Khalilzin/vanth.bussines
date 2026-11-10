import { one,query } from '@/lib/db';
import { HttpError } from '@/lib/http';
import { makeOtp,hashOtp,validOtp,sha256,token } from '@/lib/security';
import { sendOtp } from '@/lib/mail';
type Type='register'|'login'|'reset';
export async function issueChallenge(userId:string,email:string,type:Type){
 const recent=await one<{last_sent_at:Date}>('SELECT last_sent_at FROM auth_challenges WHERE user_id=$1 AND type=$2 AND created_at>now()-interval \'1 minute\' ORDER BY created_at DESC LIMIT 1',[userId,type]);
 if(recent)throw new HttpError(429,'Aguarde um minuto antes de solicitar outro código.');
 const row=await one<{id:string}>(`INSERT INTO auth_challenges(user_id,type,code_hash,expires_at) VALUES ($1,$2,'pending',now()+interval '10 minutes') RETURNING id`,[userId,type]);
 if(!row)throw new Error('Não foi possível gerar desafio');
 const code=makeOtp();const pending=type==='login'?token():null;await query('UPDATE auth_challenges SET code_hash=$2,login_token_hash=$3 WHERE id=$1',[row.id,hashOtp(row.id,code),pending?sha256(pending):null]);
 try { await sendOtp(email,code,type); }catch(err){await query('DELETE FROM auth_challenges WHERE id=$1',[row.id]);throw err}
 return {pending};
}
export async function consumeChallenge(userId:string,type:Type,code:string,pending?:string){
 if(!/^\d{6}$/.test(code))throw new HttpError(400,'Código inválido');
 const challenge=await one<{id:string,code_hash:string,attempts:number,login_token_hash:string|null}>(`SELECT id,code_hash,attempts,login_token_hash FROM auth_challenges WHERE user_id=$1 AND type=$2 AND consumed_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1`,[userId,type]);
 if(!challenge)throw new HttpError(400,'Código expirado ou não encontrado');
 if(type==='login'&&(!pending||!challenge.login_token_hash||sha256(pending)!==challenge.login_token_hash))throw new HttpError(401,'Confirmação de senha expirada. Entre novamente.');
 if(challenge.attempts>=5)throw new HttpError(429,'Limite de tentativas atingido');
 const updated=await one<{attempts:number}>(`UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1 AND attempts<5 AND consumed_at IS NULL RETURNING attempts`,[challenge.id]);
 if(!updated)throw new HttpError(429,'Código bloqueado');
 if(!validOtp(challenge.id,code,challenge.code_hash))throw new HttpError(400,'Código incorreto');
 const used=await one<{id:string}>(`UPDATE auth_challenges SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL AND expires_at>now() RETURNING id`,[challenge.id]);
 if(!used)throw new HttpError(400,'Código já utilizado');
 return true;
}
