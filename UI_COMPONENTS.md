# V-FACE UI Component Library

## Overview
Reusable, accessible React components built with Tailwind CSS. All components follow the V-FACE design system.

---

## Components

### 1. Button Component

#### Primary Button
```jsx
<button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 
                   text-gray-950 font-bold text-lg rounded-lg
                   hover:from-cyan-400 hover:to-cyan-300
                   hover:shadow-lg hover:shadow-cyan-500/50
                   transition-all
                   disabled:opacity-60 disabled:cursor-not-allowed">
  Connect Wallet
</button>
```

**Props/Classes:**
- `px-*` `py-*` - Padding
- `bg-gradient-to-r` - Gradient direction
- `text-gray-950` - Text color
- `rounded-lg` - Border radius
- `hover:*` - Hover states
- `disabled:*` - Disabled states

#### Secondary Button
```jsx
<button className="px-6 py-3 bg-gray-800/50 text-gray-200
                   border border-gray-700 rounded-lg
                   hover:bg-gray-800 hover:border-cyan-500/30
                   transition-colors
                   focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
  Cancel
</button>
```

#### Icon Button
```jsx
<button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
  <SVGIcon />
</button>
```

---

### 2. Card Component

#### Standard Card
```jsx
<div className="p-6 bg-gray-800/60 backdrop-blur-lg
                border border-gray-700/50 rounded-xl
                hover:border-cyan-500/30 transition-all
                hover:shadow-lg hover:shadow-cyan-500/10">
  <h3 className="text-lg font-bold mb-2">Card Title</h3>
  <p className="text-gray-400">Card content...</p>
</div>
```

**Features:**
- Glass morphism effect
- Smooth hover transitions
- Subtle border changes

#### Feature Card
```jsx
<div className="p-7 bg-gradient-to-br from-gray-800/60 to-gray-900/40
                backdrop-blur-lg border border-gray-700/50
                hover:border-cyan-500/30 rounded-xl
                group cursor-default">
  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
    🛡️
  </div>
  <h3 className="text-lg font-bold mb-2 group-hover:text-cyan-300 transition-colors">
    Security
  </h3>
  <p className="text-gray-400 text-sm leading-relaxed font-light">
    Description...
  </p>
</div>
```

---

### 3. Input Component

#### Text Input
```jsx
<input 
  type="text"
  placeholder="Enter username..."
  className="w-full bg-gray-800/70 border border-gray-700 rounded-lg
             px-4 py-3 text-gray-100 placeholder-gray-500
             focus:border-cyan-500 focus:outline-none
             focus:ring-2 focus:ring-cyan-500/20
             transition-all"
/>
```

#### Text Area
```jsx
<textarea
  placeholder="Enter message..."
  className="w-full bg-gray-800/70 border border-gray-700 rounded-lg
             px-4 py-3 text-gray-100 placeholder-gray-500
             resize-none
             focus:border-cyan-500 focus:outline-none
             focus:ring-2 focus:ring-cyan-500/20
             transition-all"
  rows="5"
/>
```

#### Input Label
```jsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-300">
    Email Address
  </label>
  <input type="email" placeholder="name@example.com" />
</div>
```

---

### 4. Navigation Components

#### Tab Navigation
```jsx
<div className="flex border-b border-gray-800">
  {['Register', 'Verify', 'Consent', 'Inspect'].map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 rounded-lg transition-all
                  ${activeTab === tab
                    ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-cyan-500'
                    : 'text-gray-400 hover:text-gray-200'}`}>
      {tab}
    </button>
  ))}
</div>
```

#### Breadcrumb
```jsx
<nav className="flex items-center space-x-2 text-sm text-gray-400">
  <a href="/" className="hover:text-cyan-300 transition-colors">Home</a>
  <span>/</span>
  <span className="text-gray-300">Current Page</span>
</nav>
```

---

### 5. Status & Indicator Components

#### Status Indicator
```jsx
<div className="flex items-center gap-2 text-sm">
  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
  <span className="text-green-400">Connected</span>
</div>
```

#### Badge
```jsx
<span className="inline-block px-3 py-1 bg-cyan-500/20 text-cyan-300
               border border-cyan-500/30 rounded-full text-xs font-medium">
  New
</span>
```

#### Loading Spinner
```jsx
<div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500
              rounded-full animate-spin"></div>
```

---

### 6. Modal & Dialog Components

#### Alert Modal
```jsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md">
    <h2 className="text-lg font-bold mb-3">Confirm Action</h2>
    <p className="text-gray-400 mb-6">Are you sure?</p>
    <div className="flex gap-3">
      <button className="flex-1 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
        Cancel
      </button>
      <button className="flex-1 px-4 py-2 bg-cyan-500 text-gray-950 font-bold rounded-lg hover:bg-cyan-400">
        Confirm
      </button>
    </div>
  </div>
</div>
```

---

### 7. Form Components

#### Form Container
```jsx
<form className="space-y-6">
  {/* Form fields */}
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-300">Field Label</label>
    <input type="text" />
  </div>
  
  <button type="submit" className="w-full ...">
    Submit
  </button>
</form>
```

#### Checkbox
```jsx
<label className="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" className="w-4 h-4 checked:bg-cyan-500" />
  <span className="text-sm text-gray-300">I agree</span>
</label>
```

#### Radio Button
```jsx
<label className="flex items-center gap-2 cursor-pointer">
  <input type="radio" name="option" className="w-4 h-4" />
  <span className="text-sm text-gray-300">Option 1</span>
</label>
```

---

### 8. Alert Components

#### Success Alert
```jsx
<div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
  <p className="text-sm text-green-400">Operation successful!</p>
</div>
```

#### Error Alert
```jsx
<div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
  <p className="text-sm text-red-400">An error occurred.</p>
</div>
```

#### Warning Alert
```jsx
<div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
  <p className="text-sm text-amber-400">Please verify this action.</p>
</div>
```

---

### 9. List Components

#### Vertical List
```jsx
<ul className="space-y-3">
  {items.map((item) => (
    <li key={item.id} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg
                                  hover:bg-gray-800/70 transition-colors">
      {item.name}
    </li>
  ))}
</ul>
```

#### Table
```jsx
<table className="w-full border-collapse">
  <thead>
    <tr className="border-b border-gray-700">
      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Name</th>
      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-gray-800 hover:bg-gray-800/30">
      <td className="px-4 py-2 text-gray-200">Item</td>
      <td className="px-4 py-2 text-gray-400">Active</td>
    </tr>
  </tbody>
</table>
```

---

### 10. Layout Components

#### Container
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

#### Grid Layout
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Grid items */}
</div>
```

#### Flex Stack
```jsx
<div className="flex flex-col space-y-4">
  {/* Vertical stack */}
</div>

<div className="flex flex-row space-x-4">
  {/* Horizontal stack */}
</div>
```

---

## Animation Examples

### Fade In
```jsx
<div className="animate-fadeIn">
  Content
</div>

<style>{`
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
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`}</style>
```

### Slide In
```jsx
<div className="animate-slideIn">
  {/* Slides in from left */}
</div>
```

---

## Accessibility Features

### Focus States
```jsx
<button className="focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">
  Accessible Button
</button>
```

### ARIA Labels
```jsx
<button aria-label="Close modal" onClick={handleClose}>
  ✕
</button>
```

### Skip Links
```jsx
<a href="#main" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## Best Practices

1. **Always use semantic HTML**
   - `<button>` for interactions
   - `<nav>` for navigation
   - `<main>` for primary content

2. **Color Contrast**
   - Test with color contrast checkers
   - Maintain 4.5:1 ratio for normal text
   - Avoid relying solely on color for information

3. **Mobile First**
   - Design for mobile first
   - Add complexity for larger screens
   - Test on actual devices

4. **Performance**
   - Use efficient CSS selectors
   - Avoid unnecessary re-renders
   - Optimize images

5. **Consistency**
   - Maintain spacing across components
   - Use consistent font sizes
   - Follow color palette strictly

---

**Last Updated:** February 18, 2026
**Version:** 1.0
