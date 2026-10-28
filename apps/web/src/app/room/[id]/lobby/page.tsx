import { Lobby } from '@/features/room/lobby';

export default async function LobbyPage({ params }: { params: Promise<{ id: string }> }): Promise<JSX.Element> {
  const { id } = await params;
  return <Lobby roomId={id} />;
}
