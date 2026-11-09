import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEvent, createEvent, updateEvent, fetchClasses } from '../../api/events';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { ErrorBanner } from '../../components/ErrorBanner';
import { ArrowLeft, Save, Calendar, Users, MapPin, Award } from 'lucide-react';
import type { EventUpsert } from './types';

export const EventFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [attendanceOpenAt, setAttendanceOpenAt] = useState('');
  const [attendanceCloseAt, setAttendanceCloseAt] = useState('');
  const [quotaTotal, setQuotaTotal] = useState(50);
  const [activityType, setActivityType] = useState('Hội thảo khoa học');
  const [activityPoints, setActivityPoints] = useState(5);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [version, setVersion] = useState<number | undefined>(undefined);

  // Load Classes
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: fetchClasses,
  });

  // Load existing event if editing
  const { isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const data = await fetchEvent(id!);
      setTitle(data.title);
      setDescription(data.description || '');
      setLocation(data.location);
      setStartAt(data.startAt ? data.startAt.slice(0, 16) : '');
      setEndAt(data.endAt ? data.endAt.slice(0, 16) : '');
      setRegistrationDeadline(data.registrationDeadline ? data.registrationDeadline.slice(0, 16) : '');
      setAttendanceOpenAt(data.attendanceOpenAt ? data.attendanceOpenAt.slice(0, 16) : '');
      setAttendanceCloseAt(data.attendanceCloseAt ? data.attendanceCloseAt.slice(0, 16) : '');
      setQuotaTotal(data.quotaTotal);
      setActivityType(data.activityType);
      setActivityPoints(data.activityPoints);
      setSelectedClassIds(data.audienceClassIds || []);
      setVersion(data.version);
      return data;
    },
    enabled: isEdit,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate
      if (!title.trim() || title.trim().length < 3) {
        throw new Error('Tiêu đề sự kiện phải từ 3 ký tự trở lên.');
      }
      if (!location.trim()) {
        throw new Error('Vui lòng nhập địa điểm tổ chức.');
      }
      if (!startAt || !endAt) {
        throw new Error('Vui lòng chọn thời gian bắt đầu và kết thúc.');
      }
      if (new Date(endAt) <= new Date(startAt)) {
        throw new Error('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
      }
      if (!registrationDeadline) {
        throw new Error('Vui lòng chọn hạn chót đăng ký.');
      }
      if (!attendanceOpenAt || !attendanceCloseAt) {
        throw new Error('Vui lòng thiết lập cửa sổ điểm danh (bắt đầu và kết thúc).');
      }
      if (new Date(attendanceCloseAt) <= new Date(attendanceOpenAt)) {
        throw new Error('Thời gian đóng điểm danh phải sau thời gian mở điểm danh.');
      }
      if (selectedClassIds.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một lớp đối tượng được tham gia sự kiện.');
      }

      const payload: EventUpsert = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        registrationDeadline: new Date(registrationDeadline).toISOString(),
        attendanceOpenAt: new Date(attendanceOpenAt).toISOString(),
        attendanceCloseAt: new Date(attendanceCloseAt).toISOString(),
        attendanceMethod: 'DYNAMIC_QR',
        quotaTotal: Number(quotaTotal),
        audienceClassIds: selectedClassIds,
        activityType: activityType.trim(),
        activityPoints: Number(activityPoints),
      };

      if (isEdit && id) {
        return updateEvent(id, { ...payload, version: version ?? 0 });
      } else {
        return createEvent(payload);
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', saved.id] });
      navigate(`/events/${saved.id}`);
    },
    onError: (err: any) => {
      const code = err?.apiError?.code || err?.message;
      let msg = err?.apiError?.message || err?.message || 'Không thể lưu sự kiện.';
      if (code === 'VERSION_CONFLICT') {
        msg = 'Dữ liệu sự kiện đã bị thay đổi bởi người khác. Vui lòng tải lại trang và thử lại.';
      }
      setErrorMessage(msg);
    },
  });

  const toggleClassId = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId]
    );
  };

  const selectAllClasses = () => {
    if (classes) {
      setSelectedClassIds(classes.map((c) => c.id));
    }
  };

  if (isEdit && isLoadingEvent) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-500 text-sm">
        Đang tải thông tin sự kiện...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/events">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Quay lại danh sách
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {isEdit ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Điền đầy đủ các thông tin chi tiết để lập kế hoạch và công bố sự kiện tới sinh viên.
        </p>

        {errorMessage && (
          <div className="mb-6">
            <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-6"
        >
          {/* Section: Thông tin chung */}
          <div className="border-b border-slate-100 pb-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Thông tin chung
            </h2>

            <Field label="Tiêu đề sự kiện" required>
              <input
                type="text"
                placeholder="VD: Hội thảo Công nghệ Trí tuệ Nhân tạo & Tương lai CNTT"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <Field label="Mô tả sự kiện">
              <textarea
                rows={3}
                placeholder="Mô tả tóm tắt nội dung, diễn giả, quyền lợi của người tham gia..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Địa điểm tổ chức" required>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="VD: Hội trường A - Trường ĐH Quy Nhơn"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </Field>

              <Field label="Chỉ tiêu số lượng tham gia (suất)" required>
                <input
                  type="number"
                  min={1}
                  value={quotaTotal}
                  onChange={(e) => setQuotaTotal(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>
          </div>

          {/* Section: Thời gian sự kiện & Đăng ký */}
          <div className="border-b border-slate-100 pb-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Lịch trình & Đăng ký
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Thời gian bắt đầu sự kiện" required>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Thời gian kết thúc sự kiện" required>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>

            <Field label="Hạn chót sinh viên đăng ký giữ chỗ" required>
              <input
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Mở cửa sổ điểm danh QR" required>
                <input
                  type="datetime-local"
                  value={attendanceOpenAt}
                  onChange={(e) => setAttendanceOpenAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Đóng cửa sổ điểm danh QR" required>
                <input
                  type="datetime-local"
                  value={attendanceCloseAt}
                  onChange={(e) => setAttendanceCloseAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>
          </div>

          {/* Section: Điểm rèn luyện & Đối tượng */}
          <div className="border-b border-slate-100 pb-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Điểm rèn luyện & Loại hoạt động
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Loại hoạt động rèn luyện" required>
                <input
                  type="text"
                  placeholder="VD: Hội thảo khoa học, Hoạt động tình nguyện..."
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Điểm rèn luyện cộng thêm" required>
                <input
                  type="number"
                  min={0}
                  value={activityPoints}
                  onChange={(e) => setActivityPoints(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
            </div>
          </div>

          {/* Section: Lớp đối tượng (Audience) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Lớp đối tượng được mời tham gia ({selectedClassIds.length} lớp đã chọn)
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={selectAllClasses}>
                Chọn tất cả các lớp
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {classes?.map((c) => {
                const isSelected = selectedClassIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleClassId(c.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{c.code} ({c.name})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link to="/events">
              <Button type="button" variant="ghost">
                Hủy bỏ
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={saveMutation.isPending}
              icon={<Save className="w-4 h-4" />}
            >
              {isEdit ? 'Lưu thay đổi' : 'Tạo bản nháp sự kiện'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
