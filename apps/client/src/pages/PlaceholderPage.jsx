import Card from '../components/ui/Card.jsx';

export default function PlaceholderPage({ title, description }) {
  return (
    <Card className="max-w-lg text-center">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
    </Card>
  );
}
