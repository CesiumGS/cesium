/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.fx.Toggler"]){
dojo._hasResource["dojo.fx.Toggler"]=true;
dojo.provide("dojo.fx.Toggler");
dojo.declare("dojo.fx.Toggler",null,{node:null,showFunc:dojo.fadeIn,hideFunc:dojo.fadeOut,showDuration:200,hideDuration:200,constructor:function(_1){
var _2=this;
dojo.mixin(_2,_1);
_2.node=_1.node;
_2._showArgs=dojo.mixin({},_1);
_2._showArgs.node=_2.node;
_2._showArgs.duration=_2.showDuration;
_2.showAnim=_2.showFunc(_2._showArgs);
_2._hideArgs=dojo.mixin({},_1);
_2._hideArgs.node=_2.node;
_2._hideArgs.duration=_2.hideDuration;
_2.hideAnim=_2.hideFunc(_2._hideArgs);
dojo.connect(_2.showAnim,"beforeBegin",dojo.hitch(_2.hideAnim,"stop",true));
dojo.connect(_2.hideAnim,"beforeBegin",dojo.hitch(_2.showAnim,"stop",true));
},show:function(_3){
return this.showAnim.play(_3||0);
},hide:function(_4){
return this.hideAnim.play(_4||0);
}});
}
