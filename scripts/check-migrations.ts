import 'dotenv/config';
import { Pool } from 'pg';
import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
async function main() {
  const connection = new URL(process.env.DATABASE_URL ?? '');
  const admin = new Pool({ connectionString: connection.href, connectionTimeoutMillis: 5000 });
  const database = `studio_migration_test_${randomUUID().replaceAll('-', '')}`;
  assert.match(database, /^studio_migration_test_[a-f0-9]{32}$/);
  let created = false;
  let pool: Pool | undefined;
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    created = true;
    connection.pathname = `/${database}`;
    pool = new Pool({ connectionString: connection.href, connectionTimeoutMillis: 5000 });
    async function migrate() {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
          { env: { ...process.env, DATABASE_URL: connection.href }, stdio: 'ignore' },
        );
        child.on('error', reject);
        child.on('exit', (code) =>
          code === 0
            ? resolve()
            : reject(new Error('Migration deployment failed in the isolated test database.')),
        );
      });
    }
    await migrate();
    const names = (await readdir('prisma/migrations', { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const expected = await Promise.all(
      names.map(async (name) => ({
        migration_name: name,
        checksum: createHash('sha256')
          .update(await readFile(path.join('prisma/migrations', name, 'migration.sql')))
          .digest('hex'),
      })),
    );
    const applied = (
      await pool.query(
        'SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
      )
    ).rows;
    assert.deepEqual(applied, expected, 'Applied migration checksums must match existing files.');
    await pool.query(
      `INSERT INTO "User" (id,email) VALUES ('migration-owner','migration-owner@example.test')`,
    );
    await pool.query(
      `INSERT INTO "Project" (id,name,"updatedAt") VALUES ('migration-project','Preservation fixture',NOW())`,
    );
    await pool.query(
      `INSERT INTO "ProjectMembership" ("projectId","userId",role) VALUES ('migration-project','migration-owner','OWNER')`,
    );
    await pool.query(
      `INSERT INTO "Character" (id,"projectId",name,revision,"updatedAt") VALUES ('migration-character','migration-project','Sofia',2,NOW())`,
    );
    for (const number of [1, 2])
      await pool.query(
        `INSERT INTO "CharacterVersion" (id,"projectId","characterId","versionNumber",name,"displayName",age,location,occupation,bio,snapshot,"createdBy") VALUES ($1,'migration-project','migration-character',$2,'Sofia','Sofia',26,'London','Editorial','Preserve history',$3,'migration-owner')`,
        [
          `migration-version-${number}`,
          number,
          JSON.stringify({ identity: { name: 'Sofia', version: number }, schemaVersion: 1 }),
        ],
      );
    await pool.query(
      `UPDATE "Character" SET "currentVersionId"='migration-version-2' WHERE id='migration-character'`,
    );
    async function contents() {
      return {
        versions: (await pool!.query('SELECT * FROM "CharacterVersion" ORDER BY id')).rows,
        characters: (await pool!.query('SELECT * FROM "Character" ORDER BY id')).rows,
        members: (await pool!.query('SELECT * FROM "ProjectMembership" ORDER BY "userId"')).rows,
        history: (await pool!.query('SELECT * FROM "_prisma_migrations" ORDER BY migration_name'))
          .rows,
      };
    }
    const original = await contents();
    await migrate();
    assert.deepEqual(
      await contents(),
      original,
      'Redeployment must preserve data and migration history exactly.',
    );
    const update = await pool.query(
      `UPDATE "CharacterVersion" SET bio='Must not overwrite' WHERE id='migration-version-1'`,
    );
    assert.equal(update.rowCount, 0);
    assert.deepEqual(await contents(), original, 'Original snapshots must remain immutable.');
    console.log(
      'PASS: fresh deployment, migration checksums, populated redeployment, canonical pointer, membership and immutable snapshots verified in an isolated database.',
    );
  } finally {
    await pool?.end();
    if (created) {
      await admin.query(
        'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
        [database],
      );
      await admin.query(`DROP DATABASE "${database}"`);
    }
    await admin.end();
  }
}
main().catch(() => {
  console.error(
    'Migration regression check failed. Requires a reachable PostgreSQL account with CREATE DATABASE privileges and the selected verified Prisma engine. Existing databases were not reset.',
  );
  process.exitCode = 1;
});
