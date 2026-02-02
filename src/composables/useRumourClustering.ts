/**
 * Composable for clustering rumours in screen space
 * Groups pins within 100px radius for better visual density
 */

import { computed, Ref } from 'vue'
import type { Rumour } from '../types/rumour'

export interface MapTransform {
  scale: number
  translateX: number
  translateY: number
}

export interface ClusteredRumour {
  id: string
  rumours: Rumour[]
  screenX: number
  screenY: number
  isCluster: boolean
}

/**
 * Convert map coordinates to screen coordinates
 */
function toScreenCoords(
  mapX: number,
  mapY: number,
  transform: MapTransform
): { x: number; y: number } {
  return {
    x: mapX * transform.scale + transform.translateX,
    y: mapY * transform.scale + transform.translateY,
  }
}

/**
 * Calculate distance between two points in screen space
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Naive clustering algorithm: groups rumours within 100px radius
 * The first rumour in each pass initiates a new cluster, then all
 * nearby rumours (within radius) are added to it. The cluster center
 * is calculated as the centroid (average position) of all rumours in the cluster.
 */
function clusterRumours(
  rumours: Rumour[],
  transform: MapTransform,
  clusterRadius: number = 100
): ClusteredRumour[] {
  const clustered: ClusteredRumour[] = []
  const processed = new Set<string>()

  for (const rumour of rumours) {
    if (processed.has(rumour.id)) continue

    // Calculate screen position for this rumour
    const screenPos = toScreenCoords(rumour.x, rumour.y, transform)

    // Find all nearby rumours within cluster radius
    const cluster: Rumour[] = [rumour]
    processed.add(rumour.id)

    for (const other of rumours) {
      if (processed.has(other.id)) continue

      const otherScreenPos = toScreenCoords(other.x, other.y, transform)
      const dist = distance(
        screenPos.x,
        screenPos.y,
        otherScreenPos.x,
        otherScreenPos.y
      )

      if (dist <= clusterRadius) {
        cluster.push(other)
        processed.add(other.id)
      }
    }

    // Calculate cluster center (average position)
    const centerX =
      cluster.reduce((sum, r) => sum + r.x, 0) / cluster.length
    const centerY =
      cluster.reduce((sum, r) => sum + r.y, 0) / cluster.length
    const centerScreen = toScreenCoords(centerX, centerY, transform)

    clustered.push({
      id: cluster.map((r) => r.id).join('-'),
      rumours: cluster,
      screenX: centerScreen.x,
      screenY: centerScreen.y,
      isCluster: cluster.length > 1,
    })
  }

  return clustered
}

/**
 * Composable for clustering rumours based on screen space proximity
 */
export function useRumourClustering(
  rumours: Ref<Rumour[]>,
  mapTransform: Ref<MapTransform>,
  clusterRadius: number = 100
) {
  const clusters = computed(() => {
    return clusterRumours(rumours.value, mapTransform.value, clusterRadius)
  })

  return {
    clusters,
  }
}
