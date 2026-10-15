import EventDetailPage from './EventClient';

export function generateStaticParams() {
  return [
    { id: 'event-1' },
    { id: 'event-2' },
    { id: 'demo' },
  ];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailPage id={id} />;
}
