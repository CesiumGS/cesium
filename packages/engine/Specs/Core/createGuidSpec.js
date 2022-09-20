import { createGuid } from "../../index.js";

describe("Core/createGuid", function () {
  it("creates GUIDs", function () {
    const isGuidRegex = /^(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}$/;

    //Create three GUIDs
    const guid1 = createGuid();
    const guid2 = createGuid();
    const guid3 = createGuid();

    //Make sure they are all unique
    expect(guid1).not.toEqual(guid2);
    expect(guid1).not.toEqual(guid3);
    expect(guid2).not.toEqual(guid3);

    //Make sure they are all properly formatted
    expect(isGuidRegex.test(guid1)).toEqual(true);
    expect(guid1.length).toEqual(36);

    expect(isGuidRegex.test(guid2)).toEqual(true);
    expect(guid2.length).toEqual(36);

    expect(isGuidRegex.test(guid3)).toEqual(true);
    expect(guid3.length).toEqual(36);
  });
});
