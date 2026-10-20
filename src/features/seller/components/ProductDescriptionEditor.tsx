import { Input, Menu } from '@mantine/core'
import { getUploadImageExtension, RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap'
import '@mantine/tiptap/styles.css'
import TipTapImage from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { ALargeSmall, Highlighter } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { MAX_IMAGE_MB } from '@/shared/lib/constants'
import { richContentClassName } from '@/shared/ui'
import { DESCRIPTION_IMAGE_TYPES, isUploadedProductImage } from '../productSchema'
import classes from './ProductDescriptionEditor.module.css'

// 상품 상세설명 에디터 (@mantine/tiptap = Tiptap v3, 2026-10-20 결정).
// 서버(OWASP 정제)가 남기는 것만 툴바에 둔다: 제목 2·3, 굵게·기울임·밑줄·취소선, 글자 크기·색·배경색, 정렬,
// 목록, 인용, 구분선, 표, 링크(href만, 새 창 열기는 지워져서 뺌), 이미지. 글꼴·코드·동영상·이미지 흐르기는 없다.
// 이미지는 우리 업로드(POST /media/PRODUCT) 주소만 남는다 → 고른·붙여넣은·끌어 온 이미지를 모두 onImageUpload로 올린다.
// 크기 조절한 이미지 너비는 width 속성이 아니라 style로 저장한다(서버가 width 속성을 지움).
// 값은 HTML 문자열. 비어 있으면 ''를 넘긴다. 올리는 중에는 onUploadingChange(true)로 저장을 막게 한다.

/** 본문에 넣을 수 있는 색(저장되는 실제 값이라 토큰 변수가 아니라 색 값을 쓴다) */
const TEXT_COLORS = ['#1F2A1C', '#5B6B57', '#C0392B', '#D9822B', '#2E7D32', '#1565C0', '#6A1B9A']
const BACKGROUND_COLORS = ['#FFF3BF', '#FFE3E3', '#E6FCF5', '#E7F5FF', '#F3F0FF']
const FONT_SIZES = [
  { label: '작게', value: '14px' },
  { label: '기본', value: null },
  { label: '크게', value: '20px' },
  { label: '아주 크게', value: '24px' },
] as const

const LABELS = {
  boldControlLabel: '굵게',
  italicControlLabel: '기울임',
  underlineControlLabel: '밑줄',
  strikeControlLabel: '취소선',
  clearFormattingControlLabel: '서식 지우기',
  linkControlLabel: '링크',
  unlinkControlLabel: '링크 지우기',
  bulletListControlLabel: '글머리 목록',
  orderedListControlLabel: '번호 목록',
  h2ControlLabel: '제목',
  h3ControlLabel: '소제목',
  blockquoteControlLabel: '인용',
  alignLeftControlLabel: '왼쪽 정렬',
  alignCenterControlLabel: '가운데 정렬',
  alignRightControlLabel: '오른쪽 정렬',
  hrControlLabel: '구분선',
  undoControlLabel: '실행 취소',
  redoControlLabel: '다시 실행',
  colorPickerControlLabel: '글자색',
  unsetColorControlLabel: '글자색 지우기',
  colorControlLabel: (color: string) => `글자색 ${color}`,
  colorPickerColorLabel: (color: string) => `색 ${color}`,
  colorPickerCancel: '취소',
  colorPickerClear: '색 지우기',
  colorPickerColorPicker: '색 고르기',
  colorPickerPalette: '색 목록',
  colorPickerSave: '저장',
  linkEditorInputLabel: '링크 주소',
  linkEditorInputPlaceholder: 'https://example.com',
  linkEditorExternalLink: '새 창에서 열기',
  linkEditorInternalLink: '같은 창에서 열기',
  linkEditorSave: '저장',
  imageUploadControlLabel: '사진 넣기',
  tableInsertControlLabel: '표 넣기',
  tableInsertLabel: (columns: number, rows: number) => `${columns}×${rows} 표`,
  tableDeleteControlLabel: '표 지우기',
  tableRowAfterControlLabel: '아래에 줄 더하기',
  tableColumnAfterControlLabel: '오른쪽에 칸 더하기',
  tableRowDeleteControlLabel: '줄 지우기',
  tableColumnDeleteControlLabel: '칸 지우기',
}

// 너비는 style(width:Npx)로 저장·읽기. 높이는 저장하지 않고 비율대로(height:auto)
const ProductImage = TipTapImage.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {}
    return {
      ...parent,
      width: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          Number.parseInt(element.style.width || element.getAttribute('width') || '', 10) || null,
        renderHTML: (attributes: { width?: number | null }) =>
          attributes.width ? { style: `width: ${Math.round(attributes.width)}px` } : {},
      },
      height: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
    }
  },
})

// 서버가 target을 지우므로 저장하지 않는다(‘새 창에서 열기’ 단추도 숨김)
const ProductLink = Link.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {}
    return { ...parent, target: { default: null, parseHTML: () => null, renderHTML: () => ({}) } }
  },
})

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
  const pending = useRef(0)
  const callbacks = useRef({ onChange, onBlur, onImageUpload, onUploadingChange })
  callbacks.current = { onChange, onBlur, onImageUpload, onUploadingChange }

  const upload = async (file: File): Promise<string> => {
    const problem = checkImage(file)
    if (problem) throw new Error(problem)
    pending.current += 1
    callbacks.current.onUploadingChange?.(true)
    setImageError(null)
    try {
      return await callbacks.current.onImageUpload(file)
    } finally {
      pending.current -= 1
      if (pending.current === 0) callbacks.current.onUploadingChange?.(false)
    }
  }
  const uploadError = (_file: File, failure: unknown) => setImageError(errorText(failure))

  const describedBy = [description && descriptionId, (error || imageError) && errorId]
    .filter(Boolean)
    .join(' ')

  const editor = useEditor({
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: false,
      }),
      ProductLink.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'nofollow' },
      }),
      TextStyleKit.configure({ fontFamily: false, lineHeight: false }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      TableKit.configure({ table: { resizable: false } }),
      getUploadImageExtension(
        ProductImage.configure({
          inline: false,
          allowBase64: false,
          resize: { enabled: true, minWidth: 80, alwaysPreserveAspectRatio: true },
        }),
        {
          onImageUpload: upload,
          onImageUploadError: uploadError,
          // 붙여넣거나 끌어 온 이미지도 우리 버킷 주소가 아니면 내려받아 다시 올린다(외부 주소는 서버가 지움)
          shouldUploadPastedImage: (src: string) => !isUploadedProductImage(src),
        },
      ),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(error ? { 'aria-invalid': 'true' } : {}),
      },
    },
    onUpdate: ({ editor: current }) => {
      callbacks.current.onChange(current.isEmpty ? '' : current.getHTML())
    },
    onBlur: () => callbacks.current.onBlur?.(),
  })

  // 밖에서 값이 바뀌면(최신 내용 불러오기 등) 다시 채운다. 내가 낸 값이면 그대로 둔다
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (value !== current) editor.commands.setContent(value || '', { emitUpdate: false })
  }, [editor, value])

  // aria 속성(오류·설명)은 바뀔 때 다시 붙인다
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setOptions({
      editorProps: {
        attributes: {
          id,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-labelledby': labelId,
          ...(describedBy ? { 'aria-describedby': describedBy } : {}),
          ...(error ? { 'aria-invalid': 'true' } : {}),
        },
      },
    })
  }, [editor, id, labelId, describedBy, error])

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
      <RichTextEditor
        editor={editor}
        labels={LABELS}
        withTypographyStyles={false}
        onImageUpload={upload}
        onImageUploadError={uploadError}
        classNames={{ root: classes.root, toolbar: classes.toolbar, content: classes.content }}
        data-invalid={shownError ? true : undefined}
        styles={{ linkEditorExternalControl: { display: 'none' } }}
      >
        {/* 툴바 묶음은 4개까지(44px × 4): 좁은 화면에서 묶음 단위로 줄바꿈된다 */}
        <RichTextEditor.Toolbar sticky stickyOffset="var(--pd-header-height)">
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Strikethrough />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <FontSizeControl />
            <RichTextEditor.ColorPicker colors={TEXT_COLORS} />
            <BackgroundColorControl />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.AlignLeft />
            <RichTextEditor.AlignCenter />
            <RichTextEditor.AlignRight />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <RichTextEditor.Blockquote />
            <RichTextEditor.Hr />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
            <RichTextEditor.ImageUpload accept={DESCRIPTION_IMAGE_TYPES.join(',')} />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.TableInsert />
            <RichTextEditor.TableRowAfter />
            <RichTextEditor.TableColumnAfter />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.TableRowDelete />
            <RichTextEditor.TableColumnDelete />
            <RichTextEditor.TableDelete />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content className={richContentClassName} />
      </RichTextEditor>
    </Input.Wrapper>
  )
}

function FontSizeControl() {
  const { editor } = useRichTextEditorContext()
  return (
    <Menu withinPortal position="bottom-start">
      <Menu.Target>
        <RichTextEditor.Control aria-label="글자 크기" title="글자 크기">
          <ALargeSmall aria-hidden="true" size={16} />
        </RichTextEditor.Control>
      </Menu.Target>
      <Menu.Dropdown>
        {FONT_SIZES.map((size) => (
          <Menu.Item
            key={size.label}
            onClick={() =>
              size.value
                ? editor?.chain().focus().setFontSize(size.value).run()
                : editor?.chain().focus().unsetFontSize().run()
            }
          >
            {size.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}

function BackgroundColorControl() {
  const { editor } = useRichTextEditorContext()
  return (
    <Menu withinPortal position="bottom-start">
      <Menu.Target>
        <RichTextEditor.Control aria-label="배경색" title="배경색">
          <Highlighter aria-hidden="true" size={16} />
        </RichTextEditor.Control>
      </Menu.Target>
      <Menu.Dropdown>
        {BACKGROUND_COLORS.map((color) => (
          <Menu.Item
            key={color}
            leftSection={<span className={classes.swatch} style={{ background: color }} />}
            onClick={() => editor?.chain().focus().setBackgroundColor(color).run()}
          >
            {`배경색 ${color}`}
          </Menu.Item>
        ))}
        <Menu.Item onClick={() => editor?.chain().focus().unsetBackgroundColor().run()}>
          배경색 지우기
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
