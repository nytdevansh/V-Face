# V-FACE Design System

## Overview
A modern, professional design system built for the V-FACE biometric identity protocol. Emphasizing clarity, accessibility, and visual hierarchy with a cyberpunk-inspired color palette.

---

## 1. Color Palette

### Primary Colors
- **Cyan** - Primary action color
  - Bright: `#06B6D4` / `#00D9FF`
  - Dark: `#0891B2` / `#0369A1`
  - Light: `#22D3EE` / `#A5F3FC`

### Neutral Colors
- **Gray-950**: `#030712` - Background
- **Gray-900**: `#111827` - Surfaces
- **Gray-800**: `#1F2937` - Cards
- **Gray-700**: `#374151` - Borders
- **Gray-600**: `#4B5563` - Secondary text
- **Gray-300**: `#D1D5DB` - Light text
- **Gray-100**: `#F3F4F6` - Light backgrounds

### Status Colors
- **Success**: `#22C55E` (Green)
- **Error**: `#EF4444` (Red)
- **Warning**: `#F59E0B` (Amber)
- **Info**: `#3B82F6` (Blue)

### Gradients
```css
/* Primary Gradient */
linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)

/* Dark Gradient Background */
linear-gradient(135deg, #030712 0%, #111827 50%, #0f172a 100%)

/* Secondary Gradient */
linear-gradient(to right, #a855f7, #d946ef)
```

---

## 2. Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;
```

### Font Sizes
- **xs** - 12px (Captions, labels)
- **sm** - 14px (Small text)
- **base** - 16px (Body text)
- **lg** - 18px (Subheadings)
- **xl** - 20px (Section titles)
- **2xl** - 24px (Page titles)
- **3xl** - 30px (Hero sections)
- **4xl** - 36px (Large headings)

### Font Weights
- **Light** - 300 (Subtle information)
- **Normal** - 400 (Body text)
- **Medium** - 500 (Emphasis)
- **Bold** - 700 (Headings)
- **Black** - 900 (Hero text)

### Line Heights
- **Tight** - 1.2 (Headings)
- **Normal** - 1.5 (Body)
- **Relaxed** - 1.75 (Long-form)

---

## 3. Spacing Scale

```css
xs  = 4px        /* Minimal spacing */
sm  = 8px        /* Small gaps */
md  = 16px       /* Standard spacing */
lg  = 24px       /* Large spacing */
xl  = 32px       /* Extra large */
2xl = 48px       /* Huge spacing */
```

### Application
- **Padding** - Internal breathing room
- **Margin** - External spacing
- **Gap** - Space between flex/grid items

---

## 4. Component Patterns

### Buttons

#### Primary Button
```jsx
<button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 
                   text-gray-950 font-bold rounded-lg 
                   hover:from-cyan-400 hover:to-cyan-300 
                   transition-all hover:shadow-lg hover:shadow-cyan-500/50">
  Action Label
</button>
```

**States:**
- Default: Gradient cyan
- Hover: Lighter gradient, shadow
- Active: Lifted effect
- Disabled: 60% opacity

#### Secondary Button
```jsx
<button className="px-6 py-3 bg-gray-800/50 text-gray-200 
                   border border-gray-700 rounded-lg
                   hover:bg-gray-800 hover:border-cyan-500/30 
                   transition-colors">
  Secondary
</button>
```

### Cards

#### Standard Card
```jsx
<div className="p-6 bg-gray-800/60 backdrop-blur-lg 
                border border-gray-700/50 rounded-xl
                hover:border-cyan-500/30 transition-all">
  {/* Content */}
</div>
```

**Features:**
- Glass morphism effect (backdrop blur)
- Subtle borders
- Smooth hover transitions
- Rounded corners (12px)

### Forms

#### Input Field
```jsx
<input className="bg-gray-800/70 border border-gray-700 rounded-lg
                  px-4 py-3 text-gray-100 placeholder-gray-500
                  focus:border-cyan-500 focus:outline-none 
                  focus:ring-2 focus:ring-cyan-500/20 
                  transition-all" 
       placeholder="Enter..." />
```

**Features:**
- Dark background with transparency
- Clear focus states
- Accessible color contrast
- Subtle ring on focus

### Navigation Tabs

#### Tab Button
```jsx
<button className={`px-4 py-2 rounded-lg transition-all
                   ${active 
                     ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                     : 'text-gray-400 hover:bg-gray-800/50'}`}>
  {icon} Tab Name
</button>
```

---

## 5. Animations & Transitions

### Timing Functions
- **Fast**: 150ms - Quick interactions
- **Base**: 300ms - Standard transitions
- **Slow**: 500ms - Entrance/exit animations

### Common Animations

#### Fade In
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
animation: fadeIn 0.3s ease-out;
```

#### Slide In
```css
@keyframes slideIn {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

#### Glow
```css
@keyframes glow {
  0%, 100% {
    text-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
  }
  50% {
    text-shadow: 0 0 40px rgba(6, 182, 212, 0.8);
  }
}
```

#### Pulse
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

## 6. Responsive Design

### Breakpoints
```css
sm  = 640px  - Small devices (tablets)
md  = 768px  - Medium devices
lg  = 1024px - Large devices
xl  = 1280px - Extra large
```

### Mobile-First Approach
- Base styles apply to mobile
- Use `@media (min-width: 768px)` for larger screens
- Test on actual devices

### Common Patterns
```jsx
// Layout adjustment
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Text sizing
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// Padding
<div className="p-4 md:p-6 lg:p-8">
```

---

## 7. Accessibility Guidelines

### Color Contrast
- Text: Minimum 4.5:1 ratio (WCAG AA)
- Large text: Minimum 3:1 ratio
- Test with contrast checker tools

### Keyboard Navigation
- All interactive elements focusable
- Focus indicators visible (2px solid outline)
- Logical tab order

### ARIA Labels
```jsx
<button aria-label="Close menu" onClick={handleClose}>
  ✕
</button>
```

### Semantic HTML
- Use proper heading hierarchy
- Use `<button>` for actions, not `<div>`
- Use `<nav>` for navigation
- Use `<main>` for primary content

---

## 8. Dark Mode Implementation

### Background Gradient
```css
body {
  background: linear-gradient(135deg, #030712 0%, #111827 50%, #0f172a 100%);
}
```

### Text Colors
- Primary: `#f3f4f6` (Gray-100)
- Secondary: `#d1d5db` (Gray-300)
- Muted: `#9ca3af` (Gray-400)

### Surface Colors
- Card: `rgba(31, 41, 55, 0.6)` - Gray-800 with opacity
- Overlay: `rgba(17, 24, 39, 0.8)` - Gray-900 with opacity

---

## 9. Performance Considerations

### CSS Optimization
- Use `transform` and `opacity` for animations
- Avoid expensive properties (box-shadow, blur)
- Use `will-change` sparingly
- Minify final CSS

### Images
- Use modern formats (WebP with fallbacks)
- Optimize file sizes
- Lazy load when possible

### Font Loading
```css
@font-face {
  font-family: 'Custom';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}
```

---

## 10. Usage Examples

### Dashboard Landing
- Hero section with gradient text
- Feature cards in 3-column grid
- Primary CTA button with hover effects
- Animated background

### Playground Interface
- Fixed header navigation
- Tab-based content switching
- Form inputs with focus states
- Result cards with status colors
- Mobile-responsive layout

### Component States
- **Idle**: Default styling
- **Hover**: Lifted, shadow, color shift
- **Active**: Strong emphasis
- **Disabled**: 50-60% opacity
- **Loading**: Spinner animation

---

## 11. Brand Principles

### Visual Identity
1. **Modern** - Contemporary design patterns
2. **Trustworthy** - Professional, clean interface
3. **Technical** - Subtle nods to code/crypto
4. **Accessible** - Inclusive design for all users
5. **Responsive** - Works perfectly on all devices

### Design Philosophy
- Less is more (avoid clutter)
- Clear visual hierarchy
- Consistent spacing and alignment
- Meaningful animations (not gratuitous)
- Purpose-driven interactions

---

## 12. Implementation Checklist

- [ ] Colors match palette
- [ ] Typography follows scale
- [ ] Spacing uses defined scale
- [ ] Buttons have all states defined
- [ ] Cards have proper elevation/shadow
- [ ] Forms have focus states
- [ ] Animations are smooth (60fps)
- [ ] Mobile responsive tested
- [ ] Keyboard navigation works
- [ ] Color contrast verified
- [ ] Load performance optimized

---

**Last Updated:** February 18, 2026
**Version:** 1.0
