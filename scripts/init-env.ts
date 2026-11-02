import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
async function main() {
  const template = await readFile('.env.example', 'utf8');
  const contents = template
    .replace('AUTH_SECRET=\n', `AUTH_SECRET=${randomBytes(32).toString('hex')}\n`)
    .replace(
      'DEV_AUTH_PASSWORD=\n',
      `DEV_AUTH_PASSWORD=${randomBytes(18).toString('base64url')}\n`,
    );
  try {
    await writeFile('.env', contents, { flag: 'wx', mode: 0o600 });
    console.log(
      'Created private .env. Choose your local DEV_AUTH_EMAIL and DEV_AUTH_PASSWORD before seeding. No values were logged.',
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') console.log('Existing .env preserved.');
    else throw e;
  }
}
main().catch(() => {
  console.error('Could not initialize .env. Check file permissions.');
  process.exitCode = 1;
});
