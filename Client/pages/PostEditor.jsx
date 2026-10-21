import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Dropdown from '../component/Dropdown'
import RichTextEditor from '../component/RichTextEditor'
import TagInput from '../component/TagInput'
import AiSuggestions from '../component/AiSuggestions'
import { createPost, getPost, updatePost } from '../services/postService'
import { uploadImage } from '../services/uploadService'
import { stripHtml } from '../utils/richText'
import { MAX_TAGS, addTag } from '../utils/tags'

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  category: '',
  tags: [],
  coverImage: '',
  content: '',
  status: 'draft',
}

function CoverPreview({ src }) {
  const [failed, setFailed] = useState(false)

  if (!src) return null

  if (failed) {
    return (
      <p className="editor-help cover-preview-error">
        Could not load that image. Check that the URL points directly to an image.
      </p>
    )
  }

  return (
    <div className="cover-preview">
      <img
        src={src}
        alt="Cover preview"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

function PostEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(slug)
  const [form, setForm] = useState(emptyForm)
  const [postId, setPostId] = useState(null)
  const [status, setStatus] = useState(isEditing ? 'loading' : 'ready')
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverUploadError, setCoverUploadError] = useState('')
  const coverFileRef = useRef(null)

  useEffect(() => {
    if (!isEditing) {
      setForm(emptyForm)
      setPostId(null)
      setStatus('ready')
      setLoadError('')
      return undefined
    }

    let active = true
    const controller = new AbortController()

    setStatus('loading')
    setLoadError('')

    getPost(slug, controller.signal)
      .then((payload) => {
        if (!active) return

        const post = payload.post

        setPostId(post.id)
        setForm({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          category: post.category || '',
          tags: Array.isArray(post.tags) ? post.tags : [],
          coverImage: post.coverImage || '',
          content: post.content || '',
          status: post.status || 'draft',
        })
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError' || !active) return

        setLoadError(
          error.status === 404
            ? 'That post could not be found.'
            : error.message || 'Could not load this post.',
        )
        setStatus('error')
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [isEditing, slug])

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setMessage('')
    setErrors((current) => {
      if (!current[name]) return current

      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setField(name, value)
  }

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    setUploadingCover(true)
    setCoverUploadError('')

    try {
      const payload = await uploadImage(file)
      setField('coverImage', payload.url)
    } catch (error) {
      setCoverUploadError(error.message || 'Could not upload that image.')
    } finally {
      setUploadingCover(false)
      event.target.value = ''
    }
  }

  const applySuggestedTags = (tags) => {
    setForm((current) => {
      let next = current.tags

      for (const tag of tags) {
        next = addTag(next, tag)

        if (next.length >= MAX_TAGS) break
      }

      return { ...current, tags: next }
    })
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    const title = form.title.trim()
    const excerpt = form.excerpt.trim()

    if (title.length < 3) {
      nextErrors.title = 'Title must be at least 3 characters.'
    } else if (title.length > 160) {
      nextErrors.title = 'Title must be 160 characters or fewer.'
    }

    if (excerpt.length > 300) {
      nextErrors.excerpt = 'Excerpt must be 300 characters or fewer.'
    }

    if (form.status === 'published' && !stripHtml(form.content)) {
      nextErrors.content = 'Content is required before publishing.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const payload = {
      title,
      excerpt,
      category: form.category.trim() || 'General',
      tags: form.tags,
      coverImage: form.coverImage.trim(),
      content: form.content,
      status: form.status,
    }

    if (form.slug.trim()) {
      payload.slug = form.slug.trim()
    }

    setSubmitting(true)
    setMessage('')

    try {
      if (isEditing) {
        await updatePost(postId, payload)
      } else {
        await createPost(payload)
      }

      navigate('/dashboard')
    } catch (error) {
      if (error.errors && typeof error.errors === 'object') {
        setErrors(error.errors)
      }

      setMessage(error.message || 'Could not save this post.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="dashboard-header">
        <div>
          <span className="section-kicker">Author dashboard</span>
          <h1>{isEditing ? 'Edit post' : 'New post'}</h1>
          <p>
            {isEditing
              ? 'Update the draft or refresh the published version.'
              : 'Save a draft first or publish straight to the home feed.'}
          </p>
        </div>
        <Link className="btn ghost" to="/dashboard">
          Back to dashboard
        </Link>
      </header>

      {status === 'loading' ? (
        <p className="feed-status" role="status">
          Loading post...
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="dashboard-gate">
          <p>{loadError}</p>
          <Link className="btn primary" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      ) : null}

      {status === 'ready' ? (
        <form className="editor-form" onSubmit={handleSubmit} noValidate>
          <div className="editor-grid">
            <div className="editor-field">
              <label htmlFor="post-title">Title</label>
              <input
                id="post-title"
                name="title"
                type="text"
                maxLength={160}
                placeholder="A clear, specific headline"
                value={form.title}
                onChange={updateField}
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title ? <p className="field-error">{errors.title}</p> : null}
            </div>

            <div className="editor-field">
              <label htmlFor="post-slug">
                Slug <span>Optional</span>
              </label>
              <input
                id="post-slug"
                name="slug"
                type="text"
                placeholder="generated-from-the-title"
                value={form.slug}
                onChange={updateField}
                aria-invalid={Boolean(errors.slug)}
              />
              <p className="editor-help">Leave blank to generate it from the title.</p>
              {errors.slug ? <p className="field-error">{errors.slug}</p> : null}
            </div>
          </div>

          <div className="editor-grid">
            <div className="editor-field">
              <label htmlFor="post-category">Category</label>
              <input
                id="post-category"
                name="category"
                type="text"
                maxLength={60}
                placeholder="Kubernetes"
                value={form.category}
                onChange={updateField}
                aria-invalid={Boolean(errors.category)}
              />
              {errors.category ? <p className="field-error">{errors.category}</p> : null}
            </div>

            <div className="editor-field">
              <label>Status</label>
              <Dropdown
                value={form.status}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
                onChange={(value) => setField('status', value)}
                ariaLabel="Post status"
                invalid={Boolean(errors.status)}
              />
              {errors.status ? <p className="field-error">{errors.status}</p> : null}
            </div>
          </div>

          <div className="editor-field">
            <label htmlFor="post-excerpt">Excerpt</label>
            <textarea
              id="post-excerpt"
              name="excerpt"
              rows={3}
              maxLength={300}
              placeholder="One or two sentences for the article card."
              value={form.excerpt}
              onChange={updateField}
              aria-invalid={Boolean(errors.excerpt)}
            />
            <div className="editor-help-row">
              <span>Shown on the home feed and search results.</span>
              <span>{form.excerpt.length}/300</span>
            </div>
            {errors.excerpt ? <p className="field-error">{errors.excerpt}</p> : null}
          </div>

          <TagInput
            value={form.tags}
            onChange={(tags) => setField('tags', tags)}
            error={errors.tags}
          />

          <div className="editor-field">
            <label htmlFor="post-cover">
              Cover image <span>Optional</span>
            </label>
            <input
              id="post-cover"
              name="coverImage"
              type="url"
              maxLength={2048}
              placeholder="https://images.example.com/cover.jpg"
              value={form.coverImage}
              onChange={updateField}
              aria-invalid={Boolean(errors.coverImage)}
            />
            <div className="cover-upload-row">
              <button
                className="btn ghost compact"
                type="button"
                onClick={() => coverFileRef.current?.click()}
                disabled={uploadingCover}
              >
                {uploadingCover ? 'Uploading...' : 'Upload cover'}
              </button>
              <span>JPG, PNG, WebP, or GIF up to 5 MB.</span>
            </div>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="visually-hidden"
              onChange={handleCoverUpload}
              tabIndex={-1}
            />
            <p className="editor-help">
              Paste a direct image URL or upload a file. Leave it blank to use the generated
              gradient cover.
            </p>
            {errors.coverImage ? (
              <p className="field-error">{errors.coverImage}</p>
            ) : null}
            {coverUploadError ? <p className="field-error">{coverUploadError}</p> : null}
            {!errors.coverImage && form.coverImage.trim() ? (
              <CoverPreview key={form.coverImage.trim()} src={form.coverImage.trim()} />
            ) : null}
          </div>

          <RichTextEditor
            value={form.content}
            onChange={(value) => setField('content', value)}
            invalid={Boolean(errors.content)}
          />
          {errors.content ? <p className="field-error">{errors.content}</p> : null}

          <AiSuggestions
            draft={{
              title: form.title,
              excerpt: form.excerpt,
              content: form.content,
              category: form.category,
              tags: form.tags,
            }}
            onApplyTitle={(title) => setField('title', title)}
            onApplyExcerpt={(excerpt) => setField('excerpt', excerpt.slice(0, 300))}
            onApplyTags={applySuggestedTags}
          />

          {message ? (
            <p className="form-message" role="status">
              {message}
            </p>
          ) : null}

          <div className="editor-actions">
            <Link className="btn ghost" to="/dashboard">
              Cancel
            </Link>
            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : form.status === 'published'
                  ? isEditing
                    ? 'Update post'
                    : 'Publish post'
                  : 'Save draft'}
            </button>
          </div>
        </form>
      ) : null}
    </>
  )
}

export default PostEditor
