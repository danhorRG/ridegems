import type { PoiCategory } from "@/types/route";

export const POI_CATEGORIES: PoiCategory[] = [
  "viewpoint",
  "cafe",
  "food",
  "water",
  "cultural",
  "bike_shop",
  "climb",
  "hazard",
  "other",
];

export const POI_LABELS: Record<PoiCategory, string> = {
  viewpoint: "Viewpoint",
  cafe: "Cafe",
  food: "Food",
  water: "Water refill",
  cultural: "Cultural attraction",
  bike_shop: "Bike shop",
  climb: "Climb",
  hazard: "Hazard",
  other: "Point of interest",
};

export const POI_COLORS: Record<PoiCategory, string> = {
  viewpoint: "#E8A33D",
  cafe: "#C9852A",
  food: "#B5722F",
  water: "#6B8F71",
  cultural: "#8A6D3F",
  bike_shop: "#5B6B78",
  climb: "#9C3B3B",
  hazard: "#C1542C",
  other: "#8A8575",
};

// Inner <svg> markup (no outer <svg> tag) for a 0 0 20 20 viewBox, stroked
// with currentColor at strokeWidth 1.6-1.8 to match the hand-rolled icon
// style already used elsewhere in the app (e.g. the GPX download icon).
export const POI_ICON_PATHS: Record<PoiCategory, string> = {
  viewpoint:
    '<path d="M2 10Q10 3 18 10Q10 17 2 10Z"/>' +
    '<circle cx="10" cy="10" r="2.2"/>',
  cafe:
    '<path d="M4.5 8h8v4.5a3.5 3.5 0 01-3.5 3.5h-1A3.5 3.5 0 014.5 12.5V8z"/>' +
    '<path d="M12.5 9h1a1.8 1.8 0 010 3.6h-1"/>' +
    '<path d="M6.5 5.5c.5-.7.5-1.3 0-2M9 5.5c.5-.7.5-1.3 0-2"/>',
  food: '<circle cx="10" cy="10" r="6.5"/><circle cx="10" cy="10" r="3"/>',
  water: '<path d="M10 3.5S5 9.8 5 13a5 5 0 0010 0c0-3.2-5-9.5-5-9.5z"/>',
  cultural:
    '<path d="M3 16h14M4 16V9M7 16V9M10 16V9M13 16V9M16 16V9M2.5 9L10 4l7.5 5"/>',
  bike_shop:
    '<path d="M13.5 3.5a3.5 3.5 0 00-4.6 4.2L3 13.6V17h3.4l5.9-5.9a3.5 3.5 0 004.2-4.6l-2.6 2.6-2-2 2.6-2.6z"/>',
  climb: '<path d="M2 15.5l4.5-6 2.5 3 3-4.5 5.5 7.5H2z"/>',
  hazard:
    '<path d="M10 3.5L17.5 16h-15L10 3.5z"/>' +
    '<path d="M10 8.5v3.2"/>' +
    '<circle cx="10" cy="13.7" r="0.6" fill="currentColor" stroke="none"/>',
  other:
    '<path d="M10 17s5.5-5.6 5.5-9.3A5.5 5.5 0 104.5 7.7C4.5 11.4 10 17 10 17z"/>' +
    '<circle cx="10" cy="7.5" r="1.8"/>',
};

export function PoiIcon({ category, className }: { category: PoiCategory; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: POI_ICON_PATHS[category] }}
    />
  );
}

// Standalone HTML string for a Leaflet L.divIcon (Leaflet renders raw DOM,
// not React) -- a teardrop pin in the category color with the same glyph
// used by <PoiIcon>. Pair with iconSize [30, 30] and iconAnchor [15, 30].
export function poiDivIconHtml(category: PoiCategory): string {
  const color = POI_COLORS[category];
  return `<div style="width:30px;height:30px;position:relative;">
    <div style="position:absolute;left:2px;top:0;width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};border:2px solid #16231C;transform:rotate(-45deg);box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>
    <svg style="position:absolute;left:7px;top:5px;" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="#16231C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${POI_ICON_PATHS[category]}</svg>
  </div>`;
}
