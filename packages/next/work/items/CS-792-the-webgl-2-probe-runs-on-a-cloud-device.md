---
id: CS-792
title: The WebGL 2 probe runs on a cloud device service, so the phone personas come from real reports
kind: work
state: proposed
created: 2026-11-21
project: CS-9
needs: [CS-35]
touches: [packages/next/bench/webgl2Probe.html, packages/next/src/profile/**, packages/next/docs/**]
---

CS-35's probe page (`bench/webgl2Probe.html`) writes a report that the WebGL 2 personas are built from. The plan wants reports from an iPhone on iOS 18, an Android phone with a Mali or Xclipse GPU, and Firefox on Linux or an Intel Mac. The owner, 2026-11-21: "we probably need to use something like browserstack at some point, but local testing for now with whatever devices i can scrounge up." For now the reports come from Firefox and from Safari on this Mac (CS-46).

**Proposal** (CS-686). Source: the owner's answer to CS-46, with CS-35's merge. Why now: it doesn't need to happen yet. The `webgl2-apple-mobile` and `webgl2-android` personas stay unwritten until a real report exists. Rough size: small for the runs. Choosing a service is the owner's call, because it is a new outside service with its own cost and terms. Decider: the owner, for the service and its spend. Filed: 2026-11-21.

## Done when

- The owner has chosen a device service, or chosen devices on hand, for iOS 18 Safari and an Android Mali or Xclipse phone.
- The probe page runs on each, and each copied report is kept with the date, device and browser version.
- The `webgl2-apple-mobile` and `webgl2-android` personas are written from those reports, and each persona says which report it came from.
- No account token or credential goes into the repository, the reports or the logs.
