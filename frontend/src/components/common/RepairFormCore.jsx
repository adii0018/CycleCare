import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Label, FieldError, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProblemSelector } from './ProblemSelector';
import { ImageUploader } from './ImageUploader';
import { useImagePicker } from '../../hooks/useImagePicker';
import { generateIdempotencyKey } from '../../lib/idempotency';
import {
  baseRepairFormSchema,
  customerRegistrationSchema,
  normalizeMobileInput,
} from '../../lib/validators';
import { buildRepairFormData } from '../../services/repairsApi';
import { WARMUP_THRESHOLD_MS } from '../../lib/constants';

export function RepairFormCore({
  isManual = false,
  onSubmitRepair,
  submitButtonText = 'Submit Registration',
}) {
  const [submitting, setSubmitting] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [formError, setFormError] = useState(null);

  // Idempotency key generated once per form load, preserved on retries
  const idempotencyKeyRef = useRef(generateIdempotencyKey());

  const {
    photos,
    files,
    compressing,
    error: imageError,
    addPhotos,
    removePhoto,
    clearPhotos,
  } = useImagePicker();

  const schema = isManual ? baseRepairFormSchema : customerRegistrationSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_name: '',
      mobile: '',
      repair_problems: [],
      other_problem_text: '',
      additional_details: '',
      idempotency_key: idempotencyKeyRef.current,
      ...(isManual ? {} : { website: '' }),
    },
    mode: 'onBlur',
  });

  const selectedProblems = watch('repair_problems') || [];
  const hasOther = selectedProblems.includes('other');

  const onFormSubmit = async (data) => {
    setFormError(null);
    setSubmitting(true);
    setIsWakingUp(false);

    // If server takes longer than WARMUP_THRESHOLD_MS (~6s), show waking up prompt
    const warmupTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, WARMUP_THRESHOLD_MS);

    try {
      const formData = buildRepairFormData(
        {
          ...data,
          idempotency_key: idempotencyKeyRef.current,
        },
        files
      );

      const result = await onSubmitRepair(formData);
      clearTimeout(warmupTimer);

      // On complete success, regenerate idempotency key and clear photos
      idempotencyKeyRef.current = generateIdempotencyKey();
      clearPhotos();
      reset({
        customer_name: '',
        mobile: '',
        repair_problems: [],
        other_problem_text: '',
        additional_details: '',
        idempotency_key: idempotencyKeyRef.current,
        ...(isManual ? {} : { website: '' }),
      });

      return result;
    } catch (err) {
      clearTimeout(warmupTimer);
      setIsWakingUp(false);

      if (err.fields && typeof err.fields === 'object') {
        Object.entries(err.fields).forEach(([fieldName, messages]) => {
          setError(fieldName, {
            type: 'server',
            message: Array.isArray(messages) ? messages[0] : String(messages),
          });
        });
      }

      setFormError(err.message || 'Submission failed. Please check your inputs and try again.');
    } finally {
      clearTimeout(warmupTimer);
      setSubmitting(false);
      setIsWakingUp(false);
    }
  };

  return (
    <Card className="p-5 sm:p-7 shadow-sm">
      <form onSubmit={handleSubmit(onFormSubmit)} noValidate className="space-y-5">
        {/* Honeypot field (customer only, hidden from assistive tech and humans) */}
        {!isManual && (
          <div
            style={{
              position: 'absolute',
              left: '-9999px',
              opacity: 0,
              pointerEvents: 'none',
              height: 0,
              width: 0,
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >
            <label htmlFor="website-field">Leave this empty</label>
            <input
              id="website-field"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              {...register('website')}
            />
          </div>
        )}

        {/* Customer Name */}
        <div>
          <Label htmlFor="customer_name" required>
            Customer Name
          </Label>
          <Input
            id="customer_name"
            placeholder="e.g. Ramesh Kumar"
            autoComplete="name"
            error={errors.customer_name?.message}
            {...register('customer_name')}
          />
          <FieldError error={errors.customer_name?.message} id="customer_name-error" />
        </div>

        {/* Mobile Number */}
        <div>
          <Label htmlFor="mobile" required>
            Mobile Number
          </Label>
          <Input
            id="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
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
          <FieldError error={errors.mobile?.message} id="mobile-error" />
        </div>

        {/* Repair Problems Selection */}
        <div>
          <Label required>Repair Problems</Label>
          <Controller
            name="repair_problems"
            control={control}
            render={({ field }) => (
              <ProblemSelector
                selected={field.value}
                onChange={field.onChange}
                error={errors.repair_problems?.message}
              />
            )}
          />
        </div>

        {/* Conditional Other Problem Text */}
        {hasOther && (
          <div className="animate-fade-in">
            <Label htmlFor="other_problem_text" required>
              Describe Other Problem
            </Label>
            <Input
              id="other_problem_text"
              placeholder="e.g. Broken handlebar, loose bell"
              maxLength={200}
              error={errors.other_problem_text?.message}
              {...register('other_problem_text')}
            />
            <FieldError
              error={errors.other_problem_text?.message}
              id="other_problem_text-error"
            />
          </div>
        )}

        {/* Bicycle Photos Upload */}
        <div>
          <Label>Bicycle Photos (Optional)</Label>
          <ImageUploader
            photos={photos}
            compressing={compressing}
            error={imageError}
            onAddPhotos={addPhotos}
            onRemovePhoto={removePhoto}
          />
        </div>

        {/* Additional Details */}
        <div>
          <Label htmlFor="additional_details">Additional Details (Optional)</Label>
          <Textarea
            id="additional_details"
            placeholder="Any specific instructions or repair history..."
            maxLength={500}
            error={errors.additional_details?.message}
            {...register('additional_details')}
          />
          <FieldError
            error={errors.additional_details?.message}
            id="additional_details-error"
          />
        </div>

        {/* Privacy Note (Customer Only) */}
        {!isManual && (
          <p className="text-xs text-brand-muted bg-brand-bg-secondary p-3 rounded-xl border border-brand-sky/30">
            We store your name, mobile number and bicycle photos to manage your repair.
            Photos are automatically deleted after 30 days.
          </p>
        )}

        {/* Waking Up Free Server Alert */}
        {isWakingUp && (
          <div
            role="status"
            className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium animate-pulse"
          >
            Waking up the server, please wait a moment...
          </div>
        )}

        {/* General Form Error Alert */}
        {formError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-brand-error/30 rounded-xl text-brand-error text-sm font-medium"
          >
            {formError}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full font-bold shadow-md"
          loading={submitting}
          disabled={submitting || compressing}
        >
          {submitButtonText}
        </Button>
      </form>
    </Card>
  );
}
