import { useEffect, useRef, useState } from 'react'
import { contentToHtml, wordCount } from '../utils/richText'
import { uploadImage } from '../services/uploadService'

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const TOOLBAR = [
  { command: 'bold', label: 'Bold', short: 'B' },
  { command: 'italic', label: 'Italic', short: 'I' },
  { command: 'underline', label: 'Underline', short: 'U' },
  { command: 'strikeThrough', label: 'Strikethrough', short: 'S' },
  { command: 'formatBlock', value: 'h2', label: 'Heading 2', short: 'H2' },
  { command: 'formatBlock', value: 'h3', label: 'Heading 3', short: 'H3' },
  { command: 'formatBlock', value: 'blockquote', label: 'Quote', short: 'Quote' },
  { command: 'insertUnorderedList', label: 'Bulleted list', short: 'List' },
  { command: 'insertOrderedList', label: 'Numbered list', short: '1. List' },
  { command: 'formatBlock', value: 'pre', label: 'Code block', short: '</>' },
]

function RichTextEditor({ id = 'post-content', value, onChange, invalid, label = 'Content' }) {
  const editorRef = useRef(null)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const editor = editorRef.current

    if (!editor) return

    const nextValue = contentToHtml(value)

    if (editor.innerHTML !== nextValue && document.activeElement !== editor) {
      editor.innerHTML = nextValue
    }
  }, [value])

  const emitChange = () => {
    const editor = editorRef.current

    if (editor) onChange(editor.innerHTML)
  }

  const runCommand = (command, commandValue) => {
    const editor = editorRef.current

    if (!editor) return

    editor.focus()
    document.execCommand(command, false, commandValue)
    emitChange()
  }

  const addLink = () => {
    const editor = editorRef.current

    if (!editor) return

    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() || ''
    const url = window.prompt('Paste a link URL (https://...)', 'https://')

    if (!url) return

    if (!/^https?:\/\//i.test(url)) {
      setError('Links must start with http:// or https://.')
      return
    }

    editor.focus()

    const safeUrl = escapeAttribute(url)

    if (!selectedText) {
      document.execCommand('insertHTML', false, `<a href="${safeUrl}">${safeUrl}</a>`)
    } else {
      document.execCommand('createLink', false, url)
    }

    setError('')
    emitChange()
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    emitChange()
  }

  const handleImage = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    setUploading(true)
    setError('')

    try {
      const payload = await uploadImage(file)
      const editor = editorRef.current

      if (editor) {
        editor.focus()
        document.execCommand(
          'insertHTML',
          false,
          `<img src="${escapeAttribute(payload.url)}" alt="${escapeAttribute(file.name)}">`,
        )
        emitChange()
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Could not upload that image.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const words = wordCount(value)

  return (
    <div className="editor-field rich-editor-field">
      <label htmlFor={id}>{label}</label>

      <div className={`rich-editor ${invalid ? 'has-error' : ''}`}>
        <div className="rich-toolbar" role="toolbar" aria-label="Text formatting">
          {TOOLBAR.map((item) => (
            <button
              className="rich-tool"
              type="button"
              key={`${item.command}-${item.value || ''}`}
              title={item.label}
              aria-label={item.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(item.command, item.value)}
            >
              {item.short}
            </button>
          ))}
          <span className="rich-tool-divider" aria-hidden="true" />
          <button
            className="rich-tool"
            type="button"
            title="Add link"
            aria-label="Add link"
            onMouseDown={(event) => event.preventDefault()}
            onClick={addLink}
          >
            Link
          </button>
          <button
            className="rich-tool"
            type="button"
            title="Upload an image"
            aria-label="Upload an image"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Image'}
          </button>
          <button
            className="rich-tool"
            type="button"
            title="Clear formatting"
            aria-label="Clear formatting"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand('removeFormat')}
          >
            Clear
          </button>
          <span className="rich-tool-divider" aria-hidden="true" />
          <button
            className="rich-tool"
            type="button"
            title="Undo"
            aria-label="Undo"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand('undo')}
          >
            Undo
          </button>
          <button
            className="rich-tool"
            type="button"
            title="Redo"
            aria-label="Redo"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand('redo')}
          >
            Redo
          </button>
        </div>

        <div
          id={id}
          ref={editorRef}
          className="rich-editor-surface"
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-invalid={Boolean(invalid)}
          data-placeholder="Write the article. Use the toolbar for headings, lists, links, and images."
          onInput={emitChange}
          onPaste={handlePaste}
          onBlur={emitChange}
          suppressContentEditableWarning
        />

        <div className="rich-editor-footer">
          <span>{words} {words === 1 ? 'word' : 'words'}</span>
          <span>Paste as plain text. Images are uploaded to CloudCraft.</span>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="visually-hidden"
        onChange={handleImage}
        tabIndex={-1}
      />

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}

export default RichTextEditor
