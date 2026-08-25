import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, registerSchema } from '@memoryvault/shared/authSchemas';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import useAuth from '../hooks/useAuth.js';

const serverMessage = (error) => error.response?.data?.error?.message || 'Something went wrong. Please try again.';

export default function AuthFormPage({ mode }) {
  const isRegister = mode === 'register';
  const { login, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  async function onSubmit(values) {
    try {
      if (isRegister) await registerUser(values);
      else await login(values);
      toast.success(isRegister ? 'Account created.' : 'Welcome back.');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (error) {
      toast.error(serverMessage(error));
    }
  }

  const field = (name, label, type = 'text') => (
    <label className="block text-left text-sm font-medium text-slate-700" key={name}>
      {label}
      <Input type={type} autoComplete={name === 'password' ? (isRegister ? 'new-password' : 'current-password') : name} className="mt-1" {...form.register(name)} />
      {form.formState.errors[name] && <span className="mt-1 block text-xs text-rose-600">{form.formState.errors[name].message}</span>}
    </label>
  );

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-bold">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-2 text-sm text-slate-600">{isRegister ? 'Start preserving meaningful memories.' : 'Sign in to continue to MemoryVault.'}</p>
      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {isRegister && field('name', 'Name')}
        {field('email', 'Email', 'email')}
        {field('password', 'Password', 'password')}
        <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        {isRegister ? 'Already have an account?' : 'New to MemoryVault?'}{' '}
        <Link className="font-semibold text-violet-700 hover:text-violet-800" to={isRegister ? '/login' : '/register'}>
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </Card>
  );
}
