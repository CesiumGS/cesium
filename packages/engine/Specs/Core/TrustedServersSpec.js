import { TrustedServers } from "../../Source/Cesium.js";

describe("Core/TrustedServers", function () {
  afterEach(function () {
    TrustedServers.clear();
  });

  it("add without argument throws", function () {
    expect(function () {
      TrustedServers.add();
    }).toThrowDeveloperError();
  });

  it("remove without argument throws", function () {
    expect(function () {
      TrustedServers.remove();
    }).toThrowDeveloperError();
  });

  it("isTrusted without argument throws", function () {
    expect(function () {
      TrustedServers.contains();
    }).toThrowDeveloperError();
  });

  it("http without a port", function () {
    TrustedServers.add("cesiumjs.org", 80);
    expect(TrustedServers.contains("http://cesiumjs.org/index.html")).toBe(
      true
    );
    expect(TrustedServers.contains("https://cesiumjs.org/index.html")).toBe(
      false
    );
  });

  it("https without a port", function () {
    TrustedServers.add("cesiumjs.org", 443);
    expect(TrustedServers.contains("https://cesiumjs.org/index.html")).toBe(
      true
    );
    expect(TrustedServers.contains("http://cesiumjs.org/index.html")).toBe(
      false
    );
  });

  it("add", function () {
    expect(TrustedServers.contains("http://cesiumjs.org:81/index.html")).toBe(
      false
    );
    TrustedServers.add("cesiumjs.org", 81);
    expect(TrustedServers.contains("http://cesiumjs.org/index.html")).toBe(
      false
    );
    expect(TrustedServers.contains("http://cesiumjs.org:81/index.html")).toBe(
      true
    );
  });

  it("remove", function () {
    TrustedServers.add("cesiumjs.org", 81);
    expect(TrustedServers.contains("http://cesiumjs.org:81/index.html")).toBe(
      true
    );
    TrustedServers.remove("cesiumjs.org", 8080);
    expect(TrustedServers.contains("http://cesiumjs.org:81/index.html")).toBe(
      true
    );
    TrustedServers.remove("cesiumjs.org", 81);
    expect(TrustedServers.contains("http://cesiumjs.org:81/index.html")).toBe(
      false
    );
  });

  it("handles username/password credentials", function () {
    TrustedServers.add("cesiumjs.org", 81);
    expect(
      TrustedServers.contains("http://user:pass@cesiumjs.org:81/index.html")
    ).toBe(true);
  });

  it("always returns false for relative paths", function () {
    expect(TrustedServers.contains("./data/index.html")).toBe(false);
  });

  it("handles protocol relative URLs", function () {
    TrustedServers.add("cesiumjs.org", 80);
    expect(TrustedServers.contains("//cesiumjs.org/index.html")).toBe(true);
  });

  it("clear", function () {
    TrustedServers.add("cesiumjs.org", 80);
    expect(TrustedServers.contains("http://cesiumjs.org/index.html")).toBe(
      true
    );
    TrustedServers.clear();
    expect(TrustedServers.contains("http://cesiumjs.org/index.html")).toBe(
      false
    );
    TrustedServers.add("cesiumjs.org", 80);
    expect(TrustedServers.contains("http://cesiumjs.org/index.html")).toBe(
      true
    );
  });
});
