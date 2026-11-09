import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEvent, previewEvent, publishEvent } from '../../api/events';
import { useAuth } from '../auth/AuthContext';
import { RegistrationSlot } from '../registration';
import { AttendanceSlot } from '../attendance';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorBanner } from '../../components/ErrorBanner';
import { formatDateTime } from '../../lib/time';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Award,
  QrCode,
  Edit,
  Send,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { PreviewResponse } from './types';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isOwner = hasRole('EVENT_OWNER');
  const isStudent = hasRole('STUDENT');
  const queryClient = useQueryClient();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEvent(id!),
    enabled: !!id,
  });

  const previewMutation = useMutation({
    mutationFn: () => previewEvent(id!),
    onSuccess: (data) => {
      setPreviewData(data);
      setIsPreviewOpen(true);
      setConfirmPublish(false);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err?.apiError?.message || 'Không thể tải bản xem trước sự kiện.');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      publishEvent(id!, {
        confirm: true,
        previewVersion: previewData?.previewVersion ?? event?.version ?? 0,
      }),
    onSuccess: () => {
      setIsPreviewOpen(false);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err: any) => {
      const code = err?.apiError?.code;
      let msg = err?.apiError?.message || 'Không thể công bố sự kiện.';
      if (code === 'PREVIEW_REQUIRED') {
        msg = 'Bạn cần xem trước sự kiện trước khi công bố.';
      } else if (code === 'PREVIEW_OUTDATED') {
        msg = 'Bản xem trước đã cũ do có sự thay đổi. Vui lòng xem trước lại.';
      }
      setActionError(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-500 text-sm">
        Đang tải thông tin sự kiện...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <ErrorBanner message="Không tìm thấy sự kiện hoặc bạn không có quyền xem sự kiện này." />
        <div className="mt-4">
          <Link to="/events">
            <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />}>
              Quay lại danh sách
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isDraft = event.status === 'DRAFT';
  const isPublished = event.status === 'PUBLISHED';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link to="/events">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Quay lại danh sách
          </Button>
        </Link>

        {isOwner && (
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Link to={`/events/${event.id}/edit`}>
                  <Button variant="outline" size="sm" icon={<Edit className="w-4 h-4" />}>
                    Chỉnh sửa
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  loading={previewMutation.isPending}
                  onClick={() => previewMutation.mutate()}
                  icon={<Send className="w-4 h-4" />}
                >
                  Xem trước & Công bố
                </Button>
              </>
            )}

            {isPublished && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/events/${event.id}/qr`)}
                icon={<QrCode className="w-4 h-4" />}
              >
                Màn hình chiếu QR
              </Button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="mb-6">
          <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        </div>
      )}

      {/* Main Event Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={event.status} />
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <Award className="w-3 h-3 text-amber-600" />
                +{event.activityPoints} điểm ({event.activityType})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {event.title}
            </h1>
          </div>
        </div>

        {event.description && (
          <div className="prose prose-sm text-slate-600 max-w-none mt-3 mb-6 whitespace-pre-wrap">
            {event.description}
          </div>
        )}

        {/* Event Key Facts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-slate-100 my-6 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Thời gian diễn ra</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {formatDateTime(event.startAt)} - {formatDateTime(event.endAt)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Địa điểm</p>
              <p className="font-semibold text-slate-900 mt-0.5">{event.location}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Cửa sổ điểm danh QR</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {formatDateTime(event.attendanceOpenAt)} đến {formatDateTime(event.attendanceCloseAt)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Quy mô sự kiện</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {event.registeredCount}/{event.quotaTotal} suất đã đăng ký
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Slots for Students and Owners */}
        <div className="space-y-6">
          <RegistrationSlot
            eventId={event.id}
            event={event}
            onRegistered={() => queryClient.invalidateQueries({ queryKey: ['event', id] })}
          />

          {isStudent && isPublished && (
            <AttendanceSlot
              eventId={event.id}
              event={event}
              onCheckedIn={() => queryClient.invalidateQueries({ queryKey: ['event', id] })}
            />
          )}
        </div>
      </div>

      {/* Preview & Publish Modal */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                Xem trước sự kiện (Version {previewData.previewVersion})
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">{previewData.event.title}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {previewData.event.location} • {formatDateTime(previewData.event.startAt)}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-200">
              <p>• <strong>Chỉ tiêu:</strong> {previewData.event.quotaTotal} sinh viên</p>
              <p>• <strong>Cửa sổ điểm danh:</strong> {formatDateTime(previewData.event.attendanceOpenAt)} - {formatDateTime(previewData.event.attendanceCloseAt)}</p>
              <p>• <strong>Điểm rèn luyện:</strong> +{previewData.event.activityPoints} điểm ({previewData.event.activityType})</p>
              <p>• <strong>Chu kỳ mã QR:</strong> Xoay vòng mỗi {previewData.event.qrRotationSeconds}s</p>
            </div>

            <label className="flex items-start gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={confirmPublish}
                onChange={(e) => setConfirmPublish(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-blue-900 font-medium">
                Tôi xác nhận thông tin sự kiện trên là hoàn toàn chính xác và muốn công bố mở đăng ký cho sinh viên.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setIsPreviewOpen(false)}
                disabled={publishMutation.isPending}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                disabled={!confirmPublish || publishMutation.isPending}
                loading={publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Xác nhận công bố
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
