// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Vendor/AGI_articulations/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace AGI_articulations {
  /**
   * A model articulation definition.
   */
  export interface Articulation extends Gltf2.Property {
    /**
     * The name of this articulation. The articulation name must be unique
     * within this model. Articulation names may not contain spaces.
     */
    name: string;
    /**
     * An array of stages, each of which defines a degree of freedom of
     * movement.
     */
    stages: AGI_articulations.Articulation.Stage[];
    /**
     * The local forward vector for the associated node, for the purpose of
     * pointing at a target or other object.
     */
    pointingVector?: [number, number, number];
  }
  export namespace Articulation {
    /**
     * One stage of a model articulation definition.
     */
    export interface Stage extends Gltf2.Property {
      /**
       * The name of this articulation stage. The articulation stage name must
       * be unique only within the containing articulation. Articulation Stage
       * names may not contain spaces.
       */
      name: string;
      /**
       * The type of motion applied by this articulation stage.
       */
      type:
        | "xTranslate"
        | "yTranslate"
        | "zTranslate"
        | "xRotate"
        | "yRotate"
        | "zRotate"
        | "xScale"
        | "yScale"
        | "zScale"
        | "uniformScale"
        | string;
      /**
       * The minimum value for the range of motion of this articulation stage.
       */
      minimumValue: number;
      /**
       * The maximum value for the range of motion of this articulation stage.
       */
      maximumValue: number;
      /**
       * The initial value for this articulation stage.
       */
      initialValue: number;
    }
  }
  /**
   * glTF Extension that defines metadata for applying external analysis or
   * effects to a model.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * An array of articulations. An articulation indicates a named range of
     * motion available to one or more nodes within the model.
     */
    articulations?: AGI_articulations.Articulation[];
  }
  /**
   * glTF Extension for an individual node in a glTF model, to associate it with
   * the model's root AGI_articulations object.
   */
  export interface Node extends Gltf2.Property {
    /**
     * Set to true to indicate that this node's origin and orientation act as an
     * attach point for external objects, analysis, or effects.
     */
    isAttachPoint?: boolean;
    /**
     * The name of an Articulation that applies to this node. Articulations are
     * defined in the glTF root extension. A single articulation may apply to
     * more than one node, and its stage values set the transform for all
     * assigned nodes simultaneously.
     */
    articulationName?: string;
  }
}
