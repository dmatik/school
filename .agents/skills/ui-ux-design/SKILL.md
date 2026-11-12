---
name: ui-ux-design
description: Modern clean UI/UX standards, design tokens, compact typography hierarchy, micro-interactions, and bilingual RTL/LTR guidelines for school.
---

# UI/UX Design System & Standards for `school`

Use this skill whenever designing or refining UI components, views, or micro-interactions in `school`.

---

## 1. Core Visual Principles

1. **Modern Clean Minimalism**:
   - Subtle depth over harsh borders: combine fine micro-borders (`border-border/60`) with soft ambient shadows (`shadow-xs` / `shadow-sm`).
   - Frosted glass surfaces (`backdrop-blur-md bg-background/80` or `bg-card/70`) for floating headers, sidebars, and navigation bars.
   - Refined Indigo-Blue primary palette (`from-blue-600 to-indigo-600` gradients, vibrant interactive focus states).

2. **Compact & Readable Density**:
   - Compact cards (`p-2.5 sm:p-3`, `gap-2 sm:gap-2.5`, `rounded-xl` or `rounded-2xl`).
   - High legibility: bold title (`text-sm sm:text-base font-bold`), muted secondary details (`text-xs font-medium text-muted-foreground`), distinct subject icons.
   - Quick-scan ergonomics: users should see relevant information without unnecessary scrolling.

3. **Bilingual & RTL Discipline**:
   - Zero hardcoded strings in JSX.
   - Exclusively logical CSS utilities (`start-`, `end-`, `ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`).
   - Radix primitives must receive `dir={i18n.dir()}`.

4. **Smooth Micro-Interactions**:
   - Smooth tap animations (`whileTap={{ scale: 0.98 }}` for desktop buttons, `whileTap={{ scale: 0.92 }}` for mobile navigation pills).
   - Smooth page transitions with `<AnimatePresence mode="wait">`.

---

## 2. Shared Storybook Component Catalog & Zero Duplication Mandate

1. **Zero UI Code Duplication**:
   - Every view in `src/components/` **must** be composed strictly of shared components from `src/components/ui/`.
   - Never write inline or duplicated markup for cards, sections, modals, dialogs, inputs, textareas, selects, date pickers, buttons, badges, or rows.
   - If a new UI pattern or variant is required, create or extend the shared component in `src/components/ui/` first, then import it in the view.

2. **Mandatory Storybook Synchronization (`src/stories/`)**:
   - Every new or updated shared component or variant **must** be added or updated in the Storybook catalog (`src/stories/`) and documented in `src/stories/Introduction.mdx`:
     - **1. Fields & Inputs (`src/stories/1-fields-and-inputs/`)**: `FilledInput`, `IconInput`, `CounterField`, `ReadOnlyPillField`, `TimePresetInput`, `FieldLabel`, `SearchInput`, `FilledTextarea`, `SelectField`, `SelectTrigger variant="filled"`, `DatePicker variant="filled"`, `LiquidDatePicker`, `Switch`, `Label`.
     - **2. Buttons & Navigation (`src/stories/2-buttons-and-nav/`)**: `Button`, `EditButton`, `DestructiveButton`, `ActionIconButton`, `SyncButton`, `LogoutButton`, `FloatingActionButton`, `Header`, `PageHeader`, `Sidebar`, `Dock`, `LiquidTabs`, `Tabs`.
     - **3. Badges & Pickers (`src/stories/3-badges-and-pickers/`)**: `ChildBadge`, `StatusBadge`, `DateBadge`, `SubjectIconBadge`, `UserAvatar`, `ColorSwatchPicker`.
     - **4. Surfaces & Modals (`src/stories/4-surfaces-and-cards/`)**: `SectionCard`, `Modal`, `ConfirmModal`, `HomeworkCard`, `IncidentCard`, `ExamCard`, `AdminUserRow`, `ScheduleTable`, `EmptyStateCard`, `InfoBox`, `SectionDateHeader`, `Separator`, `Login`.

---

## 3. Component Styling Guidelines

- **Section Cards (`SectionCard`)**:
  - Border & Surface: `rounded-2xl bg-card border border-border/40 dark:border-border/60 shadow-xs`.
  - Header action support via `headerAction` prop.
- **Modals (`Modal` & `ConfirmModal`)**:
  - Full-screen on mobile, centered card (`sm:rounded-xl sm:border`) on desktop.
  - All internal form fields and buttons inside modals must also use shared Storybook components (`FilledInput`, `FilledTextarea`, `CounterField`, `TimePresetInput`, `SelectTrigger variant="filled"`, `DatePicker variant="filled"`, `Button`).
- **Badges**:
  - Compact rounded-md or rounded-full pills with subtle border and low-opacity colored backgrounds.
- **Inputs & Selects**:
  - Height: `h-9` for compact controls, `rounded-full`, `bg-muted dark:bg-secondary border-transparent` (`variant="filled"` inside cards/modals).

