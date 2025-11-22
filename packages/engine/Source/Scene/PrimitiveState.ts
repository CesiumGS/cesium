/**
 * The states that describe the lifecycle of a <code>Primitive</code>, as
 * represented by the <code>primitive._state</code>.
 *
 * The state transitions are triggered by calls to the <code>update</code>
 * function, but the actual state changes may happen asynchronously if the
 * <code>asynchronous</code> flag of the primitive was set to
 * <code>true</code>.
 *
 * @private
 */
const PrimitiveState = {
  /**
   * The initial state of a primitive.
   *
   * Note that this does NOT mean that the primitive is "ready", as indicated
   * by the <code>_ready</code> property. It means the opposite: Nothing was
   * done with the primitive at all.
   *
   * For primitives that are created with the <code>asynchronous:true</code>
   * setting and that are in this state, the <code>update</code> call starts
   * the creation of the geometry using web workers, and the primitive goes
   * into the <code>CREATING</code> state.
   *
   * For synchronously created primitives, this state never matters. They will
   * go into the COMBINED (or FAILED) state directly due to a call to the
   * <code>update</code> function, if they are not yet FAILED, COMBINED,
   * or COMPLETE.
   */
  READY: 0,

  /**
   * The process of creating the primitive geometry is ongoing.
   *
   * A primitive can only ever be in this state when it was created
   * with the <code>asynchronous:true</code> setting.
   *
   * It means that web workers are currently creating the geometry
   * of the primitive.
   *
   * When the geometry creation succeeds, then the primitive will go
   * into the CREATED state. Otherwise, it will go into the FAILED
   * state. Both will happen asynchronously.
   *
   * The <code>update</code> function has to be called regularly
   * until either of these states is reached.
   */
  CREATING: 1,

  /**
   * The geometry for the primitive has been created.
   *
   * A primitive can only ever be in this state when it was created
   * with the <code>asynchronous:true</code> setting.
   *
   * It means that web workers have (asynchronously) finished the
   * creation of the geometry, but further (asynchronous) processing
   * is necessary: If a primitive is determined to be in this state
   * during a call to <code>update</code>, an asynchronous process
   * is triggered to "combine" the geometry, meaning that the primitive
   * will go into the COMBINING state.
   */
  CREATED: 2,

  /**
   * The asynchronous creation of the geometry has been finished, but the
   * asynchronous process of combining the geometry has not finished yet.
   *
   * A primitive can only ever be in this state when it was created
   * with the <code>asynchronous:true</code> setting.
   *
   * It means that whatever is done with
   * <code>PrimitivePipeline.packCombineGeometryParameters</code> has
   * not finished yet. When combining the geometry succeeds, the
   * primitive will go into the COMBINED state. Otherwise, it will
   * go into the FAILED state.
   */
  COMBINING: 3,

  /**
   * The geometry data is in a form that can be uploaded to the GPU.
   *
   * For <i>synchronous</i> primitives, this means that the geometry
   * has been created (synchronously) due to the first call to the
   * <code>update</code> function.
   *
   * For <i>asynchronous</i> primitives, this means that the asynchronous
   * creation of the geometry and the asynchronous combination of the
   * geometry have both finished.
   *
   * The <code>update</code> function has to be called regularly until
   * this state is reached. When it is reached, the <code>update</code>
   * call will cause the transition into the COMPLETE state.
   */
  COMBINED: 4,

  /**
   * The geometry has been created and uploaded to the GPU.
   *
   * When this state is reached, it eventually causes the <code>_ready</code>
   * flag of the primitive to become <code>true</code>.
   *
   * Note: Setting the <code>ready</code> flag does NOT happen in the
   * <code>update</code> call: It only happens after rendering the next
   * frame!
   *
   * Note: This state does not mean that nothing has to be done
   * anymore (so the work is not "complete"). When the primitive is in
   * this state, the <code>update</code> function still has to be
   * called regularly.
   */
  COMPLETE: 5,

  /**
   * The creation of the primitive failed.
   *
   * When this state is reached, it eventually causes the <code>_ready</code>
   * flag of the primitive to become <code>true</code>.
   *
   * Note: Setting the <code>ready</code> flag does NOT happen in the
   * <code>update</code> call: It only happens after rendering the next
   * frame!
   *
   * This state can be reached when the (synchronous or asynchronous)
   * creation of the geometry, or the (asynchronous) combination of
   * the geometry caused any form of error.
   *
   * It may or may not imply the presence of the <code>_error</code> property.
   * When the <code>_error</code> property is present on a FAILED primitive,
   * this error will be thrown during the <code>update</code> call. When it
   * is not present for a FAILED primitive, then the <code>update</code> call
   * will do nothing.
   */
  FAILED: 6,
};
export default Object.freeze(PrimitiveState);
