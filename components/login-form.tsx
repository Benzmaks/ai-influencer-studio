'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function LoginForm() {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError('');
        const data = new FormData(e.currentTarget);
        try {
          const result = await signIn('credentials', {
            email: data.get('email'),
            password: data.get('password'),
            redirect: false,
          });
          if (result?.error)
            setError(
              'Sign-in failed. Check your credentials, PostgreSQL and the development seed.',
            );
          else {
            router.push('/dashboard');
            router.refresh();
          }
        } catch {
          setError('Unable to sign in. Check your connection and try again.');
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={12}
          required
        />
      </label>
      {error && (
        <div role="alert" className="alert">
          {error}
        </div>
      )}
      <button disabled={pending} className="button primary">
        {pending ? 'Opening your studio…' : 'Sign in to studio →'}
      </button>
    </form>
  );
}
