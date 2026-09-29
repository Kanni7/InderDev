# Mausam

A multi-profile weather intelligence app built with React, Vite, and Tailwind CSS v4. Mausam delivers personalized weather insights tailored to different lifestyle needs with immersive, time-of-day-aware visuals.

## Features

- **8 User Profiles** - Health-conscious, Outdoor Fitness, Beach/Surf, Traveler, Family, Agriculture, Commuter, and Events -- each with tailored widgets and recommendations
- **Dynamic Theming** - 24 distinct themes (6 weather conditions x 4 times of day) with high-res Unsplash photography and live accent color extraction
- **Rain Radar** - Interactive precipitation map with OpenStreetMap tiles, canvas-based rendering, and 10-hour forecast animation
- **Multi-City Support** - Quick switching between Pune, Mumbai, Delhi, Bengaluru, Chennai, and Kolkata
- **6 Languages** - English, Hindi, Telugu, Malayalam, Tamil, and Punjabi
- **Lifestyle Index** - Scores for running, car washing, laundry, photography, and stargazing
- **Weather Alerts** - Severity-tiered alert system (info, advisory, warning, critical)
- **AI Chat** - Weather-focused conversational interface

## Tech Stack

| Category | Tools |
|----------|-------|
| Framework | React 19 |
| Build | Vite 8, TypeScript 5.7 |
| Styling | Tailwind CSS v4 |
| Formatting | oxfmt |
| Maps | OpenStreetMap tiles + Canvas API |
| Images | Unsplash |

## Project Structure

```
src/
  App.tsx              # Main app shell and state management
  main.tsx             # React entry point
  index.css            # Global styles and Tailwind theme
  mausam/
    Home.tsx           # Dashboard screen
    RainRadar.tsx      # Precipitation map and full-screen radar
    screens.tsx        # Onboarding, Menu, Chat, Alerts screens
    data.ts            # Mock weather data, user types, locations
    theme.ts           # Weather theme matrix and time-based styling
    i18n.ts            # Multi-language translations
    ui.tsx             # Reusable UI components (cards, charts)
    icons.tsx          # SVG icon components
    useAccent.ts       # Live color extraction hook
    audio.ts           # Audio utilities
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Format code
pnpm format
```

## Design Highlights

- **Glass morphism UI** with translucent card layers
- **DM Sans** + **Noto Sans Devanagari** typography
- **Mobile-first** layout (max-width 410px)
- **CSS custom properties** for runtime theme switching
- **DPR-aware canvas** rendering for sharp visuals on high-density displays
