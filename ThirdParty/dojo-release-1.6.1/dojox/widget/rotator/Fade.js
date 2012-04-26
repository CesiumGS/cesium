/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.rotator.Fade"]){
dojo._hasResource["dojox.widget.rotator.Fade"]=true;
dojo.provide("dojox.widget.rotator.Fade");
dojo.require("dojo.fx");
(function(d){
function _1(_2,_3){
var n=_2.next.node;
d.style(n,{display:"",opacity:0});
_2.node=_2.current.node;
return d.fx[_3]([d.fadeOut(_2),d.fadeIn(d.mixin(_2,{node:n}))]);
};
d.mixin(dojox.widget.rotator,{fade:function(_4){
return _1(_4,"chain");
},crossFade:function(_5){
return _1(_5,"combine");
}});
})(dojo);
}
