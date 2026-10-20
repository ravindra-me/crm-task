import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { RouteError } from '@/components/RouteError';
import { ContactDetailPage } from '@/pages/ContactDetailPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { PublicRoute } from './PublicRoute';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <PublicRoute />,
        children: [
          { index: true, element: <ContactsPage /> },
          { path: 'contacts/:contactId', element: <ContactDetailPage /> },
        ],
      },
      { path: '*', element: <RouteError /> },
    ],
  },
]);
