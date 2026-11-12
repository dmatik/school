# UI & Internationalization (RTL / Bi-directional) Rules

## 1. Bi-directional (RTL / LTR) Layouts

The application defaults to Hebrew (`dir="rtl"`) and supports English (`dir="ltr"`).

### Mandatory Styling Rules
* **No Physical Directions**: Never use `left-`, `right-`, `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, or `text-right` for layout positioning.
* **Use Logical Properties**:
  * Padding: `ps-` (padding-inline-start) and `pe-` (padding-inline-end) instead of `pl-` / `pr-`.
  * Margin: `ms-` (margin-inline-start) and `me-` (margin-inline-end) instead of `ml-` / `mr-`.
  * Positioning: `start-` and `end-` instead of `left-` and `right-`.
  * Text Alignment: `text-start` and `text-end` instead of `text-left` and `text-right`.
* **Direction Provider**: All root-level modals, dialogs, and views must be wrapped with `<DirectionProvider dir={i18n.dir()}>` to ensure Radix primitives align to the correct side.
* **Dropdowns & Popovers**: Radix Select and Dropdown components must pass `dir={i18n.dir()}`.

---

## 2. Bilingual Text & Translation Management

### Mandatory Rules
1. **Zero Hardcoded Text**: No user-facing strings may appear directly in JSX.
2. **Synchronized Updates**: Whenever adding or modifying a translation key, **both** files must be updated simultaneously:
   * [`src/locales/he.json`](../../src/locales/he.json) (Hebrew translation)
   * [`src/locales/en.json`](../../src/locales/en.json) (English translation)
3. **Namespacing**: Keep keys grouped logically under their feature area:
   * `common.*`: Shared button labels, titles, error messages.
   * `auth.*`: Login, credentials, logout, passkeys.
   * `incidents.*`: School incident tracking and events.
   * `homework.*`: School homework assignments and tasks.
   * `account.*`: User profile, password, passkey registration.
   * `admin.*`: User administration, user lists.

---

## 3. Shared Component Architecture & Storybook Mandate (Zero Code Duplication)

### Mandatory Rules
1. **Zero UI Code Duplication**:
   * Never write raw or duplicated markup for cards, sections, modals, dialogs, inputs, textareas, date pickers, selects, buttons, badges, avatars, headers, or list rows across views.
   * Every UI element **must** consume the shared components in [`src/components/ui/`](../../src/components/ui).
2. **Create/Extend Shared Components First**:
   * If a feature requires a new UI element or a new variant of an existing control, build or extend the shared component in `src/components/ui/` first, then import it in the page/view.
3. **Mandatory Storybook Catalog Synchronization**:
   * Every new shared component, prop variant, or visual pattern **must** be added or updated in [`src/stories/`](../../src/stories) under its corresponding category:
     * `src/stories/1-fields-and-inputs/` (`Input`, `SearchInput`, `Textarea`, `Select`, `DatePicker`, `SwitchAndLabel`)
     * `src/stories/2-buttons-and-nav/` (`Button`, `ActionButton`, `SyncButton`, `LogoutButton`, `FloatingActionButton`, `Header`, `Sidebar`, `Dock`, `LiquidTabs`, `Tabs`)
     * `src/stories/3-badges-and-pickers/` (`ChildBadge`, `StatusBadge`, `DateBadge`, `SubjectIconBadge`, `UserAvatar`, `ColorSwatchPicker`)
     * `src/stories/4-surfaces-and-cards/` (`SectionCard`, `Modal`, `HomeworkCard`, `IncidentCard`, `ExamCard`, `AdminUserRow`, `ScheduleTable`, `EmptyStateCard`, `InfoBox`, `SectionDateHeader`, `Separator`, `Login`, `OverlaysAndControls`)
   * Update [`src/stories/Introduction.mdx`](../../src/stories/Introduction.mdx) whenever adding a new component category or surface.
4. **Canonical Shared Component Mapping**:
   * **Modals & Confirmations**: Always use `Modal` and `ConfirmModal` (`src/components/ui/modal.tsx`) — never raw `DialogContent` or `AlertDialogContent` in application pages.
   * **Form Fields**: Always use `FilledInput`, `FilledTextarea`, `IconInput`, `CounterField`, `ReadOnlyPillField`, `TimePresetInput`, `FieldLabel` (`src/components/ui/form-field.tsx`), `SelectField` / `SelectTrigger variant="filled"` (`src/components/ui/select.tsx`), and `DatePicker variant="filled"` (`src/components/ui/date-picker.tsx`).
   * **Sections & Surfaces**: Always use `SectionCard` (`src/components/ui/section-card.tsx`), `InfoBox` / `InfoItem` (`src/components/ui/info-box.tsx`), and `EmptyStateCard` (`src/components/ui/empty-state-card.tsx`).
   * **Buttons & Actions**: Always use `Button`, `EditButton`, `DestructiveButton`, `ActionIconButton`, `SyncButton`, `LogoutButton`, and `FloatingActionButton`.
5. **Class Merging & Lazy Loading**:
   * Always use `cn(...)` from `@/lib/utils` to merge conditional Tailwind classes.
   * Major views must be lazy-loaded in `src/App.tsx` and wrapped with `<Suspense fallback={<LoadingSpinner />}>`.

