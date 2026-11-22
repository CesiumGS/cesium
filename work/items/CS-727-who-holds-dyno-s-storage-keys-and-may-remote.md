---
id: CS-727
title: Who holds dyno's storage keys, and may remote and cloud sessions read results?
kind: decision
state: done
created: 2026-11-19
project: CS-389
decider: owner
answer: B
answered_at: 2026-11-20T04:31:14.661Z
answered_via: question-tool
answered_by: owner
---

## Question

How are dyno's storage credentials split, and may sessions on other machines or in the cloud read shared results?

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 9.

## Options and recommendation

- A. A writer key and a reader key per device, one maintenance key on the owner's main machine, and sealing on the client. Remote and cloud reading is built but off, enabled per environment with a read-only key, so revoking one key touches nothing else.
- B. As A, with cloud reading on by default: agents check results unasked, and the reader key sits in every enabled environment's secrets.
- C. One shared key pair: simplest, but removing a device rotates every key, and any device can delete.
- D. No sealing on the client, only the bucket's policy: no keys to hand out, but a misconfigured bucket exposes everything in the clear.

Recommended: A.

Reversibility: the mechanism is two-way; a leaked key is one-way.

## Answer

B, per-device writer and reader keys with encryption on the client, and cloud and remote reading on by default with a read-only key (owner, 2026-11-19). The reader key goes in each enabled environment's secrets.
