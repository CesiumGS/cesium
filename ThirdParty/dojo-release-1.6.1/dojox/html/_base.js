/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.html._base"]){
dojo._hasResource["dojox.html._base"]=true;
dojo.provide("dojox.html._base");
dojo.require("dojo.html");
(function(){
if(dojo.isIE){
var _1=/(AlphaImageLoader\([^)]*?src=(['"]))(?![a-z]+:|\/)([^\r\n;}]+?)(\2[^)]*\)\s*[;}]?)/g;
}
var _2=/(?:(?:@import\s*(['"])(?![a-z]+:|\/)([^\r\n;{]+?)\1)|url\(\s*(['"]?)(?![a-z]+:|\/)([^\r\n;]+?)\3\s*\))([a-z, \s]*[;}]?)/g;
var _3=dojox.html._adjustCssPaths=function(_4,_5){
if(!_5||!_4){
return;
}
if(_1){
_5=_5.replace(_1,function(_6,_7,_8,_9,_a){
return _7+(new dojo._Url(_4,"./"+_9).toString())+_a;
});
}
return _5.replace(_2,function(_b,_c,_d,_e,_f,_10){
if(_d){
return "@import \""+(new dojo._Url(_4,"./"+_d).toString())+"\""+_10;
}else{
return "url("+(new dojo._Url(_4,"./"+_f).toString())+")"+_10;
}
});
};
var _11=/(<[a-z][a-z0-9]*\s[^>]*)(?:(href|src)=(['"]?)([^>]*?)\3|style=(['"]?)([^>]*?)\5)([^>]*>)/gi;
var _12=dojox.html._adjustHtmlPaths=function(_13,_14){
var url=_13||"./";
return _14.replace(_11,function(tag,_15,_16,_17,_18,_19,_1a,end){
return _15+(_16?(_16+"="+_17+(new dojo._Url(url,_18).toString())+_17):("style="+_19+_3(url,_1a)+_19))+end;
});
};
var _1b=dojox.html._snarfStyles=function(_1c,_1d,_1e){
_1e.attributes=[];
return _1d.replace(/(?:<style([^>]*)>([\s\S]*?)<\/style>|<link\s+(?=[^>]*rel=['"]?stylesheet)([^>]*?href=(['"])([^>]*?)\4[^>\/]*)\/?>)/gi,function(_1f,_20,_21,_22,_23,_24){
var i,_25=(_20||_22||"").replace(/^\s*([\s\S]*?)\s*$/i,"$1");
if(_21){
i=_1e.push(_1c?_3(_1c,_21):_21);
}else{
i=_1e.push("@import \""+_24+"\";");
_25=_25.replace(/\s*(?:rel|href)=(['"])?[^\s]*\1\s*/gi,"");
}
if(_25){
_25=_25.split(/\s+/);
var _26={},tmp;
for(var j=0,e=_25.length;j<e;j++){
tmp=_25[j].split("=");
_26[tmp[0]]=tmp[1].replace(/^\s*['"]?([\s\S]*?)['"]?\s*$/,"$1");
}
_1e.attributes[i-1]=_26;
}
return "";
});
};
var _27=dojox.html._snarfScripts=function(_28,_29){
_29.code="";
_28=_28.replace(/<[!][-][-](.|\s)*?[-][-]>/g,function(_2a){
return _2a.replace(/<(\/?)script\b/ig,"&lt;$1Script");
});
function _2b(src){
if(_29.downloadRemote){
src=src.replace(/&([a-z0-9#]+);/g,function(m,_2c){
switch(_2c){
case "amp":
return "&";
case "gt":
return ">";
case "lt":
return "<";
default:
return _2c.charAt(0)=="#"?String.fromCharCode(_2c.substring(1)):"&"+_2c+";";
}
});
dojo.xhrGet({url:src,sync:true,load:function(_2d){
_29.code+=_2d+";";
},error:_29.errBack});
}
};
return _28.replace(/<script\s*(?![^>]*type=['"]?(?:dojo\/|text\/html\b))(?:[^>]*?(?:src=(['"]?)([^>]*?)\1[^>]*)?)*>([\s\S]*?)<\/script>/gi,function(_2e,_2f,src,_30){
if(src){
_2b(src);
}else{
_29.code+=_30;
}
return "";
});
};
var _31=dojox.html.evalInGlobal=function(_32,_33){
_33=_33||dojo.doc.body;
var n=_33.ownerDocument.createElement("script");
n.type="text/javascript";
_33.appendChild(n);
n.text=_32;
};
dojo.declare("dojox.html._ContentSetter",[dojo.html._ContentSetter],{adjustPaths:false,referencePath:".",renderStyles:false,executeScripts:false,scriptHasHooks:false,scriptHookReplacement:null,_renderStyles:function(_34){
this._styleNodes=[];
var st,att,_35,doc=this.node.ownerDocument;
var _36=doc.getElementsByTagName("head")[0];
for(var i=0,e=_34.length;i<e;i++){
_35=_34[i];
att=_34.attributes[i];
st=doc.createElement("style");
st.setAttribute("type","text/css");
for(var x in att){
st.setAttribute(x,att[x]);
}
this._styleNodes.push(st);
_36.appendChild(st);
if(st.styleSheet){
st.styleSheet.cssText=_35;
}else{
st.appendChild(doc.createTextNode(_35));
}
}
},empty:function(){
this.inherited("empty",arguments);
this._styles=[];
},onBegin:function(){
this.inherited("onBegin",arguments);
var _37=this.content,_38=this.node;
var _39=this._styles;
if(dojo.isString(_37)){
if(this.adjustPaths&&this.referencePath){
_37=_12(this.referencePath,_37);
}
if(this.renderStyles||this.cleanContent){
_37=_1b(this.referencePath,_37,_39);
}
if(this.executeScripts){
var _3a=this;
var _3b={downloadRemote:true,errBack:function(e){
_3a._onError.call(_3a,"Exec","Error downloading remote script in \""+_3a.id+"\"",e);
}};
_37=_27(_37,_3b);
this._code=_3b.code;
}
}
this.content=_37;
},onEnd:function(){
var _3c=this._code,_3d=this._styles;
if(this._styleNodes&&this._styleNodes.length){
while(this._styleNodes.length){
dojo.destroy(this._styleNodes.pop());
}
}
if(this.renderStyles&&_3d&&_3d.length){
this._renderStyles(_3d);
}
if(this.executeScripts&&_3c){
if(this.cleanContent){
_3c=_3c.replace(/(<!--|(?:\/\/)?-->|<!\[CDATA\[|\]\]>)/g,"");
}
if(this.scriptHasHooks){
_3c=_3c.replace(/_container_(?!\s*=[^=])/g,this.scriptHookReplacement);
}
try{
_31(_3c,this.node);
}
catch(e){
this._onError("Exec","Error eval script in "+this.id+", "+e.message,e);
}
}
this.inherited("onEnd",arguments);
},tearDown:function(){
this.inherited(arguments);
delete this._styles;
if(this._styleNodes&&this._styleNodes.length){
while(this._styleNodes.length){
dojo.destroy(this._styleNodes.pop());
}
}
delete this._styleNodes;
dojo.mixin(this,dojo.getObject(this.declaredClass).prototype);
}});
dojox.html.set=function(_3e,_3f,_40){
if(!_40){
return dojo.html._setNodeContent(_3e,_3f,true);
}else{
var op=new dojox.html._ContentSetter(dojo.mixin(_40,{content:_3f,node:_3e}));
return op.set();
}
};
})();
}
