// What a pack is built from. Each source has its URL, SHA-256, size, credit
// and `terms`: what its page says, with the date it was read (2026-11-08;
// re-read before relying on it). A recipe never sets `distributable` to
// true and never writes a clearance: a person edits the manifest after
// review. There is no recipe for raw Hipparcos or Gaia files (§13.29).

/** The default recipe: NASA's deep star map layers, and HYG v4.1 for the bright end. */
export const RECIPES = {
  "svs4851-hyg41": {
    id: "svs4851-hyg41",
    name: "NASA SVS 4851 layers with HYG v4.1",
    distributable: false,
    sources: [
      {
        id: "points",
        file: "hiptyc_2020_8k.exr",
        name: "NASA SVS 4851, bright-star layer (hiptyc_2020_8k)",
        url: "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/hiptyc_2020_8k.exr",
        sha256:
          "b8ba8adb3ebe8a7d5331bc2aa2fbb930666c993d71da7d831a869c2b2074cd7f",
        bytes: 50588860,
        credit:
          "NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC",
        terms:
          'Page read 2026-11-08: it asks for that credit and lists Hipparcos-2, Tycho-2 and Gaia Data Release 2 among its data sets. It says it does not store the data sets themselves. The site\'s help page says its content is in the public domain "unless otherwise noted".',
      },
      {
        id: "background",
        file: "milkyway_2020_8k.exr",
        name: "NASA SVS 4851, Milky Way layer (milkyway_2020_8k)",
        url: "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_8k.exr",
        sha256:
          "361d1961647af073b3b3e4aea4fca85f15b3c9d915e0c8c4befb02520dadd10a",
        bytes: 137307727,
        credit:
          "NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC",
        terms: "The same page and date as the bright-star layer.",
      },
      {
        id: "catalog",
        file: "hygdata_v41.csv",
        name: "HYG database v4.1",
        url: "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv",
        sha256:
          "d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd",
        bytes: 33932548,
        credit:
          "HYG database v4.1, astronexus (Hipparcos, Yale Bright Star 5th, Gliese 3rd)",
        terms:
          'Repository page read 2026-11-08: it says "Creative Commons Attribution-ShareAlike 4.0 International License" and names Hipparcos, Yale Bright Star Catalogue 5th edition and Gliese 3rd edition as its sources.',
      },
    ],
    credits: [
      "NASA/Goddard Space Flight Center Scientific Visualization Studio",
      "Gaia DR2: ESA/Gaia/DPAC",
      "HYG database v4.1 (astronexus)",
    ],
    modelled: [
      "Magnitudes of stars fainter than 7 come from a curve fitted against the catalog's magnitudes, not measured.",
      "The background's absolute level rests on one fitted constant and on half of the layer being taken as the star map's share.",
      "The background holds faint stars; zodiacal light is not in it.",
    ],
  },
};

export const DEFAULT_RECIPE = "svs4851-hyg41";
