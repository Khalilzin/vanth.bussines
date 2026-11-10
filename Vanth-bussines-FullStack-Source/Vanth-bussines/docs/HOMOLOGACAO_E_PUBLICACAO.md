# Homologação e publicação | Vanth.bussines

## Status verificado (2026-11-10)
- GitHub Actions: testes estáticos, TypeScript, build Next.js, migrações, proteção RLS, endpoints HTTP, autorização e CRUD aprovados no PostgreSQL temporário.
- Banco Supabase: 16 tabelas públicas protegidas com RLS e sem privilégios anon/authenticated; a aplicação usa PostgreSQL direto no backend.
- Email OTP real ainda não testado; Google Calendar fora do escopo.
- A API Vercel retornou 403 ao tentar criar o projeto `vanth-bussines-staging` na equipe `team_azFzrK2qNQrFRYpqTZ8ssmvW` (sem alteração efetiva).
- Não há merge nem implantação de produção.

## 1. Corrigir permissão na Vercel

Confirme, na equipe Vercel correta, se a conexão da aplicação está autorizada a criar projetos. Não envie credenciais por chat nem coloque tokens no repositório. Se optar por criar o projeto no dashboard, use:

- Nome: `vanth-bussines-staging`
- Git repo: `Khalilzin/vanth.bussines`
- Framework: `Next.js`
- Root Directory: `Vanth-bussines-FullStack-Source/Vanth-bussines`
- Node: 22.x
- Deploy Protection: proteger previews/ambientes de homologação
- Branch de homologação: `fix/login-otp-rls-integration-20261110`
- Não vincular domínio de produção antes do teste completo.

## 2. Variáveis privadas (Vercel Project Settings)

Configure no servidor, exclusivamente em `preview` ou ambiente dedicado de homologação, sem prefixo `NEXT_PUBLIC_`:

| Nome | Função |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL da instância Supabase. Preferir conexão pooler adequada a funções serverless. |
| `APP_URL` | Origem HTTPS exata do ambiente, sem barra final; usada para CSRF e callbacks. |
| `AUTH_SECRET` | 32+ caracteres aleatórios e privados para HMAC OTP. |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes aleatórios em formato hexadecimal (64 caracteres). |
| `EMAIL_API_KEY` | Credencial server-only do Resend. |
| `EMAIL_FROM` | Endereço remetente autorizado em domínio verificado. |
| `ADMIN_ALLOWED_EMAILS` | Endereços autorizados separados por vírgula. |
| `ALLOW_REGISTRATION` | `true` apenas durante cadastro controlado, caso necessário. |
| `CRON_SECRET` | Opcional enquanto Google Calendar permanecer desativado. |

**Não configure** `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` até habilitar explicitamente a integração Google.

A chave `service_role` do Supabase nunca deve ser enviada ao navegador. Este aplicativo usa `pg`, não o SDK Supabase no frontend.

## 3. Migração e validação

A migração de segurança já foi aplicada ao banco ligado no Supabase. Em nova instalação, aplique `npm run db:migrate` com a `DATABASE_URL` correta antes de testar as rotas.

Execute em ambiente isolado:
- `npm install`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run db:migrate`

Os testes HTTP e SQL rodaram automaticamente no GitHub Actions com um banco efêmero. **Não execute os testes HTTP com o banco de produção**: o teste prepara e exclui fixtures deliberadamente e não é apropriado para produção.

## 4. Testes manuais pendentes

1. Cadastro restrito ao endereço autorizado.
2. Recebimento de código real no Gmail, verificação do endereço e expiração.
3. Login por senha + segundo código via e-mail.
4. Logout e tentativa de reutilizar sessão antiga.
5. Recuperação de senha e revogação das sessões anteriores.
6. Acesso a dashboard, tarefas, projetos e notas após recarga.
7. Tentativa de acesso entre contas de testes distintas.
8. Verificação de ausência de credenciais nos scripts enviados ao navegador.

Apenas após todos os itens acima passarem, liberar PR e decidir implantação em produção.

## 5. Restrições atuais

O endpoint `/api/google/connect` permanece existente, porém depende de credenciais que não estão configuradas. A integração não foi modificada nem testada. Não habilite cron Google sem configuração e testes separados.

A Vercel não concedeu permissão de criação de projeto à integração conectada em 2026-11-10 (403). Somente o proprietário/admin da equipe pode corrigir o acesso quando a integração não tem a permissão necessária.
