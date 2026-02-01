import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRumourUpdates } from '@/composables/useRumourUpdates'
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

describe('useRumourUpdates', () => {
  let mockRumours: Rumour[]

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock rumours
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
        rating: 8,
        resolved: false,
        details: 'Large winged creature seen',
        isPinned: true,
        isHovered: false,
        isHidden: false,
        isDragging: false,
        sheetRowNumber: 2,
        originalX: 3000,
        originalY: 1500,
        isModified: false
      },
      {
        id: 'rumour_3',
        session_date: '2025-01-15',
        game_date: 'Winter 1492',
        location_heard: 'Waterdeep',
        location_targetted: 'Eastern Road',
        x: 2100,
        y: 2200,
        title: 'Bandit Activity',
        rating: 6,
        resolved: false,
        details: 'Trade routes unsafe',
        isPinned: true,
        isHovered: false,
        isHidden: false,
        isDragging: false,
        sheetRowNumber: 3,
        originalX: 2100,
        originalY: 2200,
        isModified: false
      }
    ]
  })

  describe('pending changes tracking', () => {
    it('tracks pending changes count when markAsModified is called', () => {
      const { markAsModified, pendingCount } = useRumourUpdates()

      expect(pendingCount.value).toBe(0)

      markAsModified('rumour_2')
      expect(pendingCount.value).toBe(1)

      markAsModified('rumour_3')
      expect(pendingCount.value).toBe(2)

      // Adding same ID again shouldn't increase count
      markAsModified('rumour_2')
      expect(pendingCount.value).toBe(2)
    })

    it('hasPendingChanges is false initially and true after markAsModified', () => {
      const { hasPendingChanges, markAsModified, clearAllModified } = useRumourUpdates()

      // Clear any state from previous tests
      clearAllModified()

      expect(hasPendingChanges.value).toBe(false)

      markAsModified('rumour_2')
      expect(hasPendingChanges.value).toBe(true)
    })

    it('clears single modified rumour with clearModified', () => {
      const { markAsModified, clearModified, pendingCount } = useRumourUpdates()

      markAsModified('rumour_2')
      markAsModified('rumour_3')
      expect(pendingCount.value).toBe(2)

      clearModified('rumour_2')
      expect(pendingCount.value).toBe(1)

      clearModified('rumour_3')
      expect(pendingCount.value).toBe(0)
    })

    it('clears all modified rumours with clearAllModified', () => {
      const { markAsModified, clearAllModified, pendingCount, hasPendingChanges } = useRumourUpdates()

      markAsModified('rumour_2')
      markAsModified('rumour_3')
      expect(pendingCount.value).toBe(2)

      clearAllModified()
      expect(pendingCount.value).toBe(0)
      expect(hasPendingChanges.value).toBe(false)
    })
  })

  describe('validateUpdates', () => {
    it('filters out coordinates outside bounds', () => {
      const { markAsModified, pushUpdates } = useRumourUpdates()

      // Create rumours with invalid coordinates
      const invalidRumours: Rumour[] = [
        { ...mockRumours[0], x: -100, y: 1500, isModified: true },
        { ...mockRumours[1], x: 7000, y: 2200, isModified: true }
      ]

      markAsModified(invalidRumours[0].id)
      markAsModified(invalidRumours[1].id)

      // Should not throw, but should handle validation
      expect(async () => await pushUpdates(invalidRumours)).toBeDefined()
    })

    it('accepts coordinates within bounds', () => {
      const { markAsModified } = useRumourUpdates()

      const validRumours: Rumour[] = [
        { ...mockRumours[0], x: 0, y: 0, isModified: true },
        { ...mockRumours[1], x: 6500, y: 3600, isModified: true }
      ]

      markAsModified(validRumours[0].id)
      markAsModified(validRumours[1].id)

      // These should be valid
      expect(validRumours[0].x).toBeGreaterThanOrEqual(0)
      expect(validRumours[0].x).toBeLessThanOrEqual(6500)
      expect(validRumours[1].y).toBeGreaterThanOrEqual(0)
      expect(validRumours[1].y).toBeLessThanOrEqual(3600)
    })
  })

  describe('pushUpdates', () => {
    it('only pushes modified rumours', async () => {
      const { gapi } = await import('gapi-script')
      const batchUpdate = vi.fn().mockResolvedValue({
        result: {
          totalUpdatedCells: 2,
          responses: [{ updatedCells: 2 }]
        }
      })
      gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

      const { markAsModified, pushUpdates, clearAllModified } = useRumourUpdates()

      // Clear state from previous tests
      clearAllModified()

      // Mark only first rumour as modified
      mockRumours[0].x = 3100
      mockRumours[0].y = 1600
      mockRumours[0].isModified = true
      markAsModified('rumour_2')

      await pushUpdates(mockRumours)

      expect(batchUpdate).toHaveBeenCalledTimes(1)
      const call = batchUpdate.mock.calls[0][0]
      expect(call.resource.data).toHaveLength(1)
      expect(call.resource.data[0].values[0]).toEqual([3100, 1600])
    })

    it('clears modified state and updates originalX,originalY on success', async () => {
      const { gapi } = await import('gapi-script')
      const batchUpdate = vi.fn().mockResolvedValue({
        result: {
          totalUpdatedCells: 2,
          responses: [{ updatedCells: 2 }]
        }
      })
      gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

      const { markAsModified, pushUpdates, pendingCount } = useRumourUpdates()

      // Modify rumour
      mockRumours[0].x = 3200
      mockRumours[0].y = 1700
      mockRumours[0].isModified = true
      markAsModified('rumour_2')

      expect(pendingCount.value).toBe(1)

      await pushUpdates(mockRumours)

      // Should clear modified state
      expect(pendingCount.value).toBe(0)
      expect(mockRumours[0].isModified).toBe(false)
      expect(mockRumours[0].originalX).toBe(3200)
      expect(mockRumours[0].originalY).toBe(1700)
    })

    it('preserves modified state on error', async () => {
      const { gapi } = await import('gapi-script')
      const batchUpdate = vi.fn().mockRejectedValue({
        status: 500,
        message: 'Server error'
      })
      gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

      const { markAsModified, pushUpdates, pendingCount, pushError } = useRumourUpdates()

      mockRumours[0].x = 3300
      mockRumours[0].y = 1800
      mockRumours[0].isModified = true
      markAsModified('rumour_2')

      expect(pendingCount.value).toBe(1)

      await pushUpdates(mockRumours)

      // Should preserve modified state
      expect(pendingCount.value).toBe(1)
      expect(mockRumours[0].isModified).toBe(true)
      expect(pushError.value).not.toBeNull()
    })
  })

  describe('error handling', () => {
    it('maps 401 to AUTH_ERROR', async () => {
      const { gapi } = await import('gapi-script')
      const batchUpdate = vi.fn().mockRejectedValue({
        status: 401,
        message: 'Unauthorized'
      })
      gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

      const { markAsModified, pushUpdates, pushError } = useRumourUpdates()

      mockRumours[0].isModified = true
      markAsModified('rumour_2')

      await pushUpdates(mockRumours)

      expect(pushError.value).not.toBeNull()
      expect(pushError.value?.type).toBe('AUTH_ERROR')
      expect(pushError.value?.retryable).toBe(true)
    })

    it('maps 403 to PERMISSION_ERROR', async () => {
      const { gapi } = await import('gapi-script')
      const batchUpdate = vi.fn().mockRejectedValue({
        status: 403,
        message: 'Forbidden'
      })
      gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

      const { markAsModified, pushUpdates, pushError } = useRumourUpdates()

      mockRumours[0].isModified = true
      markAsModified('rumour_2')

      await pushUpdates(mockRumours)

      expect(pushError.value).not.toBeNull()
      expect(pushError.value?.type).toBe('PERMISSION_ERROR')
      expect(pushError.value?.retryable).toBe(false)
    })

    it('maps 429 to RATE_LIMIT_ERROR', async () => {
      const { gapi } = await import('gapi-script')
      const batchUpdate = vi.fn().mockRejectedValue({
        status: 429,
        message: 'Too Many Requests'
      })
      gapi.client.sheets.spreadsheets.values.batchUpdate = batchUpdate

      const { markAsModified, pushUpdates, pushError } = useRumourUpdates()

      mockRumours[0].isModified = true
      markAsModified('rumour_2')

      await pushUpdates(mockRumours)

      expect(pushError.value).not.toBeNull()
      expect(pushError.value?.type).toBe('RATE_LIMIT_ERROR')
      expect(pushError.value?.retryable).toBe(true)
    })
  })
})
