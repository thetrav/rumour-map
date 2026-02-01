import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRumours } from '@/composables/useRumours'

// Mock the Google-related composables
vi.mock('@/composables/useGoogleAuth', () => ({
  useGoogleAuth: vi.fn(() => ({
    authState: { value: { isAuthenticated: false, isLoading: false } },
    initializeAuth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getAccessToken: vi.fn(() => ''),
    hasValidToken: vi.fn(() => false)
  }))
}))

vi.mock('@/composables/useRumoursFromGoogle', () => ({
  useRumoursFromGoogle: vi.fn(() => ({
    rumours: { value: [] },
    isLoading: { value: false },
    error: { value: null },
    fetchRumours: vi.fn(),
    refresh: vi.fn()
  }))
}))

describe('useRumours', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports the expected interface', () => {
    const composable = useRumours()
    
    expect(composable).toHaveProperty('rumours')
    expect(composable).toHaveProperty('isLoading')
    expect(composable).toHaveProperty('error')
    expect(composable).toHaveProperty('isAuthenticated')
    expect(composable).toHaveProperty('loadRumours')
    expect(composable).toHaveProperty('refresh')
  })

  it('initializes with empty rumours array', () => {
    const { rumours } = useRumours()
    
    expect(rumours.value).toEqual([])
  })

  it('provides authentication status from authState', () => {
    const { isAuthenticated } = useRumours()
    
    expect(isAuthenticated.value).toBe(false)
  })
})
