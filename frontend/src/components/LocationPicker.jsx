import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultPoint = {
  lat: -6.2088,
  lng: 106.8456,
};

const markerIcon = L.divIcon({
  className: "simodar-map-marker",
  html: "<span></span>",
  iconSize: [34, 34],
  iconAnchor: [17, 31],
});

function cleanNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function LocationPicker({ latitude, longitude, onChange }) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;

    const start = [
      cleanNumber(latitude, defaultPoint.lat),
      cleanNumber(longitude, defaultPoint.lng),
    ];
    const map = L.map(mapNodeRef.current, {
      attributionControl: false,
      scrollWheelZoom: true,
    }).setView(start, 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(start, {
      draggable: true,
      icon: markerIcon,
    }).addTo(map);

    const updatePoint = (latlng) => {
      const point = {
        lat: latlng.lat.toFixed(6),
        lng: latlng.lng.toFixed(6),
      };
      marker.setLatLng(latlng);
      onChangeRef.current?.(point);
    };

    map.on("click", (event) => updatePoint(event.latlng));
    marker.on("dragend", () => updatePoint(marker.getLatLng()));

    mapRef.current = map;
    markerRef.current = marker;

    window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const point = [
      cleanNumber(latitude, defaultPoint.lat),
      cleanNumber(longitude, defaultPoint.lng),
    ];
    marker.setLatLng(point);
    map.setView(point, map.getZoom(), { animate: true });
  }, [latitude, longitude]);

  return <div ref={mapNodeRef} className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" />;
}
