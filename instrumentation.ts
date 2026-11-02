export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { readEnvironment } = await import('./lib/env');
    readEnvironment();
  }
}
