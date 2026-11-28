import type { GpsCheckInRequest } from '../events/types';

export const DEFAULT_GPS_RADIUS_METERS = 60;
export const MAX_TRUSTED_GPS_ACCURACY_METERS = 100;

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

/**
 * Định dạng khoảng cách (mét) phục vụ hiển thị cho sinh viên.
 * Khi bị từ chối vì vượt biên (ví dụ 60.04m với bán kính 60m), không làm tròn xuống thành 60.0m
 * để tránh mâu thuẫn "cách 60.0m, cho phép 60m nhưng vẫn bị từ chối".
 */
export function formatDistanceMeters(
  distanceMeters: number,
  allowedRadiusMeters?: number,
  isOutOfRange = false
): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return '0 m';
  }

  const roundedOneDecimal = Math.round(distanceMeters * 10) / 10;
  if (
    isOutOfRange &&
    allowedRadiusMeters !== undefined &&
    distanceMeters > allowedRadiusMeters &&
    roundedOneDecimal <= allowedRadiusMeters
  ) {
    const roundedTwoDecimals = Math.ceil(distanceMeters * 100) / 100;
    return `${roundedTwoDecimals.toFixed(2)} m`;
  }

  return `${roundedOneDecimal.toFixed(1)} m`;
}

export function mapGeolocationError(error: Partial<GeolocationPositionError> | Error): string {
  if ('code' in error && typeof error.code === 'number') {
    if (error.code === 1) {
      return 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật quyền Vị trí (Location) trong cài đặt trình duyệt và thử lại.';
    }
    if (error.code === 2) {
      return 'Không thể xác định vị trí GPS hiện tại. Vui lòng bật dịch vụ định vị (GPS) trên thiết bị và di chuyển đến khu vực thoáng hơn.';
    }
    if (error.code === 3) {
      return 'Hết thời gian chờ lấy tín hiệu GPS. Vui lòng kiểm tra kết nối định vị và thử lại.';
    }
  }
  return error.message || 'Không thể lấy vị trí GPS từ thiết bị.';
}

export function requestCurrentGpsPosition(
  options: PositionOptions = GEOLOCATION_OPTIONS
): Promise<GpsCheckInRequest> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Trình duyệt của bạn không hỗ trợ định vị GPS (Geolocation).'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : 0,
        });
      },
      (geoError) => {
        reject(new Error(mapGeolocationError(geoError)));
      },
      options
    );
  });
}
