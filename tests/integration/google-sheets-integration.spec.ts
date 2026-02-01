import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'

/**
 * Integration tests for Google Sheets OAuth + data fetching flow
 * Tests the complete user journey from authentication to data display
 */

// Mock the Google APIs
vi.mock('@/composables/useGoogleAuth', () => ({
  useGoogleAuth: vi.fn(() => ({
    authState: { value: { isAuthenticated: false, isLoading: false } },
    initializeAuth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getAccessToken: vi.fn(() => 'mock-token'),
    hasValidToken: vi.fn(() => true)
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

describe('Google Sheets Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows authentication prompt when not authenticated', () => {
    const wrapper = mount(App)
    
    // Should show auth prompt
    const authPrompt = wrapper.find('.auth-prompt')
    expect(authPrompt.exists()).toBe(true)
    
    // Should contain welcome message
    expect(wrapper.text()).toContain('Welcome to Rumour Map')
    expect(wrapper.text()).toContain('Please sign in with Google')
  })

  it('renders the app structure correctly', () => {
    const wrapper = mount(App)
    
    // Should have header
    expect(wrapper.find('.Header').exists()).toBe(true)
    expect(wrapper.find('.Header-title').text()).toBe('Rumour Map')
    
    // Should have main content area
    expect(wrapper.find('.main-content').exists()).toBe(true)
  })

  it('shows GoogleAuthButton in header when not authenticated', () => {
    const wrapper = mount(App)
    
    // Should have auth button in header
    const headerAuthButton = wrapper.findAllComponents({ name: 'GoogleAuthButton' })
    expect(headerAuthButton.length).toBeGreaterThan(0)
  })
})
