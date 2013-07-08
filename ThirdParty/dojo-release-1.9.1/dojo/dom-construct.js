/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom-construct",["exports","./_base/kernel","./sniff","./_base/window","./dom","./dom-attr"],function(_1,_2,_3,_4,_5,_6){
var _7={option:["select"],tbody:["table"],thead:["table"],tfoot:["table"],tr:["table","tbody"],td:["table","tbody","tr"],th:["table","thead","tr"],legend:["fieldset"],caption:["table"],colgroup:["table"],col:["table","colgroup"],li:["ul"]},_8=/<\s*([\w\:]+)/,_9={},_a=0,_b="__"+_2._scopeName+"ToDomId";
for(var _c in _7){
if(_7.hasOwnProperty(_c)){
var tw=_7[_c];
tw.pre=_c=="option"?"<select multiple=\"multiple\">":"<"+tw.join("><")+">";
tw.post="</"+tw.reverse().join("></")+">";
}
}
var _d;
if(_3("ie")<=8){
_d=function(_e){
_e.__dojo_html5_tested="yes";
var _f=_10("div",{innerHTML:"<nav>a</nav>",style:{visibility:"hidden"}},_e.body);
if(_f.childNodes.length!==1){
("abbr article aside audio canvas details figcaption figure footer header "+"hgroup mark meter nav output progress section summary time video").replace(/\b\w+\b/g,function(n){
_e.createElement(n);
});
}
_11(_f);
};
}
function _12(_13,ref){
var _14=ref.parentNode;
if(_14){
_14.insertBefore(_13,ref);
}
};
function _15(_16,ref){
var _17=ref.parentNode;
if(_17){
if(_17.lastChild==ref){
_17.appendChild(_16);
}else{
_17.insertBefore(_16,ref.nextSibling);
}
}
};
_1.toDom=function toDom(_18,doc){
doc=doc||_4.doc;
var _19=doc[_b];
if(!_19){
doc[_b]=_19=++_a+"";
_9[_19]=doc.createElement("div");
}
if(_3("ie")<=8){
if(!doc.__dojo_html5_tested&&doc.body){
_d(doc);
}
}
_18+="";
var _1a=_18.match(_8),tag=_1a?_1a[1].toLowerCase():"",_1b=_9[_19],_1c,i,fc,df;
if(_1a&&_7[tag]){
_1c=_7[tag];
_1b.innerHTML=_1c.pre+_18+_1c.post;
for(i=_1c.length;i;--i){
_1b=_1b.firstChild;
}
}else{
_1b.innerHTML=_18;
}
if(_1b.childNodes.length==1){
return _1b.removeChild(_1b.firstChild);
}
df=doc.createDocumentFragment();
while((fc=_1b.firstChild)){
df.appendChild(fc);
}
return df;
};
_1.place=function place(_1d,_1e,_1f){
_1e=_5.byId(_1e);
if(typeof _1d=="string"){
_1d=/^\s*</.test(_1d)?_1.toDom(_1d,_1e.ownerDocument):_5.byId(_1d);
}
if(typeof _1f=="number"){
var cn=_1e.childNodes;
if(!cn.length||cn.length<=_1f){
_1e.appendChild(_1d);
}else{
_12(_1d,cn[_1f<0?0:_1f]);
}
}else{
switch(_1f){
case "before":
_12(_1d,_1e);
break;
case "after":
_15(_1d,_1e);
break;
case "replace":
_1e.parentNode.replaceChild(_1d,_1e);
break;
case "only":
_1.empty(_1e);
_1e.appendChild(_1d);
break;
case "first":
if(_1e.firstChild){
_12(_1d,_1e.firstChild);
break;
}
default:
_1e.appendChild(_1d);
}
}
return _1d;
};
var _10=_1.create=function _10(tag,_20,_21,pos){
var doc=_4.doc;
if(_21){
_21=_5.byId(_21);
doc=_21.ownerDocument;
}
if(typeof tag=="string"){
tag=doc.createElement(tag);
}
if(_20){
_6.set(tag,_20);
}
if(_21){
_1.place(tag,_21,pos);
}
return tag;
};
function _22(_23){
if(_23.canHaveChildren){
try{
_23.innerHTML="";
return;
}
catch(e){
}
}
for(var c;c=_23.lastChild;){
_24(c,_23);
}
};
_1.empty=function empty(_25){
_22(_5.byId(_25));
};
function _24(_26,_27){
if(_26.firstChild){
_22(_26);
}
if(_27){
_3("ie")&&_27.canHaveChildren&&"removeNode" in _26?_26.removeNode(false):_27.removeChild(_26);
}
};
var _11=_1.destroy=function _11(_28){
_28=_5.byId(_28);
if(!_28){
return;
}
_24(_28,_28.parentNode);
};
});
