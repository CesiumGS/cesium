import { Color, ClearCommand } from "../../index.js";

describe("Renderer/ClearCommand", function () {
  it("constructs with defaults", function () {
    const c = new ClearCommand();
    expect(c.color).toBeUndefined();
    expect(c.depth).toBeUndefined();
    expect(c.stencil).toBeUndefined();
    expect(c.renderState).toBeUndefined();
    expect(c.framebuffer).toBeUndefined();
  });

  it("constructs with options", function () {
    const renderState = {};
    const framebuffer = {};
    const c = new ClearCommand({
      color: new Color(1.0, 2.0, 3.0, 4.0),
      depth: 1.0,
      stencil: 2,
      renderState: renderState,
      framebuffer: framebuffer,
    });
    expect(c.color).toEqual(new Color(1.0, 2.0, 3.0, 4.0));
    expect(c.depth).toEqual(1.0);
    expect(c.stencil).toEqual(2);
    expect(c.renderState).toBe(renderState);
    expect(c.framebuffer).toBe(framebuffer);
  });

  it("ClearCommand.ALL to have defaults", function () {
    expect(ClearCommand.ALL.color).toEqual(new Color(0.0, 0.0, 0.0, 0.0));
    expect(ClearCommand.ALL.depth).toEqual(1.0);
    expect(ClearCommand.ALL.stencil).toEqual(0);
    expect(ClearCommand.ALL.renderState).toBeUndefined();
    expect(ClearCommand.ALL.framebuffer).toBeUndefined();
  });
});
