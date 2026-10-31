import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();const read=p=>readFileSync(join(root,p),'utf8');
test('exact product name',()=>{assert.equal(JSON.parse(read('package.json')).name,'vanth-bussines');assert.match(read('app/layout.tsx'),/Vanth\.bussines/)});
test('required routes exist',()=>{for(const route of ['auth/login','auth/register','auth/verify-email','auth/verify-login','auth/logout','auth/reset-password','tasks','notes','projects','events','google/connect','google/callback','google/sync','google/disconnect','cron/sync']) assert.ok(existsSync(join(root,'app/api',route,'route.ts')),route)});
test('server-side credential safety',()=>{const env=read('.env.example');assert.match(env,/GOOGLE_CLIENT_SECRET/);assert.doesNotMatch(env,/^GOOGLE_CLIENT_SECRET=\S/m);assert.match(read('lib/security.ts'),/aes-256-gcm/);assert.match(read('lib/auth.ts'),/httpOnly:true/)});
test('SQL schema has unique sync keys and owner boundaries',()=>{const sql=read('db/migrations/0001_init.sql');assert.match(sql,/UNIQUE INDEX IF NOT EXISTS events_google_unique/);assert.match(sql,/workspace_id uuid NOT NULL REFERENCES workspaces/);assert.match(sql,/auth_challenges/)});
