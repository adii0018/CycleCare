import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HelpCircle } from 'lucide-react';

export function AdminNotFoundPage() {
  const navigate = useNavigate();

  return (
    <Card className="max-w-md mx-auto text-center p-8 space-y-4">
      <div className="w-14 h-14 rounded-full bg-brand-bg-secondary text-brand-navy flex items-center justify-center mx-auto">
        <HelpCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-brand-navy">Admin Page Not Found</h2>
      <p className="text-sm text-brand-muted">
        The admin route you requested does not exist.
      </p>
      <Button variant="primary" onClick={() => navigate('/admin')}>
        Back to Dashboard Overview
      </Button>
    </Card>
  );
}
