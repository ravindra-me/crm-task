import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { EmptyState } from '@/lib';

export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <EmptyState
      tone={notFound ? 'neutral' : 'error'}
      icon={notFound ? 'search' : 'alert'}
      title={notFound ? 'Page not found' : 'Something went wrong'}
      description={
        notFound ? "The page you're looking for doesn't exist." : 'Try reloading the page.'
      }
      action={<Link to="/">Go to contacts</Link>}
    />
  );
}
