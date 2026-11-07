import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { HelpCircle } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <CustomerLayout>
      <Card className="text-center p-8 space-y-4">
        <div className="w-14 h-14 rounded-full bg-brand-bg-secondary text-brand-navy flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-brand-navy">Page Not Found</h2>
        <p className="text-sm text-brand-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button variant="primary" onClick={() => navigate('/register')}>
          Back to Registration
        </Button>
      </Card>
    </CustomerLayout>
  );
}
