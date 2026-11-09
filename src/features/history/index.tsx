import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '../../api/events';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../../lib/time';
import { History, Award, CheckCircle2, Calendar, MapPin, Compass } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { data: historyItems, isLoading, error } = useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
  });

  const totalRegistered = historyItems?.length ?? 0;
  const totalAttended = historyItems?.filter((item) => item.attendanceStatus === 'ACCEPTED').length ?? 0;
  const totalPoints =
    historyItems
      ?.filter((item) => item.attendanceStatus === 'ACCEPTED')
      .reduce((sum, item) => sum + (item.activityPoints || 0), 0) ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Lịch sử sự kiện & Điểm rèn luyện</h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi các sự kiện bạn đã tham gia và điểm rèn luyện tích lũy.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã đăng ký</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalRegistered}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã điểm danh</p>
            <p className="text-2xl font-bold text-teal-700 mt-0.5">{totalAttended}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Điểm tích lũy</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">+{totalPoints} đ</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          Đang tải lịch sử tham gia sự kiện...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-sm">
          Không thể tải dữ liệu lịch sử sự kiện. Vui lòng thử lại sau.
        </div>
      ) : historyItems && historyItems.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {historyItems.map((item) => (
              <div key={item.eventId} className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/events/${item.eventId}`}
                        className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {item.title}
                      </Link>
                      <StatusBadge status={item.attendanceStatus} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateTime(item.startAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {item.location}
                      </span>
                      {item.attendanceAt && (
                        <span className="text-emerald-700 font-medium">
                          Điểm danh lúc: {formatDateTime(item.attendanceAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      +{item.activityPoints} điểm ({item.activityType})
                    </span>

                    <Link to={`/events/${item.eventId}`}>
                      <Button variant="ghost" size="sm">
                        Xem chi tiết
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Compass className="w-6 h-6" />}
          title="Bạn chưa có lịch sử sự kiện nào"
          description="Hãy khám phá các sự kiện đang mở dành cho lớp của bạn và đăng ký tham gia ngay nhé!"
          action={
            <Link to="/events">
              <Button variant="primary">Khám phá sự kiện</Button>
            </Link>
          }
        />
      )}
    </div>
  );
};
