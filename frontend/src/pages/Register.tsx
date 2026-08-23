import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { extractErrorMessage } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Input, Label, FieldError, Select } from "../components/ui/Field";
import { Button } from "../components/ui/Button";
import { homeForRole } from "../components/layout/Navbar";
import { BotanicalCorner } from "../components/motifs/BotanicalCorner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get("role") === "DOCTOR" ? "DOCTOR" : "PATIENT";

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", role: initialRole, specialization: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register(form);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-73px)] items-center justify-center overflow-hidden bg-paper-grain px-6 py-16">
      <BotanicalCorner className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 text-terracotta-500/15" flip />
      <Card className="relative w-full max-w-md p-8">
        <span className="font-mono text-xs uppercase tracking-wider text-terracotta-800">
          {form.role === "DOCTOR" ? "Clinician sign-up" : "Patient sign-up"}
        </span>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Create your account</h1>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <Label htmlFor="role">I am a</Label>
            <Select id="role" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          {form.role === "DOCTOR" && (
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Input id="specialization" required value={form.specialization} onChange={(e) => set("specialization", e.target.value)} placeholder="e.g. Dermatology" />
            </div>
          )}
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 8 characters" />
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account? <Link to="/login" className="font-medium text-pine-700 underline">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
