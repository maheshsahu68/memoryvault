import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@memoryvault/shared/authSchemas';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import { forgotPassword } from '../services/authService.js';

export default function ForgotPasswordPage() {
  const form = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  async function onSubmit(values) {
    try {
      await forgotPassword(values);
      toast.success('If an account exists, a reset link has been sent.');
      form.reset();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Unable to request a reset link.');
    }
  }

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-2 text-sm text-slate-600">Enter your email and we’ll send a password reset link if an account exists.</p>
      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <Input type="email" autoComplete="email" className="mt-1" {...form.register('email')} />
          {form.formState.errors.email && <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.email.message}</span>}
        </label>
        <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Please wait…' : 'Send reset link'}
        </Button>
      </form>
      <Link className="mt-5 block text-center text-sm font-semibold text-violet-700" to="/login">Back to sign in</Link>
    </Card>
  );
}
