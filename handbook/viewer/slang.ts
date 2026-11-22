/** The live view compiles no Slang, so its compiler stays out of the bundle. */
export function compileSlang(): never {
  throw new Error("The live view doesn't compile Slang.");
}
