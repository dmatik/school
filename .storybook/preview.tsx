import * as React from "react"
import type { Preview } from "@storybook/react"
import { DirectionProvider } from "@radix-ui/react-direction"
import { Toaster } from "@/components/ui/toaster"
import i18n from "@/i18n"
import "@/index.css"

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
    layout: "padded",
  },
  globalTypes: {
    locale: {
      name: "Language",
      description: "App language and text direction",
      defaultValue: "he",
      toolbar: {
        icon: "globe",
        items: [
          { value: "he", title: "עברית (RTL)", right: "🇮🇱" },
          { value: "en", title: "English (LTR)", right: "🇺🇸" },
        ],
        dynamicTitle: true,
      },
    },
    theme: {
      name: "Theme",
      description: "Color theme mode",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light Mode", icon: "sun" },
          { value: "dark", title: "Dark Mode", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const selectedLocale = context.globals.locale || "he"
      const selectedTheme = context.globals.theme || "light"
      const isRtl = selectedLocale === "he"
      const dir = isRtl ? "rtl" : "ltr"

      React.useEffect(() => {
        i18n.changeLanguage(selectedLocale)
        document.documentElement.dir = dir
        document.documentElement.lang = selectedLocale
      }, [selectedLocale, dir])

      React.useEffect(() => {
        if (selectedTheme === "dark") {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      }, [selectedTheme])

      return (
        <DirectionProvider dir={dir}>
          <div
            dir={dir}
            className={`min-h-full w-full bg-background text-foreground font-sans antialiased p-4 sm:p-6 transition-colors duration-200 ${
              selectedTheme === "dark" ? "dark" : ""
            }`}
          >
            <Story />
            <Toaster />
          </div>
        </DirectionProvider>
      )
    },
  ],
}

export default preview
