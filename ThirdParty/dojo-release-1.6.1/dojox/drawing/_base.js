/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing._base"]){
dojo._hasResource["dojox.drawing._base"]=true;
dojo.provide("dojox.drawing._base");
dojo.experimental("dojox.drawing");
dojo.require("dojox.drawing.manager._registry");
dojo.require("dojox.gfx");
dojo.require("dojox.drawing.Drawing");
dojo.require("dojox.drawing.util.oo");
dojo.require("dojox.drawing.util.common");
dojo.require("dojox.drawing.util.typeset");
dojo.require("dojox.drawing.defaults");
dojo.require("dojox.drawing.manager.Canvas");
dojo.require("dojox.drawing.manager.Undo");
dojo.require("dojox.drawing.manager.keys");
dojo.require("dojox.drawing.manager.Mouse");
dojo.require("dojox.drawing.manager.Stencil");
dojo.require("dojox.drawing.manager.StencilUI");
dojo.require("dojox.drawing.manager.Anchors");
dojo.require("dojox.drawing.stencil._Base");
dojo.require("dojox.drawing.stencil.Line");
dojo.require("dojox.drawing.stencil.Rect");
dojo.require("dojox.drawing.stencil.Ellipse");
dojo.require("dojox.drawing.stencil.Path");
dojo.require("dojox.drawing.stencil.Text");
dojo.require("dojox.drawing.stencil.Image");
dojo.require("dojox.drawing.annotations.Label");
dojo.require("dojox.drawing.annotations.Angle");
dojo.require("dojox.drawing.annotations.Arrow");
dojo.require("dojox.drawing.annotations.BoxShadow");
}
