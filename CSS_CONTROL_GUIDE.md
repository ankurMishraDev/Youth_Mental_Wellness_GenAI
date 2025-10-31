# 🎨 CSS Design System Control Guide

## Single Point of Control: `app/globals.css`

All UI styling, colors, fonts, sizes, and animations are controlled from **ONE FILE**: `app/globals.css`

---

## 📍 Where to Change What

### 🎨 **COLORS** (Lines 16-81)

#### Light Mode Colors
Located in the `:root` section, starting at **line 16**

**To change your main brand color:**
```css
--primary: oklch(0.55 0.22 290); /* Change this line */
```

**To change background:**
```css
--background: oklch(0.99 0 0); /* Almost white */
--card: oklch(1 0 0); /* Pure white for cards */
```

**To change text colors:**
```css
--foreground: oklch(0.25 0 0); /* Main text */
--muted-foreground: oklch(0.50 0.02 270); /* Secondary text */
```

**Mood colors for journal (Lines 68-72):**
```css
--mood-very-sad: oklch(0.55 0.22 25); /* Red */
--mood-sad: oklch(0.65 0.20 40); /* Orange */
--mood-neutral: oklch(0.60 0.02 270); /* Gray */
--mood-happy: oklch(0.65 0.20 140); /* Green */
--mood-very-happy: oklch(0.60 0.20 220); /* Blue */
```

#### Dark Mode Colors
Located in the `.dark` section, starting at **line 189**

Same variables as light mode, but adjusted for dark backgrounds.

---

### 📏 **SIZES & SPACING** (Lines 83-100)

**Border radius (roundness):**
```css
--radius: 0.75rem; /* Base radius - change this to make everything more/less rounded */
```

**Spacing scale:**
```css
--spacing-xs: 0.25rem; /* 4px */
--spacing-sm: 0.5rem; /* 8px */
--spacing-md: 1rem; /* 16px */
--spacing-lg: 1.5rem; /* 24px */
--spacing-xl: 2rem; /* 32px */
```

---

### 📝 **FONTS** (Lines 102-147)

**Font families (Line 107-109):**
```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace;
--font-display: "Ribeye", cursive; /* Decorative font for headings */
```

**Font sizes (Lines 112-120):**
```css
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px - Main text size */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem; /* 36px */
--text-5xl: 3rem; /* 48px */
```

**Font weights (Lines 123-126):**
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**Line heights (Lines 129-132):**
```css
--leading-tight: 1.25; /* For headings */
--leading-normal: 1.5; /* For body text */
--leading-relaxed: 1.75;
--leading-loose: 2;
```

---

### 🎬 **ANIMATIONS** (Lines 149-163)

**Animation speeds:**
```css
--duration-fast: 150ms; /* Quick transitions */
--duration-normal: 300ms; /* Standard animations */
--duration-slow: 500ms; /* Smooth, slower animations */
--duration-slower: 700ms;
```

**Easing functions (how animations move):**
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1); /* Slow start, fast end */
--ease-out: cubic-bezier(0, 0, 0.2, 1); /* Fast start, slow end */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Smooth both ends */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bouncy effect */
```

---

## 🎨 Understanding oklch() Color Format

The `oklch()` format is used for all colors. It provides:
- **Better color perception** (looks more natural to human eyes)
- **Smooth gradients** (no weird color transitions)
- **Easy adjustments** (change just one number)

### Format: `oklch(lightness chroma hue)`

**Examples:**
```css
/* Purple */
oklch(0.55 0.22 290)
  ↑      ↑     ↑
  |      |     └─ Hue: 290 degrees (purple on color wheel)
  |      └─────── Chroma: 0.22 (color intensity/saturation)
  └──────────── Lightness: 0.55 (0 = black, 1 = white)

/* Light Purple (for hover states) */
oklch(0.75 0.18 290)  /* Increase lightness, decrease chroma */

/* Dark Purple (for active states) */
oklch(0.45 0.24 290)  /* Decrease lightness, increase chroma */
```

### Common Hue Values:
- **0-60**: Red/Orange
- **60-120**: Yellow/Green
- **120-180**: Green/Cyan
- **180-240**: Cyan/Blue
- **240-300**: Blue/Purple
- **300-360**: Purple/Magenta

---

## 🎯 Quick Customization Examples

### Example 1: Change to Orange Theme (Like Your Screenshot)

**In `:root` section (Line 35):**
```css
/* Change from: */
--primary: oklch(0.55 0.22 290); /* Purple */

/* To: */
--primary: oklch(0.647 0.204 49.72); /* Orange */
```

**Also update primary-light and primary-dark:**
```css
--primary-light: oklch(0.75 0.18 40); /* Lighter orange */
--primary-dark: oklch(0.55 0.22 30); /* Darker orange */
```

**Update secondary to complement:**
```css
--secondary: oklch(0.70 0.19 50); /* Warm orange-yellow */
```

### Example 2: Make UI More Rounded

**In `:root` section (Line 88):**
```css
/* Change from: */
--radius: 0.75rem; /* 12px */

/* To: */
--radius: 1.5rem; /* 24px - Much rounder */
```

### Example 3: Increase Base Font Size

**In `:root` section (Line 114):**
```css
/* Change from: */
--text-base: 1rem; /* 16px */

/* To: */
--text-base: 1.125rem; /* 18px - Larger text everywhere */
```

### Example 4: Faster Animations

**In `:root` section (Line 154):**
```css
/* Change from: */
--duration-normal: 300ms;

/* To: */
--duration-normal: 200ms; /* Snappier feel */
```

---

## 🌙 Dark Mode

Dark mode automatically applies when the `.dark` class is added to the root element.

**To customize dark mode colors**, edit the `.dark` section starting at **line 189**.

**Example - Make dark mode warmer:**
```css
.dark {
  --background: oklch(0.18 0.02 40); /* Warmer dark brown instead of purple tint */
  --card: oklch(0.22 0.02 40); /* Warmer card background */
}
```

---

## 🎨 Special Utility Classes

These are pre-built classes you can use in your components:

### Glass Morphism Effects (Lines 371-391)
```html
<!-- Light glass effect -->
<div class="glass">Content</div>

<!-- Strong glass effect -->
<div class="glass-strong">Content</div>
```

### Journal Background (Lines 348-369)
```html
<!-- Subtle gradient background -->
<div class="journal-background">Your content</div>

<!-- Optional doodle pattern -->
<div class="doodle-background">Your content</div>
```

### Custom Animations (Lines 393-453)
```html
<!-- Pulsing glow effect -->
<button class="animate-pulse-glow">Click me</button>

<!-- Floating effect -->
<div class="animate-float">🎈</div>

<!-- Shimmer loading -->
<div class="animate-shimmer">Loading...</div>

<!-- Wave animation -->
<div class="animate-wave">🌊</div>
```

---

## 📋 Color Palette Reference

### Current Theme (Purple/Blue/Pink)
- **Primary**: Purple (`oklch(0.55 0.22 290)`)
- **Secondary**: Indigo Blue (`oklch(0.60 0.20 250)`)
- **Accent**: Pink (`oklch(0.65 0.24 340)`)

### For Orange Theme (Like Screenshot)
- **Primary**: Orange (`oklch(0.647 0.204 49.72)`)
- **Secondary**: Light Orange (`oklch(0.703 0.191 49.72)`)
- **Accent**: Yellow-Orange (`oklch(0.756 0.184 85.109)`)

---

## ⚡ Performance Notes

- **CSS Variables** = Native browser feature, zero overhead
- **No runtime JavaScript** for styling
- **Instant theme changes** by updating variables
- **Tailwind purges** unused classes automatically

---

## 🚀 Next Steps

1. **Test your changes**: Edit the values in `globals.css` and save
2. **See it live**: Your changes apply immediately to all components
3. **Iterate**: Adjust values until you achieve your desired look
4. **Dark mode**: Don't forget to adjust `.dark` section colors too

---

## 💡 Pro Tips

1. **Use browser DevTools**: Right-click → Inspect → check `:root` variables
2. **Color picker**: Use online oklch color pickers for easier color selection
3. **Consistency**: Change colors in `:root`, not in individual components
4. **Test both modes**: Always check light AND dark mode after changes
5. **Document custom values**: Add comments when you make changes

---

## 📞 Need Help?

If colors don't look right:
1. Check if the variable name is correct
2. Verify oklch() format (lightness, chroma, hue)
3. Make sure lightness is between 0 and 1
4. Check if dark mode has corresponding changes

---

**Remember**: This ONE file controls your ENTIRE application's appearance! 🎨
