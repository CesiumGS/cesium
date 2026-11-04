describe("Widgets/EditorToolbar/EditorToolbarViewModel", function () {
  it("creates the default mode entries");
  it("registers separate default tools for each editor");
  it("uses custom mode and tool entries without registering default tools");
  it("reflects the editor's initial mode and tool");
  it("reflects external mode and tool changes");
  it("reflects a mode change that clears the active tool");
  it("changes modes and tools through its commands");
  it("clears the active tool through the no-tool entry");
  it("disables unsupported tools using supportsMode");
  it("does not activate an unsupported tool");
  it("closes the other dropdown when opening a dropdown");
  it("closes a dropdown after selecting an entry");
  it("removes editor listeners on destroy");
});
