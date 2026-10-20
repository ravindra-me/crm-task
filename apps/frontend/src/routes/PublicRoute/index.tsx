import { Navigate, Outlet } from 'react-router';

interface PublicRouteProps {
  isAllowed?: boolean;
  redirectTo?: string;
}

export function PublicRoute({ isAllowed = true, redirectTo = '/' }: PublicRouteProps) {
  if (!isAllowed) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
