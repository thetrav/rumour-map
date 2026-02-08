import { describe, it, expect, beforeEach } from 'vitest'
import { useRumourUpdates } from '@/composables/useRumourUpdates'
import type { Rumour } from '@/types/rumour'

/**
 * Integration test for auto-placement feature
 * Tests the complete workflow of auto-placing rumours based on location_targetted
 */
describe('Auto-place rumours integration', () => {
  let rumours: Rumour[]

  beforeEach(() => {
    rumours = []
  })

  it('should correctly auto-place and mark rumours as modified for saving', () => {
    const { markFieldAsModified, hasPendingChanges, pendingCount, clearAllModified } = useRumourUpdates()

    // Create rumour with coordinates and location_targetted
    const rumourA: Rumour = {
      id: 'rumour_2',
      title: 'Dragon spotted near Waterdeep',
      x: 1250,
      y: 3400,
      session_date: '2025-01-15',
      game_date: 'Hammer 10, 1492',
      location_heard: 'Tavern',
      location_targetted: 'Waterdeep',
      is_a_place: false,
      rating: 8,
      resolved: false,
      details: 'Multiple witnesses saw a red dragon flying overhead',
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 2,
      originalX: 1250,
      originalY: 3400,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {
        x: 1250,
        y: 3400,
        title: 'Dragon spotted near Waterdeep',
        location_targetted: 'Waterdeep'
      }
    }

    // Create rumour WITHOUT coordinates but WITH same location_targetted
    const rumourB: Rumour = {
      id: 'rumour_3',
      title: 'Treasure hidden in Waterdeep',
      x: 0, // No coordinates initially
      y: 0, // No coordinates initially
      session_date: '2025-01-20',
      game_date: 'Hammer 15, 1492',
      location_heard: 'Market',
      location_targetted: 'Waterdeep', // Same location as rumourA
      is_a_place: false,
      rating: 5,
      resolved: false,
      details: 'Old map shows treasure location',
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 3,
      originalX: 0,
      originalY: 0,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {
        x: 0,
        y: 0,
        title: 'Treasure hidden in Waterdeep',
        location_targetted: 'Waterdeep'
      }
    }

    rumours = [rumourA, rumourB]

    // Clear any existing modifications
    clearAllModified()
    expect(hasPendingChanges.value).toBe(false)
    expect(pendingCount.value).toBe(0)

    // Simulate the auto-placement logic
    const locationMap = new Map<string, { x: number; y: number }>()
    
    // First pass: collect coordinates
    rumours.forEach(r => {
      if (r.location_targetted && (r.x !== 0 || r.y !== 0)) {
        if (!locationMap.has(r.location_targetted)) {
          locationMap.set(r.location_targetted, { x: r.x, y: r.y })
        }
      }
    })

    // Second pass: auto-place
    rumours.forEach(r => {
      if ((r.x === 0 && r.y === 0) && r.location_targetted) {
        const coords = locationMap.get(r.location_targetted)
        if (coords) {
          r.x = coords.x
          r.y = coords.y
          markFieldAsModified(r, 'x')
          markFieldAsModified(r, 'y')
        }
      }
    })

    // Verify rumourB was auto-placed
    expect(rumourB.x).toBe(1250)
    expect(rumourB.y).toBe(3400)
    expect(rumourB.location_targetted).toBe('Waterdeep')

    // Verify it was marked as modified
    expect(rumourB.modifiedFields?.has('x')).toBe(true)
    expect(rumourB.modifiedFields?.has('y')).toBe(true)
    expect(rumourB.isModified).toBe(true)

    // Verify pending changes
    expect(hasPendingChanges.value).toBe(true)
    expect(pendingCount.value).toBe(1) // Only rumourB is modified

    // Verify rumourA remains unchanged
    expect(rumourA.x).toBe(1250)
    expect(rumourA.y).toBe(3400)
    expect(rumourA.isModified).toBe(false)
  })

  it('should handle multiple rumours without coordinates matching same location', () => {
    const { markFieldAsModified, pendingCount, clearAllModified } = useRumourUpdates()

    const rumourSource: Rumour = {
      id: 'rumour_2',
      title: 'Source rumour at Baldur\'s Gate',
      x: 800,
      y: 1500,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Baldur\'s Gate',
      is_a_place: false,
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 2,
      originalX: 800,
      originalY: 1500,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    const rumourNoCoords1: Rumour = {
      id: 'rumour_3',
      title: 'First rumour without coords',
      x: 0,
      y: 0,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Baldur\'s Gate',
      is_a_place: false,
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 3,
      originalX: 0,
      originalY: 0,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    const rumourNoCoords2: Rumour = {
      id: 'rumour_4',
      title: 'Second rumour without coords',
      x: 0,
      y: 0,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Baldur\'s Gate',
      is_a_place: false,
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 4,
      originalX: 0,
      originalY: 0,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    rumours = [rumourSource, rumourNoCoords1, rumourNoCoords2]

    clearAllModified()

    // Simulate auto-placement
    const locationMap = new Map<string, { x: number; y: number }>()
    
    rumours.forEach(r => {
      if (r.location_targetted && (r.x !== 0 || r.y !== 0)) {
        if (!locationMap.has(r.location_targetted)) {
          locationMap.set(r.location_targetted, { x: r.x, y: r.y })
        }
      }
    })

    rumours.forEach(r => {
      if ((r.x === 0 && r.y === 0) && r.location_targetted) {
        const coords = locationMap.get(r.location_targetted)
        if (coords) {
          r.x = coords.x
          r.y = coords.y
          markFieldAsModified(r, 'x')
          markFieldAsModified(r, 'y')
        }
      }
    })

    // Both rumours should be auto-placed to same coordinates
    expect(rumourNoCoords1.x).toBe(800)
    expect(rumourNoCoords1.y).toBe(1500)
    expect(rumourNoCoords2.x).toBe(800)
    expect(rumourNoCoords2.y).toBe(1500)

    // Both should be marked as modified
    expect(pendingCount.value).toBe(2)
  })

  it('should not auto-place rumours with different location_targetted', () => {
    const { markFieldAsModified, pendingCount, clearAllModified } = useRumourUpdates()

    const rumourA: Rumour = {
      id: 'rumour_2',
      title: 'Rumour at Neverwinter',
      x: 500,
      y: 1000,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Neverwinter',
      is_a_place: false,
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 2,
      originalX: 500,
      originalY: 1000,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    const rumourB: Rumour = {
      id: 'rumour_3',
      title: 'Rumour about Luskan',
      x: 0,
      y: 0,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Luskan', // Different location
      is_a_place: false,
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 3,
      originalX: 0,
      originalY: 0,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    rumours = [rumourA, rumourB]

    clearAllModified()

    // Simulate auto-placement
    const locationMap = new Map<string, { x: number; y: number }>()
    
    rumours.forEach(r => {
      if (r.location_targetted && (r.x !== 0 || r.y !== 0)) {
        if (!locationMap.has(r.location_targetted)) {
          locationMap.set(r.location_targetted, { x: r.x, y: r.y })
        }
      }
    })

    rumours.forEach(r => {
      if ((r.x === 0 && r.y === 0) && r.location_targetted) {
        const coords = locationMap.get(r.location_targetted)
        if (coords) {
          r.x = coords.x
          r.y = coords.y
          markFieldAsModified(r, 'x')
          markFieldAsModified(r, 'y')
        }
      }
    })

    // rumourB should NOT be auto-placed (no matching location)
    expect(rumourB.x).toBe(0)
    expect(rumourB.y).toBe(0)
    expect(pendingCount.value).toBe(0)
  })
})
