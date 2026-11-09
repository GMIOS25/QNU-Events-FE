import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Compass } from 'lucide-react';

export const EventsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isOwner = hasRole('EVENT_OWNER');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isOwner ? 'Quản lý sự kiện' : 'Khám phá sự kiện'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isOwner
              ? 'Theo dõi, tạo mới và công bố các sự kiện của đơn vị'
              : 'Xem danh sách các sự kiện dành riêng cho lớp của bạn'}
          </p>
        </div>

        {isOwner && (
          <Link to="/events/new">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              Tạo sự kiện
            </Button>
          </Link>
        )}
      </div>

      <EmptyState
        icon={isOwner ? <Calendar className="w-6 h-6" /> : <Compass className="w-6 h-6" />}
        title={isOwner ? 'Chưa có sự kiện nào' : 'Chưa có sự kiện dành cho lớp bạn'}
        description={
          isOwner
            ? 'Hãy bấm nút Tạo sự kiện để bắt đầu lập kế hoạch cho sự kiện mới.'
            : 'Hiện tại chưa có sự kiện nào mở đăng ký cho lớp của bạn. Hãy quay lại sau nhé!'
        }
        action={
          isOwner ? (
            <Link to="/events/new">
              <Button variant="outline" size="sm">
                Tạo sự kiện đầu tiên
              </Button>
            </Link>
          ) : undefined
        }
      />
    </div>
  );
};

