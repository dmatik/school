import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PullToRefresh } from '../components/ui/pull-to-refresh'

describe('PullToRefresh Component', () => {
  it('triggers onRefresh when pulled down past threshold at scrollTop 0', () => {
    const onRefresh = vi.fn()
    render(
      <PullToRefresh onRefresh={onRefresh} threshold={60}>
        <div data-testid="scroll-area" style={{ overflowY: 'auto' }}>
          Content
        </div>
      </PullToRefresh>
    )

    const scrollArea = screen.getByTestId('scroll-area')
    Object.defineProperty(scrollArea, 'scrollTop', { value: 0, writable: true })

    fireEvent.touchStart(scrollArea, {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    fireEvent.touchMove(scrollArea, {
      touches: [{ clientX: 100, clientY: 260 }]
    })
    fireEvent.touchEnd(scrollArea)

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not trigger onRefresh when pulled down less than threshold', () => {
    const onRefresh = vi.fn()
    render(
      <PullToRefresh onRefresh={onRefresh} threshold={64}>
        <div data-testid="scroll-area" style={{ overflowY: 'auto' }}>
          Content
        </div>
      </PullToRefresh>
    )

    const scrollArea = screen.getByTestId('scroll-area')
    Object.defineProperty(scrollArea, 'scrollTop', { value: 0, writable: true })

    fireEvent.touchStart(scrollArea, {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    fireEvent.touchMove(scrollArea, {
      touches: [{ clientX: 100, clientY: 160 }]
    })
    fireEvent.touchEnd(scrollArea)

    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('does not trigger onRefresh when scrollTop > 0', () => {
    const onRefresh = vi.fn()
    render(
      <PullToRefresh onRefresh={onRefresh} threshold={60}>
        <div data-testid="scroll-area" style={{ overflowY: 'auto' }}>
          Content
        </div>
      </PullToRefresh>
    )

    const scrollArea = screen.getByTestId('scroll-area')
    Object.defineProperty(scrollArea, 'scrollTop', { value: 120, writable: true })

    fireEvent.touchStart(scrollArea, {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    fireEvent.touchMove(scrollArea, {
      touches: [{ clientX: 100, clientY: 280 }]
    })
    fireEvent.touchEnd(scrollArea)

    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('does not trigger onRefresh on horizontal swipe', () => {
    const onRefresh = vi.fn()
    render(
      <PullToRefresh onRefresh={onRefresh} threshold={60}>
        <div data-testid="scroll-area" style={{ overflowY: 'auto' }}>
          Content
        </div>
      </PullToRefresh>
    )

    const scrollArea = screen.getByTestId('scroll-area')
    Object.defineProperty(scrollArea, 'scrollTop', { value: 0, writable: true })

    fireEvent.touchStart(scrollArea, {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    fireEvent.touchMove(scrollArea, {
      touches: [{ clientX: 180, clientY: 110 }]
    })
    fireEvent.touchMove(scrollArea, {
      touches: [{ clientX: 180, clientY: 280 }]
    })
    fireEvent.touchEnd(scrollArea)

    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('renders refreshing and success status indicators and shifts content below indicator', () => {
    const { rerender } = render(
      <PullToRefresh onRefresh={vi.fn()} refreshing={true} refreshOffset={56}>
        <div>Content</div>
      </PullToRefresh>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByTestId('pull-to-refresh-content')).toHaveStyle({
      transform: 'translate3d(0, 56px, 0)'
    })

    rerender(
      <PullToRefresh onRefresh={vi.fn()} refreshing={false} success={true} refreshOffset={56}>
        <div>Content</div>
      </PullToRefresh>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByTestId('pull-to-refresh-content')).toHaveStyle({
      transform: 'translate3d(0, 56px, 0)'
    })
  })
})
