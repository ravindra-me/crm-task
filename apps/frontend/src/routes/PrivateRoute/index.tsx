import { Navigate, Outlet, useLocation } from 'react-router';

interface PrivateRouteProps {
  isAllowed: boolean;
  redirectTo?: string;
}

export function PrivateRoute({ isAllowed, redirectTo = '/login' }: PrivateRouteProps) {
  const location = useLocation();

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  return <Outlet />;
}
