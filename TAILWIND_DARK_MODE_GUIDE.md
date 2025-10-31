# Tailwind Configuration & Dark Mode Implementation Guide

## Overview
This document details the complete Tailwind CSS configuration and dark mode system implementation for the CureZ application. The setup provides a centralized design system with responsive breakpoints, theme switching, and CSS variable integration.

---

## 1. Tailwind Configuration (`tailwind.config.ts`)

### File Location
```
Youth_Mental_Wellness_GenAI/tailwind.config.ts
```

### Key Features

#### A. Dark Mode Configuration
```typescript
darkMode: ["class"]
```
- **Strategy**: Class-based dark mode
- **Implementation**: Toggles `.dark` class on `<html>` element
- **Benefit**: User-controlled theme switching with instant updates

#### B. Content Paths
Tailwind scans these directories for class usage:
- `./pages/**/*.{js,ts,jsx,tsx,mdx}`
- `./components/**/*.{js,ts,jsx,tsx,mdx}`
- `./app/**/*.{js,ts,jsx,tsx,mdx}`

#### C. Color System Mapping
All CSS variables from `globals.css` are mapped to Tailwind utility classes:

**Example Usage:**
```tsx
// Instead of: className="bg-purple-600 text-white"
// Use: className="bg-primary text-primary-foreground"

// Instead of: className="bg-gray-100 dark:bg-gray-800"
// Use: className="bg-card"
```

**Color Categories:**
1. **Core Colors**: `background`, `foreground`
2. **Component Colors**: `card`, `popover`, `sidebar`
3. **Brand Colors**: `primary`, `secondary`, `accent` (each with `dark`, `light`, `foreground` variants)
4. **Semantic Colors**: `muted`, `destructive`, `border`, `input`, `ring`
5. **Mood Colors**: `mood-happy`, `mood-sad`, `mood-anxious`, `mood-calm`, `mood-excited`, `mood-angry`, `mood-neutral`
6. **Chart Colors**: `chart-1` through `chart-5`

#### D. Spacing System
```typescript
spacing: {
  "section": "var(--spacing-section)",    // 4rem (64px)
  "card": "var(--spacing-card)",          // 1.5rem (24px)
  "element": "var(--spacing-element)",    // 1rem (16px)
}
```

**Usage:**
```tsx
<div className="p-section">      {/* 64px padding */}
<div className="gap-card">       {/* 24px gap */}
<div className="space-y-element"> {/* 16px vertical spacing */}
```

#### E. Typography Scale
Custom font sizes mapped to design tokens:

| Class | CSS Variable | Size | Use Case |
|-------|--------------|------|----------|
| `text-display` | `--font-size-display` | 4rem (64px) | Hero headings |
| `text-heading-1` | `--font-size-heading-1` | 3rem (48px) | Page titles |
| `text-heading-2` | `--font-size-heading-2` | 2rem (32px) | Section headers |
| `text-heading-3` | `--font-size-heading-3` | 1.5rem (24px) | Subsection headers |
| `text-body` | `--font-size-body` | 1rem (16px) | Body text |
| `text-small` | `--font-size-small` | 0.875rem (14px) | Captions, labels |

#### F. Responsive Breakpoints
```typescript
screens: {
  "xs": "475px",   // Extra small devices
  "sm": "640px",   // Small devices (phones)
  "md": "768px",   // Medium devices (tablets)
  "lg": "1024px",  // Large devices (laptops)
  "xl": "1280px",  // Extra large devices (desktops)
  "2xl": "1536px", // 2K+ displays
}
```

**Usage:**
```tsx
<div className="text-sm md:text-base lg:text-lg">
  {/* Responsive text sizing */}
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid layout */}
</div>
```

#### G. Custom Animations
Pre-configured animation utilities:

```tsx
animate-fade-in     // Smooth fade entrance
animate-slide-up    // Slide from bottom with bounce
animate-slide-down  // Slide from top with bounce
animate-scale-in    // Scale up entrance
animate-pulse-slow  // Slow pulsing effect
```

#### H. Glass Morphism Utilities
Custom utility classes for modern glass effects:

```tsx
<div className="glass">
  {/* Semi-transparent background with blur */}
</div>

<div className="glass-strong">
  {/* More opaque glass effect */}
</div>
```

---

## 2. Theme Provider Setup (`app/layout.tsx`)

### Integration
```tsx
import { ThemeProvider } from "@/components/theme-provider"

<ThemeProvider
  attribute="class"           // Adds/removes .dark class
  defaultTheme="system"       // Follows OS preference by default
  enableSystem                // Enables OS theme detection
  disableTransitionOnChange={false}  // Smooth theme transitions
>
  {children}
</ThemeProvider>
```

### Configuration Options

| Property | Value | Purpose |
|----------|-------|---------|
| `attribute` | `"class"` | Toggles `.dark` class on `<html>` |
| `defaultTheme` | `"system"` | Initial theme (options: `"light"`, `"dark"`, `"system"`) |
| `enableSystem` | `true` | Detects OS dark mode preference |
| `disableTransitionOnChange` | `false` | Enables smooth color transitions |

---

## 3. Theme Toggle Component (`components/ThemeToggle.tsx`)

### Features
- **Animated Icon Transitions**: Sun ☀️ ↔ Moon 🌙 with rotation animation
- **Two Variants**:
  1. `default`: Button with icon + "Light"/"Dark" label
  2. `icon-only`: Compact circular button (used in navigation)
- **Framer Motion**: Smooth scale and rotation animations
- **Accessibility**: ARIA labels, keyboard support, focus rings
- **Hydration Safe**: Prevents mismatch with SSR

### Usage Examples

**Icon-Only (Navigation Bar):**
```tsx
<ThemeToggle variant="icon-only" className="bg-white/10 border-white/20" />
```

**Full Button (Settings Page):**
```tsx
<ThemeToggle variant="default" className="w-full" />
```

### Custom Styling
The component accepts `className` prop for custom styling:
```tsx
<ThemeToggle 
  variant="icon-only" 
  className="bg-primary/10 hover:bg-primary/20 border-primary/30" 
/>
```

---

## 4. Implementation in Landing Page

### Location
**File**: `components/HeroSection.tsx`

### Integration
Added to navigation bar after FAQ button:

```tsx
<div className="ml-2">
  <ThemeToggle 
    variant="icon-only" 
    className="bg-white/10 border-white/20 hover:bg-white/20" 
  />
</div>
```

### Positioning
- **Desktop**: Top-right navigation bar
- **Scroll Behavior**: Animates with navbar (transparent → orange background)
- **Spacing**: 8px margin-left from last navigation item

---

## 5. CSS Variable Integration

### How It Works
1. **CSS Variables Defined**: `app/globals.css` defines all color/spacing/typography tokens
2. **Tailwind Mapping**: `tailwind.config.ts` maps variables to utility classes
3. **Dark Mode**: `:root` has light colors, `.dark` selector overrides with dark colors
4. **Auto-Switching**: ThemeProvider toggles `.dark` class, Tailwind uses correct variables

### Example Flow
```tsx
// Component uses Tailwind class
<div className="bg-card text-card-foreground">

// Tailwind outputs (light mode)
background-color: var(--card);              // oklch(100% 0 0)
color: var(--card-foreground);              // oklch(15% 0.01 270)

// When .dark class added (dark mode)
background-color: var(--card);              // oklch(15% 0.01 270)
color: var(--card-foreground);              // oklch(95% 0.01 270)
```

---

## 6. Responsive Design Strategy

### Mobile-First Approach
Default styles apply to mobile, larger breakpoints override:

```tsx
<div className="
  p-4           {/* Mobile: 16px padding */}
  md:p-6        {/* Tablet: 24px padding */}
  lg:p-8        {/* Desktop: 32px padding */}
">
```

### Common Patterns

**Grid Layouts:**
```tsx
<div className="
  grid grid-cols-1         {/* Mobile: Single column */}
  md:grid-cols-2           {/* Tablet: 2 columns */}
  lg:grid-cols-3           {/* Desktop: 3 columns */}
  gap-card
">
```

**Typography:**
```tsx
<h1 className="
  text-heading-3           {/* Mobile: 24px */}
  md:text-heading-2        {/* Tablet: 32px */}
  lg:text-heading-1        {/* Desktop: 48px */}
">
```

**Navigation:**
```tsx
<nav className="
  flex-col                 {/* Mobile: Vertical */}
  md:flex-row              {/* Tablet+: Horizontal */}
  gap-2 md:gap-4
">
```

---

## 7. Testing Checklist

### Theme Switching
- [ ] Light mode displays correctly
- [ ] Dark mode displays correctly
- [ ] Theme persists on page reload
- [ ] Theme syncs across browser tabs
- [ ] OS theme preference is respected on first visit
- [ ] No flash of unstyled content (FOUC)

### Responsive Behavior
- [ ] Mobile (320px - 639px): Single column layouts
- [ ] Tablet (640px - 1023px): 2-column layouts
- [ ] Desktop (1024px+): 3-column layouts
- [ ] Navigation collapses on mobile
- [ ] Images scale proportionally
- [ ] Text remains readable at all sizes

### Accessibility
- [ ] Theme toggle has ARIA label
- [ ] Theme toggle is keyboard accessible (Tab + Enter)
- [ ] Focus indicators visible in both themes
- [ ] Color contrast meets WCAG AA standards (4.5:1 for text)
- [ ] Icons have text alternatives

### Performance
- [ ] CSS bundle size < 50KB gzipped
- [ ] No layout shift when theme changes
- [ ] Smooth animations (60fps)
- [ ] No unnecessary re-renders

---

## 8. Common Use Cases

### Case 1: Update Brand Colors
**Location**: `app/globals.css` lines 34-42

```css
:root {
  --primary: oklch(60% 0.2 270);        /* Change purple hue */
  --secondary: oklch(58% 0.19 250);     /* Change indigo hue */
  --accent: oklch(65% 0.24 350);        /* Change pink hue */
}
```

### Case 2: Add New Semantic Color
1. **Define in `globals.css`:**
```css
:root {
  --success: oklch(60% 0.15 145);       /* Green */
}
.dark {
  --success: oklch(65% 0.18 145);       /* Lighter green */
}
```

2. **Map in `tailwind.config.ts`:**
```typescript
colors: {
  success: "var(--success)",
}
```

3. **Use in components:**
```tsx
<button className="bg-success text-white">Save</button>
```

### Case 3: Create Custom Animation
1. **Define keyframes in `tailwind.config.ts`:**
```typescript
keyframes: {
  wiggle: {
    "0%, 100%": { transform: "rotate(-3deg)" },
    "50%": { transform: "rotate(3deg)" },
  }
}
```

2. **Add animation utility:**
```typescript
animation: {
  wiggle: "wiggle 1s ease-in-out infinite",
}
```

3. **Apply to element:**
```tsx
<div className="animate-wiggle">🎉</div>
```

### Case 4: Override Theme for Specific Section
```tsx
{/* Force light theme for specific component */}
<div className="light">
  <Card className="bg-card text-card-foreground">
    {/* Always uses light mode colors */}
  </Card>
</div>
```

---

## 9. Troubleshooting

### Issue: Theme not persisting
**Solution**: Check localStorage is enabled and ThemeProvider has `enableSystem` prop

### Issue: FOUC (Flash of Unstyled Content)
**Solution**: Ensure ThemeProvider wraps entire app in `layout.tsx`, not in client component

### Issue: Colors not updating in dark mode
**Solution**: 
1. Check `.dark` class is added to `<html>` element
2. Verify CSS variables defined in both `:root` and `.dark` selectors
3. Confirm Tailwind is reading correct variables in `tailwind.config.ts`

### Issue: Responsive breakpoints not working
**Solution**: 
1. Clear `.next` cache: `rm -rf .next`
2. Rebuild: `npm run dev`
3. Check viewport meta tag in `layout.tsx`: `<meta name="viewport" content="width=device-width, initial-scale=1" />`

### Issue: Custom utilities not applying
**Solution**: 
1. Restart dev server after changing `tailwind.config.ts`
2. Check class names don't have typos
3. Verify content paths include your component files

---

## 10. Next Steps

### Remaining Components to Refactor
- [ ] `JournalEntryForm.tsx` - Replace hardcoded form colors
- [ ] `RichTextEditor.tsx` - Update editor theme
- [ ] `ImageUploader.tsx` - Refactor upload UI colors
- [ ] Dashboard components - Full theme integration
- [ ] Modal components - Update overlay/backdrop colors

### Enhancement Opportunities
1. **Theme Customizer**: Allow users to pick custom accent colors
2. **High Contrast Mode**: Additional theme variant for accessibility
3. **Motion Preferences**: Respect `prefers-reduced-motion` for animations
4. **Color Blind Modes**: Alternative color palettes for color vision deficiencies

---

## 11. References

### Documentation
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [next-themes GitHub](https://github.com/pacocoursey/next-themes)
- [Framer Motion Docs](https://www.framer.com/motion/)

### Related Files
- `app/globals.css` - CSS variable definitions
- `tailwind.config.ts` - Tailwind configuration
- `components/theme-provider.tsx` - Theme context wrapper
- `components/ThemeToggle.tsx` - Theme switch component
- `app/layout.tsx` - Root layout with providers

### Color System
- **Format**: OKLCH (Oklab Lightness Chroma Hue)
- **Benefits**: Perceptually uniform, better for gradients, consistent lightness
- **Conversion Tool**: [oklch.com](https://oklch.com/)

---

**Last Updated**: Implementation Phase 2 - Tailwind & Dark Mode Setup
**Status**: ✅ Complete - Ready for production testing
