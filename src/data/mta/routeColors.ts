const ROUTE_COLOR_MAP: Record<string, string> = {
  '1': '#EE352E',
  '2': '#EE352E',
  '3': '#EE352E',
  '4': '#00933C',
  '5': '#00933C',
  '6': '#00933C',
  '7': '#B933AD',
  A: '#2850AD',
  C: '#2850AD',
  E: '#2850AD',
  B: '#FF6319',
  D: '#FF6319',
  F: '#FF6319',
  M: '#FF6319',
  G: '#6CBE45',
  J: '#996633',
  Z: '#996633',
  L: '#A7A9AC',
  N: '#FCCC0A',
  Q: '#FCCC0A',
  R: '#FCCC0A',
  W: '#FCCC0A',
  S: '#808183',
  SI: '#0039A6',
};

const ROUTE_LINE_NAME: Record<string, string> = {
  '1': 'Broadway–7th Ave Local',
  '2': '7th Ave Express',
  '3': '7th Ave Express',
  '4': 'Lexington Ave Express',
  '5': 'Lexington Ave Express',
  '6': 'Lexington Ave Local',
  '7': 'Flushing Local/Express',
  A: '8th Ave Express',
  C: '8th Ave Local',
  E: '8th Ave Local',
  B: '6th Ave Express',
  D: '6th Ave Express',
  F: '6th Ave Local',
  M: '6th Ave Local',
  G: 'Brooklyn–Queens Crosstown',
  J: 'Nassau St Express',
  Z: 'Nassau St Express',
  L: '14th St–Canarsie Local',
  N: 'Broadway Express',
  Q: 'Broadway Express',
  R: 'Broadway Local',
  W: 'Broadway Local',
  S: 'Shuttle',
  SI: 'Staten Island Railway',
};

export function getRouteColor(routeId: string): string {
  return ROUTE_COLOR_MAP[routeId?.toUpperCase()] ?? '#2C2C2E';
}

/**
 * Returns black or white text depending on the route badge brightness.
 * Uses relative luminance to pick the most readable contrast.
 */
export function getRouteTextColor(routeId: string): string {
  const hex = getRouteColor(routeId);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived brightness (ITU-R BT.601)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

export function getRouteLineName(routeId: string): string {
  return ROUTE_LINE_NAME[routeId?.toUpperCase()] ?? routeId;
}
