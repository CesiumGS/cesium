"""Writes test/fixtures/frames/*.json from pyerfa, the reference for the frames tests.

Usage: uv run --with pyerfa --with numpy python scripts/frameFixtures.py <section> [args]

Sections: dtdb, earth (later tasks add ephemeris, moon).
"""

import json
import sys
from pathlib import Path

import erfa
import numpy as np

OUT = Path(__file__).resolve().parent.parent / "test" / "fixtures" / "frames"


def write(name, rows):
    OUT.mkdir(parents=True, exist_ok=True)
    # Python's json writes float repr, which round-trips float64.
    (OUT / f"{name}.json").write_text(json.dumps(rows, indent=1) + "\n")
    print(f"wrote {name}.json ({len(rows)} rows)")


def dtdb():
    """TDB-TT at 50 TT instants, 2000-01-01 to 2050-12-31 (geocentric)."""
    start = 2451544.5  # 2000-01-01 00:00 TT
    stop = 2451544.5 + 18628.0  # 2051-01-01
    rows = []
    for jd in np.linspace(start, stop - 1.0, 50):
        # J2000 two-part split, deterministic and exactly representable.
        jd1 = 2451545.0
        jd2 = float(jd - jd1)
        rows.append({"jd1": jd1, "jd2": jd2, "dtdb": float(erfa.dtdb(jd1, jd2, 0.0, 0.0, 0.0, 0.0))})
    write("dtdb", rows)


def earth_row(utc1, utc2, utc_ms, tt, dut1, xp, yp, dx, dy):
    """One GCRS->ITRS reference row. `tt` is TT seconds past J2000 when given."""
    tai1, tai2 = erfa.utctai(utc1, utc2)
    tt1, tt2 = erfa.taitt(tai1, tai2)
    ut11, ut12 = erfa.utcut1(utc1, utc2, dut1)
    x, y = erfa.xy06(tt1, tt2)
    s = erfa.s06(tt1, tt2, x, y)
    era = erfa.era00(ut11, ut12)
    rc2i = erfa.c2ixys(x + dx, y + dy, s)
    rpom = erfa.pom00(xp, yp, erfa.sp00(tt1, tt2))
    m = erfa.c2tcio(rc2i, era, rpom)
    return {
        "utcMs": utc_ms,
        "tt": tt,
        "dut1": float(dut1),
        "xp": xp,
        "yp": yp,
        "dx": dx,
        "dy": dy,
        "tt1": float(tt1),
        "tt2": float(tt2),
        "ut11": float(ut11),
        "ut12": float(ut12),
        "x": float(x),
        "y": float(y),
        "s": float(s),
        "era": float(era),
        "matrix": [float(v) for v in np.asarray(m).reshape(9)],
    }


def earth():
    """GCRS->ITRS (IAU 2006/2000A, CIO-based): 30 UTC instants 2000-2050, then
    four rows across the 2016-12-31 leap second.

    The EOP values are assumed, of realistic size, not measured: pyerfa has
    no c2t06a taking dX/dY, so the matrix composes c2ixys(x+dx, y+dy, s06),
    era00, pom00(xp, yp, sp00) and c2tcio, as the TypeScript does. Leap rows
    carry `tt` (TT seconds past J2000) because UTC ms cannot name 23:59:60.5;
    the others have `tt: null` and are built from `utcMs`.
    """
    arcsec = np.pi / 648000.0
    rng = np.random.default_rng(20261105)
    rows = []
    for i in range(30):
        # Whole UTC seconds, clear of the 2016 and 2017 leap seconds.
        utc_ms = 946_728_000_000 + i * 54_500_000_000 + 12_345_000
        day = utc_ms // 86_400_000
        sec = (utc_ms % 86_400_000) / 1000.0
        dut1 = float(rng.uniform(-0.9, 0.9))
        xp = float(rng.uniform(-0.3, 0.3) * arcsec)
        yp = float(rng.uniform(0.1, 0.5) * arcsec)
        dx = float(rng.uniform(-0.3, 0.3) * 1e-3 * arcsec)
        dy = float(rng.uniform(-0.3, 0.3) * 1e-3 * arcsec)
        rows.append(
            earth_row(2440587.5 + day, sec / 86400.0, int(utc_ms), None, dut1, xp, yp, dx, dy)
        )

    # Leap second at the end of 2016-12-31 (TAI-UTC 36 -> 37). UT1-UTC steps
    # by +1 s with it, from about -0.41 to +0.59, so UT1 stays continuous.
    # TT seconds past J2000 of 2017-01-01T00:00:00 UTC, exact in decimal.
    new_year_tt = (1_483_228_800 - 946_728_000) + 37 + 32.184
    for label, h, mi, sec, utc_ms, tt, dut1 in [
        ("2016-12-31T23:59:59", 23, 59, 59.0, 1_483_228_799_000, new_year_tt - 2.0, -0.41),
        ("2016-12-31T23:59:60.5", 23, 59, 60.5, None, new_year_tt - 0.5, -0.41),
        ("2017-01-01T00:00:00", 0, 0, 0.0, 1_483_228_800_000, new_year_tt, 0.59),
        ("2017-01-01T00:00:01", 0, 0, 1.0, 1_483_228_801_000, new_year_tt + 1.0, 0.59),
    ]:
        year, month, day = (2016, 12, 31) if h == 23 else (2017, 1, 1)
        utc1, utc2 = erfa.dtf2d("UTC", year, month, day, h, mi, sec)
        row = earth_row(
            utc1, utc2, utc_ms, tt, dut1, 0.15 * arcsec, 0.35 * arcsec, 0.1e-3 * arcsec, -0.1e-3 * arcsec
        )
        row["label"] = label
        rows.append(row)
    write("earth", rows)


SECTIONS = {"dtdb": dtdb, "earth": earth}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in SECTIONS:
        sys.exit(f"usage: frameFixtures.py <{'|'.join(SECTIONS)}> [args]")
    SECTIONS[sys.argv[1]](*sys.argv[2:])
