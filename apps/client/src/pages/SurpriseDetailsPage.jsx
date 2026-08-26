import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { deleteSurprise, duplicateSurprise, getSurprise } from '../services/surpriseService.js';

export default function SurpriseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['surprise', id], queryFn: () => getSurprise(id) });
  const duplicate = useMutation({ mutationFn: duplicateSurprise, onSuccess: (surprise) => { queryClient.invalidateQueries({ queryKey: ['surprises'] }); toast.success('Surprise duplicated.'); navigate(`/dashboard/surprises/${surprise.id}`); } });
  const remove = useMutation({ mutationFn: deleteSurprise, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['surprises'] }); toast.success('Surprise deleted.'); navigate('/dashboard'); } });
  if (query.isLoading) return <main className="grid min-h-[50vh] place-items-center"><Spinner /></main>;
  if (query.isError) return <Card><p>Unable to load this surprise.</p><Button className="mt-4" onClick={() => query.refetch()}>Try again</Button></Card>;
  const surprise = query.data;
  return <Card className="max-w-2xl"><p className="text-sm font-semibold uppercase text-violet-700">{surprise.eventType} · {surprise.schedule.status}</p><h1 className="mt-2 text-3xl font-bold">{surprise.greeting.title}</h1><p className="mt-4 text-slate-600">For {surprise.recipient.name}{surprise.recipient.nickname ? ` (${surprise.recipient.nickname})` : ''}</p>{surprise.greeting.subtitle && <p className="mt-2 text-slate-600">{surprise.greeting.subtitle}</p>}{surprise.greeting.letter && <p className="mt-6 whitespace-pre-wrap text-slate-700">{surprise.greeting.letter}</p>}<div className="mt-8 flex flex-wrap gap-3"><Link className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white" to={`/dashboard/surprises/${id}/edit`}>Edit</Link><Button variant="secondary" onClick={() => duplicate.mutate(id)}>Duplicate</Button><Button variant="secondary" onClick={() => { if (window.confirm('Delete this surprise?')) remove.mutate(id); }}>Delete</Button><Link className="px-4 py-2 text-sm font-semibold text-violet-700" to="/dashboard">Back to list</Link></div></Card>;
}
