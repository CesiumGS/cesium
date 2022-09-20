import {
  BoundingRectangle,
  Color,
  defined,
  ClearCommand,
  Pass,
  CreditDisplay,
  FrameState,
  JobScheduler,
  PickFramebuffer,
} from "../packages/engine/index.js";

function executeCommands(context, passState, commands) {
  const length = commands.length;
  for (let i = 0; i < length; ++i) {
    commands[i].execute(context, passState);
  }
}

function pick(frameState, primitives, x, y) {
  frameState.commandList.length = 0;

  const context = frameState.context;

  const rectangle = new BoundingRectangle(x, y, 1, 1);
  const pickFramebuffer = new PickFramebuffer(context);
  const passState = pickFramebuffer.begin(rectangle);

  const oldPasses = frameState.passes;
  frameState.passes = new FrameState(
    new CreditDisplay(
      document.createElement("div"),
      undefined,
      document.createElement("div")
    ),
    new JobScheduler()
  ).passes;
  frameState.passes.pick = true;

  primitives.update(frameState);

  const clear = new ClearCommand({
    color: new Color(0.0, 0.0, 0.0, 0.0),
    depth: 1.0,
    stencil: 1.0,
  });
  clear.execute(context, passState);

  let i;
  const renderCommands = new Array(Pass.NUMBER_OF_PASSES);
  for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
    renderCommands[i] = [];
  }

  const commands = frameState.commandList;
  const length = commands.length;
  for (i = 0; i < length; i++) {
    const command = commands[i];
    const pass = defined(command.pass) ? command.pass : Pass.OPAQUE;
    renderCommands[pass].push(command);
  }

  for (i = 0; i < Pass.NUMBER_OF_PASSES; ++i) {
    executeCommands(context, passState, renderCommands[i]);
  }

  frameState.passes = oldPasses;

  const p = pickFramebuffer.end(rectangle);
  pickFramebuffer.destroy();

  return p;
}
export default pick;
