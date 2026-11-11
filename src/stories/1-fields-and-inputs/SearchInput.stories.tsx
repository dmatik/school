import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react"
import { SearchInput } from "@/components/ui/search-input"

const meta: Meta<typeof SearchInput> = {
  title: "1. Fields & Inputs/SearchInput",
  component: SearchInput,
  parameters: {
    docs: {
      description: {
        component: "Standard search pill input used across Homework, Incidents, Exams, and Admin pages, featuring an icon and clear button.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SearchInput>

export const FullWidthFeedSearch: Story = {
  render: function Render() {
    const [query, setQuery] = React.useState("")
    return (
      <div className="max-w-xl space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="חיפוש לפי מקצוע, מורה, תלמיד או תיאור..."
        />
        <div className="text-xs text-muted-foreground">
          ערך נוכחי: <span className="font-semibold">{query || "(ריק)"}</span>
        </div>
      </div>
    )
  },
}

export const TypedWithClearButton: Story = {
  render: function Render() {
    const [query, setQuery] = React.useState("מתמטיקה")
    return (
      <div className="max-w-xl space-y-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="חיפוש..."
        />
        <div className="text-xs text-muted-foreground">
          לחץ על כפתור ה-✕ למחיקת החיפוש
        </div>
      </div>
    )
  },
}

export const CompactToolbarSearch: Story = {
  render: function Render() {
    const [query, setQuery] = React.useState("")
    return (
      <div className="w-72 space-y-4">
        <SearchInput
          variant="compact"
          value={query}
          onChange={setQuery}
          placeholder="חיפוש משתמשים..."
        />
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="max-w-xl">
      <SearchInput
        disabled
        value="חיפוש מושבת"
        onChange={() => {}}
        placeholder="לא ניתן לחפש..."
      />
    </div>
  ),
}
