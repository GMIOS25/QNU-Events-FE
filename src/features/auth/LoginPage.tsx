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

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data.loginId, data.password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 mb-4">
          <CalendarCheck className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">QNU Events</h2>
        <p className="mt-1 text-sm text-slate-500">Cổng quản lý và điểm danh sự kiện trực tuyến Đại học Quy Nhơn</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {serverError && (
            <div className="mb-6">
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
              {...register('loginId')}
            />

            <Field
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
                Đăng nhập
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Tài khoản demo thử nghiệm (Mật khẩu: Demo@12345)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickFill('owner01')}
                icon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
              >
                Chủ sự kiện
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickFill('sv001')}
                icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
              >
                Sinh viên (K49)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

