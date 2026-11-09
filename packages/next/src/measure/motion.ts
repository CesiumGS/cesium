// Central differences live in the frames layer (`src/frames/motion.ts`);
// measure re-exports them unchanged.
export {
  derivative,
  positionIn,
  velocityIn,
  type Sampler,
} from "../frames/motion.ts";
