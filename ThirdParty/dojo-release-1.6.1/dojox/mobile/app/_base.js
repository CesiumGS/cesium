/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app._base"]){
dojo._hasResource["dojox.mobile.app._base"]=true;
dojo.provide("dojox.mobile.app._base");
dojo.experimental("dojox.mobile.app._base");
dojo.require("dijit._base");
dojo.require("dijit._WidgetBase");
dojo.require("dojox.mobile");
dojo.require("dojox.mobile.parser");
dojo.require("dojox.mobile.app._event");
dojo.require("dojox.mobile.app._Widget");
dojo.require("dojox.mobile.app.StageController");
dojo.require("dojox.mobile.app.SceneController");
dojo.require("dojox.mobile.app.SceneAssistant");
dojo.require("dojox.mobile.app.AlertDialog");
dojo.require("dojox.mobile.app.List");
dojo.require("dojox.mobile.app.ListSelector");
dojo.require("dojox.mobile.app.TextBox");
dojo.require("dojox.mobile.app.ImageView");
dojo.require("dojox.mobile.app.ImageThumbView");
(function(){
var _1;
var _2;
var _3=["dojox.mobile","dojox.mobile.parser"];
var _4={};
var _5;
var _6;
var _7=[];
function _8(_9,_a){
var _b;
var _c;
do{
_b=_9.pop();
if(_b.source){
_c=_b.source;
}else{
if(_b.module){
_c=dojo.baseUrl+dojo._getModuleSymbols(_b.module).join("/")+".js";
}else{
alert("Error: invalid JavaScript resource "+dojo.toJson(_b));
return;
}
}
}while(_9.length>0&&_4[_c]);
if(_9.length<1&&_4[_c]){
_a();
return;
}
dojo.xhrGet({url:_c,sync:false}).addCallbacks(function(_d){
dojo["eval"](_d);
_4[_c]=true;
if(_9.length>0){
_8(_9,_a);
}else{
_a();
}
},function(){
alert("Failed to load resource "+_c);
});
};
var _e=function(){
_1=new dojox.mobile.app.StageController(_6);
var _f={id:"com.test.app",version:"1.0.0",initialScene:"main"};
if(dojo.global["appInfo"]){
dojo.mixin(_f,dojo.global["appInfo"]);
}
_2=dojox.mobile.app.info=_f;
if(_2.title){
var _10=dojo.query("head title")[0]||dojo.create("title",{},dojo.query("head")[0]);
document.title=_2.title;
}
_1.pushScene(_2.initialScene);
};
var _11=function(){
var _12=false;
if(dojo.global.BackButton){
BackButton.override();
dojo.connect(document,"backKeyDown",function(e){
dojo.publish("/dojox/mobile/app/goback");
});
_12=true;
}else{
if(dojo.global.Mojo){
}
}
if(_12){
dojo.addClass(dojo.body(),"mblNativeBack");
}
};
dojo.mixin(dojox.mobile.app,{init:function(_13){
_6=_13||dojo.body();
dojox.mobile.app.STAGE_CONTROLLER_ACTIVE=true;
dojo.subscribe("/dojox/mobile/app/goback",function(){
_1.popScene();
});
dojo.subscribe("/dojox/mobile/app/alert",function(_14){
dojox.mobile.app.getActiveSceneController().showAlertDialog(_14);
});
dojo.subscribe("/dojox/mobile/app/pushScene",function(_15,_16){
_1.pushScene(_15,_16||{});
});
dojo.xhrGet({url:"view-resources.json",load:function(_17){
var _18=[];
if(_17){
_7=_17=dojo.fromJson(_17);
for(var i=0;i<_17.length;i++){
if(!_17[i].scene){
_18.push(_17[i]);
}
}
}
if(_18.length>0){
_8(_18,_e);
}else{
_e();
}
},error:_e});
_11();
},getActiveSceneController:function(){
return _1.getActiveSceneController();
},getStageController:function(){
return _1;
},loadResources:function(_19,_1a){
_8(_19,_1a);
},loadResourcesForScene:function(_1b,_1c){
var _1d=[];
for(var i=0;i<_7.length;i++){
if(_7[i].scene==_1b){
_1d.push(_7[i]);
}
}
if(_1d.length>0){
_8(_1d,_1c);
}else{
_1c();
}
},resolveTemplate:function(_1e){
return "app/views/"+_1e+"/"+_1e+"-scene.html";
},resolveAssistant:function(_1f){
return "app/assistants/"+_1f+"-assistant.js";
}});
})();
}
