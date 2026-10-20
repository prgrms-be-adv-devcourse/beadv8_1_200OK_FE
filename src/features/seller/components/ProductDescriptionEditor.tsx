import { Input } from '@mantine/core'
import { useEffect, useId, useRef, useState } from 'react'
import suneditor from 'suneditor'
import 'suneditor/css/editor'
import ko from 'suneditor/langs/ko'
import {
  align,
  backgroundColor,
  blockquote,
  blockStyle,
  fontColor,
  fontSize,
  hr,
  image,
  link,
  list_bulleted,
  list_numbered,
  table,
} from 'suneditor/plugins'
import { MAX_IMAGE_MB } from '@/shared/lib/constants'
import { richContentClassName } from '@/shared/ui'
import { DESCRIPTION_IMAGE_TYPES, isUploadedProductImage } from '../productSchema'
import classes from './ProductDescriptionEditor.module.css'

// 상품 상세설명 에디터 (SunEditor v3, 2026-10-20 결정).
// 서버(OWASP 정제)가 남기는 것만 툴바에 둔다: 제목 2·3, 굵게·기울임·밑줄·취소선, 글자 크기·색·배경색, 정렬,
// 목록, 인용, 구분선, 표, 링크(href만, 새 창 열기는 지워져서 뺌), 이미지. 글꼴·코드·동영상은 없다.
// 이미지는 우리 업로드(POST /media/PRODUCT) 주소만 남는다 → 고른·붙여넣은·끌어 온 파일을 모두 onImageUpload로 올리고,
// 붙여넣은 HTML 속 다른 곳의 이미지는 뺀다(서버가 지워 저장한 모양과 달라지므로).
// 값은 HTML 문자열. 비어 있으면 ''를 넘긴다. 올리는 중에는 onUploadingChange(true)로 저장을 막게 한다.

/** 본문에 넣을 수 있는 색(저장되는 실제 값이라 토큰 변수가 아니라 색 값을 쓴다) */
const TEXT_COLORS = ['#1F2A1C', '#5B6B57', '#C0392B', '#D9822B', '#2E7D32', '#1565C0', '#6A1B9A']
const BACKGROUND_COLORS = ['#FFF3BF', '#FFE3E3', '#E6FCF5', '#E7F5FF', '#F3F0FF']
const FONT_SIZES = [14, 16, 20, 24]

const BUTTON_LIST = [
  ['undo', 'redo'],
  ['blockStyle'],
  ['bold', 'italic', 'underline', 'strike'],
  ['fontSize', 'fontColor', 'backgroundColor', 'removeFormat'],
  ['align', 'list_bulleted', 'list_numbered', 'blockquote', 'hr'],
  ['link', 'image', 'table'],
]

type Editor = ReturnType<typeof suneditor.create>

export type ProductDescriptionEditorProps = {
  /** 오류 요약에서 focus할 수 있게 편집 영역에 붙는 id */
  id: string
  label: string
  description?: string
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  error?: string
  placeholder?: string
  /** 사진 파일 → 업로드한 서버 주소. 실패하면 throw (ApiError면 detail을 보여 준다) */
  onImageUpload: (file: File) => Promise<string>
  onUploadingChange?: (uploading: boolean) => void
}

function checkImage(file: File): string | null {
  if (!DESCRIPTION_IMAGE_TYPES.includes(file.type)) return 'jpg·png 사진만 넣을 수 있어요'
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `사진은 ${MAX_IMAGE_MB}MB 이하로 넣어 주세요`
  return null
}

const errorText = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : '사진을 올리지 못했어요. 다시 넣어 주세요'

/** 고정 헤더 높이(px, 토큰은 rem). 툴바를 그 아래에 붙인다 */
function headerHeight() {
  const root = getComputedStyle(document.documentElement)
  const rem = Number.parseFloat(root.getPropertyValue('--pd-header-height')) || 0
  return rem * (Number.parseFloat(root.fontSize) || 16)
}

/** 붙여넣거나 끌어 온 HTML에서 우리 업로드 주소가 아닌 이미지를 뺀다. 뺀 게 있으면 removed: true */
function dropForeignImages(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const foreign = [...doc.body.querySelectorAll('img')].filter(
    (img) => !isUploadedProductImage(img.getAttribute('src') ?? ''),
  )
  for (const img of foreign) (img.closest('figure') ?? img).remove()
  return { html: doc.body.innerHTML, removed: foreign.length > 0 }
}

export default function ProductDescriptionEditor({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  onImageUpload,
  onUploadingChange,
}: ProductDescriptionEditorProps) {
  const labelId = useId()
  const descriptionId = useId()
  const errorId = useId()
  const [imageError, setImageError] = useState<string | null>(null)
  const targetRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<Editor | null>(null)
  /** 에디터가 마지막으로 낸 값. 밖에서 다른 값이 오면 다시 채운다 */
  const emitted = useRef(value)
  const pending = useRef(0)
  const callbacks = useRef({ onChange, onBlur, onImageUpload, onUploadingChange })
  callbacks.current = { onChange, onBlur, onImageUpload, onUploadingChange }
  const initial = useRef({ value, placeholder })

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const upload = async (file: File): Promise<string> => {
      pending.current += 1
      callbacks.current.onUploadingChange?.(true)
      try {
        return await callbacks.current.onImageUpload(file)
      } finally {
        pending.current -= 1
        if (pending.current === 0) callbacks.current.onUploadingChange?.(false)
      }
    }

    const emit = (editor: Editor) => {
      const html = editor.isEmpty() ? '' : (editor.$.html.get() as string)
      emitted.current = html
      callbacks.current.onChange(html)
    }

    const cleanPasted = ({ data }: { data: string }) => {
      const cleaned = dropForeignImages(data)
      if (!cleaned.removed) return undefined
      setImageError('다른 곳에서 가져온 사진은 빠졌어요. 사진 넣기로 다시 올려 주세요')
      return cleaned.html
    }

    const editor = suneditor.create(target, {
      plugins: [
        align,
        backgroundColor,
        blockquote,
        blockStyle,
        fontColor,
        fontSize,
        hr,
        image,
        link,
        list_bulleted,
        list_numbered,
        table,
      ],
      buttonList: BUTTON_LIST,
      lang: ko,
      width: '100%',
      minHeight: '15rem',
      placeholder: initial.current.placeholder ?? '',
      statusbar: false,
      toolbar_sticky: { top: headerHeight() },
      editableFrameAttributes: { spellcheck: 'false' },
      blockStyle: { items: ['p', 'h2', 'h3'] },
      align: { items: ['left', 'center', 'right'] },
      fontColor: { items: TEXT_COLORS, disableHEXInput: true },
      backgroundColor: { items: BACKGROUND_COLORS, disableHEXInput: true },
      fontSize: {
        sizeUnit: 'px',
        showIncDecControls: false,
        disableInput: true,
        unitMap: { px: { default: 16, inc: 1, min: 14, max: 24, list: FONT_SIZES } },
      },
      link: { openNewWindow: false, defaultRel: { default: 'nofollow' } },
      image: {
        createUrlInput: false,
        acceptedFormats: DESCRIPTION_IMAGE_TYPES.join(','),
        showHeightInput: false,
        useFormatType: false,
        allowMultiple: true,
      },
      table: { scrollType: 'x' },
      events: {
        onChange: () => emit(editor),
        onBlur: () => callbacks.current.onBlur?.(),
        onPaste: cleanPasted,
        onDrop: cleanPasted,
        // 파일은 SunEditor 업로드 대신 우리 업로드로 올리고, 받은 주소로 넣는다
        onImageUploadBefore: async ({ info }: { info: ImageUploadInfo }) => {
          const files = [...(info.files as unknown as File[])]
          const problem = files.map(checkImage).find(Boolean)
          if (problem) {
            setImageError(problem)
            return false
          }
          setImageError(null)
          try {
            const uploaded = await Promise.all(
              files.map(async (file) => ({ file, url: await upload(file) })),
            )
            const service = (editor.$.plugins.image as ImagePlugin).uploadService
            for (const { file, url } of uploaded) {
              service.urlUpload({ ...info, url, files: { name: file.name, size: file.size } })
            }
          } catch (failure) {
            setImageError(errorText(failure))
          }
          return undefined
        },
      } as never,
    })

    // 본문 모양은 구매자 상세와 같은 RichContent 스타일로
    if (richContentClassName) {
      editor.$.frameContext.get('wysiwyg').classList.add(richContentClassName)
    }
    const initialHtml = initial.current.value
    if (initialHtml) editor.$.html.set(initialHtml)
    emitted.current = initialHtml
    editorRef.current = editor
    return () => {
      editorRef.current = null
      editor.destroy()
    }
  }, [])

  // 밖에서 값이 바뀌면(최신 내용 불러오기 등) 다시 채운다. 내가 낸 값이면 그대로 둔다
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || value === emitted.current) return
    emitted.current = value
    editor.$.html.set(value || '')
  }, [value])

  const describedBy = [description && descriptionId, (error || imageError) && errorId]
    .filter(Boolean)
    .join(' ')

  // 편집 영역(contenteditable)에 id·이름·설명·오류를 붙인다
  useEffect(() => {
    const wysiwyg = editorRef.current?.$.frameContext.get('wysiwyg')
    if (!wysiwyg) return
    wysiwyg.id = id
    wysiwyg.setAttribute('role', 'textbox')
    wysiwyg.setAttribute('aria-multiline', 'true')
    wysiwyg.setAttribute('aria-labelledby', labelId)
    if (describedBy) wysiwyg.setAttribute('aria-describedby', describedBy)
    else wysiwyg.removeAttribute('aria-describedby')
    if (error) wysiwyg.setAttribute('aria-invalid', 'true')
    else wysiwyg.removeAttribute('aria-invalid')
  }, [id, labelId, describedBy, error])

  const shownError = error ?? imageError ?? undefined

  return (
    <Input.Wrapper
      label={label}
      labelElement="div"
      labelProps={{ id: labelId }}
      description={description}
      descriptionProps={{ id: descriptionId }}
      error={shownError}
      errorProps={{ id: errorId }}
      inputWrapperOrder={['label', 'description', 'input', 'error']}
    >
      <div className={classes.root} data-invalid={shownError ? true : undefined}>
        <textarea ref={targetRef} hidden />
      </div>
    </Input.Wrapper>
  )
}

type ImageUploadInfo = Record<string, unknown> & { files: FileList }
type ImagePlugin = { uploadService: { urlUpload: (info: Record<string, unknown>) => void } }
