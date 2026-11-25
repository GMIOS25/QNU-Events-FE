import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchEvent, fetchEventQr } from '../../api/events';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { ArrowLeft, RefreshCw, Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '../../lib/time';

export const EventQrPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const { data: event, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEvent(id!),
    enabled: !!id,
  });

  const {
    data: qrData,
    isLoading: isLoadingQr,
    error: qrError,
    refetch,
  } = useQuery({
    queryKey: ['event-qr', id],
    queryFn: () => fetchEventQr(id!),
    enabled: !!id,
    refetchInterval: 9500, // Rotate every 9.5 seconds automatically
  });

  // Countdown timer for next rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 10));
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData?.epoch]);

  const handleCopyToken = () => {
    if (qrData?.token) {
      navigator.clipboard.writeText(qrData.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isAttendanceOpen = event?.attendanceOpen ?? false;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/events/${id}`}>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800" icon={<ArrowLeft className="w-4 h-4" />}>
              Quay lại chi tiết
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">{event?.title || 'Trình chiếu mã QR điểm danh'}</h1>
            <p className="text-xs text-slate-400">
              {event?.location} • {event?.startAt ? formatDateTime(event.startAt) : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-xs">
            <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
            <span>Đổi mã sau: <strong className="text-teal-400 font-mono text-sm">{countdown}s</strong></span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Làm mới ngay
          </Button>
        </div>
      </div>

      {/* Main Presentation Screen */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        {!isAttendanceOpen && (
          <div className="max-w-xl w-full mb-6">
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl p-4 flex items-center gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Cửa sổ điểm danh:{' '}
                {event?.attendanceOpenAt && event?.attendanceCloseAt
                  ? `${formatDateTime(event.attendanceOpenAt)} đến ${formatDateTime(event.attendanceCloseAt)}`
                  : 'Chưa mở'}
              </span>
            </div>
          </div>
        )}

        {qrError ? (
          <div className="max-w-md w-full">
            <ErrorBanner
              message="Không thể tạo mã QR điểm danh. Vui lòng kiểm tra xem sự kiện đã đến giờ điểm danh chưa hoặc liên hệ quản trị viên."
            />
          </div>
        ) : isLoadingQr || isLoadingEvent ? (
          <div className="text-slate-400 text-sm animate-pulse flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
            <span>Đang tạo mã QR động bảo mật...</span>
          </div>
        ) : qrData ? (
          <div className="flex flex-col items-center">
            {/* White card containing the QR */}
            <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-teal-500/30 flex flex-col items-center">
              <QRCodeSVG
                value={qrData.token}
                size={340}
                level="M"
                includeMargin={true}
              />
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                  <Clock className="w-3.5 h-3.5" />
                  Epoch #{qrData.epoch} • Chu kỳ {qrData.rotationSeconds}s
                </span>
              </div>
            </div>

            {/* Instruction & Fallback Token */}
            <div className="mt-8 text-center max-w-lg">
              <h2 className="text-xl font-bold text-slate-100 mb-2">
                Quét mã QR bằng ứng dụng QNU-Events
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Mở camera trên điện thoại hoặc dán mã bên dưới nếu thiết bị của bạn không có camera.
              </p>

              {/* Copy fallback token box */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="truncate font-mono text-slate-300 text-left">
                  {qrData.token}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToken}
                  className="shrink-0 border-slate-600 text-slate-200 hover:bg-slate-700"
                  icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Đã chép' : 'Chép mã'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
