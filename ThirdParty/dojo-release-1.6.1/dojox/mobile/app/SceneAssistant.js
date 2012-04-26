/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.SceneAssistant"]){
dojo._hasResource["dojox.mobile.app.SceneAssistant"]=true;
dojo.provide("dojox.mobile.app.SceneAssistant");
dojo.experimental("dojox.mobile.app.SceneAssistant");
dojo.declare("dojox.mobile.app.SceneAssistant",null,{constructor:function(){
},setup:function(){
},activate:function(_1){
},deactivate:function(){
},destroy:function(){
var _2=dojo.query("> [widgetId]",this.containerNode).map(dijit.byNode);
dojo.forEach(_2,function(_3){
_3.destroyRecursive();
});
this.disconnect();
},connect:function(_4,_5,_6){
if(!this._connects){
this._connects=[];
}
this._connects.push(dojo.connect(_4,_5,_6));
},disconnect:function(){
dojo.forEach(this._connects,dojo.disconnect);
this._connects=[];
}});
}
