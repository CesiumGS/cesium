/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xml.parser"]){
dojo._hasResource["dojox.xml.parser"]=true;
dojo.provide("dojox.xml.parser");
dojox.xml.parser.parse=function(_1,_2){
var _3=dojo.doc;
var _4;
_2=_2||"text/xml";
if(_1&&dojo.trim(_1)&&"DOMParser" in dojo.global){
var _5=new DOMParser();
_4=_5.parseFromString(_1,_2);
var de=_4.documentElement;
var _6="http://www.mozilla.org/newlayout/xml/parsererror.xml";
if(de.nodeName=="parsererror"&&de.namespaceURI==_6){
var _7=de.getElementsByTagNameNS(_6,"sourcetext")[0];
if(_7){
_7=_7.firstChild.data;
}
throw new Error("Error parsing text "+de.firstChild.data+" \n"+_7);
}
return _4;
}else{
if("ActiveXObject" in dojo.global){
var ms=function(n){
return "MSXML"+n+".DOMDocument";
};
var dp=["Microsoft.XMLDOM",ms(6),ms(4),ms(3),ms(2)];
dojo.some(dp,function(p){
try{
_4=new ActiveXObject(p);
}
catch(e){
return false;
}
return true;
});
if(_1&&_4){
_4.async=false;
_4.loadXML(_1);
var pe=_4.parseError;
if(pe.errorCode!==0){
throw new Error("Line: "+pe.line+"\n"+"Col: "+pe.linepos+"\n"+"Reason: "+pe.reason+"\n"+"Error Code: "+pe.errorCode+"\n"+"Source: "+pe.srcText);
}
}
if(_4){
return _4;
}
}else{
if(_3.implementation&&_3.implementation.createDocument){
if(_1&&dojo.trim(_1)&&_3.createElement){
var _8=_3.createElement("xml");
_8.innerHTML=_1;
var _9=_3.implementation.createDocument("foo","",null);
dojo.forEach(_8.childNodes,function(_a){
_9.importNode(_a,true);
});
return _9;
}else{
return _3.implementation.createDocument("","",null);
}
}
}
}
return null;
};
dojox.xml.parser.textContent=function(_b,_c){
if(arguments.length>1){
var _d=_b.ownerDocument||dojo.doc;
dojox.xml.parser.replaceChildren(_b,_d.createTextNode(_c));
return _c;
}else{
if(_b.textContent!==undefined){
return _b.textContent;
}
var _e="";
if(_b){
dojo.forEach(_b.childNodes,function(_f){
switch(_f.nodeType){
case 1:
case 5:
_e+=dojox.xml.parser.textContent(_f);
break;
case 3:
case 2:
case 4:
_e+=_f.nodeValue;
}
});
}
return _e;
}
};
dojox.xml.parser.replaceChildren=function(_10,_11){
var _12=[];
if(dojo.isIE){
dojo.forEach(_10.childNodes,function(_13){
_12.push(_13);
});
}
dojox.xml.parser.removeChildren(_10);
dojo.forEach(_12,dojo.destroy);
if(!dojo.isArray(_11)){
_10.appendChild(_11);
}else{
dojo.forEach(_11,function(_14){
_10.appendChild(_14);
});
}
};
dojox.xml.parser.removeChildren=function(_15){
var _16=_15.childNodes.length;
while(_15.hasChildNodes()){
_15.removeChild(_15.firstChild);
}
return _16;
};
dojox.xml.parser.innerXML=function(_17){
if(_17.innerXML){
return _17.innerXML;
}else{
if(_17.xml){
return _17.xml;
}else{
if(typeof XMLSerializer!="undefined"){
return (new XMLSerializer()).serializeToString(_17);
}
}
}
return null;
};
}
