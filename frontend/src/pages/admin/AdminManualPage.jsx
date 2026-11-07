import { useNavigate } from 'react-router-dom';
import { RepairFormCore } from '../../components/common/RepairFormCore';
import { submitManualRepair } from '../../services/adminRepairsApi';
import { playSuccessChime } from '../../lib/sound';
import { toast } from 'sonner';

export function AdminManualPage() {
  const navigate = useNavigate();

  const handleManualSubmit = async (formData) => {
    try {
      const response = await submitManualRepair(formData);
      playSuccessChime();
      toast.success(`Walk-in recorded: ${response.repair_id}`);
      navigate(`/admin/repairs/${response.repair_id}`);
      return response;
    } catch (err) {
      toast.error(err.message || 'Failed to record manual repair.');
      throw err;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
          New Walk-in Registration
        </h1>
        <p className="text-sm text-brand-muted">
          Record a bicycle repair brought directly to the garage.
        </p>
      </div>

      <RepairFormCore
        isManual={true}
        onSubmitRepair={handleManualSubmit}
        submitButtonText="Register Bicycle Walk-in"
      />
    </div>
  );
}
