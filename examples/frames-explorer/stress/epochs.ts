// The catalog's epochs, in one place (the final review, finding 1): the
// stress cases evaluate at them, and each scenario's checked setup takes
// them from here, so a re-pinned case moves its scenario with it. No
// imports, so the page's bundle can read it without the catalog.

/** The catalog's measurement epoch, UTC (no zone: `utc()` parses it as UTC). */
export const MEASURED_AT = "2026-03-01T00:00:00";

/** The lunar flyby, UTC (no zone, as `MEASURED_AT`). */
export const FLYBY = "2026-04-06T23:00:00";

/** `MEASURED_AT` as an ISO UTC string. */
export const MEASURED_AT_UTC = `${MEASURED_AT}Z`;

/** `FLYBY` as an ISO UTC string. */
export const FLYBY_UTC = `${FLYBY}Z`;

/**
 * The signal fixture's "spread" row (test/fixtures/frames/signal.json, TDB
 * 828752222.2056508 s past J2000) in UTC to the ms: Orion 1.315
 * light-seconds from DSS-43 and 28° above its horizon. space.dss43-orion
 * judges every row; the dish's and the capstone's checked setups are this
 * one. A test holds it to the fixture.
 */
export const SIGNAL_ROW_UTC = "2026-04-06T12:55:53.020Z";
