/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.geo.charting._base"]){
dojo._hasResource["dojox.geo.charting._base"]=true;
dojo.provide("dojox.geo.charting._base");
dojo.require("dojo.NodeList-traverse");
dojo.require("dojox.gfx.matrix");
dojo.require("dijit.Tooltip");
(function(){
var _1=dojox.geo.charting;
_1.showTooltip=function(_2,_3,_4){
var _5=_1._normalizeArround(_3);
return dijit.showTooltip(_2,_5,_4);
};
_1.hideTooltip=function(_6){
return dijit.hideTooltip(_6);
};
_1._normalizeArround=function(_7){
var _8=_1._getRealBBox(_7);
var _9=_7._getRealMatrix()||{xx:1,xy:0,yx:0,yy:1,dx:0,dy:0};
var _a=dojox.gfx.matrix.multiplyPoint(_9,_8.x,_8.y);
var _b=dojo.coords(_1._getGfxContainer(_7));
_7.x=dojo.coords(_b,true).x+_a.x,_7.y=dojo.coords(_b,true).y+_a.y,_7.width=_8.width*_9.xx,_7.height=_8.height*_9.yy;
return _7;
};
_1._getGfxContainer=function(_c){
return (new dojo.NodeList(_c.rawNode)).parents("div")[0];
};
_1._getRealBBox=function(_d){
var _e=_d.getBoundingBox();
if(!_e){
var _f=_d.children;
var _e=dojo.clone(_1._getRealBBox(_f[0]));
dojo.forEach(_f,function(_10){
var _11=_1._getRealBBox(_10);
_e.x=Math.min(_e.x,_11.x);
_e.y=Math.min(_e.y,_11.y);
_e.endX=Math.max(_e.x+_e.width,_11.x+_11.width);
_e.endY=Math.max(_e.y+_e.height,_11.y+_11.height);
});
_e.width=_e.endX-_e.x;
_e.height=_e.endY-_e.y;
}
return _e;
};
})();
}
