import process from "process";

const config = {
  root: ".",
  sourceUrl: "https://github.com/CesiumGS/cesium/blob/main/packages/sandcastle",
  publicDirectory: "./public",
  gallery: {
    files: ["gallery"],
    searchOptions: {
      excerptLength: 10,
      ranking: {
        termSaturation: 0.1, // Prevent repetitive code examples from dominating results
        termFrequency: 0.3, // De-emphasize term frequency
        termSimilarity: 0.85, // Fuzzier word matching
      },
    },
    defaultFilters: { labels: "Showcases" },
    defaultThumbnail: "images/placeholder-thumbnail.jpg",
    metadata: {
      legacyId: undefined,
      labels: [],
      development: false,
    },
    includeDevelopment: !process.env.PROD,
  },
};

export default config;
