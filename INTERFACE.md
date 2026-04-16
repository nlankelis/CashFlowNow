# CashFlowNow Frontend Interface Documentation

## Overview
The frontend is a single-page React application built with Vite, TypeScript, and Tailwind CSS.

- Framework: React 19 (`frontend/src`)
- Build tool: Vite 7
- Language: TypeScript
- Styling: Tailwind CSS with utility classes and small custom CSS in `src/index.css`
- Icons: `lucide-react`
- File upload UX: `react-dropzone`

The UI currently uses local component state and mock data (no live API calls yet from the frontend).

## Project Structure
- `frontend/src/main.tsx`: App bootstrap and React root render.
- `frontend/src/App.tsx`: Top-level layout and screen switching.
- `frontend/src/components/Sidebar.tsx`: Primary navigation and sign-out button.
- `frontend/src/components/Header.tsx`: Top bar with greeting/date/profile badge.
- `frontend/src/components/DashboardHome.tsx`: Dashboard summary and upload CTA.
- `frontend/src/components/UploadScreen.tsx`: Drag-and-drop invoice upload screen.
- `frontend/src/components/ResultsScreen.tsx`: Post-processing success/results view.
- `frontend/src/components/HistoryScreen.tsx`: Historical invoice/funding table with summary cards.
- `frontend/src/index.css`: Tailwind layers and base custom styles.
- `frontend/tailwind.config.js`: Theme extensions (colors, fonts, radius).
- `frontend/vite.config.ts`: Vite React plugin setup.

## Navigation Model
This project does **not** use `react-router`. Screen navigation is in-memory via a union state in `App.tsx`:

- `home`
- `upload`
- `results`
- `history`

`App.tsx` controls navigation by passing callback props to child screens:

- Home -> Upload: `DashboardHome` calls `onUploadClick`
- Upload -> Results: `UploadScreen` calls `onResultsReady`
- Results -> Home: `ResultsScreen` calls `onBackToHome`
- Sidebar can jump to `home`, `upload`, or `history`

Implication: refresh resets the app to `home` because state is not persisted.

## Screen Behavior
### 1. Dashboard (`DashboardHome`)
- Displays static KPI cards and summary text.
- Main CTA button navigates to upload workflow.
- Values are currently hardcoded demo values.

### 2. Upload (`UploadScreen`)
- Supports drag-and-drop and file picker.
- Accepts PDFs only in `react-dropzone` config: `accept: { "application/pdf": [".pdf"] }`.
- Selected files are listed and removable by index.
- Processing is simulated (`setTimeout` 2800ms), then navigates to results.
- No backend call is executed yet.

### 3. Results (`ResultsScreen`)
- Shows success message and static funding metrics.
- Includes verification highlights and progress bar.
- "Back to Dashboard" returns to `home`.

### 4. History (`HistoryScreen`)
- Uses local `mockHistory` array.
- Computes `totalFunded` with `reduce`.
- Renders summary cards plus invoice history table.
- Export button is visual only; CSV export is not wired.

## State and Data Flow
Current state is local and component-scoped:

- Global-ish UI state in `App.tsx`: `currentScreen`
- Upload state in `UploadScreen.tsx`:
  - `files: File[]`
  - `isProcessing: boolean`
- History and dashboard metrics are hardcoded in component files.

There is no shared store (`Context`, Redux, Zustand) and no API cache layer.

## Styling and Design Tokens
Tailwind theme extensions in `tailwind.config.js`:

- `colors.primary = #00d4c8`
- `colors.navy = #0a2540`
- `fontFamily.heading = Space Grotesk`
- `fontFamily.sans = Inter, system_ui, sans-serif`
- `borderRadius.3xl = 1.5rem`

Custom base CSS in `src/index.css`:

- `--tw-color-primary` CSS variable
- `.heading-font` helper class

Note: `frontend/src/App.css` is default Vite scaffold CSS and is not used by `main.tsx`/`App.tsx`.

## Backend Integration Status
Backend includes a FastAPI endpoint in `backend/main.py`:

- `POST /process-invoice`
- Expects multipart upload with `file`
- Performs type checks and forwards file to an OCR provider

Frontend currently does not call this endpoint. The upload workflow is simulated.

## Local Development
From `frontend/`:

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build
npm run preview
npm run lint
```

## Known Gaps / Next Interface Tasks
1. Replace simulated processing in `UploadScreen` with real API calls.
2. Add loading/error/success states tied to server responses.
3. Persist navigation/session state if refresh continuity is needed.
4. Replace mock dashboard/history values with backend data.
5. Wire CSV export in `HistoryScreen`.
6. Consider route-based navigation (`react-router`) for deep-linking and browser history support.
