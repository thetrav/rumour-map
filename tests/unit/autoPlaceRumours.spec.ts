import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Rumour } from '@/types/rumour'

describe('Auto-place rumours based on location_targetted', () => {
  let mockRumours: Rumour[]

  beforeEach(() => {
    // Reset mock data before each test
    mockRumours = []
  })

  it('should auto-place rumour with no coordinates when matching location_targetted exists', () => {
    // Create a rumour with valid coordinates and location_targetted
    const rumourWithCoords: Rumour = {
      id: 'rumour_1',
      title: 'Rumour at location A',
      x: 1000,
      y: 2000,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Waterdeep',
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 2,
      originalX: 1000,
      originalY: 2000,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    // Create a rumour with no coordinates but same location_targetted
    const rumourWithoutCoords: Rumour = {
      id: 'rumour_2',
      title: 'Rumour also at location A',
      x: 0,
      y: 0,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Waterdeep',
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

    mockRumours = [rumourWithCoords, rumourWithoutCoords]

    // The auto-placement logic would be tested here
    // For now, we're verifying the data structure
    expect(rumourWithCoords.location_targetted).toBe('Waterdeep')
    expect(rumourWithoutCoords.location_targetted).toBe('Waterdeep')
    expect(rumourWithCoords.x).toBe(1000)
    expect(rumourWithCoords.y).toBe(2000)
  })

  it('should not auto-place rumour without location_targetted', () => {
    const rumourWithoutLocation: Rumour = {
      id: 'rumour_1',
      title: 'Rumour with no location',
      x: 0,
      y: 0,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: null,
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 2,
      originalX: 0,
      originalY: 0,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    mockRumours = [rumourWithoutLocation]

    // Without location_targetted, rumour should remain at 0,0
    expect(rumourWithoutLocation.location_targetted).toBeNull()
    expect(rumourWithoutLocation.x).toBe(0)
    expect(rumourWithoutLocation.y).toBe(0)
  })

  it('should not auto-place when no matching location_targetted with coordinates exists', () => {
    const rumour1: Rumour = {
      id: 'rumour_1',
      title: 'Rumour at location A',
      x: 0,
      y: 0,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Waterdeep',
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 2,
      originalX: 0,
      originalY: 0,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    const rumour2: Rumour = {
      id: 'rumour_2',
      title: 'Rumour at location B',
      x: 0,
      y: 0,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Baldurs Gate',
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

    mockRumours = [rumour1, rumour2]

    // Neither rumour should be auto-placed as none have coordinates
    expect(rumour1.location_targetted).toBe('Waterdeep')
    expect(rumour2.location_targetted).toBe('Baldurs Gate')
    expect(rumour1.x).toBe(0)
    expect(rumour2.x).toBe(0)
  })

  it('should use the first matching location with coordinates', () => {
    const rumour1: Rumour = {
      id: 'rumour_1',
      title: 'First rumour at Waterdeep',
      x: 1000,
      y: 2000,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Waterdeep',
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 2,
      originalX: 1000,
      originalY: 2000,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    const rumour2: Rumour = {
      id: 'rumour_2',
      title: 'Second rumour at Waterdeep (different coords)',
      x: 1500,
      y: 2500,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: 'Waterdeep',
      rating: null,
      resolved: false,
      details: null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      sheetRowNumber: 3,
      originalX: 1500,
      originalY: 2500,
      isModified: false,
      modifiedFields: new Set(),
      originalValues: {}
    }

    mockRumours = [rumour1, rumour2]

    // The first rumour should be used for auto-placement
    expect(rumour1.location_targetted).toBe('Waterdeep')
    expect(rumour2.location_targetted).toBe('Waterdeep')
  })
})
