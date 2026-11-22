/**
 * Pictures of the examples, for the gallery and the switcher: each captured
 * from the example's own canvas a moment after it starts, kept as a small
 * JPEG in `localStorage` (this browser's, until the next run replaces it).
 */
const THUMBNAILS = "dyno.examples.thumbnail.";
/** Thumbnail size, 16:9: the gallery's cards at 2× (the menu's are smaller). */
const THUMB_WIDTH = 480;
const THUMB_HEIGHT = 270;

/** Only what `captureThumbnail` writes: a base64 JPEG data URL. */
const THUMBNAIL_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

export function readThumbnail(id: string): string | undefined {
  try {
    // Storage is shared with the origin: anything else in it is ignored.
    const url = localStorage.getItem(THUMBNAILS + id);
    return url && THUMBNAIL_URL.test(url) ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A picture of the example for the menu: `render` draws a frame, read in
 * the same task (a WebGPU canvas's image is valid until the task ends),
 * cropped to 16:9 and kept as a small JPEG.
 */
export function captureThumbnail(
  id: string,
  canvas: HTMLCanvasElement,
  render: () => void,
): void {
  if (canvas.width === 0 || canvas.height === 0) {
    return;
  }
  try {
    render();
    const out = document.createElement("canvas");
    out.width = THUMB_WIDTH;
    out.height = THUMB_HEIGHT;
    const ctx = out.getContext("2d");
    if (!ctx) {
      return;
    }
    // Cover: the largest centered 16:9 rectangle of the view.
    const aspect = THUMB_WIDTH / THUMB_HEIGHT;
    let w = canvas.width;
    let h = w / aspect;
    if (h > canvas.height) {
      h = canvas.height;
      w = h * aspect;
    }
    ctx.drawImage(
      canvas,
      (canvas.width - w) / 2,
      (canvas.height - h) / 2,
      w,
      h,
      0,
      0,
      THUMB_WIDTH,
      THUMB_HEIGHT,
    );
    localStorage.setItem(THUMBNAILS + id, out.toDataURL("image/jpeg", 0.8));
  } catch {
    // No picture (storage full or blocked): the menu shows initials.
  }
}
