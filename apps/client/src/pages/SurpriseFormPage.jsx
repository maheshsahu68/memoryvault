import { zodResolver } from '@hookform/resolvers/zod';
import { surpriseCreateSchema, surpriseUpdateSchema } from '@memoryvault/shared/surpriseSchemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { createSurprise, getSurprise, updateSurprise } from '../services/surpriseService.js';

const eventTypes = ['birthday', 'anniversary', 'wedding', 'graduation', 'holiday', 'other'];
const statuses = ['draft', 'scheduled', 'published', 'expired'];
const defaults = { eventType: 'birthday', recipient: { name: '', nickname: '' }, greeting: { title: '', subtitle: '', letter: '' }, secretCode: '', schedule: { status: 'draft' } };

export default function SurpriseFormPage({ mode }) {
  const isEdit = mode === 'edit';
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({ resolver: zodResolver(isEdit ? surpriseUpdateSchema : surpriseCreateSchema), defaultValues: defaults });
  const surpriseQuery = useQuery({ queryKey: ['surprise', id], queryFn: () => getSurprise(id), enabled: isEdit });
  const mutation = useMutation({
    mutationFn: (values) => isEdit ? updateSurprise(id, values) : createSurprise(values),
    onSuccess: (surprise) => {
      queryClient.invalidateQueries({ queryKey: ['surprises'] });
      queryClient.setQueryData(['surprise', surprise.id], surprise);
      toast.success(isEdit ? 'Surprise updated.' : 'Surprise created.');
      navigate(`/dashboard/surprises/${surprise.id}`);
    },
    onError: (error) => toast.error(error.response?.data?.error?.message || 'Unable to save the surprise.'),
  });

  useEffect(() => {
    if (surpriseQuery.data) {
      const surprise = surpriseQuery.data;
      form.reset({ eventType: surprise.eventType, recipient: surprise.recipient, greeting: surprise.greeting, secretCode: '', schedule: { status: surprise.schedule.status } });
    }
  }, [form, surpriseQuery.data]);

  function onSubmit(values) {
    if (isEdit && !values.secretCode) delete values.secretCode;
    mutation.mutate(values);
  }

  if (isEdit && surpriseQuery.isLoading) return <main className="grid min-h-[50vh] place-items-center"><Spinner /></main>;
  if (isEdit && surpriseQuery.isError) return <Card><p>Unable to load this surprise.</p><Button className="mt-4" onClick={() => surpriseQuery.refetch()}>Try again</Button></Card>;

  const error = (name) => form.formState.errors[name]?.message;
  return (
    <Card className="max-w-2xl">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit surprise' : 'Create surprise'}</h1>
      <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <label className="text-sm font-medium">Event type
          <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" {...form.register('eventType')}>
            {eventTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Recipient name<Input className="mt-1" {...form.register('recipient.name')} />{error('recipient') && <span className="text-xs text-rose-600">{error('recipient')}</span>}</label>
        <label className="text-sm font-medium">Nickname (optional)<Input className="mt-1" {...form.register('recipient.nickname')} /></label>
        <label className="text-sm font-medium">Title<Input className="mt-1" {...form.register('greeting.title')} />{error('greeting') && <span className="text-xs text-rose-600">{error('greeting')}</span>}</label>
        <label className="text-sm font-medium">Subtitle (optional)<Input className="mt-1" {...form.register('greeting.subtitle')} /></label>
        <label className="text-sm font-medium">Letter (optional)<textarea className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2" {...form.register('greeting.letter')} /></label>
        <label className="text-sm font-medium">{isEdit ? 'New secret code (leave blank to keep current)' : 'Secret code'}<Input className="mt-1" type="password" {...form.register('secretCode')} />{error('secretCode') && <span className="text-xs text-rose-600">{error('secretCode')}</span>}</label>
        <label className="text-sm font-medium">Status
          <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" {...form.register('schedule.status')}>
            {statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
          </select>
        </label>
        <div className="flex gap-3"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save surprise'}</Button><Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button></div>
      </form>
    </Card>
  );
}
