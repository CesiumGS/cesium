import { Placeholder } from "../index.js";

describe("Placeholder", function () {
  it("value is true", function () {
    expect(new Placeholder().value).toBe(true);
  });
});
