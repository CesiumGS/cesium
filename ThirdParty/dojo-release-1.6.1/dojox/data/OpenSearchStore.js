/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.OpenSearchStore"]){
dojo._hasResource["dojox.data.OpenSearchStore"]=true;
dojo.provide("dojox.data.OpenSearchStore");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojox.xml.DomParser");
dojo.require("dojox.xml.parser");
dojo.experimental("dojox.data.OpenSearchStore");
dojo.declare("dojox.data.OpenSearchStore",null,{constructor:function(_1){
if(_1){
this.label=_1.label;
this.url=_1.url;
this.itemPath=_1.itemPath;
if("urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
}
var _2=dojo.xhrGet({url:this.url,handleAs:"xml",sync:true,preventCache:this.urlPreventCache});
_2.addCallback(this,"_processOsdd");
_2.addErrback(function(){
throw new Error("Unable to load OpenSearch Description document from ".args.url);
});
},url:"",itemPath:"",_storeRef:"_S",urlElement:null,iframeElement:null,urlPreventCache:true,ATOM_CONTENT_TYPE:3,ATOM_CONTENT_TYPE_STRING:"atom",RSS_CONTENT_TYPE:2,RSS_CONTENT_TYPE_STRING:"rss",XML_CONTENT_TYPE:1,XML_CONTENT_TYPE_STRING:"xml",_assertIsItem:function(_3){
if(!this.isItem(_3)){
throw new Error("dojox.data.OpenSearchStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_4){
if(typeof _4!=="string"){
throw new Error("dojox.data.OpenSearchStore: a function was passed an attribute argument that was not an attribute name string");
}
},getFeatures:function(){
return {"dojo.data.api.Read":true};
},getValue:function(_5,_6,_7){
var _8=this.getValues(_5,_6);
if(_8){
return _8[0];
}
return _7;
},getAttributes:function(_9){
return ["content"];
},hasAttribute:function(_a,_b){
if(this.getValue(_a,_b)){
return true;
}
return false;
},isItemLoaded:function(_c){
return this.isItem(_c);
},loadItem:function(_d){
},getLabel:function(_e){
return undefined;
},getLabelAttributes:function(_f){
return null;
},containsValue:function(_10,_11,_12){
var _13=this.getValues(_10,_11);
for(var i=0;i<_13.length;i++){
if(_13[i]===_12){
return true;
}
}
return false;
},getValues:function(_14,_15){
this._assertIsItem(_14);
this._assertIsAttribute(_15);
var _16=this.processItem(_14,_15);
if(_16){
return [_16];
}
return undefined;
},isItem:function(_17){
if(_17&&_17[this._storeRef]===this){
return true;
}
return false;
},close:function(_18){
},process:function(_19){
return this["_processOSD"+this.contentType](_19);
},processItem:function(_1a,_1b){
return this["_processItem"+this.contentType](_1a.node,_1b);
},_createSearchUrl:function(_1c){
var _1d=this.urlElement.attributes.getNamedItem("template").nodeValue;
var _1e=this.urlElement.attributes;
var _1f=_1d.indexOf("{searchTerms}");
_1d=_1d.substring(0,_1f)+_1c.query.searchTerms+_1d.substring(_1f+13);
dojo.forEach([{"name":"count","test":_1c.count,"def":"10"},{"name":"startIndex","test":_1c.start,"def":this.urlElement.attributes.getNamedItem("indexOffset")?this.urlElement.attributes.getNamedItem("indexOffset").nodeValue:0},{"name":"startPage","test":_1c.startPage,"def":this.urlElement.attributes.getNamedItem("pageOffset")?this.urlElement.attributes.getNamedItem("pageOffset").nodeValue:0},{"name":"language","test":_1c.language,"def":"*"},{"name":"inputEncoding","test":_1c.inputEncoding,"def":"UTF-8"},{"name":"outputEncoding","test":_1c.outputEncoding,"def":"UTF-8"}],function(_20){
_1d=_1d.replace("{"+_20.name+"}",_20.test||_20.def);
_1d=_1d.replace("{"+_20.name+"?}",_20.test||_20.def);
});
return _1d;
},_fetchItems:function(_21,_22,_23){
if(!_21.query){
_21.query={};
}
var _24=this;
var url=this._createSearchUrl(_21);
var _25={url:url,preventCache:this.urlPreventCache};
var xhr=dojo.xhrGet(_25);
xhr.addErrback(function(_26){
_23(_26,_21);
});
xhr.addCallback(function(_27){
var _28=[];
if(_27){
_28=_24.process(_27);
for(var i=0;i<_28.length;i++){
_28[i]={node:_28[i]};
_28[i][_24._storeRef]=_24;
}
}
_22(_28,_21);
});
},_processOSDxml:function(_29){
var div=dojo.doc.createElement("div");
div.innerHTML=_29;
return dojo.query(this.itemPath,div);
},_processItemxml:function(_2a,_2b){
if(_2b==="content"){
return _2a.innerHTML;
}
return undefined;
},_processOSDatom:function(_2c){
return this._processOSDfeed(_2c,"entry");
},_processItematom:function(_2d,_2e){
return this._processItemfeed(_2d,_2e,"content");
},_processOSDrss:function(_2f){
return this._processOSDfeed(_2f,"item");
},_processItemrss:function(_30,_31){
return this._processItemfeed(_30,_31,"description");
},_processOSDfeed:function(_32,_33){
_32=dojox.xml.parser.parse(_32);
var _34=[];
var _35=_32.getElementsByTagName(_33);
for(var i=0;i<_35.length;i++){
_34.push(_35.item(i));
}
return _34;
},_processItemfeed:function(_36,_37,_38){
if(_37==="content"){
var _39=_36.getElementsByTagName(_38).item(0);
return this._getNodeXml(_39,true);
}
return undefined;
},_getNodeXml:function(_3a,_3b){
var i;
switch(_3a.nodeType){
case 1:
var xml=[];
if(!_3b){
xml.push("<"+_3a.tagName);
var _3c;
for(i=0;i<_3a.attributes.length;i++){
_3c=_3a.attributes.item(i);
xml.push(" "+_3c.nodeName+"=\""+_3c.nodeValue+"\"");
}
xml.push(">");
}
for(i=0;i<_3a.childNodes.length;i++){
xml.push(this._getNodeXml(_3a.childNodes.item(i)));
}
if(!_3b){
xml.push("</"+_3a.tagName+">\n");
}
return xml.join("");
case 3:
case 4:
return _3a.nodeValue;
}
return undefined;
},_processOsdd:function(doc){
var _3d=doc.getElementsByTagName("Url");
var _3e=[];
var _3f;
var i;
for(i=0;i<_3d.length;i++){
_3f=_3d[i].attributes.getNamedItem("type").nodeValue;
switch(_3f){
case "application/rss+xml":
_3e[i]=this.RSS_CONTENT_TYPE;
break;
case "application/atom+xml":
_3e[i]=this.ATOM_CONTENT_TYPE;
break;
default:
_3e[i]=this.XML_CONTENT_TYPE;
break;
}
}
var _40=0;
var _41=_3e[0];
for(i=1;i<_3d.length;i++){
if(_3e[i]>_41){
_40=i;
_41=_3e[i];
}
}
var _42=_3d[_40].nodeName.toLowerCase();
if(_42=="url"){
var _43=_3d[_40].attributes;
this.urlElement=_3d[_40];
switch(_3e[_40]){
case this.ATOM_CONTENT_TYPE:
this.contentType=this.ATOM_CONTENT_TYPE_STRING;
break;
case this.RSS_CONTENT_TYPE:
this.contentType=this.RSS_CONTENT_TYPE_STRING;
break;
case this.XML_CONTENT_TYPE:
this.contentType=this.XML_CONTENT_TYPE_STRING;
break;
}
}
}});
dojo.extend(dojox.data.OpenSearchStore,dojo.data.util.simpleFetch);
}
