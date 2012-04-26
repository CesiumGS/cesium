/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.AtomReadStore"]){
dojo._hasResource["dojox.data.AtomReadStore"]=true;
dojo.provide("dojox.data.AtomReadStore");
dojo.require("dojo.data.util.filter");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.date.stamp");
dojo.experimental("dojox.data.AtomReadStore");
dojo.declare("dojox.data.AtomReadStore",null,{constructor:function(_1){
if(_1){
this.url=_1.url;
this.rewriteUrl=_1.rewriteUrl;
this.label=_1.label||this.label;
this.sendQuery=(_1.sendQuery||_1.sendquery||this.sendQuery);
this.unescapeHTML=_1.unescapeHTML;
if("urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
}
if(!this.url){
throw new Error("AtomReadStore: a URL must be specified when creating the data store");
}
},url:"",label:"title",sendQuery:false,unescapeHTML:false,urlPreventCache:false,getValue:function(_2,_3,_4){
this._assertIsItem(_2);
this._assertIsAttribute(_3);
this._initItem(_2);
_3=_3.toLowerCase();
if(!_2._attribs[_3]&&!_2._parsed){
this._parseItem(_2);
_2._parsed=true;
}
var _5=_2._attribs[_3];
if(!_5&&_3=="summary"){
var _6=this.getValue(_2,"content");
var _7=new RegExp("/(<([^>]+)>)/g","i");
var _8=_6.text.replace(_7,"");
_5={text:_8.substring(0,Math.min(400,_8.length)),type:"text"};
_2._attribs[_3]=_5;
}
if(_5&&this.unescapeHTML){
if((_3=="content"||_3=="summary"||_3=="subtitle")&&!_2["_"+_3+"Escaped"]){
_5.text=this._unescapeHTML(_5.text);
_2["_"+_3+"Escaped"]=true;
}
}
return _5?dojo.isArray(_5)?_5[0]:_5:_4;
},getValues:function(_9,_a){
this._assertIsItem(_9);
this._assertIsAttribute(_a);
this._initItem(_9);
_a=_a.toLowerCase();
if(!_9._attribs[_a]){
this._parseItem(_9);
}
var _b=_9._attribs[_a];
return _b?((_b.length!==undefined&&typeof (_b)!=="string")?_b:[_b]):undefined;
},getAttributes:function(_c){
this._assertIsItem(_c);
if(!_c._attribs){
this._initItem(_c);
this._parseItem(_c);
}
var _d=[];
for(var x in _c._attribs){
_d.push(x);
}
return _d;
},hasAttribute:function(_e,_f){
return (this.getValue(_e,_f)!==undefined);
},containsValue:function(_10,_11,_12){
var _13=this.getValues(_10,_11);
for(var i=0;i<_13.length;i++){
if((typeof _12==="string")){
if(_13[i].toString&&_13[i].toString()===_12){
return true;
}
}else{
if(_13[i]===_12){
return true;
}
}
}
return false;
},isItem:function(_14){
if(_14&&_14.element&&_14.store&&_14.store===this){
return true;
}
return false;
},isItemLoaded:function(_15){
return this.isItem(_15);
},loadItem:function(_16){
},getFeatures:function(){
var _17={"dojo.data.api.Read":true};
return _17;
},getLabel:function(_18){
if((this.label!=="")&&this.isItem(_18)){
var _19=this.getValue(_18,this.label);
if(_19&&_19.text){
return _19.text;
}else{
if(_19){
return _19.toString();
}else{
return undefined;
}
}
}
return undefined;
},getLabelAttributes:function(_1a){
if(this.label!==""){
return [this.label];
}
return null;
},getFeedValue:function(_1b,_1c){
var _1d=this.getFeedValues(_1b,_1c);
if(dojo.isArray(_1d)){
return _1d[0];
}
return _1d;
},getFeedValues:function(_1e,_1f){
if(!this.doc){
return _1f;
}
if(!this._feedMetaData){
this._feedMetaData={element:this.doc.getElementsByTagName("feed")[0],store:this,_attribs:{}};
this._parseItem(this._feedMetaData);
}
return this._feedMetaData._attribs[_1e]||_1f;
},_initItem:function(_20){
if(!_20._attribs){
_20._attribs={};
}
},_fetchItems:function(_21,_22,_23){
var url=this._getFetchUrl(_21);
if(!url){
_23(new Error("No URL specified."));
return;
}
var _24=(!this.sendQuery?_21:null);
var _25=this;
var _26=function(_27){
_25.doc=_27;
var _28=_25._getItems(_27,_24);
var _29=_21.query;
if(_29){
if(_29.id){
_28=dojo.filter(_28,function(_2a){
return (_25.getValue(_2a,"id")==_29.id);
});
}else{
if(_29.category){
_28=dojo.filter(_28,function(_2b){
var _2c=_25.getValues(_2b,"category");
if(!_2c){
return false;
}
return dojo.some(_2c,"return item.term=='"+_29.category+"'");
});
}
}
}
if(_28&&_28.length>0){
_22(_28,_21);
}else{
_22([],_21);
}
};
if(this.doc){
_26(this.doc);
}else{
var _2d={url:url,handleAs:"xml",preventCache:this.urlPreventCache};
var _2e=dojo.xhrGet(_2d);
_2e.addCallback(_26);
_2e.addErrback(function(_2f){
_23(_2f,_21);
});
}
},_getFetchUrl:function(_30){
if(!this.sendQuery){
return this.url;
}
var _31=_30.query;
if(!_31){
return this.url;
}
if(dojo.isString(_31)){
return this.url+_31;
}
var _32="";
for(var _33 in _31){
var _34=_31[_33];
if(_34){
if(_32){
_32+="&";
}
_32+=(_33+"="+_34);
}
}
if(!_32){
return this.url;
}
var _35=this.url;
if(_35.indexOf("?")<0){
_35+="?";
}else{
_35+="&";
}
return _35+_32;
},_getItems:function(_36,_37){
if(this._items){
return this._items;
}
var _38=[];
var _39=[];
if(_36.childNodes.length<1){
this._items=_38;
return _38;
}
var _3a=dojo.filter(_36.childNodes,"return item.tagName && item.tagName.toLowerCase() == 'feed'");
var _3b=_37.query;
if(!_3a||_3a.length!=1){
return _38;
}
_39=dojo.filter(_3a[0].childNodes,"return item.tagName && item.tagName.toLowerCase() == 'entry'");
if(_37.onBegin){
_37.onBegin(_39.length,this.sendQuery?_37:{});
}
for(var i=0;i<_39.length;i++){
var _3c=_39[i];
if(_3c.nodeType!=1){
continue;
}
_38.push(this._getItem(_3c));
}
this._items=_38;
return _38;
},close:function(_3d){
},_getItem:function(_3e){
return {element:_3e,store:this};
},_parseItem:function(_3f){
var _40=_3f._attribs;
var _41=this;
var _42,_43;
function _44(_45){
var txt=_45.textContent||_45.innerHTML||_45.innerXML;
if(!txt&&_45.childNodes[0]){
var _46=_45.childNodes[0];
if(_46&&(_46.nodeType==3||_46.nodeType==4)){
txt=_45.childNodes[0].nodeValue;
}
}
return txt;
};
function _47(_48){
return {text:_44(_48),type:_48.getAttribute("type")};
};
dojo.forEach(_3f.element.childNodes,function(_49){
var _4a=_49.tagName?_49.tagName.toLowerCase():"";
switch(_4a){
case "title":
_40[_4a]={text:_44(_49),type:_49.getAttribute("type")};
break;
case "subtitle":
case "summary":
case "content":
_40[_4a]=_47(_49);
break;
case "author":
var _4b,_4c;
dojo.forEach(_49.childNodes,function(_4d){
if(!_4d.tagName){
return;
}
switch(_4d.tagName.toLowerCase()){
case "name":
_4b=_4d;
break;
case "uri":
_4c=_4d;
break;
}
});
var _4e={};
if(_4b&&_4b.length==1){
_4e.name=_44(_4b[0]);
}
if(_4c&&_4c.length==1){
_4e.uri=_44(_4c[0]);
}
_40[_4a]=_4e;
break;
case "id":
_40[_4a]=_44(_49);
break;
case "updated":
_40[_4a]=dojo.date.stamp.fromISOString(_44(_49));
break;
case "published":
_40[_4a]=dojo.date.stamp.fromISOString(_44(_49));
break;
case "category":
if(!_40[_4a]){
_40[_4a]=[];
}
_40[_4a].push({scheme:_49.getAttribute("scheme"),term:_49.getAttribute("term")});
break;
case "link":
if(!_40[_4a]){
_40[_4a]=[];
}
var _4f={rel:_49.getAttribute("rel"),href:_49.getAttribute("href"),type:_49.getAttribute("type")};
_40[_4a].push(_4f);
if(_4f.rel=="alternate"){
_40["alternate"]=_4f;
}
break;
default:
break;
}
});
},_unescapeHTML:function(_50){
_50=_50.replace(/&#8217;/m,"'").replace(/&#8243;/m,"\"").replace(/&#60;/m,">").replace(/&#62;/m,"<").replace(/&#38;/m,"&");
return _50;
},_assertIsItem:function(_51){
if(!this.isItem(_51)){
throw new Error("dojox.data.AtomReadStore: Invalid item argument.");
}
},_assertIsAttribute:function(_52){
if(typeof _52!=="string"){
throw new Error("dojox.data.AtomReadStore: Invalid attribute argument.");
}
}});
dojo.extend(dojox.data.AtomReadStore,dojo.data.util.simpleFetch);
}
