export async function sendOtp(email:string,code:string,reason:'register'|'login'|'reset'){
 const key=process.env.EMAIL_API_KEY,from=process.env.EMAIL_FROM;
 if(!key||!from)throw Error('Envio de e-mail não configurado');
 const titles={register:'Verificação de e-mail',login:'Código de verificação de acesso',reset:'Recuperação de senha'};
 const msg=`Recebemos uma solicitação: ${titles[reason]}.\n\nSeu código de segurança é: ${code}\n\nEste código expira em 10 minutos. Se você não solicitou este acesso, ignore esta mensagem.`;
 const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Vanth.bussines | Código de verificação',text:msg})});
 if(!result.ok)throw Error(`Provedor de e-mail respondeu ${result.status}`);
}
