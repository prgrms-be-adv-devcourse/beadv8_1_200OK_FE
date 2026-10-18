import { useState } from 'react'
import { useParams } from 'react-router'
import type { PhotoItem } from '@/shared/ui'
import { inquiries, inquiryTargets } from '../fixtures'
import type { InquiryDone } from '../views/SupportView'
import { SupportView } from '../views/SupportView'

// 고객센터 문의 라우트 /orders/:orderId/inquiry. 1단계: 사진은 브라우저 미리보기로만, 보내면 접수 완료를 보여 준다.
// TODO(api): 📝 문의 접수·내역, 사진은 미디어 업로드(용도 미정)

let photoSeq = 0

export function SupportPage() {
  const { orderId } = useParams()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [done, setDone] = useState<InquiryDone | null>(null)

  return (
    <SupportView
      orderId={Number(orderId)}
      targets={inquiryTargets}
      inquiries={inquiries}
      photos={photos}
      onAddPhotos={(files) =>
        setPhotos((current) => [
          ...current,
          ...files.map((file) => {
            photoSeq += 1
            return { id: `p${photoSeq}`, url: URL.createObjectURL(file) }
          }),
        ])
      }
      onRemovePhoto={(id) => setPhotos((current) => current.filter((p) => p.id !== id))}
      onSubmit={(values) => {
        const target = inquiryTargets.find((t) => t.orderItemId === values.orderItemId)
        setDone({
          inquiryNumber: 'CS-20261018-0051',
          productName: target?.productName ?? '',
          type: values.type,
          photoCount: photos.length,
        })
      }}
      completed={done}
      onWriteAnother={() => {
        setDone(null)
        setPhotos([])
      }}
      replyEmail="seoyeon88@example.com"
    />
  )
}
