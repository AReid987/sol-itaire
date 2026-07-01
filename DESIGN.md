# Sol-itaire Design System

> A Solana-based Solitaire game with crypto integration. This design system defines the visual language, components, and patterns used across the application.

## Table of Contents

- [Design Principles](#design-principles)
- [Color System](#color-system)
- [Typography](#typography)
- [Layout & Spacing](#layout--spacing)
- [Components](#components)
- [Animations & Motion](#animations--motion)
- [Dark Theme](#dark-theme)
- [Responsive Design](#responsive-design)
- [Accessibility](#accessibility)

---

## Design Principles

### 1. **Game-First Aesthetics**
Every element reinforces the classic Solitaire experience — card textures, felt-green backgrounds, and satisfying interactions that feel like playing with real cards.

### 2. **Crypto-Native UX**
Web3 interactions (wallet connect, staking, rewards) are seamlessly integrated without breaking the gaming flow. Complex blockchain operations are abstracted behind intuitive UI.

### 3. **Glassmorphism & Depth**
Layered UI with backdrop blur, translucent surfaces, and subtle gradients create depth and focus. Game elements float above the background.

### 4. **Satisfying Interactions**
Every click, hover, and transition provides tactile feedback through motion. Cards flip, deal, and slide with realistic physics.

### 5. **Dark-First Design**
The dark theme is primary — it reduces eye strain during extended play sessions and makes vibrant card colors pop.

---

## Color System

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-500` | `#3b82f6` | Primary actions, selected states |
| `primary-600` | `#2563eb` | Hover states |
| `primary-700` | `#1d4ed8` | Active states |
| `gradient-start` | `#8b5cf6` | Purple gradient start (logo, accents) |
| `gradient-end` | `#ec4899` | Pink gradient end (logo, accents) |

### Game Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `background-game` | `#059669` | Classic Solitaire felt green |
| `background-card` | `#ffffff` | Card face background |
| `background-highlight` | `#fbbf24` | Selected card highlight |

### Card Suit Colors

| Suit | Color | Hex |
|------|-------|-----|
| ♥ Hearts | Red | `#ef4444` |
| ♦ Diamonds | Red | `#ef4444` |
| ♣ Clubs | Green | `#22c55e` |
| ♠ Spades | Blue | `#3b82f6` |

### UI Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `reward-gold` | `from-yellow-400 to-orange-500` | Reward badges, earnings |
| `success` | `#22c55e` | Win states, confirmations |
| `danger` | `#ef4444` | Errors, destructive actions |
| `wallet-purple` | `#9333ea` | Wallet connection UI |

### Background Gradient

```css
/* Main application background */
bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900
```

### Glass Effects

```css
/* Glassmorphism cards */
bg-white bg-opacity-10 backdrop-blur-md border border-white border-opacity-20

/* Header/footer glass */
bg-black bg-opacity-20 backdrop-blur-md border-b border-white border-opacity-10
```

---

## Typography

### Font Family

- **Primary**: Inter (Google Fonts)
- **Fallback**: system-ui, sans-serif

### Type Scale

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Display | `text-5xl` (3rem) | Bold | Hero titles, welcome screen |
| H1 | `text-4xl` (2.25rem) | Bold | Page titles |
| H2 | `text-3xl` (1.875rem) | Bold | Section headers |
| H3 | `text-2xl` (1.5rem) | Semibold | Card titles |
| H4 | `text-xl` (1.25rem) | Semibold | Subsection headers |
| Body | `text-base` (1rem) | Normal | Default text |
| Small | `text-sm` (0.875rem) | Normal | Labels, captions |
| Card Rank | `text-2xl` (1.5rem) | Bold | Card face values |
| Card Suit | `text-3xl` (1.875rem) | Normal | Suit symbols |

### Gradient Text

```css
.gradient-text {
  @apply bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent;
}
```

### Text Colors

- **Primary text**: `text-white` (on dark backgrounds)
- **Secondary text**: `text-gray-300`
- **Muted text**: `text-gray-400`
- **Dark text**: `text-gray-900` (on light backgrounds like cards)

---

## Layout & Spacing

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-x-2` | 0.5rem | Inline element gaps |
| `space-x-4` | 1rem | Card pile gaps |
| `space-x-6` | 1.5rem | Header element gaps |
| `space-y-4` | 1rem | Vertical list gaps |
| `space-y-8` | 2rem | Section gaps |
| `p-2` | 0.5rem | Card internal padding |
| `p-4` | 1rem | Card content padding |
| `p-6` | 1.5rem | Feature card padding |
| `p-8` | 2rem | Modal padding |

### Container

```css
.container mx-auto px-4
```

### Card Dimensions

| Element | Width | Height |
|---------|-------|--------|
| Playing Card | `w-20` (5rem) | `h-28` (7rem) |
| Card Pile | `w-20` (5rem) | `min-h-28` (7rem min) |
| Feature Card | Auto | Auto |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | 0.5rem | Buttons, inputs |
| `rounded-xl` | 0.75rem | Feature cards |
| `rounded-2xl` | 1rem | Modals, large cards |
| `rounded-full` | 9999px | Badges, logo |

---

## Components

### Playing Card

The core game element — a standard playing card with face-up and face-down states.

```tsx
// Face-up card
<motion.div className="solitaire-card red">
  <div className="flex flex-col items-center justify-between h-full p-2">
    {/* Top: Rank + Suit */}
    <div>
      <span className="text-2xl font-bold text-red-500">{rank}</span>
      <span className="text-3xl text-red-500">{suitSymbol}</span>
    </div>
    
    {/* Center: Large faded suit */}
    <span className="text-4xl text-red-500 opacity-20">{suitSymbol}</span>
    
    {/* Bottom: Rank + Suit (rotated) */}
    <div className="rotate-180">
      <span className="text-2xl font-bold text-red-500">{rank}</span>
      <span className="text-3xl text-red-500">{suitSymbol}</span>
    </div>
  </div>
</motion.div>

// Face-down card
<div className="w-12 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded border-2 border-blue-900">
  <div className="w-8 h-10 bg-blue-700 rounded-sm border border-blue-800" />
</div>
```

**States:**
- **Idle**: Default scale, no rotation
- **Hover**: `scale: 1.05`, slight Y rotation
- **Selected**: `scale: 1.1`, elevated with blue ring
- **Dragging**: `scale: 1.1`, rotated, highest z-index

### Card Pile

A container for stacked cards (tableau, foundation, stock, waste).

```tsx
<div className="card-pile">
  {/* Foundation pile */}
  <div className="foundation-pile" />
  
  {/* Tableau pile */}
  <div className="tableau-pile" />
</div>
```

**Variants:**
- **Foundation**: Rounded, yellow border, yellow-tinted background
- **Tableau**: Rounded, gray border, semi-transparent white

### Glass Card

Translucent card with backdrop blur for UI elements.

```tsx
<motion.div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20">
  {/* Content */}
</motion.div>
```

### Wallet Button

Primary action button for wallet connection.

```tsx
<button className="wallet-button">
  {/* WalletMultiButton from @solana/wallet-adapter-react-ui */}
</button>
```

```css
.wallet-button {
  @apply px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold 
         hover:bg-purple-700 transition-colors duration-200 shadow-lg;
}
```

### Stake Button

Primary CTA for game actions.

```tsx
<button className="stake-button text-lg">
  🎮 Start New Game
</button>
```

```css
.stake-button {
  @apply px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white 
         rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 
         transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105;
}
```

### Reward Badge

Animated badge for earnings and achievements.

```tsx
<span className="reward-badge">
  🏆 2x Reward
</span>
```

```css
.reward-badge {
  @apply inline-flex items-center px-3 py-1 rounded-full text-sm font-medium 
         bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg 
         animate-pulse-slow;
}
```

### Modal

Overlay dialog for staking, rewards, and confirmations.

```tsx
<motion.div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <motion.div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
    {/* Modal content */}
  </motion.div>
</motion.div>
```

**Animation:**
- **Enter**: Fade in backdrop, scale up modal
- **Exit**: Fade out backdrop, scale down modal

### Stat Card

Game statistics display.

```tsx
<motion.div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-4 border border-white border-opacity-20">
  <p className="text-gray-300 text-sm">Games Played</p>
  <p className="text-2xl font-bold text-white">{count}</p>
</motion.div>
```

### Feature Card

Informational cards on the welcome screen.

```tsx
<motion.div 
  whileHover={{ scale: 1.05 }}
  className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-6 border border-white border-opacity-20"
>
  <div className="text-3xl mb-3">🃏</div>
  <h3 className="text-xl font-semibold text-white mb-2">Classic Solitaire</h3>
  <p className="text-gray-300">Description text</p>
</motion.div>
```

### Token Balance Display

Shows GAME token holdings in the header.

```tsx
<div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-full px-4 py-2">
  <div className="w-6 h-6 bg-yellow-500 rounded-full" />
  <span className="text-white font-medium">{balance} GAME</span>
</div>
```

### Wallet Badge

Small pill showing connected wallet providers.

```tsx
<div className="flex items-center space-x-2 bg-white bg-opacity-10 rounded-full px-4 py-2">
  <div className="w-6 h-6 bg-purple-500 rounded-full" />
  <span className="text-white text-sm">Phantom</span>
</div>
```

---

## Animations & Motion

### Framer Motion Variants

```tsx
// Card animations
const cardVariants = {
  idle: { scale: 1, rotateY: 0 },
  hover: { scale: 1.05, rotateY: 5 },
  selected: { scale: 1.1, y: -10 },
  dragging: { scale: 1.1, rotate: 5, zIndex: 1000 },
}

// Fade in
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

// Scale in
const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 },
}
```

### Tailwind Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| `animate-card-flip` | 0.6s | Card flip reveal |
| `animate-card-deal` | 0.3s | Card dealing |
| `animate-float` | 3s infinite | Floating elements |
| `animate-pulse-slow` | 3s infinite | Reward badges |

### Keyframes

```css
@keyframes flip {
  0% { transform: rotateY(0); }
  50% { transform: rotateY(90deg); }
  100% { transform: rotateY(0); }
}

@keyframes deal {
  0% { transform: translateY(-100px) rotate(180deg); opacity: 0; }
  100% { transform: translateY(0) rotate(0); opacity: 1; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

### Logo Animation

The rotating gradient orb in the header:

```tsx
<motion.div
  initial={{ rotate: 0 }}
  animate={{ rotate: 360 }}
  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
  className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
/>
```

### Interaction Patterns

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Card hover | Scale up + slight rotation | 200ms |
| Card select | Scale up + elevate | 200ms |
| Card deal | Slide down + rotate in | 300ms |
| Card flip | Y-axis rotation | 600ms |
| Modal enter | Fade + scale | 300ms |
| Page transition | Fade + slide up | 500ms |
| Feature card hover | Scale up | 200ms |

---

## Dark Theme

### Background Layers

```
┌─────────────────────────────────────────┐
│  Gradient Background (slate-900 → purple-900 → slate-900)  │
├─────────────────────────────────────────┤
│  Glass Header (black/20 + backdrop-blur)  │
├─────────────────────────────────────────┤
│  Content Area  │
│  ┌─────────────────────────────────┐  │
│  │  Glass Cards (white/10 + backdrop-blur)  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  Playing Cards (white bg)  │  │  │
│  │  └─────────────────────────┘  │  │
│  └─────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  Glass Footer (black/20 + backdrop-blur)  │
└─────────────────────────────────────────┘
```

### Color Contrast

| Element | Background | Text | Ratio |
|---------|------------|------|-------|
| Primary text | Dark gradient | `text-white` | 15:1+ |
| Secondary text | Dark gradient | `text-gray-300` | 8:1+ |
| Card face | `bg-white` | `text-red-500` / `text-gray-900` | 7:1+ |
| Glass card | `white/10` | `text-white` | 10:1+ |

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, stacked cards |
| Tablet | 640px - 1024px | 2-column features, adjusted spacing |
| Desktop | > 1024px | Full layout, side-by-side elements |

### Mobile Considerations

- **Card size**: Remains `w-20 h-28` for touch targets
- **Spacing**: Reduced gaps (`space-x-2` instead of `space-x-4`)
- **Stacking**: Game board rows stack vertically on small screens
- **Touch**: Larger tap targets, no hover states

### Responsive Utilities

```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-4">

// Hide on mobile
<div className="hidden md:block">

// Grid columns adjust
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
```

---

## Accessibility

### Color Contrast

- All text meets WCAG AA standards (4.5:1 minimum)
- Interactive elements have visible focus states
- Card suits use both color AND symbol (not color alone)

### Keyboard Navigation

- All interactive elements are focusable
- Tab order follows logical flow
- Escape closes modals
- Arrow keys for card navigation (planned)

### Screen Readers

- Cards announce rank and suit
- Game state changes are announced
- Modal dialogs are properly labeled
- Images have alt text

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## CSS Architecture

### Layer Structure

```css
@layer base {
  /* CSS custom properties (HSL format) */
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    /* ... */
  }
  
  .dark {
    /* Dark theme overrides */
  }
}

@layer components {
  /* Reusable component classes */
  .solitaire-card { }
  .card-pile { }
  .foundation-pile { }
  .tableau-pile { }
  .wallet-button { }
  .stake-button { }
  .reward-badge { }
}

@layer utilities {
  /* Custom utility classes */
  .text-balance { }
  .gradient-text { }
}
```

### Tailwind Config Extensions

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { /* blue scale */ },
        card: { hearts, diamonds, clubs, spades },
        background: { game, card, highlight },
      },
      animation: {
        'card-flip': 'flip 0.6s',
        'card-deal': 'deal 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'card': '...',
        'card-hover': '...',
        'glow': '...',
      },
    },
  },
}
```

---

## File Structure

```
apps/web/src/
├── app/
│   ├── globals.css          # Global styles, CSS variables, component classes
│   ├── layout.tsx           # Root layout with providers
│   └── page.tsx             # Main page (welcome + game)
├── components/
│   ├── game/
│   │   ├── GameBoard.tsx    # Main game board
│   │   ├── PlayingCard.tsx  # Individual card component
│   │   ├── CardPile.tsx     # Card pile container
│   │   ├── GameControls.tsx # Undo, hint, new game
│   │   ├── GameStats.tsx    # Statistics display
│   │   ├── StakeModal.tsx   # Staking dialog
│   │   └── DevnetHelper.tsx # Devnet setup guide
│   ├── wallet/
│   │   └── WalletConnect.tsx # Wallet connection UI
│   ├── token/
│   │   └── TokenBalances.tsx # Token display
│   ├── ui/
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   └── providers/
│       ├── WalletAdapterProvider.tsx
│       └── QueryClientProvider.tsx
├── types/
│   └── index.ts             # TypeScript interfaces
├── utils/
│   └── index.ts             # Utility functions
├── hooks/                   # Custom React hooks
└── store/                   # Zustand state management
```

---

## Design Tokens Reference

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Default card shadow |
| `shadow-card-hover` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Hover state |
| `shadow-glow` | `0 0 20px rgba(59,130,246,0.5)` | Selected/active glow |

### Transitions

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `transition-colors` | 200ms | ease | Button hover |
| `transition-all` | 200ms | ease | Transform + color |
| `transition-transform` | 200ms | ease | Scale effects |

### Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Game board |
| Cards | 10 | Playing cards |
| Dragging | 1000 | Currently dragged card |
| Modal backdrop | 50 | Overlay |
| Modal content | 50 | Dialog |

---

## Iconography

### Emoji Usage

| Emoji | Context |
|-------|---------|
| 🃏 | Cards, solitaire |
| 🎮 | Play, gaming |
| 💰 | Money, staking |
| 🏆 | Rewards, winning |
| 🎯 | Goals, targets |
| 💎 | Premium, bonuses |
| 🔗 | Connection, links |
| 🚀 | Devnet, launch |

### Suit Symbols

| Suit | Symbol | Unicode |
|------|--------|---------|
| Hearts | ♥ | U+2665 |
| Diamonds | ♦ | U+2666 |
| Clubs | ♣ | U+2663 |
| Spades | ♠ | U+2660 |

---

## Implementation Notes

### CSS Class Naming

- Use Tailwind utilities first
- Component classes in `globals.css` for complex patterns
- BEM-like naming for custom classes (e.g., `.solitaire-card.face-down`)

### State Management

- **Game state**: React `useState` in GameBoard
- **Wallet state**: `@solana/wallet-adapter-react`
- **Server state**: `@tanstack/react-query`
- **Global state**: Zustand (available, not yet implemented)

### Animation Library

- **Primary**: Framer Motion for complex animations
- **Secondary**: Tailwind CSS for simple transitions
- **Performance**: Use `will-change` sparingly, prefer transforms

### Component Patterns

- All game components are `'use client'` (interactive)
- Providers wrap the app at layout level
- Modals use portal pattern (fixed positioning)
- Cards use `motion.div` for animations

---

## Future Considerations

### Planned Additions

- [ ] Light theme support
- [ ] Custom card back designs
- [ ] Particle effects for wins
- [ ] Sound effects integration
- [ ] Haptic feedback (mobile)
- [ ] Card shuffle animation
- [ ] Achievement badges
- [ ] Leaderboard UI

### Design Debt

- Standardize modal animations across all dialogs
- Create reusable Button component variants
- Extract color tokens to CSS custom properties
- Add Storybook for component documentation

---

*Last updated: 2026-06-23*
*Version: 1.0.0*
