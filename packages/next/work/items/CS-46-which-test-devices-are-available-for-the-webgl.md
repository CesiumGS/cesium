---
id: CS-46
title: Which test devices are available for the WebGL 2 probe runs?
kind: decision
state: done
created: 2026-11-13
project: CS-9
decider: owner
answer: Firefox on Linux or an Intel Mac, and Safari on this Mac
answered_at: 2026-11-21T16:05:01.358Z
answered_via: question-tool
answered_by: owner
---

## Question

Which of the wanted devices exist for the probe runs: an iPhone on iOS 18, an Android phone with a Mali or Xclipse GPU, and Firefox on Linux or an Intel Mac? The browser research (`docs/superpowers/plans/2026-11-13-webgl2-r1-browser-reach.md`, question 7, accepted) asks for them; which are available is still to be confirmed with the owner (`2026-11-13-webgl2-renderer.md`, "Still open").

## Answer

The owner, 2026-11-21, with CS-35's merge: "we probably need to use something like browserstack at some point, but local testing for now with whatever devices i can scrounge up." For now that means Firefox on Linux or an Intel Mac, and one manual run of Safari on this Mac. No iPhone or Android device is on hand yet, so the `webgl2-apple-mobile` and `webgl2-android` personas wait. A cloud device service is a later call with its own cost (CS-792).
