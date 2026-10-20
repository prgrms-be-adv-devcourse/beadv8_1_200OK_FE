import { Badge } from '@mantine/core'
import { FileText } from 'lucide-react'
import { Link } from 'react-router'
import { type TermsItem, TermsType } from '@/shared/api/types'
import { termsTypeLabels } from '@/shared/lib/labels'
import { NotConnected, PageHeader, QueryState } from '@/shared/ui'
import classes from './TermsView.module.css'

// 약관 보기 /terms/:type. 시안: b2c/Terms, TermsMobile
// 데스크톱: 왼쪽 약관 목록 | 오른쪽 본문. 모바일: 목록 → 본문. 제목·버전·필수·본문은 GET /wallets/me/terms 응답.
// 시행일은 API에 없어 두지 않는다. ‘동의 받는 때’는 정책(회원가입·첫 충전) 기준 표.
// TODO(api): 📝 공개 약관 조회 API가 없다(GET /wallets/me/terms는 로그인 필요). 비회원은 status 'loginRequired'로 본문 대신 로그인 안내.

export type TermsViewProps = {
  /** loginRequired: 비회원. 공개 약관 API가 없어 본문 대신 로그인 안내 */
  status: 'pending' | 'error' | 'success' | 'loginRequired'
  terms: TermsItem[]
  /** loginRequired일 때 로그인 버튼 경로 (returnTo 포함) */
  loginTo?: string
  selectedType: TermsType
  onRetry?: () => void
  onBack?: () => void
  errorMessage?: string
}

const agreedWhen: Record<TermsType, string> = {
  [TermsType.ELECTRONIC_FINANCIAL_TRANSACTION]: '첫 충전',
  [TermsType.PREPAID_PAYMENT_INSTRUMENT]: '첫 충전',
  [TermsType.PERSONAL_INFORMATION_COLLECTION]: '회원가입 · 첫 충전',
}

export function TermsView({
  status,
  terms,
  selectedType,
  loginTo = '/login',
  onRetry,
  onBack,
  errorMessage,
}: TermsViewProps) {
  const selected = terms.find((item) => item.type === selectedType)
  // 응답 전·실패해도 목록은 보이게 표시명 표로 채운다
  const list = Object.values(TermsType).map((type) => {
    const item = terms.find((t) => t.type === type)
    return { type, title: item?.title ?? termsTypeLabels[type], item }
  })

  return (
    <div className={classes.root}>
      <PageHeader title="약관 보기" onBack={onBack} />
      <p className={classes.lead}>
        팔도곳간을 쓰면서 동의하는 약관이에요. 회원가입과 첫 충전 때 동의를 받아요.
      </p>

      <div className={classes.body}>
        <nav aria-label="약관 목록" className={classes.list}>
          {list.map(({ type, title, item: full }) => {
            return (
              <Link
                key={type}
                to={`/terms/${type}`}
                className={classes.item}
                aria-current={type === selectedType ? 'page' : undefined}
                replace
              >
                {full?.required && (
                  <Badge color="primary" variant="light">
                    필수
                  </Badge>
                )}
                <span className={classes.itemTitle}>{title}</span>
                <span className={`pd-num ${classes.help}`}>
                  {agreedWhen[type]} 때 동의{full ? ` · v${full.version}` : ''}
                </span>
              </Link>
            )
          })}
        </nav>

        <article className={classes.article} aria-labelledby="terms-title">
          {status === 'loginRequired' ? (
            <NotConnected
              title="로그인하면 약관을 볼 수 있어요"
              description="비회원이 볼 수 있는 약관 조회는 아직 연결되지 않았어요."
              api="📝 공개 약관 조회 (GET /wallets/me/terms는 로그인 필요)"
              action={{ label: '로그인', to: loginTo }}
            />
          ) : (
            <QueryState
              status={status === 'success' && !selected ? 'notFound' : status}
              loadingLabel="약관을 불러오고 있어요"
              errorMessage={errorMessage}
              onRetry={onRetry}
              notFound={{
                icon: <FileText />,
                title: '찾는 약관이 없어요',
                description: '왼쪽 목록에서 약관을 골라 주세요.',
                action: undefined,
                layout: 'stack',
              }}
            >
              {selected && (
                <>
                  <div className={classes.titleRow}>
                    {selected.required && (
                      <Badge color="primary" variant="light">
                        필수
                      </Badge>
                    )}
                    <h2 id="terms-title" className={classes.title}>
                      {selected.title}
                    </h2>
                  </div>
                  <dl className={classes.facts}>
                    <div>
                      <dt>버전</dt>
                      <dd className="pd-num">v{selected.version}</dd>
                    </div>
                    <div>
                      <dt>동의 받는 때</dt>
                      <dd>{agreedWhen[selected.type]}</dd>
                    </div>
                  </dl>
                  <div className={classes.content}>{selected.content}</div>
                </>
              )}
            </QueryState>
          )}
        </article>
      </div>
    </div>
  )
}
