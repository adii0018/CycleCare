import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { ConfirmCard } from '../../components/common/ConfirmCard';
import { BrandHeader } from '../../components/common/BrandHeader';
import { SESSION_STORAGE_KEY } from '../../lib/constants';

export function ConfirmationPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      navigate('/register', { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed.repair_id) {
        navigate('/register', { replace: true });
        return;
      }
      setData(parsed);
    } catch {
      navigate('/register', { replace: true });
    }
  }, [navigate]);

  const handleReset = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    navigate('/register', { replace: true });
  };

  if (!data) return null;

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <BrandHeader subtitle="" />
        <ConfirmCard
          repairId={data.repair_id}
          customerName={data.customer_name}
          receivedAt={data.received_at}
          onReset={handleReset}
        />
      </div>
    </CustomerLayout>
  );
}
