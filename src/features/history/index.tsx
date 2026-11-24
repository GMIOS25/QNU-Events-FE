import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '../../api/events';
import type { HistoryFilterParams, HistoryItem } from '../events/types';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../../lib/time';
import {
  History,
  Award,
  CheckCircle2,
  Calendar,
  MapPin,
  Compass,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

const ATTENDANCE_METHOD_LABELS: Record<HistoryItem['method'], string> = {
  DYNAMIC_QR: 'QR động',
  GPS: 'GPS',
  EVIDENCE: 'Minh chứng',
  OFFLINE_QR: 'QR ngoại tuyến',
  OFFLINE_GPS: 'GPS ngoại tuyến',
  PROXY_EVIDENCE: 'Điểm danh thay (minh chứng)',
};

export const HistoryPage: React.FC = () => {
  const [attendanceStatus, setAttendanceStatus] = useState<string>('ALL');
  const [upcoming, setUpcoming] = useState<string>('ALL');
  const [academicYear, setAcademicYear] = useState<string>('');
  const [debouncedYear, setDebouncedYear] = useState<string>('');
  const [semester, setSemester] = useState<string>('ALL');
  const [activityType, setActivityType] = useState<string>('');
  const [debouncedActivityType, setDebouncedActivityType] = useState<string>('');
  const [page, setPage] = useState<number>(0);

  // Debounce academicYear and activityType inputs (~350ms) to avoid firing API requests on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedYear(academicYear);
      setDebouncedActivityType(activityType);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [academicYear, activityType]);

  const queryParams: HistoryFilterParams = {
    page,
    size: 20,
    attendanceStatus: attendanceStatus !== 'ALL' ? attendanceStatus : undefined,
    upcoming: upcoming === 'true' ? true : upcoming === 'false' ? false : undefined,
    academicYear: debouncedYear.trim() || undefined,
    semester: debouncedYear.trim() && semester !== 'ALL' ? Number(semester) : undefined,
    activityType: debouncedActivityType.trim() || undefined,
  };

  // Query cho danh sách lịch sử theo bộ lọc và phân trang
  const {
    data: pageData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['history', queryParams],
    queryFn: () => fetchHistory(queryParams),
  });

  // Query cho tổng quan KPI tích lũy (không bị phụ thuộc vào bộ lọc trang hiện tại).
  // Đặt dưới tiền tố ['history'] để invalidateQueries({ queryKey: ['history'] }) sau khi
  // đăng ký / điểm danh cũng làm mới KPI.
  const {
    data: summaryData,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['history', 'summary'],
    queryFn: () => fetchHistory({ size: 1000 }),
    staleTime: 30000,
  });

  const historyItems = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? historyItems.length;
  const totalPages = pageData?.totalPages ?? 0;

  // Dữ liệu KPI tích lũy toàn bộ
  const allSummaryItems = summaryData?.content ?? [];
  const totalRegistered = summaryData?.totalElements ?? totalElements;
  const totalAttended = summaryData
    ? allSummaryItems.filter((item) => item.attendanceStatus === 'ACCEPTED').length
    : historyItems.filter((item) => item.attendanceStatus === 'ACCEPTED').length;
  const totalPoints = summaryData
    ? allSummaryItems
        .filter((item) => item.attendanceStatus === 'ACCEPTED')
        .reduce((sum, item) => sum + (item.activityPoints || 0), 0)
    : historyItems
        .filter((item) => item.attendanceStatus === 'ACCEPTED')
        .reduce((sum, item) => sum + (item.activityPoints || 0), 0);

  const isYearEntered = Boolean(academicYear.trim());

  const hasActiveFilters =
    attendanceStatus !== 'ALL' ||
    upcoming !== 'ALL' ||
    Boolean(academicYear.trim()) ||
    semester !== 'ALL' ||
    Boolean(activityType.trim());

  const handleResetFilters = () => {
    setAttendanceStatus('ALL');
    setUpcoming('ALL');
    setAcademicYear('');
    setDebouncedYear('');
    setSemester('ALL');
    setActivityType('');
    setDebouncedActivityType('');
    setPage(0);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAcademicYear(val);
    if (!val.trim()) {
      setSemester('ALL');
    }
  };

  const handleFilterChange = (setter: (val: string) => void) => (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    setter(e.target.value);
    setPage(0);
  };

  const handleRetry = () => {
    refetch();
    refetchSummary();
  };

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

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
          <Filter className="w-3.5 h-3.5" />
          <span>Bộ lọc nâng cao</span>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Đặt lại
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label htmlFor="filter-attendance" className="block text-xs font-medium text-slate-600 mb-1">
              Trạng thái điểm danh
            </label>
            <select
              id="filter-attendance"
              value={attendanceStatus}
              onChange={handleFilterChange(setAttendanceStatus)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACCEPTED">Đã điểm danh</option>
              <option value="NOT_CHECKED_IN">Chưa điểm danh</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-upcoming" className="block text-xs font-medium text-slate-600 mb-1">
              Thời gian sự kiện
            </label>
            <select
              id="filter-upcoming"
              value={upcoming}
              onChange={handleFilterChange(setUpcoming)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Tất cả thời gian</option>
              <option value="true">Sắp diễn ra</option>
              <option value="false">Đã kết thúc</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-year" className="block text-xs font-medium text-slate-600 mb-1">
              Năm học
            </label>
            <input
              id="filter-year"
              type="text"
              placeholder="VD: 2026-2027"
              value={academicYear}
              onChange={handleYearChange}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="filter-semester" className="block text-xs font-medium text-slate-600">
                Học kỳ
              </label>
              {!isYearEntered && (
                <span className="text-[10px] text-amber-600 font-normal">Cần nhập năm học</span>
              )}
            </div>
            <select
              id="filter-semester"
              value={semester}
              disabled={!isYearEntered}
              onChange={handleFilterChange(setSemester)}
              title={!isYearEntered ? 'Vui lòng nhập năm học trước khi chọn học kỳ' : ''}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Tất cả học kỳ</option>
              <option value="1">Học kỳ 1</option>
              <option value="2">Học kỳ 2</option>
              <option value="3">Học kỳ 3 (Hè)</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-activity" className="block text-xs font-medium text-slate-600 mb-1">
              Loại hoạt động
            </label>
            <input
              id="filter-activity"
              type="text"
              placeholder="VD: Hội thảo, Tình nguyện..."
              value={activityType}
              onChange={handleFilterChange(setActivityType)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          Đang tải lịch sử tham gia sự kiện...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1">
            <p className="font-semibold text-red-800">Không thể tải dữ liệu lịch sử sự kiện</p>
            <p className="text-xs text-red-600">Đã xảy ra lỗi khi kết nối đến máy chủ. Vui lòng thử lại sau.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            className="shrink-0 bg-white border-red-300 text-red-700 hover:bg-red-100 hover:text-red-900 cursor-pointer"
          >
            Thử lại
          </Button>
        </div>
      ) : historyItems && historyItems.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {historyItems.map((item) => (
              <div key={item.eventId} className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <Link
                      to={`/events/${item.eventId}`}
                      className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {item.title}
                    </Link>

                    {/* REQ-REV-008: trạng thái đăng ký và trạng thái điểm danh hiển thị riêng biệt */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span>Đăng ký:</span>
                        <StatusBadge status={item.registrationStatus} />
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span>Điểm danh:</span>
                        <StatusBadge status={item.attendanceStatus} />
                      </span>
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
                      <span>Đăng ký lúc: {formatDateTime(item.registeredAt)}</span>
                      {/* REQ-REV-009: phương thức + thời điểm ghi nhận; chỉ hiện khi đã có điểm danh
                          (BE hiện trả method mặc định cho dòng chưa điểm danh). */}
                      {item.attendanceStatus === 'ACCEPTED' && item.attendanceAt && (
                        <span className="text-emerald-700 font-medium">
                          Điểm danh lúc: {formatDateTime(item.attendanceAt)} ·{' '}
                          {ATTENDANCE_METHOD_LABELS[item.method] ?? item.method}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {item.attendanceStatus === 'ACCEPTED' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        +{item.activityPoints} điểm ({item.activityType})
                      </span>
                    ) : (
                      // Chưa điểm danh hợp lệ thì không trình bày như điểm đã đạt được.
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        {item.activityPoints} điểm ({item.activityType})
                      </span>
                    )}

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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Trang <span className="font-semibold text-slate-700">{page + 1}</span> /{' '}
                <span className="font-semibold text-slate-700">{totalPages}</span> ({totalElements} sự kiện)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((prev) => prev + 1)}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : hasActiveFilters ? (
        <EmptyState
          icon={<Filter className="w-6 h-6" />}
          title="Không tìm thấy lịch sử phù hợp"
          description="Không có sự kiện nào khớp với các tiêu chí bộ lọc đã chọn. Bạn có thể đặt lại bộ lọc để xem toàn bộ."
          action={
            <Button variant="secondary" onClick={handleResetFilters}>
              Đặt lại bộ lọc
            </Button>
          }
        />
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
