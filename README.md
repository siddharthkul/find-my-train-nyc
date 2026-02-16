# FindMyTrainNYC

A real-time NYC subway tracker built with React Native and Expo, inspired by Apple's "Find My" aesthetic. See live train positions on the map, get station arrival times, and walk to your nearest station entrance — all in one lightweight, native iOS experience.

<!-- Add your own screenshots here -->
<!-- ![App Screenshot](assets/screenshot.png) -->

## Features

**Live Train Map**
- Real-time subway train positions from MTA GTFS-Realtime feeds
- Pill-shaped train markers with subway icon + route badge showing direction of travel
- Subway line overlays drawn on the map
- Automatic mock train fallback when offline

**Station Arrivals**
- Tap any station to see upcoming arrivals in a unified bottom sheet
- Uptown / Downtown arrival times with route badges
- Apple Maps-style active station marker (colored circle with route letter + pointer)
- Nearest station auto-detected based on map center

**Walking Directions**
- In-app walking route to the nearest subway entrance
- Powered by Valhalla pedestrian routing (free, no API key needed)
- Walk time and distance displayed in a blue banner
- Route fitted to the visible map area above the bottom sheet

**Subway Entrances**
- Entrance locations from MTA Open Data (SODA API)
- Icon markers distinguish stairs vs. elevator-accessible entrances
- Nearest entry-allowed entrance auto-selected for directions

**Apple Maps-Inspired UI**
- Native iOS map with compass and 2D/3D toggle
- Apple Maps-style layer picker (Standard, Satellite, Hybrid)
- Glass-effect cards using `expo-glass-effect`
- Smooth 60fps animations throughout
- Haptic feedback on interactions
- Clean map with POIs hidden

**Service Alerts**
- MTA service alert data ingestion (alert store + hooks in place)
- UI integration coming soon

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator or physical device (iOS-first app)

### Installation

```bash
git clone https://github.com/siddharthkul/find-my-train-nyc.git
cd find-my-train-nyc
npm install
```

### Running

```bash
# Start with Expo
npm run ios

# Or start the dev server and scan QR code
npm start
```

### MTA Data

MTA subway feeds are **publicly available** — no API key required. The app fetches live data directly from MTA's open GTFS-Realtime endpoints out of the box.

If all live feeds fail (e.g., no network), the app automatically falls back to realistic mock train data so you can still explore the full UI.

## Architecture

```
src/
├── screens/
│   └── MapScreen.tsx              # Main map screen — orchestrates all UI
├── components/
│   ├── TrainMarker.tsx            # Live train marker (pill: subway icon + route badge)
│   ├── StationMarkers.tsx         # Station dots + Apple Maps-style active marker
│   ├── EntranceMarkers.tsx        # Subway entrance icon markers
│   ├── SubwayLines.tsx            # Polyline overlays for subway routes
│   ├── NearbyTrainsBar.tsx        # Unified bottom sheet (arrivals, directions)
│   ├── CompassButton.tsx          # Map heading compass
│   ├── MapLayerPicker.tsx         # Standard / Satellite / Hybrid picker
│   ├── GlassCard.tsx              # iOS glass-effect wrapper
│   ├── ErrorBoundary.tsx          # App-wide error boundary
│   └── StationArrivalSheet.tsx    # Legacy arrival sheet (unused)
├── data/
│   ├── mta/
│   │   ├── feeds/                 # GTFS-RT feed fetching & registry
│   │   ├── mappers/               # Entity → domain model mappers
│   │   ├── hooks/                 # React hooks (useLiveTrains, useStationArrivals, etc.)
│   │   ├── stores/                # Zustand stores (trains, arrivals, alerts)
│   │   ├── services/              # High-level MTA data services
│   │   ├── routeColors.ts         # Official MTA route colors + text contrast
│   │   ├── subwayStations.ts      # Static station data (name, lat/lng, routes)
│   │   ├── subwayLines.ts         # Static polyline data for subway routes
│   │   ├── subwayEntrances.ts     # MTA entrance data (SODA API)
│   │   └── mockTrainFeed.ts       # Mock data fallback when offline
│   └── directions/
│       └── walkingRoute.ts        # Valhalla pedestrian routing + polyline decoder
├── theme/
│   └── tokens.ts                  # Design tokens (spacing, radius, fonts, colors)
└── types/
    └── train.ts                   # Core train type definitions
```

## Data Sources

| Data | Source | Key Required |
|------|--------|:---:|
| Live train positions | [MTA GTFS-Realtime](https://api.mta.info/) | No |
| Station arrivals | MTA GTFS-Realtime TripUpdate feeds | No |
| Service alerts | MTA GTFS-Realtime Alert feeds | No |
| Subway entrances | [MTA Open Data (SODA API)](https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja) | No |
| Walking directions | [Valhalla (OpenStreetMap)](https://valhalla1.openstreetmap.de/) | No |
| Station & line geometry | Static data bundled in app | No |

## Tech Stack

- **React Native** 0.81 + **Expo** SDK 54
- **react-native-maps** — Apple Maps on iOS
- **Zustand** — lightweight state management
- **expo-location** — user location + permissions
- **expo-haptics** — native haptic feedback
- **expo-glass-effect** — iOS liquid glass UI
- **gtfs-realtime-bindings** — GTFS-RT protobuf decoding

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)
