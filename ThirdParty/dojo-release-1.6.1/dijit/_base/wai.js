/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._base.wai"]){
dojo._hasResource["dijit._base.wai"]=true;
dojo.provide("dijit._base.wai");
dijit.wai={onload:function(){
var _1=dojo.create("div",{id:"a11yTestNode",style:{cssText:"border: 1px solid;"+"border-color:red green;"+"position: absolute;"+"height: 5px;"+"top: -999px;"+"background-image: url(\""+(dojo.config.blankGif||dojo.moduleUrl("dojo","resources/blank.gif"))+"\");"}},dojo.body());
var cs=dojo.getComputedStyle(_1);
if(cs){
var _2=cs.backgroundImage;
var _3=(cs.borderTopColor==cs.borderRightColor)||(_2!=null&&(_2=="none"||_2=="url(invalid-url:)"));
dojo[_3?"addClass":"removeClass"](dojo.body(),"dijit_a11y");
if(dojo.isIE){
_1.outerHTML="";
}else{
dojo.body().removeChild(_1);
}
}
}};
if(dojo.isIE||dojo.isMoz){
dojo._loaders.unshift(dijit.wai.onload);
}
dojo.mixin(dijit,{hasWaiRole:function(_4,_5){
var _6=this.getWaiRole(_4);
return _5?(_6.indexOf(_5)>-1):(_6.length>0);
},getWaiRole:function(_7){
return dojo.trim((dojo.attr(_7,"role")||"").replace("wairole:",""));
},setWaiRole:function(_8,_9){
dojo.attr(_8,"role",_9);
},removeWaiRole:function(_a,_b){
var _c=dojo.attr(_a,"role");
if(!_c){
return;
}
if(_b){
var t=dojo.trim((" "+_c+" ").replace(" "+_b+" "," "));
dojo.attr(_a,"role",t);
}else{
_a.removeAttribute("role");
}
},hasWaiState:function(_d,_e){
return _d.hasAttribute?_d.hasAttribute("aria-"+_e):!!_d.getAttribute("aria-"+_e);
},getWaiState:function(_f,_10){
return _f.getAttribute("aria-"+_10)||"";
},setWaiState:function(_11,_12,_13){
_11.setAttribute("aria-"+_12,_13);
},removeWaiState:function(_14,_15){
_14.removeAttribute("aria-"+_15);
}});
}
