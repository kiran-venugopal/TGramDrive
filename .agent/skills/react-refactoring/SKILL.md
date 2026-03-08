---
name: React Component Refactoring Best Practices
description: Guidelines for structuring React code, separating concerns, and creating granular components.
---

# React Component Refactoring Best Practices

When working on complex React components, especially page-level components, follow these best practices to ensure maintainability, readability, and reusability:

## 1. Separate Business Logic from UI Components (Custom Hooks)
- Never put complex state management, API calls, or side effects directly in the render component.
- Extract business logic into custom hooks (e.g., `useFiles`, `useUpload`, `useSelection`).
- Hooks should take simple inputs and return the state and handler functions needed by the UI.

## 2. Granular Components
- Break down massive files (like large `Dashboard.tsx` files) into smaller, single-responsibility components.
- Examples: 
  - `Toolbar.tsx` for headers and actions.
  - `FileCard.tsx` / `FolderCard.tsx` for individual items.
  - `FileGrid.tsx` / `FolderGrid.tsx` for mapping over arrays.
- If a component exceeds ~200 lines, it's likely doing too much and should be split.

## 3. Reusability
- Identify common patterns (e.g., Modals, Dropdowns, Grid Layouts) and extract them into shared generic components.
- Rely on shared types or interfaces (e.g., `src/types/index.ts`) rather than defining them local to each component.

## 4. Clear Prop Contracts
- When splitting components, clearly define `interface` or `type` for the props.
- Keep the number of props manageable. If a component takes too many props, consider passing a cohesive configuration object or rethinking the abstraction.
