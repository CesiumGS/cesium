import { BingMapsStyle } from "../index.js";

export default function (mapStyle) {
  let stylePrefix = "a";
  switch (mapStyle) {
    case BingMapsStyle.AERIAL_WITH_LABELS:
      stylePrefix = "h";
      break;
    case BingMapsStyle.ROAD:
      stylePrefix = "r";
      break;
  }
  return {
    authenticationResultCode: "ValidCredentials",
    brandLogoUri: "http://dev.virtualearth.net/Branding/logo_powered_by.png",
    copyright:
      "Copyright © 2014 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.",
    resourceSets: [
      {
        estimatedTotal: 1,
        resources: [
          {
            __type:
              "ImageryMetadata:http://schemas.microsoft.com/search/local/ws/rest/v1",
            imageHeight: 256,
            imageUrl: `http://ecn.{subdomain}.tiles.virtualearth.net.fake.invalid/tiles/${stylePrefix}{quadkey}.jpeg?g=3031&mkt={culture}`,
            imageUrlSubdomains: ["t0", "t1", "t2", "t3"],
            imageWidth: 256,
            imageryProviders: [
              {
                attribution: "© 2014 DigitalGlobe",
                coverageAreas: [
                  {
                    bbox: [-67, -179.99, 27, 0],
                    zoomMax: 21,
                    zoomMin: 14,
                  },
                  {
                    bbox: [27, -179.99, 87, -126.5],
                    zoomMax: 21,
                    zoomMin: 14,
                  },
                  {
                    bbox: [48.4, -126.5, 87, -5.75],
                    zoomMax: 21,
                    zoomMin: 14,
                  },
                ],
              },
              {
                attribution: "Image courtesy of NASA",
                coverageAreas: [
                  {
                    bbox: [-90, -180, 90, 180],
                    zoomMax: 8,
                    zoomMin: 1,
                  },
                ],
              },
            ],
            vintageEnd: null,
            vintageStart: null,
            zoomMax: 21,
            zoomMin: 1,
          },
        ],
      },
    ],
    statusCode: 200,
    statusDescription: "OK",
    traceId: "ea754a48ccdb4dd297c8f35350e0f0d9|BN20130533|02.00.106.1600|",
  };
}
