# Rumours Feature Specification

**Version:** 1.0  
**Date:** 2026-01-31  
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose
The Rumours feature adds interactive, movable comment markers to the high-resolution map. These markers display rumors, points of interest, or annotations that can be repositioned by users and expanded to show detailed information.

### 1.2 Key Requirements
- Display rumours as floating markers overlaid on the map
- Load rumour data from a static `rumours.psv` file (pipe-separated values)
- Allow users to "unpin" and drag rumours to new positions
- Show title by default, expand to full description on hover
- Maintain rumour positions relative to map coordinates during zoom/pan

---

## 2. Data Format

### 2.1 PSV File Structure
**Filename:** `public/rumours.psv`

**Format:** Pipe-separated values (PSV) with no header row

**Schema:**
```
ID|x|y|title|description
```

**Field Definitions:**
- `ID` (string): Unique identifier for the rumour (e.g., "rumour_001", "R1")
- `x` (number): X-coordinate position on the map in pixels (0-6500 for the map image)
- `y` (number): Y-coordinate position on the map in pixels (0-3600 for the map image)
- `title` (string): Short title/summary displayed on the marker (recommended: < 50 characters)
- `description` (string): Extended description shown on hover (supports plain text)

**Example File Content:**
```
R1|1200|800|Dragon Sighting|Locals report seeing a large winged creature near the northern peaks. Unconfirmed but concerning.
R2|3400|1500|Abandoned Fort|Ancient fortifications found empty. Signs of recent occupation but no inhabitants remain.
R3|2100|2200|Trade Route Closed|Merchant caravans report bandits along the eastern trade road. Authorities investigating.
R4|4800|900|Mysterious Lights|Strange glowing lights seen at night near the old tower ruins. Source unknown.
```

### 2.2 Data Constraints
- Maximum 500 rumours per file (performance consideration)
- Title length: 1-100 characters
- Description length: 1-500 characters
- Coordinates must be within map bounds (x: 0-6500, y: 0-3600)
- Pipe characters (`|`) within content must be escaped or are not allowed

---

## 3. User Interface

### 3.1 Rumour Marker Appearance

#### Default State (Pinned)
- **Visual:** Card-like element with shadow and border
- **Size:** Auto width (max 200px), auto height based on title
- **Background:** Semi-transparent dark background (#161b22 with 90% opacity)
- **Border:** 1px solid with accent color (#58a6ff)
- **Icon:** Pin icon (📍) in top-left corner indicating pinned state
- **Text:** Title text displayed, truncated with ellipsis if too long
- **Cursor:** Pointer on hover
- **Z-index:** 100 (above map, below controls)

#### Hover State (Pinned)
- **Expansion:** Card expands smoothly to show full description below title
- **Max Width:** 300px
- **Animation:** 200ms ease-out transition
- **Shadow:** Enhanced drop shadow for depth
- **Z-index:** 101 (bring to front)
- **Background:** Slightly less transparent (95% opacity)

#### Unpinned State
- **Icon:** Pin icon replaced with drag handle (⋮⋮) or similar
- **Border Color:** Changes to indicate unpinned status (#f78166)
- **Cursor:** Grab cursor
- **Behavior:** Can be dragged to new positions

#### Dragging State
- **Cursor:** Grabbing
- **Opacity:** Slightly reduced (80%)
- **Z-index:** 102 (above all other rumours)
- **Shadow:** Elevated shadow effect

### 3.2 Rumour Marker Layout
```
┌─────────────────────────┐
│ 📍 [Title]          ❌  │  ← Header with pin/drag icon and close
├─────────────────────────┤
│ [Description]           │  ← Visible on hover or when expanded
│ (multiple lines)        │
└─────────────────────────┘
```

### 3.3 Interaction Patterns

#### Pinning/Unpinning
- **Trigger:** Click on pin icon (📍)
- **Action:** Toggles between pinned and unpinned states
- **Visual Feedback:** Icon changes, border color updates
- **State Persistence:** Unpinned state tracked in component state (not persisted to file)

#### Dragging
- **Precondition:** Rumour must be unpinned
- **Mouse:** Click and drag on the marker body (not the pin icon)
- **Touch:** Touch and drag on the marker body
- **Behavior:** 
  - Marker follows cursor/touch position
  - Position constrained to visible map area
  - Other rumours don't move
  - Drop position updates rumour coordinates

#### Hovering
- **Trigger:** Mouse pointer enters marker area
- **Action:** Expand to show full description
- **Delay:** 300ms before expansion starts
- **Unhover:** Collapses back to title-only after 200ms delay

#### Closing (Optional Feature)
- **Trigger:** Click 'X' button in top-right corner
- **Action:** Hides rumour from view
- **State:** Hidden state tracked in component (rumour can be un-hidden via settings)

---

## 4. Technical Implementation

### 4.1 Component Architecture

**New Components:**
- `RumourMarker.vue` - Individual rumour display and interaction
- `RumourOverlay.vue` - Container for all rumours, handles positioning
- `useRumours.js` - Composable for loading and managing rumour data
- `useRumourDrag.js` - Composable for drag-and-drop logic

**Modified Components:**
- `PanZoomMap.vue` - Integrate RumourOverlay, expose map transform data

### 4.2 Data Flow

```
1. App.vue mounts
2. PanZoomMap.vue loads
3. RumourOverlay.vue mounts
4. useRumours composable:
   - Fetches /rumours.psv
   - Parses PSV data
   - Returns reactive rumour list
5. RumourOverlay renders RumourMarker for each rumour
6. Each RumourMarker:
   - Calculates screen position from map coordinates
   - Listens to map transform changes (scale, translate)
   - Updates position in real-time
```

### 4.3 Coordinate System

**Map Coordinates (Data):**
- Origin: Top-left corner (0, 0)
- Range: x (0-6500), y (0-3600)
- Stored in `rumours.psv`

**Screen Coordinates (Display):**
- Calculated from map coordinates + map transform
- Formula: 
  ```javascript
  screenX = (mapX * scale) + translateX
  screenY = (mapY * scale) + translateY
  ```
- Updates on zoom/pan events

**Transform Tracking:**
- PanZoomMap provides reactive scale/translate values
- RumourOverlay subscribes to these values
- Each marker recalculates position when transform changes

### 4.4 State Management

**Rumour State (per marker):**
```javascript
{
  id: string,
  x: number,          // map coordinate
  y: number,          // map coordinate
  title: string,
  description: string,
  isPinned: boolean,  // default: true
  isHovered: boolean, // default: false
  isHidden: boolean,  // default: false
  isDragging: boolean // default: false
}
```

**Global State:**
```javascript
{
  rumours: Rumour[],      // array of rumour objects
  isLoading: boolean,     // PSV file loading state
  error: string | null,   // loading error message
  mapTransform: {         // from PanZoomMap
    scale: number,
    translateX: number,
    translateY: number
  }
}
```

### 4.5 PSV Parsing

**Implementation in `useRumours.js`:**
```javascript
async function loadRumours() {
  const response = await fetch('/rumours.psv')
  const text = await response.text()
  
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [id, x, y, title, description] = line.split('|')
      return {
        id,
        x: parseFloat(x),
        y: parseFloat(y),
        title,
        description,
        isPinned: true,
        isHovered: false,
        isHidden: false,
        isDragging: false
      }
    })
}
```

### 4.6 Drag Implementation

**Key Logic in `useRumourDrag.js`:**
```javascript
function useDraggable(rumour, mapTransform) {
  const startDrag = (event) => {
    if (rumour.isPinned) return
    
    rumour.isDragging = true
    const startX = event.clientX
    const startY = event.clientY
    const initialMapX = rumour.x
    const initialMapY = rumour.y
    
    const onMove = (e) => {
      const dx = (e.clientX - startX) / mapTransform.scale
      const dy = (e.clientY - startY) / mapTransform.scale
      
      rumour.x = initialMapX + dx
      rumour.y = initialMapY + dy
    }
    
    const onEnd = () => {
      rumour.isDragging = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
    }
    
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
  }
  
  return { startDrag }
}
```

---

## 5. Performance Considerations

### 5.1 Rendering Optimization
- **Virtualization:** If > 100 rumours, only render markers in viewport + buffer zone
- **Throttling:** Throttle position updates during pan/zoom (use requestAnimationFrame)
- **CSS Transforms:** Use `transform: translate()` for positioning (GPU-accelerated)
- **Lazy Expansion:** Description content only rendered after hover delay

### 5.2 Memory Management
- Clean up event listeners when markers unmount
- Debounce hover state changes (avoid rapid show/hide)
- Limit simultaneous expanded markers (close others when one expands)

### 5.3 Touch Performance
- Use touch-action CSS to prevent scroll conflicts
- Implement touch drag with 300ms delay to distinguish from tap
- Prevent default touch behaviors on marker elements

---

## 6. Accessibility

### 6.1 Keyboard Navigation
- Rumours should be focusable via Tab key
- Enter/Space: Toggle pin state
- Arrow keys: Move unpinned rumours in small increments
- Escape: Re-pin if unpinned

### 6.2 Screen Readers
- Markers should have ARIA labels: `aria-label="Rumour: {title}"`
- Pin button: `aria-label="Unpin this rumour to move it"`
- Expanded state: `aria-expanded="true/false"`
- Description: Use `aria-describedby` linking to description element

### 6.3 Visual Accessibility
- Text contrast ratio ≥ 4.5:1 (WCAG AA)
- Minimum marker size: 44x44px (WCAG 2.5.5)
- Focus indicators visible and distinct
- Support browser text zoom up to 200%

---

## 7. Responsive Design

### 7.1 Desktop (≥ 1024px)
- Default marker sizes as specified
- Hover expansion on mouse enter
- Full drag-and-drop support

### 7.2 Tablet (768px - 1023px)
- Slightly smaller markers (max-width: 180px)
- Touch drag enabled
- Tap to expand instead of hover

### 7.3 Mobile (< 768px)
- Compact markers (max-width: 150px)
- Tap to expand/collapse
- Long-press to unpin (prevent accidental unpinning)
- Reduced font sizes

---

## 8. Edge Cases & Error Handling

### 8.1 Data Loading Errors
- **No file found:** Display message in place of rumours: "No rumours available"
- **Parse error:** Log error, skip malformed lines, display valid rumours
- **Network error:** Show retry button

### 8.2 Invalid Coordinates
- **Out of bounds:** Clamp to map edges (x: 0-6500, y: 0-3600)
- **NaN values:** Skip rumour, log warning

### 8.3 Drag Boundary Constraints
- Prevent dragging rumours outside map bounds
- Snap back if released outside valid area
- Clamp position during drag

### 8.4 Overlapping Rumours
- Allow overlaps (intentional placement)
- Bring active/hovered rumour to front (z-index)
- Consider optional "spread" feature to auto-distribute overlapping markers

---

## 9. Future Enhancements (Out of Scope for v1)

### 9.1 Persistence
- Save unpinned positions to localStorage
- Export modified positions back to PSV format
- User-created rumours (POST to server)

### 9.2 Filtering & Search
- Filter by keywords in title/description
- Category/tag support in PSV format
- Toggle visibility by category

### 9.3 Rich Content
- Markdown support in descriptions
- Image attachments
- Links to external resources

### 9.4 Collaboration
- Real-time updates from other users
- Voting/rating system for rumours
- User attribution

---

## 10. Testing Strategy

### 10.1 Unit Tests
- PSV parsing with valid/invalid data
- Coordinate transformation calculations
- Drag boundary constraints
- Pin/unpin state toggles

### 10.2 Integration Tests
- Loading rumours and displaying markers
- Dragging updates coordinates correctly
- Hover expansion/collapse timing
- Map zoom/pan updates marker positions

### 10.3 Manual Testing Checklist
- [ ] Load 10 rumours from PSV file
- [ ] Verify all rumours display at correct positions
- [ ] Zoom in/out - rumours maintain relative positions
- [ ] Pan map - rumours move with map
- [ ] Hover over rumour - description expands smoothly
- [ ] Unpin rumour - icon changes, can drag
- [ ] Drag unpinned rumour - position updates
- [ ] Try to drag pinned rumour - no movement
- [ ] Re-pin dragged rumour - locks at new position
- [ ] Test on mobile with touch gestures
- [ ] Verify keyboard navigation works
- [ ] Check screen reader announcements

---

## 11. Implementation Phases

### Phase 1: Basic Display (MVP)
- Parse and load `rumours.psv`
- Display rumours at fixed positions
- Show title only
- Hover to expand description
- Rumours transform with map zoom/pan

### Phase 2: Drag & Drop
- Unpin/pin functionality
- Drag unpinned rumours
- Update coordinates on drag end
- Boundary constraints

### Phase 3: Polish & Accessibility
- Animations and transitions
- Keyboard navigation
- ARIA labels and screen reader support
- Mobile touch gestures
- Responsive sizing

### Phase 4: Error Handling & Optimization
- Loading states and error messages
- Viewport-based rendering optimization
- Performance testing with 100+ rumours

---

## 12. Success Criteria

The rumours feature is considered complete when:

- ✅ PSV file loads and parses successfully
- ✅ All rumours display at correct map coordinates
- ✅ Rumours maintain position during zoom/pan operations
- ✅ Hover expansion works smoothly with proper timing
- ✅ Pin/unpin toggles work reliably
- ✅ Drag-and-drop functions for unpinned rumours
- ✅ Keyboard navigation is fully functional
- ✅ Screen readers can access all content
- ✅ Touch gestures work on mobile devices
- ✅ Performance maintains 60fps with 50+ rumours
- ✅ No console errors or warnings
- ✅ Meets all accessibility standards (WCAG AA)

---

## 13. Open Questions

1. Should rumour positions persist across sessions (localStorage)?
2. Should there be a maximum number of expanded rumours at once?
3. Should rumours be sortable by a priority/importance field?
4. Should there be a "hide all/show all" toggle for rumours?
5. Should dragging be allowed on pinned rumours (with confirmation)?

---

**Document Status:** Ready for review and implementation planning.
