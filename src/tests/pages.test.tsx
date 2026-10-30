import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AdminPage } from '../components/AdminPage'
import { AccountPage } from '../components/AccountPage'
import { SettingsPage } from '../components/SettingsPage'
import type { User } from '../types'

describe('AdminPage, AccountPage & SettingsPage Component Tests (Isolated Test Users)', () => {
  let testAdminUser: User
  let testRegularUser: User
  let uniqueRunId: string

  beforeEach(() => {
    uniqueRunId = Math.random().toString(36).slice(2, 9)

    // Create uniquely-named isolated test users for this test run
    testAdminUser = {
      id: `test-admin-${uniqueRunId}`,
      username: `admin_${uniqueRunId}`,
      role: 'admin',
      firstName: 'TestAdminFirst',
      lastName: 'TestAdminLast',
      avatar: ''
    }

    testRegularUser = {
      id: `test-user-${uniqueRunId}`,
      username: `parent_${uniqueRunId}`,
      role: 'user',
      firstName: 'TestParentFirst',
      lastName: 'TestParentLast',
      avatar: ''
    }

    // Default mock fetch for endpoints
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ users: [testAdminUser, testRegularUser] })
        })
      }
      if (url.includes('/api/webtop/config')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ config: null })
        })
      }
      if (url.includes('/api/auth/passkeys')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ passkeys: [] })
        })
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      })
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    // Explicitly unmount rendered React components and tear down test users
    cleanup()
    vi.restoreAllMocks()
    // Nullify references to ensure zero test user data retention
    testAdminUser = null as unknown as User
    testRegularUser = null as unknown as User
  })

  describe('AdminPage Component', () => {
    it('renders admin view with dedicated test users list', async () => {
      render(<AdminPage currentUser={testAdminUser} token="mock-test-jwt-token" />)

      // Title should render
      expect(screen.getByText('admin.title')).toBeInTheDocument()

      // Should fetch and display both test users
      await waitFor(() => {
        expect(screen.getByText(`(${testAdminUser.username})`)).toBeInTheDocument()
        expect(screen.getByText(`(${testRegularUser.username})`)).toBeInTheDocument()
      })

      // The current admin user should have the "(You)" indicator
      expect(screen.getByText('admin.you')).toBeInTheDocument()
    })

    it('filters users using search input query', async () => {
      render(<AdminPage currentUser={testAdminUser} token="mock-test-jwt-token" />)

      await waitFor(() => {
        expect(screen.getByText(`(${testAdminUser.username})`)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('admin.search_placeholder')
      expect(searchInput).toBeInTheDocument()

      // Filter by regular user username
      fireEvent.change(searchInput, { target: { value: testRegularUser.username } })

      expect(screen.getByText(`(${testRegularUser.username})`)).toBeInTheDocument()
      expect(screen.queryByText(`(${testAdminUser.username})`)).not.toBeInTheDocument()
    })

    it('opens and closes the create user dialog', async () => {
      render(<AdminPage currentUser={testAdminUser} token="mock-test-jwt-token" />)

      const addUserBtn = screen.getByRole('button', { name: /admin\.add_user_button/i })
      fireEvent.click(addUserBtn)

      // Modal title should appear
      expect(screen.getByText('admin.create_user_modal_title')).toBeInTheDocument()

      // Cancel button should close dialog
      const cancelBtn = screen.getByRole('button', { name: /common\.cancel/i })
      fireEvent.click(cancelBtn)

      await waitFor(() => {
        expect(screen.queryByText('admin.create_user_modal_title')).not.toBeInTheDocument()
      })
    })
  })

  describe('AccountPage Component', () => {
    it('renders user account details and profile form correctly', async () => {
      const handleUpdateUser = vi.fn()
      const handleLogout = vi.fn()

      render(
        <AccountPage
          user={testRegularUser}
          token="mock-test-jwt-token"
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('account.personal_info')).toBeInTheDocument()
      })
      expect(screen.queryByText('account.webtop_title')).not.toBeInTheDocument()
      expect(screen.getByText('account.passkeys_title')).toBeInTheDocument()

      // Profile input values
      const firstNameInput = screen.getByDisplayValue(testRegularUser.firstName!)
      const lastNameInput = screen.getByDisplayValue(testRegularUser.lastName!)
      expect(firstNameInput).toBeInTheDocument()
      expect(lastNameInput).toBeInTheDocument()
    })

    it('triggers logout callback when logout button is clicked', async () => {
      const handleUpdateUser = vi.fn()
      const handleLogout = vi.fn()

      render(
        <AccountPage
          user={testRegularUser}
          token="mock-test-jwt-token"
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /auth\.logout/i })).toBeInTheDocument()
      })

      const logoutBtn = screen.getByRole('button', { name: /auth\.logout/i })
      fireEvent.click(logoutBtn)

      expect(handleLogout).toHaveBeenCalledTimes(1)
    })
  })

  describe('SettingsPage Component', () => {
    it('renders settings page and webtop configuration section correctly', async () => {
      render(<SettingsPage token="mock-test-jwt-token" />)

      await waitFor(() => {
        expect(screen.getByText('settings.title')).toBeInTheDocument()
      })
      expect(screen.getByText('account.webtop_title')).toBeInTheDocument()
      expect(screen.getByText('account.webtop_desc')).toBeInTheDocument()
    })

    it('renders webtop info and linked children boxes with elevated secondary background in dark theme', async () => {
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/webtop/config')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              configured: true,
              username: 'KQT460',
              lastSyncedAt: '2026-10-30T12:00:00Z',
              linkedChildren: [
                { id: 'child-1', firstName: 'כפיר', lastName: 'טרוסמן', classCode: '4', classNum: '2', color: 'emerald' }
              ]
            })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        })
      }) as unknown as typeof fetch

      try {
        render(<SettingsPage token="mock-test-jwt-token" />)

        await waitFor(() => {
          expect(screen.getByText('KQT460')).toBeInTheDocument()
        })

        // Top info box
        const usernameEl = screen.getByText('KQT460')
        const infoBox = usernameEl.closest('.grid')
        expect(infoBox).toHaveClass('dark:bg-secondary/80')
        expect(infoBox).toHaveClass('bg-muted/40')

        // Child box
        const childBadge = screen.getByText('כפיר טרוסמן')
        const childBox = childBadge.closest('.rounded-xl')
        expect(childBox).toHaveClass('dark:bg-secondary/80')
        expect(childBox).toHaveClass('bg-muted/40')
      } finally {
        global.fetch = originalFetch
      }
    })
  })
})
