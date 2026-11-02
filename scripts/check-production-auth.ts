import 'dotenv/config';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { request } from '@playwright/test';
async function main() {
  const origin = 'http://localhost:3001';
  const server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-p', '3001'],
    {
      env: { ...process.env, NODE_ENV: 'production', AUTH_MODE: 'disabled', AUTH_URL: origin },
      stdio: 'ignore',
    },
  );
  let stopped = false;
  console.log('Production check: waiting for web server.');
  server.on('exit', () => {
    stopped = true;
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (stopped) throw new Error('Production server exited before readiness.');
      try {
        const response = await fetch(origin + '/login');
        if (response.ok) {
          assert.match(await response.text(), /Development login is disabled/);
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Production server must start.');
    console.log('Production check: login page confirms development authentication is disabled.');
    const context = await request.newContext({ baseURL: origin });
    try {
      console.log('Production check: requesting CSRF token.');
      const csrf = await (await context.get('/api/auth/csrf')).json();
      const response = await context.post('/api/auth/callback/credentials', {
        form: {
          csrfToken: csrf.csrfToken,
          email: process.env.DEV_AUTH_EMAIL ?? '',
          password: process.env.DEV_AUTH_PASSWORD ?? '',
          callbackUrl: origin + '/dashboard',
        },
        headers: { origin, 'X-Auth-Return-Redirect': '1' },
      });
      console.log('Production check: credentials endpoint HTTP status', response.status());
      const result = await response.json();
      console.log(
        'Production check: rejection reason',
        typeof result.url === 'string'
          ? new URL(result.url).searchParams.get('error')
          : 'missing redirect',
      );
      assert.match(result.url, /error=CredentialsSignin/);
      const session = await (await context.get('/api/auth/session')).json();
      assert.ok(
        !session?.user,
        'Production must not issue a session from development credentials.',
      );
      assert.equal((await context.get('/api/projects')).status(), 401);
      console.log(
        'PASS: production server starts, development credentials rejected, session absent, projects return 401.',
      );
    } finally {
      await context.dispose();
    }
  } finally {
    server.kill('SIGTERM');
  }
}
main().catch((error: unknown) => {
  console.error('Production check error type:', error instanceof Error ? error.name : 'unknown');
  console.error(
    'Production authentication verification failed. Build first, check port 3001 and secure configuration.',
  );
  process.exitCode = 1;
});
