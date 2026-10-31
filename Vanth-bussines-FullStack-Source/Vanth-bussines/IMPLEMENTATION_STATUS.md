# Status de implementação | Vanth.bussines

## Verificações executadas nesta entrega

- Estrutura de páginas, endpoints e SQL presentes.
- Código-fonte TypeScript e TSX analisado por parser TypeScript disponível no ambiente.
- Testes estáticos (`npm test`) executados.
- Nenhuma credencial real foi incluída em `.env.example`.
- Nenhuma conta Google ou Gmail foi conectada.
- O projeto NÃO foi compilado com Next.js, pois as dependências não estavam instaladas e o npm registry não respondeu neste ambiente.
- Os fluxos de autenticação, banco, Google Calendar, e-mails e cron NÃO foram testados ponta a ponta.
- O deploy na Vercel e a criação de um repositório GitHub NÃO foram realizados.

## Requisitos cobertos por código

Login com senha própria e OTP, cadastro restrito, recuperação por e-mail, sessões no banco, CRUD de tarefas, projetos, notas e eventos, dashboard, busca global, Command Palette, interface responsiva, conexão OAuth Google, sincronização incremental básica, criptografia de tokens, cron protegido, documentação de configuração.

## Escopo ainda parcial

Editor de notas avançado, etiquetas/subtarefas na interface, drag-and-drop, agenda em múltiplos calendários, Google Meet, convites, Light Mode renderizado, controle avançado RBAC e política robusta de conflitos de sincronização. A marca original da Vanth ainda precisa ser inserida no lugar do lettering provisório.

## Ordem recomendada de validação

1. `npm install`, `npm run typecheck`, `npm run build`.
2. PostgreSQL e migrações em ambiente de desenvolvimento.
3. Login OTP com Gmail real e Resend.
4. Testes de sessão, CSRF, segurança e isolamento entre usuários.
5. CRUD com atualização após recarregamento.
6. OAuth Google e criação de eventos em conta de teste.
7. Sync incremental, cancelamentos, erro 410, idempotência e conflitos.
8. Testes de interface e acessibilidade em navegador desktop/mobile.
9. Deploy Vercel com variáveis e cron.

Não trate este repositório como validado para produção até concluir esses passos.
