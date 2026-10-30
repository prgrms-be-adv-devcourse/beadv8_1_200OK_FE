import { QueryState } from '@/shared/ui'

/** 없는 주소 (PublicLayout 안에서 그린다) */
export function NotFoundPage() {
  return <QueryState status="notFound" />
}
