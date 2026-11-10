import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();const read=p=>readFileSync(join(root,p),'utf8');
test('exact product name',()=>{assert.equal(JSON.parse(read('package.json')).name,'vanth-bussines');assert.match(read('app/layout.tsx'),/Vanth\.bussines/)});
test('required routes exist',()=>{for(const route of ['auth/login','auth/register','auth/verify-email','auth/verify-login','auth/logout','auth/reset-password','tasks','notes','projects','events','google/connect','google/callback','google/sync','google/disconnect','cron/sync']) assert.ok(existsSync(join(root,'app/api',route,'route.ts')),route)});
test('server-side credential safety',()=>{const env=read('.env.example');assert.match(env,/GOOGLE_CLIENT_SECRET/);assert.doesNotMatch(env,/^GOOGLE_CLIENT_SECRET=\S/m);assert.match(read('lib/security.ts'),/aes-256-gcm/);assert.match(read('lib/auth.ts'),/httpOnly:true/)});
test('SQL schema has unique sync keys and owner boundaries',()=>{const sql=read('db/migrations/0001_init.sql');assert.match(sql,/UNIQUE INDEX IF NOT EXISTS events_google_unique/);assert.match(sql,/workspace_id uuid NOT NULL REFERENCES workspaces/);assert.match(sql,/auth_challenges/)});

test('login OTP retrieves pending token hash from the database',()=>{
 const code=read('lib/challenges.ts');
 assert.match(code,/SELECT id,code_hash,attempts,login_token_hash FROM auth_challenges/);
 assert.match(code,/sha256\(pending\)!==challenge\.login_token_hash/);
});

test('security migration and versioned migration runner exist',()=>{
 const migration=read('db/migrations/0002_public_security.sql');
 for(const table of ['users','sessions','workspaces','workspace_members','projects','tasks','notes','auth_challenges','rate_limits']){
  assert.ok(migration.includes('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY;'),table);
  assert.ok(migration.includes('REVOKE ALL PRIVILEGES ON TABLE public.'+table+' FROM anon, authenticated;'),table);
 }
 const runner=read('db/migrate.ts');
 assert.match(runner,/readdirSync\(dir\)/);
 assert.match(runner,/client\.query\('ROLLBACK'\)/);
 assert.match(runner,/\.env\.local/);
});

test('private route and session boundaries are present',()=>{
 for(const resource of ['tasks','projects','notes']){
  const api=read('app/api/'+resource+'/route.ts');
  assert.match(api,/requireUser\(\)/);
  assert.match(api,/workspace_id=\$2/);
  assert.match(api,/assertOrigin\(req\)/);
 }
 assert.match(read('lib/auth.ts'),/s\.revoked_at IS NULL AND s\.expires_at>now\(\)/);
 assert.match(read('lib/http.ts'),/Origem inválida/);
});
