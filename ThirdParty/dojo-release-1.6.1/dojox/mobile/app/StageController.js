/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.StageController"]){
dojo._hasResource["dojox.mobile.app.StageController"]=true;
dojo.provide("dojox.mobile.app.StageController");
dojo.experimental("dojox.mobile.app.StageController");
dojo.require("dojox.mobile.app.SceneController");
dojo.declare("dojox.mobile.app.StageController",null,{scenes:null,effect:"fade",constructor:function(_1){
this.domNode=_1;
this.scenes=[];
if(dojo.config.mobileAnim){
this.effect=dojo.config.mobileAnim;
}
},getActiveSceneController:function(){
return this.scenes[this.scenes.length-1];
},pushScene:function(_2,_3){
if(this._opInProgress){
return;
}
this._opInProgress=true;
var _4=dojo.create("div",{"class":"scene-wrapper",style:{visibility:"hidden"}},this.domNode);
var _5=new dojox.mobile.app.SceneController({},_4);
if(this.scenes.length>0){
this.scenes[this.scenes.length-1].assistant.deactivate();
}
this.scenes.push(_5);
var _6=this;
dojo.forEach(this.scenes,this.setZIndex);
_5.stageController=this;
_5.init(_2,_3).addCallback(function(){
if(_6.scenes.length==1){
_5.domNode.style.visibility="visible";
_6.scenes[_6.scenes.length-1].assistant.activate(_3);
_6._opInProgress=false;
}else{
_6.scenes[_6.scenes.length-2].performTransition(_6.scenes[_6.scenes.length-1].domNode,1,_6.effect,null,function(){
_6.scenes[_6.scenes.length-1].assistant.activate(_3);
_6._opInProgress=false;
});
}
});
},setZIndex:function(_7,_8){
dojo.style(_7.domNode,"zIndex",_8+1);
},popScene:function(_9){
if(this._opInProgress){
return;
}
var _a=this;
if(this.scenes.length>1){
this._opInProgress=true;
this.scenes[_a.scenes.length-2].assistant.activate(_9);
this.scenes[_a.scenes.length-1].performTransition(_a.scenes[this.scenes.length-2].domNode,-1,this.effect,null,function(){
_a._destroyScene(_a.scenes[_a.scenes.length-1]);
_a.scenes.splice(_a.scenes.length-1,1);
_a._opInProgress=false;
});
}else{
}
},popScenesTo:function(_b,_c){
if(this._opInProgress){
return;
}
while(this.scenes.length>2&&this.scenes[this.scenes.length-2].sceneName!=_b){
this._destroyScene(this.scenes[this.scenes.length-2]);
this.scenes.splice(this.scenes.length-2,1);
}
this.popScene(_c);
},_destroyScene:function(_d){
_d.assistant.deactivate();
_d.assistant.destroy();
_d.destroyRecursive();
}});
}
