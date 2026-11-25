---
id: CS-1318
title: "World.destroy while a view still shows that world: detach the views, or refuse"
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-972]
---

> **Proposal.** Source: CS-972's scoped check after its structural round, relayed by orch-11 on 2026-11-24. Why now: `World.destroy` while a view still shows that world leaves the next tick's submit refused (the probe was `world.indirect`). The public `Engine.removeWorld` is safe because it removes views first, so only a direct `World.destroy` meets it. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `World.destroy` either detaches the views that show the world, or refuses while one does, with a message that names what to remove first. The executor makes the call and lists it under `calls`.
- A test destroys a world a view still shows, ticks, and checks the next submit is accepted (or the destroy refused), on the fake device.
- CS-972's Minors that touch this path fold in here: a destroy error swallowed after a failed tick is reported, and the docstring that describes `World.destroy` matches it.
