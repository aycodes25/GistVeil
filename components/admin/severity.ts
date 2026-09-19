import type { BadgeTone } from '@/components/ui/Badge';
import { severityFor } from '@/lib/present';

const BADGE: Record<ReturnType<typeof severityFor>, { label: string; tone: BadgeTone }> = {
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'neutral' },
};

// Reports carry no severity of their own: it is derived from how many people reported the item
// (3 or more is High, 2 is Medium, 1 is Low).
export function severityBadge(reportCount: number): { label: string; tone: BadgeTone } {
  return BADGE[severityFor(reportCount)];
}
