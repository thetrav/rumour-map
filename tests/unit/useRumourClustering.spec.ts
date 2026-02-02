/**
 * Tests for rumour clustering functionality
 */

import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useRumourClustering } from '../../src/composables/useRumourClustering'
import type { Rumour } from '../../src/types/rumour'

// Helper to create test rumour
const createRumour = (id: string, x: number, y: number): Rumour => ({
  id,
  x,
  y,
  title: `Rumour ${id}`,
  details: null,
  session_date: null,
  game_date: null,
  location_heard: null,
  location_targetted: null,
  rating: null,
  resolved: false,
  isPinned: true,
  isHovered: false,
  isHidden: false,
  isDragging: false,
  sheetRowNumber: 1,
  originalX: x,
  originalY: y,
  isModified: false,
})

describe('useRumourClustering', () => {
  it('should not cluster when rumours are far apart', () => {
    const rumours = ref([
      createRumour('1', 100, 100),
      createRumour('2', 500, 500),
      createRumour('3', 1000, 1000),
    ])

    const mapTransform = ref({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    expect(clusters.value).toHaveLength(3)
    expect(clusters.value[0].isCluster).toBe(false)
    expect(clusters.value[1].isCluster).toBe(false)
    expect(clusters.value[2].isCluster).toBe(false)
  })

  it('should cluster rumours within 100px radius', () => {
    // Two rumours 50px apart in screen space (scale = 1)
    const rumours = ref([
      createRumour('1', 100, 100),
      createRumour('2', 150, 100), // 50px away horizontally
      createRumour('3', 1000, 1000), // Far away
    ])

    const mapTransform = ref({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    // Should have 2 clusters: one with 2 rumours, one with 1
    expect(clusters.value).toHaveLength(2)
    
    const cluster1 = clusters.value[0]
    const cluster2 = clusters.value[1]
    
    // First cluster should contain 2 rumours
    expect(cluster1.rumours).toHaveLength(2)
    expect(cluster1.isCluster).toBe(true)
    
    // Second cluster should contain 1 rumour
    expect(cluster2.rumours).toHaveLength(1)
    expect(cluster2.isCluster).toBe(false)
  })

  it('should account for map scale when clustering', () => {
    // Two rumours 200px apart in map space
    const rumours = ref([
      createRumour('1', 100, 100),
      createRumour('2', 300, 100), // 200px away in map space
    ])

    // At scale 0.5, they are 100px apart in screen space
    const mapTransform = ref({
      scale: 0.5,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    // Should cluster because 200 * 0.5 = 100px in screen space
    expect(clusters.value).toHaveLength(1)
    expect(clusters.value[0].isCluster).toBe(true)
    expect(clusters.value[0].rumours).toHaveLength(2)
  })

  it('should not cluster when scaled differently', () => {
    // Two rumours 200px apart in map space
    const rumours = ref([
      createRumour('1', 100, 100),
      createRumour('2', 300, 100), // 200px away in map space
    ])

    // At scale 1, they are 200px apart in screen space (beyond threshold)
    const mapTransform = ref({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    // Should not cluster because 200px > 100px threshold
    expect(clusters.value).toHaveLength(2)
    expect(clusters.value[0].isCluster).toBe(false)
    expect(clusters.value[1].isCluster).toBe(false)
  })

  it('should handle diagonal distances correctly', () => {
    // Two rumours at 45 degree angle, ~70.7px apart in screen space
    const rumours = ref([
      createRumour('1', 100, 100),
      createRumour('2', 150, 150), // sqrt(50^2 + 50^2) = ~70.7px
    ])

    const mapTransform = ref({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    // Should cluster because ~70.7px < 100px
    expect(clusters.value).toHaveLength(1)
    expect(clusters.value[0].isCluster).toBe(true)
    expect(clusters.value[0].rumours).toHaveLength(2)
  })

  it('should cluster multiple rumours together', () => {
    // Create 5 rumours all close together
    const rumours = ref([
      createRumour('1', 100, 100),
      createRumour('2', 120, 100),
      createRumour('3', 140, 100),
      createRumour('4', 110, 120),
      createRumour('5', 130, 120),
    ])

    const mapTransform = ref({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    // All should be in one cluster
    expect(clusters.value).toHaveLength(1)
    expect(clusters.value[0].isCluster).toBe(true)
    expect(clusters.value[0].rumours).toHaveLength(5)
  })

  it('should update clusters when map transform changes', () => {
    const rumours = ref([
      createRumour('1', 100, 100),
      createRumour('2', 300, 100), // 200px away in map space
    ])

    const mapTransform = ref({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    // Initially not clustered (200px apart)
    expect(clusters.value).toHaveLength(2)

    // Zoom out - now they should cluster
    mapTransform.value.scale = 0.4

    // Should now be clustered (200 * 0.4 = 80px < 100px)
    expect(clusters.value).toHaveLength(1)
    expect(clusters.value[0].isCluster).toBe(true)
  })

  it('should calculate cluster center position correctly', () => {
    // Two rumours - center should be midpoint
    const rumours = ref([
      createRumour('1', 100, 100),
      createRumour('2', 200, 100),
    ])

    const mapTransform = ref({
      scale: 0.5,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    expect(clusters.value).toHaveLength(1)
    
    // Center should be at (150, 100) in map space
    // Screen coordinates: (150 * 0.5 + 0, 100 * 0.5 + 0) = (75, 50)
    const cluster = clusters.value[0]
    expect(cluster.screenX).toBe(75)
    expect(cluster.screenY).toBe(50)
  })

  it('should handle empty rumour list', () => {
    const rumours = ref<Rumour[]>([])
    const mapTransform = ref({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    expect(clusters.value).toHaveLength(0)
  })

  it('should handle single rumour', () => {
    const rumours = ref([createRumour('1', 100, 100)])
    const mapTransform = ref({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })

    const { clusters } = useRumourClustering(rumours, mapTransform, 100)

    expect(clusters.value).toHaveLength(1)
    expect(clusters.value[0].isCluster).toBe(false)
    expect(clusters.value[0].rumours).toHaveLength(1)
  })
})
