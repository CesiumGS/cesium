/**
 * The CSG sample's icons: 16 px line drawings on a 16 × 16 grid, in
 * `currentColor`, so they follow the theme and the button's state. Plain
 * strings of SVG, made into elements by `icon()`.
 */
const PATHS = {
  box: '<path d="M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11z"/><path d="M2.5 5 8 7.5 13.5 5M8 7.5v6"/>',
  cylinder:
    '<ellipse cx="8" cy="4" rx="4.5" ry="1.7"/><path d="M3.5 4v8c0 .9 2 1.7 4.5 1.7s4.5-.8 4.5-1.7V4"/>',
  sphere:
    '<circle cx="8" cy="8" r="5.5"/><ellipse cx="8" cy="8" rx="5.5" ry="2" />',
  cone: '<path d="M8 2.5 3 12c0 .9 2.2 1.6 5 1.6s5-.7 5-1.6z"/><path d="M3 12c0 .9 2.2 1.6 5 1.6s5-.7 5-1.6"/>',
  torus:
    '<ellipse cx="8" cy="8" rx="6" ry="3.8"/><path d="M5.3 8.2c.9 1 4.5 1 5.4 0"/>',
  step: '<path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13M6 9h5M8.5 7v4"/>',
  union:
    '<path d="M6 3.5a4 4 0 1 0 0 9 4 4 0 0 0 4 0 4 4 0 1 0 0-9 4 4 0 0 0-4 0z"/>',
  difference:
    '<path d="M6.5 3.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 1.8-.4 4.5 4.5 0 0 1 0-8.2 4.5 4.5 0 0 0-1.8-.4z"/><path d="M8.3 3.9a4.5 4.5 0 0 1 0 8.2" stroke-dasharray="1.6 1.4"/><circle cx="9.5" cy="8" r="4.5" stroke-dasharray="1.6 1.4" opacity=".55"/>',
  intersection:
    '<circle cx="6" cy="8" r="4.5" opacity=".55"/><circle cx="10" cy="8" r="4.5" opacity=".55"/><path d="M8 4.1a4.5 4.5 0 0 1 0 7.8 4.5 4.5 0 0 1 0-7.8z"/>',
  undo: '<path d="M5.5 3 2.5 6l3 3"/><path d="M2.5 6H9a4 4 0 0 1 0 8H6"/>',
  redo: '<path d="M10.5 3l3 3-3 3"/><path d="M13.5 6H7a4 4 0 0 0 0 8h3"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.2"/><path d="M10.5 3.5v-1h-8v8h1"/>',
  trash:
    '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9M7 7v4.5M9 7v4.5"/>',
  eye: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
  eyeOff:
    '<path d="M1.5 8S4 3.5 8 3.5c1 0 1.9.3 2.7.7M14.5 8S12 12.5 8 12.5c-1 0-1.9-.3-2.7-.7"/><path d="M2.5 13.5l11-11"/>',
  fit: '<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/><rect x="5.5" y="5.5" width="5" height="5"/>',
  front:
    '<rect x="3" y="3" width="10" height="10" rx="1"/><path d="M3 3l2-1.5h8L13 3" opacity=".5"/>',
  top: '<path d="M3 13V6l2-3h8v7l-2 3z" opacity=".55"/><path d="M3 6h8v7M11 6l2-3"/>',
  right:
    '<rect x="3" y="3" width="10" height="10" rx="1" opacity=".55"/><path d="M13 3v10M13 3l-2.5 1.5v8.5"/>',
  iso: '<path d="M8 1.8 13.8 5v6L8 14.2 2.2 11V5z"/><path d="M8 8 2.2 5M8 8l5.8-3M8 8v6.2"/>',
  edges:
    '<path d="M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11z"/><path d="M2.5 5 8 7.5 13.5 5M8 7.5v6" stroke-width="2.2"/>',
  xray: '<path d="M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11z" stroke-dasharray="2 1.5"/><path d="M2.5 5 8 7.5 13.5 5M8 7.5v6"/>',
  paint:
    '<path d="M3 3h6.5l4 4-6 6-4-4z"/><circle cx="6" cy="6" r="1" fill="currentColor"/>',
  snap: '<path d="M2.5 2.5v11h11"/><path d="M2.5 8h11M8 2.5v11" opacity=".5"/><circle cx="8" cy="8" r="1.8" fill="currentColor"/>',
  light:
    '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"/>',
  move: '<path d="M8 1.5v13M1.5 8h13M8 1.5 6.2 3.4M8 1.5l1.8 1.9M8 14.5l-1.8-1.9M8 14.5l1.8-1.9M1.5 8l1.9-1.8M1.5 8l1.9 1.8M14.5 8l-1.9-1.8M14.5 8l-1.9 1.8"/>',
  pushPull: '<path d="M2.5 13.5h11v-3h-11zM8 9V2M5.5 4.5 8 2l2.5 2.5"/>',
  select: '<path d="M3.5 2.5 12 8l-4.2 1 2.2 4.5-1.8.9L6 9.8 3.5 12.5z"/>',
  chevronRight: '<path d="M6 3.5 10.5 8 6 12.5"/>',
  chevronDown: '<path d="M3.5 6 8 10.5 12.5 6"/>',
  grip: '<g fill="currentColor" stroke="none"><circle cx="6" cy="4" r="1"/><circle cx="10" cy="4" r="1"/><circle cx="6" cy="8" r="1"/><circle cx="10" cy="8" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="10" cy="12" r="1"/></g>',
  folder: '<path d="M1.8 4.2h4.2l1.4 1.6h6.8v7H1.8z"/>',
  help: '<circle cx="8" cy="8" r="6"/><path d="M6.2 6.3a1.9 1.9 0 1 1 2.7 1.7c-.6.3-.9.7-.9 1.4M8 11.6v.1"/>',
  close: '<path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>',
  panelLeft:
    '<rect x="2" y="3" width="12" height="10" rx="1.2"/><path d="M6 3v10"/>',
  panelRight:
    '<rect x="2" y="3" width="12" height="10" rx="1.2"/><path d="M10 3v10"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** An icon as an element. */
export function icon(name: IconName, size = 16): SVGSVGElement {
  const wrapper = document.createElement("span");
  wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
  return wrapper.firstElementChild as SVGSVGElement;
}
