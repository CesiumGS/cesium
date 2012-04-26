/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xmpp.util"]){
dojo._hasResource["dojox.xmpp.util"]=true;
dojo.provide("dojox.xmpp.util");
dojo.require("dojox.string.Builder");
dojo.require("dojox.encoding.base64");
dojox.xmpp.util.xmlEncode=function(_1){
if(_1){
_1=_1.replace("&","&amp;").replace(">","&gt;").replace("<","&lt;").replace("'","&apos;").replace("\"","&quot;");
}
return _1;
};
dojox.xmpp.util.encodeJid=function(_2){
var _3=new dojox.string.Builder();
for(var i=0;i<_2.length;i++){
var ch=_2.charAt(i);
var _4=ch;
switch(ch){
case " ":
_4="\\20";
break;
case "\"":
_4="\\22";
break;
case "#":
_4="\\23";
break;
case "&":
_4="\\26";
break;
case "'":
_4="\\27";
break;
case "/":
_4="\\2f";
break;
case ":":
_4="\\3a";
break;
case "<":
_4="\\3c";
break;
case ">":
_4="\\3e";
break;
}
_3.append(_4);
}
return _3.toString();
};
dojox.xmpp.util.decodeJid=function(_5){
_5=_5.replace(/\\([23][02367acef])/g,function(_6){
switch(_6){
case "\\20":
return " ";
case "\\22":
return "\"";
case "\\23":
return "#";
case "\\26":
return "&";
case "\\27":
return "'";
case "\\2f":
return "/";
case "\\3a":
return ":";
case "\\3c":
return "<";
case "\\3e":
return ">";
}
return "ARG";
});
return _5;
};
dojox.xmpp.util.createElement=function(_7,_8,_9){
var _a=new dojox.string.Builder("<");
_a.append(_7+" ");
for(var _b in _8){
_a.append(_b+"=\"");
_a.append(_8[_b]);
_a.append("\" ");
}
if(_9){
_a.append("/>");
}else{
_a.append(">");
}
return _a.toString();
};
dojox.xmpp.util.stripHtml=function(_c){
var re=/<[^>]*?>/gi;
for(var i=0;i<arguments.length;i++){
}
return _c.replace(re,"");
};
dojox.xmpp.util.decodeHtmlEntities=function(_d){
var ta=dojo.doc.createElement("textarea");
ta.innerHTML=_d.replace(/</g,"&lt;").replace(/>/g,"&gt;");
return ta.value;
};
dojox.xmpp.util.htmlToPlain=function(_e){
_e=dojox.xmpp.util.decodeHtmlEntities(_e);
_e=_e.replace(/<br\s*[i\/]{0,1}>/gi,"\n");
_e=dojox.xmpp.util.stripHtml(_e);
return _e;
};
dojox.xmpp.util.Base64={};
dojox.xmpp.util.Base64.encode=function(_f){
var s2b=function(s){
var b=[];
for(var i=0;i<s.length;++i){
b.push(s.charCodeAt(i));
}
return b;
};
return dojox.encoding.base64.encode(s2b(_f));
};
dojox.xmpp.util.Base64.decode=function(_10){
var b2s=function(b){
var s=[];
dojo.forEach(b,function(c){
s.push(String.fromCharCode(c));
});
return s.join("");
};
return b2s(dojox.encoding.base64.decode(_10));
};
}
