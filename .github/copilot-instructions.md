# Rumour Map - Copilot Instructions

This repository contains a Vue.js 3 application for viewing high-resolution maps with interactive rumour markers. The application uses Google Sheets for data management and allows users to pan, zoom, and interact with markers on the map.

## Project Overview

**Purpose**: Single-page application for displaying an interactive map with movable rumour markers that sync with Google Sheets.

**Live Demo**: https://surpdeh.github.io/rumour-map/

## Technology Stack

- **Framework**: Vue.js 3 with Composition API
- **Language**: TypeScript (mandatory for all code)
- **Build Tool**: Vite 7.2
- **Styling**: Tailwind CSS 3.4 + GitHub Primer CSS
- **Testing**: Vitest
- **Data Source**: Google Sheets API v4 with OAuth2 authentication
- **Dependencies**: gapi-script 1.2, Google Identity Services

## Project Structure

```
rumour-map/
├── .github/
│   ├── workflows/       # CI/CD workflows (deploy, preview)
│   ├── agents/          # Spec-kit agent definitions
│   └── prompts/         # Spec-kit prompts
├── .specify/
│   └── memory/
│       └── constitution.md  # Core development principles
├── public/
│   └── rumours.psv     # Legacy data file (deprecated)
├── src/
│   ├── components/     # Vue components
│   ├── composables/    # Reusable composition functions
│   ├── config/         # Configuration files
│   ├── types/          # TypeScript type definitions
│   └── App.vue         # Root component
├── tests/              # Test files
├── specs/              # Feature specifications
└── plans/              # Implementation plans
```

## Key Commands

```bash
# Development
npm run dev              # Start dev server at localhost:5173

# Building
npm run build           # Production build to dist/
npm run preview         # Preview production build

# Testing
npm test                # Run tests with Vitest
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage report
```

## Code Standards

### 1. TypeScript Required
- **ALL** code must be written in TypeScript
- Use `<script setup lang="ts">` in Vue components
- Define proper types for all functions and variables
- Avoid `any` types; use proper type definitions

### 2. Vue 3 Composition API
- Always use Composition API with `<script setup>` syntax
- Extract reusable logic into composables (prefix with `use`, e.g., `useMapControls`)
- Keep components under 300 lines; refactor if larger
- Use meaningful prop and emit names

### 3. Styling with Tailwind
- Use Tailwind CSS classes for all styling
- Follow responsive design patterns (mobile-first)
- Maintain minimum 44x44px touch targets for accessibility
- Use GitHub Primer CSS for UI components

### 4. Component Patterns
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Rumour } from '@/types'

interface Props {
  rumour: Rumour
  isExpanded?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [rumour: Rumour]
}>()
</script>
```

### 5. Naming Conventions
- **Components**: PascalCase (e.g., `RumourMarker.vue`)
- **Composables**: camelCase with `use` prefix (e.g., `useRumourDrag.ts`)
- **Types/Interfaces**: PascalCase (e.g., `RumourData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_ZOOM_LEVEL`)
- **Variables/Functions**: camelCase

## Architecture Guidelines

### Constitution & Specifications
This project follows strict architectural principles:

1. **Read the Constitution**: `.specify/memory/constitution.md` contains foundational principles
2. **Follow Specifications**: `RUMOURS_SPECIFICATION.md` defines feature requirements
3. **Check Plans**: `plans/` directory contains implementation plans

### Key Principles from Constitution
- **Simplicity First**: Prioritize simple, readable solutions
- **Performance**: Maintain 60fps during interactions using CSS transforms
- **Accessibility**: WCAG AA compliance, keyboard navigation, screen readers
- **Minimal Dependencies**: Prefer native browser APIs
- **Testing**: Focus on critical user interactions

### Data Flow
1. User authenticates with Google OAuth2
2. App loads rumours from Google Sheets
3. Rumours displayed as markers with coordinates
4. Users can drag markers to new positions
5. Changes tracked in-memory (amber border indicator)
6. Batch updates pushed back to Google Sheets

## Development Workflows

### Adding New Features
1. Review constitution and specifications first
2. Check existing implementations in `src/components/` and `src/composables/`
3. Follow TypeScript and Vue 3 patterns
4. Write tests in `tests/` directory
5. Update documentation if needed

### Common Tasks

#### Adding a New Component
```typescript
// src/components/NewComponent.vue
<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  action: [value: string]
}>()
</script>

<template>
  <div class="p-4 bg-white rounded shadow">
    <h2 class="text-lg font-bold">{{ props.title }}</h2>
  </div>
</template>
```

#### Creating a Composable
```typescript
// src/composables/useFeature.ts
import { ref, computed } from 'vue'
import type { FeatureData } from '@/types'

export function useFeature() {
  const data = ref<FeatureData[]>([])
  const isLoading = ref(false)
  
  const filteredData = computed(() => {
    return data.value.filter(item => item.active)
  })
  
  async function loadData() {
    isLoading.value = true
    try {
      // Implementation
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    data,
    isLoading,
    filteredData,
    loadData
  }
}
```

## Testing Guidelines

- Use Vitest for all tests
- Colocate tests with components (e.g., `Component.spec.ts`)
- Focus on integration tests for user scenarios
- Test critical interactions: pan, zoom, drag, OAuth flow
- Mock external APIs (Google Sheets)
- Verify accessibility features

### Example Test
```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import RumourMarker from '@/components/RumourMarker.vue'

describe('RumourMarker', () => {
  it('renders rumour title', () => {
    const wrapper = mount(RumourMarker, {
      props: {
        rumour: {
          id: 'R1',
          title: 'Test Rumour',
          x: 100,
          y: 200
        }
      }
    })
    expect(wrapper.text()).toContain('Test Rumour')
  })
})
```

## Performance Requirements

- **Initial Load**: < 2 seconds on 3G
- **Bundle Size**: < 200KB gzipped
- **Frame Rate**: 60fps during pan/zoom
- **Memory**: No leaks during extended use

### Optimization Tips
- Use CSS transforms (not position changes)
- Throttle/debounce expensive operations
- Clean up event listeners in lifecycle hooks
- Lazy-load non-critical assets

## Accessibility

- All interactive elements keyboard accessible
- Semantic HTML (use `<button>` not `<div>` with click handlers)
- ARIA labels for icon-only controls
- Color contrast meets WCAG AA standards
- Support browser zoom up to 200%
- Test with screen readers

## Google Sheets Integration

### OAuth Flow
1. User clicks "Sign In with Google"
2. OAuth2 consent screen (requires write permissions)
3. Token stored for API calls
4. Re-authentication needed if token expires

### API Operations
- **Read**: Fetch rumours from spreadsheet
- **Write**: Batch update rumour positions
- **Rate Limiting**: Handle 429 errors gracefully
- **Error Handling**: Show user-friendly messages

### Data Schema
Spreadsheet columns: ID | x | y | title | description | session_date | game_date | locations | rumour_rating | status

## Git Workflow

### Commit Message Format
```
<type>: <description>

Types: feat, fix, refactor, perf, docs, test
Examples:
  feat: Add drag-and-drop for rumour markers
  fix: Resolve OAuth token expiration issue
  refactor: Extract zoom logic into composable
```

### Branch Strategy
- `main` branch is always deployable
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Delete branches after merging

## Deployment

- **Production**: Auto-deploys to GitHub Pages on push to `main`
- **PR Previews**: Every PR gets a preview at `https://surpdeh.github.io/rumour-map/pr-{number}/`
- **Environment Variables**: Configure in `.env.local` (not committed)

## Common Pitfalls to Avoid

1. ❌ Don't use `any` type in TypeScript
2. ❌ Don't manipulate DOM directly; use Vue refs
3. ❌ Don't use position properties for animations (use transforms)
4. ❌ Don't forget to clean up event listeners
5. ❌ Don't commit secrets or API keys
6. ❌ Don't add dependencies without justification
7. ❌ Don't skip accessibility features
8. ❌ Don't ignore the constitution principles

## Helpful References

- **Constitution**: `.specify/memory/constitution.md` - Core principles
- **Specification**: `RUMOURS_SPECIFICATION.md` - Feature requirements
- **README**: `README.md` - Setup and usage instructions
- **Google Sheets Setup**: `specs/001-google-sheets-integration/quickstart.md`

## Questions?

When working on this codebase:
1. Check the constitution first for principles
2. Review existing code patterns
3. Maintain consistency with established patterns
4. Ask for clarification if requirements are unclear
5. Prioritize simplicity and maintainability

---

**Last Updated**: 2026-02-03
**Maintained By**: Project contributors following spec-kit methodology
