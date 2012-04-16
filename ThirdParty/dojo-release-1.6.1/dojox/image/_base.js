/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.image._base"]){
dojo._hasResource["dojox.image._base"]=true;
dojo.provide("dojox.image._base");
(function(d){
var _1;
dojox.image.preload=function(_2){
if(!_1){
_1=d.create("div",{style:{position:"absolute",top:"-9999px",height:"1px",overflow:"hidden"}},d.body());
}
return d.map(_2,function(_3){
return d.create("img",{src:_3},_1);
});
};
if(d.config.preloadImages){
d.addOnLoad(function(){
dojox.image.preload(d.config.preloadImages);
});
}
})(dojo);
}
