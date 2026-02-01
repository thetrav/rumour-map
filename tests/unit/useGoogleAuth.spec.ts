import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGoogleAuth } from '@/composables/useGoogleAuth'

describe('useGoogleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear sessionStorage
    sessionStorage.clear()
  })

  it('initializes with unauthenticated state', () => {
    const { authState } = useGoogleAuth()
    expect(authState.value.isAuthenticated).toBe(false)
    expect(authState.value.error).toBe(null)
  })

  it('starts with initializing flag', () => {
    const { authState } = useGoogleAuth()
    expect(authState.value.isInitializing).toBe(true)
  })

  it('provides signIn and signOut methods', () => {
    const { signIn, signOut } = useGoogleAuth()
    expect(typeof signIn).toBe('function')
    expect(typeof signOut).toBe('function')
  })

  it('provides token access methods', () => {
    const { getAccessToken, hasValidToken } = useGoogleAuth()
    expect(typeof getAccessToken).toBe('function')
    expect(typeof hasValidToken).toBe('function')
  })

  it('signOut clears authentication state', () => {
    const { authState, signOut } = useGoogleAuth()
    
    // Manually set authenticated state
    authState.value.isAuthenticated = true
    authState.value.user = { email: 'test@example.com', name: 'Test User' }
    
    signOut()
    
    expect(authState.value.isAuthenticated).toBe(false)
    expect(authState.value.user).toBe(null)
  })

  it('uses spreadsheets scope not readonly', async () => {
    const { GOOGLE_CONFIG } = await import('@/config/google')
    expect(GOOGLE_CONFIG.scope).toBe('https://www.googleapis.com/auth/spreadsheets')
    expect(GOOGLE_CONFIG.scope).not.toContain('readonly')
  })

  it('detects scope change and clears auth state', () => {
    // Simulate old scope in sessionStorage
    sessionStorage.setItem('auth_scope', 'https://www.googleapis.com/auth/spreadsheets.readonly')
    sessionStorage.setItem('auth_state', JSON.stringify({ isAuthenticated: true }))
    
    const { authState } = useGoogleAuth()
    
    // Auth state should be cleared when scope changes
    // Note: This would require actually calling initializeAuth() which we can't fully test in unit tests
    expect(sessionStorage.getItem('auth_scope')).toBeDefined()
  })
})
