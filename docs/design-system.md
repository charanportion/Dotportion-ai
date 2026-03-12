# Design System

## Philosophy

**Black and white only.** No color. No gradients. Pure contrast.

This is intentional — it signals precision, focus, and seriousness. Like a Bloomberg terminal or Linear's minimalism.

---

## Color Palette (STRICT)

```
Background:     white (#ffffff)
Surface:        zinc-50 (#fafafa)
Border:         zinc-200 (#e4e4e7)
Muted text:     zinc-500 (#71717a)
Body text:      zinc-800 (#27272a)
Heading text:   zinc-950 (#09090b)
Inverted bg:    zinc-950 (#09090b)
Inverted text:  white (#ffffff)
Inverted border:zinc-800 (#27272a)
```

**Never use:** blue, green, red, yellow, purple, orange, or any non-zinc color.

Status indicators (exception — use sparingly):
- Analysis running: `bg-zinc-100 text-zinc-600` with animated dot
- Error: `bg-zinc-950 text-white` (inverted)
- Success: `border-zinc-950` (bold border)

---

## Tailwind Config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
    },
  },
} satisfies Config
```

---

## CSS Variables (globals.css)

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 0% 9%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 10% 3.9%;
    --radius: 0.5rem;
  }
}
```

---

## Spacing System

Base unit: **4px**. Use ONLY multiples of 4.

```
p-1 = 4px
p-2 = 8px
p-3 = 12px
p-4 = 16px   ← standard card padding
p-6 = 24px
p-8 = 32px   ← page padding
p-12 = 48px
p-16 = 64px
```

**Gap between elements:**
- Related items: `gap-2` (8px)
- Card grid: `gap-4` (16px)
- Section spacing: `gap-8` (32px)

---

## Typography

```
text-xs   = 12px — metadata, timestamps
text-sm   = 14px — body, table data, captions
text-base = 16px — default body text
text-lg   = 18px — section labels
text-xl   = 20px — card titles
text-2xl  = 24px — page headings
text-3xl  = 30px — major headings
```

**Weight:**
- `font-normal` — body text
- `font-medium` — labels, nav items
- `font-semibold` — card headings
- `font-bold` — page titles

**Numbers and data:**
```tsx
<span className="font-mono text-sm">42 mentions</span>
<span className="font-mono text-xl font-bold">2.67</span>
```

---

## Component Patterns

### Card
```tsx
<div className="border border-zinc-200 rounded-lg p-6 bg-white">
  <h3 className="text-lg font-semibold text-zinc-950">Title</h3>
  <p className="text-sm text-zinc-500 mt-1">Description</p>
</div>
```

### Badge / Tag
```tsx
// Default
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">
  Label
</span>

// Inverted (high priority)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-950 text-white">
  High
</span>
```

### Score Display
```tsx
<div className="flex items-baseline gap-1">
  <span className="font-mono text-2xl font-bold text-zinc-950">2.67</span>
  <span className="text-xs text-zinc-500">priority</span>
</div>
```

### Progress Bar (B&W)
```tsx
<div className="h-1.5 bg-zinc-100 rounded-full">
  <div className="h-1.5 bg-zinc-950 rounded-full" style={{ width: '67%' }} />
</div>
```

### Button Variants
```tsx
// Primary (inverted)
<button className="bg-zinc-950 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800">
  Action
</button>

// Secondary (outlined)
<button className="border border-zinc-200 text-zinc-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-50">
  Secondary
</button>

// Ghost
<button className="text-zinc-600 px-4 py-2 rounded-md text-sm hover:bg-zinc-100">
  Ghost
</button>
```

### Input
```tsx
<input
  className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950"
/>
```

---

## Layout

### Sidebar Layout
```
┌──────────────────────────────────────────────┐
│  Logo / Brand (zinc-950 text)                │ ← top-left
├────────────┬─────────────────────────────────┤
│ Sidebar    │  Main Content                   │
│ 240px      │  flex-1                         │
│ border-r   │  p-8                            │
│ zinc-200   │                                 │
│            │                                 │
│ nav items  │                                 │
│ text-sm    │                                 │
│ font-med   │                                 │
└────────────┴─────────────────────────────────┘
```

### Page Header
```tsx
<div className="border-b border-zinc-200 pb-6 mb-6">
  <h1 className="text-2xl font-bold text-zinc-950">Page Title</h1>
  <p className="text-sm text-zinc-500 mt-1">Description</p>
</div>
```

### Grid Layout for Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

---

## shadcn Component Overrides

When using shadcn components, ensure theme is applied:

```tsx
// Use shadcn Button with default variant (maps to zinc-950)
<Button>Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Ghost</Button>
```

Do NOT use `variant="destructive"` with red. Use `variant="outline"` with custom class.

---

## Anti-Patterns (Never Do)

```tsx
// ❌ NEVER — blue color
className="text-blue-500 bg-blue-100"

// ❌ NEVER — gradient
className="bg-gradient-to-r from-zinc-900 to-zinc-700"

// ❌ NEVER — colored shadow
className="shadow-blue-500"

// ❌ NEVER — colored border
className="border-blue-500"

// ❌ NEVER — spacing not multiple of 4
className="p-5 gap-3"

// ✅ DO — correct pattern
className="text-zinc-700 bg-zinc-100"
className="border-zinc-200 shadow-sm"
className="p-4 gap-4"
```
