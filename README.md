# FindMyTrainNYC

An iOS-first Expo app that shows live NYC subway train positions in a lightweight, Apple-like map experience.

## MVP Features

- Live train markers on the NYC map
- Circular line badges with route text (e.g., `A`, `7`, `Q`)
- Official route colors per subway line
- Direction arrow per train (using real-time bearing)
- Auto-refresh every 15 seconds
- Automatic mock train mode when `EXPO_PUBLIC_MTA_API_KEY` is not set
- Tap marker for a Find My-style detail card with haptics

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Optional: set your MTA API key for live data:

   ```bash
   export EXPO_PUBLIC_MTA_API_KEY="YOUR_MTA_KEY"
   ```

3. Start the app:

   ```bash
   npm run ios
   ```

## Data Source

- MTA GTFS-Realtime Subway feeds from `api-endpoint.mta.info`
- Feed decoding via `gtfs-realtime-bindings`
- If no API key is present, app uses mock train positions automatically

## Project Structure

- `src/screens/MapScreen.tsx` - Main map UI and status overlays
- `src/components/TrainMarker.tsx` - Circular route marker + direction arrow
- `src/data/mta/feedClient.ts` - Fetches and decodes GTFS-Realtime feeds
- `src/data/mta/trainMapper.ts` - Maps feed entities into typed train models
- `src/theme/tokens.ts` - Shared design tokens

## Next Steps

- Route filters and favorites
- Station ETA sheet and stop-level arrivals
- Push notifications for favorite lines or commutes
