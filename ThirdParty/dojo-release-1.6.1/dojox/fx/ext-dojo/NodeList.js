/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.ext-dojo.NodeList"]){
dojo._hasResource["dojox.fx.ext-dojo.NodeList"]=true;
dojo.provide("dojox.fx.ext-dojo.NodeList");
dojo.experimental("dojox.fx.ext-dojo.NodeList");
dojo.require("dojo.NodeList-fx");
dojo.require("dojox.fx");
dojo.extend(dojo.NodeList,{sizeTo:function(_1){
return this._anim(dojox.fx,"sizeTo",_1);
},slideBy:function(_2){
return this._anim(dojox.fx,"slideBy",_2);
},highlight:function(_3){
return this._anim(dojox.fx,"highlight",_3);
},fadeTo:function(_4){
return this._anim(dojo,"_fade",_4);
},wipeTo:function(_5){
return this._anim(dojox.fx,"wipeTo",_5);
}});
}
