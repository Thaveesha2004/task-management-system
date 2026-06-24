# Taskora restyle — notes for review

Unattended **visual-only** restyle on branch `feature/ui-ux-improvements`, optimized for SAFETY.
Anything ambiguous, or that would require touching non-styling code, was **skipped and logged here**
rather than guessed. Each numbered step was committed separately; the production build was run after
each step and **passes** (`npm run build`, 97 modules, no errors). No logic/state/routing/API/socket/
role code was changed. `main` was not touched; nothing was pushed.

## How styling works (investigation result — step 1)
- Single global stylesheet `frontend/src/index.css` (~3425 lines) with a `:root` token block and a
  `[data-theme='dark']` block.
- Dark mode: `ThemeContext.jsx` sets `data-theme` on `<html>`. The new tokens' `:root[data-theme="dark"]`
  selector is compatible (same element); the existing `[data-theme='dark']` block was reused.
- Font: Google Fonts `<link>` in `frontend/index.html`; base family flows from `--font-body`/`--font-headline`.
- **Strategy: token bridge.** Existing variable NAMES were kept and their VALUES repointed to the Taskora
  palette, plus the new Taskora tokens were added. This re-skins the app globally with low-risk edits
  instead of find-replacing hundreds of literals. No variable was renamed (renaming an in-use var risks
  unaudited references). A read-only multi-agent audit + an adversarial safety pass informed the plan.

## What changed (committed, in order)
2. **Font** — `index.html` link swapped to Hanken Grotesk; `--font`/`--font-body`/`--font-headline` point at it.
3. **Tokens** — `:root` + dark block rewritten to the Taskora warm-orange palette (values repointed, names
   kept, new tokens added). `--primary*` → brand orange; `--danger/--success/--warning` → priority palette;
   cool-gray neutrals; warmer shadows; 7px/5px radii; decorative auth blobs recolored warm.
4. **Logo** — `frontend/public/taskora-logo.svg` added + wired as favicon; sidebar and login marks replaced
   with the new logomark (`viewBox 0 0 40 40`, `fill="currentColor"`); see logo note below.
5. **Per-screen** — borderless cards + soft shadows (stat/panel/bento/auth/task cards); kanban columns on
   `--surface-soft` with theme-aware status dots; tinted priority badges (Low now gray); **solid status
   pills** on the table `<select>` scoped to `.table-select.status-*`; brand orange for interactive only
   (sidebar CTA, view-toggle active, input focus, kanban drop); neutral stat-icon tiles; inputs on
   `--border-2`/`--card`; hardcoded badge/alert/glow colors mapped to tokens.
6. **Dark mode** — verified on every screen (login, dashboard, projects, board, table, modal) in both
   themes. Cards lift on columns, contrast holds, solid status pills stay legible. **No changes needed.**

## Safety guarantees preserved (verified)
- **Collaborators can still edit task status.** `TaskTableView.jsx` line 63 `disabled={!canManageTasks && false}`
  (always evaluates `false` → select never disabled) was **left byte-for-byte**. The live table `<select>`
  was confirmed `disabled: false` with its `onChange` intact. `TaskModal`'s status-select role logic was
  not touched. All status changes were appearance-only (scoped CSS).
- The shared `.status-pill` class (used by the Navbar WebSocket indicator and AdminUsers active/inactive
  badges) was **not** restyled; solid pills are scoped to `.table-select.status-*` only.
- No component className arrays, JSX logic, or markup structure were changed except the two presentational
  logo `<svg>` swaps and the favicon `<link>`.

## Deferred — skipped on purpose, please decide later
1. **Project cards stay gradient (not flat white).** The visual direction shows flat white project cards,
   but `gradient-blue/teal/purple` are applied in `ProjectCard.jsx`/`RecentWork.jsx` and also drive the
   live preview in `ProjectModal.jsx`'s "Card color" picker (Ocean/Mint/Violet). Flattening them globally
   would also flatten that picker's preview and undercut the control. Left as-is to avoid altering a
   user-facing control. (Note: the picker's chosen theme isn't currently persisted — `createProject`
   ignores it — and card color is positional `index % 3`; if you want flat white cards, that's a small
   CSS change once you decide the picker's fate.)
2. **Logo treatment differs from the mockup.** Your step-4 prose said *"set fill=currentColor and color it
   `var(--brand)`"*, so the mark is **orange on a soft peach chip**. The `taskora-visual-direction.html`
   instead showed a **white glyph on a solid-orange tile**. I followed the prose. To switch to the mockup
   look: set `.sidebar__brand .sidebar__logo` / `.auth-logo` `background: var(--brand); color: #fff;`.
3. **Login keeps its animated background (recolored, not removed).** The direction shows a flat login; the
   app renders `AuthBackground` (blobs + grid). Removing it is a markup change, so I only recolored the
   blobs warm via tokens. Remove `<AuthBackground />` from `Login.jsx` if you want the fully flat look.
4. **Modal header/footer not made sticky.** The direction shows a sticky modal header and footer. In
   `TaskModal.jsx` the actions live inside the scrolling `form.modal__body` and `CommentSection` renders
   after the form, so a true sticky footer needs a markup restructure. Recolored/respaced in place only.
5. **Assignee picker keeps its table layout.** The direction shows stacked checkbox rows; the app uses a
   selectable `data-table`. Converting is structural markup — restyled the existing container only.
6. **Table status `<select>` uses `appearance: none`** to render as a solid pill, which hides the native
   dropdown caret (still fully functional — click to open). Revert that one rule if you prefer a visible caret.
7. **Two decorative auth grid-line literals** (`index.css` ~734–735, `rgba(99,102,241,0.04)`) left as-is —
   barely visible; recoloring is cosmetic only.

## Stray files (untracked — not committed; safe to delete, left in place per the no-delete rule)
- `frontend/src/NOTES-FOR-REVIEW.md` — an audit artifact a planning sub-agent wrote (a duplicate defer
  list). It is NOT this canonical file (which lives at the repo root) and is not committed. Delete it.
- `.claude/launch.json` — local preview config added for verification. Safe to delete.

## To run locally
`cd frontend && npm run dev` (or `npm run build && npm run preview`). No new dependencies were added.
