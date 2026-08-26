import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { deleteSurprise, duplicateSurprise, listSurprises } from '../services/surpriseService.js';

export default function SurpriseListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ page: 1, limit: 6, search: '', status: '', eventType: '' });
  const [searchText, setSearchText] = useState('');
  const query = useQuery({ queryKey: ['surprises', filters], queryFn: () => listSurprises(filters), placeholderData: (previous) => previous });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['surprises'] });
  const duplicate = useMutation({ mutationFn: duplicateSurprise, onSuccess: () => { toast.success('Surprise duplicated.'); refresh(); }, onError: () => toast.error('Unable to duplicate surprise.') });
  const remove = useMutation({ mutationFn: deleteSurprise, onSuccess: () => { toast.success('Surprise deleted.'); refresh(); }, onError: () => toast.error('Unable to delete surprise.') });
  const updateFilter = (values) => setFilters((current) => ({ ...current, ...values, page: 1 }));

  function confirmDelete(id) {
    if (window.confirm('Delete this surprise? This can be restored only from a future feature.')) remove.mutate(id);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Your surprises</h1><p className="mt-1 text-slate-600">Create and manage surprise metadata.</p></div><Button onClick={() => navigate('/dashboard/create')}>Create surprise</Button></div>
      <Card className="mt-6">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); updateFilter({ search: searchText }); }}>
          <Input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search title or recipient" />
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={filters.status} onChange={(event) => updateFilter({ status: event.target.value })}><option value="">All statuses</option>{['draft', 'scheduled', 'published', 'expired'].map((status) => <option key={status}>{status}</option>)}</select>
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={filters.eventType} onChange={(event) => updateFilter({ eventType: event.target.value })}><option value="">All event types</option>{['birthday', 'anniversary', 'wedding', 'graduation', 'holiday', 'other'].map((type) => <option key={type}>{type}</option>)}</select>
          <Button type="submit">Search</Button>
        </form>
      </Card>
      {query.isLoading ? <div className="mt-8 grid place-items-center"><Spinner /></div> : query.isError ? <Card className="mt-6"><p>Unable to load surprises.</p><Button className="mt-4" onClick={() => query.refetch()}>Try again</Button></Card> : <>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {query.data.surprises.map((surprise) => <Card key={surprise.id} className="flex flex-col"><p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{surprise.eventType} · {surprise.schedule.status}</p><h2 className="mt-2 text-lg font-bold">{surprise.greeting.title}</h2><p className="mt-1 text-sm text-slate-600">For {surprise.recipient.name}</p><div className="mt-5 flex flex-wrap gap-2"><Link className="text-sm font-semibold text-violet-700" to={`/dashboard/surprises/${surprise.id}`}>View</Link><Link className="text-sm font-semibold text-violet-700" to={`/dashboard/surprises/${surprise.id}/edit`}>Edit</Link><button className="text-sm font-semibold text-violet-700" onClick={() => duplicate.mutate(surprise.id)}>Duplicate</button><button className="text-sm font-semibold text-rose-700" onClick={() => confirmDelete(surprise.id)}>Delete</button></div></Card>)}
        </div>
        {!query.data.surprises.length && <Card className="mt-6 text-center text-slate-600">No surprises match these filters.</Card>}
        <div className="mt-6 flex items-center justify-between"><span className="text-sm text-slate-600">Page {query.data.meta.page} of {Math.max(query.data.meta.totalPages, 1)} · {query.data.meta.total} total</span><div className="flex gap-2"><Button variant="secondary" disabled={filters.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))}>Previous</Button><Button variant="secondary" disabled={filters.page >= query.data.meta.totalPages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))}>Next</Button></div></div>
      </>}
    </div>
  );
}
