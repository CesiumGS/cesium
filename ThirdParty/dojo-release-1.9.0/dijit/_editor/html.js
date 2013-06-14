//>>built
define("dijit/_editor/html",["dojo/_base/array","dojo/_base/lang","dojo/sniff"],function(_1,_2,_3){
var _4={};
_2.setObject("dijit._editor.html",_4);
var _5=_4.escapeXml=function(_6,_7){
_6=_6.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;");
if(!_7){
_6=_6.replace(/'/gm,"&#39;");
}
return _6;
};
_4.getNodeHtml=function(_8){
var _9=[];
_4.getNodeHtmlHelper(_8,_9);
return _9.join("");
};
_4.getNodeHtmlHelper=function(_a,_b){
switch(_a.nodeType){
case 1:
var _c=_a.nodeName.toLowerCase();
if(!_c||_c.charAt(0)=="/"){
return "";
}
_b.push("<",_c);
var _d=[],_e={};
var _f;
if(_3("dom-attributes-explicit")||_3("dom-attributes-specified-flag")){
var i=0;
while((_f=_a.attributes[i++])){
var n=_f.name;
if(n.substr(0,3)!=="_dj"&&(!_3("dom-attributes-specified-flag")||_f.specified)&&!(n in _e)){
var v=_f.value;
if(n=="src"||n=="href"){
if(_a.getAttribute("_djrealurl")){
v=_a.getAttribute("_djrealurl");
}
}
if(_3("ie")===8&&n==="style"){
v=v.replace("HEIGHT:","height:").replace("WIDTH:","width:");
}
_d.push([n,v]);
_e[n]=v;
}
}
}else{
var _10=/^input$|^img$/i.test(_a.nodeName)?_a:_a.cloneNode(false);
var s=_10.outerHTML;
var _11=/[\w-]+=("[^"]*"|'[^']*'|\S*)/gi;
var _12=s.match(_11);
s=s.substr(0,s.indexOf(">"));
_1.forEach(_12,function(_13){
if(_13){
var idx=_13.indexOf("=");
if(idx>0){
var key=_13.substring(0,idx);
if(key.substr(0,3)!="_dj"){
if(key=="src"||key=="href"){
if(_a.getAttribute("_djrealurl")){
_d.push([key,_a.getAttribute("_djrealurl")]);
return;
}
}
var val,_14;
switch(key){
case "style":
val=_a.style.cssText.toLowerCase();
break;
case "class":
val=_a.className;
break;
case "width":
if(_c==="img"){
_14=/width=(\S+)/i.exec(s);
if(_14){
val=_14[1];
}
break;
}
case "height":
if(_c==="img"){
_14=/height=(\S+)/i.exec(s);
if(_14){
val=_14[1];
}
break;
}
default:
val=_a.getAttribute(key);
}
if(val!=null){
_d.push([key,val.toString()]);
}
}
}
}
},this);
}
_d.sort(function(a,b){
return a[0]<b[0]?-1:(a[0]==b[0]?0:1);
});
var j=0;
while((_f=_d[j++])){
_b.push(" ",_f[0],"=\"",(typeof _f[1]==="string"?_5(_f[1],true):_f[1]),"\"");
}
switch(_c){
case "br":
case "hr":
case "img":
case "input":
case "base":
case "meta":
case "area":
case "basefont":
_b.push(" />");
break;
case "script":
_b.push(">",_a.innerHTML,"</",_c,">");
break;
default:
_b.push(">");
if(_a.hasChildNodes()){
_4.getChildrenHtmlHelper(_a,_b);
}
_b.push("</",_c,">");
}
break;
case 4:
case 3:
_b.push(_5(_a.nodeValue,true));
break;
case 8:
_b.push("<!--",_5(_a.nodeValue,true),"-->");
break;
default:
_b.push("<!-- Element not recognized - Type: ",_a.nodeType," Name: ",_a.nodeName,"-->");
}
};
_4.getChildrenHtml=function(_15){
var _16=[];
_4.getChildrenHtmlHelper(_15,_16);
return _16.join("");
};
_4.getChildrenHtmlHelper=function(dom,_17){
if(!dom){
return;
}
var _18=dom["childNodes"]||dom;
var _19=!_3("ie")||_18!==dom;
var _1a,i=0;
while((_1a=_18[i++])){
if(!_19||_1a.parentNode==dom){
_4.getNodeHtmlHelper(_1a,_17);
}
}
};
return _4;
});
