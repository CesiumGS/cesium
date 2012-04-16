/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.html.format"]){
dojo._hasResource["dojox.html.format"]=true;
dojo.provide("dojox.html.format");
dojo.require("dojox.html.entities");
dojox.html.format.prettyPrint=function(_1,_2,_3,_4,_5){
var _6=[];
var _7=0;
var _8=[];
var _9="\t";
var _a="";
var _b=[];
var i;
var _c=/[=]([^"']+?)(\s|>)/g;
var _d=/style=("[^"]*"|'[^']*'|\S*)/gi;
var _e=/[\w-]+=("[^"]*"|'[^']*'|\S*)/gi;
if(_2&&_2>0&&_2<10){
_9="";
for(i=0;i<_2;i++){
_9+=" ";
}
}
var _f=dojo.doc.createElement("div");
_f.innerHTML=_1;
var _10=dojox.html.entities.encode;
var _11=dojox.html.entities.decode;
var _12=function(tag){
switch(tag){
case "a":
case "b":
case "strong":
case "s":
case "strike":
case "i":
case "u":
case "em":
case "sup":
case "sub":
case "span":
case "font":
case "big":
case "cite":
case "q":
case "small":
return true;
default:
return false;
}
};
var div=_f.ownerDocument.createElement("div");
var _13=function(_14){
var _15=_14.cloneNode(false);
div.appendChild(_15);
var _16=div.innerHTML;
div.innerHTML="";
return _16;
};
var _17=function(){
var i,txt="";
for(i=0;i<_7;i++){
txt+=_9;
}
return txt.length;
};
var _18=function(){
var i;
for(i=0;i<_7;i++){
_6.push(_9);
}
};
var _19=function(){
_6.push("\n");
};
var _1a=function(n){
_a+=_10(n.nodeValue,_4);
};
var _1b=function(txt){
var i;
var _1c;
var _1d=txt.split("\n");
for(i=0;i<_1d.length;i++){
_1d[i]=dojo.trim(_1d[i]);
}
txt=_1d.join(" ");
txt=dojo.trim(txt);
if(txt!==""){
var _1e=[];
if(_3&&_3>0){
var _1f=_17();
var _20=_3;
if(_3>_1f){
_20-=_1f;
}
while(txt){
if(txt.length>_3){
for(i=_20;(i>0&&txt.charAt(i)!==" ");i--){
}
if(!i){
for(i=_20;(i<txt.length&&txt.charAt(i)!==" ");i++){
}
}
var _21=txt.substring(0,i);
_21=dojo.trim(_21);
txt=dojo.trim(txt.substring((i==txt.length)?txt.length:i+1,txt.length));
if(_21){
_1c="";
for(i=0;i<_7;i++){
_1c+=_9;
}
_21=_1c+_21+"\n";
}
_1e.push(_21);
}else{
_1c="";
for(i=0;i<_7;i++){
_1c+=_9;
}
txt=_1c+txt+"\n";
_1e.push(txt);
txt=null;
}
}
return _1e.join("");
}else{
_1c="";
for(i=0;i<_7;i++){
_1c+=_9;
}
txt=_1c+txt+"\n";
return txt;
}
}else{
return "";
}
};
var _22=function(txt){
if(txt){
txt=txt.replace(/&quot;/gi,"\"");
txt=txt.replace(/&gt;/gi,">");
txt=txt.replace(/&lt;/gi,"<");
txt=txt.replace(/&amp;/gi,"&");
}
return txt;
};
var _23=function(txt){
if(txt){
txt=_22(txt);
var i,t,c,_24;
var _25=0;
var _26=txt.split("\n");
var _27=[];
for(i=0;i<_26.length;i++){
var _28=_26[i];
var _29=(_28.indexOf("\n")>-1);
_28=dojo.trim(_28);
if(_28){
var _2a=_25;
for(c=0;c<_28.length;c++){
var ch=_28.charAt(c);
if(ch==="{"){
_25++;
}else{
if(ch==="}"){
_25--;
_2a=_25;
}
}
}
_24="";
for(t=0;t<_7+_2a;t++){
_24+=_9;
}
_27.push(_24+_28+"\n");
}else{
if(_29&&i===0){
_27.push("\n");
}
}
}
txt=_27.join("");
}
return txt;
};
var _2b=function(_2c){
var _2d=_2c.nodeName.toLowerCase();
var _2e=dojo.trim(_13(_2c));
var tag=_2e.substring(0,_2e.indexOf(">")+1);
tag=tag.replace(_c,"=\"$1\"$2");
tag=tag.replace(_d,function(_2f){
var sL=_2f.substring(0,6);
var _30=_2f.substring(6,_2f.length);
var _31=_30.charAt(0);
_30=dojo.trim(_30.substring(1,_30.length-1));
_30=_30.split(";");
var _32=[];
dojo.forEach(_30,function(s){
s=dojo.trim(s);
if(s){
s=s.substring(0,s.indexOf(":")).toLowerCase()+s.substring(s.indexOf(":"),s.length);
_32.push(s);
}
});
_32=_32.sort();
_30=_32.join("; ");
var ts=dojo.trim(_30);
if(!ts||ts===";"){
return "";
}else{
_30+=";";
return sL+_31+_30+_31;
}
});
var _33=[];
tag=tag.replace(_e,function(_34){
_33.push(dojo.trim(_34));
return "";
});
_33=_33.sort();
tag="<"+_2d;
if(_33.length){
tag+=" "+_33.join(" ");
}
if(_2e.indexOf("</")!=-1){
_8.push(_2d);
tag+=">";
}else{
if(_5){
tag+=" />";
}else{
tag+=">";
}
_8.push(false);
}
var _35=_12(_2d);
_b.push(_35);
if(_a&&!_35){
_6.push(_1b(_a));
_a="";
}
if(!_35){
_18();
_6.push(tag);
_19();
_7++;
}else{
_a+=tag;
}
};
var _36=function(){
var _37=_b.pop();
if(_a&&!_37){
_6.push(_1b(_a));
_a="";
}
var ct=_8.pop();
if(ct){
ct="</"+ct+">";
if(!_37){
_7--;
_18();
_6.push(ct);
_19();
}else{
_a+=ct;
}
}else{
_7--;
}
};
var _38=function(n){
var _39=_11(n.nodeValue,_4);
_18();
_6.push("<!--");
_19();
_7++;
_6.push(_1b(_39));
_7--;
_18();
_6.push("-->");
_19();
};
var _3a=function(_3b){
var _3c=_3b.childNodes;
if(_3c){
var i;
for(i=0;i<_3c.length;i++){
var n=_3c[i];
if(n.nodeType===1){
var tg=dojo.trim(n.tagName.toLowerCase());
if(dojo.isIE&&n.parentNode!=_3b){
continue;
}
if(tg&&tg.charAt(0)==="/"){
continue;
}else{
_2b(n);
if(tg==="script"){
_6.push(_23(n.innerHTML));
}else{
if(tg==="pre"){
var _3d=n.innerHTML;
if(dojo.isMoz){
_3d=_3d.replace("<br>","\n");
_3d=_3d.replace("<pre>","");
_3d=_3d.replace("</pre>","");
}
if(_3d.charAt(_3d.length-1)!=="\n"){
_3d+="\n";
}
_6.push(_3d);
}else{
_3a(n);
}
}
_36();
}
}else{
if(n.nodeType===3||n.nodeType===4){
_1a(n);
}else{
if(n.nodeType===8){
_38(n);
}
}
}
}
}
};
_3a(_f);
if(_a){
_6.push(_1b(_a));
_a="";
}
return _6.join("");
};
}
