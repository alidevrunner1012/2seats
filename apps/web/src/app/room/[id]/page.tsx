import { TheatreShell } from '@/features/room/theatre-shell';

export default async function TheatrePage({ params }: { params: Promise<{ id: string }> }): Promise<JSX.Element> {
  const { id } = await params;
  return <TheatreShell roomId={id} />;
}
