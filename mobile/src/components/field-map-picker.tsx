'use dom';

/**
 * Field map (Expo DOM component: a webview on iOS/Android, plain HTML on web).
 *
 * Modes
 *  - locate:  move the map; a centre pin marks the spot (reports the centre on move)
 *  - draw:    tap to add a corner, drag corners, tap "+" to insert, tap a corner to select it
 *  - review:  fitted to the field, edge lengths shown, no editing
 *  - preview: small, static picture of the field (Home)
 * The native screen owns the list of corners; this component only reports gestures.
 */

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

type Mode = 'locate' | 'draw' | 'review' | 'preview';

type Props = {
  mode: Mode;
  center: [number, number];
  points: [number, number][];
  selected?: number | null;
  satellite: boolean;
  /** bump to fly to `center` */
  recenterKey?: number;
  /** bump to fit the map to the field */
  fitKey?: number;
  /** { n } bump; dir +1 zoom in, -1 out */
  zoomCmd?: { dir: 1 | -1; n: number };
  flyZoom?: number;
  onAddPoint?: (lat: number, lng: number) => Promise<void>;
  onMovePoint?: (i: number, lat: number, lng: number) => Promise<void>;
  onInsertPoint?: (i: number, lat: number, lng: number) => Promise<void>;
  onSelectPoint?: (i: number | null) => Promise<void>;
  onCenter?: (lat: number, lng: number, zoom: number) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
};

const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const SAT_ATTR = 'Imagery © Esri, Maxar, Earthstar Geographics';
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '© OpenStreetMap contributors';

const CSS = `
html,body,#root{margin:0;height:100%;background:#1a1a19;}
.leaflet-container{background:#1a1a19;font-family:Inter,system-ui,sans-serif;}
.leaflet-container.draw{cursor:crosshair;}
.leaflet-control-attribution{font-size:9px;opacity:.75;}
.fz-field{stroke-dasharray:10 8;animation:fz-march 0.9s linear infinite;}
.fz-field.solid{stroke-dasharray:none;animation:fz-fill .6s ease-out both;}
@keyframes fz-march{to{stroke-dashoffset:-18;}}
@keyframes fz-fill{from{fill-opacity:0;}to{fill-opacity:.35;}}
.fz-vertex{width:26px;height:26px;border-radius:50%;background:#17734a;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.45);
  color:#fff;font:700 11px/20px Inter,system-ui,sans-serif;text-align:center;box-sizing:border-box;animation:fz-pop .28s cubic-bezier(.23,1,.32,1) both;transition:transform .15s;}
.fz-vertex.first{background:#e8a400;}
.fz-vertex.sel{background:#d03b3b;transform:scale(1.25);}
.fz-mid{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.88);color:#17734a;border:2px solid #17734a;box-sizing:border-box;
  font:800 15px/17px Inter,system-ui,sans-serif;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.35);animation:fz-pop .3s .08s both;}
.fz-len{position:absolute;left:0;top:0;display:inline-block;background:rgba(15,16,14,.85);color:#fff;font:600 11px/1 Inter,system-ui,sans-serif;padding:5px 8px;border-radius:999px;white-space:nowrap;
  transform:translate(-50%,-50%);animation:fz-fade .4s both;box-shadow:0 1px 4px rgba(0,0,0,.4);}
@keyframes fz-pop{from{transform:scale(.3);opacity:0;}to{transform:scale(1);opacity:1;}}
@keyframes fz-fade{from{opacity:0;}to{opacity:1;}}
.fz-pin{position:absolute;left:50%;top:50%;z-index:500;pointer-events:none;transform:translate(-50%,-100%);}
.fz-pin .head{width:30px;height:30px;border-radius:50% 50% 50% 0;background:#d03b3b;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4);
  animation:fz-bob 1.2s ease-in-out infinite alternate;}
.fz-pin .shadow{width:14px;height:5px;margin:4px auto 0;border-radius:50%;background:rgba(0,0,0,.45);animation:fz-shadow 1.2s ease-in-out infinite alternate;}
@keyframes fz-bob{from{transform:rotate(-45deg) translate(0,0);}to{transform:rotate(-45deg) translate(5px,-5px);}}
@keyframes fz-shadow{from{transform:scale(1);opacity:.55;}to{transform:scale(.7);opacity:.3;}}
`;

function metres(a: L.LatLng, b: L.LatLng) {
  return a.distanceTo(b);
}

export default function FieldMapPicker(props: Props) {
  const { mode, center, points, selected, satellite, recenterKey, fitKey, zoomCmd, flyZoom } = props;
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const labels = useRef<L.TileLayer | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const cb = useRef(props);
  useEffect(() => {
    cb.current = props;
  });

  // create once
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, zoomSnap: 0.5 }).setView(center, 16);
    m.on('click', (e: L.LeafletMouseEvent) => {
      const p = cb.current;
      if (p.mode === 'draw') p.onAddPoint?.(e.latlng.lat, e.latlng.lng);
      else if (p.mode === 'locate') m.panTo(e.latlng);
    });
    m.on('moveend', () => {
      const c = m.getCenter();
      cb.current.onCenter?.(c.lat, c.lng, m.getZoom());
    });
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // interaction per mode
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const still = mode === 'preview';
    [m.dragging, m.touchZoom, m.doubleClickZoom, m.scrollWheelZoom, m.boxZoom, m.keyboard].forEach((h) =>
      still ? h.disable() : h.enable(),
    );
    m.getContainer().classList.toggle('draw', mode === 'draw');
  }, [mode]);

  // base layers
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    base.current?.remove();
    labels.current?.remove();
    base.current = L.tileLayer(satellite ? SAT : OSM, {
      maxZoom: 19,
      maxNativeZoom: satellite ? 19 : 19,
      attribution: satellite ? SAT_ATTR : OSM_ATTR,
    }).addTo(m);
    if (satellite && mode !== 'preview') labels.current = L.tileLayer(LABELS, { maxZoom: 19, opacity: 0.9 }).addTo(m);
  }, [satellite, mode]);

  useEffect(() => {
    if (recenterKey) map.current?.flyTo(center, flyZoom ?? 17, { duration: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  useEffect(() => {
    const m = map.current;
    if (!m || points.length < 2) return;
    const b = L.latLngBounds(points);
    if (mode === 'preview') m.fitBounds(b, { padding: [24, 24], animate: false, maxZoom: 19 });
    else if (fitKey) {
      // keep the field in the gap between the top panel and the bottom sheet
      const h = m.getSize().y;
      const opts = mode === 'review' ? { paddingTopLeft: [30, 160] as L.PointTuple, paddingBottomRight: [70, Math.min(480, h * 0.55)] as L.PointTuple } : { padding: [70, 70] as L.PointTuple };
      m.flyToBounds(b, { ...opts, duration: 0.8, maxZoom: 19 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, mode === 'preview' ? points : null]);

  useEffect(() => {
    if (!zoomCmd?.n) return;
    const m = map.current;
    if (m) (zoomCmd.dir > 0 ? m.zoomIn : m.zoomOut).call(m, 1);
  }, [zoomCmd]);

  // the field
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    const ll = points.map((p) => L.latLng(p[0], p[1]));
    const editing = mode === 'draw';
    const closed = ll.length >= 3;
    let shape: L.Polygon | L.Polyline | null = null;
    if (closed) {
      shape = L.polygon(ll, {
        color: '#ffd23f',
        weight: 3,
        fillColor: '#46b37c',
        fillOpacity: 0.35,
        className: editing ? 'fz-field' : 'fz-field solid',
        interactive: false,
      }).addTo(g);
    } else if (ll.length === 2) {
      shape = L.polyline(ll, { color: '#ffd23f', weight: 3, className: 'fz-field', interactive: false }).addTo(g);
    }

    if (mode === 'review' || mode === 'preview') {
      if (mode === 'review' && closed)
        ll.forEach((a, i) => {
          const b = ll[(i + 1) % ll.length];
          const mid = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
          L.marker(mid, {
            interactive: false,
            icon: L.divIcon({ className: '', html: `<div style="position:relative;width:0;height:0"><span class="fz-len">${Math.round(metres(a, b))} m</span></div>`, iconSize: [0, 0] }),
          }).addTo(g);
        });
      return;
    }

    // midpoint "+" handles
    if (editing && ll.length >= 2) {
      const edges = closed ? ll.length : ll.length - 1;
      for (let i = 0; i < edges; i++) {
        const a = ll[i];
        const b = ll[(i + 1) % ll.length];
        const mid = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
        const h = L.marker(mid, {
          icon: L.divIcon({ className: '', html: '<div class="fz-mid">+</div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
        }).addTo(g);
        h.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          cb.current.onInsertPoint?.(i + 1, mid.lat, mid.lng);
        });
      }
    }

    // corners
    ll.forEach((p, i) => {
      const cls = `fz-vertex${i === 0 ? ' first' : ''}${selected === i ? ' sel' : ''}`;
      const v = L.marker(p, {
        draggable: editing,
        autoPan: true,
        icon: L.divIcon({ className: '', html: `<div class="${cls}">${i + 1}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
      }).addTo(g);
      v.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        cb.current.onSelectPoint?.(selected === i ? null : i);
      });
      v.on('drag', () => {
        const now = v.getLatLng();
        const next = ll.slice();
        next[i] = now;
        shape?.setLatLngs(next);
      });
      v.on('dragend', () => {
        const now = v.getLatLng();
        cb.current.onMovePoint?.(i, now.lat, now.lng);
      });
    });
  }, [points, selected, mode]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{CSS}</style>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
      {mode === 'locate' ? (
        <div className="fz-pin">
          <div className="head" />
          <div className="shadow" />
        </div>
      ) : null}
    </div>
  );
}
