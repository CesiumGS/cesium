/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.XmlStore"]){
dojo._hasResource["dojox.data.XmlStore"]=true;
dojo.provide("dojox.data.XmlStore");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.data.util.filter");
dojo.require("dojox.xml.parser");
dojo.provide("dojox.data.XmlItem");
dojo.declare("dojox.data.XmlStore",null,{constructor:function(_1){
if(_1){
this.url=_1.url;
this.rootItem=(_1.rootItem||_1.rootitem||this.rootItem);
this.keyAttribute=(_1.keyAttribute||_1.keyattribute||this.keyAttribute);
this._attributeMap=(_1.attributeMap||_1.attributemap);
this.label=_1.label||this.label;
this.sendQuery=(_1.sendQuery||_1.sendquery||this.sendQuery);
if("urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
}
this._newItems=[];
this._deletedItems=[];
this._modifiedItems=[];
},url:"",rootItem:"",keyAttribute:"",label:"",sendQuery:false,attributeMap:null,urlPreventCache:true,getValue:function(_2,_3,_4){
var _5=_2.element;
var i;
var _6;
if(_3==="tagName"){
return _5.nodeName;
}else{
if(_3==="childNodes"){
for(i=0;i<_5.childNodes.length;i++){
_6=_5.childNodes[i];
if(_6.nodeType===1){
return this._getItem(_6);
}
}
return _4;
}else{
if(_3==="text()"){
for(i=0;i<_5.childNodes.length;i++){
_6=_5.childNodes[i];
if(_6.nodeType===3||_6.nodeType===4){
return _6.nodeValue;
}
}
return _4;
}else{
_3=this._getAttribute(_5.nodeName,_3);
if(_3.charAt(0)==="@"){
var _7=_3.substring(1);
var _8=_5.getAttribute(_7);
return (_8)?_8:_4;
}else{
for(i=0;i<_5.childNodes.length;i++){
_6=_5.childNodes[i];
if(_6.nodeType===1&&_6.nodeName===_3){
return this._getItem(_6);
}
}
return _4;
}
}
}
}
},getValues:function(_9,_a){
var _b=_9.element;
var _c=[];
var i;
var _d;
if(_a==="tagName"){
return [_b.nodeName];
}else{
if(_a==="childNodes"){
for(i=0;i<_b.childNodes.length;i++){
_d=_b.childNodes[i];
if(_d.nodeType===1){
_c.push(this._getItem(_d));
}
}
return _c;
}else{
if(_a==="text()"){
var ec=_b.childNodes;
for(i=0;i<ec.length;i++){
_d=ec[i];
if(_d.nodeType===3||_d.nodeType===4){
_c.push(_d.nodeValue);
}
}
return _c;
}else{
_a=this._getAttribute(_b.nodeName,_a);
if(_a.charAt(0)==="@"){
var _e=_a.substring(1);
var _f=_b.getAttribute(_e);
return (_f!==undefined)?[_f]:[];
}else{
for(i=0;i<_b.childNodes.length;i++){
_d=_b.childNodes[i];
if(_d.nodeType===1&&_d.nodeName===_a){
_c.push(this._getItem(_d));
}
}
return _c;
}
}
}
}
},getAttributes:function(_10){
var _11=_10.element;
var _12=[];
var i;
_12.push("tagName");
if(_11.childNodes.length>0){
var _13={};
var _14=true;
var _15=false;
for(i=0;i<_11.childNodes.length;i++){
var _16=_11.childNodes[i];
if(_16.nodeType===1){
var _17=_16.nodeName;
if(!_13[_17]){
_12.push(_17);
_13[_17]=_17;
}
_14=true;
}else{
if(_16.nodeType===3){
_15=true;
}
}
}
if(_14){
_12.push("childNodes");
}
if(_15){
_12.push("text()");
}
}
for(i=0;i<_11.attributes.length;i++){
_12.push("@"+_11.attributes[i].nodeName);
}
if(this._attributeMap){
for(var key in this._attributeMap){
i=key.indexOf(".");
if(i>0){
var _18=key.substring(0,i);
if(_18===_11.nodeName){
_12.push(key.substring(i+1));
}
}else{
_12.push(key);
}
}
}
return _12;
},hasAttribute:function(_19,_1a){
return (this.getValue(_19,_1a)!==undefined);
},containsValue:function(_1b,_1c,_1d){
var _1e=this.getValues(_1b,_1c);
for(var i=0;i<_1e.length;i++){
if((typeof _1d==="string")){
if(_1e[i].toString&&_1e[i].toString()===_1d){
return true;
}
}else{
if(_1e[i]===_1d){
return true;
}
}
}
return false;
},isItem:function(_1f){
if(_1f&&_1f.element&&_1f.store&&_1f.store===this){
return true;
}
return false;
},isItemLoaded:function(_20){
return this.isItem(_20);
},loadItem:function(_21){
},getFeatures:function(){
var _22={"dojo.data.api.Read":true,"dojo.data.api.Write":true};
if(!this.sendQuery||this.keyAttribute!==""){
_22["dojo.data.api.Identity"]=true;
}
return _22;
},getLabel:function(_23){
if((this.label!=="")&&this.isItem(_23)){
var _24=this.getValue(_23,this.label);
if(_24){
return _24.toString();
}
}
return undefined;
},getLabelAttributes:function(_25){
if(this.label!==""){
return [this.label];
}
return null;
},_fetchItems:function(_26,_27,_28){
var url=this._getFetchUrl(_26);
if(!url){
_28(new Error("No URL specified."));
return;
}
var _29=(!this.sendQuery?_26:{});
var _2a=this;
var _2b={url:url,handleAs:"xml",preventCache:_2a.urlPreventCache};
var _2c=dojo.xhrGet(_2b);
_2c.addCallback(function(_2d){
var _2e=_2a._getItems(_2d,_29);
if(_2e&&_2e.length>0){
_27(_2e,_26);
}else{
_27([],_26);
}
});
_2c.addErrback(function(_2f){
_28(_2f,_26);
});
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
var _38=null;
if(_37){
_38=_37.query;
}
var _39=[];
var _3a=null;
if(this.rootItem!==""){
_3a=dojo.query(this.rootItem,_36);
}else{
_3a=_36.documentElement.childNodes;
}
var _3b=_37.queryOptions?_37.queryOptions.deep:false;
if(_3b){
_3a=this._flattenNodes(_3a);
}
for(var i=0;i<_3a.length;i++){
var _3c=_3a[i];
if(_3c.nodeType!=1){
continue;
}
var _3d=this._getItem(_3c);
if(_38){
var _3e=_37.queryOptions?_37.queryOptions.ignoreCase:false;
var _3f;
var _40=false;
var j;
var _41=true;
var _42={};
for(var key in _38){
_3f=_38[key];
if(typeof _3f==="string"){
_42[key]=dojo.data.util.filter.patternToRegExp(_3f,_3e);
}
}
for(var _43 in _38){
_41=false;
var _44=this.getValues(_3d,_43);
for(j=0;j<_44.length;j++){
_3f=_44[j];
if(_3f){
var _45=_38[_43];
if((typeof _3f)==="string"&&(_42[_43])){
if((_3f.match(_42[_43]))!==null){
_40=true;
}else{
_40=false;
}
}else{
if((typeof _3f)==="object"){
if(_3f.toString&&(_42[_43])){
var _46=_3f.toString();
if((_46.match(_42[_43]))!==null){
_40=true;
}else{
_40=false;
}
}else{
if(_45==="*"||_45===_3f){
_40=true;
}else{
_40=false;
}
}
}
}
}
if(_40){
break;
}
}
if(!_40){
break;
}
}
if(_41||_40){
_39.push(_3d);
}
}else{
_39.push(_3d);
}
}
dojo.forEach(_39,function(_47){
if(_47.element.parentNode){
_47.element.parentNode.removeChild(_47.element);
}
},this);
return _39;
},_flattenNodes:function(_48){
var _49=[];
if(_48){
var i;
for(i=0;i<_48.length;i++){
var _4a=_48[i];
_49.push(_4a);
if(_4a.childNodes&&_4a.childNodes.length>0){
_49=_49.concat(this._flattenNodes(_4a.childNodes));
}
}
}
return _49;
},close:function(_4b){
},newItem:function(_4c,_4d){
_4c=(_4c||{});
var _4e=_4c.tagName;
if(!_4e){
_4e=this.rootItem;
if(_4e===""){
return null;
}
}
var _4f=this._getDocument();
var _50=_4f.createElement(_4e);
for(var _51 in _4c){
var _52;
if(_51==="tagName"){
continue;
}else{
if(_51==="text()"){
_52=_4f.createTextNode(_4c[_51]);
_50.appendChild(_52);
}else{
_51=this._getAttribute(_4e,_51);
if(_51.charAt(0)==="@"){
var _53=_51.substring(1);
_50.setAttribute(_53,_4c[_51]);
}else{
var _54=_4f.createElement(_51);
_52=_4f.createTextNode(_4c[_51]);
_54.appendChild(_52);
_50.appendChild(_54);
}
}
}
}
var _55=this._getItem(_50);
this._newItems.push(_55);
var _56=null;
if(_4d&&_4d.parent&&_4d.attribute){
_56={item:_4d.parent,attribute:_4d.attribute,oldValue:undefined};
var _57=this.getValues(_4d.parent,_4d.attribute);
if(_57&&_57.length>0){
var _58=_57.slice(0,_57.length);
if(_57.length===1){
_56.oldValue=_57[0];
}else{
_56.oldValue=_57.slice(0,_57.length);
}
_58.push(_55);
this.setValues(_4d.parent,_4d.attribute,_58);
_56.newValue=this.getValues(_4d.parent,_4d.attribute);
}else{
this.setValues(_4d.parent,_4d.attribute,_55);
_56.newValue=_55;
}
}
return _55;
},deleteItem:function(_59){
var _5a=_59.element;
if(_5a.parentNode){
this._backupItem(_59);
_5a.parentNode.removeChild(_5a);
return true;
}
this._forgetItem(_59);
this._deletedItems.push(_59);
return true;
},setValue:function(_5b,_5c,_5d){
if(_5c==="tagName"){
return false;
}
this._backupItem(_5b);
var _5e=_5b.element;
var _5f;
var _60;
if(_5c==="childNodes"){
_5f=_5d.element;
_5e.appendChild(_5f);
}else{
if(_5c==="text()"){
while(_5e.firstChild){
_5e.removeChild(_5e.firstChild);
}
_60=this._getDocument(_5e).createTextNode(_5d);
_5e.appendChild(_60);
}else{
_5c=this._getAttribute(_5e.nodeName,_5c);
if(_5c.charAt(0)==="@"){
var _61=_5c.substring(1);
_5e.setAttribute(_61,_5d);
}else{
for(var i=0;i<_5e.childNodes.length;i++){
var _62=_5e.childNodes[i];
if(_62.nodeType===1&&_62.nodeName===_5c){
_5f=_62;
break;
}
}
var _63=this._getDocument(_5e);
if(_5f){
while(_5f.firstChild){
_5f.removeChild(_5f.firstChild);
}
}else{
_5f=_63.createElement(_5c);
_5e.appendChild(_5f);
}
_60=_63.createTextNode(_5d);
_5f.appendChild(_60);
}
}
}
return true;
},setValues:function(_64,_65,_66){
if(_65==="tagName"){
return false;
}
this._backupItem(_64);
var _67=_64.element;
var i;
var _68;
var _69;
if(_65==="childNodes"){
while(_67.firstChild){
_67.removeChild(_67.firstChild);
}
for(i=0;i<_66.length;i++){
_68=_66[i].element;
_67.appendChild(_68);
}
}else{
if(_65==="text()"){
while(_67.firstChild){
_67.removeChild(_67.firstChild);
}
var _6a="";
for(i=0;i<_66.length;i++){
_6a+=_66[i];
}
_69=this._getDocument(_67).createTextNode(_6a);
_67.appendChild(_69);
}else{
_65=this._getAttribute(_67.nodeName,_65);
if(_65.charAt(0)==="@"){
var _6b=_65.substring(1);
_67.setAttribute(_6b,_66[0]);
}else{
for(i=_67.childNodes.length-1;i>=0;i--){
var _6c=_67.childNodes[i];
if(_6c.nodeType===1&&_6c.nodeName===_65){
_67.removeChild(_6c);
}
}
var _6d=this._getDocument(_67);
for(i=0;i<_66.length;i++){
_68=_6d.createElement(_65);
_69=_6d.createTextNode(_66[i]);
_68.appendChild(_69);
_67.appendChild(_68);
}
}
}
}
return true;
},unsetAttribute:function(_6e,_6f){
if(_6f==="tagName"){
return false;
}
this._backupItem(_6e);
var _70=_6e.element;
if(_6f==="childNodes"||_6f==="text()"){
while(_70.firstChild){
_70.removeChild(_70.firstChild);
}
}else{
_6f=this._getAttribute(_70.nodeName,_6f);
if(_6f.charAt(0)==="@"){
var _71=_6f.substring(1);
_70.removeAttribute(_71);
}else{
for(var i=_70.childNodes.length-1;i>=0;i--){
var _72=_70.childNodes[i];
if(_72.nodeType===1&&_72.nodeName===_6f){
_70.removeChild(_72);
}
}
}
}
return true;
},save:function(_73){
if(!_73){
_73={};
}
var i;
for(i=0;i<this._modifiedItems.length;i++){
this._saveItem(this._modifiedItems[i],_73,"PUT");
}
for(i=0;i<this._newItems.length;i++){
var _74=this._newItems[i];
if(_74.element.parentNode){
this._newItems.splice(i,1);
i--;
continue;
}
this._saveItem(this._newItems[i],_73,"POST");
}
for(i=0;i<this._deletedItems.length;i++){
this._saveItem(this._deletedItems[i],_73,"DELETE");
}
},revert:function(){
this._newItems=[];
this._restoreItems(this._deletedItems);
this._deletedItems=[];
this._restoreItems(this._modifiedItems);
this._modifiedItems=[];
return true;
},isDirty:function(_75){
if(_75){
var _76=this._getRootElement(_75.element);
return (this._getItemIndex(this._newItems,_76)>=0||this._getItemIndex(this._deletedItems,_76)>=0||this._getItemIndex(this._modifiedItems,_76)>=0);
}else{
return (this._newItems.length>0||this._deletedItems.length>0||this._modifiedItems.length>0);
}
},_saveItem:function(_77,_78,_79){
var url;
var _7a;
if(_79==="PUT"){
url=this._getPutUrl(_77);
}else{
if(_79==="DELETE"){
url=this._getDeleteUrl(_77);
}else{
url=this._getPostUrl(_77);
}
}
if(!url){
if(_78.onError){
_7a=_78.scope||dojo.global;
_78.onError.call(_7a,new Error("No URL for saving content: "+this._getPostContent(_77)));
}
return;
}
var _7b={url:url,method:(_79||"POST"),contentType:"text/xml",handleAs:"xml"};
var _7c;
if(_79==="PUT"){
_7b.putData=this._getPutContent(_77);
_7c=dojo.rawXhrPut(_7b);
}else{
if(_79==="DELETE"){
_7c=dojo.xhrDelete(_7b);
}else{
_7b.postData=this._getPostContent(_77);
_7c=dojo.rawXhrPost(_7b);
}
}
_7a=(_78.scope||dojo.global);
var _7d=this;
_7c.addCallback(function(_7e){
_7d._forgetItem(_77);
if(_78.onComplete){
_78.onComplete.call(_7a);
}
});
_7c.addErrback(function(_7f){
if(_78.onError){
_78.onError.call(_7a,_7f);
}
});
},_getPostUrl:function(_80){
return this.url;
},_getPutUrl:function(_81){
return this.url;
},_getDeleteUrl:function(_82){
var url=this.url;
if(_82&&this.keyAttribute!==""){
var _83=this.getValue(_82,this.keyAttribute);
if(_83){
var key=this.keyAttribute.charAt(0)==="@"?this.keyAttribute.substring(1):this.keyAttribute;
url+=url.indexOf("?")<0?"?":"&";
url+=key+"="+_83;
}
}
return url;
},_getPostContent:function(_84){
var _85=_84.element;
var _86="<?xml version=\"1.0\"?>";
return _86+dojox.xml.parser.innerXML(_85);
},_getPutContent:function(_87){
var _88=_87.element;
var _89="<?xml version=\"1.0\"?>";
return _89+dojox.xml.parser.innerXML(_88);
},_getAttribute:function(_8a,_8b){
if(this._attributeMap){
var key=_8a+"."+_8b;
var _8c=this._attributeMap[key];
if(_8c){
_8b=_8c;
}else{
_8c=this._attributeMap[_8b];
if(_8c){
_8b=_8c;
}
}
}
return _8b;
},_getItem:function(_8d){
try{
var q=null;
if(this.keyAttribute===""){
q=this._getXPath(_8d);
}
return new dojox.data.XmlItem(_8d,this,q);
}
catch(e){
}
return null;
},_getItemIndex:function(_8e,_8f){
for(var i=0;i<_8e.length;i++){
if(_8e[i].element===_8f){
return i;
}
}
return -1;
},_backupItem:function(_90){
var _91=this._getRootElement(_90.element);
if(this._getItemIndex(this._newItems,_91)>=0||this._getItemIndex(this._modifiedItems,_91)>=0){
return;
}
if(_91!=_90.element){
_90=this._getItem(_91);
}
_90._backup=_91.cloneNode(true);
this._modifiedItems.push(_90);
},_restoreItems:function(_92){
dojo.forEach(_92,function(_93){
if(_93._backup){
_93.element=_93._backup;
_93._backup=null;
}
},this);
},_forgetItem:function(_94){
var _95=_94.element;
var _96=this._getItemIndex(this._newItems,_95);
if(_96>=0){
this._newItems.splice(_96,1);
}
_96=this._getItemIndex(this._deletedItems,_95);
if(_96>=0){
this._deletedItems.splice(_96,1);
}
_96=this._getItemIndex(this._modifiedItems,_95);
if(_96>=0){
this._modifiedItems.splice(_96,1);
}
},_getDocument:function(_97){
if(_97){
return _97.ownerDocument;
}else{
if(!this._document){
return dojox.xml.parser.parse();
}
}
return null;
},_getRootElement:function(_98){
while(_98.parentNode){
_98=_98.parentNode;
}
return _98;
},_getXPath:function(_99){
var _9a=null;
if(!this.sendQuery){
var _9b=_99;
_9a="";
while(_9b&&_9b!=_99.ownerDocument){
var pos=0;
var _9c=_9b;
var _9d=_9b.nodeName;
while(_9c){
_9c=_9c.previousSibling;
if(_9c&&_9c.nodeName===_9d){
pos++;
}
}
var _9e="/"+_9d+"["+pos+"]";
if(_9a){
_9a=_9e+_9a;
}else{
_9a=_9e;
}
_9b=_9b.parentNode;
}
}
return _9a;
},getIdentity:function(_9f){
if(!this.isItem(_9f)){
throw new Error("dojox.data.XmlStore: Object supplied to getIdentity is not an item");
}else{
var id=null;
if(this.sendQuery&&this.keyAttribute!==""){
id=this.getValue(_9f,this.keyAttribute).toString();
}else{
if(!this.serverQuery){
if(this.keyAttribute!==""){
id=this.getValue(_9f,this.keyAttribute).toString();
}else{
id=_9f.q;
}
}
}
return id;
}
},getIdentityAttributes:function(_a0){
if(!this.isItem(_a0)){
throw new Error("dojox.data.XmlStore: Object supplied to getIdentity is not an item");
}else{
if(this.keyAttribute!==""){
return [this.keyAttribute];
}else{
return null;
}
}
},fetchItemByIdentity:function(_a1){
var _a2=null;
var _a3=null;
var _a4=this;
var url=null;
var _a5=null;
var _a6=null;
if(!_a4.sendQuery){
_a2=function(_a7){
if(_a7){
if(_a4.keyAttribute!==""){
var _a8={};
_a8.query={};
_a8.query[_a4.keyAttribute]=_a1.identity;
_a8.queryOptions={deep:true};
var _a9=_a4._getItems(_a7,_a8);
_a3=_a1.scope||dojo.global;
if(_a9.length===1){
if(_a1.onItem){
_a1.onItem.call(_a3,_a9[0]);
}
}else{
if(_a9.length===0){
if(_a1.onItem){
_a1.onItem.call(_a3,null);
}
}else{
if(_a1.onError){
_a1.onError.call(_a3,new Error("Items array size for identity lookup greater than 1, invalid keyAttribute."));
}
}
}
}else{
var _aa=_a1.identity.split("/");
var i;
var _ab=_a7;
for(i=0;i<_aa.length;i++){
if(_aa[i]&&_aa[i]!==""){
var _ac=_aa[i];
_ac=_ac.substring(0,_ac.length-1);
var _ad=_ac.split("[");
var tag=_ad[0];
var _ae=parseInt(_ad[1],10);
var pos=0;
if(_ab){
var _af=_ab.childNodes;
if(_af){
var j;
var _b0=null;
for(j=0;j<_af.length;j++){
var _b1=_af[j];
if(_b1.nodeName===tag){
if(pos<_ae){
pos++;
}else{
_b0=_b1;
break;
}
}
}
if(_b0){
_ab=_b0;
}else{
_ab=null;
}
}else{
_ab=null;
}
}else{
break;
}
}
}
var _b2=null;
if(_ab){
_b2=_a4._getItem(_ab);
if(_b2.element.parentNode){
_b2.element.parentNode.removeChild(_b2.element);
}
}
if(_a1.onItem){
_a3=_a1.scope||dojo.global;
_a1.onItem.call(_a3,_b2);
}
}
}
};
url=this._getFetchUrl(null);
_a5={url:url,handleAs:"xml",preventCache:_a4.urlPreventCache};
_a6=dojo.xhrGet(_a5);
_a6.addCallback(_a2);
if(_a1.onError){
_a6.addErrback(function(_b3){
var s=_a1.scope||dojo.global;
_a1.onError.call(s,_b3);
});
}
}else{
if(_a4.keyAttribute!==""){
var _b4={query:{}};
_b4.query[_a4.keyAttribute]=_a1.identity;
url=this._getFetchUrl(_b4);
_a2=function(_b5){
var _b6=null;
if(_b5){
var _b7=_a4._getItems(_b5,{});
if(_b7.length===1){
_b6=_b7[0];
}else{
if(_a1.onError){
var _b8=_a1.scope||dojo.global;
_a1.onError.call(_b8,new Error("More than one item was returned from the server for the denoted identity"));
}
}
}
if(_a1.onItem){
_b8=_a1.scope||dojo.global;
_a1.onItem.call(_b8,_b6);
}
};
_a5={url:url,handleAs:"xml",preventCache:_a4.urlPreventCache};
_a6=dojo.xhrGet(_a5);
_a6.addCallback(_a2);
if(_a1.onError){
_a6.addErrback(function(_b9){
var s=_a1.scope||dojo.global;
_a1.onError.call(s,_b9);
});
}
}else{
if(_a1.onError){
var s=_a1.scope||dojo.global;
_a1.onError.call(s,new Error("XmlStore is not told that the server to provides identity support.  No keyAttribute specified."));
}
}
}
}});
dojo.declare("dojox.data.XmlItem",null,{constructor:function(_ba,_bb,_bc){
this.element=_ba;
this.store=_bb;
this.q=_bc;
},toString:function(){
var str="";
if(this.element){
for(var i=0;i<this.element.childNodes.length;i++){
var _bd=this.element.childNodes[i];
if(_bd.nodeType===3||_bd.nodeType===4){
str+=_bd.nodeValue;
}
}
}
return str;
}});
dojo.extend(dojox.data.XmlStore,dojo.data.util.simpleFetch);
}
