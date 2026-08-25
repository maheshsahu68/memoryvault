import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '@memoryvault/shared/authSchemas';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { resetPassword } from '../services/authService.js';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', passwordConfirm: '' } });

  async function onSubmit(values) {
    try {
      await resetPassword(token, values);
      toast.success('Password reset successfully. Please sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Unable to reset your password.');
    }
  }

  const passwordField = (name, label) => (
    <label className="block text-sm font-medium text-slate-700" key={name}>
      {label}
      <Input type="password" autoComplete="new-password" className="mt-1" {...form.register(name)} />
      {form.formState.errors[name] && <span className="mt-1 block text-xs text-rose-600">{form.formState.errors[name].message}</span>}
    </label>
  );

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {passwordField('password', 'New password')}
        {passwordField('passwordConfirm', 'Confirm new password')}
        <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Please wait…' : 'Reset password'}
        </Button>
      </form>
    </Card>
  );
}
