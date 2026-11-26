import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Field } from '../../components/Field';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { ApiErrorException } from '../../api/client';
import { CalendarCheck, ShieldCheck, UserCheck } from 'lucide-react';

const loginSchema = z.object({
  loginId: z.string().min(1, 'Tên đăng nhập không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<{ message: string; code?: string } | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginId: '',
      password: '',
    },
  });

  const showDemoAccounts = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true';

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data.loginId, data.password, rememberMe);
      const fromState = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from;
      const from = fromState?.pathname
        ? `${fromState.pathname}${fromState.search ?? ''}${fromState.hash ?? ''}`
        : '/';
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiErrorException) {
        setServerError({
          message: err.apiError.message || 'Đăng nhập không thành công.',
          code: err.apiError.code,
        });
      } else {
        setServerError({
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
        });
      }
    }
  };

  const handleQuickFill = (loginId: string) => {
    setValue('loginId', loginId);
    setValue('password', 'Demo@12345');
    setServerError(null);
  };

  return (
    <div className="min-h-screen bg-[#F3F8FC] text-[#25435E] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="my-auto sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 bg-[#0789B7] rounded-2xl flex items-center justify-center text-white shadow-sm ring-4 ring-[#E5F4FC] mb-4">
            <CalendarCheck className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0789B7]">
            HỆ THỐNG QUẢN LÝ SỰ KIỆN
          </p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#25435E]">QNU Events</h2>
          <p className="mt-1 text-sm text-[#73899B]">
            Cổng đăng ký và điểm danh hoạt động trực tuyến Đại học Quy Nhơn
          </p>
        </div>

        <div className="mt-6 bg-white py-7 px-6 shadow-xs border border-[#DCE5EE] rounded-2xl sm:px-8">
          <div className="mb-5 pb-4 border-b border-[#DCE5EE]">
            <h3 className="text-lg font-semibold text-[#25435E]">Đăng nhập</h3>
            <p className="mt-0.5 text-xs text-[#73899B]">
              Nhập mã sinh viên hoặc tài khoản ban tổ chức để tiếp tục
            </p>
          </div>

          {serverError && (
            <div className="mb-5">
              <ErrorBanner
                message={serverError.message}
                code={serverError.code}
                onDismiss={() => setServerError(null)}
              />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field
              label="Tên đăng nhập / Mã sinh viên"
              placeholder="Ví dụ: sv001 hoặc owner01"
              autoComplete="username"
              error={errors.loginId?.message}
              className={
                errors.loginId
                  ? undefined
                  : 'border-[#DCE5EE] focus:border-[#0789B7] focus:ring-[#E5F4FC] text-[#25435E]'
              }
              {...register('loginId')}
            />

            <Field
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              className={
                errors.password
                  ? undefined
                  : 'border-[#DCE5EE] focus:border-[#0789B7] focus:ring-[#E5F4FC] text-[#25435E]'
              }
              {...register('password')}
            />

            <div className="flex items-center justify-between pt-0.5">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#DCE5EE] accent-[#0789B7] focus:ring-2 focus:ring-[#0789B7]/30 cursor-pointer"
                />
                <span className="text-sm font-medium text-[#25435E]">Lưu đăng nhập</span>
              </label>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                className="w-full !bg-[#0789B7] hover:!bg-[#087DB4] focus:!ring-[#0789B7] text-white font-semibold"
              >
                Đăng nhập
              </Button>
            </div>
          </form>

          {showDemoAccounts && (
            <div className="mt-6 pt-5 border-t border-[#DCE5EE]">
              <p className="text-[11px] font-semibold text-[#73899B] uppercase tracking-wider text-center mb-3">
                Tài khoản demo thử nghiệm (Mật khẩu: Demo@12345)
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill('owner01')}
                  className="!border-[#DCE5EE] !text-[#25435E] hover:!bg-[#E5F4FC] hover:!border-[#0789B7]/40 hover:!text-[#0789B7]"
                  icon={<ShieldCheck className="w-4 h-4 text-[#0789B7]" aria-hidden="true" />}
                >
                  Chủ sự kiện
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill('sv001')}
                  className="!border-[#DCE5EE] !text-[#25435E] hover:!bg-[#E5F4FC] hover:!border-[#0789B7]/40 hover:!text-[#0789B7]"
                  icon={<UserCheck className="w-4 h-4 text-[#0789B7]" aria-hidden="true" />}
                >
                  Sinh viên (K49)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-[#73899B]">
        QNU EVENT · Hệ thống quản lý đăng ký và xác thực tham gia hoạt động · MVP · 2026
      </footer>
    </div>
  );
};

