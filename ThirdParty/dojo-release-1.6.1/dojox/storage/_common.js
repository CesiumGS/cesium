/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.storage._common"]){
dojo._hasResource["dojox.storage._common"]=true;
dojo.provide("dojox.storage._common");
dojo.require("dojox.storage.Provider");
dojo.require("dojox.storage.manager");
dojo.require("dojox.storage.LocalStorageProvider");
dojo.require("dojox.storage.GearsStorageProvider");
dojo.require("dojox.storage.WhatWGStorageProvider");
dojo.require("dojox.storage.FlashStorageProvider");
dojo.require("dojox.storage.BehaviorStorageProvider");
dojo.require("dojox.storage.CookieStorageProvider");
dojox.storage.manager.initialize();
}
