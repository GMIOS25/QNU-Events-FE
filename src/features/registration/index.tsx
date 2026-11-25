import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyRegistration, registerEvent } from '../../api/events';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorBanner } from '../../components/ErrorBanner';
import { CheckCircle2, Ticket, Users, AlertCircle, Clock } from 'lucide-react';
import { formatDateTime } from '../../lib/time';
import type { EventDetail } from '../events/types';

export interface RegistrationSlotProps {
  eventId: string;
  event?: EventDetail;
  onRegistered?: () => void;
}

export const RegistrationSlot: React.FC<RegistrationSlotProps> = ({ eventId, event, onRegistered }) => {
  const { hasRole } = useAuth();
  const isStudent = hasRole('STUDENT');
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: registration, isLoading: isLoadingReg } = useQuery({
    queryKey: ['my-registration', eventId],
    queryFn: () => fetchMyRegistration(eventId),
    enabled: isStudent,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: () => registerEvent(eventId),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['my-registration', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      if (onRegistered) onRegistered();
    },
    onError: (err: any) => {
      const code = err?.apiError?.code || err?.message;
      let msg = err?.apiError?.message || 'Không thể đăng ký tham gia sự kiện.';
      if (code === 'CAPACITY_FULL') {
        msg = 'Sự kiện đã hết suất tham gia.';
      } else if (code === 'REGISTRATION_CLOSED') {
        msg = 'Đã hết thời hạn đăng ký tham gia sự kiện.';
      } else if (code === 'NOT_IN_AUDIENCE') {
        msg = 'Sự kiện không áp dụng cho lớp của bạn.';
      } else if (code === 'ALREADY_REGISTERED') {
        msg = 'Bạn đã đăng ký tham gia sự kiện này rồi.';
      }
      setErrorMessage(msg);
    },
  });

  const isRegistered = registration?.status === 'REGISTERED';
  const isRegistrationOpen = event?.registrationOpen ?? true;
  const remainingQuota = event?.remainingQuota ?? 0;
  const quotaTotal = event?.quotaTotal ?? 0;
  const registeredCount = event?.registeredCount ?? 0;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Suất tham gia sự kiện</h3>
            <p className="text-xs text-slate-500">
              {quotaTotal > 0
                ? `Đã đăng ký ${registeredCount}/${quotaTotal} chỗ (còn lại ${remainingQuota} chỗ)`
                : 'Thông tin đăng ký chỗ'}
            </p>
          </div>
        </div>

        {isRegistered && <StatusBadge status="REGISTERED" />}
      </div>

      {/* Quota Progress Bar */}
      {quotaTotal > 0 && (
        <div className="mb-4">
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                remainingQuota === 0 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, (registeredCount / quotaTotal) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4">
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        </div>
      )}

      {isStudent ? (
        <div>
          {isRegistered ? (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Bạn đã giữ chỗ thành công!</p>
                {registration?.registeredAt && (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Đăng ký lúc: {formatDateTime(registration.registeredAt)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              {isRegistrationOpen && remainingQuota > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Hạn đăng ký: {event?.registrationDeadline ? formatDateTime(event.registrationDeadline) : 'Đang mở'}</span>
                  </div>
                  <Button
                    variant="primary"
                    loading={registerMutation.isPending || isLoadingReg}
                    onClick={() => registerMutation.mutate()}
                    icon={<Ticket className="w-4 h-4" />}
                  >
                    Đăng ký giữ chỗ
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    {remainingQuota === 0
                      ? 'Sự kiện đã hết suất tham gia.'
                      : 'Đã hết thời hạn đăng ký sự kiện.'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-slate-400" />
          <span>Chế độ quản lý: Sinh viên thuộc lớp được mời có thể đăng ký giữ chỗ tại đây.</span>
        </div>
      )}
    </div>
  );
};
