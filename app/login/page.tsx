import { LoginForm } from '@/components/login-form';
import { developmentLoginAllowed } from '@/lib/env';
import { Sparkles } from 'lucide-react';
export default function Login() {
  return (
    <main className="login-wrap">
      <section className="login-art">
        <div className="inline">
          <Sparkles />
          <strong>INFLUENCER STUDIO</strong>
        </div>
        <div>
          <span className="eyebrow">IMAGINATION, WITH INTENTION</span>
          <h1>
            Every great story
            <br />
            starts with
            <br />a character.
          </h1>
          <p>A considered space to create, shape and organize your fictional talent.</p>
        </div>
        <p>YOUR WORLD. YOUR CHARACTERS. YOUR POINT OF VIEW.</p>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">WELCOME TO YOUR STUDIO</span>
          <h1>Make yourself at home.</h1>
          <p>Sign in to your private creative workspace.</p>
          {developmentLoginAllowed() ? (
            <LoginForm />
          ) : (
            <div className="alert">
              Development login is disabled. Production authentication is not configured in Phase 1.
              For local development, set AUTH_MODE=development and run the seed outside production.
              See docs/development.md.
            </div>
          )}
          <p className="muted">Phase 1 · Mock providers · No paid AI credentials</p>
        </div>
      </section>
    </main>
  );
}
