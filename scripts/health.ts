import 'dotenv/config';
import { health } from '../lib/health';
import { db } from '../lib/db';
health()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ready) process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
