import { useEffect, useId, useRef, useState } from 'react'

function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  compact = false,
  invalid = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const menuId = useId()
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : options[0]

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return

      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    optionRefs.current[Math.max(0, selectedIndex)]?.focus()
  }, [open, selectedIndex])

  const choose = (nextValue) => {
    setOpen(false)
    triggerRef.current?.focus()

    if (nextValue !== value) onChange(nextValue)
  }

  const handleMenuKeyDown = (event) => {
    const currentIndex = optionRefs.current.indexOf(document.activeElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      optionRefs.current[Math.min(options.length - 1, Math.max(0, currentIndex) + 1)]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      optionRefs.current[Math.max(0, currentIndex - 1)]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      optionRefs.current[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      optionRefs.current[options.length - 1]?.focus()
    }
  }

  return (
    <div
      className={`dropdown${compact ? ' dropdown-compact' : ''}${open ? ' open' : ''}${
        className ? ` ${className}` : ''
      }`}
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        className="dropdown-trigger"
        type="button"
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

          event.preventDefault()
          setOpen(true)
        }}
      >
        <span>{selected?.label ?? ''}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          className="dropdown-menu"
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value

            return (
              <button
                className="dropdown-option"
                type="button"
                role="option"
                aria-selected={isSelected}
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => choose(option.value)}
              >
                <span>{option.label}</span>
                {isSelected ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default Dropdown
