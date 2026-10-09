import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Report } from './types';
import { isOpen, riskColor } from './util';

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; OpenStreetMap contributors';

function Fit({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  const key = pts.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function TicketMap({ reports, selected, onSelect }: { reports: Report[]; selected?: string; onSelect: (id: string) => void }) {
  const shown = reports.filter((r) => r.risk !== undefined);
  const pts = shown.map((r) => [r.lat, r.lng] as [number, number]);
  return (
    <MapContainer center={[28.7, 77.1]} zoom={12} className="map" scrollWheelZoom={false}>
      <TileLayer attribution={ATTR} url={TILES} />
      <Fit pts={pts} />
      {shown.map((r) => (
        <CircleMarker
          key={r.reportId}
          center={[r.lat, r.lng]}
          radius={7 + (r.severity || 1) * 2}
          pathOptions={{
            color: selected === r.reportId ? '#000' : '#fff',
            weight: selected === r.reportId ? 3 : 2,
            fillColor: isOpen(r) ? riskColor(r.risk) : '#2e7d5b',
            fillOpacity: isOpen(r) ? 0.85 : 0.5,
          }}
          eventHandlers={{ click: () => onSelect(r.reportId) }}
        >
          <Tooltip>Report {r.reportId.slice(0, 4)} · risk {r.risk}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

function Click({ onPick }: { onPick: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

export function PickMap({ value, onPick }: { value?: [number, number]; onPick: (p: [number, number]) => void }) {
  return (
    <MapContainer center={value || [28.7, 77.1]} zoom={value ? 16 : 11} className="map small" scrollWheelZoom={false} key={value ? value.join() : 'none'}>
      <TileLayer attribution={ATTR} url={TILES} />
      <Click onPick={onPick} />
      {value ? <CircleMarker center={value} radius={10} pathOptions={{ color: '#fff', fillColor: '#0b5d7a', fillOpacity: 0.9 }} /> : null}
    </MapContainer>
  );
}
