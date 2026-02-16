import { transit_realtime } from 'gtfs-realtime-bindings';
import { AlertActivePeriod, ServiceAlert } from '../types';

// ── Helpers ────────────────────────────────────────────────────────

function toSeconds(value: number | object | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    return (value as { toNumber(): number }).toNumber();
  }
  return null;
}

/**
 * GTFS-RT TranslatedString may contain multiple translations.
 * We pick the first English one, or the first available.
 */
function extractTranslatedText(
  translated: transit_realtime.ITranslatedString | null | undefined,
): string {
  if (!translated?.translation?.length) return '';

  const english = translated.translation.find((t) => !t.language || t.language === 'en');
  return (english ?? translated.translation[0])?.text ?? '';
}

// ── Public mapper ──────────────────────────────────────────────────

/**
 * Extracts service alerts from Alert entities in a decoded GTFS-RT
 * FeedMessage.  Pure function — no side effects.
 */
export function mapAlerts(feed: transit_realtime.IFeedMessage): ServiceAlert[] {
  const alerts: ServiceAlert[] = [];

  for (const entity of feed.entity ?? []) {
    const alert = entity.alert;
    if (!alert) continue;

    // Collect affected route IDs
    const routeIds = new Set<string>();
    for (const informed of alert.informedEntity ?? []) {
      const routeId = informed.routeId?.toUpperCase();
      if (routeId) routeIds.add(routeId);
    }

    // Parse active periods
    const activePeriods: AlertActivePeriod[] = (alert.activePeriod ?? []).map((period) => ({
      startTime: toSeconds(period.start),
      endTime: toSeconds(period.end),
    }));

    const header = extractTranslatedText(alert.headerText);
    const description = extractTranslatedText(alert.descriptionText);

    // Skip alerts with no useful information
    if (!header && !description) continue;

    alerts.push({
      id: entity.id ?? `alert-${alerts.length}`,
      routeIds: [...routeIds],
      header,
      description,
      activePeriods,
    });
  }

  return alerts;
}

/**
 * Filters alerts to only include those affecting the given routes.
 * If `routes` is empty or undefined, returns all alerts.
 */
export function filterAlertsForRoutes(alerts: ServiceAlert[], routes?: string[]): ServiceAlert[] {
  if (!routes || routes.length === 0) return alerts;
  const routeSet = new Set(routes.map((r) => r.toUpperCase()));
  return alerts.filter((a) => a.routeIds.some((rid) => routeSet.has(rid)));
}
