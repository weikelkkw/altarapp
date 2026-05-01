import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GroupRootPage({ params }: Props) {
  const { id } = await params;
  redirect(`/bible/groups/${id}/pulse`);
}
