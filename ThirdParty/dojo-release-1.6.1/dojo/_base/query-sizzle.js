/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.query"]){
dojo._hasResource["dojo._base.query"]=true;
var startDojoMappings=function(_1){
_1.query=function(_2,_3,_4){
_4=_4||_1.NodeList;
if(!_2){
return new _4();
}
if(_2.constructor==_4){
return _2;
}
if(!_1.isString(_2)){
return new _4(_2);
}
if(_1.isString(_3)){
_3=_1.byId(_3);
if(!_3){
return new _4();
}
}
return _1.Sizzle(_2,_3,new _4());
};
_1._filterQueryResult=function(_5,_6){
return _1.Sizzle.filter(_6,_5);
};
};
var defineSizzle=function(ns){
var _7=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|[^[\]]+)+\]|\\.|[^ >+~,(\[]+)+|[>+~])(\s*,\s*)?/g,_8=0,_9=Object.prototype.toString;
var _a=function(_b,_c,_d,_e){
_d=_d||[];
_c=_c||document;
if(_c.nodeType!==1&&_c.nodeType!==9){
return [];
}
if(!_b||typeof _b!=="string"){
return _d;
}
var _f=[],m,set,_10,_11,_12,_13,_14=true;
_7.lastIndex=0;
while((m=_7.exec(_b))!==null){
_f.push(m[1]);
if(m[2]){
_13=RegExp.rightContext;
break;
}
}
if(_f.length>1&&_15.match.POS.exec(_b)){
if(_f.length===2&&_15.relative[_f[0]]){
var _16="",_17;
while((_17=_15.match.POS.exec(_b))){
_16+=_17[0];
_b=_b.replace(_15.match.POS,"");
}
set=_a.filter(_16,_a(_b,_c));
}else{
set=_15.relative[_f[0]]?[_c]:_a(_f.shift(),_c);
while(_f.length){
var _18=[];
_b=_f.shift();
if(_15.relative[_b]){
_b+=_f.shift();
}
for(var i=0,l=set.length;i<l;i++){
_a(_b,set[i],_18);
}
set=_18;
}
}
}else{
var ret=_e?{expr:_f.pop(),set:_19(_e)}:_a.find(_f.pop(),_f.length===1&&_c.parentNode?_c.parentNode:_c);
set=_a.filter(ret.expr,ret.set);
if(_f.length>0){
_10=_19(set);
}else{
_14=false;
}
while(_f.length){
var cur=_f.pop(),pop=cur;
if(!_15.relative[cur]){
cur="";
}else{
pop=_f.pop();
}
if(pop==null){
pop=_c;
}
_15.relative[cur](_10,pop);
}
}
if(!_10){
_10=set;
}
if(!_10){
throw "Syntax error, unrecognized expression: "+(cur||_b);
}
if(_9.call(_10)==="[object Array]"){
if(!_14){
_d.push.apply(_d,_10);
}else{
if(_c.nodeType===1){
for(var i=0;_10[i]!=null;i++){
if(_10[i]&&(_10[i]===true||_10[i].nodeType===1&&_1a(_c,_10[i]))){
_d.push(set[i]);
}
}
}else{
for(var i=0;_10[i]!=null;i++){
if(_10[i]&&_10[i].nodeType===1){
_d.push(set[i]);
}
}
}
}
}else{
_19(_10,_d);
}
if(_13){
_a(_13,_c,_d,_e);
}
return _d;
};
_a.matches=function(_1b,set){
return _a(_1b,null,null,set);
};
_a.find=function(_1c,_1d){
var set,_1e;
if(!_1c){
return [];
}
for(var i=0,l=_15.order.length;i<l;i++){
var _1f=_15.order[i],_1e;
if((_1e=_15.match[_1f].exec(_1c))){
var _20=RegExp.leftContext;
if(_20.substr(_20.length-1)!=="\\"){
_1e[1]=(_1e[1]||"").replace(/\\/g,"");
set=_15.find[_1f](_1e,_1d);
if(set!=null){
_1c=_1c.replace(_15.match[_1f],"");
break;
}
}
}
}
if(!set){
set=_1d.getElementsByTagName("*");
}
return {set:set,expr:_1c};
};
_a.filter=function(_21,set,_22,not){
var old=_21,_23=[],_24=set,_25,_26;
while(_21&&set.length){
for(var _27 in _15.filter){
if((_25=_15.match[_27].exec(_21))!=null){
var _28=_15.filter[_27],_29=null,_2a=0,_2b,_2c;
_26=false;
if(_24==_23){
_23=[];
}
if(_15.preFilter[_27]){
_25=_15.preFilter[_27](_25,_24,_22,_23,not);
if(!_25){
_26=_2b=true;
}else{
if(_25[0]===true){
_29=[];
var _2d=null,_2e;
for(var i=0;(_2e=_24[i])!==undefined;i++){
if(_2e&&_2d!==_2e){
_29.push(_2e);
_2d=_2e;
}
}
}
}
}
if(_25){
for(var i=0;(_2c=_24[i])!==undefined;i++){
if(_2c){
if(_29&&_2c!=_29[_2a]){
_2a++;
}
_2b=_28(_2c,_25,_2a,_29);
var _2f=not^!!_2b;
if(_22&&_2b!=null){
if(_2f){
_26=true;
}else{
_24[i]=false;
}
}else{
if(_2f){
_23.push(_2c);
_26=true;
}
}
}
}
}
if(_2b!==undefined){
if(!_22){
_24=_23;
}
_21=_21.replace(_15.match[_27],"");
if(!_26){
return [];
}
break;
}
}
}
_21=_21.replace(/\s*,\s*/,"");
if(_21==old){
if(_26==null){
throw "Syntax error, unrecognized expression: "+_21;
}else{
break;
}
}
old=_21;
}
return _24;
};
var _15=_a.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u0128-\uFFFF_-]|\\.)+)/,CLASS:/\.((?:[\w\u0128-\uFFFF_-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u0128-\uFFFF_-]|\\.)+)['"]*\]/,ATTR:/\[((?:[\w\u0128-\uFFFF_-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\]/,TAG:/^((?:[\w\u0128-\uFFFF\*_-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child\(?(even|odd|[\dn+-]*)\)?/,POS:/:(nth|eq|gt|lt|first|last|even|odd)\(?(\d*)\)?(?:[^-]|$)/,PSEUDO:/:((?:[\w\u0128-\uFFFF_-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/},attrMap:{"class":"className","for":"htmlFor"},relative:{"+":function(_30,_31){
for(var i=0,l=_30.length;i<l;i++){
var _32=_30[i];
if(_32){
var cur=_32.previousSibling;
while(cur&&cur.nodeType!==1){
cur=cur.previousSibling;
}
_30[i]=typeof _31==="string"?cur||false:cur===_31;
}
}
if(typeof _31==="string"){
_a.filter(_31,_30,true);
}
},">":function(_33,_34){
if(typeof _34==="string"&&!/\W/.test(_34)){
_34=_34.toUpperCase();
for(var i=0,l=_33.length;i<l;i++){
var _35=_33[i];
if(_35){
var _36=_35.parentNode;
_33[i]=_36.nodeName===_34?_36:false;
}
}
}else{
for(var i=0,l=_33.length;i<l;i++){
var _35=_33[i];
if(_35){
_33[i]=typeof _34==="string"?_35.parentNode:_35.parentNode===_34;
}
}
if(typeof _34==="string"){
_a.filter(_34,_33,true);
}
}
},"":function(_37,_38){
var _39="done"+(_8++),_3a=_3b;
if(!_38.match(/\W/)){
var _3c=_38=_38.toUpperCase();
_3a=_3d;
}
_3a("parentNode",_38,_39,_37,_3c);
},"~":function(_3e,_3f){
var _40="done"+(_8++),_41=_3b;
if(typeof _3f==="string"&&!_3f.match(/\W/)){
var _42=_3f=_3f.toUpperCase();
_41=_3d;
}
_41("previousSibling",_3f,_40,_3e,_42);
}},find:{ID:function(_43,_44){
if(_44.getElementById){
var m=_44.getElementById(_43[1]);
return m?[m]:[];
}
},NAME:function(_45,_46){
return _46.getElementsByName?_46.getElementsByName(_45[1]):null;
},TAG:function(_47,_48){
return _48.getElementsByTagName(_47[1]);
}},preFilter:{CLASS:function(_49,_4a,_4b,_4c,not){
_49=" "+_49[1].replace(/\\/g,"")+" ";
for(var i=0;_4a[i];i++){
if(not^(" "+_4a[i].className+" ").indexOf(_49)>=0){
if(!_4b){
_4c.push(_4a[i]);
}
}else{
if(_4b){
_4a[i]=false;
}
}
}
return false;
},ID:function(_4d){
return _4d[1];
},TAG:function(_4e){
return _4e[1].toUpperCase();
},CHILD:function(_4f){
if(_4f[1]=="nth"){
var _50=/(-?)(\d*)n((?:\+|-)?\d*)/.exec(_4f[2]=="even"&&"2n"||_4f[2]=="odd"&&"2n+1"||!/\D/.test(_4f[2])&&"0n+"+_4f[2]||_4f[2]);
_4f[2]=(_50[1]+(_50[2]||1))-0;
_4f[3]=_50[3]-0;
}
_4f[0]="done"+(_8++);
return _4f;
},ATTR:function(_51){
var _52=_51[1];
if(_15.attrMap[_52]){
_51[1]=_15.attrMap[_52];
}
if(_51[2]==="~="){
_51[4]=" "+_51[4]+" ";
}
return _51;
},PSEUDO:function(_53,_54,_55,_56,not){
if(_53[1]==="not"){
if(_53[3].match(_7).length>1){
_53[3]=_a(_53[3],null,null,_54);
}else{
var ret=_a.filter(_53[3],_54,_55,true^not);
if(!_55){
_56.push.apply(_56,ret);
}
return false;
}
}
return _53;
},POS:function(_57){
_57.unshift(true);
return _57;
}},filters:{enabled:function(_58){
return _58.disabled===false&&_58.type!=="hidden";
},disabled:function(_59){
return _59.disabled===true;
},checked:function(_5a){
return _5a.checked===true;
},selected:function(_5b){
_5b.parentNode.selectedIndex;
return _5b.selected===true;
},parent:function(_5c){
return !!_5c.firstChild;
},empty:function(_5d){
return !_5d.firstChild;
},has:function(_5e,i,_5f){
return !!_a(_5f[3],_5e).length;
},header:function(_60){
return /h\d/i.test(_60.nodeName);
},text:function(_61){
return "text"===_61.type;
},radio:function(_62){
return "radio"===_62.type;
},checkbox:function(_63){
return "checkbox"===_63.type;
},file:function(_64){
return "file"===_64.type;
},password:function(_65){
return "password"===_65.type;
},submit:function(_66){
return "submit"===_66.type;
},image:function(_67){
return "image"===_67.type;
},reset:function(_68){
return "reset"===_68.type;
},button:function(_69){
return "button"===_69.type||_69.nodeName.toUpperCase()==="BUTTON";
},input:function(_6a){
return /input|select|textarea|button/i.test(_6a.nodeName);
}},setFilters:{first:function(_6b,i){
return i===0;
},last:function(_6c,i,_6d,_6e){
return i===_6e.length-1;
},even:function(_6f,i){
return i%2===0;
},odd:function(_70,i){
return i%2===1;
},lt:function(_71,i,_72){
return i<_72[3]-0;
},gt:function(_73,i,_74){
return i>_74[3]-0;
},nth:function(_75,i,_76){
return _76[3]-0==i;
},eq:function(_77,i,_78){
return _78[3]-0==i;
}},filter:{CHILD:function(_79,_7a){
var _7b=_7a[1],_7c=_79.parentNode;
var _7d=_7a[0];
if(_7c&&!_7c[_7d]){
var _7e=1;
for(var _7f=_7c.firstChild;_7f;_7f=_7f.nextSibling){
if(_7f.nodeType==1){
_7f.nodeIndex=_7e++;
}
}
_7c[_7d]=_7e-1;
}
if(_7b=="first"){
return _79.nodeIndex==1;
}else{
if(_7b=="last"){
return _79.nodeIndex==_7c[_7d];
}else{
if(_7b=="only"){
return _7c[_7d]==1;
}else{
if(_7b=="nth"){
var add=false,_80=_7a[2],_81=_7a[3];
if(_80==1&&_81==0){
return true;
}
if(_80==0){
if(_79.nodeIndex==_81){
add=true;
}
}else{
if((_79.nodeIndex-_81)%_80==0&&(_79.nodeIndex-_81)/_80>=0){
add=true;
}
}
return add;
}
}
}
}
},PSEUDO:function(_82,_83,i,_84){
var _85=_83[1],_86=_15.filters[_85];
if(_86){
return _86(_82,i,_83,_84);
}else{
if(_85==="contains"){
return (_82.textContent||_82.innerText||"").indexOf(_83[3])>=0;
}else{
if(_85==="not"){
var not=_83[3];
for(var i=0,l=not.length;i<l;i++){
if(not[i]===_82){
return false;
}
}
return true;
}
}
}
},ID:function(_87,_88){
return _87.nodeType===1&&_87.getAttribute("id")===_88;
},TAG:function(_89,_8a){
return (_8a==="*"&&_89.nodeType===1)||_89.nodeName===_8a;
},CLASS:function(_8b,_8c){
return _8c.test(_8b.className);
},ATTR:function(_8d,_8e){
var _8f=_8d[_8e[1]]||_8d.getAttribute(_8e[1]),_90=_8f+"",_91=_8e[2],_92=_8e[4];
return _8f==null?false:_91==="="?_90===_92:_91==="*="?_90.indexOf(_92)>=0:_91==="~="?(" "+_90+" ").indexOf(_92)>=0:!_8e[4]?_8f:_91==="!="?_90!=_92:_91==="^="?_90.indexOf(_92)===0:_91==="$="?_90.substr(_90.length-_92.length)===_92:_91==="|="?_90===_92||_90.substr(0,_92.length+1)===_92+"-":false;
},POS:function(_93,_94,i,_95){
var _96=_94[2],_97=_15.setFilters[_96];
if(_97){
return _97(_93,i,_94,_95);
}
}}};
for(var _98 in _15.match){
_15.match[_98]=RegExp(_15.match[_98].source+/(?![^\[]*\])(?![^\(]*\))/.source);
}
var _19=function(_99,_9a){
_99=Array.prototype.slice.call(_99);
if(_9a){
_9a.push.apply(_9a,_99);
return _9a;
}
return _99;
};
try{
Array.prototype.slice.call(document.documentElement.childNodes);
}
catch(e){
_19=function(_9b,_9c){
var ret=_9c||[];
if(_9.call(_9b)==="[object Array]"){
Array.prototype.push.apply(ret,_9b);
}else{
if(typeof _9b.length==="number"){
for(var i=0,l=_9b.length;i<l;i++){
ret.push(_9b[i]);
}
}else{
for(var i=0;_9b[i];i++){
ret.push(_9b[i]);
}
}
}
return ret;
};
}
(function(){
var _9d=document.createElement("form"),id="script"+(new Date).getTime();
_9d.innerHTML="<input name='"+id+"'/>";
var _9e=document.documentElement;
_9e.insertBefore(_9d,_9e.firstChild);
if(!!document.getElementById(id)){
_15.find.ID=function(_9f,_a0){
if(_a0.getElementById){
var m=_a0.getElementById(_9f[1]);
return m?m.id===_9f[1]||m.getAttributeNode&&m.getAttributeNode("id").nodeValue===_9f[1]?[m]:undefined:[];
}
};
_15.filter.ID=function(_a1,_a2){
var _a3=_a1.getAttributeNode&&_a1.getAttributeNode("id");
return _a1.nodeType===1&&_a3&&_a3.nodeValue===_a2;
};
}
_9e.removeChild(_9d);
})();
(function(){
var div=document.createElement("div");
div.appendChild(document.createComment(""));
if(div.getElementsByTagName("*").length>0){
_15.find.TAG=function(_a4,_a5){
var _a6=_a5.getElementsByTagName(_a4[1]);
if(_a4[1]==="*"){
var tmp=[];
for(var i=0;_a6[i];i++){
if(_a6[i].nodeType===1){
tmp.push(_a6[i]);
}
}
_a6=tmp;
}
return _a6;
};
}
})();
if(document.querySelectorAll){
(function(){
var _a7=_a;
_a=function(_a8,_a9,_aa,_ab){
_a9=_a9||document;
if(!_ab&&_a9.nodeType===9){
try{
return _19(_a9.querySelectorAll(_a8),_aa);
}
catch(e){
}
}
return _a7(_a8,_a9,_aa,_ab);
};
_a.find=_a7.find;
_a.filter=_a7.filter;
_a.selectors=_a7.selectors;
_a.matches=_a7.matches;
})();
}
if(document.documentElement.getElementsByClassName){
_15.order.splice(1,0,"CLASS");
_15.find.CLASS=function(_ac,_ad){
return _ad.getElementsByClassName(_ac[1]);
};
}
function _3d(dir,cur,_ae,_af,_b0){
for(var i=0,l=_af.length;i<l;i++){
var _b1=_af[i];
if(_b1){
_b1=_b1[dir];
var _b2=false;
while(_b1&&_b1.nodeType){
var _b3=_b1[_ae];
if(_b3){
_b2=_af[_b3];
break;
}
if(_b1.nodeType===1){
_b1[_ae]=i;
}
if(_b1.nodeName===cur){
_b2=_b1;
break;
}
_b1=_b1[dir];
}
_af[i]=_b2;
}
}
};
function _3b(dir,cur,_b4,_b5,_b6){
for(var i=0,l=_b5.length;i<l;i++){
var _b7=_b5[i];
if(_b7){
_b7=_b7[dir];
var _b8=false;
while(_b7&&_b7.nodeType){
if(_b7[_b4]){
_b8=_b5[_b7[_b4]];
break;
}
if(_b7.nodeType===1){
_b7[_b4]=i;
if(typeof cur!=="string"){
if(_b7===cur){
_b8=true;
break;
}
}else{
if(_a.filter(cur,[_b7]).length>0){
_b8=_b7;
break;
}
}
}
_b7=_b7[dir];
}
_b5[i]=_b8;
}
}
};
var _1a=document.compareDocumentPosition?function(a,b){
return a.compareDocumentPosition(b)&16;
}:function(a,b){
return a!==b&&(a.contains?a.contains(b):true);
};
ns.Sizzle=_a;
};
if(this["dojo"]){
var defined=0;
if(!defined){
dojo.provide("dojo._base.query");
dojo.require("dojo._base.NodeList");
defineSizzle(dojo);
}
}else{
defineSizzle(window);
}
}
