import { HttpResponse, http } from 'msw'
import type { MemberInfo, MemberInfoUpdateRequest } from '@/shared/api/types'

// 내 정보 기본 응답. PUT은 보낸 이름·닉네임에 아이디·이메일을 붙여 돌려준다. 404·422는 테스트에서 덮는다.

export const memberInfo: MemberInfo = {
  loginId: 'tester01',
  email: 'tester01@example.com',
  name: '김철수',
  nickname: '풀떼기먹자',
}

export const membersHandlers = [
  http.get('*/api/v1/members/me', () => HttpResponse.json(memberInfo)),
  http.put('*/api/v1/members/me', async ({ request }) => {
    const { name, nickname } = (await request.json()) as MemberInfoUpdateRequest
    return HttpResponse.json({ ...memberInfo, name, nickname })
  }),
]
