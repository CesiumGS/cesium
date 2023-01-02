import { MetadataClass, ImplicitSubtreeMetadata } from "../../index.js";

describe("Scene/ImplicitSubtreeMetadata", function () {
  it("creates subtree metadata with default values", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtreeMetadata: {},
      class: {},
    });

    expect(subtreeMetadata.extras).toBeUndefined();
    expect(subtreeMetadata.extensions).toBeUndefined();
  });

  it("creates subtree metadata", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "STRING",
            array: true,
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
      subtreeMetadata: {
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
        subtreeMetadata: {},
      });
    }).toThrowDeveloperError();
  });

  it("hasProperty throws when there's no property with the given property ID", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "STRING",
            array: true,
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
        properties: {
          credits: ["A", "B", "C"],
        },
      },
    });
    expect(function () {
      return subtreeMetadata.getProperty("color");
    }).toThrowDeveloperError();
  });

  it("hasProperty returns true when there's a property with the given property ID", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "STRING",
            array: true,
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
        properties: {
          credits: ["A", "B", "C"],
        },
      },
    });
    expect(subtreeMetadata.hasProperty("credits")).toBe(true);
  });

  it("hasProperty returns true when the class has a default value for a missing property", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "STRING",
            array: true,
            required: false,
            default: [],
          },
        },
      },
    });
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {},
    });

    expect(subtreeMetadata.hasProperty("credits")).toBe(true);
  });

  it("hasProperty throws without propertyId", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtreeMetadata: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.hasProperty();
    }).toThrowDeveloperError();
  });

  it("hasPropertyBySemantic returns false when there's no property with the given semantic", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "STRING",
            array: true,
            semantic: "CREDITS",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
        properties: {
          credits: ["A", "B", "C"],
        },
      },
    });
    expect(subtreeMetadata.hasPropertyBySemantic("AUTHOR")).toBe(false);
  });

  it("hasPropertyBySemantic returns true when there's a property with the given semantic", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "STRING",
            array: true,
            semantic: "CREDITS",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
        properties: {
          credits: ["A", "B", "C"],
        },
      },
    });
    expect(subtreeMetadata.hasPropertyBySemantic("CREDITS")).toBe(true);
  });

  it("hasPropertyBySemantic returns true when the class has a default value for a missing property", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          credits: {
            type: "STRING",
            array: true,
            semantic: "CREDITS",
            default: [],
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {},
    });

    expect(subtreeMetadata.hasPropertyBySemantic("CREDITS")).toBe(true);
  });

  it("hasPropertyBySemantic throws without semantic", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtreeMetadata: {},
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
      subtreeMetadata: {},
      class: {
        properties: {},
      },
    });

    expect(subtreeMetadata.getPropertyIds().length).toBe(0);
  });

  it("getPropertyIds returns array of property IDs", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
          },
          date: {
            type: "STRING",
          },
          credits: {
            type: "STRING",
            array: true,
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
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
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
          },
          date: {
            type: "STRING",
          },
          credits: {
            type: "STRING",
            array: true,
            required: false,
            default: [],
          },
        },
      },
    });
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
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
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
          },
          date: {
            type: "STRING",
          },
          credits: {
            type: "STRING",
            array: true,
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
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

  it("getProperty throws when there's no property with the given property ID", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
        properties: {
          author: "Cesium",
        },
      },
    });
    expect(function () {
      return subtreeMetadata.getProperty("credits");
    }).toThrowDeveloperError();
  });

  it("getProperty returns the property value", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
          },
        },
      },
    });

    const author = "Cesium";
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
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
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
            required: false,
            default: defaultAuthor,
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {},
    });

    const value = subtreeMetadata.getProperty("author");
    expect(value).toEqual(defaultAuthor);
  });

  it("getProperty throws without propertyId", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtreeMetadata: {},
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
      subtreeMetadata: {},
      class: {
        properties: {},
      },
    });

    const author = "Cesium";
    expect(subtreeMetadata.setProperty("author", author)).toBe(false);
  });

  it("setProperty sets property value", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
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
      subtreeMetadata: {},
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
      subtreeMetadata: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.setProperty("author");
    }).toThrowDeveloperError();
  });

  it("getPropertyBySemantic returns undefined when there's no property with the given semantic", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
        properties: {
          author: "Cesium",
        },
      },
    });

    expect(subtreeMetadata.getPropertyBySemantic("CREDITS")).toBeUndefined();
  });

  it("getPropertyBySemantic returns the property value", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
        properties: {
          author: "Cesium",
        },
      },
    });

    expect(subtreeMetadata.getPropertyBySemantic("AUTHOR")).toBe("Cesium");
  });

  it("getPropertyBySemantic throws without semantic", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtreeMetadata: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.getPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic sets property value", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
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
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
        properties: {
          author: "Cesium",
        },
      },
    });

    expect(subtreeMetadata.setPropertyBySemantic("CREDITS", ["A"])).toBe(false);
  });

  it("setPropertyBySemantic throws without semantic", function () {
    const subtreeMetadata = new ImplicitSubtreeMetadata({
      subtreeMetadata: {},
      class: {
        properties: {},
      },
    });

    expect(function () {
      subtreeMetadata.setPropertyBySemantic();
    }).toThrowDeveloperError();
  });

  it("setPropertyBySemantic throws without value", function () {
    const subtreeClass = MetadataClass.fromJson({
      id: "subtree",
      class: {
        properties: {
          author: {
            type: "STRING",
            semantic: "AUTHOR",
          },
        },
      },
    });

    const subtreeMetadata = new ImplicitSubtreeMetadata({
      class: subtreeClass,
      subtreeMetadata: {
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
