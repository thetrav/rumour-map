import { describe, it, expect, beforeEach } from 'vitest'
import { useAddRumour } from '@/composables/useAddRumour'

describe('useAddRumour', () => {
  let addRumour: ReturnType<typeof useAddRumour>

  beforeEach(() => {
    addRumour = useAddRumour()
  })

  it('should initialize with correct default values', () => {
    expect(addRumour.isAddMode.value).toBe(false)
    expect(addRumour.pendingCoordinates.value).toBe(null)
    expect(addRumour.showForm.value).toBe(false)
  })

  it('should start add mode correctly', () => {
    addRumour.startAddMode()
    
    expect(addRumour.isAddMode.value).toBe(true)
    expect(addRumour.pendingCoordinates.value).toBe(null)
    expect(addRumour.showForm.value).toBe(false)
  })

  it('should capture coordinates when in add mode', () => {
    addRumour.startAddMode()
    
    const result = addRumour.captureCoordinates(1234, 5678)
    
    expect(result).toBe(true)
    expect(addRumour.pendingCoordinates.value).toEqual({ x: 1234, y: 5678 })
    expect(addRumour.showForm.value).toBe(true)
  })

  it('should not capture coordinates when not in add mode', () => {
    const result = addRumour.captureCoordinates(1234, 5678)
    
    expect(result).toBe(false)
    expect(addRumour.pendingCoordinates.value).toBe(null)
    expect(addRumour.showForm.value).toBe(false)
  })

  it('should cancel add mode correctly', () => {
    addRumour.startAddMode()
    addRumour.captureCoordinates(100, 200)
    
    addRumour.cancelAdd()
    
    expect(addRumour.isAddMode.value).toBe(false)
    expect(addRumour.pendingCoordinates.value).toBe(null)
    expect(addRumour.showForm.value).toBe(false)
  })

  it('should complete add correctly', () => {
    addRumour.startAddMode()
    addRumour.captureCoordinates(100, 200)
    
    addRumour.completeAdd()
    
    expect(addRumour.isAddMode.value).toBe(false)
    expect(addRumour.pendingCoordinates.value).toBe(null)
    expect(addRumour.showForm.value).toBe(false)
  })

  it('should handle multiple coordinate captures in add mode', () => {
    addRumour.startAddMode()
    
    addRumour.captureCoordinates(100, 200)
    expect(addRumour.pendingCoordinates.value).toEqual({ x: 100, y: 200 })
    
    // Capture new coordinates (simulating clicking a different spot)
    addRumour.captureCoordinates(300, 400)
    expect(addRumour.pendingCoordinates.value).toEqual({ x: 300, y: 400 })
  })
})
