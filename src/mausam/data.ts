import type { Condition } from "./theme";

export type UserTypeKey =
  | "health" | "fitness" | "beach" | "traveler"
  | "parent" | "agri" | "commuter" | "event";

export interface UserType {
  key: UserTypeKey;
  label: string;
  hindi: string;
  glyph: string;
  tag: string;
}

export const userTypes: UserType[] = [
  { key: "health", label: "Health-conscious", hindi: "स्वास्थ्य", glyph: "AQI", tag: "Air, pollen and UV aware" },
  { key: "fitness", label: "Outdoor Fitness", hindi: "फ़िटनेस", glyph: "RUN", tag: "Best training windows" },
  { key: "beach", label: "Beach and Surf", hindi: "समुद्र", glyph: "TIDE", tag: "Tides, waves and water" },
  { key: "traveler", label: "Traveler", hindi: "यात्री", glyph: "TRIP", tag: "Multi-city and packing" },
  { key: "parent", label: "Family", hindi: "परिवार", glyph: "SCH", tag: "School-commute safety" },
  { key: "agri", label: "Agriculture", hindi: "कृषि", glyph: "SOIL", tag: "Soil, rain and frost" },
  { key: "commuter", label: "Travel and Commute", hindi: "यात्रा", glyph: "ROAD", tag: "Visibility and delays" },
  { key: "event", label: "Events", hindi: "आयोजन", glyph: "PLAN", tag: "Comfort and rain odds" },
];

/* ─────────── Location profiles (swap the area) ─────────── */
export interface Sun { sunrise: string; sunset: string; daylight: string; progress: number; }
export interface Air { aqi: number; aqiLabel: string; uv: number; uvLabel: string; heat: number; heatLabel: string; }
export interface Precip { next: string; amount: string; rate: string; chance: number; bars: { t: string; v: number }[]; note: string; }
export interface Pollen { level: string; count: number; types: string; trend: string; }
export interface Flight { route: string; time: string; status: "On time" | "Minor delay" | "Delayed"; }
export interface Travel { traffic: "Light" | "Moderate" | "Heavy"; trafficNote: string; visibility: string; flights: Flight[]; }
export interface Wind { speed: number; dir: string; gust: number; }
export interface Pressure { value: number; trend: string; }
export type TemperatureUnit = "C" | "F";

export function formatTemp(tempC: number, unit: TemperatureUnit): string {
  if (unit === "F") {
    return `${Math.round((tempC * 9) / 5 + 32)}°`;
  }
  return `${Math.round(tempC)}°`;
}

export interface LifestyleIndex {
  id: string;
  name: string;
  nameHi: string;
  glyph: string;
  score: number; // 0..100
  label: string;
  labelHi: string;
  detail: string;
  detailHi: string;
  color: string;
}

export function getLifestyleIndices(loc: Location): LifestyleIndex[] {
  const isWet = loc.condition === "rainy" || loc.condition === "storm";
  const rainChance = loc.precip.chance;
  
  // 1. Workout / Running
  const runScore = Math.max(10, Math.round(100 - (loc.air.heat > 30 ? (loc.air.heat - 30) * 4 : 0) - (loc.air.aqi > 50 ? (loc.air.aqi - 50) * 0.4 : 0) - rainChance * 0.5));
  
  // 2. Car Wash
  let carLabel = "Great";
  let carLabelHi = "उत्तम";
  let carScore = 95;
  let carColor = "#7bd88f";
  if (isWet || rainChance > 40) {
    carLabel = "Poor";
    carLabelHi = "खराब";
    carScore = 25;
    carColor = "#e5484d";
  } else if (rainChance > 15) {
    carLabel = "Fair";
    carLabelHi = "मध्यम";
    carScore = 60;
    carColor = "#f2c53d";
  }

  // 3. Laundry Drying
  const dryTime = isWet ? "Slow (6h+)" : loc.humidity < 60 ? "Fast (2h)" : "Moderate (3.5h)";
  const dryScore = isWet ? 20 : loc.humidity < 60 ? 92 : 65;

  // 4. Photography & Golden Hour
  const photoScore = loc.condition === "sunny" || loc.condition === "cloudy" ? 88 : 45;

  // 5. Stargazing
  const starScore = loc.condition === "sunny" || loc.condition === "night" ? 85 : 30;

  return [
    {
      id: "workout",
      name: "Outdoor Running",
      nameHi: "आउटडोर दौड़",
      glyph: "🏃",
      score: runScore,
      label: runScore > 75 ? "Optimal" : runScore > 50 ? "Moderate" : "Challenging",
      labelHi: runScore > 75 ? "उत्कृष्ट" : runScore > 50 ? "मध्यम" : "कठिन",
      detail: runScore > 75 ? "Cool morning air, perfect for 5k-10k run" : "High heat or AQI, slow your pace",
      detailHi: runScore > 75 ? "ठंडी सुबह, 5k-10k दौड़ के लिए उपयुक्त" : "गर्मी या AQI अधिक, गति धीमी रखें",
      color: runScore > 75 ? "#7bd88f" : runScore > 50 ? "#f2c53d" : "#e5484d",
    },
    {
      id: "carwash",
      name: "Car Wash Rating",
      nameHi: "कार वॉश रेटिंग",
      glyph: "🚗",
      score: carScore,
      label: carLabel,
      labelHi: carLabelHi,
      detail: carScore > 70 ? "No rain expected for next 48 hours" : "Rain expected soon, hold off on washing",
      detailHi: carScore > 70 ? "अगले 48 घंटों में बारिश की संभावना नहीं" : "शीघ्र ही बारिश की संभावना, धुलाई टालें",
      color: carColor,
    },
    {
      id: "laundry",
      name: "Laundry Drying",
      nameHi: "कपड़े सुखाने की स्थिति",
      glyph: "🧺",
      score: dryScore,
      label: dryTime,
      labelHi: dryTime,
      detail: loc.humidity < 60 ? "High evaporation rate, outdoor drying recommended" : "High humidity slows down drying time",
      detailHi: loc.humidity < 60 ? "उच्च वाष्पीकरण दर, बाहर सुखाना अनुशंसित" : "अधिक आर्द्रता से कपड़े देर में सूखेंगे",
      color: dryScore > 70 ? "#7bd88f" : "#f2c53d",
    },
    {
      id: "photo",
      name: "Golden Hour & Photo",
      nameHi: "फोटोग्राफी सूचकांक",
      glyph: "📷",
      score: photoScore,
      label: photoScore > 70 ? "Vibrant Sky" : "Overcast / Dim",
      labelHi: photoScore > 70 ? "जीवंत आकाश" : "धुंधला आकाश",
      detail: `Golden hour starts at ${loc.sun.sunset.replace("PM", "")} PM`,
      detailHi: `गोल्डन आवर सूर्यास्त समय पर शुरू`,
      color: photoScore > 70 ? "#f5a623" : "#6ea8d8",
    },
    {
      id: "stargazing",
      name: "Astronomy & Night Sky",
      nameHi: "खगोल विज्ञान और रात का आकाश",
      glyph: "🌌",
      score: starScore,
      label: starScore > 70 ? "Clear View" : "Obscured",
      labelHi: starScore > 70 ? "साफ़ दृश्य" : "धुंधला",
      detail: `${loc.moon.name} (${loc.moon.illum}% illumination)`,
      detailHi: `${loc.moon.name} (${loc.moon.illum}% चमक)`,
      color: starScore > 70 ? "#a855f7" : "#6ea8d8",
    },
  ];
}

export interface Moon { phase: number; name: string; illum: number; }

export interface LocationAlert { tier: Tier; title: string; body: string; }

export interface HourlyPoint { t: string; c: Condition; temp: number; }
export interface DailyPoint { day: string; c: Condition; hi: number; lo: number; rain: number; }

export interface Location {
  key: string;
  city: string;
  region: string;
  condition: Condition;
  temp: number;
  feels: number;
  summary: string;
  alert?: LocationAlert;
  air: Air;
  sun: Sun;
  precip: Precip;
  pollen: Pollen;
  travel: Travel;
  wind: Wind;
  humidity: number;
  dewPoint: number;
  pressure: Pressure;
  moon: Moon;
  hourlyForecast?: HourlyPoint[];
  weeklyForecast?: DailyPoint[];
}

export const locations: Location[] = [
  {
    key: "pune", city: "Pune", region: "Maharashtra", condition: "sunny", temp: 29, feels: 32,
    summary: "Clear morning, heating up fast after 9 AM",
    air: { aqi: 62, aqiLabel: "Moderate", uv: 8, uvLabel: "Very high by 1 PM", heat: 34, heatLabel: "Caution by noon" },
    sun: { sunrise: "5:58 AM", sunset: "6:21 PM", daylight: "12h 23m", progress: 0.28 },
    precip: { next: "Tomorrow 3 PM", amount: "6 mm", rate: "0.2 mm/h", chance: 20, note: "Dry through the day", bars: [{ t: "10", v: 5 }, { t: "12", v: 8 }, { t: "2", v: 12 }, { t: "4", v: 20 }, { t: "6", v: 10 }] },
    pollen: { level: "Moderate", count: 5.4, types: "Grass, Neem", trend: "Rising towards midday" },
    travel: { traffic: "Moderate", trafficNote: "Slow near Shivajinagar", visibility: "9 km", flights: [{ route: "Pune to Delhi", time: "10:20", status: "On time" }, { route: "Pune to Bengaluru", time: "11:45", status: "Minor delay" }, { route: "Pune to Mumbai", time: "1:10", status: "On time" }] },
    wind: { speed: 9, dir: "NE", gust: 16 }, humidity: 54, dewPoint: 18, pressure: { value: 1010, trend: "Steady" }, moon: { phase: 0.42, name: "Waxing Gibbous", illum: 78 },
  },
  {
    key: "mumbai", city: "Mumbai", region: "Maharashtra", condition: "cloudy", temp: 31, feels: 35,
    summary: "Humid and overcast, sea breeze by evening",
    alert: { tier: "warning", title: "Orange Alert · Heavy rainfall", body: "115 to 140 mm expected in 24h. Low-lying areas at flood risk." },
    air: { aqi: 88, aqiLabel: "Moderate", uv: 6, uvLabel: "High", heat: 35, heatLabel: "Muggy" },
    sun: { sunrise: "6:12 AM", sunset: "6:28 PM", daylight: "12h 16m", progress: 0.3 },
    precip: { next: "Today 5 PM", amount: "18 mm", rate: "3 mm/h", chance: 55, note: "Showers likely at dusk", bars: [{ t: "10", v: 20 }, { t: "12", v: 30 }, { t: "2", v: 40 }, { t: "4", v: 55 }, { t: "6", v: 45 }] },
    pollen: { level: "High", count: 7.8, types: "Grass, Weed", trend: "Steady in the humidity" },
    travel: { traffic: "Heavy", trafficNote: "Sea Link congested", visibility: "6 km", flights: [{ route: "Mumbai to Delhi", time: "9:50", status: "Minor delay" }, { route: "Mumbai to Bengaluru", time: "10:30", status: "On time" }, { route: "Mumbai to Goa", time: "12:15", status: "Delayed" }] },
    wind: { speed: 14, dir: "W", gust: 22 }, humidity: 78, dewPoint: 26, pressure: { value: 1006, trend: "Falling" }, moon: { phase: 0.5, name: "Full Moon", illum: 99 },
  },
  {
    key: "delhi", city: "Delhi", region: "NCR", condition: "storm", temp: 27, feels: 29,
    summary: "Thundershowers building through the afternoon",
    alert: { tier: "critical", title: "Red Alert · Severe thunderstorm", body: "IMD warns of lightning and gusty winds up to 70 km/h between 3 and 8 PM. Stay indoors." },
    air: { aqi: 168, aqiLabel: "Unhealthy for sensitive groups", uv: 4, uvLabel: "Moderate", heat: 30, heatLabel: "Warm" },
    sun: { sunrise: "6:14 AM", sunset: "6:02 PM", daylight: "11h 48m", progress: 0.34 },
    precip: { next: "Today 4 PM", amount: "38 mm", rate: "9 mm/h", chance: 85, note: "Storm cells approaching", bars: [{ t: "10", v: 25 }, { t: "12", v: 45 }, { t: "2", v: 70 }, { t: "4", v: 85 }, { t: "6", v: 60 }] },
    pollen: { level: "Very High", count: 9.6, types: "Dust, Weed", trend: "Drops after the rain" },
    travel: { traffic: "Heavy", trafficNote: "Ring Road waterlogging risk", visibility: "4 km", flights: [{ route: "Delhi to Mumbai", time: "9:30", status: "Delayed" }, { route: "Delhi to Bengaluru", time: "11:00", status: "Minor delay" }, { route: "Delhi to Pune", time: "2:40", status: "Minor delay" }] },
    wind: { speed: 18, dir: "NW", gust: 34 }, humidity: 66, dewPoint: 21, pressure: { value: 1002, trend: "Falling fast" }, moon: { phase: 0.62, name: "Waning Gibbous", illum: 88 },
  },
  {
    key: "bengaluru", city: "Bengaluru", region: "Karnataka", condition: "rainy", temp: 22, feels: 22,
    summary: "Wet morning, easing by afternoon",
    air: { aqi: 46, aqiLabel: "Good", uv: 3, uvLabel: "Low, overcast", heat: 24, heatLabel: "Cool" },
    sun: { sunrise: "6:05 AM", sunset: "6:24 PM", daylight: "12h 19m", progress: 0.32 },
    precip: { next: "Now", amount: "12 mm", rate: "5 mm/h", chance: 80, note: "Steady rain, clears by 11 AM", bars: [{ t: "10", v: 80 }, { t: "12", v: 50 }, { t: "2", v: 30 }, { t: "4", v: 20 }, { t: "6", v: 15 }] },
    pollen: { level: "Low", count: 2.1, types: "Grass", trend: "Washed out by rain" },
    travel: { traffic: "Heavy", trafficNote: "ORR crawling in the rain", visibility: "3 km", flights: [{ route: "Bengaluru to Delhi", time: "9:10", status: "Minor delay" }, { route: "Bengaluru to Mumbai", time: "10:55", status: "On time" }, { route: "Bengaluru to Pune", time: "1:30", status: "On time" }] },
    wind: { speed: 11, dir: "SW", gust: 19 }, humidity: 88, dewPoint: 20, pressure: { value: 1008, trend: "Rising" }, moon: { phase: 0.25, name: "First Quarter", illum: 50 },
  },
  {
    key: "chennai", city: "Chennai", region: "Tamil Nadu", condition: "sunny", temp: 33, feels: 38,
    summary: "Hot and bright, high UV near midday",
    air: { aqi: 71, aqiLabel: "Moderate", uv: 10, uvLabel: "Extreme by noon", heat: 38, heatLabel: "Hydrate often" },
    sun: { sunrise: "6:00 AM", sunset: "6:10 PM", daylight: "12h 10m", progress: 0.26 },
    precip: { next: "Fri 1 PM", amount: "3 mm", rate: "0.1 mm/h", chance: 10, note: "No rain expected today", bars: [{ t: "10", v: 3 }, { t: "12", v: 5 }, { t: "2", v: 8 }, { t: "4", v: 10 }, { t: "6", v: 6 }] },
    pollen: { level: "High", count: 7.2, types: "Grass, Palm", trend: "Peaks in the afternoon" },
    travel: { traffic: "Moderate", trafficNote: "OMR steady", visibility: "10 km", flights: [{ route: "Chennai to Delhi", time: "9:40", status: "On time" }, { route: "Chennai to Mumbai", time: "11:20", status: "On time" }, { route: "Chennai to Bengaluru", time: "12:50", status: "Minor delay" }] },
    wind: { speed: 12, dir: "E", gust: 20 }, humidity: 62, dewPoint: 24, pressure: { value: 1009, trend: "Steady" }, moon: { phase: 0.15, name: "Waxing Crescent", illum: 22 },
  },
  {
    key: "kolkata", city: "Kolkata", region: "West Bengal", condition: "fog", temp: 23, feels: 24,
    summary: "Dense fog on outer roads until 8 AM",
    alert: { tier: "advisory", title: "Yellow Advisory · Dense fog", body: "Visibility below 400 m on EM Bypass and airport approach roads until 8 AM." },
    air: { aqi: 121, aqiLabel: "Unhealthy for sensitive groups", uv: 2, uvLabel: "Low in fog", heat: 24, heatLabel: "Cool" },
    sun: { sunrise: "5:52 AM", sunset: "5:58 PM", daylight: "12h 06m", progress: 0.36 },
    precip: { next: "Sat 9 AM", amount: "2 mm", rate: "0.1 mm/h", chance: 15, note: "Fog, no measurable rain", bars: [{ t: "10", v: 10 }, { t: "12", v: 12 }, { t: "2", v: 15 }, { t: "4", v: 12 }, { t: "6", v: 10 }] },
    pollen: { level: "Moderate", count: 4.7, types: "Weed, Grass", trend: "Trapped by the fog" },
    travel: { traffic: "Heavy", trafficNote: "Low visibility on EM Bypass", visibility: "400 m", flights: [{ route: "Kolkata to Delhi", time: "9:25", status: "Delayed" }, { route: "Kolkata to Mumbai", time: "10:40", status: "Minor delay" }, { route: "Kolkata to Bengaluru", time: "1:05", status: "Minor delay" }] },
    wind: { speed: 6, dir: "N", gust: 11 }, humidity: 82, dewPoint: 20, pressure: { value: 1011, trend: "Rising" }, moon: { phase: 0.78, name: "Last Quarter", illum: 48 },
  },
];

/** Packing tips derived from the current sky */
export function packingTips(c: Condition): { tip: string; hi: string }[] {
  switch (c) {
    case "rainy": return [{ tip: "Carry a raincoat and umbrella", hi: "रेनकोट व छाता रखें" }, { tip: "Waterproof your bag", hi: "बैग वाटरप्रूफ़ करें" }, { tip: "Wear grippy footwear", hi: "फिसलनरोधी जूते" }];
    case "storm": return [{ tip: "An umbrella will not hold, stay covered", hi: "छाता कम, ढककर रहें" }, { tip: "Keep devices charged", hi: "डिवाइस चार्ज रखें" }, { tip: "Avoid open ground", hi: "खुले मैदान से बचें" }];
    case "sunny": return [{ tip: "Sunscreen SPF 50 and a cap", hi: "सनस्क्रीन व टोपी" }, { tip: "Carry a water bottle", hi: "पानी की बोतल" }, { tip: "Sunglasses for the UV", hi: "धूप का चश्मा" }];
    case "fog": return [{ tip: "Use fog lights and leave early", hi: "फ़ॉग लाइट, जल्दी निकलें" }, { tip: "Wear a light layer", hi: "हल्की परत पहनें" }, { tip: "Keep reflective gear", hi: "रिफ्लेक्टिव गियर" }];
    case "cloudy": return [{ tip: "A light jacket for the breeze", hi: "हल्की जैकेट" }, { tip: "UV is still moderate, wear a cap", hi: "टोपी रखें" }, { tip: "An umbrella just in case", hi: "छाता साथ रखें" }];
    case "night": return [{ tip: "A warm layer for the cool air", hi: "गर्म परत रखें" }, { tip: "Reflective gear if walking", hi: "रिफ्लेक्टिव गियर" }, { tip: "Keep a light handy", hi: "टॉर्च रखें" }];
  }
}

/* ─────────── Vocation config: insight, metrics and widget ORDER ─────────── */
export interface Metric { label: string; value: string; sub: string; }
export interface Insight { headline: string; detail: string; window?: string; }

/** Every block appears for every vocation, only the ORDER changes. "foryou" is always first.
 *  "alert" is no longer in this list — it is pinned permanently in the hero gap. */
export type Block =
  | "air" | "pollen" | "precip" | "rainmap" | "sun" | "travel" | "packing"
  | "wind" | "humidity" | "dewpoint" | "pressure" | "moon"
  | "metrics" | "hourly" | "weekly";

export const ALL_BLOCKS: Block[] = [
  "air", "pollen", "precip", "rainmap", "sun", "travel", "packing",
  "wind", "humidity", "dewpoint", "pressure", "moon",
  "metrics", "hourly", "weekly",
];

export interface Vocation {
  insight: Insight;
  metrics: Metric[];
  metricsLabel: string;
  order: Block[];
}

/** Complete an order so no block is ever missing */
function full(order: Block[]): Block[] {
  const rest = ALL_BLOCKS.filter((b) => !order.includes(b));
  return [...order, ...rest];
}

export const vocations: Record<UserTypeKey, Vocation> = {
  // Best running hours, Heat risk, UV, Wind, Outdoor comfort
  fitness: {
    insight: { headline: "Best time to run is 6:00 to 8:00 AM", detail: "Clear skies, low AQI and a gentle NE breeze right now. After 9 AM the feels-like climbs past 34°C.", window: "6:00-8:00 AM" },
    metrics: [{ label: "Outdoor comfort", value: "Good", sub: "till 9 AM" }, { label: "Recovery", value: "7.5", sub: "out of 10" }, { label: "Cadence", value: "168", sub: "spm goal" }],
    metricsLabel: "Training",
    order: full(["air", "wind", "metrics", "sun", "hourly"]),
  },
  // Air, pollen, UV first for a sensitive person
  health: {
    insight: { headline: "High pollen today, keep windows shut 10 AM to 2 PM", detail: "Grass pollen peaks midday alongside a rising AQI. Prefer indoor cardio and an N95 outdoors.", window: "10 AM-2 PM" },
    metrics: [{ label: "Pollen", value: "High", sub: "grass" }, { label: "Humidity", value: "71", sub: "%" }, { label: "Breathe", value: "Indoor", sub: "advised" }],
    metricsLabel: "Wellbeing",
    order: full(["air", "pollen", "humidity", "sun", "packing", "metrics"]),
  },
  // Rain forecast, Soil moisture, Frost risk, Humidity, Wind, Growing conditions
  agri: {
    insight: { headline: "Rain expected tomorrow, delay irrigation", detail: "The forecast rainfall is enough for grape and onion beds. Resume only if the soil dries by Thursday." },
    metrics: [{ label: "Soil moisture", value: "38", sub: "% low" }, { label: "Frost risk", value: "None", sub: "min 19°" }, { label: "Growing", value: "Fair", sub: "index" }],
    metricsLabel: "Field",
    order: full(["precip", "rainmap", "metrics", "humidity", "wind"]),
  },
  // Wave height, Sea conditions, Water temperature, Wind, Tide times
  beach: {
    insight: { headline: "High tide at 6:42 PM, surf before 4 PM", detail: "Wave height 1.2 m with offshore wind gives clean sets. Water is a comfortable 28°C.", window: "before 4:00 PM" },
    metrics: [{ label: "Wave height", value: "1.2", sub: "m clean" }, { label: "Sea", value: "Offshore", sub: "good sets" }, { label: "Water temp", value: "28°", sub: "warm" }, { label: "Tide", value: "6:42", sub: "PM high" }],
    metricsLabel: "Surf and sea",
    order: full(["metrics", "wind", "sun", "precip", "rainmap"]),
  },
  traveler: {
    insight: { headline: "Carry a light raincoat for your trip", detail: "Your destination sees 70% rain on Saturday. Home stays dry, so pack layers for a 14°C swing." },
    metrics: [{ label: "Home", value: "29°", sub: "Clear" }, { label: "London", value: "13°", sub: "Rain" }, { label: "Goa", value: "31°", sub: "Humid" }],
    metricsLabel: "Your cities",
    order: full(["travel", "packing", "hourly", "metrics", "weekly"]),
  },
  // School commute weather, UV, Heat, Rain timing, Outdoor comfort
  parent: {
    insight: { headline: "Rain during the school commute, carry an umbrella", detail: "7:30 to 9 AM sees the heaviest showers with reduced visibility. Roads clear after 11 AM.", window: "7:30-9:00 AM" },
    metrics: [{ label: "Outdoor comfort", value: "Fair", sub: "PM only" }, { label: "School run", value: "Wet", sub: "7-9 AM" }, { label: "Temp", value: "22°", sub: "cool" }],
    metricsLabel: "Family",
    order: full(["precip", "air", "hourly", "packing", "metrics"]),
  },
  // Commute weather, Visibility, Flight/weather disruption, Rain during commute, Packing suggestion
  commuter: {
    insight: { headline: "Heavy fog may add 20 minutes to your commute", detail: "Visibility under 400 m before 8 AM. Leave by 7:15 or take the metro to stay on time." },
    metrics: [{ label: "Visibility", value: "380", sub: "m" }, { label: "Delay", value: "+20", sub: "min" }, { label: "Fog lifts", value: "8:10", sub: "AM" }],
    metricsLabel: "Route",
    order: full(["travel", "precip", "packing", "hourly", "metrics"]),
  },
  // Event comfort score, Rain probability, Wind, Temperature, Weather risk
  event: {
    insight: { headline: "Saturday 5 to 8 PM has 20% rain and high comfort", detail: "Golden-hour temps settle to 26°C with light wind. It is the lowest rain risk of the weekend for your event.", window: "Sat 5:00-8:00 PM" },
    metrics: [{ label: "Comfort score", value: "82", sub: "out of 100" }, { label: "Weather risk", value: "Low", sub: "Saturday" }, { label: "Sunset", value: "6:24", sub: "PM" }],
    metricsLabel: "Event",
    order: full(["metrics", "precip", "wind", "weekly"]),
  },
};

export function aqiColor(aqi: number) {
  if (aqi <= 50) return "#7bd88f";
  if (aqi <= 100) return "#f2c53d";
  if (aqi <= 150) return "#f0873a";
  if (aqi <= 200) return "#e5484d";
  return "#a855f7";
}
export function uvColor(uv: number) {
  if (uv <= 2) return "#7bd88f";
  if (uv <= 5) return "#f2c53d";
  if (uv <= 7) return "#f0873a";
  if (uv <= 10) return "#e5484d";
  return "#a855f7";
}
export function pollenColor(level: string) {
  if (level === "Low") return "#7bd88f";
  if (level === "Moderate") return "#f2c53d";
  if (level === "High") return "#f0873a";
  return "#e5484d";
}
export function trafficColor(tr: string) {
  if (tr === "Light") return "#7bd88f";
  if (tr === "Moderate") return "#f2c53d";
  return "#e5484d";
}
export function statusColor(s: Flight["status"]) {
  if (s === "On time") return "#7bd88f";
  if (s === "Minor delay") return "#f2c53d";
  return "#e5484d";
}

export const hourly: { t: string; c: Condition; temp: number }[] = [
  { t: "Now", c: "sunny", temp: 29 },
  { t: "10 AM", c: "sunny", temp: 31 },
  { t: "11 AM", c: "cloudy", temp: 32 },
  { t: "12 PM", c: "cloudy", temp: 33 },
  { t: "1 PM", c: "sunny", temp: 34 },
  { t: "2 PM", c: "cloudy", temp: 33 },
  { t: "3 PM", c: "rainy", temp: 30 },
  { t: "4 PM", c: "rainy", temp: 28 },
];

export const weekly: { day: string; c: Condition; hi: number; lo: number; rain: number }[] = [
  { day: "Today", c: "sunny", hi: 34, lo: 24, rain: 10 },
  { day: "Mon", c: "cloudy", hi: 33, lo: 24, rain: 30 },
  { day: "Tue", c: "rainy", hi: 30, lo: 23, rain: 70 },
  { day: "Wed", c: "storm", hi: 28, lo: 22, rain: 85 },
  { day: "Thu", c: "rainy", hi: 29, lo: 22, rain: 60 },
  { day: "Fri", c: "cloudy", hi: 31, lo: 23, rain: 25 },
  { day: "Sat", c: "sunny", hi: 33, lo: 24, rain: 15 },
];

export type Tier = "info" | "advisory" | "warning" | "critical";

export const tierMeta: Record<Tier, { label: string; color: string }> = {
  info: { label: "Informational", color: "var(--color-tier-info)" },
  advisory: { label: "Advisory", color: "var(--color-tier-advisory)" },
  warning: { label: "Warning", color: "var(--color-tier-warning)" },
  critical: { label: "Critical", color: "var(--color-tier-critical)" },
};

export interface AlertItem { tier: Tier; title: string; body: string; time: string; area: string }

/** Derive the alert feed from a location's live weather. The 4-tier colour
 * scheme (critical / warning / advisory / info) is fixed; only the content,
 * severity and count shift with the selected city's actual conditions. */
export function alertsForLocation(loc: Location): AlertItem[] {
  const out: AlertItem[] = [];
  const area = `${loc.city}, ${loc.region}`;

  // Critical — active storm cells
  if (loc.condition === "storm") {
    out.push({
      tier: "critical",
      title: "Red Alert: Severe thunderstorm",
      body: `Lightning and gusty winds up to ${loc.wind.gust} km/h expected through the afternoon. Stay indoors and away from open ground.`,
      time: "12 min ago",
      area,
    });
  }

  // Warning — heavy rain and flooding risk
  if (loc.precip.chance >= 55 || loc.condition === "rainy") {
    out.push({
      tier: "warning",
      title: "Orange Alert: Heavy rainfall",
      body: `${loc.precip.amount} likely at ${loc.precip.rate}. ${loc.precip.note}. Low-lying roads may waterlog.`,
      time: "1 hr ago",
      area,
    });
  }

  // Advisory — fog, heat or high UV, whichever is driving conditions
  if (loc.condition === "fog") {
    out.push({
      tier: "advisory",
      title: "Yellow Advisory: Dense fog",
      body: `Visibility down to ${loc.travel.visibility} on outer roads until 8 AM. Use fog lamps and keep speed low.`,
      time: "2 hrs ago",
      area,
    });
  } else if (loc.air.heat >= 37) {
    out.push({
      tier: "advisory",
      title: "Yellow Advisory: Heat building",
      body: `Feels-like near ${loc.feels}°C with UV ${loc.air.uv}. Hydrate often and avoid direct sun from 12 to 4 PM.`,
      time: "3 hrs ago",
      area,
    });
  } else if (loc.air.uv >= 9) {
    out.push({
      tier: "advisory",
      title: "Yellow Advisory: Very high UV",
      body: `UV index peaks at ${loc.air.uv} near midday. Use sunscreen and cover up when outdoors.`,
      time: "3 hrs ago",
      area,
    });
  }

  // Air quality — severity scales with the reading
  const aqi = loc.air.aqi;
  if (aqi >= 150) {
    out.push({ tier: "warning", title: "Orange Alert: Poor air quality", body: `AQI at ${aqi} (${loc.air.aqiLabel}). Sensitive groups should limit outdoor exertion.`, time: "4 hrs ago", area });
  } else if (aqi >= 100) {
    out.push({ tier: "advisory", title: "Yellow Advisory: Air quality dipping", body: `AQI at ${aqi} (${loc.air.aqiLabel}) with low wind dispersion.`, time: "4 hrs ago", area });
  } else {
    out.push({ tier: "info", title: "Notice: Air quality acceptable", body: `AQI at ${aqi} (${loc.air.aqiLabel}). Good conditions for time outdoors today.`, time: "Today", area });
  }

  // Sort by severity so the feed reads critical to informational
  const rank: Record<Tier, number> = { critical: 0, warning: 1, advisory: 2, info: 3 };
  return out.sort((a, b) => rank[a.tier] - rank[b.tier]);
}

export const chatChips = [
  "Should I go outside now?",
  "Best time to run?",
  "Will it rain on my trip?",
  "What should I carry?",
];
