/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.NormalizeStyle"]){
dojo._hasResource["dojox.editor.plugins.NormalizeStyle"]=true;
dojo.provide("dojox.editor.plugins.NormalizeStyle");
dojo.require("dijit._editor.html");
dojo.require("dijit._editor._Plugin");
dojo.declare("dojox.editor.plugins.NormalizeStyle",dijit._editor._Plugin,{mode:"semantic",condenseSpans:true,setEditor:function(_1){
this.editor=_1;
_1.customUndo=true;
if(this.mode==="semantic"){
this.editor.contentDomPostFilters.push(dojo.hitch(this,this._convertToSemantic));
}else{
if(this.mode==="css"){
this.editor.contentDomPostFilters.push(dojo.hitch(this,this._convertToCss));
}
}
if(dojo.isIE){
this.editor.contentDomPreFilters.push(dojo.hitch(this,this._convertToSemantic));
this._browserFilter=this._convertToSemantic;
}else{
if(dojo.isWebKit){
this.editor.contentDomPreFilters.push(dojo.hitch(this,this._convertToCss));
this._browserFilter=this._convertToCss;
}else{
if(dojo.isMoz){
this.editor.contentDomPreFilters.push(dojo.hitch(this,this._convertToSemantic));
this._browserFilter=this._convertToSemantic;
}else{
this.editor.contentDomPreFilters.push(dojo.hitch(this,this._convertToSemantic));
this._browserFilter=this._convertToSemantic;
}
}
}
if(this.editor._inserthtmlImpl){
this.editor._oldInsertHtmlImpl=this.editor._inserthtmlImpl;
}
this.editor._inserthtmlImpl=dojo.hitch(this,this._inserthtmlImpl);
},_convertToSemantic:function(_2){
if(_2){
var w=this.editor.window;
var _3=this;
var _4=function(_5){
if(_5.nodeType==1){
if(_5.id!=="dijitEditorBody"){
var _6=_5.style;
var _7=_5.tagName?_5.tagName.toLowerCase():"";
var _8;
if(_6&&_7!="table"&&_7!="ul"&&_7!="ol"){
var fw=_6.fontWeight?_6.fontWeight.toLowerCase():"";
var fs=_6.fontStyle?_6.fontStyle.toLowerCase():"";
var td=_6.textDecoration?_6.textDecoration.toLowerCase():"";
var s=_6.fontSize?_6.fontSize.toLowerCase():"";
var bc=_6.backgroundColor?_6.backgroundColor.toLowerCase():"";
var c=_6.color?_6.color.toLowerCase():"";
var _9=function(_a,_b){
if(_a){
while(_b.firstChild){
_a.appendChild(_b.firstChild);
}
if(_7=="span"&&!_b.style.cssText){
dojo.place(_a,_b,"before");
_b.parentNode.removeChild(_b);
_b=_a;
}else{
_b.appendChild(_a);
}
}
return _b;
};
switch(fw){
case "bold":
case "bolder":
case "700":
case "800":
case "900":
_8=dojo.withGlobal(w,"create",dojo,["b",{}]);
_5.style.fontWeight="";
break;
}
_5=_9(_8,_5);
_8=null;
if(fs=="italic"){
_8=dojo.withGlobal(w,"create",dojo,["i",{}]);
_5.style.fontStyle="";
}
_5=_9(_8,_5);
_8=null;
if(td){
var da=td.split(" ");
var _c=0;
dojo.forEach(da,function(s){
switch(s){
case "underline":
_8=dojo.withGlobal(w,"create",dojo,["u",{}]);
break;
case "line-through":
_8=dojo.withGlobal(w,"create",dojo,["strike",{}]);
break;
}
_c++;
if(_c==da.length){
_5.style.textDecoration="";
}
_5=_9(_8,_5);
_8=null;
});
}
if(s){
var _d={"xx-small":1,"x-small":2,"small":3,"medium":4,"large":5,"x-large":6,"xx-large":7,"-webkit-xxx-large":7};
if(s.indexOf("pt")>0){
s=s.substring(0,s.indexOf("pt"));
s=parseInt(s);
if(s<5){
s="xx-small";
}else{
if(s<10){
s="x-small";
}else{
if(s<15){
s="small";
}else{
if(s<20){
s="medium";
}else{
if(s<25){
s="large";
}else{
if(s<30){
s="x-large";
}else{
if(s>30){
s="xx-large";
}
}
}
}
}
}
}
}else{
if(s.indexOf("px")>0){
s=s.substring(0,s.indexOf("px"));
s=parseInt(s);
if(s<5){
s="xx-small";
}else{
if(s<10){
s="x-small";
}else{
if(s<15){
s="small";
}else{
if(s<20){
s="medium";
}else{
if(s<25){
s="large";
}else{
if(s<30){
s="x-large";
}else{
if(s>30){
s="xx-large";
}
}
}
}
}
}
}
}
}
var _e=_d[s];
if(!_e){
_e=3;
}
_8=dojo.withGlobal(w,"create",dojo,["font",{size:_e}]);
_5.style.fontSize="";
}
_5=_9(_8,_5);
_8=null;
if(bc&&_7!=="font"&&_3._isInline(_7)){
bc=new dojo.Color(bc).toHex();
_8=dojo.withGlobal(w,"create",dojo,["font",{style:{backgroundColor:bc}}]);
_5.style.backgroundColor="";
}
if(c&&_7!=="font"){
c=new dojo.Color(c).toHex();
_8=dojo.withGlobal(w,"create",dojo,["font",{color:c}]);
_5.style.color="";
}
_5=_9(_8,_5);
_8=null;
}
}
if(_5.childNodes){
var _f=[];
dojo.forEach(_5.childNodes,function(n){
_f.push(n);
});
dojo.forEach(_f,_4);
}
}
return _5;
};
return this._normalizeTags(_4(_2));
}
return _2;
},_normalizeTags:function(_10){
var w=this.editor.window;
var _11=dojo.withGlobal(w,function(){
return dojo.query("em,s,strong",_10);
});
if(_11&&_11.length){
dojo.forEach(_11,function(n){
if(n){
var tag=n.tagName?n.tagName.toLowerCase():"";
var _12;
switch(tag){
case "s":
_12="strike";
break;
case "em":
_12="i";
break;
case "strong":
_12="b";
break;
}
if(_12){
var _13=dojo.withGlobal(w,"create",dojo,[_12,null,n,"before"]);
while(n.firstChild){
_13.appendChild(n.firstChild);
}
n.parentNode.removeChild(n);
}
}
});
}
return _10;
},_convertToCss:function(_14){
if(_14){
var w=this.editor.window;
var _15=function(_16){
if(_16.nodeType==1){
if(_16.id!=="dijitEditorBody"){
var tag=_16.tagName?_16.tagName.toLowerCase():"";
if(tag){
var _17;
switch(tag){
case "b":
case "strong":
_17=dojo.withGlobal(w,"create",dojo,["span",{style:{"fontWeight":"bold"}}]);
break;
case "i":
case "em":
_17=dojo.withGlobal(w,"create",dojo,["span",{style:{"fontStyle":"italic"}}]);
break;
case "u":
_17=dojo.withGlobal(w,"create",dojo,["span",{style:{"textDecoration":"underline"}}]);
break;
case "strike":
case "s":
_17=dojo.withGlobal(w,"create",dojo,["span",{style:{"textDecoration":"line-through"}}]);
break;
case "font":
var _18={};
if(dojo.attr(_16,"color")){
_18.color=dojo.attr(_16,"color");
}
if(dojo.attr(_16,"face")){
_18.fontFace=dojo.attr(_16,"face");
}
if(_16.style&&_16.style.backgroundColor){
_18.backgroundColor=_16.style.backgroundColor;
}
if(_16.style&&_16.style.color){
_18.color=_16.style.color;
}
var _19={1:"xx-small",2:"x-small",3:"small",4:"medium",5:"large",6:"x-large",7:"xx-large"};
if(dojo.attr(_16,"size")){
_18.fontSize=_19[dojo.attr(_16,"size")];
}
_17=dojo.withGlobal(w,"create",dojo,["span",{style:_18}]);
break;
}
if(_17){
while(_16.firstChild){
_17.appendChild(_16.firstChild);
}
dojo.place(_17,_16,"before");
_16.parentNode.removeChild(_16);
_16=_17;
}
}
}
if(_16.childNodes){
var _1a=[];
dojo.forEach(_16.childNodes,function(n){
_1a.push(n);
});
dojo.forEach(_1a,_15);
}
}
return _16;
};
_14=_15(_14);
if(this.condenseSpans){
this._condenseSpans(_14);
}
}
return _14;
},_condenseSpans:function(_1b){
var _1c=function(_1d){
var _1e=function(_1f){
var m;
if(_1f){
m={};
var _20=_1f.toLowerCase().split(";");
dojo.forEach(_20,function(s){
if(s){
var ss=s.split(":");
var key=ss[0]?dojo.trim(ss[0]):"";
var val=ss[1]?dojo.trim(ss[1]):"";
if(key&&val){
var i;
var _21="";
for(i=0;i<key.length;i++){
var ch=key.charAt(i);
if(ch=="-"){
i++;
ch=key.charAt(i);
_21+=ch.toUpperCase();
}else{
_21+=ch;
}
}
m[_21]=val;
}
}
});
}
return m;
};
if(_1d&&_1d.nodeType==1){
var tag=_1d.tagName?_1d.tagName.toLowerCase():"";
if(tag==="span"&&_1d.childNodes&&_1d.childNodes.length===1){
var c=_1d.firstChild;
while(c&&c.nodeType==1&&c.tagName&&c.tagName.toLowerCase()=="span"){
if(!dojo.attr(c,"class")&&!dojo.attr(c,"id")&&c.style){
var s1=_1e(_1d.style.cssText);
var s2=_1e(c.style.cssText);
if(s1&&s2){
var _22={};
var i;
for(i in s1){
if(!s1[i]||!s2[i]||s1[i]==s2[i]){
_22[i]=s1[i];
delete s2[i];
}else{
if(s1[i]!=s2[i]){
if(i=="textDecoration"){
_22[i]=s1[i]+" "+s2[i];
delete s2[i];
}else{
_22=null;
}
break;
}else{
_22=null;
break;
}
}
}
if(_22){
for(i in s2){
_22[i]=s2[i];
}
dojo.style(_1d,_22);
while(c.firstChild){
_1d.appendChild(c.firstChild);
}
var t=c.nextSibling;
c.parentNode.removeChild(c);
c=t;
}else{
c=c.nextSibling;
}
}else{
c=c.nextSibling;
}
}else{
c=c.nextSibling;
}
}
}
}
if(_1d.childNodes&&_1d.childNodes.length){
dojo.forEach(_1d.childNodes,_1c);
}
};
_1c(_1b);
},_isInline:function(tag){
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
case "img":
case "small":
return true;
default:
return false;
}
},_inserthtmlImpl:function(_23){
if(_23){
var div=this.editor.document.createElement("div");
div.innerHTML=_23;
div=this._browserFilter(div);
_23=dijit._editor.getChildrenHtml(div);
div.innerHTML="";
if(this.editor._oldInsertHtmlImpl){
return this.editor._oldInsertHtmlImpl(_23);
}else{
return this.editor.execCommand("inserthtml",_23);
}
}
return false;
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _24=o.args.name.toLowerCase();
if(_24==="normalizestyle"){
o.plugin=new dojox.editor.plugins.NormalizeStyle({mode:("mode" in o.args)?o.args.mode:"semantic",condenseSpans:("condenseSpans" in o.args)?o.args.condenseSpans:true});
}
});
}
