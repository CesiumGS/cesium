---
id: CS-817
title: "Physical-AI modules on the four seams: ROS 2 and MCAP, randomizers, lidar returns, world-model exporters and an agent interface"
kind: work
state: proposed
created: 2026-11-21
project: CS-437
needs: [CS-813, CS-814, CS-815, CS-816]
---

Modules that sit on the four physical-AI seams (CS-813 to CS-816). None of them changes core API, so they come after the core seams, each as its own experimental package (CS-681):

- a ROS 2 bridge (TF, CameraInfo, rosbridge) and MCAP log playback;
- domain randomizers with recorded seeds, modeled on CS-393's settings registry;
- lidar and radar returns with stable IDs, on CS-535's rays;
- world-model exporters that write conditioning videos (depth, segmentation, edges) at a fixed rate;
- an agent interface to observe and act, for example an MCP-style server.

Source: the owner's review of 2.0's seams, 2026-11-21, after a survey of physical-AI practice (Omniverse Replicator and Isaac Sim, CARLA, AirSim, MuJoCo, Habitat, Cosmos, USD and glTF semantics). The owner put the four core seams in alpha.1. Why now: it records what the seams are for, so their contracts stay usable. Rough size: large, split later. Decider: the owner, when committing each. Cosmos and WebMCP change quickly, so their details are left open. Filed: 2026-11-21.

## Done when

- Split into one item per module when the owner commits them.
