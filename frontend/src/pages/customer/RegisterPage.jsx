import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { BrandHeader } from '../../components/common/BrandHeader';
import { RepairFormCore } from '../../components/common/RepairFormCore';
import { submitCustomerRepair } from '../../services/repairsApi';
import { SESSION_STORAGE_KEY } from '../../lib/constants';
import { toast } from 'sonner';

export function RegisterPage() {
  const navigate = useNavigate();

  const handleCustomerSubmit = async (formData) => {
    try {
      const response = await submitCustomerRepair(formData);
      // Store ONLY non-sensitive confirmation details
      const confirmationPayload = {
        repair_id: response.repair_id,
        customer_name: response.customer_name,
        received_at: response.received_at,
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(confirmationPayload));

      toast.success('Bicycle registered successfully!');
      navigate('/confirmation');
      return response;
    } catch (err) {
      toast.error(err.message || 'Could not register bicycle. Please try again.');
      throw err;
    }
  };

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <BrandHeader subtitle="Bicycle Repair & Service Registration" />
        <RepairFormCore
          isManual={false}
          onSubmitRepair={handleCustomerSubmit}
          submitButtonText="Submit Repair Request"
        />
      </div>
    </CustomerLayout>
  );
}
