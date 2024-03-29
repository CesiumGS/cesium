import { clone, I3SSymbology } from "../../index.js";

describe("Scene/I3SSymbology", function () {
  const defaultSymbol = {
    symbolLayers: [
      {
        type: "Fill",
        edges: {
          color: [255, 255, 255],
          transparency: 0,
        },
        material: {
          colorMixMode: "replace",
          color: [0, 0, 0],
          transparency: 10,
        },
      },
    ],
  };

  const simpleSymbologyData = {
    data: {
      drawingInfo: {
        renderer: {
          type: "simple",
          symbol: defaultSymbol,
        },
      },
    },
  };

  const uniqueValueInfosSymbologyData = {
    data: {
      drawingInfo: {
        renderer: {
          type: "uniqueValue",
          defaultSymbol: defaultSymbol,
          field1: "c",
          uniqueValueInfos: [
            {
              value: "c1",
              symbol: {
                symbolLayers: [
                  {
                    type: "Fill",
                    edges: {
                      color: [255, 255, 255, 255],
                    },
                  },
                ],
              },
            },
            {
              value: "c3",
              symbol: {
                symbolLayers: [
                  {
                    type: "Fill",
                    edges: {},
                    material: {
                      colorMixMode: "replace",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  };

  const uniqueValueGroupsSymbologyData = {
    data: {
      drawingInfo: {
        renderer: {
          type: "uniqueValue",
          defaultSymbol: defaultSymbol,
          field1: "a",
          field2: "c",
          field3: "b",
          uniqueValueGroups: [
            {
              classes: [
                {
                  values: [
                    [10, "c1", "b2"],
                    [15, "c2", "b2"],
                  ],
                  symbol: {
                    symbolLayers: [
                      {
                        type: "Fill",
                        edges: {
                          color: [0, 0, 0],
                        },
                      },
                    ],
                  },
                },
                {
                  values: [[30, "c3", "b3"]],
                  symbol: {
                    symbolLayers: [
                      {
                        type: "Fill",
                        edges: {
                          color: [0, 0, 0, 0],
                        },
                      },
                    ],
                  },
                },
              ],
            },
            {
              classes: [
                {
                  values: [[10, "c1", "b1"]],
                  symbol: {
                    symbolLayers: [
                      {
                        type: "Fill",
                        material: {
                          color: [0, 0, 0, 102],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    },
  };

  const classBreaksSymbologyData = {
    data: {
      drawingInfo: {
        renderer: {
          type: "classBreaks",
          defaultSymbol: defaultSymbol,
          field: "a",
          minValue: 12,
          classBreakInfos: [
            {
              classMaxValue: 15,
              symbol: {
                symbolLayers: [
                  {
                    type: "Fill",
                    outline: {
                      color: [0, 0, 0, 255],
                    },
                  },
                ],
              },
            },
            {
              classMinValue: 20,
              classMaxValue: 25,
              symbol: {
                symbolLayers: [
                  {
                    type: "Fill",
                    outline: {},
                  },
                ],
              },
            },
            {
              classMinValue: 25,
              classMaxValue: 26,
              symbol: {
                symbolLayers: [
                  {
                    type: "Fill",
                    outline: {
                      color: [0, 255, 0, 255],
                    },
                  },
                ],
              },
            },
            {
              classMaxValue: 12,
              symbol: {
                symbolLayers: [
                  {
                    type: "Fill",
                    outline: {
                      color: [0, 0, 255, 255],
                    },
                  },
                ],
              },
            },
            {
              classMinValue: 17,
              symbol: {
                symbolLayers: [
                  {
                    type: "Fill",
                    outline: {
                      color: [255, 0, 0, 255],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  };

  const nodeData = {
    loadField: function (n) {
      return Promise.resolve();
    },
    fields: {
      a: {
        values: [10, 15, 30],
      },
      b: {
        values: ["b1", "b2", "b3", "b4"],
      },
      c: {
        values: ["c1", "c2"],
      },
    },
  };

  it("get simple symbology", async function () {
    const symbology = new I3SSymbology(simpleSymbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
  });

  it("symbology without drawing info", async function () {
    const symbology = new I3SSymbology({
      data: {},
    });
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeUndefined();

    expect(data).toBeDefined();
    expect(data.default).toBeUndefined();
  });

  it("symbology without renderer", async function () {
    const symbologyData = clone(simpleSymbologyData, true);
    symbologyData.data.drawingInfo = {};
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeUndefined();

    expect(data).toBeDefined();
    expect(data.default).toBeUndefined();
  });

  it("symbology with unsupported renderer", async function () {
    const symbologyData = clone(simpleSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.type = "unsupported";
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeUndefined();

    expect(data).toBeDefined();
    expect(data.default).toBeUndefined();
  });

  it("symbology without symbol", async function () {
    const symbologyData = clone(simpleSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.symbol = undefined;
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeUndefined();
    expect(symbology.defaultSymbology.material).toBeUndefined();

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeUndefined();
    expect(data.default.material).toBeUndefined();
  });

  it("symbology without symbol layers", async function () {
    const symbologyData = clone(simpleSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.symbol = {};
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeUndefined();
    expect(symbology.defaultSymbology.material).toBeUndefined();

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeUndefined();
    expect(data.default.material).toBeUndefined();
  });

  it("symbology with emtpy symbol layers", async function () {
    const symbologyData = clone(simpleSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.symbol.symbolLayers = [];
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeUndefined();
    expect(symbology.defaultSymbology.material).toBeUndefined();

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeUndefined();
    expect(data.default.material).toBeUndefined();
  });

  it("symbology with unsupported symbol layer", async function () {
    const symbologyData = clone(simpleSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.symbol.symbolLayers[0].type =
      "unsupported";
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeUndefined();
    expect(symbology.defaultSymbology.material).toBeUndefined();

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeUndefined();
    expect(data.default.material).toBeUndefined();
  });

  it("symbology with empty cached drawing info", async function () {
    const symbologyData = clone(simpleSymbologyData, true);
    symbologyData.data.cachedDrawingInfo = {};
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
  });

  it("symbology with cached drawing info for color", async function () {
    const symbologyData = clone(simpleSymbologyData, true);
    symbologyData.data.cachedDrawingInfo = {
      color: true,
    };
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeUndefined();

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeUndefined();
  });

  it("get unique values symbology by info", async function () {
    const symbology = new I3SSymbology(uniqueValueInfosSymbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
    expect(data[0]).toBeDefined();
    expect(data[0].edges).toBeDefined();
    expect(data[0].edges.color).toEqual([1, 1, 1, 1]);
    expect(data[0].material).toBeUndefined();
    expect(data[1]).toBeUndefined();
    expect(data[2]).toBeUndefined();
  });

  it("get unique values symbology without values", async function () {
    const symbologyData = clone(uniqueValueInfosSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.uniqueValueInfos = undefined;
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
    expect(data[0]).toBeUndefined();
    expect(data[1]).toBeUndefined();
    expect(data[2]).toBeUndefined();
  });

  it("get unique values symbology by group", async function () {
    const symbology = new I3SSymbology(uniqueValueGroupsSymbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
    expect(data[0]).toBeDefined();
    expect(data[0].material).toBeDefined();
    expect(data[0].material.colorMixMode).toBeUndefined();
    expect(data[0].material.color).toEqual([0, 0, 0, 0.4]);
    expect(data[1]).toBeDefined();
    expect(data[1].edges).toBeDefined();
    expect(data[1].edges.color).toEqual([0, 0, 0, 1]);
    expect(data[1].material).toBeUndefined();
    expect(data[2]).toBeUndefined();
  });

  it("get unique values symbology without classes", async function () {
    const symbologyData = clone(uniqueValueGroupsSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.uniqueValueGroups = [{}];
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
    expect(data[0]).toBeUndefined();
    expect(data[1]).toBeUndefined();
    expect(data[2]).toBeUndefined();
  });

  it("get class breaks symbology", async function () {
    const symbology = new I3SSymbology(classBreaksSymbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
    expect(data[0]).toBeUndefined();
    expect(data[1]).toBeDefined();
    expect(data[1].edges).toBeDefined();
    expect(data[1].edges.color).toEqual([0, 0, 0, 1]);
    expect(data[1].material).toBeUndefined();
    expect(data[2]).toBeUndefined();
  });

  it("get class breaks symbology without min value", async function () {
    const symbologyData = clone(classBreaksSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.minValue = undefined;
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
    expect(data[0]).toBeDefined();
    expect(data[0].edges).toBeDefined();
    expect(data[0].edges.color).toEqual([0, 0, 1, 1]);
    expect(data[1].material).toBeUndefined();
    expect(data[1]).toBeDefined();
    expect(data[1].edges).toBeDefined();
    expect(data[1].edges.color).toEqual([0, 0, 0, 1]);
    expect(data[1].material).toBeUndefined();
    expect(data[2]).toBeUndefined();
  });

  it("get class breaks symbology without infos", async function () {
    const symbologyData = clone(classBreaksSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.classBreakInfos = undefined;
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
    expect(data[0]).toBeUndefined();
    expect(data[1]).toBeUndefined();
    expect(data[2]).toBeUndefined();
  });

  it("get class breaks symbology with empty infos", async function () {
    const symbologyData = clone(classBreaksSymbologyData, true);
    symbologyData.data.drawingInfo.renderer.classBreakInfos = [];
    symbologyData.data.drawingInfo.renderer.minValue = undefined;
    const symbology = new I3SSymbology(symbologyData);
    const data = await symbology._getSymbology(nodeData);

    expect(symbology.defaultSymbology).toBeDefined();
    expect(symbology.defaultSymbology.edges).toBeDefined();
    expect(symbology.defaultSymbology.edges.color).toEqual([1, 1, 1, 1]);
    expect(symbology.defaultSymbology.material).toBeDefined();
    expect(symbology.defaultSymbology.material.colorMixMode).toEqual("replace");
    expect(symbology.defaultSymbology.material.color).toEqual([0, 0, 0, 0.9]);

    expect(data).toBeDefined();
    expect(data.default).toBeDefined();
    expect(data.default.edges).toBeDefined();
    expect(data.default.edges.color).toEqual([1, 1, 1, 1]);
    expect(data.default.material).toBeDefined();
    expect(data.default.material.colorMixMode).toEqual("replace");
    expect(data.default.material.color).toEqual([0, 0, 0, 0.9]);
    expect(data[0]).toBeUndefined();
    expect(data[1]).toBeUndefined();
    expect(data[2]).toBeUndefined();
  });
});
