/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._base.manager"]){
dojo._hasResource["dijit._base.manager"]=true;
dojo.provide("dijit._base.manager");
dojo.declare("dijit.WidgetSet",null,{constructor:function(){
this._hash={};
this.length=0;
},add:function(_1){
if(this._hash[_1.id]){
throw new Error("Tried to register widget with id=="+_1.id+" but that id is already registered");
}
this._hash[_1.id]=_1;
this.length++;
},remove:function(id){
if(this._hash[id]){
delete this._hash[id];
this.length--;
}
},forEach:function(_2,_3){
_3=_3||dojo.global;
var i=0,id;
for(id in this._hash){
_2.call(_3,this._hash[id],i++,this._hash);
}
return this;
},filter:function(_4,_5){
_5=_5||dojo.global;
var _6=new dijit.WidgetSet(),i=0,id;
for(id in this._hash){
var w=this._hash[id];
if(_4.call(_5,w,i++,this._hash)){
_6.add(w);
}
}
return _6;
},byId:function(id){
return this._hash[id];
},byClass:function(_7){
var _8=new dijit.WidgetSet(),id,_9;
for(id in this._hash){
_9=this._hash[id];
if(_9.declaredClass==_7){
_8.add(_9);
}
}
return _8;
},toArray:function(){
var ar=[];
for(var id in this._hash){
ar.push(this._hash[id]);
}
return ar;
},map:function(_a,_b){
return dojo.map(this.toArray(),_a,_b);
},every:function(_c,_d){
_d=_d||dojo.global;
var x=0,i;
for(i in this._hash){
if(!_c.call(_d,this._hash[i],x++,this._hash)){
return false;
}
}
return true;
},some:function(_e,_f){
_f=_f||dojo.global;
var x=0,i;
for(i in this._hash){
if(_e.call(_f,this._hash[i],x++,this._hash)){
return true;
}
}
return false;
}});
(function(){
dijit.registry=new dijit.WidgetSet();
var _10=dijit.registry._hash,_11=dojo.attr,_12=dojo.hasAttr,_13=dojo.style;
dijit.byId=function(id){
return typeof id=="string"?_10[id]:id;
};
var _14={};
dijit.getUniqueId=function(_15){
var id;
do{
id=_15+"_"+(_15 in _14?++_14[_15]:_14[_15]=0);
}while(_10[id]);
return dijit._scopeName=="dijit"?id:dijit._scopeName+"_"+id;
};
dijit.findWidgets=function(_16){
var _17=[];
function _18(_19){
for(var _1a=_19.firstChild;_1a;_1a=_1a.nextSibling){
if(_1a.nodeType==1){
var _1b=_1a.getAttribute("widgetId");
if(_1b){
var _1c=_10[_1b];
if(_1c){
_17.push(_1c);
}
}else{
_18(_1a);
}
}
}
};
_18(_16);
return _17;
};
dijit._destroyAll=function(){
dijit._curFocus=null;
dijit._prevFocus=null;
dijit._activeStack=[];
dojo.forEach(dijit.findWidgets(dojo.body()),function(_1d){
if(!_1d._destroyed){
if(_1d.destroyRecursive){
_1d.destroyRecursive();
}else{
if(_1d.destroy){
_1d.destroy();
}
}
}
});
};
if(dojo.isIE){
dojo.addOnWindowUnload(function(){
dijit._destroyAll();
});
}
dijit.byNode=function(_1e){
return _10[_1e.getAttribute("widgetId")];
};
dijit.getEnclosingWidget=function(_1f){
while(_1f){
var id=_1f.getAttribute&&_1f.getAttribute("widgetId");
if(id){
return _10[id];
}
_1f=_1f.parentNode;
}
return null;
};
var _20=(dijit._isElementShown=function(_21){
var s=_13(_21);
return (s.visibility!="hidden")&&(s.visibility!="collapsed")&&(s.display!="none")&&(_11(_21,"type")!="hidden");
});
dijit.hasDefaultTabStop=function(_22){
switch(_22.nodeName.toLowerCase()){
case "a":
return _12(_22,"href");
case "area":
case "button":
case "input":
case "object":
case "select":
case "textarea":
return true;
case "iframe":
var _23;
try{
var _24=_22.contentDocument;
if("designMode" in _24&&_24.designMode=="on"){
return true;
}
_23=_24.body;
}
catch(e1){
try{
_23=_22.contentWindow.document.body;
}
catch(e2){
return false;
}
}
return _23.contentEditable=="true"||(_23.firstChild&&_23.firstChild.contentEditable=="true");
default:
return _22.contentEditable=="true";
}
};
var _25=(dijit.isTabNavigable=function(_26){
if(_11(_26,"disabled")){
return false;
}else{
if(_12(_26,"tabIndex")){
return _11(_26,"tabIndex")>=0;
}else{
return dijit.hasDefaultTabStop(_26);
}
}
});
dijit._getTabNavigable=function(_27){
var _28,_29,_2a,_2b,_2c,_2d,_2e={};
function _2f(_30){
return _30&&_30.tagName.toLowerCase()=="input"&&_30.type&&_30.type.toLowerCase()=="radio"&&_30.name&&_30.name.toLowerCase();
};
var _31=function(_32){
dojo.query("> *",_32).forEach(function(_33){
if((dojo.isIE&&_33.scopeName!=="HTML")||!_20(_33)){
return;
}
if(_25(_33)){
var _34=_11(_33,"tabIndex");
if(!_12(_33,"tabIndex")||_34==0){
if(!_28){
_28=_33;
}
_29=_33;
}else{
if(_34>0){
if(!_2a||_34<_2b){
_2b=_34;
_2a=_33;
}
if(!_2c||_34>=_2d){
_2d=_34;
_2c=_33;
}
}
}
var rn=_2f(_33);
if(dojo.attr(_33,"checked")&&rn){
_2e[rn]=_33;
}
}
if(_33.nodeName.toUpperCase()!="SELECT"){
_31(_33);
}
});
};
if(_20(_27)){
_31(_27);
}
function rs(_35){
return _2e[_2f(_35)]||_35;
};
return {first:rs(_28),last:rs(_29),lowest:rs(_2a),highest:rs(_2c)};
};
dijit.getFirstInTabbingOrder=function(_36){
var _37=dijit._getTabNavigable(dojo.byId(_36));
return _37.lowest?_37.lowest:_37.first;
};
dijit.getLastInTabbingOrder=function(_38){
var _39=dijit._getTabNavigable(dojo.byId(_38));
return _39.last?_39.last:_39.highest;
};
dijit.defaultDuration=dojo.config["defaultDuration"]||200;
})();
}
