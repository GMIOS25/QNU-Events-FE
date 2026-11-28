import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkInQr, checkInGps, fetchMyAttendance } from '../../api/events';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { StatusBadge } from '../../components/StatusBadge';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Clock,
  ShieldAlert,
  MapPin,
  LocateFixed,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { formatDateTime } from '../../lib/time';
import { createIdempotencyKey } from '../../lib/idempotency';
import type { EventDetail, AttendanceErrorDetails, GpsCheckInRequest } from '../events/types';
import {
  DEFAULT_GPS_RADIUS_METERS,
  MAX_TRUSTED_GPS_ACCURACY_METERS,
  formatDistanceMeters,
  requestCurrentGpsPosition,
} from './gpsUtils';

export interface AttendanceSlotProps {
  eventId: string;
  event?: EventDetail;
  onCheckedIn?: () => void;
}

export const AttendanceSlot: React.FC<AttendanceSlotProps> = ({ eventId, event, onCheckedIn }) => {
  const queryClient = useQueryClient();
  const isGpsMethod = event?.attendanceMethod === 'GPS';
  const [manualToken, setManualToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [lastPosition, setLastPosition] = useState<GpsCheckInRequest | null>(null);
  const [pendingGpsSubmission, setPendingGpsSubmission] = useState<{
    payload: GpsCheckInRequest;
    idempotencyKey: string;
  } | null>(null);
  const [acceptedDistanceInfo, setAcceptedDistanceInfo] = useState<{
    distanceMeters: number;
    allowedRadiusMeters: number;
  } | null>(null);
  const [localAcceptedAt, setLocalAcceptedAt] = useState<string | null>(null);
  const [localAttemptCount, setLocalAttemptCount] = useState<number | null>(null);
  const [localMaxAttempts, setLocalMaxAttempts] = useState<number | null>(null);
  const [localCanRetry, setLocalCanRetry] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Khôi phục trạng thái đã điểm danh & số lần thử từ server khi tải lại trang (F5) (BUG-09 / QE-98)
  const { data: myAttendance } = useQuery({
    queryKey: ['my-attendance', eventId],
    queryFn: () => fetchMyAttendance(eventId),
    enabled: Boolean(eventId) && typeof fetchMyAttendance === 'function',
    retry: false,
  });

  const acceptedAt =
    localAcceptedAt ?? (myAttendance?.status === 'ACCEPTED' ? (myAttendance.acceptedAt ?? null) : null);
  const maxAttempts = localMaxAttempts ?? myAttendance?.maxAttempts ?? 3;
  const attemptCount = Math.max(localAttemptCount ?? 0, myAttendance?.attemptCount ?? 0);
  const canRetry =
    localCanRetry !== null ? localCanRetry : myAttendance ? myAttendance.canRetry : true;

  const isLimitReached = !acceptedAt && (!canRetry || attemptCount >= maxAttempts);
  const allowedRadiusMeters = event?.allowedRadiusMeters ?? DEFAULT_GPS_RADIUS_METERS;
  const isGpsConfigured = !isGpsMethod || (event?.gpsLat != null && event?.gpsLng != null);

  const handleCheckInError = (err: any) => {
    const apiError = err?.apiError;
    const code = apiError?.code || err?.message;
    let msg = apiError?.message || 'Điểm danh không thành công.';

    let details: AttendanceErrorDetails | undefined;
    if (apiError?.details) {
      details = apiError.details as AttendanceErrorDetails;
      if (typeof details.attemptCount === 'number') {
        setLocalAttemptCount(details.attemptCount);
      }
      if (typeof details.maxAttempts === 'number') {
        setLocalMaxAttempts(details.maxAttempts);
      }
      if (typeof details.canRetry === 'boolean') {
        setLocalCanRetry(details.canRetry);
      }
    }

    if (code === 'ALREADY_CHECKED_IN') {
      msg = 'Bạn đã điểm danh sự kiện này rồi.';
    } else if (code === 'ATTEMPT_LIMIT_REACHED') {
      msg = `Bạn đã vượt quá số lần thử điểm danh cho phép (tối đa ${maxAttempts} lần). Vui lòng liên hệ Ban tổ chức.`;
      setLocalAttemptCount(maxAttempts);
      setLocalCanRetry(false);
      setIsScannerOpen(false);
    } else if (code === 'GPS_OUT_OF_RANGE') {
      const targetRadius =
        typeof details?.allowedRadiusMeters === 'number'
          ? details.allowedRadiusMeters
          : allowedRadiusMeters;
      const distText =
        typeof details?.distanceMeters === 'number'
          ? formatDistanceMeters(details.distanceMeters, targetRadius, true)
          : null;
      const remainingText =
        typeof details?.remainingAttempts === 'number'
          ? details.remainingAttempts > 0
            ? ` Còn ${details.remainingAttempts} lượt thử.`
            : ' Bạn đã dùng hết lượt thử.'
          : '';
      msg = distText
        ? `Vị trí hiện tại của bạn cách tâm sự kiện ${distText}, vượt quá bán kính cho phép (${targetRadius} m).${remainingText}`
        : `Vị trí hiện tại của bạn nằm ngoài bán kính điểm danh (${targetRadius} m).${remainingText}`;
    } else if (code === 'GPS_NOT_CONFIGURED') {
      msg = 'Sự kiện chưa được cấu hình tọa độ điểm danh GPS. Vui lòng liên hệ Ban tổ chức.';
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

    queryClient.invalidateQueries({ queryKey: ['my-attendance', eventId] });
    setErrorMessage(msg);
  };

  const checkInMutation = useMutation({
    mutationFn: (token: string) => checkInQr(eventId, token.trim()),
    onSuccess: (data) => {
      setErrorMessage(null);
      setLocalAcceptedAt(data.acceptedAt);
      setIsScannerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my-attendance', eventId] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      if (onCheckedIn) onCheckedIn();
    },
    onError: handleCheckInError,
  });

  const gpsCheckInMutation = useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: GpsCheckInRequest;
      idempotencyKey: string;
    }) => checkInGps(eventId, payload, idempotencyKey),
    onSuccess: (data) => {
      setErrorMessage(null);
      setPendingGpsSubmission(null);
      setLocalAcceptedAt(data.acceptedAt);
      setAcceptedDistanceInfo({
        distanceMeters: data.distanceMeters,
        allowedRadiusMeters: data.allowedRadiusMeters,
      });
      queryClient.invalidateQueries({ queryKey: ['my-attendance', eventId] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      if (onCheckedIn) onCheckedIn();
    },
    onError: (err: any, variables) => {
      const hasServerResponse = Boolean(err?.apiError);
      if (!hasServerResponse) {
        // Giữ nguyên payload và Idempotency-Key khi mất kết nối/chưa nhận được phản hồi
        // để sinh viên thử lại không bị tính thêm lượt (QE-55 P2).
        setPendingGpsSubmission(variables);
        setErrorMessage(
          'Mất kết nối mạng khi gửi điểm danh GPS. Bấm "Gửi lại yêu cầu trước" để tiếp tục với cùng mã giao dịch mà không bị tính thêm lượt, hoặc bấm "Lấy vị trí mới".'
        );
        return;
      }
      setPendingGpsSubmission(null);
      handleCheckInError(err);
    },
  });

  const handleGpsCheckIn = async () => {
    if (isActionDisabled || !isGpsConfigured) return;
    setErrorMessage(null);
    setPendingGpsSubmission(null);
    setIsLocating(true);
    try {
      const coords = await requestCurrentGpsPosition();
      const idempotencyKey = createIdempotencyKey();
      setLastPosition(coords);
      setIsLocating(false);
      gpsCheckInMutation.mutate({ payload: coords, idempotencyKey });
    } catch (err: unknown) {
      setIsLocating(false);
      setErrorMessage(err instanceof Error ? err.message : 'Không thể lấy vị trí GPS từ thiết bị.');
    }
  };

  const handleRetryPendingGpsCheckIn = () => {
    if (isActionDisabled || !isGpsConfigured || !pendingGpsSubmission) return;
    setErrorMessage(null);
    gpsCheckInMutation.mutate(pendingGpsSubmission);
  };

  const checkInMutationRef = useRef(checkInMutation.mutate);
  useEffect(() => {
    checkInMutationRef.current = checkInMutation.mutate;
  });

  useEffect(() => {
    if (!isGpsMethod && isScannerOpen) {
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
  }, [isGpsMethod, isScannerOpen]);

  const isAttendanceOpen = event?.attendanceOpen ?? false;
  const isPending = checkInMutation.isPending || gpsCheckInMutation.isPending || isLocating;
  const isActionDisabled = isPending || isLimitReached || !isAttendanceOpen;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
            {isGpsMethod ? <MapPin className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {isGpsMethod ? 'Điểm danh sự kiện (GPS)' : 'Điểm danh sự kiện (QR Động)'}
            </h3>
            <p className="text-xs text-slate-500">
              {isGpsMethod
                ? `Xác nhận vị trí hiện tại của bạn nằm trong bán kính cho phép (${allowedRadiusMeters} m) của sự kiện.`
                : 'Quét mã QR do Ban tổ chức hiển thị trên máy chiếu để xác nhận tham dự.'}
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
            {acceptedDistanceInfo && (
              <p className="text-xs text-emerald-700 mt-1" data-testid="gps-accepted-distance">
                Khoảng cách xác thực:{' '}
                {formatDistanceMeters(
                  acceptedDistanceInfo.distanceMeters,
                  acceptedDistanceInfo.allowedRadiusMeters,
                  false
                )}{' '}
                / {acceptedDistanceInfo.allowedRadiusMeters} m cho phép.
              </p>
            )}
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
                  {isGpsMethod
                    ? `Bạn đã sử dụng hết ${maxAttempts}/${maxAttempts} lần thử điểm danh GPS. Vui lòng gặp Ban tổ chức tại bàn điều phối để được hỗ trợ điểm danh ngoại lệ.`
                    : `Bạn đã sử dụng hết ${maxAttempts}/${maxAttempts} lần thử quét mã QR. Vui lòng gặp Ban tổ chức tại bàn điều phối để được hỗ trợ điểm danh ngoại lệ.`}
                </p>
              </div>
            </div>
          ) : !isAttendanceOpen ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chưa đến hoặc đã hết giờ mở điểm danh cho sự kiện này.</span>
            </div>
          ) : isGpsMethod && !isGpsConfigured ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Sự kiện chưa được cấu hình tọa độ tâm GPS. Vui lòng liên hệ Ban tổ chức.</span>
            </div>
          ) : null}

          {isGpsMethod ? (
            <div className="space-y-3" data-testid="gps-attendance-panel">
              {isGpsConfigured && event?.gpsLat != null && event?.gpsLng != null && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5">
                  <span>
                    <strong>Tâm sự kiện:</strong> {event.gpsLat.toFixed(6)}, {event.gpsLng.toFixed(6)}
                  </span>
                  <span>
                    <strong>Bán kính cho phép:</strong> {allowedRadiusMeters} m
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                {pendingGpsSubmission ? (
                  <>
                    <Button
                      variant="primary"
                      icon={<LocateFixed className="w-4 h-4" />}
                      onClick={handleRetryPendingGpsCheckIn}
                      disabled={isActionDisabled || !isGpsConfigured}
                      loading={gpsCheckInMutation.isPending}
                    >
                      {gpsCheckInMutation.isPending
                        ? 'Đang gửi lại yêu cầu...'
                        : 'Gửi lại yêu cầu trước'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGpsCheckIn}
                      disabled={isActionDisabled || !isGpsConfigured}
                      loading={isLocating}
                    >
                      {isLocating ? 'Đang lấy vị trí mới...' : 'Lấy vị trí mới'}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    icon={<LocateFixed className="w-4 h-4" />}
                    onClick={handleGpsCheckIn}
                    disabled={isActionDisabled || !isGpsConfigured}
                    loading={isLocating || gpsCheckInMutation.isPending}
                  >
                    {isLocating
                      ? 'Đang lấy vị trí GPS...'
                      : gpsCheckInMutation.isPending
                        ? 'Đang xác thực vị trí...'
                        : 'Lấy vị trí & Điểm danh GPS'}
                  </Button>
                )}

                {lastPosition && (
                  <div
                    data-testid="gps-last-reading"
                    className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2"
                  >
                    Tọa độ vừa ghi nhận: {lastPosition.latitude.toFixed(6)},{' '}
                    {lastPosition.longitude.toFixed(6)} (sai số ±
                    {Math.round(lastPosition.accuracyMeters * 10) / 10} m)
                  </div>
                )}
              </div>

              {lastPosition && lastPosition.accuracyMeters > MAX_TRUSTED_GPS_ACCURACY_METERS && (
                <div
                  data-testid="gps-low-accuracy-advisory"
                  className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Độ sai số tín hiệu GPS hiện tại khá cao (±
                    {Math.round(lastPosition.accuracyMeters)} m &gt; {MAX_TRUSTED_GPS_ACCURACY_METERS} m).
                    Nếu điểm danh thành công, bản ghi có thể được Ban tổ chức đưa vào diện hậu kiểm.
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-400">
                * Lưu ý bảo mật: Vị trí GPS được xác thực trực tiếp trên máy chủ theo khoảng cách Haversine. Tối đa {maxAttempts} lần thử ngoài phạm vi trước khi bị tạm khóa.
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
};
