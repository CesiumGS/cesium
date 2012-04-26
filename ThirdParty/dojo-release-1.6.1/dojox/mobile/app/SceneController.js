/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.SceneController"]){
dojo._hasResource["dojox.mobile.app.SceneController"]=true;
dojo.provide("dojox.mobile.app.SceneController");
dojo.experimental("dojox.mobile.app.SceneController");
dojo.require("dojox.mobile._base");
(function(){
var _1=dojox.mobile.app;
var _2={};
dojo.declare("dojox.mobile.app.SceneController",dojox.mobile.View,{stageController:null,keepScrollPos:false,init:function(_3,_4){
this.sceneName=_3;
this.params=_4;
var _5=_1.resolveTemplate(_3);
this._deferredInit=new dojo.Deferred();
if(_2[_3]){
this._setContents(_2[_3]);
}else{
dojo.xhrGet({url:_5,handleAs:"text"}).addCallback(dojo.hitch(this,this._setContents));
}
return this._deferredInit;
},_setContents:function(_6){
_2[this.sceneName]=_6;
this.domNode.innerHTML="<div>"+_6+"</div>";
var _7="";
var _8=this.sceneName.split("-");
for(var i=0;i<_8.length;i++){
_7+=_8[i].substring(0,1).toUpperCase()+_8[i].substring(1);
}
_7+="Assistant";
this.sceneAssistantName=_7;
var _9=this;
dojox.mobile.app.loadResourcesForScene(this.sceneName,function(){
var _a;
if(typeof (dojo.global[_7])!="undefined"){
_9._initAssistant();
}else{
var _b=_1.resolveAssistant(_9.sceneName);
dojo.xhrGet({url:_b,handleAs:"text"}).addCallback(function(_c){
try{
dojo.eval(_c);
}
catch(e){
throw e;
}
_9._initAssistant();
});
}
});
},_initAssistant:function(){
var _d=dojo.getObject(this.sceneAssistantName);
if(!_d){
throw Error("Unable to resolve scene assistant "+this.sceneAssistantName);
}
this.assistant=new _d(this.params);
this.assistant.controller=this;
this.assistant.domNode=this.domNode.firstChild;
this.assistant.setup();
this._deferredInit.callback();
},query:function(_e,_f){
return dojo.query(_e,_f||this.domNode);
},parse:function(_10){
var _11=this._widgets=dojox.mobile.parser.parse(_10||this.domNode,{controller:this});
for(var i=0;i<_11.length;i++){
_11[i].set("controller",this);
}
},getWindowSize:function(){
return {w:dojo.global.innerWidth,h:dojo.global.innerHeight};
},showAlertDialog:function(_12){
var _13=dojo.marginBox(this.assistant.domNode);
var _14=new dojox.mobile.app.AlertDialog(dojo.mixin(_12,{controller:this}));
this.assistant.domNode.appendChild(_14.domNode);
_14.show();
},popupSubMenu:function(_15){
var _16=new dojox.mobile.app.ListSelector({controller:this,destroyOnHide:true,onChoose:_15.onChoose});
this.assistant.domNode.appendChild(_16.domNode);
_16.set("data",_15.choices);
_16.show(_15.fromNode);
}});
})();
}
