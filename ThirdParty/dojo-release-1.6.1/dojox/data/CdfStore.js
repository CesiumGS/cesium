/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.CdfStore"]){
dojo._hasResource["dojox.data.CdfStore"]=true;
dojo.provide("dojox.data.CdfStore");
dojo.require("dojo.data.util.sorter");
dojox.data.ASYNC_MODE=0;
dojox.data.SYNC_MODE=1;
dojo.declare("dojox.data.CdfStore",null,{identity:"jsxid",url:"",xmlStr:"",data:null,label:"",mode:dojox.data.ASYNC_MODE,constructor:function(_1){
if(_1){
this.url=_1.url;
this.xmlStr=_1.xmlStr||_1.str;
if(_1.data){
this.xmlStr=this._makeXmlString(_1.data);
}
this.identity=_1.identity||this.identity;
this.label=_1.label||this.label;
this.mode=_1.mode!==undefined?_1.mode:this.mode;
}
this._modifiedItems={};
this.byId=this.fetchItemByIdentity;
},getValue:function(_2,_3,_4){
return _2.getAttribute(_3)||_4;
},getValues:function(_5,_6){
var v=this.getValue(_5,_6,[]);
return dojo.isArray(v)?v:[v];
},getAttributes:function(_7){
return _7.getAttributeNames();
},hasAttribute:function(_8,_9){
return (this.getValue(_8,_9)!==undefined);
},hasProperty:function(_a,_b){
return this.hasAttribute(_a,_b);
},containsValue:function(_c,_d,_e){
var _f=this.getValues(_c,_d);
for(var i=0;i<_f.length;i++){
if(_f[i]===null){
continue;
}
if((typeof _e==="string")){
if(_f[i].toString&&_f[i].toString()===_e){
return true;
}
}else{
if(_f[i]===_e){
return true;
}
}
}
return false;
},isItem:function(_10){
if(_10.getClass&&_10.getClass().equals(jsx3.xml.Entity.jsxclass)){
return true;
}
return false;
},isItemLoaded:function(_11){
return this.isItem(_11);
},loadItem:function(_12){
},getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Write":true,"dojo.data.api.Identity":true};
},getLabel:function(_13){
if((this.label!=="")&&this.isItem(_13)){
var _14=this.getValue(_13,this.label);
if(_14){
return _14.toString();
}
}
return undefined;
},getLabelAttributes:function(_15){
if(this.label!==""){
return [this.label];
}
return null;
},fetch:function(_16){
_16=_16||{};
if(!_16.store){
_16.store=this;
}
if(_16.mode!==undefined){
this.mode=_16.mode;
}
var _17=this;
var _18=function(_19){
if(_16.onError){
var _1a=_16.scope||dojo.global;
_16.onError.call(_1a,_19,_16);
}else{
console.error("cdfStore Error:",_19);
}
};
var _1b=function(_1c,_1d){
_1d=_1d||_16;
var _1e=_1d.abort||null;
var _1f=false;
var _20=_1d.start?_1d.start:0;
var _21=(_1d.count&&(_1d.count!==Infinity))?(_20+_1d.count):_1c.length;
_1d.abort=function(){
_1f=true;
if(_1e){
_1e.call(_1d);
}
};
var _22=_1d.scope||dojo.global;
if(!_1d.store){
_1d.store=_17;
}
if(_1d.onBegin){
_1d.onBegin.call(_22,_1c.length,_1d);
}
if(_1d.sort){
_1c.sort(dojo.data.util.sorter.createSortFunction(_1d.sort,_17));
}
if(_1d.onItem){
for(var i=_20;(i<_1c.length)&&(i<_21);++i){
var _23=_1c[i];
if(!_1f){
_1d.onItem.call(_22,_23,_1d);
}
}
}
if(_1d.onComplete&&!_1f){
if(!_1d.onItem){
_1c=_1c.slice(_20,_21);
if(_1d.byId){
_1c=_1c[0];
}
}
_1d.onComplete.call(_22,_1c,_1d);
}else{
_1c=_1c.slice(_20,_21);
if(_1d.byId){
_1c=_1c[0];
}
}
return _1c;
};
if(!this.url&&!this.data&&!this.xmlStr){
_18(new Error("No URL or data specified."));
return false;
}
var _24=_16||"*";
if(this.mode==dojox.data.SYNC_MODE){
var res=this._loadCDF();
if(res instanceof Error){
if(_16.onError){
_16.onError.call(_16.scope||dojo.global,res,_16);
}else{
console.error("CdfStore Error:",res);
}
return res;
}
this.cdfDoc=res;
var _25=this._getItems(this.cdfDoc,_24);
if(_25&&_25.length>0){
_25=_1b(_25,_16);
}else{
_25=_1b([],_16);
}
return _25;
}else{
var dfd=this._loadCDF();
dfd.addCallbacks(dojo.hitch(this,function(_26){
var _27=this._getItems(this.cdfDoc,_24);
if(_27&&_27.length>0){
_1b(_27,_16);
}else{
_1b([],_16);
}
}),dojo.hitch(this,function(err){
_18(err,_16);
}));
return dfd;
}
},_loadCDF:function(){
var dfd=new dojo.Deferred();
if(this.cdfDoc){
if(this.mode==dojox.data.SYNC_MODE){
return this.cdfDoc;
}else{
setTimeout(dojo.hitch(this,function(){
dfd.callback(this.cdfDoc);
}),0);
return dfd;
}
}
this.cdfDoc=jsx3.xml.CDF.Document.newDocument();
this.cdfDoc.subscribe("response",this,function(evt){
dfd.callback(this.cdfDoc);
});
this.cdfDoc.subscribe("error",this,function(err){
dfd.errback(err);
});
this.cdfDoc.setAsync(!this.mode);
if(this.url){
this.cdfDoc.load(this.url);
}else{
if(this.xmlStr){
this.cdfDoc.loadXML(this.xmlStr);
if(this.cdfDoc.getError().code){
return new Error(this.cdfDoc.getError().description);
}
}
}
if(this.mode==dojox.data.SYNC_MODE){
return this.cdfDoc;
}else{
return dfd;
}
},_getItems:function(_28,_29){
var itr=_28.selectNodes(_29.query,false,1);
var _2a=[];
while(itr.hasNext()){
_2a.push(itr.next());
}
return _2a;
},close:function(_2b){
},newItem:function(_2c,_2d){
_2c=(_2c||{});
if(_2c.tagName){
if(_2c.tagName!="record"){
console.warn("Only record inserts are supported at this time");
}
delete _2c.tagName;
}
_2c.jsxid=_2c.jsxid||this.cdfDoc.getKey();
if(this.isItem(_2d)){
_2d=this.getIdentity(_2d);
}
var _2e=this.cdfDoc.insertRecord(_2c,_2d);
this._makeDirty(_2e);
return _2e;
},deleteItem:function(_2f){
this.cdfDoc.deleteRecord(this.getIdentity(_2f));
this._makeDirty(_2f);
return true;
},setValue:function(_30,_31,_32){
this._makeDirty(_30);
_30.setAttribute(_31,_32);
return true;
},setValues:function(_33,_34,_35){
this._makeDirty(_33);
console.warn("cdfStore.setValues only partially implemented.");
return _33.setAttribute(_34,_35);
},unsetAttribute:function(_36,_37){
this._makeDirty(_36);
_36.removeAttribute(_37);
return true;
},revert:function(){
delete this.cdfDoc;
this._modifiedItems={};
return true;
},isDirty:function(_38){
if(_38){
return !!this._modifiedItems[this.getIdentity(_38)];
}else{
var _39=false;
for(var nm in this._modifiedItems){
_39=true;
break;
}
return _39;
}
},_makeDirty:function(_3a){
var id=this.getIdentity(_3a);
this._modifiedItems[id]=_3a;
},_makeXmlString:function(obj){
var _3b=function(obj,_3c){
var _3d="";
var nm;
if(dojo.isArray(obj)){
for(var i=0;i<obj.length;i++){
_3d+=_3b(obj[i],_3c);
}
}else{
if(dojo.isObject(obj)){
_3d+="<"+_3c+" ";
for(nm in obj){
if(!dojo.isObject(obj[nm])){
_3d+=nm+"=\""+obj[nm]+"\" ";
}
}
_3d+=">";
for(nm in obj){
if(dojo.isObject(obj[nm])){
_3d+=_3b(obj[nm],nm);
}
}
_3d+="</"+_3c+">";
}
}
return _3d;
};
return _3b(obj,"data");
},getIdentity:function(_3e){
return this.getValue(_3e,this.identity);
},getIdentityAttributes:function(_3f){
return [this.identity];
},fetchItemByIdentity:function(_40){
if(dojo.isString(_40)){
var id=_40;
_40={query:"//record[@jsxid='"+id+"']",mode:dojox.data.SYNC_MODE};
}else{
if(_40){
_40.query="//record[@jsxid='"+_40.identity+"']";
}
if(!_40.mode){
_40.mode=this.mode;
}
}
_40.byId=true;
return this.fetch(_40);
},byId:function(_41){
}});
}
