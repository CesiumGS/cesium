// resolveUri (CS-966): the base's query (ion's `?v=`, a signed link, a key)
// reaches only URLs on the base's own origin. An origin is the URL
// standard's tuple of scheme, host and port, after the URL parser has
// normalized them (case, default ports, punycode). Every key here is a fake.
import { describe, expect, it } from "vitest";
import { resolveUri } from "../packages/core/src/io/resolveUri.ts";

const BASE = "https://tiles.test/t/tileset.json?key=K&session=S&sig=X";

describe("resolveUri: the base's query", () => {
  it("a relative URL resolves against the base and keeps its query", () => {
    expect(resolveUri("a.b3dm", BASE)).toBe(
      "https://tiles.test/t/a.b3dm?key=K&session=S&sig=X",
    );
    expect(resolveUri("../up/a.b3dm", BASE)).toBe(
      "https://tiles.test/up/a.b3dm?key=K&session=S&sig=X",
    );
    expect(resolveUri("/root/a.b3dm", BASE)).toBe(
      "https://tiles.test/root/a.b3dm?key=K&session=S&sig=X",
    );
  });

  it("a URL's own parameters win; the base fills in the missing ones", () => {
    expect(resolveUri("a.b3dm?v=2&key=own", BASE)).toBe(
      "https://tiles.test/t/a.b3dm?v=2&key=own&session=S&sig=X",
    );
    expect(resolveUri("a.b3dm?key=K&session=S&sig=X", BASE)).toBe(
      "https://tiles.test/t/a.b3dm?key=K&session=S&sig=X",
    );
  });

  it("an absolute URL on the base's origin keeps the query, after normalization", () => {
    for (const uri of [
      "https://tiles.test/other/a.b3dm",
      "HTTPS://TILES.test/other/a.b3dm",
      "https://tiles.test:443/other/a.b3dm",
    ]) {
      expect(resolveUri(uri, BASE)).toBe(
        "https://tiles.test/other/a.b3dm?key=K&session=S&sig=X",
      );
    }
    expect(
      resolveUri(
        "http://tiles.test:8080/a.b3dm",
        "http://tiles.test:8080/t.json?k=1",
      ),
    ).toBe("http://tiles.test:8080/a.b3dm?k=1");
  });

  it("an absolute URL on another origin gets no part of the base's query", () => {
    for (const uri of [
      "https://other.test/a.bin",
      "https://other.test/a.bin?own=1",
      // Another scheme, another port, another host under the same domain.
      "http://tiles.test/a.bin",
      "https://tiles.test:8443/a.bin",
      "https://evil.tiles.test/a.bin",
      "wss://tiles.test/a.bin",
    ]) {
      const resolved = resolveUri(uri, BASE);
      expect(resolved).toBe(new URL(uri).href);
      const params = new URL(resolved).searchParams;
      for (const name of ["key", "session", "sig"]) {
        expect(params.has(name)).toBe(false);
      }
    }
  });

  it("a protocol-relative URL is judged by where it resolves", () => {
    expect(resolveUri("//other.test/a.bin", BASE)).toBe(
      "https://other.test/a.bin",
    );
    expect(resolveUri("//tiles.test/a.bin", BASE)).toBe(
      "https://tiles.test/a.bin?key=K&session=S&sig=X",
    );
    // The URL parser reads a backslash as a slash in http(s) URLs.
    expect(resolveUri("/\\other.test/a.bin", BASE)).toBe(
      "https://other.test/a.bin",
    );
    expect(resolveUri("\\\\other.test/a.bin", BASE)).toBe(
      "https://other.test/a.bin",
    );
  });

  it("a data: or blob: URL is returned as it is, with nothing added", () => {
    const data = "data:application/octet-stream;base64,AAECAw==";
    expect(resolveUri(data, BASE)).toBe(data);
    // A blob URL's origin is its creator's; still, it isn't a request to a
    // server, and a query would change what it names.
    const blob = "blob:https://tiles.test/0f8c1c2e-3b8a-4d8e-9d55-3c1e5d6f7a80";
    expect(resolveUri(blob, BASE)).toBe(blob);
  });

  it("a base with no query adds nothing, and a base with an opaque origin shares its query with no one", () => {
    expect(
      resolveUri("https://other.test/a.bin", "https://tiles.test/t.json"),
    ).toBe("https://other.test/a.bin");
    expect(resolveUri("a.bin", "file:///data/t/tileset.json?v=1")).toBe(
      "file:///data/t/a.bin?v=1",
    );
    expect(
      resolveUri("https://tiles.test/a.bin", "file:///data/t/tileset.json?v=1"),
    ).toBe("https://tiles.test/a.bin");
  });

  it("alternating bases (the parse cache) never carries one base's query to another", () => {
    const other = "https://other.test/x/tileset.json?token=T";
    expect(resolveUri("https://other.test/a.bin", BASE)).toBe(
      "https://other.test/a.bin",
    );
    expect(resolveUri("https://other.test/a.bin", other)).toBe(
      "https://other.test/a.bin?token=T",
    );
    expect(resolveUri("https://tiles.test/a.bin", other)).toBe(
      "https://tiles.test/a.bin",
    );
    expect(resolveUri("https://tiles.test/a.bin", BASE)).toBe(
      "https://tiles.test/a.bin?key=K&session=S&sig=X",
    );
  });
});
