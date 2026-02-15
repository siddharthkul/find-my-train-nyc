#!/usr/bin/env node
/**
 * Fetches MTA Subway Service Lines + Stations from data.ny.gov
 * and writes static TypeScript data files for the app.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DATA = resolve(__dirname, '..', 'src', 'data', 'mta');

const LINES_URL =
  'https://data.ny.gov/api/views/s692-irgq/rows.json?accessType=DOWNLOAD';
const STATIONS_URL =
  'https://data.ny.gov/api/views/39hk-dx4f/rows.json?accessType=DOWNLOAD';

// ── helpers ──────────────────────────────────────────────────────────

/** Round to 5 decimal places (~1 m accuracy) to keep file size sane. */
function r5(n) {
  return Math.round(n * 1e5) / 1e5;
}

/**
 * Normalise a service code from the GeoJSON into the route IDs we
 * already use in routeColors.ts (single uppercase letter or number).
 */
function normaliseService(raw) {
  const s = raw.trim();
  // Shuttles
  if (s === 'ST') return 'S';   // 42nd St Shuttle
  if (s === 'SF') return 'S';   // Franklin Ave Shuttle
  if (s === 'SR') return 'S';   // Rockaway Park Shuttle
  if (s === 'SIR') return 'SI'; // Staten Island Railway
  // "5 Peak" → "5"
  if (s.includes(' ')) return s.split(' ')[0];
  return s;
}

// ── polyline simplification (Ramer-Douglas-Peucker) ─────────────────

function perpendicularDist(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function simplify(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDist(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; index = i; }
  }
  if (maxDist > epsilon) {
    const left = simplify(points.slice(0, index + 1), epsilon);
    const right = simplify(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

// ~0.00005 degrees ≈ 5 m — good visual fidelity at subway-map zoom
const SIMPLIFY_EPSILON = 0.00005;

// ── parse MULTILINESTRING WKT ───────────────────────────────────────

/**
 * Parse a WKT MULTILINESTRING into an array of line segments.
 * Each segment is [[lng, lat], [lng, lat], …].
 * Example input: "MULTILINESTRING ((-73.99 40.75, -73.98 40.76), (-73.97 40.77, -73.96 40.78))"
 */
function parseMultiLineString(wkt) {
  // Strip outer wrapper
  const inner = wkt
    .replace(/^MULTILINESTRING\s*\(\s*/, '')
    .replace(/\s*\)\s*$/, '');

  const segments = [];
  let depth = 0;
  let buf = '';

  for (const ch of inner) {
    if (ch === '(') {
      depth++;
      if (depth === 1) { buf = ''; continue; }
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        // buf is now "lng lat, lng lat, ..."
        const coords = buf.split(',').map((pair) => {
          const [lng, lat] = pair.trim().split(/\s+/).map(Number);
          return [lng, lat];
        });
        segments.push(coords);
        buf = '';
        continue;
      }
    }
    if (depth >= 1) buf += ch;
  }

  return segments;
}

// ── merge adjacent segments that share endpoints ────────────────────

/** Two points are "close enough" to be treated as the same endpoint. */
const MERGE_TOLERANCE = 0.001; // ~100 m

function ptClose(a, b) {
  return (
    Math.abs(a[0] - b[0]) < MERGE_TOLERANCE &&
    Math.abs(a[1] - b[1]) < MERGE_TOLERANCE
  );
}

/**
 * Given an array of disconnected segments, chain together any segments
 * whose endpoints are within MERGE_TOLERANCE of each other.
 * Returns a smaller array of longer segments.
 */
function mergeSegments(segments) {
  if (segments.length <= 1) return segments;

  // Work with a mutable list of chains
  const chains = segments.map((s) => [...s]);
  let merged = true;

  while (merged) {
    merged = false;
    for (let i = 0; i < chains.length; i++) {
      if (!chains[i]) continue;
      const chainA = chains[i];
      const aStart = chainA[0];
      const aEnd = chainA[chainA.length - 1];

      for (let j = i + 1; j < chains.length; j++) {
        if (!chains[j]) continue;
        const chainB = chains[j];
        const bStart = chainB[0];
        const bEnd = chainB[chainB.length - 1];

        if (ptClose(aEnd, bStart)) {
          // A → B (drop duplicate join point)
          chains[i] = [...chainA, ...chainB.slice(1)];
          chains[j] = null;
          merged = true;
          break;
        } else if (ptClose(aEnd, bEnd)) {
          // A → reverse(B)
          chains[i] = [...chainA, ...chainB.slice(0, -1).reverse()];
          chains[j] = null;
          merged = true;
          break;
        } else if (ptClose(aStart, bEnd)) {
          // B → A
          chains[i] = [...chainB, ...chainA.slice(1)];
          chains[j] = null;
          merged = true;
          break;
        } else if (ptClose(aStart, bStart)) {
          // reverse(B) → A
          chains[i] = [...chainB.reverse(), ...chainA.slice(1)];
          chains[j] = null;
          merged = true;
          break;
        }
      }
    }
  }

  return chains.filter(Boolean);
}

// ── fetch subway service lines (rows.json) ──────────────────────────

async function fetchLines() {
  console.log('⬇  Downloading subway service lines …');
  const res = await fetch(LINES_URL);
  if (!res.ok) throw new Error(`Lines fetch failed: ${res.status}`);
  const json = await res.json();

  // Row indices (8 metadata cols then data cols in position order):
  // 8=objectid, 9=service_name, 10=service, 11=shape_stlength, 12=geometry (WKT)

  /** @type {Map<string, number[][][]>} routeId → array of polylines (in lng,lat) */
  const rawSegments = new Map();

  for (const row of json.data) {
    const routeId = normaliseService(String(row[10]));
    const wkt = String(row[12]);
    const lineStrings = parseMultiLineString(wkt);

    if (!rawSegments.has(routeId)) rawSegments.set(routeId, []);
    for (const ls of lineStrings) {
      rawSegments.get(routeId).push(ls);
    }
  }

  // Merge adjacent fragments, then simplify
  /** @type {Map<string, number[][][]>} routeId → merged & simplified segments in [lat, lng] */
  const routePolylines = new Map();

  for (const [routeId, segments] of rawSegments) {
    const merged = mergeSegments(segments);
    const processed = merged.map((seg) => {
      const simplified = simplify(seg, SIMPLIFY_EPSILON);
      return simplified.map(([lng, lat]) => [r5(lat), r5(lng)]);
    });
    console.log(
      `   ${routeId}: ${segments.length} raw → ${processed.length} merged`,
    );
    routePolylines.set(routeId, processed);
  }

  console.log(`   ✓ ${routePolylines.size} route(s) parsed`);
  return routePolylines;
}

// ── fetch subway stations ───────────────────────────────────────────

async function fetchStations() {
  console.log('⬇  Downloading subway stations …');
  const res = await fetch(STATIONS_URL);
  if (!res.ok) throw new Error(`Stations fetch failed: ${res.status}`);
  const json = await res.json();

  // Row indices (8 metadata cols then data cols in position order):
  // 8=gtfs_stop_id, 9=station_id, 10=complex_id, 11=division,
  // 12=line, 13=stop_name, 14=borough, 15=cbd, 16=daytime_routes,
  // 17=structure, 18=gtfs_latitude, 19=gtfs_longitude
  const stations = json.data.map((row) => ({
    id: String(row[8]),           // GTFS Stop ID
    name: String(row[13]),        // Stop Name
    latitude: r5(parseFloat(row[18])),
    longitude: r5(parseFloat(row[19])),
    routes: String(row[16]).split(/\s+/),  // daytime routes
    borough: String(row[14]),
    ada: String(row[22]),         // 0/1/2
  }));

  console.log(`   ✓ ${stations.length} station(s) parsed`);
  return stations;
}

// ── write files ─────────────────────────────────────────────────────

function writeLines(routePolylines) {
  const entries = [];
  for (const [routeId, segments] of routePolylines) {
    const segStr = segments
      .map(
        (seg) =>
          `[${seg.map(([lat, lng]) => `[${lat},${lng}]`).join(',')}]`,
      )
      .join(',\n    ');
    entries.push(`  '${routeId}': [\n    ${segStr}\n  ]`);
  }

  const src = `// Auto-generated – do not edit manually.
// Source: MTA Subway Service Lines (data.ny.gov/s692-irgq)

export type LatLng = [latitude: number, longitude: number];

/** routeId → array of polyline segments (each segment is an array of [lat, lng]). */
export const subwayLineSegments: Record<string, LatLng[][]> = {
${entries.join(',\n')}
};
`;

  const path = resolve(SRC_DATA, 'subwayLines.ts');
  writeFileSync(path, src, 'utf-8');
  console.log(`✏️  Wrote ${path}  (${(src.length / 1024).toFixed(0)} KB)`);
}

function writeStations(stations) {
  const rows = stations.map(
    (s) =>
      `  {id:'${s.id}',name:${JSON.stringify(s.name)},lat:${s.latitude},lng:${s.longitude},routes:${JSON.stringify(s.routes)},borough:'${s.borough}',ada:${s.ada === '1' ? 'true' : 'false'}}`,
  );

  const src = `// Auto-generated – do not edit manually.
// Source: MTA Subway Stations (data.ny.gov/39hk-dx4f)

export type SubwayStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
  borough: string;
  ada: boolean;
};

export const subwayStations: SubwayStation[] = [
${rows.join(',\n')}
];
`;

  const path = resolve(SRC_DATA, 'subwayStations.ts');
  writeFileSync(path, src, 'utf-8');
  console.log(`✏️  Wrote ${path}  (${(src.length / 1024).toFixed(0)} KB)`);
}

// ── main ────────────────────────────────────────────────────────────

const [lines, stations] = await Promise.all([fetchLines(), fetchStations()]);
writeLines(lines);
writeStations(stations);
console.log('\n✅  Static data generation complete.');
