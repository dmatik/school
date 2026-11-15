import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PullToRefresh } from '../components/ui/pull-to-refresh'

describe('PullToRefresh Component', () => {
  it('triggers onRefresh when pulled down past default higher threshold at scrollTop 0', () => {
    const onRefresh = vi.fn()
    render(
      <PullToRefresh onRefresh={onRefresh}>
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
    // deltaY = 210 -> damped = 210 * 0.55 = 115.5 >= 108 default threshold
    fireEvent.touchMove(scrollArea, {
      touches: [{ clientX: 100, clientY: 310 }]
    })

    // While pulled past threshold, spinning arrows animation starts on indicator
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status.querySelector('svg')).toHaveClass('animate-spin')

    fireEvent.touchEnd(scrollArea)

    expect(onRefresh).toHaveBeenCalledTimes(1)
    // Content immediately snaps back up with no offset
    expect(screen.getByTestId('pull-to-refresh-content').style.transform).toBe('')
  })

  it('does not trigger onRefresh on moderate pulls below the increased default threshold (108)', () => {
    const onRefresh = vi.fn()
    render(
      <PullToRefresh onRefresh={onRefresh}>
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
    // deltaY = 160 -> damped = 88 (< 108 default threshold)
    fireEvent.touchMove(scrollArea, {
      touches: [{ clientX: 100, clientY: 260 }]
    })

    const status = screen.getByRole('status')
    expect(status.querySelector('svg')).not.toHaveClass('animate-spin')

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

  it('does not keep page indicator or content offset when refreshing or success is true after release', () => {
    const { rerender } = render(
      <PullToRefresh onRefresh={vi.fn()} refreshing={true}>
        <div>Content</div>
      </PullToRefresh>
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId('pull-to-refresh-content').style.transform).toBe('')

    rerender(
      <PullToRefresh onRefresh={vi.fn()} refreshing={false} success={true}>
        <div>Content</div>
      </PullToRefresh>
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId('pull-to-refresh-content').style.transform).toBe('')
  })
})
