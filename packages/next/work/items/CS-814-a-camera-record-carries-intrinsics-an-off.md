---
id: CS-814
title: A camera record carries intrinsics, an off-center principal point and a named distortion model
kind: work
state: in-progress
created: 2026-11-21
project: CS-437
claimed_by: orch-11-CS-814
touches: [packages/next/src/scene/Camera.ts, packages/next/src/scene/View.ts, packages/next/src/query/**, packages/next/src/index.ts, packages/next/test, packages/next/api/surface.txt]
---

Today `Camera` is a symmetric perspective set by `fovy` alone. `CameraPose` and `projectToPixel` exist, but there's no off-center principal point and no distortion. Sensor pipelines describe a camera by intrinsics (fx, fy, cx, cy) and a named distortion model. Examples are Isaac Sim's OpenCV pinhole and fisheye schemas, CARLA's lens parameters, and nuScenes' `camera_intrinsic`.

Source: the owner's review of 2.0's seams, 2026-11-21, after a survey of physical-AI practice (Omniverse Replicator and Isaac Sim, CARLA, AirSim, MuJoCo, Habitat, Cosmos, USD and glTF semantics). The owner put the four core seams in alpha.1. Why now: it changes the camera and picking API. Rough size: small to medium. Decider: the executor. Filed: 2026-11-21.

## Done when

- A camera record carries width, height, fx, fy, cx and cy, a pose with its reference frame and time, and a distortion field with a model name: `none`, `opencvPinhole` or `opencvFisheye`.
- An off-center projection renders and picks correctly, tested against `projectToPixel`.
- Distortion models that aren't built yet are refused by name. They can come later as a post stage without an API change. Rolling shutter is out of scope, and the docs say so.
- Every render product (CS-813) and every pick reports the record it used.
- `npm run surface` is run, and `api/surface.txt` is committed.
