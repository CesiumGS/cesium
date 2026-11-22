---
id: CS-839
title: Merge CS-814, camera records with intrinsics, an off-center principal point and a named distortion
kind: decision
state: done
created: 2026-11-21
project: CS-10
decider: owner
answer: "A. Merge once a quiet check passes, with the three recommendations: The orchestrator runs the plain 1,400 ms cold-start check on the candidate when the machine is quiet; on a pass it replays onto main's tip, reruns the type checks, work check and camera tests, fast-forwards main, runs the plain check on main and logs the merge. The main session files the follow-up for the other field-of-view readers; pickPosition and the corner convention stay."
answered_at: 2026-11-22T04:53:07.759Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-814, which gives the camera a record (intrinsics, an off-center principal point, a named distortion model and a pose in a named reference frame) that picks report, into main once a quiet plain cold-start check passes? It is an engine change, so under the cold-start rule it waits for that check. It carries three questions, answered here by the recommended option: (1) the other readers of the field of view still read the centered one; (2) View.pickPosition keeps returning a bare array; (3) cx and cy count from the image's top-left corner.

A centered record gives today's matrices bit for bit (projection, frustum planes and ray directions at three aspect ratios, with +0 offsets). Off-center: rasterization matches projectToPixel(record) within one millionth of a pixel over 60 points, and rays, culling planes and picks follow; a pick lands on the pixel's center and carries pick.cameraRecord. A distortion model that isn't built yet (opencvPinhole, opencvFisheye) is refused by name, as are unknown names. Names: CameraIntrinsics, CameraDistortionModel, CameraDistortion, CameraRecordPose (with referenceFrame), CameraRecord; Camera.setIntrinsics, intrinsics and record; PickResult.cameraRecord, optional. The field of view comes from fy; records are in CSS pixels at the render root. api/surface.txt adds 5 type names. Executor's parity and selection runs against base a0a4355d2b are identical with timings stripped. Outside its touches: rows in src/thread/protocol.ts; render/view/picks.ts, pickDomain.ts and scene/pick.ts (picks go through the camera's lens and carry the record); scene/viewAnchors.ts; the handbook's apiMap.ts. Checked by the orchestrator on main 026520244f (replay d5c1077261 of 0301e5f903): both type checks, work check (835 files), surface unchanged from the branch's, npm test exit 0 (383 files, 6,426 tests), test:data exit 0 (56 files), shaders:check exit 0. eslint's one error (an unused PostStageKind import in src/render/post/chain.ts) is already on main. Snyk (executor): 0 on Camera.ts. Q1 (blast radius): the sky, GPU occlusion culling, light culling, shadow cascades, star cells and snaps still read the centered field of view. For an off-center view, occlusion culling could wrongly drop items near the image's edges; nothing changes for existing, centered views. Recommendation: a follow-up item, 'every reader of the field of view reads the camera's lens', and until then the docs say to turn occlusionCulling off for off-center views. Q2 (public commitment): View.pickPosition returns a bare Float64Array and can't report the record; pickPoint carries it. Recommendation: keep. Q3 (public commitment): cx and cy count from the image's top-left corner, so OpenCV's values need +0.5, and the docs say so. Recommendation: keep. Presentation: orch-11-merge-ready-CS-814.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge once a quiet check passes, with the three recommendations: The orchestrator runs the plain 1,400 ms cold-start check on the candidate when the machine is quiet; on a pass it replays onto main's tip, reruns the type checks, work check and camera tests, fast-forwards main, runs the plain check on main and logs the merge. The main session files the follow-up for the other field-of-view readers; pickPosition and the corner convention stay.
- B. Hold it: Nothing merges. CS-813 (render products) and the picks that report a camera record wait.

Recommended: Merge once a quiet check passes, with the three recommendations. Centered views are unchanged bit for bit, off-center projection, rays and picks agree within a millionth of a pixel, every gate passes, and the one risk (occlusion culling at an off-center view's edges) touches only views nobody makes today and gets its own follow-up.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.

**Correction by the chief of staff, 2026-11-21.** The recorded answer is option A's full text, including "with the three recommendations". That's wrong. The owner chose A for the merge, after a quiet check, but answered the three questions separately in the same question set:

- Q1 (other readers of the field of view): fix it before merging. Every reader, including the sky and occlusion culling, uses the camera record, with a test of an off-center view with culling on.
- Q2: `pickPosition` returns a record (the position and the camera record). That's a public API change.
- Q3: cx and cy count from the image's top-left corner, as recommended.

So CS-814 gets a fix round for Q1 and Q2 before its quiet check and merge. No follow-up item is needed for Q1. The answer was recorded as the option's text because hitld takes one option per decision. The questions' answers belong here.
