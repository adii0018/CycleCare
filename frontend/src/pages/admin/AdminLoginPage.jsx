import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { CustomerLayout } from '../../components/layout/CustomerLayout';
import { BrandHeader } from '../../components/common/BrandHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Label, FieldError } from '../../components/ui/Input';
import { adminLoginSchema, normalizeMobileInput } from '../../lib/validators';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { status, login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { mobile: '', password: '' },
    mode: 'onBlur',
  });

  // If already logged in, redirect to /admin
  if (status === 'authenticated') {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = async (data) => {
    setLoginError(null);
    setSubmitting(true);
    try {
      await login(data.mobile, data.password);
      toast.success('Welcome back, Admin!');
      navigate('/admin', { replace: true });
    } catch (err) {
      setLoginError(err.message || 'Invalid mobile number or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <BrandHeader subtitle="Garage Owner & Administrator Portal" />

        <Card className="p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Mobile Number */}
            <div>
              <Label htmlFor="admin-mobile" required>
                Mobile Number
              </Label>
              <Input
                id="admin-mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                prefixText="+91"
                placeholder="9876543210"
                error={errors.mobile?.message}
                {...register('mobile', {
                  onChange: (e) => {
                    setValue('mobile', normalizeMobileInput(e.target.value), {
                      shouldValidate: false,
                    });
                  },
                })}
              />
              <FieldError error={errors.mobile?.message} id="admin-mobile-error" />
            </div>

            {/* Password with Show/Hide Toggle */}
            <div>
              <Label htmlFor="admin-password" required>
                Password
              </Label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`w-full min-h-[48px] px-4 pr-12 text-base bg-white text-brand-navy rounded-xl border transition-colors duration-150 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-ring focus:border-brand-navy ${
                    errors.password
                      ? 'border-brand-error focus:ring-red-400'
                      : 'border-brand-border'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-muted hover:text-brand-navy focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <FieldError error={errors.password?.message} id="admin-password-error" />
            </div>

            {/* General Login Error */}
            {loginError && (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-brand-error/30 rounded-xl text-brand-error text-sm font-medium"
              >
                {loginError}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md"
              loading={submitting}
              disabled={submitting}
            >
              Sign In to Admin
            </Button>
          </form>
        </Card>
      </div>
    </CustomerLayout>
  );
}
