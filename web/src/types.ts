export interface Check { ok: boolean; detail: string }
export interface TimelineEvent { t: string; event: string; detail: string }
export interface Report {
  reportId: string; createdAt: string; status: string; lat: number; lng: number; note: string;
  severity?: number; risk?: number; blockType?: string; rainMm?: number; rainSource?: string;
  clusterCount?: number; level: number; levelName: string; dueAt?: string; crew?: string;
  photoUrl?: string; afterUrl?: string; closedAt?: string;
  assessment?: { summary?: string; drainLikely?: boolean; sources?: { vlm: number | null; rekognition: number }; topLabels?: [string, number][] };
  verification?: { verified: boolean; checks: Record<string, Check> };
  timeline?: TimelineEvent[];
}
export interface Stats { total: number; open: number; verified: number; escalated: number; medianHoursToVerified: number | null }
