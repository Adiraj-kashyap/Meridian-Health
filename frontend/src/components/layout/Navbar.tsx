import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Button } from "../ui/Button";

const roleHome: Record<string, string> = { PATIENT: "/app/doctors", DOCTOR: "/app/schedule", ADMIN: "/app/admin" };

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-parchment/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#1F4D3A" />
            <path d="M4 17 L10 17 L13 10 L17 23 L20 14 L23 17 L28 17" fill="none" stroke="#F2C879" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">Meridian Health</span>
        </Link>

        <nav className="hidden items-center gap-6 font-mono text-sm uppercase tracking-wide text-ink-soft md:flex">
          {!user && (
            <>
              <a href="/#how-it-works" className="transition-colors duration-200 hover:text-pine-700">How it works</a>
              <a href="/#for-clinics" className="transition-colors duration-200 hover:text-pine-700">For clinics</a>
            </>
          )}
          {user?.role === "PATIENT" && (
            <>
              <NavLink to="/app/doctors" className={({ isActive }) => (isActive ? "text-pine-700" : "transition-colors duration-200 hover:text-pine-700")}>Find a doctor</NavLink>
              <NavLink to="/app/appointments" className={({ isActive }) => (isActive ? "text-pine-700" : "transition-colors duration-200 hover:text-pine-700")}>My appointments</NavLink>
              <NavLink to="/app/settings" className={({ isActive }) => (isActive ? "text-pine-700" : "transition-colors duration-200 hover:text-pine-700")}>Settings</NavLink>
            </>
          )}
          {user?.role === "DOCTOR" && (
            <NavLink to="/app/schedule" className={({ isActive }) => (isActive ? "text-pine-700" : "transition-colors duration-200 hover:text-pine-700")}>Schedule</NavLink>
          )}
          {user?.role === "ADMIN" && (
            <NavLink to="/app/admin" className={({ isActive }) => (isActive ? "text-pine-700" : "transition-colors duration-200 hover:text-pine-700")}>Admin</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden font-mono text-xs uppercase tracking-wider text-ink-soft sm:inline">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="font-mono text-sm uppercase tracking-wide text-ink-soft hover:text-pine-700">Log in</Link>
              <Button size="sm" onClick={() => navigate("/register")}>Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function homeForRole(role?: string) {
  return roleHome[role ?? ""] ?? "/";
}
