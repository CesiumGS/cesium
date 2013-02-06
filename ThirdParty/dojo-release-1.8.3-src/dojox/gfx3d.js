// AMD-ID "dojox/gfx3d"
define(["dojo/_base/kernel","dojox","./gfx3d/matrix","./gfx3d/_base","./gfx3d/object"], function(dojo,dojox) {
	dojo.getObject("gfx3d", true, dojox);

	/*=====
	 return {
	 // summary:
	 //		Deprecated.  Should require dojox/gfx3d modules directly rather than trying to access them through
	 //		this module.
	 };
	 =====*/

	return dojox.gfx3d;
});
