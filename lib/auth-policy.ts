import { developmentLoginAllowed } from './env';
export function developmentTokenAllowed(
  token: Record<string, unknown>,
  source: Record<string, string | undefined> = process.env,
) {
  return (
    developmentLoginAllowed(source) &&
    token.developmentSession === true &&
    typeof token.userId === 'string' &&
    token.userId.length > 0
  );
}
