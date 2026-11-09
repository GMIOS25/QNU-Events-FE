import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../../api/events';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../../lib/time';
import {
  Plus,
  Calendar,
  Compass,
  Search,
  MapPin,
  Users,
  Award,
  ChevronRight,
} from 'lucide-react';

export const EventsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isOwner = hasRole('EVENT_OWNER');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ['events', debouncedQuery],
    queryFn: () => fetchEvents({ q: debouncedQuery || undefined, size: 20 }),
  });

  const events = pageData?.content || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isOwner ? 'Quản lý sự kiện đơn vị' : 'Khám phá sự kiện'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isOwner
              ? 'Tạo mới, xem trước, công bố và theo dõi sự kiện của bạn'
              : 'Danh sách các sự kiện học thuật, phong trào dành riêng cho lớp của bạn'}
          </p>
        </div>

        {isOwner && (
          <Link to="/events/new">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              Tạo sự kiện mới
            </Button>
          </Link>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm sự kiện theo tên tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Events Grid / List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm shadow-xs">
          Đang tải danh sách sự kiện...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-sm">
          Không thể tải danh sách sự kiện. Vui lòng kiểm tra lại kết nối.
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col overflow-hidden"
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <StatusBadge status={evt.status} />
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    <Award className="w-3 h-3 text-amber-600" />
                    +{evt.activityPoints} đ
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-lg line-clamp-2 hover:text-blue-600 transition-colors mb-2">
                  <Link to={`/events/${evt.id}`}>{evt.title}</Link>
                </h3>

                <div className="space-y-2 text-xs text-slate-500 mt-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{formatDateTime(evt.startAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {evt.registeredCount}/{evt.quotaTotal} suất (còn {evt.remainingQuota} chỗ)
                    </span>
                  </div>
                </div>

                {/* Quota Mini Bar */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span>Số lượng đã giữ chỗ</span>
                    <span className="font-medium text-slate-700">
                      {Math.round((evt.registeredCount / evt.quotaTotal) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        evt.remainingQuota === 0 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{
                        width: `${Math.min(100, (evt.registeredCount / evt.quotaTotal) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="bg-slate-50/70 border-t border-slate-100 px-6 py-3 flex items-center justify-between">
                {evt.myRegistrationStatus === 'REGISTERED' ? (
                  <span className="text-xs font-semibold text-emerald-700">✓ Bạn đã giữ chỗ</span>
                ) : evt.registrationOpen && evt.remainingQuota > 0 ? (
                  <span className="text-xs font-medium text-blue-600">Đang mở đăng ký</span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Đã đóng đăng ký</span>
                )}

                <Link to={`/events/${evt.id}`}>
                  <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />}>
                    Chi tiết
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={isOwner ? <Calendar className="w-6 h-6" /> : <Compass className="w-6 h-6" />}
          title={
            debouncedQuery
              ? `Không tìm thấy sự kiện nào khớp với "${debouncedQuery}"`
              : isOwner
              ? 'Chưa có sự kiện nào'
              : 'Chưa có sự kiện dành cho lớp bạn'
          }
          description={
            debouncedQuery
              ? 'Hãy thử tìm kiếm với từ khóa khác.'
              : isOwner
              ? 'Hãy bấm nút Tạo sự kiện để bắt đầu lập kế hoạch cho sự kiện mới.'
              : 'Hiện tại chưa có sự kiện nào mở đăng ký cho lớp của bạn. Hãy quay lại sau nhé!'
          }
          action={
            isOwner ? (
              <Link to="/events/new">
                <Button variant="outline" size="sm">
                  Tạo sự kiện đầu tiên
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
};
