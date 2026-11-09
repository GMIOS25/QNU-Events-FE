import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { RequireRole } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { EventsPage } from '../features/events/EventsPage';
import { EventDetailPage } from '../features/events/EventDetailPage';
import { EventFormPage } from '../features/events/EventFormPage';
import { EventQrPage } from '../features/events/EventQrPage';
import { HistoryPage } from '../features/history';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireRole>
        <Layout />
      </RequireRole>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/events" replace />,
      },
      {
        path: 'events',
        element: <EventsPage />,
      },
      {
        path: 'events/new',
        element: (
          <RequireRole roles={['EVENT_OWNER']}>
            <EventFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'events/:id',
        element: <EventDetailPage />,
      },
      {
        path: 'events/:id/edit',
        element: (
          <RequireRole roles={['EVENT_OWNER']}>
            <EventFormPage />
          </RequireRole>
        ),
      },
      {
        path: 'history',
        element: (
          <RequireRole roles={['STUDENT']}>
            <HistoryPage />
          </RequireRole>
        ),
      },
    ],
  },
  {
    path: '/events/:id/qr',
    element: (
      <RequireRole roles={['EVENT_OWNER']}>
        <EventQrPage />
      </RequireRole>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

