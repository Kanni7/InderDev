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
  engine/
    profile.ts         # UserProfile type, localStorage persistence, React context
    weights.ts         # Weight engine: init, behaviour scores, updateWeights
    ranking.ts         # Module ranking by interest weights x affinities x live relevance
    signals.ts         # SignalSource interface, SimulatedSignalSource, BrowserSignalSource
    ProfileProvider.tsx # React context provider
    __tests__/
      weights.test.ts  # 11 Vitest tests for weights, ranking, scenarios
  ai/
    mausamAI.ts        # Groq API integration, generateInsight, askWhy
    fallbackAnswers.ts # Offline fallback answers per interest (EN + HI)
  data/
    openMeteo.ts       # Open-Meteo forecast + air quality API with 15-min cache
  demo/
    DemoPanel.tsx      # Floating demo panel with weight chart, signals, scenarios
    scenarios/
      index.ts         # 3 scenarios: Fitness->Commuter, Farmer, Traveller
  mausam/
    Home.tsx           # Dashboard screen with ranked modules
    RainRadar.tsx      # Precipitation map and full-screen radar
    screens.tsx        # Onboarding, Menu, Chat (AI-powered), Alerts
    data.ts            # Mock weather data, user types, locations
    theme.ts           # Weather theme matrix and time-based styling
    i18n.ts            # Multi-language translations (6 languages)
    ui.tsx             # Reusable UI components (cards, charts)
    icons.tsx          # SVG icon components
    useAccent.ts       # Live color extraction hook
    audio.ts           # Audio utilities
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Preview production build
npm run preview
```

### Viewing as a phone
- **Chrome DevTools**: Open DevTools (F12) > Toggle Device Toolbar (Ctrl+Shift+M) > Select a phone (e.g. iPhone 14 Pro)
- **Real phone on local network**: `npm run dev -- --host` then open the Network URL on your phone
- **Note**: Geolocation requires HTTPS. Deploy to Vercel or Netlify for real-device geolocation.

### Mausam AI (optional)
Copy `.env.example` to `.env` and add your Groq API key:
```
VITE_GROQ_API_KEY=gsk_your_key_here
```
The app works without it using pre-written fallback answers. The frontend key is demo-only; production would proxy through a backend.

## Personalisation Engine

The app includes a local-only personalisation engine:

- **Local Profile** (`src/engine/profile.ts`): All user data stays on-device in localStorage. No user data is ever sent over the network.
- **Weight Engine** (`src/engine/weights.ts`): Blends explicit interest picks (0.1), past behaviour signals (0.3), and current weights (0.6) to rank the 16 homepage modules.
- **Ranking** (`src/engine/ranking.ts`): Module score = sum(interestWeight x affinity x liveRelevance). Alert-pinned modules go to the top.
- **Demo Panel**: Click the "Demo" button to simulate activity signals, location changes, alerts, and play multi-day scenarios.

## 2-Minute Demo Video Click Script

1. **Pick Fitness** on the onboarding screen. Tap "Continue".
2. **Homepage**: Scroll through the ranked cards. Open the Demo panel (bottom-left "Demo" button).
3. **Weight chart**: Note Fitness is the dominant bar in the interest weights chart.
4. **Play "Fitness to Commuter"**: Click the scenario button. Watch the weight bars animate over 10 simulated days. Commute grows, Fitness shrinks. The homepage cards reorder in real time.
5. **Trigger Orange alert**: Click "Orange alert" in the Demo panel. The AQI module pins to the top of the card list.
6. **Ask why**: Tap "Ask Mausam AI" floating button. Type "Should I go for a run?" and send. See the AI response (or fallback answer).
7. **Switch to Hindi**: Open the menu (hamburger icon) > tap "Hindi". The entire UI, demo panel, and AI responses switch to Hindi.
8. **Reset**: Click "Reset profile" in the Demo panel. Weights return to initial state.

## Design Highlights

- **Glass morphism UI** with translucent card layers
- **DM Sans** + **Noto Sans Devanagari** typography
- **Mobile-first** layout (max-width 410px)
- **CSS custom properties** for runtime theme switching
- **DPR-aware canvas** rendering for sharp visuals on high-density displays
- **Open-Meteo** live weather data with fallback to mock data (prototype uses Open-Meteo in place of IMD/CPCB feeds)
