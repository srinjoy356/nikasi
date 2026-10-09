import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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
    if (pts.length) map.fitBounds(pts, { padding: [48, 48], maxZoom: 16 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function pin(r: Report, selected: boolean) {
  const size = 22 + (r.severity || 1) * 4;
  const open = isOpen(r);
  const hot = open && (r.risk || 0) >= 75;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div class="pin ${selected ? 'sel' : ''} ${hot ? 'pulse' : ''}" style="width:${size}px;height:${size}px;background:${open ? riskColor(r.risk) : '#0e5a56'};opacity:${open ? 1 : 0.55}">${open ? r.risk ?? '' : '&#10003;'}</div>`,
  });
}

export function TicketMap({ reports, selected, onSelect }: { reports: Report[]; selected?: string; onSelect: (id: string) => void }) {
  const shown = reports.filter((r) => r.risk !== undefined);
  const pts = shown.map((r) => [r.lat, r.lng] as [number, number]);
  return (
    <MapContainer center={[28.7, 77.1]} zoom={12} className="map" scrollWheelZoom={false}>
      <TileLayer attribution={ATTR} url={TILES} />
      <Fit pts={pts} />
      {shown.map((r) => (
        <Marker key={r.reportId + (selected === r.reportId)} position={[r.lat, r.lng]} icon={pin(r, selected === r.reportId)}
          eventHandlers={{ click: () => onSelect(r.reportId) }} keyboard={false} />
      ))}
    </MapContainer>
  );
}

function Click({ onPick }: { onPick: (p: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

const meIcon = L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<div class="pin-me"></div>' });

export function PickMap({ value, onPick }: { value?: [number, number]; onPick: (p: [number, number]) => void }) {
  return (
    <MapContainer center={value || [28.7, 77.1]} zoom={value ? 17 : 11} className="map short" scrollWheelZoom={false} key={value ? value.join() : 'none'}>
      <TileLayer attribution={ATTR} url={TILES} />
      <Click onPick={onPick} />
      {value ? <Marker position={value} icon={meIcon} keyboard={false} /> : null}
    </MapContainer>
  );
}
