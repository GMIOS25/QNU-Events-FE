import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { RegistrationSlot } from '../registration';
import { AttendanceSlot } from '../attendance';
import { Button } from '../../components/Button';
import { ArrowLeft } from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <Link to="/events">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Quay lại danh sách
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Chi tiết sự kiện</h1>
        <p className="text-sm text-slate-500 mb-6">Mã sự kiện: {id}</p>

        {/* Integration slots for Phase 1 parallel agents */}
        {id && (
          <div className="space-y-6">
            <RegistrationSlot eventId={id} />
            <AttendanceSlot eventId={id} />
          </div>
        )}
      </div>
    </div>
  );
};

