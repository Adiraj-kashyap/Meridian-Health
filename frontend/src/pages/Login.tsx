import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { extractErrorMessage } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Input, Label, FieldError } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { homeForRole } from "../components/layout/Navbar";
import { ContourField } from "../components/motifs/ContourField";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-73px)] items-center justify-center overflow-hidden bg-paper-grain px-6 py-16">
      <ContourField className="pointer-events-none absolute inset-0 h-full w-full text-pine-700/[0.06]" />
      <Card className="relative w-full max-w-md p-8">
        <span className="font-mono text-xs uppercase tracking-wider text-terracotta-800">Welcome back</span>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Log in to Meridian</h1>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          New here? <Link to="/register" className="font-medium text-pine-700 underline">Create an account</Link>
        </p>
        <p className="mt-4 rounded-lg bg-sage-100 p-3 font-mono text-[0.7rem] leading-relaxed text-pine-700">
          Demo: admin@clinic.local · dr.rao@clinic.local · patient@example.com — password <b>Password123!</b>
        </p>
      </Card>
    </div>
  );
}
