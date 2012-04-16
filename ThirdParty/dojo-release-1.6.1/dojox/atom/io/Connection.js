/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.atom.io.Connection"]){
dojo._hasResource["dojox.atom.io.Connection"]=true;
dojo.provide("dojox.atom.io.Connection");
dojo.require("dojox.atom.io.model");
dojo.declare("dojox.atom.io.Connection",null,{constructor:function(_1,_2){
this.sync=_1;
this.preventCache=_2;
},preventCache:false,alertsEnabled:false,getFeed:function(_3,_4,_5,_6){
this._getXmlDoc(_3,"feed",new dojox.atom.io.model.Feed(),dojox.atom.io.model._Constants.ATOM_NS,_4,_5,_6);
},getService:function(_7,_8,_9,_a){
this._getXmlDoc(_7,"service",new dojox.atom.io.model.Service(_7),dojox.atom.io.model._Constants.APP_NS,_8,_9,_a);
},getEntry:function(_b,_c,_d,_e){
this._getXmlDoc(_b,"entry",new dojox.atom.io.model.Entry(),dojox.atom.io.model._Constants.ATOM_NS,_c,_d,_e);
},_getXmlDoc:function(_f,_10,_11,_12,_13,_14,_15){
if(!_15){
_15=dojo.global;
}
var ae=this.alertsEnabled;
var _16={url:_f,handleAs:"xml",sync:this.sync,preventCache:this.preventCache,load:function(_17,_18){
var _19=null;
var _1a=_17;
var _1b;
if(_1a){
if(typeof (_1a.getElementsByTagNameNS)!="undefined"){
_1b=_1a.getElementsByTagNameNS(_12,_10);
if(_1b&&_1b.length>0){
_19=_1b.item(0);
}else{
if(_1a.lastChild){
_19=_1a.lastChild;
}
}
}else{
if(typeof (_1a.getElementsByTagName)!="undefined"){
_1b=_1a.getElementsByTagName(_10);
if(_1b&&_1b.length>0){
for(var i=0;i<_1b.length;i++){
if(_1b[i].namespaceURI==_12){
_19=_1b[i];
break;
}
}
}else{
if(_1a.lastChild){
_19=_1a.lastChild;
}
}
}else{
if(_1a.lastChild){
_19=_1a.lastChild;
}else{
_13.call(_15,null,null,_18);
return;
}
}
}
_11.buildFromDom(_19);
if(_13){
_13.call(_15,_11,_1a,_18);
}else{
if(ae){
throw new Error("The callback value does not exist.");
}
}
}else{
_13.call(_15,null,null,_18);
}
}};
if(this.user&&this.user!==null){
_16.user=this.user;
}
if(this.password&&this.password!==null){
_16.password=this.password;
}
if(_14){
_16.error=function(_1c,_1d){
_14.call(_15,_1c,_1d);
};
}else{
_16.error=function(){
throw new Error("The URL requested cannot be accessed");
};
}
dojo.xhrGet(_16);
},updateEntry:function(_1e,_1f,_20,_21,_22,_23){
if(!_23){
_23=dojo.global;
}
_1e.updated=new Date();
var url=_1e.getEditHref();
if(!url){
throw new Error("A URL has not been specified for editing this entry.");
}
var _24=this;
var ae=this.alertsEnabled;
var _25={url:url,handleAs:"text",contentType:"text/xml",sync:this.sync,preventCache:this.preventCache,load:function(_26,_27){
var _28=null;
if(_21){
_28=_27.xhr.getResponseHeader("Location");
if(!_28){
_28=url;
}
var _29=function(_2a,dom,_2b){
if(_1f){
_1f.call(_23,_2a,_28,_2b);
}else{
if(ae){
throw new Error("The callback value does not exist.");
}
}
};
_24.getEntry(_28,_29);
}else{
if(_1f){
_1f.call(_23,_1e,_27.xhr.getResponseHeader("Location"),_27);
}else{
if(ae){
throw new Error("The callback value does not exist.");
}
}
}
return _26;
}};
if(this.user&&this.user!==null){
_25.user=this.user;
}
if(this.password&&this.password!==null){
_25.password=this.password;
}
if(_20){
_25.error=function(_2c,_2d){
_20.call(_23,_2c,_2d);
};
}else{
_25.error=function(){
throw new Error("The URL requested cannot be accessed");
};
}
if(_22){
_25.postData=_1e.toString(true);
_25.headers={"X-Method-Override":"PUT"};
dojo.rawXhrPost(_25);
}else{
_25.putData=_1e.toString(true);
var xhr=dojo.rawXhrPut(_25);
}
},addEntry:function(_2e,url,_2f,_30,_31,_32){
if(!_32){
_32=dojo.global;
}
_2e.published=new Date();
_2e.updated=new Date();
var _33=_2e.feedUrl;
var ae=this.alertsEnabled;
if(!url&&_33){
url=_33;
}
if(!url){
if(ae){
throw new Error("The request cannot be processed because the URL parameter is missing.");
}
return;
}
var _34=this;
var _35={url:url,handleAs:"text",contentType:"text/xml",sync:this.sync,preventCache:this.preventCache,postData:_2e.toString(true),load:function(_36,_37){
var _38=_37.xhr.getResponseHeader("Location");
if(!_38){
_38=url;
}
if(!_37.retrieveEntry){
if(_2f){
_2f.call(_32,_2e,_38,_37);
}else{
if(ae){
throw new Error("The callback value does not exist.");
}
}
}else{
var _39=function(_3a,dom,_3b){
if(_2f){
_2f.call(_32,_3a,_38,_3b);
}else{
if(ae){
throw new Error("The callback value does not exist.");
}
}
};
_34.getEntry(_38,_39);
}
return _36;
}};
if(this.user&&this.user!==null){
_35.user=this.user;
}
if(this.password&&this.password!==null){
_35.password=this.password;
}
if(_30){
_35.error=function(_3c,_3d){
_30.call(_32,_3c,_3d);
};
}else{
_35.error=function(){
throw new Error("The URL requested cannot be accessed");
};
}
dojo.rawXhrPost(_35);
},deleteEntry:function(_3e,_3f,_40,_41,_42){
if(!_42){
_42=dojo.global;
}
var url=null;
if(typeof (_3e)=="string"){
url=_3e;
}else{
url=_3e.getEditHref();
}
if(!url){
_3f.call(_42,false,null);
throw new Error("The request cannot be processed because the URL parameter is missing.");
}
var _43={url:url,handleAs:"text",sync:this.sync,preventCache:this.preventCache,load:function(_44,_45){
_3f.call(_42,_45);
return _44;
}};
if(this.user&&this.user!==null){
_43.user=this.user;
}
if(this.password&&this.password!==null){
_43.password=this.password;
}
if(_40){
_43.error=function(_46,_47){
_40.call(_42,_46,_47);
};
}else{
_43.error=function(){
throw new Error("The URL requested cannot be accessed");
};
}
if(_41){
_43.headers={"X-Method-Override":"DELETE"};
dojo.xhrPost(_43);
}else{
dojo.xhrDelete(_43);
}
}});
}
