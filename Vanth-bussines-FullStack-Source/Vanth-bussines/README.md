# Vanth.bussines

Workspace privado da Vanth. Projeto Full-Stack baseado no briefing HORUS BRIEF-7. A grafia **Vanth.bussines** é intencional.

## Estado da entrega

Este repositório contém implementação real de servidor e UI, sem login fictício ou dados inventados. **Não foi conectado a contas nem executado em produção nesta entrega**. Integração real necessita credenciais e autorização do proprietário. Sem `DATABASE_URL`, `EMAIL_API_KEY` e os segredos, o app não consegue autenticar usuários. Sem `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`, o Google Calendar não poderá ser conectado.

## Tecnologias

- Next.js App Router, React 19, TypeScript
- PostgreSQL via node-postgres (`pg`), consultas parametrizadas e migrations SQL versionadas
- Senhas com scrypt (alternativa robusta baseada em função de derivação de memória), autenticação em duas etapas via OTP (HMAC SHA-256)
- Sessões persistidas no banco, token aleatório guardado no cookie HttpOnly
- Email transacional pela API Resend
- OAuth 2.0 Google, refresh tokens criptografados com AES-256-GCM, Google Calendar API v3
- CSS Grid/Flexbox, Lucide, componentes próprios, Dark UI responsiva

**Nota de arquitetura:** foi usado SQL parametrizado com `pg` em vez de Prisma/Drizzle, para manter o pacote independente de geração de cliente ORM. Isso é uma diferença em relação à preferência do briefing.

## Pré-requisitos

- Node.js >= 20.9 (recomendado LTS)
- PostgreSQL 15+
- Conta Resend com domínio remetente verificado
- Projeto Google Cloud, API Calendar habilitada e OAuth 2.0 Web Application
- Repositório GitHub e Vercel para deploy (opcionais durante desenvolvimento)

## Executar localmente

1. `npm install`
2. Copie `.env.example` para `.env.local` e configure valores válidos. Para executar o migrador, disponibilize `DATABASE_URL` também no processo (por exemplo, no `.env` local não versionado ou exportado no terminal).
3. `npm run db:migrate`
4. `npm run dev`
5. Abra `http://localhost:3000`.
6. Use um Gmail listado em `ADMIN_ALLOWED_EMAILS` para registro. O cadastro é restrito por padrão.
7. Abra o Gmail, informe o código e depois entre com senha própria e segundo código de login.

Para os segredos, gere valores aleatórios com ferramentas seguras, por exemplo `openssl rand -hex 32`. `AUTH_SECRET` aceita uma string aleatória com pelo menos 32 caracteres. `TOKEN_ENCRYPTION_KEY` exige exatamente 64 caracteres hexadecimais.

## Resend / Email OTP

1. Verifique seu domínio no provedor transacional.
2. Configure `EMAIL_API_KEY` e `EMAIL_FROM` com endereço efetivamente autorizado.
3. Senhas da conta Google **nunca** são pedidas.
4. É possível solicitar um novo código após o cooldown de um minuto. Para reenvio de login, o primeiro fator válido ainda precisa estar confirmado pelo cookie temporário.
4. O backend gera um código criptograficamente seguro de seis dígitos, válido por 10 minutos, uso único com cinco tentativas e espera de um minuto para solicitar outro.

## Google Calendar

1. No Google Cloud Console, habilite a Google Calendar API.
2. Configure consentimento OAuth e adicione usuários de teste, se aplicável.
3. Crie OAuth Client ID do tipo **Web Application**.
4. URI de redirecionamento local exata: `http://localhost:3000/api/google/callback`.
5. URI de produção: `https://SEU_DOMINIO/api/google/callback`.
6. Configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
7. Defina `APP_URL` com a origem exata do seu site.
8. Conecte em **Configurações > Integrações**. Autorize pelo Google. Utilize **Sincronizar agora**.

Escopos: `calendar.events`, `calendar.calendarlist.readonly`. O módulo sincroniza atualmente **o calendário principal**, armazena sync token incremental, pagina resultados, trata erro 410, e permite criar, editar e excluir eventos remotos quando autorizado. O endpoint `/api/google/calendars` lista calendários disponíveis, porém a interface do MVP ainda só grava no principal. O job `/api/cron/sync` realiza verificação periódica quando a Vercel aciona o cron e o segredo está configurado. A sincronização não é instantânea. O arquivo `vercel.json` usa agendamento horário, sujeito aos limites do plano Vercel.

**Limitações a considerar**: o processo de ressincronização após token inválido atualiza eventos presentes, mas não elimina automaticamente possíveis registros remotos ausentes de uma listagem completa. Eventos cancelados informados pelo Google são marcados localmente. Para o primeiro deployment, valide a consistência, reconciliação de exclusões e conflitos de edição com uma conta de testes antes de tratar como sistema de missão crítica.

## Páginas

- `/login`, `/register`, `/verify-email`, `/verify-login`, `/forgot-password`, `/reset-password`
- `/app/dashboard`, `/app/calendar`, `/app/tasks`, `/app/notes`, `/app/projects`, `/app/profile`
- `/app/settings`, `/app/settings/integrations`

## Proteções

- Todo acesso a UI privada exige sessão no servidor.
- APIs privadas exigem sessão e dados vinculados ao workspace.
- Escritas exigem validação de origem (CSRF origin checking), e validação Zod.
- Senhas armazenadas como hash de scrypt; OTP guardado como HMAC vinculado ao ID do desafio.
- Tokens de sessão em cookie HttpOnly, Secure em produção, SameSite Lax, revogação no logout.
- Tokens OAuth criptografados no banco; nenhuma credencial em código do frontend.
- Limitador de tentativas persistido no banco.
- Cadastro restrito a endereços autorizados.

## Capacidades implementadas

- Cadastro restrito, verificação Gmail real, login e segundo fator por Gmail
- Recuperação de senha via código, sessões, logout
- Dashboard com consultas de dados reais
- CRUD de tarefas, projetos, notas e eventos
- Kanban simplificado e alternância lista
- Calendário com mês, semana, dia e agenda
- Busca global e Command Palette Ctrl/Cmd+K
- Integração OAuth e sincronização Google Calendar
- Preferências de perfil armazenadas no banco
- Layout responsivo, foco visível, suporte a movimento reduzido

## Funcionalidades ainda não completas frente ao briefing

- O editor de notas é textarea com edição manual, ainda não possui editor de blocos, histórico e autosave.
- Tarefas ainda não possuem UI de subtarefas, tags, arrastar para mudar status nem opção Adicionar ao Google Calendar.
- O calendário ainda não possui drag-and-drop, convites, criação do Google Meet, filtros avançados nem seleção de múltiplos calendários.
- Light Mode: preferência salva, mas a interface entregue permanece Dark Mode.
- Sessões: suporte de revogação no logout e reset, sem UI de gerenciamento multi-dispositivo.
- Logo: identificação textual provisória no lugar do símbolo oficial da pantera. Não foi recriado o símbolo. Substitua pelo arquivo autorizado da marca.
- UI de novos registros usa páginas com botões e formulários, sem automação externa.
- Controle de autorização é workspace de um owner por conta no MVP, não interface de convite ou RBAC completo.
- Não foi validado end-to-end com banco, Resend, OAuth ou Vercel reais.

## Testes

- `npm test`: verificações estáticas básicas de rotas, estrutura e segredos.
- `npm run typecheck`: exige `npm install` concluído.
- `npm run build`: exige dependências instaladas e variáveis apropriadas.
- **Antes do deploy:** executar integração de login/OTP real, checar isolamento entre usuários, CRUD persistente após recarregamento, OAuth, sincronização, renovação, revogação, responsividade e exploração de falhas de segurança.

## Deploy Vercel

1. Versione o diretório, sem arquivos `.env` reais, no GitHub.
2. Importe o repositório na Vercel.
3. Configure `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY`, `EMAIL_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `ADMIN_ALLOWED_EMAILS`.
4. Faça migrações no banco de produção de forma controlada.
5. Configure URLs OAuth de produção no Google Cloud.
6. Configure `ALLOW_REGISTRATION=true` apenas para provisionar e-mails autorizados; desabilite após configuração inicial, se preferir.
7. Teste autenticação, e-mails, eventos locais e integração Google em ambiente de teste.
8. Só então libere a aplicação para usuários reais.

## Referências

- https://nextjs.org/docs/app
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/calendar/api/guides/sync
- https://resend.com/docs

**Não há URLs ou credentials reais embutidos no projeto.**
