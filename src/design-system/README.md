# WaifuDesk UI foundations

UI primitives here are **presentation only**. Data access remains in `src/hooks` and Tauri commands remain in `src-tauri`.

- `components/Button.tsx`: keyboard-accessible action with primary, secondary, ghost and icon variants.
- `components/Panel.tsx`: consistent surfaces with title and optional action.
- `components/Badge.tsx`: compact neutral, success and warning labels.
- `src/styles/01-tokens.css`: single source of truth for theme colors, spacing and radii. Existing CSS variable names remain as compatibility aliases.
- `src/styles/12-primitives.css`: isolated styles for the reusable components.

Do not add a new global CSS override for each design change. Update the source rule in its owning stylesheet instead.
