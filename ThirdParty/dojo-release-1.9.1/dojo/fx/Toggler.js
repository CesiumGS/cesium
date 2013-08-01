/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/fx/Toggler",["../_base/lang","../_base/declare","../_base/fx","../aspect"],function(_1,_2,_3,_4){
return _2("dojo.fx.Toggler",null,{node:null,showFunc:_3.fadeIn,hideFunc:_3.fadeOut,showDuration:200,hideDuration:200,constructor:function(_5){
var _6=this;
_1.mixin(_6,_5);
_6.node=_5.node;
_6._showArgs=_1.mixin({},_5);
_6._showArgs.node=_6.node;
_6._showArgs.duration=_6.showDuration;
_6.showAnim=_6.showFunc(_6._showArgs);
_6._hideArgs=_1.mixin({},_5);
_6._hideArgs.node=_6.node;
_6._hideArgs.duration=_6.hideDuration;
_6.hideAnim=_6.hideFunc(_6._hideArgs);
_4.after(_6.showAnim,"beforeBegin",_1.hitch(_6.hideAnim,"stop",true),true);
_4.after(_6.hideAnim,"beforeBegin",_1.hitch(_6.showAnim,"stop",true),true);
},show:function(_7){
return this.showAnim.play(_7||0);
},hide:function(_8){
return this.hideAnim.play(_8||0);
}});
});
