import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkInQr } from '../../api/events';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { StatusBadge } from '../../components/StatusBadge';
import { QrCode, Camera, CheckCircle2, AlertCircle, KeyRound, Clock, ShieldAlert } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { formatDateTime } from '../../lib/time';
import type { EventDetail, AttendanceErrorDetails } from '../events/types';

export interface AttendanceSlotProps {
  eventId: string;
  event?: EventDetail;
  onCheckedIn?: () => void;
}

export const AttendanceSlot: React.FC<AttendanceSlotProps> = ({ eventId, event, onCheckedIn }) => {
  const queryClient = useQueryClient();
  const [manualToken, setManualToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [canRetry, setCanRetry] = useState<boolean>(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const isLimitReached = !canRetry || attemptCount >= maxAttempts;

  const checkInMutation = useMutation({
    mutationFn: (token: string) => checkInQr(eventId, token.trim()),
    onSuccess: (data) => {
      setErrorMessage(null);
      setAcceptedAt(data.acceptedAt);
      setIsScannerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      if (onCheckedIn) onCheckedIn();
    },
    onError: (err: any) => {
      const apiError = err?.apiError;
      const code = apiError?.code || err?.message;
      let msg = apiError?.message || 'Điểm danh không thành công.';

      if (apiError?.details) {
        const details = apiError.details as AttendanceErrorDetails;
        if (typeof details.attemptCount === 'number') {
          setAttemptCount(details.attemptCount);
        }
        if (typeof details.maxAttempts === 'number') {
          setMaxAttempts(details.maxAttempts);
        }
        if (typeof details.canRetry === 'boolean') {
          setCanRetry(details.canRetry);
        }
      }

      if (code === 'ALREADY_CHECKED_IN') {
        msg = 'Bạn đã điểm danh sự kiện này rồi.';
      } else if (code === 'ATTEMPT_LIMIT_REACHED') {
        msg = 'Bạn đã vượt quá số lần thử điểm danh cho phép (tối đa 3 lần). Vui lòng liên hệ Ban tổ chức.';
        setAttemptCount(3);
        setCanRetry(false);
        setIsScannerOpen(false);
      } else if (code === 'QR_EXPIRED') {
        msg = `Mã QR đã hết hạn (xoay vòng ${event?.qrRotationSeconds ?? 10} giây). Vui lòng quét lại mã đang hiển thị.`;
      } else if (code === 'QR_BAD_SIGNATURE' || code === 'QR_MALFORMED') {
        msg = 'Mã QR không hợp lệ hoặc chữ ký bảo mật sai lệch.';
      } else if (code === 'QR_WRONG_EVENT') {
        msg = 'Mã QR không thuộc sự kiện này.';
      } else if (code === 'ATTENDANCE_NOT_OPEN') {
        msg = 'Chưa đến hoặc đã hết thời gian mở cửa sổ điểm danh.';
      } else if (code === 'EVENT_NOT_PUBLISHED') {
        msg = 'Sự kiện chưa được công bố.';
      } else if (code === 'NOT_REGISTERED') {
        msg = 'Bạn chưa đăng ký giữ chỗ sự kiện này nên không thể điểm danh.';
      }

      setErrorMessage(msg);
    },
  });

  const checkInMutationRef = useRef(checkInMutation.mutate);
  useEffect(() => {
    checkInMutationRef.current = checkInMutation.mutate;
  });

  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          if (decodedText) {
            scanner.clear().catch(console.error);
            setIsScannerOpen(false);
            checkInMutationRef.current(decodedText);
          }
        },
        () => {
          // Ignore scanning frames without QR
        }
      );

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [isScannerOpen]);

  const isAttendanceOpen = event?.attendanceOpen ?? false;
  const isActionDisabled = checkInMutation.isPending || isLimitReached || !isAttendanceOpen;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Điểm danh sự kiện (QR Động)</h3>
            <p className="text-xs text-slate-500">
              Quét mã QR do Ban tổ chức hiển thị trên máy chiếu để xác nhận tham dự.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Badge đếm lượt xác nhận theo Figma */}
          {!acceptedAt && (
            <div
              data-testid="attempt-counter-badge"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                isLimitReached
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : attemptCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <span>Lượt gửi xác nhận: {attemptCount}/{maxAttempts}</span>
              {isLimitReached && (
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">(Đã hết lượt)</span>
              )}
            </div>
          )}

          {acceptedAt ? (
            <StatusBadge status="ACCEPTED" />
          ) : (
            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Cửa sổ:{' '}
                {event?.attendanceOpenAt && event?.attendanceCloseAt
                  ? `${formatDateTime(event.attendanceOpenAt)} - ${formatDateTime(event.attendanceCloseAt)}`
                  : 'Theo lịch Ban tổ chức'}
              </span>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4">
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        </div>
      )}

      {acceptedAt ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-emerald-900">Điểm danh thành công!</h4>
            <p className="text-sm text-emerald-700 mt-0.5">
              Thời gian xác nhận: {formatDateTime(acceptedAt)}. Bạn đã được ghi nhận tích lũy điểm rèn luyện.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cảnh báo khi vượt quá hạn ngạch 3 lần thử */}
          {isLimitReached ? (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs sm:text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Đã khóa chức năng điểm danh tự động</p>
                <p className="text-rose-700 mt-0.5">
                  Bạn đã sử dụng hết 3/3 lần thử quét mã QR. Vui lòng gặp Ban tổ chức tại bàn điều phối để được hỗ trợ điểm danh ngoại lệ.
                </p>
              </div>
            </div>
          ) : !isAttendanceOpen ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chưa đến hoặc đã hết giờ mở điểm danh cho sự kiện này.</span>
            </div>
          ) : null}

          {/* Camera Scanner Container */}
          {isScannerOpen && !isLimitReached && (
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div id="qr-reader-container" className="w-full max-w-sm mx-auto" />
              <div className="text-center mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    scannerRef.current?.clear().catch(() => {});
                    setIsScannerOpen(false);
                  }}
                >
                  Đóng camera
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="primary"
              icon={<Camera className="w-4 h-4" />}
              onClick={() => setIsScannerOpen((prev) => !prev)}
              disabled={isActionDisabled}
            >
              {isScannerOpen ? 'Tắt Camera Quét' : 'Quét mã QR bằng Camera'}
            </Button>

            <span className="text-xs text-slate-400 text-center sm:text-left">hoặc</span>

            {/* Manual Token Fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualToken.trim() && !isActionDisabled) {
                  checkInMutation.mutate(manualToken.trim());
                }
              }}
              className="flex-1 flex gap-2"
            >
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isLimitReached ? 'Chức năng đã bị khóa' : 'Dán chuỗi token dự phòng (qr1...)'}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  disabled={isActionDisabled}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
              <Button
                variant="outline"
                type="submit"
                disabled={!manualToken.trim() || isActionDisabled}
                loading={checkInMutation.isPending}
              >
                Gửi mã
              </Button>
            </form>
          </div>

          <p className="text-xs text-slate-400">
            * Lưu ý bảo mật: Mã QR tự động đổi sau mỗi {event?.qrRotationSeconds ?? 10} giây. Tối đa {maxAttempts} lần thử sai trước khi bị tạm khóa.
          </p>
        </div>
      )}
    </div>
  );
};
