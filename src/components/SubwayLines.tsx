import { memo, useMemo } from 'react';
import { Polyline, type Region } from 'react-native-maps';
import { getRouteColor } from '../data/mta/routeColors';
import { subwayLineSegments, type LatLng } from '../data/mta/subwayLines';

// ── pre-compute bounding boxes for fast viewport culling ────────────

type SegmentEntry = {
  routeId: string;
  idx: number;
  color: string;
  coordinates: { latitude: number; longitude: number }[];
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const ALL_SEGMENTS: SegmentEntry[] = [];

for (const [routeId, segments] of Object.entries(subwayLineSegments)) {
  const color = getRouteColor(routeId);
  segments.forEach((segment: LatLng[], idx: number) => {
    let minLat = 90,
      maxLat = -90,
      minLng = 180,
      maxLng = -180;
    const coordinates = segment.map(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      return { latitude: lat, longitude: lng };
    });
    ALL_SEGMENTS.push({
      routeId,
      idx,
      color,
      coordinates,
      minLat,
      maxLat,
      minLng,
      maxLng,
    });
  });
}

// ── component ───────────────────────────────────────────────────────

type Props = {
  region: Region;
};

/**
 * Renders subway service-line polylines visible in the current viewport.
 * Segments outside the viewport are culled to keep the native overlay
 * count low (important for iOS MapKit performance).
 */
export const SubwayLines = memo(function SubwayLines({ region }: Props) {
  const visiblePolylines = useMemo(() => {
    const latPad = region.latitudeDelta * 0.6;
    const lngPad = region.longitudeDelta * 0.6;
    const viewMinLat = region.latitude - latPad;
    const viewMaxLat = region.latitude + latPad;
    const viewMinLng = region.longitude - lngPad;
    const viewMaxLng = region.longitude + lngPad;

    return ALL_SEGMENTS.filter(
      (s) =>
        s.maxLat >= viewMinLat &&
        s.minLat <= viewMaxLat &&
        s.maxLng >= viewMinLng &&
        s.minLng <= viewMaxLng,
    ).map((s) => (
      <Polyline
        key={`${s.routeId}-${s.idx}`}
        coordinates={s.coordinates}
        strokeColor={s.color}
        strokeWidth={3}
        lineCap="round"
        lineJoin="round"
      />
    ));
  }, [region]);

  return <>{visiblePolylines}</>;
});
