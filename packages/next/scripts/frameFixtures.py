"""Writes test/fixtures/frames/*.json from pyerfa, the reference for the frames tests.

Usage: uv run --with pyerfa --with numpy python scripts/frameFixtures.py <section> [args]

Sections: dtdb, bias, earth, earthLeap <store>, utc <store> (needs jplephem), ephemeris
<store> (needs jplephem), moon <store> <frame kernel> (needs spiceypy and jplephem),
trajectories <store> <frame kernel> (needs spiceypy), geodesic (needs geographiclib only),
signal <store> <frame kernel> <earth pck> (needs spiceypy).
earthLeap reads the store's EOP-All.csv; the others read the NAIF kernels
`npm run setup` downloaded to <store>. Only their small JSON output is committed.
"""

import json
import struct
import sys
from pathlib import Path

try:
    import erfa
except ImportError:  # the ephemeris and moon sections do not need pyerfa
    erfa = None
import numpy as np

OUT = Path(__file__).resolve().parent.parent / "test" / "fixtures" / "frames"


def write(name, rows):
    OUT.mkdir(parents=True, exist_ok=True)
    # Python's json writes float repr, which round-trips float64.
    (OUT / f"{name}.json").write_text(json.dumps(rows, indent=1) + "\n")
    if isinstance(rows, dict) and "rows" not in rows:
        print(f"wrote {name}.json")
        return
    count = len(rows["rows"]) if isinstance(rows, dict) else len(rows)
    print(f"wrote {name}.json ({count} rows)")


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


def bias():
    """The frame bias: bp06's rb (row-major, eme2000 = rb * icrs) at J2000, and
    bi00's offsets (dpsibi, depsbi, dra, radians)."""
    rb = erfa.bp06(2451545.0, 0.0)[0]
    dpsibi, depsbi, dra = erfa.bi00()
    write(
        "bias",
        {
            "rb": [float(v) for v in np.asarray(rb).reshape(9)],
            "bi00": {"dpsibi": float(dpsibi), "depsbi": float(depsbi), "dra": float(dra)},
        },
    )


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


def lagrange(xs, ys, x):
    """4-point Lagrange through (xs, ys) at x."""
    total = 0.0
    for i in range(len(xs)):
        w = ys[i]
        for j in range(len(xs)):
            if j != i:
                w *= (x - xs[j]) / (xs[i] - xs[j])
        total += w
    return total


def earth_leap(store):
    """GCRS->ITRS inside the 2016-12-31 leap second, with EOP from the store's
    EOP-All.csv rows 2016-12-29..2017-01-03 (the real DAT 36 -> 37 step).

    Written as {csv, rows}: the TypeScript parses `csv` and looks the EOP up
    itself, so the test checks the lookup as well as the rotation. The EOP
    here is interpolated independently: 4-point Lagrange of UT1-TAI (and
    xp, yp, dX, dY) at ERFA's own UTC date for 23:59:60.x, which dtf2d puts
    inside 2016-12-31 (a 86401 s day). UT1-UTC is then UT1-TAI + 36, the
    pre-leap day's TAI-UTC (erfa.dat), as utcut1 expects.
    """
    arcsec = np.pi / 648000.0
    lines = (Path(store) / "EOP-All.csv").read_text().splitlines()
    header = lines[0].split(",")
    wanted = [ln for ln in lines[1:] if ln[:10] >= "2016-12-29" and ln[:10] <= "2017-01-03"]
    assert len(wanted) == 6, wanted
    col = {name: i for i, name in enumerate(header)}
    table = [ln.split(",") for ln in wanted]
    mjd = [float(f[col["MJD"]]) for f in table]
    dat = [float(f[col["DAT"]]) for f in table]
    ut1_tai = [float(f[col["UT1-UTC"]]) - d for f, d in zip(table, dat)]
    fields = {name: [float(f[col[name]]) for f in table] for name in ("X", "Y", "DX", "DY")}

    new_year_tt = (1_483_228_800 - 946_728_000) + 37 + 32.184
    rows = []
    for label, sec, back in [
        ("2016-12-31T23:59:60.000", 60.0, 1.0),
        ("2016-12-31T23:59:60.500", 60.5, 0.5),
        ("2016-12-31T23:59:60.999", 60.999, 0.001),
    ]:
        utc1, utc2 = erfa.dtf2d("UTC", 2016, 12, 31, 23, 59, sec)
        x = (utc1 - 2400000.5) + utc2  # ERFA's UTC MJD, inside 57753
        lo = max(i for i in range(len(mjd)) if mjd[i] <= x)
        w = slice(lo - 1, lo + 3)
        day_dat = float(erfa.dat(2016, 12, 31, 0.0))
        dut1 = lagrange(mjd[w], ut1_tai[w], x) + day_dat
        xp, yp, dx, dy = (lagrange(mjd[w], fields[n][w], x) * arcsec for n in ("X", "Y", "DX", "DY"))
        row = earth_row(utc1, utc2, None, new_year_tt - back, dut1, xp, yp, dx, dy)
        row["label"] = label
        rows.append(row)
    write("earthLeap", {"csv": "\n".join([lines[0]] + wanted) + "\n", "rows": rows})


def utc(store):
    """UTC -> TT -> TDB by pyerfa (dtf2d, utctai, taitt, dtdb) at 10 UTC instants,
    both sides of the 2016 leap second and 2049-12-31T23:59:59.999, with
    jplephem's Sun, Earth and geocentric Moon (km) at that TDB from de440s.bsp.

    `tt` and `tdb` are seconds past J2000; TDB - TT is the geocentric series
    (dtdb with zero site terms), as Instant.tdb() uses.
    """
    import calendar

    from jplephem.spk import SPK

    kernel = SPK.open(str(Path(store) / "de440s.bsp"))
    j2000 = 2451545.0
    rows = []
    for y, mo, d, h, mi, sec, ms in [
        (2000, 1, 1, 12, 0, 0, 0),
        (2006, 3, 15, 6, 30, 0, 250),
        (2012, 6, 30, 23, 59, 59, 0),
        (2016, 12, 31, 23, 59, 59, 0),
        (2016, 12, 31, 23, 59, 59, 999),
        (2017, 1, 1, 0, 0, 0, 0),
        (2017, 1, 1, 0, 0, 0, 1),
        (2026, 4, 6, 22, 44, 0, 0),
        (2038, 1, 19, 3, 14, 7, 0),
        (2049, 12, 31, 23, 59, 59, 999),
    ]:
        utc1, utc2 = erfa.dtf2d("UTC", y, mo, d, h, mi, sec + ms / 1000.0)
        tai1, tai2 = erfa.utctai(utc1, utc2)
        tt1, tt2 = erfa.taitt(tai1, tai2)
        dtdb = float(erfa.dtdb(tt1, tt2, 0.0, 0.0, 0.0, 0.0))
        # Days past J2000 from the two parts, the large one exact.
        tt = ((tt1 - j2000) + tt2) * 86400.0
        tdb = tt + dtdb

        def pos(a, b):
            return np.asarray(kernel[a, b].compute(j2000, tdb / 86400.0))

        emb, moon, earth = pos(0, 3), pos(3, 301), pos(3, 399)
        rows.append(
            {
                "label": f"{y:04d}-{mo:02d}-{d:02d}T{h:02d}:{mi:02d}:{sec:02d}.{ms:03d}Z",
                "utcMs": calendar.timegm((y, mo, d, h, mi, sec)) * 1000 + ms,
                "tt": float(tt),
                "tdb": float(tdb),
                "sun": [float(v) for v in pos(0, 10)],
                "earth": [float(v) for v in emb + earth],
                "moonFromEarth": [float(v) for v in moon - earth],
            }
        )
    write("utc", rows)


def pack_segment(store, pack, name):
    """A segment's manifest entry from a pack file (CPK1, u32 length, JSON)."""
    raw = (Path(store) / pack).read_bytes()
    length = struct.unpack_from("<I", raw, 4)[0]
    manifest = json.loads(raw[8 : 8 + length])
    return next(s for s in manifest["segments"] if s["name"] == name)


def instants(store):
    """40 TDB instants (s past J2000) over 2000-2050: 37 evenly spaced, 2049-12-31
    00:00, 2050-12-31 00:00 (near the pack's end) and an exact record boundary,
    init + k * intervalLength of the moon segment, written as the TypeScript
    computes it."""
    seg = pack_segment(sys.argv[2], "planets-de440-2000-2050.pack", "moon")
    day = 86400.0
    j2000 = 2451545.0
    # JD 2469806.5 is 2049-12-31 00:00; 2470170.5 is 2050-12-31 00:00.
    late = [(2469806.5 - j2000) * day, (2470170.5 - j2000) * day]
    boundary = seg["init"] + (seg["count"] // 2) * seg["intervalLength"]
    even = list(np.linspace(0.5 * 365.25 * day, 49.5 * 365.25 * day, 37))
    return sorted([float(t) for t in even] + late + [float(boundary)]), float(boundary)


def ephemeris(store):
    """Sun, EMB, Moon-wrt-EMB and Earth-wrt-EMB, km and km/s, from jplephem on de440s.bsp."""
    from jplephem.spk import SPK

    kernel = SPK.open(str(Path(store) / "de440s.bsp"))
    times, boundary = instants(store)
    rows = []

    def state(a, b, tdb):
        # Two-part date keeps the full float64 resolution of tdb seconds.
        pos, vel = kernel[a, b].compute_and_differentiate(2451545.0, tdb / 86400.0)
        return [float(v) for v in pos] + [float(v) / 86400.0 for v in vel]

    for tdb in times:
        rows.append(
            {
                "tdb": tdb,
                "boundary": tdb == boundary,
                "sun": state(0, 10, tdb),
                "emb": state(0, 3, tdb),
                "moonWrtEmb": state(3, 301, tdb),
                "earthWrtEmb": state(3, 399, tdb),
            }
        )
    write("ephemeris", rows)


def moon(store, frame_kernel):
    """Moon orientation from SPICE: PCK Euler angles and pxform matrices (row-major)."""
    import spiceypy as sp
    from jplephem.pck import PCK

    store = Path(store)
    for kernel in ("de440s.bsp", "moon_pa_de440_200625.bpc"):
        sp.furnsh(str(store / kernel))
    sp.furnsh(str(frame_kernel))
    pck = PCK.open(str(store / "moon_pa_de440_200625.bpc"))
    segment = next(s for s in pck.segments if s.body == 31008)
    times, _ = instants(store)
    rows = []
    for tdb in times:
        angles = segment.compute(2451545.0, tdb / 86400.0)
        rows.append(
            {
                "tdb": tdb,
                "euler": [float(v) for v in np.asarray(angles).reshape(-1)[:3]],
                "pa": [float(v) for v in sp.pxform("J2000", "MOON_PA", tdb).reshape(9)],
                "me": [float(v) for v in sp.pxform("J2000", "MOON_ME", tdb).reshape(9)],
                "paToMe": [float(v) for v in sp.pxform("MOON_PA", "MOON_ME", tdb).reshape(9)],
            }
        )
    write("moon", rows)


ARTEMIS_MAIN = "art002_rec_260402_260410_jsc_bet_revf.bsp"
ARTEMIS_GAPFILL = "art002_rec_260402_260410_jsc_bet_revf_gapfill.bsp"
STATIONS = "earthstns_itrf93_260814.bsp"


def type13_segments(path):
    """Each segment's (start, end, epochs) of the type 13 segments of an SPK
    (DAF, little-endian): summary start and end, and the stored epochs, TDB s."""
    raw = Path(path).read_bytes()
    nd, ni = struct.unpack_from("<ii", raw, 8)
    assert (nd, ni) == (2, 6)
    record = struct.unpack_from("<i", raw, 76)[0]
    out = []
    while record:
        base = (record - 1) * 1024
        nxt, _, count = struct.unpack_from("<ddd", raw, base)
        for i in range(int(count)):
            at = base + 24 + i * 40
            start, end = struct.unpack_from("<dd", raw, at)
            _target, _center, _frame, dtype, first, last = struct.unpack_from("<6i", raw, at + 16)
            if dtype != 13:
                continue
            # Type 13: states (6n), epochs (n), a directory, then window size and n.
            n = int(struct.unpack_from("<d", raw, (last - 1) * 8)[0])
            epochs = struct.unpack_from(f"<{n}d", raw, (first - 1 + 6 * n) * 8)
            out.append((start, end, list(epochs)))
        record = int(nxt)
    return out


def trajectories(store, frame_kernel):
    """Orion (-24) wrt Earth from SPICE with the main then the gap-fill SPK
    furnished (the later file wins, as in Trajectory.fromSpk), and two DSN
    stations, in km and km/s. Every instant is TDB seconds past J2000.

    Orion: the 12 distinct segment endpoints (the gap-fill segments share
    the main ones), one stored epoch, then per segment one instant strictly
    between the first two epochs and one 1 s before its end (the midpoint of
    the last two epochs when they are closer than 2 s), so a window that is
    off by one near an edge shows up, and the rest spread across the span."""
    import spiceypy as sp

    store = Path(store)
    for kernel in ("de440s.bsp", "moon_pa_de440_200625.bpc"):
        sp.furnsh(str(store / kernel))
    sp.furnsh(str(frame_kernel))
    # Furnish order is precedence: SPICE searches the last loaded file first.
    for kernel in (ARTEMIS_MAIN, ARTEMIS_GAPFILL, STATIONS):
        sp.furnsh(str(store / kernel))

    segments = type13_segments(store / ARTEMIS_MAIN) + type13_segments(store / ARTEMIS_GAPFILL)
    segments.sort(key=lambda s: s[0])
    kinds = {}

    def add(et, kind):
        kinds.setdefault(float(et), kind)

    for start, end, epochs in segments:
        add(start, "endpoint")
        add(end, "endpoint")
    main = type13_segments(store / ARTEMIS_MAIN)
    mid_epochs = main[2][2]
    add(mid_epochs[len(mid_epochs) // 2], "epoch")
    for start, end, epochs in segments:
        add((epochs[0] + epochs[1]) / 2, "afterStart")
        last = epochs[-1] - 1.0
        if epochs[-1] - epochs[-2] < 2.0 or last <= epochs[-2]:
            last = (epochs[-1] + epochs[-2]) / 2
        add(last, "beforeEnd")
    low = min(s[0] for s in segments)
    high = max(s[1] for s in segments)
    for et in np.linspace(low, high, 7)[1:-1]:
        add(et, "spread")
    times = sorted(kinds)
    assert len(times) == 40, len(times)

    def state(target, et, frame, center):
        s, _ = sp.spkgeo(target, et, frame, center)
        return [float(v) for v in s]

    orion = [
        {"tdb": et, "kind": kinds[et], "state": state(-24, et, "J2000", 399)} for et in times
    ]
    moon_me = [
        {"tdb": et, "position": [float(v) for v in sp.spkpos("-24", et, "MOON_ME", "NONE", "301")[0]]}
        for et in times[::4]
    ][:10]
    stations = {
        str(target): [
            {"tdb": et, "state": state(target, et, "ITRF93", 399)}
            for et in (times[0], times[len(times) // 2], times[-1])
        ]
        for target in (399014, 399043)
    }
    write("trajectories", {"orion": orion, "moonMe": moon_me, "stations": stations})


def geodesic():
    """Geodesic inverse problems from Python's geographiclib (Karney): 40 pairs on WGS84
    (30 seeded random, 4 nearly antipodal at 0.1 and 0.001 degrees, 2 coincident, pole
    to pole, 3 equatorial) and 5 on the Moon's 1,737,400 m sphere. Each point is geodetic
    (degrees, meters) and also body-fixed Cartesian meters; azimuths are Karney's
    azi1 and azi2, in degrees clockwise from north."""
    from geographiclib.geodesic import Geodesic

    wgs84 = (6378137.0, 6378137.0, 6356752.3142451793)
    moon = (1737400.0,) * 3

    def cartesian(radii, lon, lat, h):
        a, c = radii[0], radii[2]
        e2 = 1.0 - (c * c) / (a * a)
        if abs(lat) == 90.0:  # exactly on the axis, so x = y = 0 and longitude is 0
            return [0.0, 0.0, (a * (1.0 - e2) + h) * (1.0 if lat > 0 else -1.0)]
        phi, lam = np.radians(lat), np.radians(lon)
        n = a / np.sqrt(1.0 - e2 * np.sin(phi) ** 2)
        return [
            float((n + h) * np.cos(phi) * np.cos(lam)),
            float((n + h) * np.cos(phi) * np.sin(lam)),
            float((n * (1.0 - e2) + h) * np.sin(phi)),
        ]

    def row(radii, geod, kind, p, q):
        r = geod.Inverse(p[1], p[0], q[1], q[0])
        return {
            "kind": kind,
            "a": {"lonDeg": p[0], "latDeg": p[1], "height": p[2], "cartesian": cartesian(radii, *p)},
            "b": {"lonDeg": q[0], "latDeg": q[1], "height": q[2], "cartesian": cartesian(radii, *q)},
            "distance": float(r["s12"]),
            "azimuth1Deg": float(r["azi1"]),
            "azimuth2Deg": float(r["azi2"]),
        }

    rng = np.random.default_rng(20261105)

    def random_point():
        return [
            float(rng.uniform(-180, 180)),
            float(np.degrees(np.arcsin(rng.uniform(-1, 1)))),
            float(rng.choice([0.0, rng.uniform(-500, 20000)])),
        ]

    rows = []
    for _ in range(30):
        rows.append(row(wgs84, Geodesic.WGS84, "random", random_point(), random_point()))
    for offset in (0.1, 0.001):
        for lon, lat in ((20.0, 35.0), (-100.0, -10.0)):
            # the antipode of (lon, lat) is (lon + 180, -lat); move off it by `offset` degrees
            anti_lon = lon + 180.0 - 360.0 if lon > 0 else lon + 180.0
            rows.append(
                row(
                    wgs84,
                    Geodesic.WGS84,
                    f"antipodal{offset}",
                    [lon, lat, 0.0],
                    [anti_lon + offset, -lat + offset, 0.0],
                )
            )
    rows.append(row(wgs84, Geodesic.WGS84, "coincident", [12.5, -40.0, 100.0], [12.5, -40.0, 100.0]))
    rows.append(row(wgs84, Geodesic.WGS84, "coincident", [-77.0, 38.9, 0.0], [-77.0, 38.9, 0.0]))
    rows.append(row(wgs84, Geodesic.WGS84, "poleToPole", [0.0, 90.0, 0.0], [0.0, -90.0, 0.0]))
    rows.append(row(wgs84, Geodesic.WGS84, "equatorial", [0.0, 0.0, 0.0], [90.0, 0.0, 0.0]))
    rows.append(row(wgs84, Geodesic.WGS84, "equatorial", [-170.0, 0.0, 0.0], [170.0, 0.0, 0.0]))
    rows.append(row(wgs84, Geodesic.WGS84, "equatorial", [30.0, 0.0, 250.0], [31.0, 0.0, 0.0]))
    assert len(rows) == 40, len(rows)

    sphere = Geodesic(moon[0], 0.0)
    lunar = [
        row(moon, sphere, "moon", [0.0, 0.0, 0.0], [90.0, 0.0, 0.0]),
        row(moon, sphere, "moon", [-20.0, 30.0, 0.0], [135.0, -45.0, 0.0]),
        row(moon, sphere, "moon", [10.0, -80.0, 2000.0], [-170.0, 79.0, 0.0]),
        row(moon, sphere, "moon", [0.0, 89.0, 0.0], [180.0, 89.0, 0.0]),
        row(moon, sphere, "moon", [45.0, 10.0, 500.0], [46.0, 10.5, 1500.0]),
    ]
    write("geodesic", {"wgs84": rows, "moon": lunar, "moonRadius": moon[0]})


def signal(store, frame_kernel, earth_pck):
    """Light times and apparent directions from SPICE's spkpos, km and s, J2000
    (read as ICRF, plan 2 R1): Orion (-24) and the Moon (301) seen from the
    Earth's center (399), and Orion from DSS-43 (399043), each for CN and XCN
    (converged Newtonian light time, received and transmitted) and CN+S and
    XCN+S (plus stellar aberration). The DSS-43 rows need ITRF93's orientation:
    <earth pck> is NAIF's earth_latest_high_prec.bpc, downloaded by hand (it is
    not in the store). Twelve instants, TDB seconds past J2000: seven within
    5 s of a segment edge (the data's ends and interior joins) and five spread
    across the Artemis span."""
    import spiceypy as sp

    store = Path(store)
    for kernel in ("de440s.bsp", "moon_pa_de440_200625.bpc"):
        sp.furnsh(str(store / kernel))
    sp.furnsh(str(frame_kernel))
    sp.furnsh(str(earth_pck))
    # Furnish order is precedence: SPICE searches the last loaded file first.
    for kernel in (ARTEMIS_MAIN, ARTEMIS_GAPFILL, STATIONS):
        sp.furnsh(str(store / kernel))

    segments = type13_segments(store / ARTEMIS_MAIN) + type13_segments(store / ARTEMIS_GAPFILL)
    low = min(s[0] for s in segments)
    high = max(s[1] for s in segments)
    joins = sorted({s[0] for s in segments} | {s[1] for s in segments})[1:-1]
    edges = [
        (low + 4.0, "nearStart"),
        (joins[0] + 3.0, "nearJoin"),
        (joins[2] + 2.0, "nearJoin"),
        (joins[5] - 3.0, "nearJoin"),
        (joins[7] + 4.0, "nearJoin"),
        (joins[9] - 2.0, "nearJoin"),
        (high - 4.0, "nearEnd"),
    ]
    spread = [(float(et), "spread") for et in np.linspace(low, high, 7)[1:-1]]
    times = sorted(edges + spread)
    assert len(times) == 12, len(times)

    def link(target, et, observer):
        out = {}
        for abcorr in ("CN", "XCN", "CN+S", "XCN+S"):
            position, lt = sp.spkpos(str(target), et, "J2000", abcorr, str(observer))
            out[abcorr] = {"position": [float(v) for v in position], "lt": float(lt)}
        return out

    rows = [
        {
            "tdb": float(et),
            "kind": kind,
            "orion": link(-24, et, 399),
            "moon": link(301, et, 399),
            "dss43": link(-24, et, 399043),
        }
        for et, kind in times
    ]
    write("signal", {"rows": rows})


SECTIONS = {
    "dtdb": dtdb,
    "bias": bias,
    "earth": earth,
    "earthLeap": earth_leap,
    "utc": utc,
    "ephemeris": ephemeris,
    "moon": moon,
    "trajectories": trajectories,
    "geodesic": geodesic,
    "signal": signal,
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in SECTIONS:
        sys.exit(f"usage: frameFixtures.py <{'|'.join(SECTIONS)}> [args]")
    SECTIONS[sys.argv[1]](*sys.argv[2:])
