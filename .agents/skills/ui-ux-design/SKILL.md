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

## 2. Component Guidelines

- **Cards**:
  - Border: `border border-border/70 dark:border-border/60`.
  - Background: `bg-card text-card-foreground`.
  - Hover: `hover:shadow-md hover:border-primary/20 transition-all duration-200`.
- **Badges**:
  - Compact rounded-md or rounded-full pills with subtle border and low-opacity colored backgrounds (`bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20`).
- **Inputs & Selects**:
  - Height: `h-9` for compact controls.
  - Focus: `focus-visible:ring-2 focus-visible:ring-primary/30`.

