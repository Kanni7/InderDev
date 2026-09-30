# Mausam - Figma AI Design Prompt
*Copy everything below into Figma AI as a single prompt.*

---

Design a **mobile app UI for "Mausam"**, a next-generation Indian government weather app that acts as a **personalized weather decision-assistant**, not a generic weather dashboard. Platform: **iOS/Android mobile, 390×844px frames**. Style direction: **Indian, trustworthy, intelligent, atmospheric, government-grade yet premium** - NOT a copy of Apple Weather or Google Weather, NOT a generic chatbot aesthetic, NOT overloaded with cards or gradients.

## 1. Core Concept
The homepage adapts to a selected **User Type** so it only shows information relevant to that person's daily decisions. Every screen follows the principle **Data → Interpretation → Recommendation → Action** (e.g. instead of "31°C, 78% humidity," show "Feels Hot & Humid - best outdoor window 6-8 AM").

## 2. User Types (8)
Health-conscious · Outdoor Fitness · Beach/Surf · Traveler · Parent/Family · Agriculture/Gardener · Commuter · Event Planner.

## 3. Information Architecture
- **Hamburger menu (top-left, 3-line icon)** → My Profile, User Type, Health Preferences, Saved Locations, Notifications, Settings
- **Top bar**: location selector (current/search/saved/recent), current condition, temperature, one-line AI summary
- **Personalized Insight card**: single prominent AI recommendation for the active user type (e.g. "🏃 Best running window: 6:00-8:15 AM")
- **Key Metrics row**: 3-4 metrics filtered to the active user type only
- **Forecast section**: hourly scroll strip + 7-day list
- **Alerts banner**: appears only when relevant, 4-tier severity (Informational / Advisory / Warning / Critical), never overwhelms the screen
- **"Ask Mausam AI" entry point**: persistent, thumb-reachable (bottom pill or floating button)

## 4. Homepage Screen - Layout Spec
Top to bottom:
1. Hamburger menu + location pill + notification icon
2. Hero zone: temperature, condition icon, AI one-line summary, weather-adaptive background
3. Personalized Insight card (largest visual weight after hero)
4. Key Metrics - horizontal scroll of 3-4 icon+value chips, filtered by user type
5. Hourly forecast - horizontal scroll
6. 7-day forecast - vertical compact list
7. Alerts (conditional, collapsible)
8. "Ask Mausam AI" floating entry, sticky at bottom

## 5. Per-User-Type Homepage Variations
Design distinct states of the same layout (swap Insight card + Key Metrics only - structure stays consistent):
- **Health-conscious**: AQI, pollen, UV, allergy warning → "High pollen today, avoid open windows 10 AM-2 PM"
- **Fitness**: sunrise/sunset, wind, best workout window → "Best time to run: 6:00-8:00 AM"
- **Beach/Surf**: tide time, wave height, water temp, storm warning → "High tide at 6:42 PM"
- **Traveler**: destination weather card (Home/Trip/Saved locations), packing suggestion → "Carry a raincoat in London"
- **Parent/Family**: school-commute window, rain alert, visibility → "Heavy rain during school commute - carry an umbrella"
- **Agriculture**: soil moisture, rainfall forecast, frost risk → "Rain expected tomorrow - delay irrigation"
- **Commuter**: visibility, fog, route-based delay estimate → "Heavy rain may add 20 min to your commute"
- **Event Planner**: extended forecast, rain probability, comfort index → "Saturday: 20% rain, outdoor comfort high 5-8 PM"

## 6. AI Assistant (Chat Screen)
- Entry: "Ask Mausam AI" - opens a bottom-sheet or full-screen chat, not a generic chatbot bubble UI
- Suggested prompt chips: "Should I go outside now?", "Best time to run?", "Will it rain on my trip?", "What should I carry?"
- Every AI response follows this structure: **Weather fact → Reasoning → Recommendation → Optional action button**
  - Example: "⚠️ Not recommended. Temp will hit 35°C with high UV and humidity. Best alternative: 6:15-8:00 AM."
- Include a confidence/context tag when relevant (e.g. "Based on 3-hour forecast")

## 7. Weather-Adaptive Theming
Background and accent tone shift by condition, staying professional and legible at all times (no game-like effects):
- **Sunny**: bright, warm, energetic tones
- **Cloudy**: soft, muted, low-saturation
- **Rainy**: cool blues, subtle animated rain texture
- **Storm**: dark, high-contrast, warning-emphasized
- **Fog**: minimal, low-contrast, desaturated
- **Night**: dark navy/charcoal sky theme
Theme changes background and accents only - text contrast and hierarchy stay constant across all states.

## 8. Alert System
4-tier visual hierarchy (color + icon, never color alone): Informational (neutral), Advisory (yellow), Warning (orange), Critical (red, top-of-screen, dismiss-resistant). Critical alerts must be impossible to miss without blocking core content.

## 9. Design System
- **Typography**: clear hierarchy, large readable sizes (min 16px body), Indian-language-ready font stack (Latin + Devanagari support)
- **Color**: weather-adaptive but WCAG-AA contrast maintained in every state
- **Icons**: simple, consistent line/duotone weather icon set - no color-only meaning
- **Cards**: rounded (12-16px radius), purposeful shadows, no decorative clutter
- **Buttons**: clear primary/secondary CTA hierarchy
- **Navigation**: hamburger menu + bottom "Ask AI" entry; no bottom tab bar clutter
- **Spacing**: consistent 8px grid
- **Accessibility**: large tap targets, screen-reader-friendly order, English + Hindi toggle, no color-only indicators

## 10. Microinteractions
- Smooth theme transition when weather condition or user type changes
- Subtle animated rain/cloud motion in backgrounds (rain and storm states only, low-distraction)
- Insight card gentle fade/slide-in on load
- AI chat: typing indicator styled as a small weather-icon pulse, not a generic three-dot bubble

## 11. Screens to Generate
For each screen below, produce a distinct frame:
1. **Onboarding - User Type Selection** (grid of 8 user types with icons, single-select, "Continue" CTA)
2. **Homepage - default/Fitness state** (full layout per Section 4)
3. **Homepage - Traveler state** (with multi-location cards: Home/Trip/Saved)
4. **Homepage - Agriculture state** (soil/rain/frost focused)
5. **Hamburger Menu (open state)** - My Profile, User Type, Health Preferences, Saved Locations, Notifications, Settings
6. **AI Assistant - Chat screen** (suggested prompts + one example Q&A exchange showing the fact→reasoning→recommendation format)
7. **Alerts screen** - list showing all 4 severity tiers with example content
8. **Weather-adaptive states** - same homepage frame shown in Sunny, Rainy, Storm, and Night themes side by side

## 12. Hackathon Differentiators to Visually Emphasize
- Personalization is *visible*, not hidden in settings - show the same screen changing across user types
- AI answers are decisions, not data dumps
- Government-grade trust cues (clean typography, high contrast, calm color use) combined with a genuinely modern, non-generic visual identity
- Multilingual and accessibility support shown explicitly, not as an afterthought

Generate all screens as a connected mobile prototype with realistic Indian city names, times, and weather data as example content throughout.