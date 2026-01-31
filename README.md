# Rumour Map

A Vue.js 3 application for viewing high-resolution maps with pan, zoom, and interactive rumour markers. Rumours are displayed as floating comment markers that can be expanded, unpinned, and dragged to new positions.

🌐 **Live Demo:** [https://surpdeh.github.io/rumour-map/](https://surpdeh.github.io/rumour-map/)

## Features

### Map Navigation
- **Vue.js 3** with Composition API
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **GitHub Primer CSS** (spec-kit) for GitHub-style UI components
- **Pan and Zoom** functionality for high-resolution images (6500 x 3600)
- Touch support for mobile devices (pinch-to-zoom, swipe-to-pan)
- Responsive design for desktop, tablet, and mobile
- Control buttons for zoom in/out and reset view

### Rumours Feature ✨
- **Interactive Markers**: Display rumours as floating markers on the map
- **Hover Expansion**: Hover over markers to see full descriptions (300ms delay)
- **Pin/Unpin**: Toggle between pinned (fixed) and unpinned (draggable) states
- **Drag & Drop**: Drag unpinned rumours to new positions on the map
- **Boundary Constraints**: Rumours stay within map bounds during dragging
- **Coordinate Tracking**: Rumours maintain relative positions during zoom/pan
- **Loading States**: Visual feedback while rumours load from file
- **Error Handling**: Graceful handling of missing or malformed data
- **Touch Gestures**: Tap to expand, long-press for mobile interactions
- **Keyboard Navigation**: Full keyboard support for accessibility
  - **Tab**: Navigate between rumours
  - **Enter/Space**: Toggle pin state
  - **Arrow Keys**: Move unpinned rumours (10px increments)
  - **Escape**: Re-pin an unpinned rumour
- **Screen Reader Support**: ARIA labels and roles for accessibility
- **Responsive Sizing**: Markers adapt to screen size (mobile/tablet/desktop)

## Screenshots

![Rumours Feature](https://github.com/user-attachments/assets/2835a0fe-f923-4964-95be-165704d42cbb)
*Initial view with rumour markers displayed on the map*

![Expanded Rumour](https://github.com/user-attachments/assets/72611b11-849b-4908-be0b-9d1aa22ae45e)
*Rumour expanded on hover showing full description*

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Build

```bash
npm run build
```

Builds the application for production to the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

Preview the production build locally at `http://localhost:4173/rumour-map/`

## Rumours Data Format

Rumours are loaded from a static `public/rumours.psv` file (Pipe-Separated Values).

### File Format

```
ID|x|y|title|description
```

### Field Definitions

- **ID** (string): Unique identifier (e.g., "R1", "rumour_001")
- **x** (number): X-coordinate on map in pixels (0-6500)
- **y** (number): Y-coordinate on map in pixels (0-3600)
- **title** (string): Short title displayed on marker (< 50 chars recommended)
- **description** (string): Extended description shown on hover (< 500 chars recommended)

### Example File

```
R1|1200|800|Dragon Sighting|Locals report seeing a large winged creature near the northern peaks. Unconfirmed but concerning.
R2|3400|1500|Abandoned Fort|Ancient fortifications found empty. Signs of recent occupation but no inhabitants remain.
R3|2100|2200|Trade Route Closed|Merchant caravans report bandits along the eastern trade road. Authorities investigating.
```

### Adding New Rumours

1. Open `public/rumours.psv` in a text editor
2. Add a new line with pipe-separated values
3. Ensure coordinates are within map bounds (x: 0-6500, y: 0-3600)
4. Save the file
5. Rebuild and deploy (or refresh in development mode)

### Constraints

- Maximum 500 rumours per file (for performance)
- Coordinates outside bounds will be clamped to edges
- Malformed lines are skipped with console warnings
- Pipe characters (`|`) within content are not allowed

## Deployment

### GitHub Pages

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

#### Prerequisites

1. Enable GitHub Pages in repository settings:
   - Go to **Settings** → **Pages**
   - Source: **GitHub Actions**

2. Ensure the workflow has proper permissions:
   - Go to **Settings** → **Actions** → **General**
   - Workflow permissions: **Read and write permissions**

#### Automatic Deployment

The deployment workflow (`.github/workflows/deploy.yml`) automatically:
- Triggers on push to `main` branch
- Installs dependencies
- Builds the application
- Deploys to GitHub Pages

#### Manual Deployment

You can also trigger deployment manually:
1. Go to **Actions** tab in GitHub
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"

The deployed site will be available at: `https://surpdeh.github.io/rumour-map/`

## Project Structure

```
rumour-map/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
├── public/
│   └── rumours.psv             # Rumours data file
├── src/
│   ├── components/
│   │   ├── PanZoomMap.vue      # Main map component with pan/zoom
│   │   ├── RumourMarker.vue    # Individual rumour marker
│   │   └── RumourOverlay.vue   # Container for all rumours
│   ├── composables/
│   │   ├── useRumours.js       # Rumours data loading & parsing
│   │   └── useRumourDrag.js    # Drag-and-drop logic
│   ├── App.vue                 # Root component
│   ├── main.js                 # Application entry point
│   └── style.css               # Global styles
├── vite.config.js              # Vite configuration (with base path)
├── tailwind.config.js          # Tailwind CSS configuration
└── package.json                # Dependencies and scripts
```

## Technologies

- [Vue.js 3](https://vuejs.org/) - Progressive JavaScript framework
- [Vite](https://vitejs.dev/) - Next generation frontend tooling
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [GitHub Primer CSS](https://primer.style/css/) - GitHub's design system

## Architecture

This application follows the spec-kit constitution and RUMOURS_SPECIFICATION.md for implementation guidelines.

### Key Design Decisions

- **Composition API**: Uses Vue 3 `<script setup>` syntax for cleaner components
- **Coordinate System**: Map coordinates (0-6500, 0-3600) transform to screen coordinates using scale/translate
- **State Management**: Reactive refs in composables (no Vuex/Pinia needed)
- **Performance**: CSS transforms for positioning (GPU-accelerated), boundary constraints during drag
- **Accessibility**: Full keyboard navigation, ARIA labels, screen reader support

## Browser Support

- Chrome/Edge (Chromium) - last 2 versions
- Firefox - last 2 versions
- Safari - last 2 versions
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

This project follows the principles outlined in `speckit.constitution`:
- Simplicity first
- Composition API standards
- Minimal dependencies
- Accessibility compliance (WCAG AA)
- Performance optimization (60fps target)

## License

See LICENSE file for details.

---

**Map Image Credit:** The Savage Frontier by Yora (Player Map v2)  
**Repository:** [surpdeh/rumour-map](https://github.com/surpdeh/rumour-map)
