/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.CsvStore"]){
dojo._hasResource["dojox.data.CsvStore"]=true;
dojo.provide("dojox.data.CsvStore");
dojo.require("dojo.data.util.filter");
dojo.require("dojo.data.util.simpleFetch");
dojo.declare("dojox.data.CsvStore",null,{constructor:function(_1){
this._attributes=[];
this._attributeIndexes={};
this._dataArray=[];
this._arrayOfAllItems=[];
this._loadFinished=false;
if(_1.url){
this.url=_1.url;
}
this._csvData=_1.data;
if(_1.label){
this.label=_1.label;
}else{
if(this.label===""){
this.label=undefined;
}
}
this._storeProp="_csvStore";
this._idProp="_csvId";
this._features={"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
this._loadInProgress=false;
this._queuedFetches=[];
this.identifier=_1.identifier;
if(this.identifier===""){
delete this.identifier;
}else{
this._idMap={};
}
if("separator" in _1){
this.separator=_1.separator;
}
if("urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
},url:"",label:"",identifier:"",separator:",",urlPreventCache:false,_assertIsItem:function(_2){
if(!this.isItem(_2)){
throw new Error(this.declaredClass+": a function was passed an item argument that was not an item");
}
},_getIndex:function(_3){
var _4=this.getIdentity(_3);
if(this.identifier){
_4=this._idMap[_4];
}
return _4;
},getValue:function(_5,_6,_7){
this._assertIsItem(_5);
var _8=_7;
if(typeof _6==="string"){
var ai=this._attributeIndexes[_6];
if(ai!=null){
var _9=this._dataArray[this._getIndex(_5)];
_8=_9[ai]||_7;
}
}else{
throw new Error(this.declaredClass+": a function was passed an attribute argument that was not a string");
}
return _8;
},getValues:function(_a,_b){
var _c=this.getValue(_a,_b);
return (_c?[_c]:[]);
},getAttributes:function(_d){
this._assertIsItem(_d);
var _e=[];
var _f=this._dataArray[this._getIndex(_d)];
for(var i=0;i<_f.length;i++){
if(_f[i]!==""){
_e.push(this._attributes[i]);
}
}
return _e;
},hasAttribute:function(_10,_11){
this._assertIsItem(_10);
if(typeof _11==="string"){
var _12=this._attributeIndexes[_11];
var _13=this._dataArray[this._getIndex(_10)];
return (typeof _12!=="undefined"&&_12<_13.length&&_13[_12]!=="");
}else{
throw new Error(this.declaredClass+": a function was passed an attribute argument that was not a string");
}
},containsValue:function(_14,_15,_16){
var _17=undefined;
if(typeof _16==="string"){
_17=dojo.data.util.filter.patternToRegExp(_16,false);
}
return this._containsValue(_14,_15,_16,_17);
},_containsValue:function(_18,_19,_1a,_1b){
var _1c=this.getValues(_18,_19);
for(var i=0;i<_1c.length;++i){
var _1d=_1c[i];
if(typeof _1d==="string"&&_1b){
return (_1d.match(_1b)!==null);
}else{
if(_1a===_1d){
return true;
}
}
}
return false;
},isItem:function(_1e){
if(_1e&&_1e[this._storeProp]===this){
var _1f=_1e[this._idProp];
if(this.identifier){
var _20=this._dataArray[this._idMap[_1f]];
if(_20){
return true;
}
}else{
if(_1f>=0&&_1f<this._dataArray.length){
return true;
}
}
}
return false;
},isItemLoaded:function(_21){
return this.isItem(_21);
},loadItem:function(_22){
},getFeatures:function(){
return this._features;
},getLabel:function(_23){
if(this.label&&this.isItem(_23)){
return this.getValue(_23,this.label);
}
return undefined;
},getLabelAttributes:function(_24){
if(this.label){
return [this.label];
}
return null;
},_fetchItems:function(_25,_26,_27){
var _28=this;
var _29=function(_2a,_2b){
var _2c=null;
if(_2a.query){
var key,_2d;
_2c=[];
var _2e=_2a.queryOptions?_2a.queryOptions.ignoreCase:false;
var _2f={};
for(key in _2a.query){
_2d=_2a.query[key];
if(typeof _2d==="string"){
_2f[key]=dojo.data.util.filter.patternToRegExp(_2d,_2e);
}
}
for(var i=0;i<_2b.length;++i){
var _30=true;
var _31=_2b[i];
for(key in _2a.query){
_2d=_2a.query[key];
if(!_28._containsValue(_31,key,_2d,_2f[key])){
_30=false;
}
}
if(_30){
_2c.push(_31);
}
}
}else{
_2c=_2b.slice(0,_2b.length);
}
_26(_2c,_2a);
};
if(this._loadFinished){
_29(_25,this._arrayOfAllItems);
}else{
if(this.url!==""){
if(this._loadInProgress){
this._queuedFetches.push({args:_25,filter:_29});
}else{
this._loadInProgress=true;
var _32={url:_28.url,handleAs:"text",preventCache:_28.urlPreventCache};
var _33=dojo.xhrGet(_32);
_33.addCallback(function(_34){
try{
_28._processData(_34);
_29(_25,_28._arrayOfAllItems);
_28._handleQueuedFetches();
}
catch(e){
_27(e,_25);
}
});
_33.addErrback(function(_35){
_28._loadInProgress=false;
if(_27){
_27(_35,_25);
}else{
throw _35;
}
});
var _36=null;
if(_25.abort){
_36=_25.abort;
}
_25.abort=function(){
var df=_33;
if(df&&df.fired===-1){
df.cancel();
df=null;
}
if(_36){
_36.call(_25);
}
};
}
}else{
if(this._csvData){
try{
this._processData(this._csvData);
this._csvData=null;
_29(_25,this._arrayOfAllItems);
}
catch(e){
_27(e,_25);
}
}else{
var _37=new Error(this.declaredClass+": No CSV source data was provided as either URL or String data input.");
if(_27){
_27(_37,_25);
}else{
throw _37;
}
}
}
}
},close:function(_38){
},_getArrayOfArraysFromCsvFileContents:function(_39){
if(dojo.isString(_39)){
var _3a=new RegExp("^\\s+","g");
var _3b=new RegExp("\\s+$","g");
var _3c=new RegExp("\"\"","g");
var _3d=[];
var i;
var _3e=this._splitLines(_39);
for(i=0;i<_3e.length;++i){
var _3f=_3e[i];
if(_3f.length>0){
var _40=_3f.split(this.separator);
var j=0;
while(j<_40.length){
var _41=_40[j];
var _42=_41.replace(_3a,"");
var _43=_42.replace(_3b,"");
var _44=_43.charAt(0);
var _45=_43.charAt(_43.length-1);
var _46=_43.charAt(_43.length-2);
var _47=_43.charAt(_43.length-3);
if(_43.length===2&&_43=="\"\""){
_40[j]="";
}else{
if((_44=="\"")&&((_45!="\"")||((_45=="\"")&&(_46=="\"")&&(_47!="\"")))){
if(j+1===_40.length){
return;
}
var _48=_40[j+1];
_40[j]=_42+this.separator+_48;
_40.splice(j+1,1);
}else{
if((_44=="\"")&&(_45=="\"")){
_43=_43.slice(1,(_43.length-1));
_43=_43.replace(_3c,"\"");
}
_40[j]=_43;
j+=1;
}
}
}
_3d.push(_40);
}
}
this._attributes=_3d.shift();
for(i=0;i<this._attributes.length;i++){
this._attributeIndexes[this._attributes[i]]=i;
}
this._dataArray=_3d;
}
},_splitLines:function(_49){
var _4a=[];
var i;
var _4b="";
var _4c=false;
for(i=0;i<_49.length;i++){
var c=_49.charAt(i);
switch(c){
case "\"":
_4c=!_4c;
_4b+=c;
break;
case "\r":
if(_4c){
_4b+=c;
}else{
_4a.push(_4b);
_4b="";
if(i<(_49.length-1)&&_49.charAt(i+1)=="\n"){
i++;
}
}
break;
case "\n":
if(_4c){
_4b+=c;
}else{
_4a.push(_4b);
_4b="";
}
break;
default:
_4b+=c;
}
}
if(_4b!==""){
_4a.push(_4b);
}
return _4a;
},_processData:function(_4d){
this._getArrayOfArraysFromCsvFileContents(_4d);
this._arrayOfAllItems=[];
if(this.identifier){
if(this._attributeIndexes[this.identifier]===undefined){
throw new Error(this.declaredClass+": Identity specified is not a column header in the data set.");
}
}
for(var i=0;i<this._dataArray.length;i++){
var id=i;
if(this.identifier){
var _4e=this._dataArray[i];
id=_4e[this._attributeIndexes[this.identifier]];
this._idMap[id]=i;
}
this._arrayOfAllItems.push(this._createItemFromIdentity(id));
}
this._loadFinished=true;
this._loadInProgress=false;
},_createItemFromIdentity:function(_4f){
var _50={};
_50[this._storeProp]=this;
_50[this._idProp]=_4f;
return _50;
},getIdentity:function(_51){
if(this.isItem(_51)){
return _51[this._idProp];
}
return null;
},fetchItemByIdentity:function(_52){
var _53;
var _54=_52.scope?_52.scope:dojo.global;
if(!this._loadFinished){
var _55=this;
if(this.url!==""){
if(this._loadInProgress){
this._queuedFetches.push({args:_52});
}else{
this._loadInProgress=true;
var _56={url:_55.url,handleAs:"text"};
var _57=dojo.xhrGet(_56);
_57.addCallback(function(_58){
try{
_55._processData(_58);
var _59=_55._createItemFromIdentity(_52.identity);
if(!_55.isItem(_59)){
_59=null;
}
if(_52.onItem){
_52.onItem.call(_54,_59);
}
_55._handleQueuedFetches();
}
catch(error){
if(_52.onError){
_52.onError.call(_54,error);
}
}
});
_57.addErrback(function(_5a){
this._loadInProgress=false;
if(_52.onError){
_52.onError.call(_54,_5a);
}
});
}
}else{
if(this._csvData){
try{
_55._processData(_55._csvData);
_55._csvData=null;
_53=_55._createItemFromIdentity(_52.identity);
if(!_55.isItem(_53)){
_53=null;
}
if(_52.onItem){
_52.onItem.call(_54,_53);
}
}
catch(e){
if(_52.onError){
_52.onError.call(_54,e);
}
}
}
}
}else{
_53=this._createItemFromIdentity(_52.identity);
if(!this.isItem(_53)){
_53=null;
}
if(_52.onItem){
_52.onItem.call(_54,_53);
}
}
},getIdentityAttributes:function(_5b){
if(this.identifier){
return [this.identifier];
}else{
return null;
}
},_handleQueuedFetches:function(){
if(this._queuedFetches.length>0){
for(var i=0;i<this._queuedFetches.length;i++){
var _5c=this._queuedFetches[i];
var _5d=_5c.filter;
var _5e=_5c.args;
if(_5d){
_5d(_5e,this._arrayOfAllItems);
}else{
this.fetchItemByIdentity(_5c.args);
}
}
this._queuedFetches=[];
}
}});
dojo.extend(dojox.data.CsvStore,dojo.data.util.simpleFetch);
}
