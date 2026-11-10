import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });
config();

// Executa somente com DATABASE_URL configurada. Nenhuma alteração é persistida:
// todos os registros criados neste teste são desfeitos por ROLLBACK.
test('PostgreSQL: privilégios públicos e isolamento por workspace (rollback)', {
 skip: !process.env.DATABASE_URL && 'DATABASE_URL não configurada'
}, async () => {
 const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
 await client.connect();
 let started = false;
 try {
  await client.query('BEGIN');
  started = true;
  const { rows: acl } = await client.query(`
    SELECT c.relname, c.relrowsecurity,
      has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
      has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS auth_access
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND c.relname IN ('users','sessions','workspaces','workspace_members','projects','tasks','notes','auth_challenges','rate_limits')
  `);
  assert.equal(acl.length, 9);
  for (const table of acl) {
   assert.equal(table.relrowsecurity, true, 'RLS: ' + table.relname);
   assert.equal(table.anon_access, false, 'anon: ' + table.relname);
   assert.equal(table.auth_access, false, 'authenticated: ' + table.relname);
  }

  const idA=randomUUID(), idB=randomUUID(), workspaceA=randomUUID(), workspaceB=randomUUID();
  const projectId=randomUUID(), taskId=randomUUID(), noteId=randomUUID();
  await client.query(
   `INSERT INTO public.users(id,email,name,password_hash,email_verified)
      VALUES ($1,$3,'Teste A','test-hash',true),($2,$4,'Teste B','test-hash',true)`,
   [idA,idB,'test-'+idA+'@example.invalid','test-'+idB+'@example.invalid']
  );
  await client.query(
   `INSERT INTO public.workspaces(id,name,owner_id)
      VALUES ($1,'Workspace A',$3),($2,'Workspace B',$4)`,
   [workspaceA,workspaceB,idA,idB]
  );
  await client.query(
   `INSERT INTO public.workspace_members(workspace_id,user_id,role)
      VALUES ($1,$3,'owner'),($2,$4,'owner')`,
   [workspaceA,workspaceB,idA,idB]
  );
  await client.query('INSERT INTO public.projects(id,workspace_id,name) VALUES($1,$2,$3)', [projectId,workspaceA,'Projeto A']);
  await client.query('INSERT INTO public.tasks(id,workspace_id,project_id,title) VALUES($1,$2,$3,$4)', [taskId,workspaceA,projectId,'Tarefa A']);
  await client.query('INSERT INTO public.notes(id,workspace_id,title) VALUES($1,$2,$3)', [noteId,workspaceA,'Nota A']);

  for (const [table,recordId] of [['projects',projectId],['tasks',taskId],['notes',noteId]]) {
   const visible = await client.query(`SELECT id FROM public.${table} WHERE id=$1 AND workspace_id=$2`,[recordId,workspaceA]);
   const hidden = await client.query(`SELECT id FROM public.${table} WHERE id=$1 AND workspace_id=$2`,[recordId,workspaceB]);
   assert.equal(visible.rowCount,1,table+': pertence ao workspace A');
   assert.equal(hidden.rowCount,0,table+': inacessível pelo filtro do workspace B');
   const deniedUpdate = await client.query(`UPDATE public.${table} SET updated_at=now() WHERE id=$1 AND workspace_id=$2 RETURNING id`, [recordId,workspaceB]);
   assert.equal(deniedUpdate.rowCount,0,table+': atualização de outro workspace bloqueada pelo filtro');
   const deniedDelete = await client.query(`DELETE FROM public.${table} WHERE id=$1 AND workspace_id=$2 RETURNING id`, [recordId,workspaceB]);
   assert.equal(deniedDelete.rowCount,0,table+': exclusão de outro workspace bloqueada pelo filtro');
  }

  const membership = await client.query('SELECT role FROM public.workspace_members WHERE user_id=$1 AND workspace_id=$2',[idB,workspaceA]);
  assert.equal(membership.rowCount,0,'Usuário B não é membro do workspace A');
  const ownTask = await client.query('UPDATE public.tasks SET title=$3 WHERE id=$1 AND workspace_id=$2 RETURNING title',[taskId,workspaceA,'Tarefa atualizada']);
  assert.equal(ownTask.rows[0].title,'Tarefa atualizada');
  const ownNoteDelete = await client.query('DELETE FROM public.notes WHERE id=$1 AND workspace_id=$2 RETURNING id',[noteId,workspaceA]);
  assert.equal(ownNoteDelete.rowCount,1);
 } finally {
  if (started) await client.query('ROLLBACK');
  await client.end();
 }
});
