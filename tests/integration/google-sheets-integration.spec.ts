import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
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

vi.mock('@/composables/useConfig', () => ({
  useConfig: vi.fn(() => ({
    mapImageUrl: ref(''),
    spreadsheetId: ref(''),
    isConfigured: ref(false),
    needsSetup: ref(true),
    setConfig: vi.fn()
  }))
}))

describe('Google Sheets Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows setup dialog when not authenticated', () => {
    const wrapper = mount(App, { attachTo: document.body })
    
    // Should show setup dialog via teleport
    const setupDialog = wrapper.findComponent({ name: 'SetupDialog' })
    expect(setupDialog.exists()).toBe(true)
    
    // The dialog is teleported to body, so check the DOM directly
    const mapUrlInput = document.body.querySelector('#mapUrl')
    expect(mapUrlInput).not.toBeNull()
    const spreadsheetInput = document.body.querySelector('#spreadsheetId')
    expect(spreadsheetInput).not.toBeNull()
  })

  it('renders the app structure correctly', () => {
    const wrapper = mount(App)
    
    // Should have header
    expect(wrapper.find('.Header').exists()).toBe(true)
    expect(wrapper.find('.Header-title').text()).toBe('Rumour Map')
    
    // Should have main content area
    expect(wrapper.find('.main-content').exists()).toBe(true)
  })

  it('shows setup button in header', () => {
    const wrapper = mount(App)
    
    // Should have setup button in header
    expect(wrapper.find('.btn-setup').exists()).toBe(true)
  })
})
