import { Alert, Anchor, Badge, Button, Code, Group, List, Stack, Text, Title } from '@mantine/core'
import * as Sentry from '@sentry/react'
import { useState } from 'react'

// /__design/sentry: 개발 서버에서만 열리는 Sentry 테스트 화면 (#36).
// 버튼마다 다른 경로로 이벤트를 보내, Sentry에서 어떻게 보이는지 확인한다.
// 개발 서버 이벤트는 environment=development로 올라가 운영 이슈와 섞이지 않는다.

const SENTRY_ISSUES_URL = 'https://personal-02k.sentry.io/issues/?environment=development'

type Sent = { at: string; label: string; eventId?: string; note?: string }

/** 렌더 중에 던진다. 라우트 ErrorBoundary(RootErrorBoundary)가 잡아 Sentry로 보낸다 */
function Thrower({ message }: { message: string }): never {
  throw new Error(message)
}

const stamp = () => new Date().toISOString()

// 테스트마다 함수 이름을 나눈다. Sentry는 스택(함수 이름)으로 이슈를 묶어서,
// 한 함수에서 던지면 메시지가 달라도 한 이슈로 합쳐진다
function throwUncaught() {
  setTimeout(function uncaughtInTimeout() {
    throw new Error(`Sentry test error uncaught ${stamp()}`)
  })
}

function rejectPromise() {
  void Promise.reject(new Error(`Sentry test error rejection ${stamp()}`))
}

function captureCaught() {
  try {
    throw new Error(`Sentry test error captured ${stamp()}`)
  } catch (error) {
    return Sentry.captureException(error)
  }
}

function sendMessage() {
  return Sentry.captureMessage(`Sentry test message ${stamp()}`, 'warning')
}

function sendLogs() {
  Sentry.logger.info('Sentry 테스트 로그', { at: stamp(), from: '/__design/sentry' })
  console.warn('Sentry 테스트 console.warn', stamp())
}

export function SentryLab() {
  const client = Sentry.getClient()
  const options = client?.getOptions()
  const enabled = Boolean(options?.dsn) && options?.enabled !== false

  const [renderError, setRenderError] = useState<string | null>(null)
  const [sent, setSent] = useState<Sent[]>([])
  const record = (item: Sent) => setSent((list) => [item, ...list])

  // 전역 핸들러가 보내는 오류는 비동기라서 잠깐 뒤에 마지막 이벤트 ID를 읽는다
  const recordLater = (label: string) =>
    setTimeout(() => record({ at: stamp(), label, eventId: Sentry.lastEventId() }), 300)

  const actions: { label: string; description: string; run: () => void }[] = [
    {
      label: '렌더 오류',
      description: '화면을 그리다 난 오류. 오류 화면으로 바뀌어요(뒤로 가기로 돌아와요)',
      run: () => setRenderError(`Sentry test error render ${stamp()}`),
    },
    {
      label: '처리 안 된 예외',
      description: '이벤트 핸들러 밖(setTimeout)에서 던진 오류',
      run: () => {
        throwUncaught()
        recordLater('처리 안 된 예외')
      },
    },
    {
      label: 'Promise 거부',
      description: 'catch하지 않은 Promise 거부',
      run: () => {
        rejectPromise()
        recordLater('Promise 거부')
      },
    },
    {
      label: '직접 보내기',
      description: 'try/catch로 잡은 오류를 captureException으로 보내기',
      run: () => record({ at: stamp(), label: '직접 보내기', eventId: captureCaught() }),
    },
    {
      label: '메시지',
      description: '오류가 아닌 알림을 이슈로 보내기(captureMessage)',
      run: () => record({ at: stamp(), label: '메시지', eventId: sendMessage() }),
    },
    {
      label: '로그',
      description: 'Sentry.logger와 console.warn. 이슈가 아니라 Logs 화면에 보여요',
      run: () => {
        sendLogs()
        record({ at: stamp(), label: '로그', note: 'Explore → Logs에서 확인' })
      },
    },
    {
      label: 'BFF 오류',
      description: 'BFF가 일부러 500을 내요. 브라우저 → BFF가 한 트레이스로 이어져요',
      run: async () => {
        const response = await fetch('/bff/dev/sentry-error')
        record({
          at: stamp(),
          label: 'BFF 오류',
          note: `HTTP ${response.status} · paldo-bff 프로젝트에서 확인`,
        })
      },
    },
  ]

  return (
    <Stack component="main" p="lg" maw={720} mx="auto" gap="lg">
      {renderError && <Thrower message={renderError} />}
      <Stack gap={4}>
        <Group gap="xs">
          <Title order={1} size="h3">
            Sentry 테스트
          </Title>
          <Badge variant="light" color="gray">
            개발 전용
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          버튼을 누르면 Sentry로 이벤트를 보내요. 30초 안에{' '}
          <Anchor href={SENTRY_ISSUES_URL} target="_blank" rel="noreferrer">
            Sentry 이슈 목록(development)
          </Anchor>
          에 올라와요.
        </Text>
      </Stack>

      {enabled ? (
        <Alert color="green" title="Sentry가 켜져 있어요">
          환경 <Code>{options?.environment}</Code> · 트레이스 샘플링{' '}
          <Code>{String(options?.tracesSampleRate)}</Code>
        </Alert>
      ) : (
        <Alert color="yellow" title="Sentry가 꺼져 있어요">
          <Code>.env.local</Code>에 <Code>VITE_SENTRY_DSN</Code>을 넣고 개발 서버를 다시 켜 주세요.
        </Alert>
      )}

      <List spacing="sm" listStyleType="none" p={0}>
        {actions.map((action) => (
          <List.Item key={action.label}>
            <Group wrap="nowrap" align="center">
              <Button size="md" miw={140} disabled={!enabled} onClick={() => action.run()}>
                {action.label}
              </Button>
              <Text size="sm">{action.description}</Text>
            </Group>
          </List.Item>
        ))}
      </List>

      <Stack gap="xs">
        <Title order={2} size="h5">
          보낸 것
        </Title>
        {sent.length === 0 ? (
          <Text size="sm" c="dimmed">
            아직 보낸 이벤트가 없어요.
          </Text>
        ) : (
          <List spacing={4} size="sm">
            {sent.map((item) => (
              <List.Item key={`${item.at}-${item.label}`}>
                {new Date(item.at).toLocaleTimeString('ko-KR')} · {item.label}
                {item.eventId && (
                  <>
                    {' '}
                    · 이벤트 <Code>{item.eventId.slice(0, 8)}</Code>
                  </>
                )}
                {item.note && <> · {item.note}</>}
              </List.Item>
            ))}
          </List>
        )}
      </Stack>
    </Stack>
  )
}
