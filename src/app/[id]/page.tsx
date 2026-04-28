import { MemoryDetailPage } from '@/components/dom/MemoryDetailPage'

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <MemoryDetailPage memoryId={id} />
}
