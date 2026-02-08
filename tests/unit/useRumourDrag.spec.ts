import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useRumourDrag } from '@/composables/useRumourDrag'
import type { Rumour } from '@/types/rumour'

describe('useRumourDrag', () => {
  it('should calculate correct position when dragging at different zoom levels', () => {
    // Test at zoom level 1.0
    const mapTransform1 = {
      scale: 1.0,
      translateX: 0,
      translateY: 0
    }
    
    const rumour1: Partial<Rumour> = {
      id: 'R1',
      x: 1000,
      y: 500,
      isPinned: false,
      isDragging: false
    }
    
    const { startDrag } = useRumourDrag(mapTransform1)
    
    // Mock mouse event at the marker's screen position (which equals map position at scale 1.0)
    const mouseDownEvent = {
      preventDefault: vi.fn(),
      type: 'mousedown',
      clientX: 1000, // At marker position
      clientY: 500,
      button: 0
    } as any
    
    startDrag(rumour1 as Rumour, mouseDownEvent)
    
    expect(rumour1.isDragging).toBe(true)
    
    // Simulate mouse move 100px right and 50px down
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 1100,
      clientY: 550
    })
    
    document.dispatchEvent(mouseMoveEvent)
    
    // At scale 1.0, screen movement equals map movement
    expect(rumour1.x).toBe(1100)
    expect(rumour1.y).toBe(550)
    
    // Clean up
    const mouseUpEvent = new MouseEvent('mouseup')
    document.dispatchEvent(mouseUpEvent)
  })
  
  it('should calculate correct position when dragging at zoom level 2.0', () => {
    // Test at zoom level 2.0 (zoomed in)
    const mapTransform2 = {
      scale: 2.0,
      translateX: 100,
      translateY: 50
    }
    
    const rumour2: Partial<Rumour> = {
      id: 'R2',
      x: 1000,
      y: 500,
      isPinned: false,
      isDragging: false
    }
    
    const { startDrag } = useRumourDrag(mapTransform2)
    
    // At scale 2.0, the marker's screen position is:
    // screenX = (1000 * 2.0) + 100 = 2100
    // screenY = (500 * 2.0) + 50 = 1050
    const mouseDownEvent = {
      preventDefault: vi.fn(),
      type: 'mousedown',
      clientX: 2100, // At marker screen position
      clientY: 1050,
      button: 0
    } as any
    
    startDrag(rumour2 as Rumour, mouseDownEvent)
    
    expect(rumour2.isDragging).toBe(true)
    
    // Simulate mouse move 200px right and 100px down (in screen space)
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 2300,
      clientY: 1150
    })
    
    document.dispatchEvent(mouseMoveEvent)
    
    // At scale 2.0, 200px screen movement = 100px map movement
    // At scale 2.0, 100px screen movement = 50px map movement
    expect(rumour2.x).toBe(1100)
    expect(rumour2.y).toBe(550)
    
    // Clean up
    const mouseUpEvent = new MouseEvent('mouseup')
    document.dispatchEvent(mouseUpEvent)
  })
  
  it('should maintain marker position under cursor when clicking off-center', () => {
    const mapTransform = {
      scale: 1.0,
      translateX: 0,
      translateY: 0
    }
    
    const rumour: Partial<Rumour> = {
      id: 'R3',
      x: 1000,
      y: 500,
      isPinned: false,
      isDragging: false
    }
    
    const { startDrag } = useRumourDrag(mapTransform)
    
    // Click 10px to the right and 5px down from the marker's top-left corner
    const mouseDownEvent = {
      preventDefault: vi.fn(),
      type: 'mousedown',
      clientX: 1010,
      clientY: 505,
      button: 0
    } as any
    
    startDrag(rumour as Rumour, mouseDownEvent)
    
    // Simulate mouse move to position (1050, 525)
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 1050,
      clientY: 525
    })
    
    document.dispatchEvent(mouseMoveEvent)
    
    // The marker should move such that the point that was under the cursor stays under it
    // Initial offset: cursor at (1010, 505), marker at (1000, 500), offset = (10, 5)
    // New cursor at (1050, 525), so marker should be at (1040, 520)
    expect(rumour.x).toBe(1040)
    expect(rumour.y).toBe(520)
    
    // Clean up
    const mouseUpEvent = new MouseEvent('mouseup')
    document.dispatchEvent(mouseUpEvent)
  })
  
  it('should not start drag if rumour is pinned', () => {
    const mapTransform = {
      scale: 1.0,
      translateX: 0,
      translateY: 0
    }
    
    const rumour: Partial<Rumour> = {
      id: 'R4',
      x: 1000,
      y: 500,
      isPinned: true,
      isDragging: false
    }
    
    const { startDrag } = useRumourDrag(mapTransform)
    
    const mouseDownEvent = {
      preventDefault: vi.fn(),
      type: 'mousedown',
      clientX: 1000,
      clientY: 500,
      button: 0
    } as any
    
    startDrag(rumour as Rumour, mouseDownEvent)
    
    expect(rumour.isDragging).toBe(false)
  })
  
  it('should clamp position to map bounds', () => {
    const mapTransform = {
      scale: 1.0,
      translateX: 0,
      translateY: 0
    }
    
    const rumour: Partial<Rumour> = {
      id: 'R5',
      x: 6400,
      y: 3500,
      isPinned: false,
      isDragging: false
    }
    
    const { startDrag } = useRumourDrag(mapTransform)
    
    const mouseDownEvent = {
      preventDefault: vi.fn(),
      type: 'mousedown',
      clientX: 6400,
      clientY: 3500,
      button: 0
    } as any
    
    startDrag(rumour as Rumour, mouseDownEvent)
    
    // Try to move beyond map bounds
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 7000,
      clientY: 4000
    })
    
    document.dispatchEvent(mouseMoveEvent)
    
    // Should be clamped to maximum bounds
    expect(rumour.x).toBe(6500)
    expect(rumour.y).toBe(3600)
    
    // Clean up
    const mouseUpEvent = new MouseEvent('mouseup')
    document.dispatchEvent(mouseUpEvent)
  })

  it('should correctly read scale from reactive ref', () => {
    // Test with a reactive ref to ensure scale is read correctly
    const mapTransformRef = ref({
      scale: 1.5,
      translateX: 100,
      translateY: 50
    })
    
    const rumour: Partial<Rumour> = {
      id: 'R6',
      x: 1000,
      y: 500,
      isPinned: false,
      isDragging: false
    }
    
    const { startDrag } = useRumourDrag(mapTransformRef)
    
    // At scale 1.5, marker screen position is:
    // screenX = (1000 * 1.5) + 100 = 1600
    // screenY = (500 * 1.5) + 50 = 800
    const mouseDownEvent = {
      preventDefault: vi.fn(),
      type: 'mousedown',
      clientX: 1600,
      clientY: 800,
      button: 0
    } as any
    
    startDrag(rumour as Rumour, mouseDownEvent)
    
    expect(rumour.isDragging).toBe(true)
    
    // Move 150px right and 75px down in screen space
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 1750,
      clientY: 875
    })
    
    document.dispatchEvent(mouseMoveEvent)
    
    // At scale 1.5, 150px screen movement = 100px map movement
    // At scale 1.5, 75px screen movement = 50px map movement
    expect(rumour.x).toBe(1100)
    expect(rumour.y).toBe(550)
    
    // Clean up
    const mouseUpEvent = new MouseEvent('mouseup')
    document.dispatchEvent(mouseUpEvent)
  })
})
