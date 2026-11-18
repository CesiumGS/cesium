import {
  GeometryAttributeDescriptor,
  GeometryReader,
  GeometryWriter,
  VertexAttributeSemantic,
} from "../../index.js";

describe("Scene/GeometryWriter", function () {
  const position = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.POSITION,
  });
  const normal = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.NORMAL,
  });

  let session;
  let createWriteSession;
  let reader;
  let writer;

  beforeEach(function () {
    session = jasmine.createSpyObj("session", [
      "vertexCount",
      "commit",
      "destroy",
    ]);
    session.vertexCount.and.returnValue(3);
    createWriteSession = jasmine
      .createSpy("createWriteSession")
      .and.returnValue(session);
    reader = new GeometryReader({
      availableAttributes: [position],
      createReadSession: jasmine.createSpy("createReadSession"),
    });
    writer = new GeometryWriter({ reader, createWriteSession });
  });

  it("throws without options", function () {
    expect(function () {
      return new GeometryWriter();
    }).toThrowDeveloperError();
  });

  it("throws without a reader", function () {
    expect(function () {
      return new GeometryWriter({ createWriteSession });
    }).toThrowDeveloperError();
  });

  it("throws without createWriteSession", function () {
    expect(function () {
      return new GeometryWriter({ reader });
    }).toThrowDeveloperError();
  });

  it("withWriteSession creates a session for the requested data", function () {
    writer.withWriteSession(
      { attributes: [position], primitives: true },
      function () {},
    );
    expect(createWriteSession).toHaveBeenCalledWith({
      attributes: [position],
      primitives: true,
    });
  });

  it("withWriteSession returns the callback's value", function () {
    const vertexCount = writer.withWriteSession(
      { attributes: [position] },
      function (s) {
        expect(s).toBe(session);
        return s.vertexCount();
      },
    );
    expect(vertexCount).toBe(3);
  });

  it("withWriteSession commits, then destroys the session after the callback", function () {
    writer.withWriteSession({ attributes: [position] }, function () {
      expect(session.commit).not.toHaveBeenCalled();
      expect(session.destroy).not.toHaveBeenCalled();
    });
    expect(session.commit).toHaveBeenCalledTimes(1);
    expect(session.destroy).toHaveBeenCalledTimes(1);
    expect(session.commit).toHaveBeenCalledBefore(session.destroy);
  });

  it("withWriteSession destroys the session without committing if the callback throws", function () {
    expect(function () {
      writer.withWriteSession({ attributes: [position] }, function () {
        throw new Error("Callback failed.");
      });
    }).toThrowError("Callback failed.");
    expect(session.commit).not.toHaveBeenCalled();
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it("withWriteSession validates the requested data with the reader", function () {
    expect(function () {
      writer.withWriteSession({ attributes: [normal] }, function () {});
    }).toThrowDeveloperError();
    expect(createWriteSession).not.toHaveBeenCalled();
  });

  it("withWriteSession throws without options", function () {
    expect(function () {
      writer.withWriteSession(undefined, function () {});
    }).toThrowDeveloperError();
  });

  it("withWriteSession throws without a callback", function () {
    expect(function () {
      writer.withWriteSession({ attributes: [position] });
    }).toThrowDeveloperError();
  });
});
