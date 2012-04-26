/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.highlight._base"]){
dojo._hasResource["dojox.highlight._base"]=true;
dojo.provide("dojox.highlight._base");
(function(){
var dh=dojox.highlight,_1="\\b(0x[A-Za-z0-9]+|\\d+(\\.\\d+)?)";
dh.constants={IDENT_RE:"[a-zA-Z][a-zA-Z0-9_]*",UNDERSCORE_IDENT_RE:"[a-zA-Z_][a-zA-Z0-9_]*",NUMBER_RE:"\\b\\d+(\\.\\d+)?",C_NUMBER_RE:_1,APOS_STRING_MODE:{className:"string",begin:"'",end:"'",illegal:"\\n",contains:["escape"],relevance:0},QUOTE_STRING_MODE:{className:"string",begin:"\"",end:"\"",illegal:"\\n",contains:["escape"],relevance:0},BACKSLASH_ESCAPE:{className:"escape",begin:"\\\\.",end:"^",relevance:0},C_LINE_COMMENT_MODE:{className:"comment",begin:"//",end:"$",relevance:0},C_BLOCK_COMMENT_MODE:{className:"comment",begin:"/\\*",end:"\\*/"},HASH_COMMENT_MODE:{className:"comment",begin:"#",end:"$"},C_NUMBER_MODE:{className:"number",begin:_1,end:"^",relevance:0}};
function _2(_3){
return _3.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;");
};
function _4(_5){
return dojo.every(_5.childNodes,function(_6){
return _6.nodeType==3||String(_6.nodeName).toLowerCase()=="br";
});
};
function _7(_8){
var _9=[];
dojo.forEach(_8.childNodes,function(_a){
if(_a.nodeType==3){
_9.push(_a.nodeValue);
}else{
if(String(_a.nodeName).toLowerCase()=="br"){
_9.push("\n");
}else{
throw "Complex markup";
}
}
});
return _9.join("");
};
function _b(_c){
if(!_c.keywordGroups){
for(var _d in _c.keywords){
var kw=_c.keywords[_d];
if(kw instanceof Object){
_c.keywordGroups=_c.keywords;
}else{
_c.keywordGroups={keyword:_c.keywords};
}
break;
}
}
};
function _e(_f){
if(_f.defaultMode&&_f.modes){
_b(_f.defaultMode);
dojo.forEach(_f.modes,_b);
}
};
var _10=function(_11,_12){
this.langName=_11;
this.lang=dh.languages[_11];
this.modes=[this.lang.defaultMode];
this.relevance=0;
this.keywordCount=0;
this.result=[];
if(!this.lang.defaultMode.illegalRe){
this.buildRes();
_e(this.lang);
}
try{
this.highlight(_12);
this.result=this.result.join("");
}
catch(e){
if(e=="Illegal"){
this.relevance=0;
this.keywordCount=0;
this.partialResult=this.result.join("");
this.result=_2(_12);
}else{
throw e;
}
}
};
dojo.extend(_10,{buildRes:function(){
dojo.forEach(this.lang.modes,function(_13){
if(_13.begin){
_13.beginRe=this.langRe("^"+_13.begin);
}
if(_13.end){
_13.endRe=this.langRe("^"+_13.end);
}
if(_13.illegal){
_13.illegalRe=this.langRe("^(?:"+_13.illegal+")");
}
},this);
this.lang.defaultMode.illegalRe=this.langRe("^(?:"+this.lang.defaultMode.illegal+")");
},subMode:function(_14){
var _15=this.modes[this.modes.length-1].contains;
if(_15){
var _16=this.lang.modes;
for(var i=0;i<_15.length;++i){
var _17=_15[i];
for(var j=0;j<_16.length;++j){
var _18=_16[j];
if(_18.className==_17&&_18.beginRe.test(_14)){
return _18;
}
}
}
}
return null;
},endOfMode:function(_19){
for(var i=this.modes.length-1;i>=0;--i){
var _1a=this.modes[i];
if(_1a.end&&_1a.endRe.test(_19)){
return this.modes.length-i;
}
if(!_1a.endsWithParent){
break;
}
}
return 0;
},isIllegal:function(_1b){
var _1c=this.modes[this.modes.length-1].illegalRe;
return _1c&&_1c.test(_1b);
},langRe:function(_1d,_1e){
var _1f="m"+(this.lang.case_insensitive?"i":"")+(_1e?"g":"");
return new RegExp(_1d,_1f);
},buildTerminators:function(){
var _20=this.modes[this.modes.length-1],_21={};
if(_20.contains){
dojo.forEach(this.lang.modes,function(_22){
if(dojo.indexOf(_20.contains,_22.className)>=0){
_21[_22.begin]=1;
}
});
}
for(var i=this.modes.length-1;i>=0;--i){
var m=this.modes[i];
if(m.end){
_21[m.end]=1;
}
if(!m.endsWithParent){
break;
}
}
if(_20.illegal){
_21[_20.illegal]=1;
}
var t=[];
for(i in _21){
t.push(i);
}
_20.terminatorsRe=this.langRe("("+t.join("|")+")");
},eatModeChunk:function(_23,_24){
var _25=this.modes[this.modes.length-1];
if(!_25.terminatorsRe){
this.buildTerminators();
}
_23=_23.substr(_24);
var _26=_25.terminatorsRe.exec(_23);
if(!_26){
return {buffer:_23,lexeme:"",end:true};
}
return {buffer:_26.index?_23.substr(0,_26.index):"",lexeme:_26[0],end:false};
},keywordMatch:function(_27,_28){
var _29=_28[0];
if(this.lang.case_insensitive){
_29=_29.toLowerCase();
}
for(var _2a in _27.keywordGroups){
if(_29 in _27.keywordGroups[_2a]){
return _2a;
}
}
return "";
},buildLexemes:function(_2b){
var _2c={};
dojo.forEach(_2b.lexems,function(_2d){
_2c[_2d]=1;
});
var t=[];
for(var i in _2c){
t.push(i);
}
_2b.lexemsRe=this.langRe("("+t.join("|")+")",true);
},processKeywords:function(_2e){
var _2f=this.modes[this.modes.length-1];
if(!_2f.keywords||!_2f.lexems){
return _2(_2e);
}
if(!_2f.lexemsRe){
this.buildLexemes(_2f);
}
_2f.lexemsRe.lastIndex=0;
var _30=[],_31=0,_32=_2f.lexemsRe.exec(_2e);
while(_32){
_30.push(_2(_2e.substr(_31,_32.index-_31)));
var _33=this.keywordMatch(_2f,_32);
if(_33){
++this.keywordCount;
_30.push("<span class=\""+_33+"\">"+_2(_32[0])+"</span>");
}else{
_30.push(_2(_32[0]));
}
_31=_2f.lexemsRe.lastIndex;
_32=_2f.lexemsRe.exec(_2e);
}
_30.push(_2(_2e.substr(_31,_2e.length-_31)));
return _30.join("");
},processModeInfo:function(_34,_35,end){
var _36=this.modes[this.modes.length-1];
if(end){
this.result.push(this.processKeywords(_36.buffer+_34));
return;
}
if(this.isIllegal(_35)){
throw "Illegal";
}
var _37=this.subMode(_35);
if(_37){
_36.buffer+=_34;
this.result.push(this.processKeywords(_36.buffer));
if(_37.excludeBegin){
this.result.push(_35+"<span class=\""+_37.className+"\">");
_37.buffer="";
}else{
this.result.push("<span class=\""+_37.className+"\">");
_37.buffer=_35;
}
this.modes.push(_37);
this.relevance+=typeof _37.relevance=="number"?_37.relevance:1;
return;
}
var _38=this.endOfMode(_35);
if(_38){
_36.buffer+=_34;
if(_36.excludeEnd){
this.result.push(this.processKeywords(_36.buffer)+"</span>"+_35);
}else{
this.result.push(this.processKeywords(_36.buffer+_35)+"</span>");
}
while(_38>1){
this.result.push("</span>");
--_38;
this.modes.pop();
}
this.modes.pop();
this.modes[this.modes.length-1].buffer="";
return;
}
},highlight:function(_39){
var _3a=0;
this.lang.defaultMode.buffer="";
do{
var _3b=this.eatModeChunk(_39,_3a);
this.processModeInfo(_3b.buffer,_3b.lexeme,_3b.end);
_3a+=_3b.buffer.length+_3b.lexeme.length;
}while(!_3b.end);
if(this.modes.length>1){
throw "Illegal";
}
}});
function _3c(_3d,_3e,_3f){
if(String(_3d.tagName).toLowerCase()=="code"&&String(_3d.parentNode.tagName).toLowerCase()=="pre"){
var _40=document.createElement("div"),_41=_3d.parentNode.parentNode;
_40.innerHTML="<pre><code class=\""+_3e+"\">"+_3f+"</code></pre>";
_41.replaceChild(_40.firstChild,_3d.parentNode);
}else{
_3d.className=_3e;
_3d.innerHTML=_3f;
}
};
function _42(_43,str){
var _44=new _10(_43,str);
return {result:_44.result,langName:_43,partialResult:_44.partialResult};
};
function _45(_46,_47){
var _48=_42(_47,_7(_46));
_3c(_46,_46.className,_48.result);
};
function _49(str){
var _4a="",_4b="",_4c=2,_4d=str;
for(var key in dh.languages){
if(!dh.languages[key].defaultMode){
continue;
}
var _4e=new _10(key,_4d),_4f=_4e.keywordCount+_4e.relevance,_50=0;
if(!_4a||_4f>_50){
_50=_4f;
_4a=_4e.result;
_4b=_4e.langName;
}
}
return {result:_4a,langName:_4b};
};
function _51(_52){
var _53=_49(_7(_52));
if(_53.result){
_3c(_52,_53.langName,_53.result);
}
};
dojox.highlight.processString=function(str,_54){
return _54?_42(_54,str):_49(str);
};
dojox.highlight.init=function(_55){
_55=dojo.byId(_55);
if(dojo.hasClass(_55,"no-highlight")){
return;
}
if(!_4(_55)){
return;
}
var _56=_55.className.split(/\s+/),_57=dojo.some(_56,function(_58){
if(_58.charAt(0)!="_"&&dh.languages[_58]){
_45(_55,_58);
return true;
}
return false;
});
if(!_57){
_51(_55);
}
};
dh.Code=function(p,n){
dh.init(n);
};
})();
}
