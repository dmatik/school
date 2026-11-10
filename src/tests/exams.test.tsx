import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExamsPage } from '../components/ExamsPage'
import type { User, ExamItem, WebtopConfig } from '../types'
import Database from 'better-sqlite3'
import { initDb } from '../../server/db'
import { format, addDays, subDays } from 'date-fns'

describe('Exams Feature — Component and Backend Tests', () => {
  let parentUser: User
  let childUser: User
  let mockConfig: WebtopConfig
  let mockExams: ExamItem[]

  beforeEach(() => {
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
      selectedChildId: 'all',
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

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    const nextWeekStr = format(addDays(new Date(), 7), 'yyyy-MM-dd')
    const pastStr = format(subDays(new Date(), 5), 'yyyy-MM-dd')

    mockExams = [
      {
        id: 'exam-1',
        childId: 'child-abc-1',
        studentName: 'David Cohen',
        name: 'Math - Fractions',
        description: 'Chapters 1-3, bring calculator',
        date: tomorrowStr,
        grade: ''
      },
      {
        id: 'exam-2',
        childId: 'child-abc-1',
        studentName: 'David Cohen',
        name: 'Hebrew - Grammar',
        date: todayStr,
        grade: ''
      },
      {
        id: 'exam-3',
        childId: 'child-xyz-2',
        studentName: 'Maya Cohen',
        name: 'English - Vocabulary',
        date: nextWeekStr,
        grade: ''
      },
      {
        id: 'exam-4',
        childId: 'child-abc-1',
        studentName: 'David Cohen',
        name: 'History - Ancient Rome',
        date: pastStr,
        grade: '92'
      }
    ]

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(mockConfig)
        })
      }
      if (url.includes('/api/exams')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ exams: mockExams })
        })
      }
      return Promise.reject(new Error(`Unhandled mock fetch URL: ${url}`))
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders Add Exam button and child badge for parent users', async () => {
    render(<ExamsPage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('Math - Fractions')).toBeInTheDocument()
    })

    // Description is displayed right below name
    expect(screen.getByText('Chapters 1-3, bring calculator')).toBeInTheDocument()

    // Parents see "Add Exam" button
    expect(screen.getByRole('button', { name: /exams\.add_exam_button/i })).toBeInTheDocument()

    // Parents see child badges (first names only)
    expect(screen.getAllByText('David').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Maya').length).toBeGreaterThan(0)

    // No vertical accent bars on cards
    expect(screen.queryByTestId('exams-card-accent')).not.toBeInTheDocument()

    // Parents see edit buttons
    const editButtons = screen.getAllByTitle('exams.edit_exam_button')
    expect(editButtons.length).toBeGreaterThan(0)
  })

  it('hides Add Exam button, child selector, and child badges for child users', async () => {
    render(<ExamsPage token="test-token" currentUser={childUser} />)

    await waitFor(() => {
      expect(screen.getByText('Math - Fractions')).toBeInTheDocument()
    })

    // Child user cannot see Add Exam button
    expect(screen.queryByRole('button', { name: /exams\.add_exam_button/i })).not.toBeInTheDocument()

    // Child user cannot see Edit Exam buttons
    expect(screen.queryByTitle('exams.edit_exam_button')).not.toBeInTheDocument()

    // Child user cannot see child badge container or vertical accent bar
    expect(screen.queryByText('David')).not.toBeInTheDocument()
    expect(screen.queryByTestId('exams-card-accent')).not.toBeInTheDocument()
  })

  it('defaults to future period and orders dates from today to future dates, and switches to past period via liquid glass selector', async () => {
    render(<ExamsPage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('Math - Fractions')).toBeInTheDocument()
    })

    // In default future period, today and future exams are shown
    expect(screen.getByText('Hebrew - Grammar')).toBeInTheDocument()
    expect(screen.getByText('Math - Fractions')).toBeInTheDocument()
    expect(screen.getByText('English - Vocabulary')).toBeInTheDocument()

    // Past exam is NOT shown in future period
    expect(screen.queryByText('History - Ancient Rome')).not.toBeInTheDocument()

    // Switch to Past period tab
    const pastTab = screen.getByRole('tab', { name: 'exams.period_past' })
    fireEvent.click(pastTab)

    expect(screen.getByText('History - Ancient Rome')).toBeInTheDocument()
    expect(screen.queryByText('Math - Fractions')).not.toBeInTheDocument()
    expect(screen.queryByText('Hebrew - Grammar')).not.toBeInTheDocument()
  })

  it('renders liquid glass child selector and period selector for parent users', async () => {
    render(<ExamsPage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('Math - Fractions')).toBeInTheDocument()
    })

    // Children selector
    const childSelector = screen.getByRole('tablist', { name: 'exams.filter_child' })
    expect(childSelector).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'exams.all_short' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'David' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Maya' })).toHaveAttribute('aria-selected', 'false')

    // Switching child tab
    const davidTab = screen.getByRole('tab', { name: 'David' })
    fireEvent.click(davidTab)
    expect(davidTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'exams.all_short' })).toHaveAttribute('aria-selected', 'false')

    // Period selector
    const periodSelector = screen.getByRole('tablist', { name: 'exams.filter_period' })
    expect(periodSelector).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'exams.period_future' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'exams.period_past' })).toHaveAttribute('aria-selected', 'false')
  })

  it('opens and closes the Add Exam modal for parent users', async () => {
    render(<ExamsPage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('Math - Fractions')).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /exams\.add_exam_button/i })
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByText('exams.add_modal_title')).toBeInTheDocument()
      expect(screen.getByLabelText('exams.name_label')).toBeInTheDocument()
      const descField = screen.getByLabelText('exams.description_label')
      expect(descField).toBeInTheDocument()
      expect(descField.tagName).toBe('TEXTAREA')
      expect(descField).toHaveAttribute('maxlength', '200')
      expect(screen.getByText('0/200')).toBeInTheDocument()
    })

    const descField = screen.getByLabelText('exams.description_label')
    fireEvent.change(descField, { target: { value: 'Important topic' } })
    expect(screen.getByText('15/200')).toBeInTheDocument()

    // Cancel closes modal
    const cancelBtn = screen.getByRole('button', { name: /common\.cancel/i })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByText('exams.add_modal_title')).not.toBeInTheDocument()
    })
  })

  it('filters exams using search query', async () => {
    render(<ExamsPage token="test-token" currentUser={parentUser} />)

    await waitFor(() => {
      expect(screen.getByText('Math - Fractions')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('exams.search_placeholder')
    fireEvent.change(searchInput, { target: { value: 'Vocabulary' } })

    expect(screen.getByText('English - Vocabulary')).toBeInTheDocument()
    expect(screen.queryByText('Math - Fractions')).not.toBeInTheDocument()
    expect(screen.queryByText('Hebrew - Grammar')).not.toBeInTheDocument()
  })
})

describe('Exams Database Schema & Scoping (Isolated In-Memory SQLite)', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    initDb(db)

    // Add children records
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

  it('creates exams table with required indexes and performs CRUD safely', () => {
    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO exams (id, user_id, child_id, student_name, name, description, date, grade, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertStmt.run('exam-101', 'child-1', 'Adam Levi', 'Geography', 'Capitals and Rivers', '2026-11-20', '', now, now)
    insertStmt.run('exam-102', 'child-2', 'Noa Levi', 'Physics', '', '2026-11-25', '98', now, now)

    // Verify all exams
    const all = db.prepare('SELECT * FROM exams ORDER BY date ASC').all() as { id: string; name: string; description: string; grade: string }[]
    expect(all).toHaveLength(2)
    expect(all[0].name).toBe('Geography')
    expect(all[0].description).toBe('Capitals and Rivers')
    expect(all[1].grade).toBe('98')

    // Update grade and description
    db.prepare('UPDATE exams SET grade = ?, description = ? WHERE id = ?').run('88', 'Updated topic', 'exam-101')
    const updated = db.prepare('SELECT grade, description FROM exams WHERE id = ?').get('exam-101') as { grade: string; description: string }
    expect(updated.grade).toBe('88')
    expect(updated.description).toBe('Updated topic')

    // Delete exam
    db.prepare('DELETE FROM exams WHERE id = ?').run('exam-101')
    const remaining = db.prepare('SELECT * FROM exams').all() as { id: string }[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('exam-102')
  })

  it('scopes exams by child_id accurately for child family roles', () => {
    const now = new Date().toISOString()
    const insertStmt = db.prepare(`
      INSERT INTO exams (id, user_id, child_id, student_name, name, description, date, grade, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertStmt.run('exam-201', 'child-1', 'Adam Levi', 'Art', '', '2026-12-01', '', now, now)
    insertStmt.run('exam-202', 'child-2', 'Noa Levi', 'Music', '', '2026-12-02', '', now, now)

    // Child-1 queries exams
    const child1Exams = db.prepare('SELECT * FROM exams WHERE child_id = ?').all('child-1') as { name: string }[]
    expect(child1Exams).toHaveLength(1)
    expect(child1Exams[0].name).toBe('Art')

    // Child-2 queries exams
    const child2Exams = db.prepare('SELECT * FROM exams WHERE child_id = ?').all('child-2') as { name: string }[]
    expect(child2Exams).toHaveLength(1)
    expect(child2Exams[0].name).toBe('Music')
  })

  it('validates calendar dates strictly avoiding non-existent leap days or roll-overs', () => {
    function isValidCalendarDate(dateStr: string) {
      if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return false
      }
      const [year, month, day] = dateStr.split('-').map(Number)
      if (year < 2000 || year > 2099) return false
      const d = new Date(year, month - 1, day)
      return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
    }

    expect(isValidCalendarDate('2026-11-20')).toBe(true)
    expect(isValidCalendarDate('2024-02-29')).toBe(true) // 2024 is leap year
    expect(isValidCalendarDate('2026-02-29')).toBe(false) // 2026 is NOT leap year
    expect(isValidCalendarDate('2026-04-31')).toBe(false) // April has 30 days
    expect(isValidCalendarDate('2026-13-45')).toBe(false)
    expect(isValidCalendarDate('invalid-date')).toBe(false)
  })
})
