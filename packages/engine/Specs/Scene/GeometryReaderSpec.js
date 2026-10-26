import { AttributeType } from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  GeometryReader,
  VertexAttributeSemantic,
} from "../../index.js";

describe("Scene/GeometryReader", function () {
  const position = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.POSITION,
  });
  const normal = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.NORMAL,
  });
  const temperature = new GeometryAttributeDescriptor({
    semantic: "_TEMPERATURE",
    type: AttributeType.SCALAR,
  });

  let session;
  let createReadSession;
  let reader;

  beforeEach(function () {
    session = jasmine.createSpyObj("session", ["vertexCount", "destroy"]);
    session.vertexCount.and.returnValue(3);
    createReadSession = jasmine
      .createSpy("createReadSession")
      .and.returnValue(session);
    reader = new GeometryReader({
      availableAttributes: [position, temperature],
      createReadSession,
    });
  });

  it("throws without options", function () {
    expect(function () {
      return new GeometryReader();
    }).toThrowDeveloperError();
  });

  it("throws without available attributes", function () {
    expect(function () {
      return new GeometryReader({ createReadSession });
    }).toThrowDeveloperError();
  });

  it("throws without createReadSession", function () {
    expect(function () {
      return new GeometryReader({ availableAttributes: [] });
    }).toThrowDeveloperError();
  });

  it("gets the available attributes", function () {
    const available = reader.getAvailableAttributes();
    expect(available).toEqual([position, temperature]);

    available.length = 0;
    expect(reader.getAvailableAttributes().length).toBe(2);
  });

  it("isn't affected by changes to the array it was created with", function () {
    const attributes = [position];
    const reader = new GeometryReader({
      availableAttributes: attributes,
      createReadSession,
    });
    attributes.push(normal);
    expect(reader.hasAttribute(normal)).toBe(false);
  });

  it("hasAttribute compares descriptors by value", function () {
    expect(
      reader.hasAttribute(
        new GeometryAttributeDescriptor({
          semantic: VertexAttributeSemantic.POSITION,
        }),
      ),
    ).toBe(true);
    expect(reader.hasAttribute(normal)).toBe(false);
  });

  it("withReadSession creates a session for the requested data", function () {
    reader.withReadSession(
      { attributes: [position], primitives: true },
      function () {},
    );
    expect(createReadSession).toHaveBeenCalledWith({
      attributes: [position],
      primitives: true,
    });
  });

  it("withReadSession requests no attributes or primitives by default", function () {
    reader.withReadSession({}, function () {});
    expect(createReadSession).toHaveBeenCalledWith({
      attributes: [],
      primitives: false,
    });
  });

  it("withReadSession returns the callback's value", function () {
    const options = { attributes: [position] };
    const vertexCount = reader.withReadSession(options, function (s) {
      expect(s).toBe(session);
      return s.vertexCount();
    });
    expect(vertexCount).toBe(3);
  });

  it("withReadSession destroys the session after the callback", function () {
    reader.withReadSession({ attributes: [position] }, function () {
      expect(session.destroy).not.toHaveBeenCalled();
    });
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it("withReadSession destroys the session if the callback throws", function () {
    expect(function () {
      reader.withReadSession({ attributes: [position] }, function () {
        throw new Error("Callback failed.");
      });
    }).toThrowError("Callback failed.");
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it("withReadSession throws if an attribute isn't available", function () {
    expect(function () {
      reader.withReadSession({ attributes: [normal] }, function () {});
    }).toThrowDeveloperError();
    expect(createReadSession).not.toHaveBeenCalled();
  });

  it("withReadSession throws if an attribute's type doesn't match", function () {
    const temperatureVector = new GeometryAttributeDescriptor({
      semantic: "_TEMPERATURE",
      type: AttributeType.VEC3,
    });
    expect(function () {
      reader.withReadSession(
        { attributes: [temperatureVector] },
        function () {},
      );
    }).toThrowDeveloperError();
    expect(createReadSession).not.toHaveBeenCalled();
  });

  it("withReadSession throws without options", function () {
    expect(function () {
      reader.withReadSession(undefined, function () {});
    }).toThrowDeveloperError();
  });

  it("withReadSession throws without a callback", function () {
    expect(function () {
      reader.withReadSession({ attributes: [position] });
    }).toThrowDeveloperError();
  });
});
