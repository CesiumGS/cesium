/**
 * The format of the frames data store's `manifest.json` (what `npm run setup`
 * writes), and the one plain sentence a reader gives when the store was built
 * in another. Bump `FRAMES_DATA_FORMAT` with any change to what the store
 * persists, a key's name included (test/dataFormats.test.ts pins the keys), and
 * `npm run setup` writes the new number into the manifest it makes.
 */
export const FRAMES_DATA_FORMAT = 1;

/** The command that fills the store. */
export const FRAMES_DATA_COMMAND = "npm run setup";

/**
 * Why a parsed manifest isn't in the format this code reads, as one sentence
 * that names the dataset and the command; `undefined` when it is.
 */
export function framesDataFormatProblem(manifest: unknown): string | undefined {
  const format =
    typeof manifest === "object" && manifest !== null
      ? (manifest as { format?: unknown }).format
      : undefined;
  if (format === FRAMES_DATA_FORMAT) {
    return undefined;
  }
  const why =
    typeof format === "number"
      ? `built as format ${format}, this code reads format ${FRAMES_DATA_FORMAT}`
      : `it records no format, from before formats were recorded; this code reads format ${FRAMES_DATA_FORMAT}`;
  return `frames data: out of date, run \`${FRAMES_DATA_COMMAND}\` (${why}).`;
}
