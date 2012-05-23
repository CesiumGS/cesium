dojo.provide("dojox.storage._common");
dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");

/*
  Note: if you are doing Dojo Offline builds you _must_
  have offlineProfile=true when you run the build script:
  ./build.sh action=release profile=offline offlineProfile=true
*/
dojo.require("dojox.storage.LocalStorageProvider");
dojo.require("dojox.storage.GearsStorageProvider");
//>>excludeStart("offlineProfileExclude", kwArgs.dojoxStorageBuildOption == "offline");
dojo.require("dojox.storage.WhatWGStorageProvider");
dojo.require("dojox.storage.FlashStorageProvider");
//>>excludeEnd("offlineProfileExclude");
dojo.require("dojox.storage.BehaviorStorageProvider");
dojo.require("dojox.storage.CookieStorageProvider");

// now that we are loaded and registered tell the storage manager to
// initialize itself
dojox.storage.manager.initialize();
