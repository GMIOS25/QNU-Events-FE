import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  CalendarCheck,
  Calendar,
  History,
  PlusCircle,
  LogOut,
  User,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isOwner = hasRole('EVENT_OWNER');
  const isStudent = hasRole('STUDENT');

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-blue-600 hover:text-blue-700">
              <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <span>QNU Events</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/events"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/events' || location.pathname === '/'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isOwner ? 'Sự kiện của tôi' : 'Sự kiện'}
              </Link>

              {isStudent && (
                <Link
                  to="/history"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/history'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Lịch sử điểm danh
                </Link>
              )}

              {isOwner && (
                <Link
                  to="/events/new"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/events/new'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tạo sự kiện mới
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-sm font-semibold text-slate-800 leading-tight">{user.fullName}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-500">{user.loginId}</span>
                  {user.roles?.map((r) => (
                    <StatusBadge key={r} status={r} />
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogoutConfirm(true)}
              icon={<LogOut className="w-4 h-4 text-slate-500" />}
              title="Đăng xuất"
            >
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around">
        <Link
          to="/events"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium ${
            location.pathname === '/events' || location.pathname === '/' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Sự kiện</span>
        </Link>

        {isStudent && (
          <Link
            to="/history"
            className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium ${
              location.pathname === '/history' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <History className="w-5 h-5" />
            <span>Lịch sử</span>
          </Link>
        )}

        {isOwner && (
          <Link
            to="/events/new"
            className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium ${
              location.pathname === '/events/new' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Tạo mới</span>
          </Link>
        )}

        <div className="flex flex-col items-center gap-1 py-1 px-3 text-xs text-slate-500">
          <User className="w-5 h-5" />
          <span className="truncate max-w-[60px]">{user?.loginId}</span>
        </div>
      </nav>

      <main className="flex-1 pb-16 sm:pb-8">
        <Outlet />
      </main>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Đăng xuất khỏi hệ thống"
        description="Bạn có chắc chắn muốn đăng xuất? Phiên đăng nhập hiện tại sẽ bị thu hồi."
        confirmLabel="Đăng xuất"
        variant="danger"
        loading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

