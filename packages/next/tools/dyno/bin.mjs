#!/usr/bin/env node
// The `dyno` bin of @cesium/dyno (CS-774, CS-784). npm only links a bin that lives inside its own
// package, so this file is the package's whole code: it runs the command,
// which is packages/next/bench/dyno.mjs.
import "../../bench/dyno.mjs";
