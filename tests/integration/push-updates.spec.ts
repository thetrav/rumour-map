import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PushUpdatesButton from '@/components/PushUpdatesButton.vue'
import type { Rumour } from '@/types/rumour'

// Mock gapi-script
vi.mock('gapi-script', () => ({
  gapi: {
    client: {
      sheets: {
        spreadsheets: {
          values: {
            batchUpdate: vi.fn()
          }
        }
      },
      setToken: vi.fn()
    }
  }
}))

// Mock useGoogleAuth
vi.mock('@/composables/useGoogleAuth', () => ({
  useGoogleAuth: () => ({
    getAccessToken: vi.fn(() => 'mock-token'),
    hasValidToken: vi.fn(() => true)
  })
}))

describe('Push Updates Integration', () => {
  let mockRumours: Rumour[]

  beforeEach(() => {
    vi.clearAllMocks()

    mockRumours = [
      {
        id: 'rumour_2',
        session_date: '2025-01-15',
        game_date: 'Winter 1492',
        location_heard: 'Neverwinter',
        location_targetted: 'Northern Peaks',
        x: 3000,
        y: 1500,
        title: 'Dragon Sighting',
        is_a_place: false,
        rating: 8,
        resolved: false,
        details: 'Large winged creature seen',
        isPinned: false,
        isHovered: false,
        isHidden: false,
        isDragging: false,
        sheetRowNumber: 2,
        originalX: 3000,
        originalY: 1500,
        isModified: false
      }
    ]
  })

  it('button is disabled when no pending changes', () => {
    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    const button = wrapper.find('button.push-updates-btn')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('button is enabled when rumour is modified', async () => {
    const { useRumourUpdates } = await import('@/composables/useRumourUpdates')
    const { markAsModified } = useRumourUpdates()

    mockRumours[0].isModified = true
    mockRumours[0].x = 3100
    mockRumours[0].y = 1600
    markAsModified('rumour_2')

    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    await nextTick()

    const button = wrapper.find('button.push-updates-btn')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('displays pending count badge', async () => {
    const { useRumourUpdates } = await import('@/composables/useRumourUpdates')
    const { markAsModified } = useRumourUpdates()

    mockRumours[0].isModified = true
    markAsModified('rumour_2')

    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    await nextTick()

    const badge = wrapper.find('.badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('1')
  })

  it('shows loading state during push operation', async () => {
    const { gapi } = await import('gapi-script')
    const { useRumourUpdates } = await import('@/composables/useRumourUpdates')
    const { markAsModified } = useRumourUpdates()

    // Create a delayed mock
    const batchUpdate = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

    mockRumours[0].isModified = true
    markAsModified('rumour_2')

    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    await nextTick()

    const button = wrapper.find('button.push-updates-btn')
    await button.trigger('click')
    await nextTick()

    // Should show loading state
    expect(wrapper.find('.loading-content').exists()).toBe(true)
    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('successful push clears modified state and pending count', async () => {
    const { gapi } = await import('gapi-script')
    const { useRumourUpdates } = await import('@/composables/useRumourUpdates')
    const { markAsModified, pendingCount } = useRumourUpdates()

    const batchUpdate = vi.fn().mockResolvedValue({
      result: {
        totalUpdatedCells: 2,
        responses: [{ updatedCells: 2 }]
      }
    })
    gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

    mockRumours[0].x = 3200
    mockRumours[0].y = 1700
    mockRumours[0].isModified = true
    markAsModified('rumour_2')

    expect(pendingCount.value).toBe(1)

    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    await nextTick()

    const button = wrapper.find('button.push-updates-btn')
    await button.trigger('click')
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(pendingCount.value).toBe(0)
    expect(mockRumours[0].isModified).toBe(false)
  })

  it('failed push shows error message', async () => {
    const { gapi } = await import('gapi-script')
    const { useRumourUpdates } = await import('@/composables/useRumourUpdates')
    const { markAsModified } = useRumourUpdates()

    const batchUpdate = vi.fn().mockRejectedValue({
      status: 403,
      message: 'Permission denied'
    })
    gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

    mockRumours[0].isModified = true
    markAsModified('rumour_2')

    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    await nextTick()

    const button = wrapper.find('button.push-updates-btn')
    await button.trigger('click')
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    const errorMessage = wrapper.find('.error-message')
    expect(errorMessage.exists()).toBe(true)
  })

  it('push calls API with correct ranges and values', async () => {
    const { gapi } = await import('gapi-script')
    const { useRumourUpdates } = await import('@/composables/useRumourUpdates')
    const { markAsModified } = useRumourUpdates()

    const batchUpdate = vi.fn().mockResolvedValue({
      result: {
        totalUpdatedCells: 2,
        responses: [{ updatedCells: 2 }]
      }
    })
    gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

    mockRumours[0].x = 3500
    mockRumours[0].y = 2000
    mockRumours[0].isModified = true
    markAsModified('rumour_2')

    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    await nextTick()

    const button = wrapper.find('button.push-updates-btn')
    await button.trigger('click')
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    expect(batchUpdate).toHaveBeenCalledTimes(1)
    const callArg = batchUpdate.mock.calls[0][0]
    
    expect(callArg.resource.data[0].values[0]).toEqual([3500, 2000])
    expect(callArg.resource.data[0].range).toContain('E2:F2')
  })

  it('button is disabled during push operation', async () => {
    const { gapi } = await import('gapi-script')
    const { useRumourUpdates } = await import('@/composables/useRumourUpdates')
    const { markAsModified } = useRumourUpdates()

    const batchUpdate = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        result: { totalUpdatedCells: 2 }
      }), 100))
    )
    gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

    mockRumours[0].isModified = true
    markAsModified('rumour_2')

    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    await nextTick()

    const button = wrapper.find('button.push-updates-btn')
    await button.trigger('click')
    await nextTick()

    // Button should be disabled while pushing
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('retry button appears for retryable errors', async () => {
    const { gapi } = await import('gapi-script')
    const { useRumourUpdates } = await import('@/composables/useRumourUpdates')
    const { markAsModified } = useRumourUpdates()

    const batchUpdate = vi.fn().mockRejectedValue({
      status: 401,
      message: 'Unauthorized'
    })
    gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

    mockRumours[0].isModified = true
    markAsModified('rumour_2')

    const wrapper = mount(PushUpdatesButton, {
      props: {
        rumours: mockRumours
      }
    })

    await nextTick()

    const button = wrapper.find('button.push-updates-btn')
    await button.trigger('click')
    
    await new Promise(resolve => setTimeout(resolve, 50))
    await nextTick()

    const retryButton = wrapper.find('.retry-btn')
    expect(retryButton.exists()).toBe(true)
  })
})
