/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.SnapLogicStore"]){
dojo._hasResource["dojox.data.SnapLogicStore"]=true;
dojo.provide("dojox.data.SnapLogicStore");
dojo.require("dojo.io.script");
dojo.require("dojo.data.util.sorter");
dojo.declare("dojox.data.SnapLogicStore",null,{Parts:{DATA:"data",COUNT:"count"},url:"",constructor:function(_1){
if(_1.url){
this.url=_1.url;
}
this._parameters=_1.parameters;
},_assertIsItem:function(_2){
if(!this.isItem(_2)){
throw new Error("dojox.data.SnapLogicStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_3){
if(typeof _3!=="string"){
throw new Error("dojox.data.SnapLogicStore: a function was passed an attribute argument that was not an attribute name string");
}
},getFeatures:function(){
return {"dojo.data.api.Read":true};
},getValue:function(_4,_5,_6){
this._assertIsItem(_4);
this._assertIsAttribute(_5);
var i=dojo.indexOf(_4.attributes,_5);
if(i!==-1){
return _4.values[i];
}
return _6;
},getAttributes:function(_7){
this._assertIsItem(_7);
return _7.attributes;
},hasAttribute:function(_8,_9){
this._assertIsItem(_8);
this._assertIsAttribute(_9);
for(var i=0;i<_8.attributes.length;++i){
if(_9==_8.attributes[i]){
return true;
}
}
return false;
},isItemLoaded:function(_a){
return this.isItem(_a);
},loadItem:function(_b){
},getLabel:function(_c){
return undefined;
},getLabelAttributes:function(_d){
return null;
},containsValue:function(_e,_f,_10){
return this.getValue(_e,_f)===_10;
},getValues:function(_11,_12){
this._assertIsItem(_11);
this._assertIsAttribute(_12);
var i=dojo.indexOf(_11.attributes,_12);
if(i!==-1){
return [_11.values[i]];
}
return [];
},isItem:function(_13){
if(_13&&_13._store===this){
return true;
}
return false;
},close:function(_14){
},_fetchHandler:function(_15){
var _16=_15.scope||dojo.global;
if(_15.onBegin){
_15.onBegin.call(_16,_15._countResponse[0],_15);
}
if(_15.onItem||_15.onComplete){
var _17=_15._dataResponse;
if(!_17.length){
_15.onError.call(_16,new Error("dojox.data.SnapLogicStore: invalid response of length 0"),_15);
return;
}else{
if(_15.query!="record count"){
var _18=_17.shift();
var _19=[];
for(var i=0;i<_17.length;++i){
if(_15._aborted){
break;
}
_19.push({attributes:_18,values:_17[i],_store:this});
}
if(_15.sort&&!_15._aborted){
_19.sort(dojo.data.util.sorter.createSortFunction(_15.sort,self));
}
}else{
_19=[({attributes:["count"],values:_17,_store:this})];
}
}
if(_15.onItem){
for(var i=0;i<_19.length;++i){
if(_15._aborted){
break;
}
_15.onItem.call(_16,_19[i],_15);
}
_19=null;
}
if(_15.onComplete&&!_15._aborted){
_15.onComplete.call(_16,_19,_15);
}
}
},_partHandler:function(_1a,_1b,_1c){
if(_1c instanceof Error){
if(_1b==this.Parts.DATA){
_1a._dataHandle=null;
}else{
_1a._countHandle=null;
}
_1a._aborted=true;
if(_1a.onError){
_1a.onError.call(_1a.scope,_1c,_1a);
}
}else{
if(_1a._aborted){
return;
}
if(_1b==this.Parts.DATA){
_1a._dataResponse=_1c;
}else{
_1a._countResponse=_1c;
}
if((!_1a._dataHandle||_1a._dataResponse!==null)&&(!_1a._countHandle||_1a._countResponse!==null)){
this._fetchHandler(_1a);
}
}
},fetch:function(_1d){
_1d._countResponse=null;
_1d._dataResponse=null;
_1d._aborted=false;
_1d.abort=function(){
if(!_1d._aborted){
_1d._aborted=true;
if(_1d._dataHandle&&_1d._dataHandle.cancel){
_1d._dataHandle.cancel();
}
if(_1d._countHandle&&_1d._countHandle.cancel){
_1d._countHandle.cancel();
}
}
};
if(_1d.onItem||_1d.onComplete){
var _1e=this._parameters||{};
if(_1d.start){
if(_1d.start<0){
throw new Error("dojox.data.SnapLogicStore: request start value must be 0 or greater");
}
_1e["sn.start"]=_1d.start+1;
}
if(_1d.count){
if(_1d.count<0){
throw new Error("dojox.data.SnapLogicStore: request count value 0 or greater");
}
_1e["sn.limit"]=_1d.count;
}
_1e["sn.content_type"]="application/javascript";
var _1f=this;
var _20=function(_21,_22){
if(_21 instanceof Error){
_1f._fetchHandler(_21,_1d);
}
};
var _23={url:this.url,content:_1e,timeout:60000,callbackParamName:"sn.stream_header",handle:dojo.hitch(this,"_partHandler",_1d,this.Parts.DATA)};
_1d._dataHandle=dojo.io.script.get(_23);
}
if(_1d.onBegin){
var _1e={};
_1e["sn.count"]="records";
_1e["sn.content_type"]="application/javascript";
var _23={url:this.url,content:_1e,timeout:60000,callbackParamName:"sn.stream_header",handle:dojo.hitch(this,"_partHandler",_1d,this.Parts.COUNT)};
_1d._countHandle=dojo.io.script.get(_23);
}
return _1d;
}});
}
