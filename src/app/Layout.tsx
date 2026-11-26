import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  CalendarCheck,
  Calendar,
  History,
  PlusCircle,
  LogOut,
  User,
  Menu,
  X,
  PanelLeft,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import type { UserInfo } from '../features/auth/types';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Sinh viên',
  EVENT_OWNER: 'Ban tổ chức',
  CLASS_REPRESENTATIVE: 'Ban cán sự',
  SYSTEM_ADMIN: 'Quản trị hệ thống',
};

interface SidebarContentProps {
  user: UserInfo | null;
  isOwner: boolean;
  isStudent: boolean;
  pathname: string;
  onNavigate?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  user,
  isOwner,
  isStudent,
  pathname,
  onNavigate,
}) => {
  const isEventsActive =
    pathname === '/' ||
    pathname === '/events' ||
    (pathname.startsWith('/events/') && pathname !== '/events/new');
  const isCreateEventActive = pathname === '/events/new';
  const isHistoryActive = pathname === '/history';

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
      active
        ? 'bg-[#E5F4FC] text-[#0789B7] font-semibold border border-[#0789B7]/20'
        : 'text-[#25435E] font-medium hover:bg-[#F3F8FC] hover:text-[#0789B7] border border-transparent'
    }`;

  return (
    <div className="flex flex-col h-full p-4 gap-5">
      {/* Role Badge Card */}
      <div className="rounded-xl p-3.5 bg-[#E5F4FC]/70 border border-[#0789B7]/20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0789B7] text-white flex items-center justify-center shrink-0">
            {isOwner ? (
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            ) : (
              <GraduationCap className="w-5 h-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#0789B7] leading-snug">
              {isOwner ? 'Không gian tổ chức sự kiện' : 'Không gian sinh viên'}
            </p>
            <p className="text-xs text-[#73899B] truncate mt-0.5">
              {user?.studentCode ? `MSSV ${user.studentCode}` : user?.fullName || 'QNU Events'}
            </p>
          </div>
        </div>
      </div>

      {/* Grouped Navigation Sections */}
      <nav aria-label="Điều hướng chính" className="flex-1 flex flex-col gap-5">
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#73899B]">
            SỰ KIỆN
          </p>
          <div className="space-y-1">
            <Link to="/events" onClick={onNavigate} className={navLinkClass(isEventsActive)}>
              <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{isOwner ? 'Sự kiện của tôi' : 'Sự kiện'}</span>
            </Link>

            {isOwner && (
              <Link to="/events/new" onClick={onNavigate} className={navLinkClass(isCreateEventActive)}>
                <PlusCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Tạo sự kiện mới</span>
              </Link>
            )}
          </div>
        </div>

        {isStudent && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#73899B]">
              CÁ NHÂN
            </p>
            <div className="space-y-1">
              <Link to="/history" onClick={onNavigate} className={navLinkClass(isHistoryActive)}>
                <History className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Lịch sử điểm danh</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export const Layout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileDrawerPath, setMobileDrawerPath] = useState<string | null>(null);
  const mobileMenuOpen = mobileDrawerPath === location.pathname;

  const isOwner = hasRole('EVENT_OWNER');
  const isStudent = hasRole('STUDENT');

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileDrawerPath(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

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

  const isEventsActive =
    location.pathname === '/' ||
    location.pathname === '/events' ||
    (location.pathname.startsWith('/events/') && location.pathname !== '/events/new');

  return (
    <div className="min-h-screen bg-[#F3F8FC] text-[#25435E] flex flex-col">
      {/* Top Utility Bar */}
      <header className="sticky top-0 z-40 h-16 bg-white border-b border-[#DCE5EE]">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setMobileDrawerPath((prev) =>
                  prev === location.pathname ? null : location.pathname
                )
              }
              aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#DCE5EE] bg-white text-[#25435E] hover:bg-[#F3F8FC] hover:text-[#0789B7] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => setDesktopSidebarOpen((prev) => !prev)}
              aria-label={desktopSidebarOpen ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
              aria-expanded={desktopSidebarOpen}
              className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#DCE5EE] bg-white text-[#25435E] hover:bg-[#F3F8FC] hover:text-[#0789B7] transition-colors cursor-pointer"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <Link
              to="/events"
              className="flex items-center gap-2.5 font-bold text-lg text-[#25435E] hover:text-[#0789B7] transition-colors"
            >
              <div className="w-9 h-9 bg-[#0789B7] text-white rounded-xl flex items-center justify-center shadow-xs">
                <CalendarCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight">QNU Events</span>
                <span className="hidden sm:block text-[11px] font-medium text-[#73899B] leading-tight">
                  Quản lý sự kiện &amp; điểm danh
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="flex flex-col items-end text-right">
                  <span className="text-sm font-semibold text-[#25435E] leading-tight">
                    {user.fullName}
                  </span>
                  {user.loginId && (
                    <span className="text-xs text-[#73899B] leading-tight mt-0.5">
                      {user.loginId}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {user.roles?.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E5F4FC] text-[#0789B7] border border-[#0789B7]/20"
                    >
                      {ROLE_LABELS[r] || r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogoutConfirm(true)}
              icon={<LogOut className="w-4 h-4 text-[#73899B]" aria-hidden="true" />}
              title="Đăng xuất"
              className="!border-[#DCE5EE] !text-[#25435E] hover:!bg-[#F3F8FC] hover:!text-[#B64D40]"
            >
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-w-0">
        {/* Desktop Fixed Left Sidebar */}
        {desktopSidebarOpen && (
          <aside className="hidden md:flex md:sticky md:top-16 md:h-[calc(100vh-4rem)] w-64 shrink-0 flex-col bg-white border-r border-[#DCE5EE] overflow-y-auto">
            <SidebarContent
              user={user}
              isOwner={isOwner}
              isStudent={isStudent}
              pathname={location.pathname}
            />
          </aside>
        )}

        {/* Mobile Slide-Over Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-[#25435E]/35 backdrop-blur-[1px]"
              onClick={() => setMobileDrawerPath(null)}
              aria-hidden="true"
            />
            <aside className="relative z-10 w-72 max-w-[85vw] bg-white border-r border-[#DCE5EE] flex flex-col h-full shadow-xl overflow-y-auto">
              <div className="h-16 px-4 border-b border-[#DCE5EE] flex items-center justify-between">
                <span className="font-bold text-[#25435E]">QNU Events</span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerPath(null)}
                  aria-label="Đóng menu"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#73899B] hover:bg-[#F3F8FC] hover:text-[#25435E]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent
                user={user}
                isOwner={isOwner}
                isStudent={isStudent}
                pathname={location.pathname}
                onNavigate={() => setMobileDrawerPath(null)}
              />
            </aside>
          </div>
        )}

        {/* Main Content + Figma Footer */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#F3F8FC]">
          <main className="flex-1 pb-6 md:pb-8">
            <Outlet />
          </main>

          <footer className="border-t border-[#DCE5EE] bg-white/90 px-4 sm:px-6 lg:px-8 py-4 pb-20 md:pb-4">
            <p className="max-w-7xl mx-auto text-xs text-[#73899B] text-center sm:text-left">
              QNU EVENT · Hệ thống quản lý đăng ký và xác thực tham gia hoạt động · MVP · 2026
            </p>
          </footer>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Điều hướng di động"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#DCE5EE] px-4 py-2 flex items-center justify-around"
      >
        <Link
          to="/events"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium whitespace-nowrap ${
            isEventsActive ? 'text-[#0789B7]' : 'text-[#73899B]'
          }`}
        >
          <Calendar className="w-5 h-5" aria-hidden="true" />
          <span>Sự kiện</span>
        </Link>

        {isStudent && (
          <Link
            to="/history"
            className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium whitespace-nowrap ${
              location.pathname === '/history' ? 'text-[#0789B7]' : 'text-[#73899B]'
            }`}
          >
            <History className="w-5 h-5" aria-hidden="true" />
            <span>Lịch sử</span>
          </Link>
        )}

        {isOwner && (
          <Link
            to="/events/new"
            className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium whitespace-nowrap ${
              location.pathname === '/events/new' ? 'text-[#0789B7]' : 'text-[#73899B]'
            }`}
          >
            <PlusCircle className="w-5 h-5" aria-hidden="true" />
            <span>Tạo mới</span>
          </Link>
        )}

        <div className="flex flex-col items-center gap-1 py-1 px-3 text-xs text-[#73899B]">
          <User className="w-5 h-5" aria-hidden="true" />
          <span className="truncate max-w-[72px]">{user?.loginId || user?.fullName}</span>
        </div>
      </nav>

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
