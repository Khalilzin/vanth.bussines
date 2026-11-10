import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

const base = process.env.TEST_HTTP_BASE_URL;
const databaseUrl = process.env.DATABASE_URL;
const sha256 = value => createHash('sha256').update(value).digest('hex');

test('HTTP real: autenticação, CRUD, isolamento e logout', {
  skip: (!base || !databaseUrl) && 'TEST_HTTP_BASE_URL e DATABASE_URL necessários'
}, async () => {
  const db = new pg.Client({ connectionString: databaseUrl });
  const userA = randomUUID(), userB = randomUUID();
  const workspaceA = randomUUID(), workspaceB = randomUUID();
  const rawA = randomBytes(32).toString('base64url');
  const rawB = randomBytes(32).toString('base64url');

  const request = async (method, path, token, data, origin=base) => {
    const headers = {};
    if (token) headers.Cookie = 'vanth_session=' + token;
    if (method !== 'GET') headers.Origin = origin;
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(base + path, {
      method, headers, redirect: 'manual',
      body: data === undefined ? undefined : JSON.stringify(data)
    });
  };
  const expect = async (res, status, label) => {
    let data;
    try { data = await res.json(); }
    catch { data = { error: 'non-JSON response' }; }
    assert.equal(res.status, status, label + ' ' + JSON.stringify(data));
    return data;
  };

  await db.connect();
  try {
    await db.query(
      "INSERT INTO public.users(id,email,name,password_hash,email_verified) VALUES($1,$3,'Test A','test-hash',true),($2,$4,'Test B','test-hash',true)",
      [userA,userB,'ci-'+userA+'@example.invalid','ci-'+userB+'@example.invalid']
    );
    await db.query(
      "INSERT INTO public.workspaces(id,name,owner_id) VALUES($1,'Test workspace A',$3),($2,'Test workspace B',$4)",
      [workspaceA, workspaceB, userA, userB]
    );
    await db.query(
      "INSERT INTO public.workspace_members(workspace_id,user_id,role) VALUES($1,$3,'owner'),($2,$4,'owner')",
      [workspaceA,workspaceB,userA,userB]
    );
    await db.query(
      "INSERT INTO public.sessions(user_id,token_hash,expires_at) VALUES($1,$3,now()+interval '1 hour'),($2,$4,now()+interval '1 hour')",
      [userA,userB,sha256(rawA),sha256(rawB)]
    );

    await expect(await request('GET','/api/tasks'),401,'Anonymous tasks');
    await expect(await request('GET','/api/projects'),401,'Anonymous projects');
    await expect(await request('GET','/api/notes'),401,'Anonymous notes');

    const project = (await expect(
      await request('POST','/api/projects',rawA,{name:'Project CI',description:'',status:'active',color:'#8b5cf6'}),
      201,'Create project'
    )).item;
    const task = (await expect(
      await request('POST','/api/tasks',rawA,{title:'Task CI',project_id:project.id}),
      201,'Create task'
    )).item;
    const note = (await expect(
      await request('POST','/api/notes',rawA,{title:'Note CI'}),
      201,'Create note'
    )).item;

    for (const [route,id] of [['projects',project.id],['tasks',task.id],['notes',note.id]]) {
      const own = await expect(await request('GET','/api/'+route,rawA),200,'Read own '+route);
      assert.ok(own.items.some(item=>item.id===id),'Owner A sees '+route);
      const other = await expect(await request('GET','/api/'+route,rawB),200,'Read other '+route);
      assert.ok(!other.items.some(item=>item.id===id),'Owner B cannot read A '+route);
      await expect(await request('PATCH','/api/'+route,rawB,{id,title:'not authorized',name:'not authorized'}),404,'Update foreign '+route);
      await expect(await request('DELETE','/api/'+route+'?id='+id,rawB),404,'Delete foreign '+route);
    }
    await expect(await request('POST','/api/tasks',rawB,{title:'Cross tenant task',project_id:project.id}),400,'Attach foreign project');
    await expect(await request('POST','/api/tasks',rawA,{title:'Wrong origin'},'https://untrusted.invalid'),403,'Cross-origin blocked');
    await expect(await request('POST','/api/tasks',rawA,{title:'Malformed origin'},'not_a_url'),403,'Malformed origin blocked');

    await expect(await request('PATCH','/api/tasks',rawA,{id:task.id,title:'Task updated'}),200,'Update own task');
    await expect(await request('DELETE','/api/notes?id='+note.id,rawA),200,'Delete own note');
    await expect(await request('POST','/api/auth/logout',rawA,{}),200,'Logout user A');
    await expect(await request('GET','/api/tasks',rawA),401,'Revoked session blocked');
    await expect(await request('GET','/api/tasks',rawB),200,'Other session remains valid');
  } finally {
    // Os fixtures são exclusivos desta execução e são eliminados mesmo após falhas.
    try {
      await db.query('DELETE FROM public.notes WHERE workspace_id = ANY($1::uuid[])', [[workspaceA,workspaceB]]);
      await db.query('DELETE FROM public.tasks WHERE workspace_id = ANY($1::uuid[])', [[workspaceA,workspaceB]]);
      await db.query('DELETE FROM public.projects WHERE workspace_id = ANY($1::uuid[])', [[workspaceA,workspaceB]]);
      await db.query('DELETE FROM public.sessions WHERE user_id = ANY($1::uuid[])', [[userA,userB]]);
      await db.query('DELETE FROM public.workspace_members WHERE user_id = ANY($1::uuid[])', [[userA,userB]]);
      await db.query('DELETE FROM public.workspaces WHERE id = ANY($1::uuid[])', [[workspaceA,workspaceB]]);
      await db.query('DELETE FROM public.users WHERE id = ANY($1::uuid[])', [[userA,userB]]);
    } finally {
      await db.end();
    }
  }
});
