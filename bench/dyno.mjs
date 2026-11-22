#!/usr/bin/env node
// dyno: one command line for Dyno's runs, the Lab, its servers, its data and
// its measurements (CS-721). `dyno --help` lists the commands; the table is
// suite/commands/table.mjs, the dispatcher suite/commands/dispatch.mjs.
//
//   node bench/dyno.mjs <command> [options]   (npm run dyno:cli -- …)
import process from "node:process";
import { cli } from "./suite/commands/table.mjs";

process.exitCode = await cli(process.argv.slice(2));
