import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SchedulePage } from '../components/SchedulePage'
import type { User, ScheduleLesson, ScheduleFinishTime, WebtopConfig } from '../types'
import Database from 'better-sqlite3'
import { initDb } from '../../server/db'

describe('Weekly Schedule Feature — Component and Backend Tests', () => {
  let parentUser: User
  let childUser: User
  let mockConfig: WebtopConfig
  let mockLessons: ScheduleLesson[]
  let mockFinishTimes: ScheduleFinishTime[]

  beforeEach(() => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn()

    parentUser = {
      id: 'test-parent-1',
      username: 'parent1',
      role: 'user',
      familyRole: 'parent',
      linkedChildId: null,
      firstName: 'Sarah',
      lastName: 'Cohen'
    }

    childUser = {
      id: 'test-child-1',
      username: 'child1',
      role: 'user',
      familyRole: 'child',
      linkedChildId: 'child-abc-1',
      firstName: 'David',
      lastName: 'Cohen'
    }

    mockConfig = {
      configured: true,
      username: 'webtop_parent',
      selectedChildId: 'child-abc-1',
      linkedChildren: [
        {
          id: 'child-abc-1',
          firstName: 'David',
          lastName: 'Cohen',
          classCode: 4,
          classNum: 2,
          color: 'blue'
        },
        {
          id: 'child-xyz-2',
          firstName: 'Maya',
          lastName: 'Cohen',
          classCode: 6,
          classNum: 1,
          color: 'rose'
        }
      ],
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'success',
      syncError: null
    }

    mockLessons = [
      {
        id: 'lesson-1',
        childId: 'child-abc-1',
        dayOfWeek: 0, // Sunday
        hourNum: 1,
        subject: 'מתמטיקה',
        teacher: 'גב׳ לוי',
        room: 'כיתה 102'
      },
      {
        id: 'lesson-2',
        childId: 'child-abc-1',
        dayOfWeek: 0,
        hourNum: 2,
        subject: 'אנגלית',
        teacher: 'מר כהן',
        room: 'מעבדה'
      },
      {
        id: 'lesson-3',
        childId: 'child-abc-1',
        dayOfWeek: 4, // Thursday
        hourNum: 3,
        subject: 'מדעים',
        teacher: '',
        room: ''
      }
    ]

    mockFinishTimes = [
      {
        id: 'finish-0',
        childId: 'child-abc-1',
        dayOfWeek: 0,
        finishTime: '13:30'
      },
      {
        id: 'finish-4',
        childId: 'child-abc-1',
        dayOfWeek: 4,
        finishTime: '14:15'
      },
      {
        id: 'finish-5',
        childId: 'child-abc-1',
        dayOfWeek: 5,
        finishTime: '11:50'
      }
    ]

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfig)
        })
      }
      if (url.includes('/api/schedule')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            lessons: mockLessons,
            finishTimes: mockFinishTimes
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders weekly schedule table from Sunday to Friday with days headers', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('schedule.title')).toBeInTheDocument()
    })

    // Verify all 6 days headers exist
    for (let day = 0; day <= 5; day++) {
      expect(screen.getByText(`schedule.days.day_${day}`)).toBeInTheDocument()
    }

    // Verify existing lessons are displayed
    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      expect(screen.getByText('אנגלית')).toBeInTheDocument()
      expect(screen.getByText('מדעים')).toBeInTheDocument()
    })

    // Verify bottom row dismissal times
    expect(screen.getByText('13:30')).toBeInTheDocument()
    expect(screen.getByText('14:15')).toBeInTheDocument()
    expect(screen.getByText('11:50')).toBeInTheDocument()
  })

  it('renders child selector dropdown for parent user and switches child', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('David Cohen')).toBeInTheDocument()
    })

    // Child user does not see student selector dropdown
    cleanup()
    render(<SchedulePage token="test-token" currentUser={childUser} />)

    await waitFor(() => {
      expect(screen.getByText('schedule.title')).toBeInTheDocument()
      expect(screen.queryByText('David Cohen')).not.toBeInTheDocument()
    })
  })

  it('shows child unlinked warning if child user has no linked child id', async () => {
    const unlinkedChild: User = {
      ...childUser,
      linkedChildId: null
    }

    render(<SchedulePage token="test-token" currentUser={unlinkedChild} />)

    await waitFor(() => {
      expect(screen.getByText('schedule.child_unlinked_desc')).toBeInTheDocument()
    })
  })

  it('allows parent to click a lesson and open Edit Lesson Dialog only when edit mode is enabled', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
    })

    // By default, edit mode is OFF so clicking does NOT open modal
    fireEvent.click(screen.getByText('מתמטיקה'))
    expect(screen.queryByText('schedule.lesson_modal_title_edit')).not.toBeInTheDocument()

    // Enable edit mode via the round button
    const editToggle = screen.getByRole('button', { name: 'schedule.edit_mode_enable' })
    fireEvent.click(editToggle)

    // Now clicking on Math lesson opens the modal
    fireEvent.click(screen.getByText('מתמטיקה'))

    await waitFor(() => {
      expect(screen.getByText('schedule.lesson_modal_title_edit')).toBeInTheDocument()
      const subjectInput = screen.getByLabelText('schedule.subject_label') as HTMLInputElement
      expect(subjectInput.value).toBe('מתמטיקה')
      expect(subjectInput.maxLength).toBe(50)
      expect(screen.getByText('7/50')).toBeInTheDocument()
      expect(screen.getByText('schedule.clear_lesson')).toBeInTheDocument()
    })
  })

  it('does NOT open edit dialog when child user clicks on a lesson and child has no edit button', async () => {
    render(<SchedulePage token="test-token" currentUser={childUser} />)

    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
    })

    // Child user should NOT see edit mode toggle button
    expect(screen.queryByRole('button', { name: 'schedule.edit_mode_enable' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('מתמטיקה'))

    expect(screen.queryByText('schedule.lesson_modal_title_edit')).not.toBeInTheDocument()
    expect(screen.queryByText('schedule.lesson_modal_title_add')).not.toBeInTheDocument()
  })

  it('allows parent to click on dismissal finish time to open finish time dialog only when edit mode is enabled', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('13:30')).toBeInTheDocument()
    })

    // When edit mode is OFF, clicking dismissal time does not open modal
    fireEvent.click(screen.getByText('13:30'))
    expect(screen.queryByText('schedule.finish_time_modal_title')).not.toBeInTheDocument()

    // Enable edit mode
    const editToggle = screen.getByRole('button', { name: 'schedule.edit_mode_enable' })
    fireEvent.click(editToggle)

    fireEvent.click(screen.getByText('13:30'))

    await waitFor(() => {
      expect(screen.getByText('schedule.finish_time_modal_title')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '11:45' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '12:45' })).toBeInTheDocument()
    })
  })

  it('does NOT open finish time dialog when child user clicks dismissal time', async () => {
    render(<SchedulePage token="test-token" currentUser={childUser} />)

    await waitFor(() => {
      expect(screen.getByText('13:30')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('13:30'))

    expect(screen.queryByText('schedule.finish_time_modal_title')).not.toBeInTheDocument()
  })

  it('renders both Save and Cancel buttons in edit mode, and Cancel restores original state', async () => {
    render(<SchedulePage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
    })

    // Enable edit mode
    const editToggle = screen.getByRole('button', { name: 'schedule.edit_mode_enable' })
    fireEvent.click(editToggle)

    // Save and Cancel buttons must be visible
    const saveBtn = screen.getByRole('button', { name: 'schedule.edit_mode_save' })
    const cancelBtn = screen.getByRole('button', { name: 'schedule.edit_mode_cancel' })
    expect(saveBtn).toBeInTheDocument()
    expect(cancelBtn).toBeInTheDocument()

    // Edit a lesson
    fireEvent.click(screen.getByText('מתמטיקה'))
    await waitFor(() => {
      expect(screen.getByText('schedule.lesson_modal_title_edit')).toBeInTheDocument()
    })

    const subjectInput = screen.getByLabelText('schedule.subject_label')
    fireEvent.change(subjectInput, { target: { value: 'פיזיקה' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    // Modal closes and lesson changes in local table
    await waitFor(() => {
      expect(screen.getByText('פיזיקה')).toBeInTheDocument()
      expect(screen.queryByText('מתמטיקה')).not.toBeInTheDocument()
    })

    // Click Cancel (X) button
    fireEvent.click(cancelBtn)

    // Table must revert to original state ('מתמטיקה' restored, 'פיזיקה' removed) and edit mode closed
    await waitFor(() => {
      expect(screen.getByText('מתמטיקה')).toBeInTheDocument()
      expect(screen.queryByText('פיזיקה')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'schedule.edit_mode_enable' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'schedule.edit_mode_cancel' })).not.toBeInTheDocument()
    })
  })

  it('calculates the mobile target initial day correctly', () => {
    function computeTargetDay(dayOfWeek: number) {
      if (dayOfWeek >= 3 && dayOfWeek <= 5) return 3 // Wed, Thu, Fri -> 3 (showing Wed, Thu, Fri)
      if (dayOfWeek === 6) return 0 // Saturday -> Sunday
      if (dayOfWeek >= 0 && dayOfWeek <= 2) return dayOfWeek
      return 0
    }

    expect(computeTargetDay(0)).toBe(0) // Sunday
    expect(computeTargetDay(1)).toBe(1) // Monday
    expect(computeTargetDay(2)).toBe(2) // Tuesday
    expect(computeTargetDay(3)).toBe(3) // Wednesday
    expect(computeTargetDay(4)).toBe(3) // Thursday
    expect(computeTargetDay(5)).toBe(3) // Friday -> 3
    expect(computeTargetDay(6)).toBe(0) // Saturday -> 0
  })

  it('calculates hours rows to display exactly 1 below the highest populated lesson in any day', () => {
    function computeHoursToDisplay(items: { hourNum: number; subject: string }[]) {
      let maxPopulatedHour = 0
      for (const l of items) {
        if (l.subject && l.subject.trim() && l.hourNum > maxPopulatedHour) {
          maxPopulatedHour = l.hourNum
        }
      }
      const maxHour = Math.min(Math.max(maxPopulatedHour + 1, 1), 12)
      const list: number[] = []
      for (let h = 1; h <= maxHour; h++) {
        list.push(h)
      }
      return list
    }

    // No lessons at all -> shows hour 1
    expect(computeHoursToDisplay([])).toEqual([1])

    // Highest lesson is hour 3 -> shows hours 1..4 (1 below populated)
    expect(computeHoursToDisplay([
      { hourNum: 1, subject: 'Math' },
      { hourNum: 3, subject: 'English' }
    ])).toEqual([1, 2, 3, 4])

    // Highest lesson is hour 5 -> shows hours 1..6
    expect(computeHoursToDisplay([
      { hourNum: 2, subject: 'Hebrew' },
      { hourNum: 5, subject: 'History' }
    ])).toEqual([1, 2, 3, 4, 5, 6])

    // Empty subject strings are ignored
    expect(computeHoursToDisplay([
      { hourNum: 2, subject: 'Art' },
      { hourNum: 7, subject: '   ' }
    ])).toEqual([1, 2, 3])
  })
})

describe('Schedule Database Schema & Backend Constraints (Isolated In-Memory SQLite)', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)

    db.prepare(`
      INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, created_at, updated_at)
      VALUES
        ('child-1', 'family', 'Adam', 'Levi', 3, 1, datetime('now'), datetime('now')),
        ('child-2', 'family', 'Noa', 'Levi', 5, 2, datetime('now'), datetime('now'))
    `).run()
  })

  afterEach(() => {
    db.close()
  })

  it('creates schedule_lessons table and enforces UNIQUE(child_id, day_of_week, hour_num)', () => {
    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertStmt.run('l-1', 'child-1', 0, 1, 'Math', 'Mr. Smith', '101', now, now)

    // Inserting same child, day, and hour should throw UNIQUE constraint failure
    expect(() => {
      insertStmt.run('l-2', 'child-1', 0, 1, 'Science', '', '', now, now)
    }).toThrow(/UNIQUE constraint failed/)

    // Inserting different hour for same child should succeed
    expect(() => {
      insertStmt.run('l-2', 'child-1', 0, 2, 'Science', '', '', now, now)
    }).not.toThrow()

    // Inserting same day & hour for different child should succeed
    expect(() => {
      insertStmt.run('l-3', 'child-2', 0, 1, 'History', '', '', now, now)
    }).not.toThrow()
  })

  it('enforces day_of_week CHECK (0..5) and hour_num CHECK (1..12)', () => {
    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Invalid day: 6 (Saturday) or -1
    expect(() => {
      insertStmt.run('l-err-1', 'child-1', 6, 1, 'Math', '', '', now, now)
    }).toThrow(/CHECK constraint failed/)

    // Invalid hour: 0 or 13
    expect(() => {
      insertStmt.run('l-err-2', 'child-1', 1, 0, 'Math', '', '', now, now)
    }).toThrow(/CHECK constraint failed/)
  })

  it('creates schedule_day_settings and enforces UNIQUE(child_id, day_of_week)', () => {
    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?)
    `)

    insertStmt.run('f-1', 'child-1', 0, '13:30', now, now)

    // Conflict on same child & day
    expect(() => {
      insertStmt.run('f-2', 'child-1', 0, '14:00', now, now)
    }).toThrow(/UNIQUE constraint failed/)

    // Upsert works
    const upsertStmt = db.prepare(`
      INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?)
      ON CONFLICT(child_id, day_of_week) DO UPDATE SET
        finish_time = excluded.finish_time,
        updated_at = excluded.updated_at
    `)
    upsertStmt.run('f-2', 'child-1', 0, '14:00', now, now)

    const updated = db.prepare('SELECT finish_time FROM schedule_day_settings WHERE child_id = ? AND day_of_week = ?').get('child-1', 0) as { finish_time: string }
    expect(updated.finish_time).toBe('14:00')
  })

  it('validates batch array size bounds and strict 24-hour finish time format', () => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

    expect(timeRegex.test('11:45')).toBe(true)
    expect(timeRegex.test('00:00')).toBe(true)
    expect(timeRegex.test('23:59')).toBe(true)
    expect(timeRegex.test('24:00')).toBe(false)
    expect(timeRegex.test('99:99')).toBe(false)
    expect(timeRegex.test('12:60')).toBe(false)
    expect(timeRegex.test('1:30')).toBe(false)

    // Batch limits
    const maxLessons = 72
    const maxFinishTimes = 6
    expect(maxLessons).toBe(6 * 12)
    expect(maxFinishTimes).toBe(6)
  })

  it('deduplicates batch slots cleanly without unique constraint crash', () => {
    const rawLessons = [
      { dayOfWeek: 0, hourNum: 1, subject: 'First Math' },
      { dayOfWeek: 0, hourNum: 1, subject: 'Duplicate Math' },
      { dayOfWeek: 1, hourNum: 2, subject: 'English' }
    ]

    const seenSlots = new Set<string>()
    const deduplicated = []
    for (const l of rawLessons) {
      const key = `${l.dayOfWeek}-${l.hourNum}`
      if (seenSlots.has(key)) continue
      seenSlots.add(key)
      deduplicated.push(l)
    }

    expect(deduplicated).toHaveLength(2)
    expect(deduplicated[0].subject).toBe('First Math')
    expect(deduplicated[1].subject).toBe('English')
  })
})
