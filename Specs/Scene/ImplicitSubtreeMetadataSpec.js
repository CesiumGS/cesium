import { MetadataClass, ImplicitSubtreeMetadata } from "../../Source/Cesium.js";

describe("Scene/ImplicitSubtreeMetadata", function () {
  it("creates subtree metadata with default values", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {},
    });

    expect(subtreeMetadata.extras).toBeUndefined();
    expect(subtreeMetadata.extensions).toBeUndefined();
  });

  it("creates subtree metadata", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "ARRAY",
            componentType: "STRING",
          },
        },
      },
    });

    const extras = {
      other: 0,
    };

    const extensions = {
      EXT_other_extension: {},
    };

    const properties = {
      credits: ["A", "B", "C"],
    };

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        class: "subtree",
        properties: properties,
        extensions: extensions,
        extras: extras,
      },
    });

    expect(subtreeMetadata.class).toBe(subtreeClass);
    expect(subtreeMetadata.extras).toBe(extras);
    expect(subtreeMetadata.extensions).toBe(extensions);
    expect(subtreeMetadata.getProperty("credits")).toEqual(properties.credits);
  });

  it("constructor throws without subtree", function () {
    expect(function () {
      return new ImplicitSubtreeMetadata();
    }).toThrowDeveloperError();
  });

  it("constructor throws without class", function () {
    expect(function () {
      return new ImplicitSubtreeMetadata({
        subtree: {},
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty returns false when there's no properties", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });
    expect(subtreeMetadata.hasProperty("color")).toBe(false);
  });

  it("hasProperty returns false when there's no property with the given property ID", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "ARRAY",
            componentType: "STRING",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          credits: ["A", "B", "C"],
        },
      },
    });
    expect(subtreeMetadata.hasProperty("color")).toBe(false);
  });

  it("hasProperty returns true when there's a property with the given property ID", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "ARRAY",
            componentType: "STRING",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          credits: ["A", "B", "C"],
        },
      },
    });
    expect(subtreeMetadata.hasProperty("credits")).toBe(true);
  });

  it("hasProperty returns true when the class has a default value for a missing property", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "ARRAY",
            componentType: "STRING",
            optional: true,
            default: [],
          },
        },
      },
    });
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {},
    });

    expect(subtreeMetadata.hasProperty("credits")).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.hasProperty();
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns false when there's no property with the given semantic", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "ARRAY",
            componentType: "STRING",
            semantic: "CREDITS",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          credits: ["A", "B", "C"],
        },
      },
    });
    expect(subtreeMetadata.hasPropertyBySemantic("AUTHOR")).toBe(false);
  });

  it("hasPropertyBySemantic returns true when there's a property with the given semantic", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "ARRAY",
            componentType: "STRING",
            semantic: "CREDITS",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          credits: ["A", "B", "C"],
        },
      },
    });
    expect(subtreeMetadata.hasPropertyBySemantic("CREDITS")).toBe(true);
  });

  it("hasPropertyBySemantic returns true when the class has a default value for a missing property", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "ARRAY",
            componentType: "STRING",
            semantic: "CREDITS",
            default: [],
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {},
    });

    expect(subtreeMetadata.hasPropertyBySemantic("CREDITS")).toBe(true);
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.hasPropertyBySemantic(undefined);
    }).toThrowDeveloperError();
  });

  it("getPropertyIds returns empty array when there are no properties", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    expect(subtreeMetadata.getPropertyIds().length).toBe(0);
  });

  it("getPropertyIds returns array of property IDs", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
          },
          date: {
            componentType: "STRING",
          },
          credits: {
            type: "ARRAY",
            componentType: "STRING",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "Cesium",
          date: "2022-02-10",
          credits: ["A", "B", "C"],
        },
      },
    });

    expect(subtreeMetadata.getPropertyIds().sort()).toEqual([
      "author",
      "credits",
      "date",
    ]);
  });

  it("getPropertyIds includes properties with default values", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
          },
          date: {
            componentType: "STRING",
          },
          credits: {
            type: "ARRAY",
            componentType: "STRING",
            optional: true,
            default: [],
          },
        },
      },
    });
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "Cesium",
          date: "2022-02-10",
        },
      },
    });

    expect(subtreeMetadata.getPropertyIds().sort()).toEqual([
      "author",
      "credits",
      "date",
    ]);
  });

  it("getPropertyIds uses results argument", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
          },
          date: {
            componentType: "STRING",
          },
          credits: {
            type: "ARRAY",
            componentType: "STRING",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "Cesium",
          date: "2022-02-10",
          credits: ["A", "B", "C"],
        },
      },
    });

    const results = [];
    const returnedResults = subtreeMetadata.getPropertyIds(results);

    expect(results).toBe(returnedResults);
    expect(results.sort()).toEqual(["author", "credits", "date"]);
  });

  it("getProperty returns undefined when there's no properties", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });
    expect(subtreeMetadata.getProperty("author")).toBeUndefined();
  });

  it("getProperty returns undefined when there's no property with the given property ID", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "Cesium",
        },
      },
    });
    expect(subtreeMetadata.getProperty("credits")).toBeUndefined();
  });

  it("getProperty returns the property value", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
          },
        },
      },
    });

    const author = "Cesium";
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: author,
        },
      },
    });

    const value = subtreeMetadata.getProperty("author");
    expect(value).toEqual(author);
  });

  it("getProperty returns the default value when the property is missing", function () {
    const defaultAuthor = "none";
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
            optional: true,
            default: defaultAuthor,
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {},
    });

    const value = subtreeMetadata.getProperty("author");
    expect(value).toEqual(defaultAuthor);
  });

  it("getProperty throws without propertyId", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.getProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty returns false if property doesn't exist", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    const author = "Cesium";
    expect(subtreeMetadata.setProperty("author", author)).toBe(false);
  });

  it("setProperty sets property value", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "None",
        },
      },
    });

    const author = "Cesium";
    expect(subtreeMetadata.setProperty("author", author)).toBe(true);
    expect(subtreeMetadata.getProperty("author")).toEqual(author);
  });

  it("setProperty throws without propertyId", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.setProperty();
    }).toThrowDeveloperError();
  });

  it("setProperty throws without value", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.setProperty("author");
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "Cesium",
        },
      },
    });

    expect(subtreeMetadata.getPropertyBySemantic("CREDITS")).toBeUndefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "Cesium",
        },
      },
    });

    expect(subtreeMetadata.getPropertyBySemantic("AUTHOR")).toBe("Cesium");
  });

  it("getPropertyBySemantic throws without semantic", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.getPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic sets property value", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "None",
        },
      },
    });

    const author = "Cesium";
    expect(subtreeMetadata.setPropertyBySemantic("AUTHOR", author)).toBe(true);
    expect(subtreeMetadata.getProperty("author")).toBe(author);
  });

  it("setPropertyBySemantic returns false if semantic does not exist", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "Cesium",
        },
      },
    });

    expect(subtreeMetadata.setPropertyBySemantic("CREDITS", ["A"])).toBe(false);
  });

  it("setPropertyBySemantic throws without semantic", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtree: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.setPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without value", function () {
    const subtreeClass = new MetadataClass({
      id: "subtree",
      class: {
        properties: {
          author: {
            componentType: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtree: {
        properties: {
          author: "None",
        },
      },
    });

    expect(function () {
      subtreeMetadata.setPropertyBySemantic("AUTHOR");
    }).toThrowDeveloperError();
  });
});
