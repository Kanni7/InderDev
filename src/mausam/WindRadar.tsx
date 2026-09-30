import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { makeT, type Lang } from "./i18n";
import type { Wind, Location } from "./data";
import {
  fetchRadarCitiesWind,
  fetchWindTimeline,
  fetchRainViewerFrames,
  type LiveRadarCityWind,
  type WindTimelineFrame,
  type RainViewerData,
} from "../data/openMeteo";
import * as I from "./icons";
import {
  type WindField,
  type WindVector,
  type ObservationPoint,
  createWindField,
  getWindVector,
  interpolateWindFields,
  getMotionArrow,
  meteoDirToDegrees,
  DEFAULT_INDIA_BOUNDS,
} from "./windField";

// Re-export wind field interfaces and functions for full modularity
export type { WindField, WindVector, ObservationPoint };
export { getWindVector, createWindField, interpolateWindFields, getMotionArrow };

/* ─────────────────── CONFIGURATION ─────────────────── */

// Authentic GIS Basemaps (ESRI World Dark Gray Canvas & ESRI World Imagery)
export const TILE_URL_ESRI_DARK_BASE = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const TILE_URL_ESRI_DARK_BASE_FALLBACK = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
export const TILE_URL_ESRI_DARK_REFERENCE = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

export const TILE_URL_PRIMARY = TILE_URL_ESRI_DARK_BASE;
export const TILE_URL_FALLBACK = TILE_URL_ESRI_DARK_BASE_FALLBACK;

// Backwards-compatible aliases
export const TILE_URL_CARTO_DARK = TILE_URL_ESRI_DARK_BASE;
export const TILE_URL_CARTO_DARK_FALLBACK = TILE_URL_ESRI_DARK_BASE_FALLBACK;

export const TILE_URL_ESRI_SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const TILE_URL_ESRI_REFERENCE = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

// Coordinates for core cities supported by the app
export const APP_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  pune: { lat: 18.52, lng: 73.86 },
  mumbai: { lat: 19.08, lng: 72.88 },
  delhi: { lat: 28.61, lng: 77.21 },
  bengaluru: { lat: 12.97, lng: 77.59 },
  chennai: { lat: 13.08, lng: 80.27 },
  kolkata: { lat: 22.57, lng: 88.36 },
};

export interface RadarCity {
  name: string;
  lat: number;
  lng: number;
  baseSpeed: number; // default fallback if live data pending
  baseTemp: number;  // realistic regional temperature baseline
  baseDir?: string;  // realistic meteorological direction FROM where wind blows
  tier: 1 | 2 | 3;   // 1 = major hub, 2 = regional city, 3 = local town/hill station
}

// Comprehensive cities and meteorological observation points across India
export const WIND_CITIES: RadarCity[] = [
  // ── North & Himalayas ──
  { name: "Delhi", lat: 28.61, lng: 77.21, baseSpeed: 11, baseTemp: 33, tier: 1 },
  { name: "Chandigarh", lat: 30.73, lng: 76.78, baseSpeed: 10, baseTemp: 30, tier: 1 },
  { name: "Srinagar", lat: 34.08, lng: 74.79, baseSpeed: 8, baseTemp: 19, tier: 1 },
  { name: "Leh", lat: 34.15, lng: 77.58, baseSpeed: 12, baseTemp: 9, tier: 1 },
  { name: "Jammu", lat: 32.73, lng: 74.87, baseSpeed: 9, baseTemp: 29, tier: 2 },
  { name: "Shimla", lat: 31.10, lng: 77.17, baseSpeed: 9, baseTemp: 17, tier: 2 },
  { name: "Dharamshala", lat: 32.22, lng: 76.32, baseSpeed: 8, baseTemp: 21, tier: 3 },
  { name: "Dehradun", lat: 30.32, lng: 78.03, baseSpeed: 9, baseTemp: 26, tier: 2 },
  { name: "Nainital", lat: 29.39, lng: 79.46, baseSpeed: 8, baseTemp: 18, tier: 3 },
  { name: "Amritsar", lat: 31.63, lng: 74.87, baseSpeed: 10, baseTemp: 31, tier: 2 },
  { name: "Ludhiana", lat: 30.90, lng: 75.85, baseSpeed: 10, baseTemp: 31, tier: 3 },
  { name: "Agra", lat: 27.18, lng: 78.01, baseSpeed: 10, baseTemp: 34, tier: 2 },
  { name: "Lucknow", lat: 26.85, lng: 80.95, baseSpeed: 9, baseTemp: 33, tier: 1 },
  { name: "Varanasi", lat: 25.32, lng: 82.97, baseSpeed: 9, baseTemp: 33, tier: 2 },
  { name: "Prayagraj", lat: 25.43, lng: 81.85, baseSpeed: 9, baseTemp: 33, tier: 3 },

  // ── West & Arid / Desert ──
  { name: "Jaipur", lat: 26.91, lng: 75.79, baseSpeed: 11, baseTemp: 34, tier: 1 },
  { name: "Jodhpur", lat: 26.24, lng: 73.02, baseSpeed: 12, baseTemp: 36, tier: 2 },
  { name: "Bikaner", lat: 28.02, lng: 73.31, baseSpeed: 13, baseTemp: 36, tier: 3 },
  { name: "Jaisalmer", lat: 26.92, lng: 70.90, baseSpeed: 14, baseTemp: 38, tier: 2 },
  { name: "Udaipur", lat: 24.58, lng: 73.68, baseSpeed: 10, baseTemp: 32, tier: 2 },
  { name: "Kota", lat: 25.18, lng: 75.83, baseSpeed: 10, baseTemp: 35, tier: 3 },
  { name: "Ahmedabad", lat: 23.02, lng: 72.57, baseSpeed: 12, baseTemp: 34, tier: 1 },
  { name: "Surat", lat: 21.17, lng: 72.83, baseSpeed: 12, baseTemp: 32, tier: 2 },
  { name: "Vadodara", lat: 22.31, lng: 73.18, baseSpeed: 11, baseTemp: 33, tier: 2 },
  { name: "Rajkot", lat: 22.30, lng: 70.80, baseSpeed: 13, baseTemp: 33, tier: 2 },
  { name: "Bhuj", lat: 23.24, lng: 69.67, baseSpeed: 14, baseTemp: 34, tier: 3 },
  { name: "Veraval", lat: 20.90, lng: 70.36, baseSpeed: 16, baseTemp: 30, tier: 3 },

  // ── Central & Plateau ──
  { name: "Bhopal", lat: 23.25, lng: 77.41, baseSpeed: 10, baseTemp: 32, tier: 1 },
  { name: "Indore", lat: 22.72, lng: 75.86, baseSpeed: 11, baseTemp: 31, tier: 2 },
  { name: "Gwalior", lat: 26.22, lng: 78.18, baseSpeed: 10, baseTemp: 34, tier: 2 },
  { name: "Jabalpur", lat: 23.18, lng: 79.99, baseSpeed: 9, baseTemp: 32, tier: 2 },
  { name: "Nagpur", lat: 21.14, lng: 79.08, baseSpeed: 9, baseTemp: 33, tier: 1 },
  { name: "Raipur", lat: 21.25, lng: 81.63, baseSpeed: 9, baseTemp: 33, tier: 2 },
  { name: "Bilaspur", lat: 22.08, lng: 82.14, baseSpeed: 9, baseTemp: 32, tier: 3 },

  // ── Maharashtra & Western Ghats ──
  { name: "Mumbai", lat: 19.08, lng: 72.88, baseSpeed: 14, baseTemp: 32, tier: 1 },
  { name: "Pune", lat: 18.52, lng: 73.86, baseSpeed: 10, baseTemp: 29, tier: 1 },
  { name: "Nashik", lat: 19.99, lng: 73.78, baseSpeed: 11, baseTemp: 28, tier: 2 },
  { name: "Chhatrapati Sambhajinagar", lat: 19.88, lng: 75.34, baseSpeed: 11, baseTemp: 31, tier: 2 },
  { name: "Kolhapur", lat: 16.70, lng: 74.24, baseSpeed: 11, baseTemp: 28, tier: 2 },
  { name: "Solapur", lat: 17.65, lng: 75.90, baseSpeed: 12, baseTemp: 33, tier: 2 },
  { name: "Ratnagiri", lat: 16.99, lng: 73.30, baseSpeed: 13, baseTemp: 30, tier: 3 },
  { name: "Mahabaleshwar", lat: 17.92, lng: 73.66, baseSpeed: 12, baseTemp: 20, tier: 3 },
  { name: "Panaji", lat: 15.49, lng: 73.82, baseSpeed: 14, baseTemp: 31, tier: 1 },

  // ── South India (Tamil Nadu, Karnataka, Kerala) ──
  { name: "Chennai", lat: 13.08, lng: 80.27, baseSpeed: 15, baseTemp: 33, tier: 1 },
  { name: "Bengaluru", lat: 12.97, lng: 77.59, baseSpeed: 12, baseTemp: 27, tier: 1 },
  { name: "Hyderabad", lat: 17.38, lng: 78.48, baseSpeed: 10, baseTemp: 32, tier: 1 },
  { name: "Mysuru", lat: 12.29, lng: 76.63, baseSpeed: 11, baseTemp: 28, tier: 2 },
  { name: "Hubballi", lat: 15.36, lng: 75.12, baseSpeed: 15, baseTemp: 30, tier: 2 },
  { name: "Mangaluru", lat: 12.91, lng: 74.85, baseSpeed: 13, baseTemp: 30, tier: 2 },
  { name: "Belagavi", lat: 15.85, lng: 74.50, baseSpeed: 12, baseTemp: 28, tier: 3 },
  { name: "Coimbatore", lat: 11.01, lng: 76.95, baseSpeed: 14, baseTemp: 29, tier: 2 },
  { name: "Madurai", lat: 9.92, lng: 78.11, baseSpeed: 12, baseTemp: 34, tier: 2 },
  { name: "Tiruchirappalli", lat: 10.79, lng: 78.70, baseSpeed: 12, baseTemp: 34, tier: 2 },
  { name: "Salem", lat: 11.66, lng: 78.15, baseSpeed: 11, baseTemp: 32, tier: 3 },
  { name: "Ooty", lat: 11.41, lng: 76.70, baseSpeed: 10, baseTemp: 16, tier: 3 },
  { name: "Puducherry", lat: 11.94, lng: 79.80, baseSpeed: 13, baseTemp: 32, tier: 2 },
  { name: "Kochi", lat: 9.93, lng: 76.26, baseSpeed: 13, baseTemp: 31, tier: 1 },
  { name: "Kozhikode", lat: 11.25, lng: 75.78, baseSpeed: 12, baseTemp: 31, tier: 2 },
  { name: "Thiruvananthapuram", lat: 8.52, lng: 76.93, baseSpeed: 16, baseTemp: 31, tier: 1 },
  { name: "Kanyakumari", lat: 8.08, lng: 77.55, baseSpeed: 17, baseTemp: 30, tier: 2 },
  { name: "Rameswaram", lat: 9.28, lng: 79.31, baseSpeed: 18, baseTemp: 32, tier: 2 },
  { name: "Trincomalee", lat: 8.58, lng: 81.23, baseSpeed: 18, baseTemp: 31, tier: 2 },

  // ── Andhra Pradesh & Telangana (East Coast & Inland Towns) ──
  { name: "Visakhapatnam", lat: 17.68, lng: 83.21, baseSpeed: 14, baseTemp: 31, tier: 1 },
  { name: "Vijayawada", lat: 16.50, lng: 80.64, baseSpeed: 13, baseTemp: 33, tier: 1 },
  { name: "Vizianagaram", lat: 18.11, lng: 83.41, baseSpeed: 12, baseTemp: 31, tier: 2 },
  { name: "Bobbili", lat: 18.57, lng: 83.36, baseSpeed: 10, baseTemp: 30, tier: 3 },
  { name: "Tuni", lat: 17.35, lng: 82.55, baseSpeed: 11, baseTemp: 31, tier: 3 },
  { name: "Rajamahendravaram", lat: 16.98, lng: 81.78, baseSpeed: 11, baseTemp: 32, tier: 2 },
  { name: "Kakinada", lat: 16.98, lng: 82.24, baseSpeed: 13, baseTemp: 32, tier: 2 },
  { name: "Eluru", lat: 16.71, lng: 81.10, baseSpeed: 10, baseTemp: 32, tier: 2 },
  { name: "Guntur", lat: 16.30, lng: 80.44, baseSpeed: 12, baseTemp: 33, tier: 2 },
  { name: "Palakollu", lat: 16.52, lng: 81.73, baseSpeed: 12, baseTemp: 31, tier: 3 },
  { name: "Machilipatnam", lat: 16.18, lng: 81.13, baseSpeed: 14, baseTemp: 32, tier: 2 },
  { name: "Prathipadu", lat: 17.23, lng: 82.20, baseSpeed: 10, baseTemp: 31, tier: 3 },
  { name: "Chirala", lat: 15.82, lng: 80.35, baseSpeed: 13, baseTemp: 32, tier: 3 },
  { name: "Nellore", lat: 14.44, lng: 79.98, baseSpeed: 13, baseTemp: 33, tier: 2 },
  { name: "Tirupati", lat: 13.63, lng: 79.42, baseSpeed: 12, baseTemp: 33, tier: 2 },
  { name: "Kurnool", lat: 15.83, lng: 78.03, baseSpeed: 12, baseTemp: 34, tier: 2 },
  { name: "Kadapa", lat: 14.47, lng: 78.82, baseSpeed: 11, baseTemp: 34, tier: 2 },
  { name: "Anantapur", lat: 14.68, lng: 77.60, baseSpeed: 13, baseTemp: 33, tier: 2 },
  { name: "Cherla", lat: 18.08, lng: 80.82, baseSpeed: 8, baseTemp: 33, tier: 3 },
  { name: "Kothagudem", lat: 17.55, lng: 80.62, baseSpeed: 9, baseTemp: 33, tier: 3 },
  { name: "Khammam", lat: 17.25, lng: 80.15, baseSpeed: 10, baseTemp: 33, tier: 2 },
  { name: "Madhira", lat: 16.92, lng: 80.37, baseSpeed: 9, baseTemp: 33, tier: 3 },
  { name: "Warangal", lat: 17.96, lng: 79.59, baseSpeed: 9, baseTemp: 33, tier: 2 },
  { name: "Nizamabad", lat: 18.67, lng: 78.09, baseSpeed: 10, baseTemp: 33, tier: 2 },
  { name: "Karimnagar", lat: 18.44, lng: 79.13, baseSpeed: 10, baseTemp: 33, tier: 2 },
  { name: "Nalgonda", lat: 17.05, lng: 79.27, baseSpeed: 10, baseTemp: 33, tier: 3 },
  { name: "Suryapet", lat: 17.14, lng: 79.62, baseSpeed: 10, baseTemp: 33, tier: 3 },

  // ── East & Northeast ──
  { name: "Kolkata", lat: 22.57, lng: 88.36, baseSpeed: 10, baseTemp: 32, tier: 1 },
  { name: "Siliguri", lat: 26.73, lng: 88.40, baseSpeed: 9, baseTemp: 28, tier: 2 },
  { name: "Darjeeling", lat: 27.04, lng: 88.26, baseSpeed: 8, baseTemp: 15, tier: 3 },
  { name: "Patna", lat: 25.61, lng: 85.14, baseSpeed: 9, baseTemp: 32, tier: 1 },
  { name: "Gaya", lat: 24.79, lng: 85.00, baseSpeed: 9, baseTemp: 33, tier: 3 },
  { name: "Ranchi", lat: 23.34, lng: 85.31, baseSpeed: 10, baseTemp: 29, tier: 2 },
  { name: "Jamshedpur", lat: 22.80, lng: 86.20, baseSpeed: 9, baseTemp: 32, tier: 2 },
  { name: "Bhubaneswar", lat: 20.29, lng: 85.82, baseSpeed: 12, baseTemp: 32, tier: 1 },
  { name: "Puri", lat: 19.81, lng: 85.83, baseSpeed: 14, baseTemp: 31, tier: 3 },
  { name: "Rourkela", lat: 22.25, lng: 84.85, baseSpeed: 9, baseTemp: 32, tier: 3 },
  { name: "Guwahati", lat: 26.14, lng: 91.74, baseSpeed: 8, baseTemp: 28, tier: 1 },
  { name: "Shillong", lat: 25.57, lng: 91.88, baseSpeed: 7, baseTemp: 20, tier: 2 },
  { name: "Gangtok", lat: 27.34, lng: 88.61, baseSpeed: 7, baseTemp: 17, tier: 3 },
  { name: "Agartala", lat: 23.83, lng: 91.28, baseSpeed: 8, baseTemp: 29, tier: 2 },
  { name: "Imphal", lat: 24.82, lng: 93.94, baseSpeed: 7, baseTemp: 25, tier: 3 },

  // ── Islands ──
  { name: "Port Blair", lat: 11.62, lng: 92.73, baseSpeed: 16, baseTemp: 30, tier: 2 },
];

/* ─────────────────── GEOGRAPHIC VECTOR BOUNDARIES ─────────────────── */

// Arabian Sea Coastline (Gujarat through Maharashtra, Goa, Karnataka, Kerala to Kanyakumari)
export const COASTLINE_WEST: [number, number][] = [
  [23.7, 68.2], [23.1, 68.6], [22.8, 69.8], [22.4, 70.1], [22.3, 69.1],
  [21.6, 69.6], [20.9, 70.36], [20.7, 70.9], [21.0, 72.0], [21.7, 72.2],
  [21.6, 72.6], [21.17, 72.83], [20.5, 72.9], [19.9, 72.7], [18.97, 72.82],
  [18.0, 73.0], [17.0, 73.2], [16.0, 73.5], [15.49, 73.82], [14.8, 74.1],
  [14.0, 74.5], [12.91, 74.85], [11.8, 75.3], [10.8, 75.9], [9.93, 76.26],
  [9.0, 76.5], [8.52, 76.93], [8.08, 77.55],
];

// Bay of Bengal Coastline (Kanyakumari through Tamil Nadu, Andhra, Odisha to West Bengal)
export const COASTLINE_EAST: [number, number][] = [
  [8.08, 77.55], [8.7, 78.1], [9.28, 79.31], [9.8, 79.0], [10.3, 79.4],
  [10.76, 79.84], [11.5, 79.8], [11.94, 79.80], [12.5, 80.1], [13.08, 80.27],
  [13.8, 80.2], [14.44, 79.98], [15.2, 80.0], [15.50, 80.04], [15.9, 80.5],
  [16.18, 81.13], [16.5, 81.8], [16.9, 82.3], [17.68, 83.21], [18.3, 83.9],
  [18.8, 84.4], [19.31, 84.79], [19.81, 85.83], [20.29, 86.7], [21.4, 87.0],
  [21.8, 87.8], [22.2, 88.1], [22.57, 88.36],
];

// North-West International Border (Gujarat, Rajasthan, Punjab, J&K, Ladakh)
export const NORTH_WEST_BORDER: [number, number][] = [
  [23.7, 68.2], [24.1, 68.8], [24.5, 70.1], [25.7, 70.3], [27.0, 70.5],
  [28.0, 71.8], [29.5, 73.0], [30.0, 73.8], [31.0, 74.5], [32.0, 74.8],
  [32.8, 74.5], [33.8, 74.1], [34.7, 74.4], [35.5, 76.5],
];

// Northern Himalayan & Nepal-Sikkim Border
export const NORTHERN_HIMALAYAN_BORDER: [number, number][] = [
  [35.5, 76.5], [35.2, 77.8], [34.0, 78.8], [33.0, 79.2], [32.2, 78.8],
  [31.5, 78.4], [30.8, 79.2], [30.0, 80.5], [28.8, 80.1],
  [28.0, 81.5], [27.5, 83.5], [26.8, 85.2], [26.5, 87.0], [26.7, 88.1],
  [27.7, 88.2], [28.0, 88.6], [27.2, 88.9], [26.8, 89.8], [26.8, 92.1],
];

// North-East International Border
export const NORTHEAST_BORDER: [number, number][] = [
  [26.8, 92.1], [27.5, 92.5], [28.5, 94.5], [29.0, 96.5], [28.0, 97.2],
  [26.5, 96.5], [25.5, 94.8], [24.0, 93.3], [22.5, 93.0], [22.0, 92.4],
];

// Bangladesh Border
export const BANGLADESH_BORDER: [number, number][] = [
  [22.0, 92.4], [23.5, 92.2], [24.5, 92.4], [25.1, 91.5], [25.2, 89.8],
  [26.1, 89.0], [25.2, 88.2], [24.0, 88.5], [22.5, 88.8], [21.8, 89.0],
  [22.57, 88.36],
];

// Sri Lanka Coastline Loop
export const SRI_LANKA_COAST: [number, number][] = [
  [9.66, 80.01], [9.1, 80.5], [8.58, 81.23], [7.73, 81.70], [6.8, 81.8],
  [6.0, 81.3], [5.95, 80.53], [6.3, 80.0], [6.92, 79.86], [7.5, 79.8],
  [8.03, 79.82], [8.6, 79.8], [9.2, 79.9], [9.66, 80.01],
];

// Nationwide State Boundaries
export const STATE_BORDERS: [number, number][][] = [
  // ── SOUTH INDIA ──
  // Karnataka - Goa
  [[15.7, 73.7], [15.5, 74.2], [14.9, 74.1]],
  // Maharashtra - Goa
  [[15.7, 73.7], [15.8, 74.0]],
  // Maharashtra - Karnataka
  [[15.8, 74.0], [16.2, 74.4], [16.8, 75.0], [17.2, 75.8], [17.4, 76.6], [17.8, 77.2]],
  // Karnataka - Kerala (Coorg / Western Ghats)
  [[12.7, 75.0], [12.2, 75.5], [11.9, 75.8]],
  // Kerala - Tamil Nadu (Western Ghats)
  [[8.1, 77.5], [8.7, 77.3], [9.5, 77.2], [10.2, 77.0], [10.8, 76.8], [11.5, 76.5], [11.9, 75.8]],
  // Karnataka - Tamil Nadu (Nilgiris, Hosur, Kuppam)
  [[11.9, 75.8], [11.5, 76.5], [11.8, 77.1], [12.6, 77.8], [12.8, 78.4]],
  // Karnataka - Andhra Pradesh
  [[12.8, 78.4], [13.4, 78.1], [13.8, 77.5], [15.1, 76.9], [16.2, 77.3], [17.2, 77.4], [17.8, 77.2]],
  // Andhra Pradesh - Tamil Nadu
  [[13.5, 80.2], [13.4, 79.5], [13.0, 79.1], [12.8, 78.4]],
  // Telangana - Andhra Pradesh
  [[17.8, 77.2], [16.2, 77.3], [16.0, 77.6], [15.8, 78.0], [16.1, 78.8], [16.5, 79.2], [16.8, 79.6], [17.0, 80.2], [17.7, 80.8], [18.8, 80.0]],
  // Maharashtra - Telangana
  [[17.8, 77.2], [18.6, 77.8], [19.5, 78.5], [19.7, 79.5], [18.8, 80.0]],
  // Andhra Pradesh - Odisha
  [[18.3, 83.0], [19.0, 84.6]],

  // ── WEST & CENTRAL INDIA ──
  // Maharashtra - Gujarat
  [[20.2, 72.8], [20.5, 73.4], [21.4, 74.1], [21.6, 74.4]],
  // Maharashtra - Madhya Pradesh
  [[21.6, 74.4], [21.3, 76.0], [21.6, 77.5], [21.6, 78.8], [21.5, 79.8], [21.3, 80.4]],
  // Gujarat - Rajasthan
  [[24.0, 70.5], [24.5, 72.6], [23.9, 73.4], [23.3, 74.3]],
  // Madhya Pradesh - Rajasthan
  [[23.3, 74.3], [24.0, 75.5], [25.0, 76.5], [26.0, 77.2], [26.7, 77.8]],
  // Madhya Pradesh - Chhattisgarh
  [[21.3, 80.4], [22.0, 81.0], [23.0, 81.8], [24.0, 82.5]],
  // Chhattisgarh - Odisha
  [[21.3, 80.4], [20.0, 81.5], [19.2, 82.2], [18.8, 82.5]],

  // ── NORTH & EAST INDIA ──
  // Rajasthan - Haryana
  [[28.0, 76.5], [28.2, 75.8], [28.9, 75.4], [29.6, 74.9]],
  // Punjab - Haryana
  [[29.6, 74.9], [29.8, 75.1], [30.0, 76.2], [30.5, 76.8]],
  // Haryana - Delhi (NCR loop)
  [[28.48, 77.03], [28.41, 77.31], [28.52, 77.35], [28.70, 77.28], [28.85, 77.10], [28.69, 76.92], [28.48, 77.03]],
  // Rajasthan - Uttar Pradesh
  [[26.7, 77.8], [27.2, 77.4], [27.8, 77.6]],
  // Uttar Pradesh - Haryana
  [[27.8, 77.6], [28.4, 77.3], [28.9, 77.2], [29.5, 77.1], [30.3, 77.3]],
  // Uttar Pradesh - Madhya Pradesh
  [[26.7, 77.8], [25.5, 78.5], [25.0, 81.0], [24.2, 83.0]],
  // Uttar Pradesh - Bihar
  [[27.3, 84.0], [25.8, 84.3], [25.5, 83.9], [25.0, 83.3], [24.2, 83.0]],
  // Bihar - West Bengal
  [[26.1, 88.2], [25.3, 87.8], [24.5, 87.2]],
  // West Bengal - Odisha
  [[21.7, 87.4], [22.0, 86.8], [22.4, 86.5]],
];

/* ─────────────────── GEO MATH ─────────────────── */

function lngToTileX(lng: number, z: number) {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

function latToTileY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z);
}

function geoToPixel(
  lat: number,
  lng: number,
  center: { lat: number; lng: number },
  zoom: number,
  w: number,
  h: number
) {
  const cx = lngToTileX(center.lng, zoom) * 256;
  const cy = latToTileY(center.lat, zoom) * 256;
  return {
    x: lngToTileX(lng, zoom) * 256 - cx + w / 2,
    y: latToTileY(lat, zoom) * 256 - cy + h / 2,
  };
}

export function pixelToGeo(
  px: number,
  py: number,
  center: { lat: number; lng: number },
  zoom: number,
  w: number,
  h: number
) {
  const cx = lngToTileX(center.lng, zoom) * 256;
  const cy = latToTileY(center.lat, zoom) * 256;
  const tileX = (px - w / 2 + cx) / 256;
  const tileY = (py - h / 2 + cy) / 256;
  const lng = (tileX / Math.pow(2, zoom)) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * tileY) / Math.pow(2, zoom);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/* ─────────────────── METEOROLOGICAL THERMAL COLORMAP ─────────────────── */

export function getThermalRGB(temp: number): [number, number, number] {
  const stops: { t: number; r: number; g: number; b: number }[] = [
    { t: -5, r: 23, g: 37, b: 84 },    // Navy blue
    { t: 6, r: 37, g: 99, b: 235 },    // Royal blue
    { t: 14, r: 6, g: 182, b: 212 },   // Sky cyan
    { t: 19, r: 20, g: 184, b: 166 },  // Teal
    { t: 24, r: 34, g: 197, b: 94 },   // Emerald green
    { t: 28, r: 132, g: 204, b: 22 },  // Lime
    { t: 32, r: 234, g: 179, b: 8 },   // Golden amber
    { t: 36, r: 249, g: 115, b: 22 },  // Warm orange
    { t: 40, r: 239, g: 68, b: 68 },   // Vivid red
    { t: 45, r: 153, g: 27, b: 27 },   // Crimson
  ];

  if (temp <= stops[0].t) return [stops[0].r, stops[0].g, stops[0].b];
  if (temp >= stops[stops.length - 1].t) {
    const last = stops[stops.length - 1];
    return [last.r, last.g, last.b];
  }

  for (let i = 0; i < stops.length - 1; i++) {
    if (temp >= stops[i].t && temp <= stops[i + 1].t) {
      const f = (temp - stops[i].t) / (stops[i + 1].t - stops[i].t);
      return [
        Math.round(stops[i].r + (stops[i + 1].r - stops[i].r) * f),
        Math.round(stops[i].g + (stops[i + 1].g - stops[i].g) * f),
        Math.round(stops[i].b + (stops[i + 1].b - stops[i].b) * f),
      ];
    }
  }
  return [234, 179, 8];
}

export function getThermalCSSColor(temp: number): string {
  const [r, g, b] = getThermalRGB(temp);
  return `rgb(${r}, ${g}, ${b})`;
}

/* ─────────────────── TILE HOOK ─────────────────── */

function useTilePositions(
  center: { lat: number; lng: number },
  zoom: number,
  w: number,
  h: number,
  layer: "wind" | "rain" | "temp" | "satellite" = "wind",
  rainViewerData?: RainViewerData | null,
  rainFrameIndex: number = 0
) {
  return useMemo(() => {
    // Strictly integer zoom for standard web slippy tiles
    const z = Math.max(4, Math.min(9, Math.round(zoom)));
    const cx = lngToTileX(center.lng, z);
    const cy = latToTileY(center.lat, z);
    const nx = Math.ceil(w / 256) + 2;
    const ny = Math.ceil(h / 256) + 2;
    const max = Math.pow(2, z) - 1;
    const out: {
      key: string;
      dx: number;
      dy: number;
      baseTileUrl: string;
      fallbackUrl: string;
      overlayUrl?: string;
      rainTileUrl?: string;
      z: number;
      wx: number;
      ty: number;
    }[] = [];

    const rainFrame =
      rainViewerData?.frames && rainViewerData.frames.length > 0
        ? rainViewerData.frames[Math.min(rainFrameIndex, rainViewerData.frames.length - 1)]
        : undefined;

    for (let tx = Math.floor(cx - nx / 2); tx <= Math.ceil(cx + nx / 2); tx++) {
      for (let ty = Math.floor(cy - ny / 2); ty <= Math.ceil(cy + ny / 2); ty++) {
        if (ty < 0 || ty > max) continue;
        const wx = ((tx % (max + 1)) + max + 1) % (max + 1);
        const dx = (tx - cx) * 256 + w / 2;
        const dy = (ty - cy) * 256 + h / 2;

        let baseTileUrl: string;
        let fallbackUrl: string;
        let overlayUrl: string | undefined;

        // All layers use real satellite imagery as the basemap
        baseTileUrl = TILE_URL_ESRI_SATELLITE.replace("{z}", String(z)).replace("{y}", String(ty)).replace("{x}", String(wx));
        fallbackUrl = baseTileUrl;
        overlayUrl = TILE_URL_ESRI_REFERENCE.replace("{z}", String(z)).replace("{y}", String(ty)).replace("{x}", String(wx));

        let rainTileUrl: string | undefined;
        if (layer === "rain" && rainViewerData && rainFrame) {
          rainTileUrl = `${rainViewerData.host}${rainFrame.path}/256/${z}/${wx}/${ty}/2/1_1.png`;
        }

        out.push({
          key: `${z}/${wx}/${ty}`,
          dx,
          dy,
          baseTileUrl,
          fallbackUrl,
          overlayUrl,
          rainTileUrl,
          z,
          wx,
          ty,
        });
      }
    }
    return out;
  }, [center.lat, center.lng, zoom, w, h, layer, rainViewerData, rainFrameIndex]);
}

/* ─────────────────── GEOGRAPHIC WIND PARTICLE SYSTEM ─────────────────── */

interface GeographicWindParticle {
  lat: number;
  lng: number;
  age: number;
  maxAge: number;
  speedMultiplier: number;
  trail: { lat: number; lng: number }[];
}

/* ─────────────────── WIND RADAR CANVAS ─────────────────── */

function WindMapCanvas({
  center,
  zoom,
  wind,
  selectedCityName,
  liveCitiesWind,
  activeLayer = "wind",
  rainViewerData,
  rainFrameIndex = 0,
  activeWindField,
}: {
  center: { lat: number; lng: number };
  zoom: number;
  wind: Wind;
  selectedCityName: string;
  liveCitiesWind: Record<string, LiveRadarCityWind>;
  activeLayer?: "wind" | "rain" | "temp" | "satellite";
  rainViewerData?: RainViewerData | null;
  rainFrameIndex?: number;
  activeWindField?: WindField;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 400, h: 700 });
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<GeographicWindParticle[]>([]);
  const thermalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const windScalarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fallback standalone wind field if not provided by parent
  const fallbackWindField = useMemo(() => {
    if (activeWindField) return activeWindField;
    const obs: ObservationPoint[] = WIND_CITIES.map((c) => {
      const isSel = c.name.toLowerCase() === selectedCityName.toLowerCase();
      const live = liveCitiesWind[c.name.toLowerCase()];
      return {
        lat: c.lat,
        lng: c.lng,
        speed: isSel ? wind.speed : (live?.speed ?? c.baseSpeed),
        dirDeg: isSel ? meteoDirToDegrees(wind.dir) : (live?.deg ?? meteoDirToDegrees(c.baseDir ?? "W")),
      };
    });
    return createWindField(obs, { bounds: DEFAULT_INDIA_BOUNDS, gridWidth: 48, gridHeight: 48 });
  }, [activeWindField, selectedCityName, liveCitiesWind, wind.speed, wind.dir]);

  const currentField = activeWindField ?? fallbackWindField;

  const centerRef = useRef(center);
  centerRef.current = center;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const currentFieldRef = useRef(currentField);
  currentFieldRef.current = currentField;
  const selectedCityNameRef = useRef(selectedCityName);
  selectedCityNameRef.current = selectedCityName;
  const liveCitiesWindRef = useRef(liveCitiesWind);
  liveCitiesWindRef.current = liveCitiesWind;

  // Update container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el.clientWidth && el.clientHeight) {
        setSize({ w: el.clientWidth, h: el.clientHeight });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const tiles = useTilePositions(center, zoom, w, h, activeLayer, rainViewerData, rainFrameIndex);

  // Initialize geographic wind particles distributed across the current map viewport
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const count = prefersReducedMotion
      ? Math.min(320, Math.floor((w * h) / 2400))
      : Math.min(1350, Math.max(700, Math.floor((w * h) / 520)));

    const tl = pixelToGeo(-60, -60, center, zoom, w, h);
    const br = pixelToGeo(w + 60, h + 60, center, zoom, w, h);
    const minLat = Math.min(tl.lat, br.lat);
    const maxLat = Math.max(tl.lat, br.lat);
    const minLng = Math.min(tl.lng, br.lng);
    const maxLng = Math.max(tl.lng, br.lng);

    const parts: GeographicWindParticle[] = [];
    for (let i = 0; i < count; i++) {
      const lat = minLat + Math.random() * (maxLat - minLat);
      const lng = minLng + Math.random() * (maxLng - minLng);
      const maxAge = 140 + Math.floor(Math.random() * 100);
      parts.push({
        lat,
        lng,
        age: Math.floor(Math.random() * maxAge),
        maxAge,
        speedMultiplier: 0.88 + Math.random() * 0.25,
        trail: [{ lat, lng }],
      });
    }
    particlesRef.current = parts;
  }, [w, h, zoom]);

  // Main render loop (60 FPS GPU-accelerated canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let running = true;

    const render = () => {
      if (!running) return;

      const center = centerRef.current;
      const zoom = zoomRef.current;
      const currentField = currentFieldRef.current;
      const selectedCityName = selectedCityNameRef.current;
      const liveCitiesWind = liveCitiesWindRef.current;

      ctx.clearRect(0, 0, w, h);

      // ── 1. ACTIVE LAYER SPECIFIC ATMOSPHERE & FLOW ──
      if (activeLayer === "wind") {
        // Subtle dark meteorological ocean-atmosphere tint
        const gradBg = ctx.createLinearGradient(0, 0, w, h);
        gradBg.addColorStop(0, "rgba(8, 20, 32, 0.22)");
        gradBg.addColorStop(0.5, "rgba(6, 18, 28, 0.16)");
        gradBg.addColorStop(1, "rgba(8, 22, 34, 0.24)");
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, w, h);

        // ── RESTRAINED METEOROLOGICAL WIND INTENSITY FIELD ──
        const gw = 48;
        const gh = 56;
        if (!windScalarCanvasRef.current) {
          windScalarCanvasRef.current = document.createElement("canvas");
        }
        const sCanvas = windScalarCanvasRef.current;
        if (sCanvas.width !== gw || sCanvas.height !== gh) {
          sCanvas.width = gw;
          sCanvas.height = gh;
        }

        const sCtx = sCanvas.getContext("2d");
        if (sCtx) {
          const imgData = sCtx.createImageData(gw, gh);
          const data = imgData.data;

          const tl = pixelToGeo(0, 0, center, zoom, w, h);
          const br = pixelToGeo(w, h, center, zoom, w, h);
          const minLat = Math.min(tl.lat, br.lat);
          const maxLat = Math.max(tl.lat, br.lat);
          const minLng = Math.min(tl.lng, br.lng);
          const maxLng = Math.max(tl.lng, br.lng);
          const dLat = (maxLat - minLat) / (gh - 1);
          const dLng = (maxLng - minLng) / (gw - 1);

          for (let gy = 0; gy < gh; gy++) {
            const lat = maxLat - gy * dLat;
            for (let gx = 0; gx < gw; gx++) {
              const lng = minLng + gx * dLng;
              const vec = getWindVector(currentField, lat, lng);
              const spd = vec.speed;
              const idx = (gy * gw + gx) * 4;

              // Restrained meteorological intensity gradient (satellite basemap remains clearly visible)
              if (spd < 6) {
                // Calm: transparent (satellite basemap crisp and clean, zero purple haze)
                data[idx] = 14;
                data[idx + 1] = 116;
                data[idx + 2] = 144;
                data[idx + 3] = 0;
              } else if (spd < 16) {
                // Gentle breeze: subtle clean oceanic cyan
                const f = (spd - 6) / 10;
                data[idx] = 6;
                data[idx + 1] = Math.round(120 + 30 * f);
                data[idx + 2] = 195;
                data[idx + 3] = Math.round(28 + 26 * f);
              } else if (spd < 26) {
                // Moderate wind: clean teal-marine
                const f = (spd - 16) / 10;
                data[idx] = Math.round(6 + 10 * f);
                data[idx + 1] = Math.round(150 + 25 * f);
                data[idx + 2] = Math.round(195 - 40 * f);
                data[idx + 3] = Math.round(54 + 26 * f);
              } else if (spd < 38) {
                // Fresh / Strong: soft warm amber/gold
                const f = (spd - 26) / 12;
                data[idx] = Math.round(16 + 215 * f);
                data[idx + 1] = Math.round(175 - 15 * f);
                data[idx + 2] = Math.round(155 - 130 * f);
                data[idx + 3] = Math.round(80 + 30 * f);
              } else {
                // Gale / High: soft coral
                data[idx] = 235;
                data[idx + 1] = 90;
                data[idx + 2] = 70;
                data[idx + 3] = 145;
              }
            }
          }
          sCtx.putImageData(imgData, 0, 0);

          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(sCanvas, 0, 0, w, h);
          ctx.restore();
        }

        // ── GEOGRAPHIC PARTICLES & VECTOR SMALL ARROWS ──
        const tl = pixelToGeo(-60, -60, center, zoom, w, h);
        const br = pixelToGeo(w + 60, h + 60, center, zoom, w, h);
        const viewMinLat = Math.min(tl.lat, br.lat);
        const viewMaxLat = Math.max(tl.lat, br.lat);
        const viewMinLng = Math.min(tl.lng, br.lng);
        const viewMaxLng = Math.max(tl.lng, br.lng);

        const parts = particlesRef.current;
        const worldPx = 256 * Math.pow(2, zoom);
        const pxPerDeg = worldPx / 360;

        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.age++;

          // Sample wind vector at particle's exact geographic coordinate
          const vec = getWindVector(currentField, p.lat, p.lng);

          // Realistic, calm drifting velocity matching Apple Weather reference:
          // 1 km/h of wind moves the particle ~0.042 pixels per frame (~2.5 px/sec per km/h).
          // At 15 km/h, this is ~0.63 px/frame (38 px/sec), creating a calm, natural flow.
          const speedFactor = (prefersReducedMotion ? 0.02 : 0.042) * p.speedMultiplier;
          const dx = vec.u * speedFactor;  // eastward displacement in pixels
          const dy = -vec.v * speedFactor; // northward displacement in pixels (upward on screen)

          // Convert screen pixel displacement to geographic coordinates
          const cosLat = Math.max(0.2, Math.cos((p.lat * Math.PI) / 180));
          p.lng += dx / (pxPerDeg * cosLat);
          p.lat -= dy / pxPerDeg;

          // Out-of-bounds or lifespan expired -> respawn naturally with staggered life
          if (
            p.age > p.maxAge ||
            p.lat < viewMinLat ||
            p.lat > viewMaxLat ||
            p.lng < viewMinLng ||
            p.lng > viewMaxLng
          ) {
            p.lat = viewMinLat + Math.random() * (viewMaxLat - viewMinLat);
            p.lng = viewMinLng + Math.random() * (viewMaxLng - viewMinLng);
            p.age = 0;
            p.maxAge = 140 + Math.floor(Math.random() * 100);
            continue;
          }

          const head = geoToPixel(p.lat, p.lng, center, zoom, w, h);

          // Skip if off screen
          if (head.x < -35 || head.x > w + 35 || head.y < -35 || head.y > h + 35) {
            continue;
          }

          // Flat trapezoidal envelope: solid 1.0 opacity during 76% of flight (eliminates all blinking/pulsing)
          const progress = p.age / p.maxAge;
          let envelope = 1.0;
          if (progress < 0.12) {
            envelope = progress / 0.12; // smooth fade in
          } else if (progress > 0.88) {
            envelope = (1 - progress) / 0.12; // smooth fade out
          }
          const baseAlpha = envelope * Math.min(0.96, 0.48 + (vec.speed / 28) * 0.48);

          // Vector angle in screen radians: east (+u) -> +x, north (+v) -> -y
          const angle = Math.atan2(-vec.v, vec.u);

          if (vec.speed < 1.0) {
            // Calm wind: subtle luminous dot
            ctx.beginPath();
            ctx.arc(head.x, head.y, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(224, 242, 254, ${baseAlpha * 0.6})`;
            ctx.fill();
          } else {
            // Dynamic Small Arrow gliding in the wind direction
            const arrowLen = Math.min(5.4, Math.max(3.4, 3.0 + (vec.speed / 25) * 1.8));
            const arrowWingSpan = 0.42; // ~24 deg wing angle
            const notchIndent = arrowLen * 0.58;

            // 1. Tapered trailing tail (shooting arrow / comet shaft)
            const tailLen = Math.min(13, Math.max(5, 4.5 + (vec.speed / 20) * 5));
            const tailX = head.x - tailLen * Math.cos(angle);
            const tailY = head.y - tailLen * Math.sin(angle);

            const tailGrad = ctx.createLinearGradient(tailX, tailY, head.x, head.y);
            tailGrad.addColorStop(0, "rgba(224, 242, 254, 0)");
            tailGrad.addColorStop(0.5, `rgba(224, 242, 254, ${baseAlpha * 0.38})`);
            tailGrad.addColorStop(1, `rgba(240, 250, 255, ${baseAlpha * 0.95})`);

            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(
              head.x - notchIndent * Math.cos(angle),
              head.y - notchIndent * Math.sin(angle)
            );
            ctx.strokeStyle = tailGrad;
            ctx.lineWidth = Math.min(1.8, Math.max(1.1, 1.0 + (vec.speed / 30) * 0.7));
            ctx.lineCap = "round";
            ctx.stroke();

            // 2. Solid Luminous Arrowhead (chevron / dart pointing in direction of motion)
            ctx.beginPath();
            ctx.moveTo(head.x, head.y);
            ctx.lineTo(
              head.x - arrowLen * Math.cos(angle - arrowWingSpan),
              head.y - arrowLen * Math.sin(angle - arrowWingSpan)
            );
            ctx.lineTo(
              head.x - notchIndent * Math.cos(angle),
              head.y - notchIndent * Math.sin(angle)
            );
            ctx.lineTo(
              head.x - arrowLen * Math.cos(angle + arrowWingSpan),
              head.y - arrowLen * Math.sin(angle + arrowWingSpan)
            );
            ctx.closePath();

            ctx.fillStyle = `rgba(240, 250, 255, ${baseAlpha * 0.95})`;
            ctx.fill();
          }
        }
      } else if (activeLayer === "temp") {
        // ── CONTINUOUS METEOROLOGICAL THERMAL FIELD (RASTER HEATMAP / ISOTHERMS) ──
        const gw = Math.max(30, Math.min(60, Math.round(w / 8)));
        const gh = Math.max(40, Math.min(90, Math.round(h / 8)));

        if (!thermalCanvasRef.current) {
          thermalCanvasRef.current = document.createElement("canvas");
        }
        const tCanvas = thermalCanvasRef.current;
        if (tCanvas.width !== gw || tCanvas.height !== gh) {
          tCanvas.width = gw;
          tCanvas.height = gh;
        }
        const tCtx = tCanvas.getContext("2d");

        if (tCtx) {
          const imgData = tCtx.createImageData(gw, gh);
          const data = imgData.data;

          // Prepare station points in canvas pixel coordinates
          const stationPoints: { x: number; y: number; temp: number }[] = [];
          for (let i = 0; i < WIND_CITIES.length; i++) {
            const c = WIND_CITIES[i];
            const isSel = c.name.toLowerCase() === selectedCityName.toLowerCase();
            const live = liveCitiesWind[c.name.toLowerCase()];
            const temp = isSel ? (live?.temp ?? c.baseTemp ?? 29) : (live?.temp ?? c.baseTemp ?? 28);
            const pt = geoToPixel(c.lat, c.lng, center, zoom, w, h);
            if (pt.x > -250 && pt.x < w + 250 && pt.y > -250 && pt.y < h + 250) {
              stationPoints.push({ x: pt.x, y: pt.y, temp });
            }
          }

          if (stationPoints.length === 0) {
            stationPoints.push({ x: w / 2, y: h / 2, temp: 28 });
          }

          const stLen = stationPoints.length;
          const cellW = w / gw;
          const cellH = h / gh;

          for (let gy = 0; gy < gh; gy++) {
            const py = (gy + 0.5) * cellH;
            for (let gx = 0; gx < gw; gx++) {
              const px = (gx + 0.5) * cellW;
              let num = 0;
              let den = 0;

              for (let i = 0; i < stLen; i++) {
                const st = stationPoints[i];
                const dx = px - st.x;
                const dy = py - st.y;
                const distSq = dx * dx + dy * dy;
                const weight = 1 / (distSq + 1200);
                num += st.temp * weight;
                den += weight;
              }

              const cellTemp = den > 0 ? num / den : 28;
              const [r, g, b] = getThermalRGB(cellTemp);
              const idx = (gy * gw + gx) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = 230;
            }
          }

          tCtx.putImageData(imgData, 0, 0);

          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(tCanvas, 0, 0, w, h);
          ctx.restore();

          const gradOverlay = ctx.createLinearGradient(0, 0, 0, h);
          gradOverlay.addColorStop(0, "rgba(245, 158, 11, 0.04)");
          gradOverlay.addColorStop(1, "rgba(239, 68, 68, 0.06)");
          ctx.fillStyle = gradOverlay;
          ctx.fillRect(0, 0, w, h);
        }
      } else if (activeLayer === "rain") {
        const gradBg = ctx.createLinearGradient(0, 0, w, h);
        gradBg.addColorStop(0, "rgba(14, 165, 233, 0.08)");
        gradBg.addColorStop(0.5, "rgba(2, 132, 199, 0.05)");
        gradBg.addColorStop(1, "rgba(14, 165, 233, 0.10)");
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, w, h);
      }

      // ── 2. DRAW CITIES & SECONDARY METEOROLOGICAL LABELS ──
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const city of WIND_CITIES) {
        const pt = geoToPixel(city.lat, city.lng, center, zoom, w, h);
        if (pt.x < -60 || pt.x > w + 60 || pt.y < -40 || pt.y > h + 40) continue;

        const isSelected = city.name.toLowerCase() === selectedCityName.toLowerCase();
        const live = liveCitiesWind[city.name.toLowerCase()];
        const displayTemp = isSelected ? (live?.temp ?? city.baseTemp) : (live?.temp ?? city.baseTemp);

        // Selected station prominent beacon pin
        if (isSelected) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = activeLayer === "temp" ? "rgba(245, 158, 11, 0.25)" : "rgba(56, 189, 248, 0.28)";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = activeLayer === "temp" ? "#f59e0b" : "#0284c7";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.restore();
        }

        if (activeLayer === "temp") {
          const shouldShowCity = isSelected || (zoom <= 5 ? city.tier === 1 : zoom === 6 ? city.tier <= 2 : true);
          if (!shouldShowCity) continue;

          const tempVal = Math.round(displayTemp);
          const tempColor = getThermalCSSColor(tempVal);
          const pillText = `${tempVal}°`;

          ctx.font = isSelected ? "bold 12px system-ui, -apple-system, sans-serif" : "bold 11px system-ui, -apple-system, sans-serif";
          const tw = ctx.measureText(pillText).width;
          const pw = tw + 12;
          const ph = 18;
          const px = pt.x - pw / 2;
          const py = pt.y - (isSelected ? 26 : 20);

          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 1.5;

          ctx.fillStyle = isSelected ? "rgba(15, 23, 42, 0.95)" : "rgba(10, 16, 26, 0.88)";
          ctx.beginPath();
          ctx.roundRect(px, py, pw, ph, 9);
          ctx.fill();

          ctx.lineWidth = isSelected ? 2 : 1.4;
          ctx.strokeStyle = isSelected ? "#ffffff" : tempColor;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pt.x - 3, py + ph);
          ctx.lineTo(pt.x + 3, py + ph);
          ctx.lineTo(pt.x, py + ph + 3);
          ctx.closePath();
          ctx.fillStyle = isSelected ? "#ffffff" : tempColor;
          ctx.fill();

          ctx.shadowColor = "transparent";
          ctx.fillStyle = isSelected ? "#ffffff" : tempColor;
          ctx.fillText(pillText, pt.x, py + ph / 2);

          ctx.shadowColor = "rgba(0,0,0,0.95)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
          ctx.font = isSelected ? "bold 11.5px sans-serif" : "600 10px sans-serif";
          ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.92)";
          ctx.fillText(city.name, pt.x, pt.y + 4);
          ctx.restore();
        } else if (activeLayer === "wind") {
          // Dynamic density by zoom level (LOD)
          const shouldShowWind = isSelected || (zoom <= 5 ? city.tier === 1 : zoom === 6 ? city.tier <= 2 : true);
          if (!shouldShowWind) continue;

          // Sample wind vector from active field / live station data for this city
          const live = liveCitiesWind[city.name.toLowerCase()];
          const cityVec = getWindVector(currentField, city.lat, city.lng);
          const speedVal = live ? live.speed : Math.round(cityVec.speed);
          const degVal = live ? live.deg : cityVec.deg;
          const motionArrow = getMotionArrow(degVal);

          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // 1. City Name on top with soft drop shadow (Apple Weather style)
          ctx.font = isSelected ? "bold 11px system-ui, -apple-system, sans-serif" : "600 9.5px system-ui, -apple-system, sans-serif";
          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
          ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.94)";
          ctx.fillText(city.name, pt.x, pt.y - 10);

          // 2. Crisp frosted dark slate pill below city name: e.g. "4 ↗" or "0"
          const pillText = speedVal === 0 ? "0" : `${speedVal} ${motionArrow}`;
          ctx.font = "bold 9.5px system-ui, -apple-system, sans-serif";
          const tw = ctx.measureText(pillText).width;
          const pw = tw + 10;
          const ph = 14;
          const px = pt.x - pw / 2;
          const py = pt.y - 1;

          ctx.shadowBlur = 3;
          ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
          ctx.beginPath();
          ctx.roundRect(px, py, pw, ph, 7);
          ctx.fillStyle = isSelected ? "rgba(2, 132, 199, 0.95)" : "rgba(15, 23, 42, 0.85)";
          ctx.fill();

          ctx.lineWidth = isSelected ? 1.5 : 1.0;
          ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.25)";
          ctx.stroke();

          ctx.shadowColor = "transparent";
          ctx.fillStyle = isSelected ? "#ffffff" : "#e0f2fe";
          ctx.fillText(pillText, pt.x, py + ph / 2);
          ctx.restore();
        } else {
          // Rain / Satellite layers: Clean frosted city station pins
          const shouldShowCity = isSelected || (zoom <= 5 ? city.tier === 1 : zoom === 6 ? city.tier <= 2 : true);
          if (!shouldShowCity) continue;

          ctx.save();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y - 4, 3, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.85)";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = isSelected ? "#0284c7" : "rgba(0, 0, 0, 0.7)";
          ctx.stroke();

          ctx.shadowColor = "rgba(0,0,0,0.95)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
          ctx.font = isSelected ? "bold 11.5px sans-serif" : "600 10px sans-serif";
          ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.92)";
          ctx.fillText(city.name, pt.x, pt.y + 8);
          ctx.restore();
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [w, h, activeLayer]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ background: activeLayer === "satellite" ? "#060a0f" : "#0c151c" }}
    >
      {/* Layer 1: Real GIS Basemap Tiles (CartoDB Dark Matter or ESRI World Imagery) */}
      <div className="pointer-events-none absolute inset-0">
        {tiles.map((t) => (
          <div
            key={t.key}
            style={{
              position: "absolute",
              left: t.dx,
              top: t.dy,
              width: 256,
              height: 256,
            }}
          >
            {/* Basemap tile: CartoDB Dark Matter or ESRI Satellite */}
            <img
              src={t.baseTileUrl}
              alt=""
              draggable={false}
              loading="lazy"
              crossOrigin="anonymous"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.retried && t.fallbackUrl) {
                  img.dataset.retried = "1";
                  img.src = t.fallbackUrl;
                } else {
                  img.style.visibility = "hidden";
                }
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: 256,
                height: 256,
                display: "block",
                filter: activeLayer === "satellite" ? "none" : "brightness(0.5) saturate(0.35)",
              }}
            />

            {/* Live RainViewer Radar Doppler Precipitation tile overlay */}
            {t.rainTileUrl && (
              <img
                src={t.rainTileUrl}
                alt=""
                draggable={false}
                loading="lazy"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 256,
                  height: 256,
                  display: "block",
                  opacity: 0.85,
                  mixBlendMode: "screen",
                }}
              />
            )}

            {/* ESRI Boundaries & Place Names Reference overlay */}
            {t.overlayUrl && (
              <img
                src={t.overlayUrl}
                alt=""
                draggable={false}
                loading="lazy"
                crossOrigin="anonymous"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 256,
                  height: 256,
                  display: "block",
                  opacity: 0.85,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Layer 2: Dynamic Meteorological Overlays */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FULL SCREEN WIND RADAR (MATCHING USER REFERENCE IMAGE)
   ══════════════════════════════════════════════════════ */

export const MARINE_WIND_OBS: ObservationPoint[] = [
  { lat: 21.5, lng: 66.0, speed: 17, dirDeg: 260 }, // North Arabian Sea
  { lat: 17.5, lng: 67.5, speed: 18, dirDeg: 265 }, // Central Arabian Sea off Konkan
  { lat: 13.0, lng: 69.5, speed: 16, dirDeg: 270 }, // Arabian Sea off Malabar
  { lat: 8.5,  lng: 72.0, speed: 19, dirDeg: 280 }, // Lakshadweep Sea
  { lat: 5.5,  lng: 78.5, speed: 20, dirDeg: 275 }, // Southern Oceanic Corridor
  { lat: 9.0,  lng: 85.0, speed: 15, dirDeg: 80 },  // South Bay of Bengal
  { lat: 14.5, lng: 86.5, speed: 16, dirDeg: 120 }, // Central Bay of Bengal
  { lat: 19.5, lng: 89.5, speed: 14, dirDeg: 160 }, // North Bay of Bengal
];

function buildObservations(
  cities: RadarCity[],
  liveMap: Record<string, LiveRadarCityWind>,
  selectedCity: string,
  targetSpeed: number,
  targetDir: string,
  speedScale: number = 1.0
): ObservationPoint[] {
  const list: ObservationPoint[] = [];

  for (const c of cities) {
    const isSel = c.name.toLowerCase() === selectedCity.toLowerCase();
    const live = liveMap[c.name.toLowerCase()];
    const spd = isSel ? targetSpeed : Math.round((live?.speed ?? c.baseSpeed) * speedScale);
    const dirDeg = isSel
      ? meteoDirToDegrees(targetDir)
      : live?.deg ?? (c.baseDir ? meteoDirToDegrees(c.baseDir) : 270);
    list.push({
      lat: c.lat,
      lng: c.lng,
      speed: Math.max(1, spd),
      dirDeg,
    });
  }

  for (const m of MARINE_WIND_OBS) {
    list.push({
      lat: m.lat,
      lng: m.lng,
      speed: Math.max(2, Math.round(m.speed * speedScale)),
      dirDeg: m.dirDeg,
    });
  }

  return list;
}

export function FullScreenWindRadar({
  location,
  accent,
  lang,
  initialLayer = "wind",
  onClose,
  onSwitchLayer,
}: {
  location: Location;
  accent: string;
  lang: Lang;
  initialLayer?: "rain" | "wind" | "temp" | "satellite";
  onClose: () => void;
  onSwitchLayer?: (layer: "rain" | "wind" | "temp" | "satellite") => void;
}) {
  const t = makeT(lang);

  // Determine initial center: target the user's selected location directly
  const selectedCityCenter = useMemo(() => {
    const byKey = APP_CITY_COORDS[location.key.toLowerCase()];
    if (byKey) return byKey;
    const byName = WIND_CITIES.find(
      (c) => c.name.toLowerCase() === location.city.toLowerCase()
    );
    if (byName) return { lat: byName.lat, lng: byName.lng };
    return { lat: 18.52, lng: 73.86 }; // fallback to Pune
  }, [location.key, location.city]);

  const [center, setCenter] = useState(selectedCityCenter);
  const [zoom, setZoom] = useState(6);

  // Sync center when location changes
  useEffect(() => {
    setCenter(selectedCityCenter);
  }, [selectedCityCenter]);

  // Real live data states
  const [activeLayer, setActiveLayer] = useState<"rain" | "wind" | "temp" | "satellite">(initialLayer);
  const [liveCitiesWind, setLiveCitiesWind] = useState<Record<string, LiveRadarCityWind>>({});
  const [timelineFrames, setTimelineFrames] = useState<WindTimelineFrame[]>([]);
  const [rainViewerData, setRainViewerData] = useState<RainViewerData | null>(null);
  const [rainFrameIndex, setRainFrameIndex] = useState(0);
  const [timeProgress, setTimeProgress] = useState(1.0); // 1.0 = "now", floating-point for continuous transitions
  const [isPlaying, setIsPlaying] = useState(false); // Paused by default
  const [showInfo, setShowInfo] = useState(false);
  const [tempProbe, setTempProbe] = useState<{ lat: number; lng: number; temp: number; x: number; y: number } | null>(null);
  const [windProbe, setWindProbe] = useState<{
    lat: number;
    lng: number;
    speed: number;
    dir: string;
    deg: number;
    x: number;
    y: number;
  } | null>(null);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });

  // Sync activeLayer when initialLayer prop changes
  useEffect(() => {
    setActiveLayer(initialLayer);
  }, [initialLayer]);

  // Fetch real live wind & temp data for cities across India
  useEffect(() => {
    let mounted = true;
    fetchRadarCitiesWind(WIND_CITIES).then((data) => {
      if (mounted) setLiveCitiesWind(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch RainViewer Doppler precipitation radar metadata
  useEffect(() => {
    let mounted = true;
    fetchRainViewerFrames().then((data) => {
      if (mounted && data) {
        setRainViewerData(data);
        if (data.frames.length > 0) {
          setRainFrameIndex(Math.max(0, data.frames.length - 1));
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch real timeline forecast for selected location
  useEffect(() => {
    let mounted = true;
    fetchWindTimeline(selectedCityCenter.lat, selectedCityCenter.lng, location.wind, location.temp).then((frames) => {
      if (mounted && frames.length > 0) {
        setTimelineFrames(frames);
      }
    });
    return () => {
      mounted = false;
    };
  }, [selectedCityCenter.lat, selectedCityCenter.lng, location.wind, location.temp]);

  // Fallback timeline labels if frames haven't loaded yet
  const displayTimeLabels = useMemo(() => {
    if (timelineFrames.length > 0) return timelineFrames;
    return [
      { id: "-24h", label: "- 24 h", timeStr: "Yesterday 10:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp - 1 },
      { id: "now", label: "now", timeStr: `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, "0")}`, speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp },
      { id: "today", label: "today", timeStr: "Today 16:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp + 1 },
      { id: "tomorrow", label: "tomorrow", timeStr: "Tomorrow 12:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp },
      { id: "day2", label: "Fri", timeStr: "Friday 12:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp },
      { id: "day3", label: "Sat", timeStr: "Saturday 12:00", speed: location.wind.speed, dir: location.wind.dir, gust: location.wind.gust, temp: location.temp },
    ];
  }, [timelineFrames, location.wind, location.temp]);

  // Precompute gridded wind fields for each forecast timeline frame
  const timelineFields = useMemo(() => {
    return displayTimeLabels.map((frame) => {
      const scale = location.wind.speed > 0 ? frame.speed / location.wind.speed : 1;
      const obs = buildObservations(
        WIND_CITIES,
        liveCitiesWind,
        location.city,
        frame.speed,
        frame.dir,
        scale
      );
      return createWindField(obs, {
        bounds: DEFAULT_INDIA_BOUNDS,
        gridWidth: 48,
        gridHeight: 48,
        timestamp: Date.now(),
      });
    });
  }, [displayTimeLabels, liveCitiesWind, location.city, location.wind.speed]);

  // Continuously interpolated active wind field based on floating timeProgress
  const activeWindField = useMemo(() => {
    if (timelineFields.length === 0) {
      const obs = buildObservations(
        WIND_CITIES,
        liveCitiesWind,
        location.city,
        location.wind.speed,
        location.wind.dir,
        1.0
      );
      return createWindField(obs, { bounds: DEFAULT_INDIA_BOUNDS, gridWidth: 48, gridHeight: 48 });
    }
    const idxA = Math.floor(timeProgress);
    const idxB = Math.min(timelineFields.length - 1, idxA + 1);
    const alpha = timeProgress - idxA;
    if (idxA === idxB || alpha <= 0.001) {
      return timelineFields[idxA];
    }
    return interpolateWindFields(timelineFields[idxA], timelineFields[idxB], alpha);
  }, [timelineFields, timeProgress, liveCitiesWind, location.city, location.wind.speed, location.wind.dir]);

  // Current active wind reading at the user's selected location sampled from the continuous field
  const activeWind: Wind = useMemo(() => {
    const vec = getWindVector(activeWindField, selectedCityCenter.lat, selectedCityCenter.lng);
    return {
      speed: Math.round(vec.speed),
      dir: vec.direction,
      gust: Math.round(vec.speed * 1.35),
    };
  }, [activeWindField, selectedCityCenter.lat, selectedCityCenter.lng]);

  const nearestTimeIndex = Math.min(
    displayTimeLabels.length - 1,
    Math.max(0, Math.round(timeProgress))
  );
  const activeFrame = displayTimeLabels[nearestTimeIndex];

  const activeTemp: number = useMemo(() => {
    if (activeFrame && activeFrame.temp !== undefined && nearestTimeIndex !== 1) {
      return activeFrame.temp;
    }
    return location.temp;
  }, [activeFrame, nearestTimeIndex, location.temp]);

  const isRain = activeLayer === "rain";
  const rainFrames = rainViewerData?.frames || [];

  const currentTimeLabel = useMemo(() => {
    if (isRain && rainFrames.length > 0) {
      return rainFrames[rainFrameIndex]?.timeStr ?? "Now";
    }
    return displayTimeLabels[nearestTimeIndex]?.timeStr ?? "Now";
  }, [isRain, rainFrames, rainFrameIndex, displayTimeLabels, nearestTimeIndex]);

  // Continuous Playback Animation: smoothly evolves the field while particles flow uninterrupted
  useEffect(() => {
    if (!isPlaying) return;
    if (isRain && rainFrames.length > 0) {
      const interval = setInterval(() => {
        setRainFrameIndex((prev) => (prev + 1) % rainFrames.length);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      let animId: number;
      let lastTime = performance.now();
      const tick = (now: number) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        setTimeProgress((prev) => {
          const maxIdx = displayTimeLabels.length - 1;
          const next = prev + dt * 0.45; // ~2.2 seconds per timeline frame
          return next >= maxIdx ? 0 : next;
        });
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animId);
    }
  }, [isPlaying, isRain, rainFrames.length, displayTimeLabels.length]);

  // Dragging / Panning support
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, lat: center.lat, lng: center.lng });

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      lat: center.lat,
      lng: center.lng,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dLat = (dy / (Math.pow(2, zoom) * 256)) * 180;
    const dLng = -(dx / (Math.pow(2, zoom) * 256)) * 360;
    setCenter({
      lat: Math.max(-80, Math.min(80, dragStartRef.current.lat + dLat)),
      lng: ((dragStartRef.current.lng + dLng + 180) % 360) - 180,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    const dist = Math.hypot(e.clientX - pointerStartPosRef.current.x, e.clientY - pointerStartPosRef.current.y);
    if (dist < 6) {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const coords = pixelToGeo(px, py, center, zoom, rect.width, rect.height);

      if (activeLayer === "wind") {
        const vec = getWindVector(activeWindField, coords.lat, coords.lng);
        setWindProbe({
          lat: coords.lat,
          lng: coords.lng,
          speed: Math.round(vec.speed),
          dir: vec.direction,
          deg: vec.deg,
          x: px,
          y: py,
        });
        setTempProbe(null);
      } else if (activeLayer === "temp") {
        // Interpolate temperature at tapped coordinate using IDW from nearby stations
        let num = 0;
        let den = 0;
        for (let i = 0; i < WIND_CITIES.length; i++) {
          const city = WIND_CITIES[i];
          const live = liveCitiesWind[city.name.toLowerCase()];
          const t = live?.temp ?? city.baseTemp;
          const dLat = coords.lat - city.lat;
          const dLng = coords.lng - city.lng;
          const d2 = dLat * dLat + dLng * dLng;
          const w = 1 / (d2 + 0.15);
          num += t * w;
          den += w;
        }
        const probeTemp = den > 0 ? num / den : 28;
        setTempProbe({
          lat: coords.lat,
          lng: coords.lng,
          temp: probeTemp,
          x: px,
          y: py,
        });
        setWindProbe(null);
      }
    }
  };

  const zoomIn = () => {
    setZoom((z) => Math.min(8, z + 1));
    setTempProbe(null);
    setWindProbe(null);
  };
  const zoomOut = () => {
    setZoom((z) => Math.max(5, z - 1));
    setTempProbe(null);
    setWindProbe(null);
  };
  const resetToLocation = () => {
    setCenter(selectedCityCenter);
    setTempProbe(null);
    setWindProbe(null);
  };

  const switchLayer = (l: "rain" | "wind" | "temp" | "satellite") => {
    setActiveLayer(l);
    setTempProbe(null);
    setWindProbe(null);
    onSwitchLayer?.(l);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#0c151c] text-white select-none animate-in fade-in duration-200"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* ── MAP CONTAINER ── */}
      <div className="relative flex-1 overflow-hidden">
        <WindMapCanvas
          center={center}
          zoom={zoom}
          wind={activeWind}
          selectedCityName={location.city}
          liveCitiesWind={liveCitiesWind}
          activeLayer={activeLayer}
          rainViewerData={rainViewerData}
          rainFrameIndex={rainFrameIndex}
          activeWindField={activeWindField}
        />

        {/* ── TOP BAR (Back + Header Brand + Share/Info) ── */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-12 pb-3 pointer-events-none">
          {/* Back button */}
          <button
            onClick={onClose}
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 active:scale-95 transition shadow-lg"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Central Logo Pill: weather & radar + Selected City Info */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/60 px-3.5 py-1.5 backdrop-blur-md border border-white/15 shadow-xl">
            <span className="text-[13px] font-bold tracking-tight text-white">weather</span>
            <span className="text-[13px] font-bold text-amber-400">&</span>
            <span className="text-[13px] font-bold tracking-tight text-sky-400">radar</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="text-[12px] font-semibold text-emerald-300">
              {activeLayer === "wind" && (
                <span className="inline-flex items-center gap-1">
                  <span>{location.city} {activeWind.speed} km/h</span>
                  <span className="text-sky-300 font-bold text-[13px]">{getMotionArrow(meteoDirToDegrees(activeWind.dir))}</span>
                  <span className="text-[10px] text-white/60 font-mono">({activeWind.dir})</span>
                </span>
              )}
              {activeLayer === "temp" && `${location.city} ${activeTemp}°C`}
              {activeLayer === "rain" && `${location.city} Rain Radar`}
              {activeLayer === "satellite" && `${location.city} Satellite`}
            </span>
          </div>

          {/* Top Right Action (Info) */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setShowInfo((s) => !s)}
              className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 active:scale-95 transition shadow-lg"
              aria-label="Details"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9.5" />
                <line x1="12" y1="8" x2="12" y2="8.01" strokeWidth="2.5" />
                <line x1="12" y1="11.5" x2="12" y2="16.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── LEFT VERTICAL MAP CONTROLS ── */}
        <div className="absolute left-4 top-28 z-30 flex flex-col gap-2 pointer-events-auto">
          {/* North Compass Orientation Arrow */}
          <button
            onClick={resetToLocation}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition shadow-lg group"
            title="Compass: North"
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-[8px] font-black text-rose-400 font-mono -mb-0.5">N</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <polygon points="12,2 16,11 8,11" fill="#f43f5e" />
                <polygon points="12,22 8,13 16,13" fill="rgba(255,255,255,0.4)" />
              </svg>
            </div>
          </button>

          {/* Target / My Location button */}
          <button
            onClick={resetToLocation}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition shadow-lg"
            title={t("My Location")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="7" />
              <line x1="12" y1="2" x2="12" y2="5.5" />
              <line x1="12" y1="18.5" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5.5" y2="12" />
              <line x1="18.5" y1="12" x2="22" y2="12" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
            </svg>
          </button>

          {/* Zoom In */}
          <button
            onClick={zoomIn}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition shadow-lg"
            aria-label="Zoom in"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Zoom Out */}
          <button
            onClick={zoomOut}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition shadow-lg"
            aria-label="Zoom out"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* ── RIGHT VERTICAL WEATHER LAYER SELECTOR ── */}
        <div className="absolute right-4 top-28 z-30 flex flex-col gap-2 pointer-events-auto">
          {/* Temperature layer (Thermometer) */}
          <button
            onClick={() => switchLayer("temp")}
            className={`grid h-10 w-10 place-items-center rounded-xl backdrop-blur-md border active:scale-95 transition shadow-lg ${
              activeLayer === "temp"
                ? "bg-amber-500/85 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.65)]"
                : "bg-black/55 border-white/15 text-white/80 hover:bg-black/70"
            }`}
            title="Temperature Layer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 14.76V3.5a2 2 0 0 0-4 0v11.26a4.5 4.5 0 1 0 4 0z" />
              <line x1="12" y1="9" x2="12" y2="14" strokeWidth="2" stroke="currentColor" />
              <circle cx="12" cy="16.5" r="2" fill="currentColor" stroke="none" />
            </svg>
          </button>

          {/* Rain / Precip layer (Doppler radar) */}
          <button
            onClick={() => switchLayer("rain")}
            className={`grid h-10 w-10 place-items-center rounded-xl backdrop-blur-md border active:scale-95 transition shadow-lg ${
              activeLayer === "rain"
                ? "bg-sky-500/85 border-sky-300 text-white shadow-[0_0_15px_rgba(14,165,233,0.7)]"
                : "bg-black/55 border-white/15 text-white/80 hover:bg-black/70"
            }`}
            title="Rain / Precipitation Radar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="currentColor" fillOpacity="0.2" />
              <line x1="8" y1="15" x2="7" y2="19" strokeWidth="2" />
              <line x1="12" y1="15" x2="11" y2="19" strokeWidth="2" />
              <line x1="16" y1="15" x2="15" y2="19" strokeWidth="2" />
            </svg>
          </button>

          {/* Wind layer - Streamlines icon */}
          <button
            onClick={() => switchLayer("wind")}
            className={`relative grid h-10 w-10 place-items-center rounded-xl backdrop-blur-md border active:scale-95 transition shadow-lg ${
              activeLayer === "wind"
                ? "bg-sky-950/80 border-sky-400/80 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                : "bg-black/55 border-white/15 text-white/80 hover:bg-black/70"
            }`}
            title="Wind Streamlines Radar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.59 4.59A2 2 0 1 1 11 8H2" />
              <path d="M12.59 19.41A2 2 0 1 0 14 16H2" />
              <path d="M15.73 7.73A2.5 2.5 0 1 1 17.5 12H2" />
            </svg>
            {activeLayer === "wind" && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
              </span>
            )}
          </button>

          {/* Thunderstorm / Lightning */}
          <button
            onClick={() => switchLayer("rain")}
            className="grid h-10 w-10 place-items-center rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 active:scale-95 transition shadow-lg"
            title="Thunderstorm Radar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 17H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="currentColor" fillOpacity="0.15" />
              <polygon points="13 11 9 17 12 17 11 22 15 15 12 15 13 11" fill="currentColor" stroke="none" />
            </svg>
          </button>

          {/* Satellite Imagery (Orbital Satellite) */}
          <button
            onClick={() => switchLayer("satellite")}
            className={`grid h-10 w-10 place-items-center rounded-xl backdrop-blur-md border active:scale-95 transition shadow-lg ${
              activeLayer === "satellite"
                ? "bg-emerald-600/90 border-emerald-300 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)]"
                : "bg-black/55 border-white/15 text-white/80 hover:bg-black/70"
            }`}
            title="ESRI World Satellite Imagery"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 7l5-5 4 4-5 5" />
              <path d="M11 9L7 5 3 9l4 4" />
              <path d="M15 13l4 4-4 4-4-4" />
              <path d="m9 15-5 5" />
              <path d="m14 10 2 2-6 6-2-2 6-6Z" fill="currentColor" fillOpacity="0.25" />
            </svg>
          </button>
        </div>

        {/* ── INFO POPUP (Wind metrics / Beaufort / Radar Scale) ── */}
        {showInfo && (
          <div className="absolute left-4 top-28 z-40 w-64 rounded-2xl bg-[rgba(15,23,42,0.95)] p-4 border border-white/15 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <span className="font-semibold text-xs tracking-wider uppercase text-sky-400">
                {activeLayer === "wind" && `💨 ${location.city} ${t("Wind")}`}
                {activeLayer === "temp" && `🌡️ ${location.city} ${t("Temperature")}`}
                {activeLayer === "rain" && `🌧️ ${location.city} ${t("Rain Radar")}`}
                {activeLayer === "satellite" && `🛰️ ${location.city} Satellite`}
              </span>
              <button
                onClick={() => setShowInfo(false)}
                className="text-white/60 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {activeLayer === "wind" && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">{t("Speed")}</span>
                  <span className="font-bold text-white">{activeWind.speed} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">{t("Gusts")}</span>
                  <span className="font-bold text-amber-300">{activeWind.gust} km/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">{t("Direction")}</span>
                  <span className="font-bold text-white">{activeWind.dir}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">{t("Beaufort Scale")}</span>
                  <span className="font-bold text-emerald-400">
                    Level {Math.min(12, Math.max(1, Math.round(activeWind.speed / 5)))} · {t("Gentle Breeze")}
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <span className="text-[10px] text-white/50 block mb-1.5 uppercase tracking-wider">{t("Wind Speed Scale")}</span>
                  <div className="h-2 w-full rounded-full overflow-hidden flex">
                    <span className="h-full flex-1 bg-emerald-500" title="10-18 km/h" />
                    <span className="h-full flex-1 bg-lime-400" title="18-25 km/h" />
                    <span className="h-full flex-1 bg-amber-400" title="25-35 km/h" />
                    <span className="h-full flex-1 bg-orange-500" title="35-45 km/h" />
                    <span className="h-full flex-1 bg-red-600" title="45+ km/h" />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/60 mt-1">
                    <span>10</span>
                    <span>20</span>
                    <span>30</span>
                    <span>40+ km/h</span>
                  </div>
                </div>
              </div>
            )}

            {activeLayer === "temp" && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Current Temp</span>
                  <span className="font-bold text-amber-300">{activeTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Feels Like</span>
                  <span className="font-bold text-white">{activeTemp + 2}°C</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <span className="text-[10px] text-white/50 block mb-1.5 uppercase tracking-wider">Thermal Band</span>
                  <div
                    className="h-2 w-full rounded-full shadow-inner border border-white/10"
                    style={{
                      background:
                        "linear-gradient(to right, rgb(59,130,246) 0%, rgb(6,182,212) 18%, rgb(20,184,166) 32%, rgb(34,197,94) 48%, rgb(234,179,8) 64%, rgb(249,115,22) 80%, rgb(239,68,68) 100%)",
                    }}
                  />
                  <div className="flex justify-between text-[9px] font-mono text-white/70 mt-1 font-semibold">
                    <span>&lt; 10°</span>
                    <span>18°</span>
                    <span>24°</span>
                    <span>30°</span>
                    <span>35°</span>
                    <span>40°+</span>
                  </div>
                </div>
              </div>
            )}

            {activeLayer === "rain" && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Precipitation Radar</span>
                  <span className="font-bold text-sky-400">Live RainViewer</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Precip Chance</span>
                  <span className="font-bold text-white">{location.precip.chance}%</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <span className="text-[10px] text-white/50 block mb-1.5 uppercase tracking-wider">Doppler Intensity</span>
                  <div className="h-2 w-full rounded-full overflow-hidden flex">
                    <span className="h-full flex-1 bg-sky-400" title="Light" />
                    <span className="h-full flex-1 bg-blue-500" title="Moderate" />
                    <span className="h-full flex-1 bg-yellow-400" title="Heavy" />
                    <span className="h-full flex-1 bg-red-500" title="Extreme" />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/60 mt-1">
                    <span>Light</span>
                    <span>Moderate</span>
                    <span>Heavy</span>
                    <span>Extreme</span>
                  </div>
                </div>
              </div>
            )}

            {activeLayer === "satellite" && (
              <div className="space-y-2 text-xs">
                <p className="text-white/80 leading-relaxed">
                  Real GIS high-resolution satellite imagery provided by ESRI World Imagery with boundary & place labels.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── REAL TEMPERATURE SCALE LEGEND (Apple Weather / Windy Style) ── */}
        {activeLayer === "temp" && (
          <div className="absolute left-4 right-4 bottom-4 z-30 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="mx-auto max-w-[340px] rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 px-4 py-2.5 shadow-2xl">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/90 mb-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-amber-300 uppercase tracking-wider text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  Live Thermal Field
                </span>
                <span className="font-bold text-white/70">°C</span>
              </div>
              <div
                className="h-2.5 w-full rounded-full shadow-inner border border-white/10"
                style={{
                  background:
                    "linear-gradient(to right, rgb(59,130,246) 0%, rgb(6,182,212) 18%, rgb(20,184,166) 32%, rgb(34,197,94) 48%, rgb(234,179,8) 64%, rgb(249,115,22) 80%, rgb(239,68,68) 100%)",
                }}
              />
              <div className="flex justify-between font-mono text-[10px] text-white/75 mt-1 font-semibold">
                <span>&lt; 10°</span>
                <span>18°</span>
                <span>24°</span>
                <span>30°</span>
                <span>35°</span>
                <span>40°+</span>
              </div>
            </div>
          </div>
        )}

        {/* ── INTERACTIVE WIND PROBE BADGE (Apple Weather / Reference Image Style) ── */}
        {windProbe && activeLayer === "wind" && (
          <div
            className="absolute z-40 -translate-x-1/2 -translate-y-full pointer-events-auto animate-in zoom-in-95 fade-in duration-150"
            style={{ left: windProbe.x, top: Math.max(70, windProbe.y - 12) }}
          >
            <div className="relative flex items-center gap-2.5 rounded-xl bg-[#171b26]/95 border border-white/20 px-3.5 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              <span className="font-bold text-white text-[13px] tracking-tight whitespace-nowrap">
                {windProbe.speed} km/h
              </span>
              {/* Circular arrow container matching reference screenshot */}
              <div className="grid h-5 w-5 place-items-center rounded-full bg-white/15 border border-white/25">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: `rotate(${windProbe.deg + 180}deg)`,
                  }}
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </div>
              <span className="font-bold text-white text-[13px] tracking-wide font-mono">
                {windProbe.dir}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setWindProbe(null);
                }}
                className="ml-1 grid h-4 w-4 place-items-center rounded-full bg-white/10 text-white/60 hover:text-white text-[10px] font-bold"
                aria-label="Close probe"
              >
                ✕
              </button>
              {/* Downward triangle notch pointing to tap coordinate */}
              <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px] border-t-[#171b26]/95" />
            </div>
          </div>
        )}

        {/* ── INTERACTIVE TEMPERATURE PROBE BADGE ── */}
        {tempProbe && activeLayer === "temp" && (
          <div
            className="absolute z-40 -translate-x-1/2 -translate-y-full pointer-events-auto animate-in zoom-in-95 fade-in duration-150"
            style={{ left: tempProbe.x, top: Math.max(70, tempProbe.y - 14) }}
          >
            <div className="flex items-center gap-2 rounded-2xl bg-black/90 border border-amber-400/60 px-3.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-bold text-amber-300 text-sm">{tempProbe.temp.toFixed(1)}°C</span>
              <span className="text-[10px] font-mono text-white/60">
                {tempProbe.lat.toFixed(2)}°N, {tempProbe.lng.toFixed(2)}°E
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTempProbe(null);
                }}
                className="ml-1 grid h-4 w-4 place-items-center rounded-full bg-white/10 text-white/60 hover:text-white text-[10px] font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {/* ── METEOROLOGICAL WIND SPEED & DIRECTION SCALE LEGEND ── */}
        {activeLayer === "wind" && (
          <div className="absolute left-4 bottom-3 z-30 pointer-events-none animate-in fade-in duration-200 flex flex-col gap-1.5">
            {/* Real-time Wind Direction Compass Indicator */}
            <div className="flex items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 backdrop-blur-md border border-white/15 shadow-xl w-fit">
              {/* Compass Rose with current wind direction arrow */}
              <div className="relative h-6 w-6 rounded-full border border-sky-400/40 bg-sky-950/60 flex items-center justify-center">
                <span className="absolute -top-1 text-[6.5px] font-black text-rose-400 font-mono">N</span>
                {/* Arrow pointing in the physical direction of particle motion */}
                <div
                  className="transition-transform duration-500 flex items-center justify-center"
                  style={{
                    transform: `rotate(${meteoDirToDegrees(activeWind.dir) + 180}deg)`,
                  }}
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-sky-300" fill="currentColor">
                    <path d="M12 2L17 11H13.5V22H10.5V11H7L12 2Z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="font-bold text-white tracking-wide">
                  {activeWind.dir}
                </span>
                <span className="text-sky-300 font-bold text-sm leading-none">
                  {getMotionArrow(meteoDirToDegrees(activeWind.dir))}
                </span>
                <span className="text-white/50 text-[8px] uppercase tracking-wider">
                  Flow
                </span>
              </div>
            </div>

            {/* Speed scale bar */}
            <div className="flex items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 backdrop-blur-md border border-white/12 shadow-lg">
              <span className="text-[9.5px] font-mono font-bold tracking-wider text-white/50 uppercase">WIND</span>
              <div className="h-1.5 w-24 rounded-full overflow-hidden flex bg-white/10">
                <span className="h-full flex-1 bg-sky-400/40" />
                <span className="h-full flex-1 bg-teal-400/60" />
                <span className="h-full flex-1 bg-emerald-400/70" />
                <span className="h-full flex-1 bg-amber-400/80" />
                <span className="h-full flex-1 bg-rose-500/90" />
              </div>
              <div className="flex items-center gap-1 text-[8.5px] font-mono text-white/70">
                <span>0</span>
                <span>10</span>
                <span>20</span>
                <span>30+ km/h</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM TIMELINE & CONTROLS ── */}
      <div
        className="relative z-30 px-4 pt-3 pb-7 pointer-events-auto"
        style={{
          background: "linear-gradient(to top, rgba(10, 20, 28, 0.98) 75%, rgba(10, 20, 28, 0.85) 90%, transparent)",
        }}
      >
        {/* Scrubber Time Bar + Play/Pause Button */}
        <div className="flex items-center gap-3">
          {/* Time display box */}
          <div className="flex items-center justify-center rounded-xl bg-black/60 border border-white/15 px-3 py-1.5 min-w-[70px] shadow-md">
            <span className="font-mono text-[13px] font-bold tracking-tight text-white">
              {currentTimeLabel.includes(" ") ? currentTimeLabel.split(" ")[1] : currentTimeLabel}
            </span>
          </div>

          {/* Slider track with colored progress */}
          <div className="relative flex-1 py-2">
            <input
              type="range"
              min="0"
              max={isRain && rainFrames.length > 0 ? rainFrames.length - 1 : displayTimeLabels.length - 1}
              step={isRain ? "1" : "0.02"}
              value={isRain && rainFrames.length > 0 ? rainFrameIndex : timeProgress}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (isRain && rainFrames.length > 0) {
                  setRainFrameIndex(val);
                } else {
                  setTimeProgress(val);
                }
                setIsPlaying(false);
              }}
              className="w-full accent-amber-400 h-1.5 rounded-full cursor-pointer bg-white/20"
              style={{
                accentColor: isRain ? "#38bdf8" : activeLayer === "temp" ? "#f59e0b" : "#38bdf8",
              }}
            />
          </div>

          {/* Circular Play / Pause toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-lg active:scale-95 transition"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 translate-x-0.5 text-white" fill="currentColor">
                <path d="M7 4.77v14.46a1 1 0 0 0 1.5.86l12.05-7.23a1 1 0 0 0 0-1.72L8.5 3.91A1 1 0 0 0 7 4.77Z" />
              </svg>
            )}
          </button>
        </div>

        {/* Quick Time Jump Tabs */}
        <div className="mt-2.5 flex items-center justify-between gap-1">
          {displayTimeLabels.map((item, idx) => {
            const active = (!isRain || rainFrames.length === 0) && Math.round(timeProgress) === idx;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTimeProgress(idx);
                  setIsPlaying(false);
                }}
                className={`flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold transition active:scale-95 ${
                  active
                    ? "bg-emerald-600/90 text-white shadow-md border border-emerald-400"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* Recenter icon */}
          <button
            onClick={resetToLocation}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/15 transition active:scale-95"
            title="Recenter Map"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FullScreenWindRadar;
