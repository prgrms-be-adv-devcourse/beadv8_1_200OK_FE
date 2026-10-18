import { Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core'
import { useRef, useState } from 'react'
import type { TermsAgreeRequest, TermsItem } from '@/shared/api/types'
import classes from './TermsAgreementModal.module.css'

// 첫 충전 전 약관 동의. 동의하지 않은 필수 약관만 보여 주고, 모두 체크해야 ‘동의하고 충전하기’가 켜진다.
// 동의 요청은 받은 type·version을 그대로 보낸다(bruno README ‘충전 전 약관’).
// ‘보기’는 새 탭 대신 동의 창 위에 약관 창을 겹쳐 연다(Modal.Stack: 맨 위 창만 포커스를 가두고 Esc로 닫힌다).
// 본문은 이미 받은 약관 조회 응답이고, 닫으면 포커스를 누른 ‘보기’ 버튼으로 돌려놓는다. 동의 체크·충전 금액은 그대로다.
// 새 탭은 메모리 토큰이 없어 비회원 화면(샘플 본문)이 열려서 쓰지 않는다.

export type TermsAgreementModalProps = {
  opened: boolean
  terms: TermsItem[]
  onClose: () => void
  onAgree: (agreements: TermsAgreeRequest['agreements']) => void
  submitting?: boolean
}

type AgreementFormProps = Omit<TermsAgreementModalProps, 'opened'> & {
  onView: (item: TermsItem, trigger: HTMLElement) => void
}

function AgreementForm({ terms, onClose, onAgree, submitting, onView }: AgreementFormProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const all = terms.length > 0 && terms.every((item) => checked.has(item.type))

  const toggle = (type: string, on: boolean) => {
    const next = new Set(checked)
    if (on) next.add(type)
    else next.delete(type)
    setChecked(next)
  }

  return (
    <Stack gap="md">
      <Text c="var(--pd-color-text-secondary)">
        예치금은 선불전자지급수단이라 처음 한 번만 동의를 받아요.
      </Text>
      <div className={classes.box}>
        <Checkbox
          className={classes.all}
          label="전체 동의"
          checked={all}
          indeterminate={checked.size > 0 && !all}
          onChange={(event) =>
            setChecked(event.currentTarget.checked ? new Set(terms.map((t) => t.type)) : new Set())
          }
        />
        {terms.map((item) => (
          <div key={item.type} className={classes.row}>
            <Checkbox
              label={`${item.required ? '[필수]' : '[선택]'} ${item.title}`}
              checked={checked.has(item.type)}
              onChange={(event) => toggle(item.type, event.currentTarget.checked)}
            />
            <Button
              variant="subtle"
              size="sm"
              className={classes.view}
              aria-haspopup="dialog"
              aria-label={`${item.title} 보기`}
              onClick={(event) => onView(item, event.currentTarget)}
            >
              보기
            </Button>
          </div>
        ))}
      </div>
      <Group justify="flex-end" gap="xs">
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          disabled={!all}
          loading={submitting}
          onClick={() => onAgree(terms.map(({ type, version }) => ({ type, version })))}
        >
          동의하고 충전하기
        </Button>
      </Group>
      {!all && (
        <Text size="sm" ta="end" c="var(--pd-color-text-muted)">
          모든 필수 약관에 동의해야 충전할 수 있어요
        </Text>
      )}
    </Stack>
  )
}

export function TermsAgreementModal({ opened, ...props }: TermsAgreementModalProps) {
  const [viewing, setViewing] = useState<TermsItem | null>(null)
  // 아래 동의 창의 포커스 가두기가 다시 켜지며 첫 체크박스로 포커스를 옮기므로,
  // Mantine의 포커스 되돌리기 대신 닫힘이 끝난 뒤 누른 ‘보기’ 버튼으로 직접 돌려놓는다
  const trigger = useRef<HTMLElement | null>(null)

  return (
    <Modal.Stack>
      <Modal
        stackId="terms-agreement"
        opened={opened}
        onClose={() => {
          setViewing(null)
          props.onClose()
        }}
        title="첫 충전 전에 약관에 동의해 주세요"
      >
        {opened && (
          <AgreementForm
            {...props}
            onView={(item, button) => {
              trigger.current = button
              setViewing(item)
            }}
          />
        )}
      </Modal>
      <Modal
        stackId="terms-content"
        opened={opened && viewing !== null}
        onClose={() => setViewing(null)}
        returnFocus={false}
        onExitTransitionEnd={() => trigger.current?.focus()}
        title={viewing?.title}
      >
        {viewing && (
          <Stack gap="md">
            <Text size="sm" c="var(--pd-color-text-muted)" className="pd-num">
              {viewing.required ? '필수' : '선택'} · v{viewing.version}
            </Text>
            {/* 긴 본문은 모달째 스크롤한다(안쪽 스크롤 칸을 두지 않아 키보드로도 그대로 내려간다) */}
            <div className={classes.content}>{viewing.content}</div>
            <Group justify="flex-end">
              <Button onClick={() => setViewing(null)}>확인했어요</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Modal.Stack>
  )
}
