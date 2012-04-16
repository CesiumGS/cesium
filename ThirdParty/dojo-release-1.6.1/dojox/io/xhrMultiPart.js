/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.io.xhrMultiPart"]){
dojo._hasResource["dojox.io.xhrMultiPart"]=true;
dojo.provide("dojox.io.xhrMultiPart");
dojo.require("dojox.uuid.generateRandomUuid");
(function(){
function _1(_2,_3){
if(!_2["name"]&&!_2["content"]){
throw new Error("Each part of a multi-part request requires 'name' and 'content'.");
}
var _4=[];
_4.push("--"+_3,"Content-Disposition: form-data; name=\""+_2.name+"\""+(_2["filename"]?"; filename=\""+_2.filename+"\"":""));
if(_2["contentType"]){
var ct="Content-Type: "+_2.contentType;
if(_2["charset"]){
ct+="; Charset="+_2.charset;
}
_4.push(ct);
}
if(_2["contentTransferEncoding"]){
_4.push("Content-Transfer-Encoding: "+_2.contentTransferEncoding);
}
_4.push("",_2.content);
return _4;
};
function _5(_6,_7){
var o=dojo.formToObject(_6),_8=[];
for(var p in o){
if(dojo.isArray(o[p])){
dojo.forEach(o[p],function(_9){
_8=_8.concat(_1({name:p,content:_9},_7));
});
}else{
_8=_8.concat(_1({name:p,content:o[p]},_7));
}
}
return _8;
};
dojox.io.xhrMultiPart=function(_a){
if(!_a["file"]&&!_a["content"]&&!_a["form"]){
throw new Error("content, file or form must be provided to dojox.io.xhrMultiPart's arguments");
}
var _b=dojox.uuid.generateRandomUuid(),_c=[],_d="";
if(_a["file"]||_a["content"]){
var v=_a["file"]||_a["content"];
dojo.forEach((dojo.isArray(v)?v:[v]),function(_e){
_c=_c.concat(_1(_e,_b));
});
}else{
if(_a["form"]){
if(dojo.query("input[type=file]",_a["form"]).length){
throw new Error("dojox.io.xhrMultiPart cannot post files that are values of an INPUT TYPE=FILE.  Use dojo.io.iframe.send() instead.");
}
_c=_5(_a["form"],_b);
}
}
if(_c.length){
_c.push("--"+_b+"--","");
_d=_c.join("\r\n");
}
return dojo.rawXhrPost(dojo.mixin(_a,{contentType:"multipart/form-data; boundary="+_b,postData:_d}));
};
})();
}
