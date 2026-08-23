import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { PageLoader } from "../ui/Spinner";
import type { Role } from "../../types/api";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
