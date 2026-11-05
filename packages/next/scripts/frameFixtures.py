"""Writes test/fixtures/frames/*.json from pyerfa, the reference for the frames tests.

Usage: uv run --with pyerfa --with numpy python scripts/frameFixtures.py <section> [args]

Sections: dtdb (later tasks add earth, ephemeris, moon).
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


SECTIONS = {"dtdb": dtdb}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in SECTIONS:
        sys.exit(f"usage: frameFixtures.py <{'|'.join(SECTIONS)}> [args]")
    SECTIONS[sys.argv[1]](*sys.argv[2:])
