import { Anchor, Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import type { TermsAgreeRequest, TermsItem } from '@/shared/api/types'
import classes from './TermsAgreementModal.module.css'

// 첫 충전 전 약관 동의. 동의하지 않은 필수 약관만 보여 주고, 모두 체크해야 ‘동의하고 충전하기’가 켜진다.
// 동의 요청은 받은 type·version을 그대로 보낸다(bruno README ‘충전 전 약관’).

export type TermsAgreementModalProps = {
  opened: boolean
  terms: TermsItem[]
  onClose: () => void
  onAgree: (agreements: TermsAgreeRequest['agreements']) => void
  submitting?: boolean
}

function AgreementForm({
  terms,
  onClose,
  onAgree,
  submitting,
}: Omit<TermsAgreementModalProps, 'opened'>) {
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
            <Anchor
              href={`/terms/${item.type}`}
              target="_blank"
              rel="noreferrer"
              size="sm"
              aria-label={`${item.title} 보기 (새 창)`}
            >
              보기
            </Anchor>
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
  return (
    <Modal opened={opened} onClose={props.onClose} title="첫 충전 전에 약관에 동의해 주세요">
      {opened && <AgreementForm {...props} />}
    </Modal>
  )
}
