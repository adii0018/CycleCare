import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Calendar,
  Archive,
  RotateCcw,
  ImageOff,
  Maximize2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PhotoViewerModal } from '../../components/common/PhotoViewerModal';
import { useRepair } from '../../hooks/useRepair';
import { PROBLEM_LABEL_MAP } from '../../lib/constants';
import { formatISTDateTime, formatMobileDisplay } from '../../lib/formatters';
import { toast } from 'sonner';

export function AdminDetailPage() {
  const { repairId } = useParams();
  const navigate = useNavigate();

  const { repair, loading, error, is404, setArchived } = useRepair(repairId);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [brokenImages, setBrokenImages] = useState(new Set());

  if (is404) {
    return (
      <Card className="max-w-md mx-auto text-center p-8 space-y-4">
        <h2 className="text-xl font-bold text-brand-navy">Record Not Found</h2>
        <p className="text-sm text-brand-muted">
          No repair record exists with ID{' '}
          <span className="font-mono font-bold">{repairId}</span>.
        </p>
        <Button variant="primary" onClick={() => navigate('/admin/repairs')}>
          Back to Records List
        </Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !repair) {
    return (
      <Card className="max-w-md mx-auto text-center p-6 space-y-3">
        <p className="text-brand-error text-sm font-medium">
          {error || 'Failed to load record'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/repairs')}>
          Back to Records List
        </Button>
      </Card>
    );
  }

  const handleArchiveToggle = async () => {
    setActionLoading(true);
    const targetState = !repair.archived;
    try {
      await setArchived(targetState);
      toast.success(targetState ? 'Record archived' : 'Record restored');
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const markImageBroken = (photoId) => {
    setBrokenImages((prev) => new Set([...prev, photoId]));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-brand-muted hover:text-brand-navy"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>

        <Button
          variant={repair.archived ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className={
            repair.archived ? 'text-brand-navy' : 'text-brand-error hover:bg-red-50'
          }
        >
          {repair.archived ? (
            <>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Restore Record
            </>
          ) : (
            <>
              <Archive className="w-4 h-4 mr-1.5" /> Archive Record
            </>
          )}
        </Button>
      </div>

      {/* Primary Card */}
      <Card className="p-6 sm:p-7 space-y-6">
        {/* Header / ID & Status */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-brand-navy tracking-tight">
                {repair.repair_id}
              </span>
              {repair.archived && <Badge variant="warning">Archived</Badge>}
              <Badge variant="neutral">
                Source: {repair.source === 'admin' ? 'Walk-in' : 'Customer'}
              </Badge>
            </div>
            <p className="text-xs text-brand-muted flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Registered: {formatISTDateTime(repair.received_at)}
            </p>
          </div>

          <a
            href={`tel:+91${repair.mobile}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-navy text-white text-sm font-bold shadow-sm hover:bg-[#071D33] active:bg-[#051424] transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>Call Customer</span>
          </a>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-brand-bg-secondary/50 border border-brand-border/40">
            <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-1">
              Customer Name
            </span>
            <span className="text-base font-bold text-brand-navy">
              {repair.customer_name}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-brand-bg-secondary/50 border border-brand-border/40">
            <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-1">
              Mobile Number
            </span>
            <span className="text-base font-bold text-brand-navy font-mono">
              {formatMobileDisplay(repair.mobile)}
            </span>
          </div>
        </div>

        {/* Repair Problems */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-brand-muted uppercase tracking-wider">
            Problems Identified
          </h2>
          <div className="flex flex-wrap gap-2">
            {(repair.repair_problems || []).map((code) => {
              const isOther = code === 'other';
              return (
                <span
                  key={code}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold bg-brand-bg-secondary text-brand-navy border border-brand-sky/40"
                >
                  {PROBLEM_LABEL_MAP[code] || code}
                  {isOther && repair.other_problem_text && (
                    <span className="ml-1 text-brand-muted font-normal">
                      : &quot;{repair.other_problem_text}&quot;
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* Additional Details */}
        {repair.additional_details && (
          <div className="space-y-1.5 pt-2">
            <h2 className="text-xs font-bold text-brand-muted uppercase tracking-wider">
              Additional Notes
            </h2>
            <p className="text-sm text-brand-navy bg-gray-50 p-3.5 rounded-xl border border-brand-border/40 whitespace-pre-wrap">
              {repair.additional_details}
            </p>
          </div>
        )}

        {/* Bicycle Photos */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-brand-muted uppercase tracking-wider">
            Bicycle Photos
          </h2>

          {!repair.photos || repair.photos.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-brand-border text-sm text-brand-muted">
              No photos added for this repair.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {repair.photos.map((photo, idx) => {
                const isExpiredOrBroken = photo.expired || brokenImages.has(photo.id);

                if (isExpiredOrBroken) {
                  return (
                    <div
                      key={photo.id}
                      className="aspect-square rounded-xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center p-3 text-center text-amber-800"
                    >
                      <ImageOff className="w-6 h-6 mb-1 text-amber-600" />
                      <span className="text-xs font-bold">Photo Expired</span>
                      <span className="text-[10px] text-amber-700 mt-0.5">
                        Cleaned up by 30-day retention
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={photo.id}
                    onClick={() => setActivePhoto(photo.url)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-brand-border group cursor-pointer shadow-sm bg-gray-100"
                  >
                    <img
                      src={photo.url}
                      alt={`Bicycle photo ${idx + 1} of ${repair.photos.length}`}
                      loading="lazy"
                      onError={() => markImageBroken(photo.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-brand-navy/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-6 h-6 drop-shadow" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Photo Enlarged Modal */}
      <PhotoViewerModal
        isOpen={Boolean(activePhoto)}
        onClose={() => setActivePhoto(null)}
        photoUrl={activePhoto}
        altText={`Bicycle photo for ${repair.repair_id}`}
      />

      {/* Archive / Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleArchiveToggle}
        title={
          repair.archived ? 'Restore this repair record?' : 'Archive this repair record?'
        }
        message={
          repair.archived
            ? 'This record will be moved back to the active records list.'
            : 'Archive this record? Nothing is deleted. It can be accessed anytime from the Archive.'
        }
        confirmText={repair.archived ? 'Restore' : 'Archive'}
        confirmVariant={repair.archived ? 'primary' : 'danger'}
        loading={actionLoading}
      />
    </div>
  );
}
