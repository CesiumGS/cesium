/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.jsonPath.query"]){
dojo._hasResource["dojox.jsonPath.query"]=true;
dojo.provide("dojox.jsonPath.query");
dojox.jsonPath.query=function(_1,_2,_3){
var re=dojox.jsonPath._regularExpressions;
if(!_3){
_3={};
}
var _4=[];
function _5(i){
return _4[i];
};
var _6;
if(_3.resultType=="PATH"&&_3.evalType=="RESULT"){
throw Error("RESULT based evaluation not supported with PATH based results");
}
var P={resultType:_3.resultType||"VALUE",normalize:function(_7){
var _8=[];
_7=_7.replace(/'([^']|'')*'/g,function(t){
return "_str("+(_4.push(eval(t))-1)+")";
});
var ll=-1;
while(ll!=_8.length){
ll=_8.length;
_7=_7.replace(/(\??\([^\(\)]*\))/g,function($0){
return "#"+(_8.push($0)-1);
});
}
_7=_7.replace(/[\['](#[0-9]+)[\]']/g,"[$1]").replace(/'?\.'?|\['?/g,";").replace(/;;;|;;/g,";..;").replace(/;$|'?\]|'$/g,"");
ll=-1;
while(ll!=_7){
ll=_7;
_7=_7.replace(/#([0-9]+)/g,function($0,$1){
return _8[$1];
});
}
return _7.split(";");
},asPaths:function(_9){
for(var j=0;j<_9.length;j++){
var p="$";
var x=_9[j];
for(var i=1,n=x.length;i<n;i++){
p+=/^[0-9*]+$/.test(x[i])?("["+x[i]+"]"):("['"+x[i]+"']");
}
_9[j]=p;
}
return _9;
},exec:function(_a,_b,rb){
var _c=["$"];
var _d=rb?_b:[_b];
var _e=[_c];
function _f(v,p,def){
if(v&&v.hasOwnProperty(p)&&P.resultType!="VALUE"){
_e.push(_c.concat([p]));
}
if(def){
_d=v[p];
}else{
if(v&&v.hasOwnProperty(p)){
_d.push(v[p]);
}
}
};
function _10(v){
_d.push(v);
_e.push(_c);
P.walk(v,function(i){
if(typeof v[i]==="object"){
var _11=_c;
_c=_c.concat(i);
_10(v[i]);
_c=_11;
}
});
};
function _12(loc,val){
if(val instanceof Array){
var len=val.length,_13=0,end=len,_14=1;
loc.replace(/^(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)$/g,function($0,$1,$2,$3){
_13=parseInt($1||_13);
end=parseInt($2||end);
_14=parseInt($3||_14);
});
_13=(_13<0)?Math.max(0,_13+len):Math.min(len,_13);
end=(end<0)?Math.max(0,end+len):Math.min(len,end);
for(var i=_13;i<end;i+=_14){
_f(val,i);
}
}
};
function _15(str){
var i=loc.match(/^_str\(([0-9]+)\)$/);
return i?_4[i[1]]:str;
};
function _16(val){
if(/^\(.*?\)$/.test(loc)){
_f(val,P.eval(loc,val),rb);
}else{
if(loc==="*"){
P.walk(val,rb&&val instanceof Array?function(i){
P.walk(val[i],function(j){
_f(val[i],j);
});
}:function(i){
_f(val,i);
});
}else{
if(loc===".."){
_10(val);
}else{
if(/,/.test(loc)){
for(var s=loc.split(/'?,'?/),i=0,n=s.length;i<n;i++){
_f(val,_15(s[i]));
}
}else{
if(/^\?\(.*?\)$/.test(loc)){
P.walk(val,function(i){
if(P.eval(loc.replace(/^\?\((.*?)\)$/,"$1"),val[i])){
_f(val,i);
}
});
}else{
if(/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)){
_12(loc,val);
}else{
loc=_15(loc);
if(rb&&val instanceof Array&&!/^[0-9*]+$/.test(loc)){
P.walk(val,function(i){
_f(val[i],loc);
});
}else{
_f(val,loc,rb);
}
}
}
}
}
}
}
};
while(_a.length){
var loc=_a.shift();
if((_b=_d)===null||_b===undefined){
return _b;
}
_d=[];
var _17=_e;
_e=[];
if(rb){
_16(_b);
}else{
P.walk(_b,function(i){
_c=_17[i]||_c;
_16(_b[i]);
});
}
}
if(P.resultType=="BOTH"){
_e=P.asPaths(_e);
var _18=[];
for(var i=0;i<_e.length;i++){
_18.push({path:_e[i],value:_d[i]});
}
return _18;
}
return P.resultType=="PATH"?P.asPaths(_e):_d;
},walk:function(val,f){
if(val instanceof Array){
for(var i=0,n=val.length;i<n;i++){
if(i in val){
f(i);
}
}
}else{
if(typeof val==="object"){
for(var m in val){
if(val.hasOwnProperty(m)){
f(m);
}
}
}
}
},eval:function(x,_19){
try{
return $&&_19&&eval(x.replace(/@/g,"_v"));
}
catch(e){
throw new SyntaxError("jsonPath: "+e.message+": "+x.replace(/@/g,"_v").replace(/\^/g,"_a"));
}
}};
var $=_1;
if(_2&&_1){
return P.exec(P.normalize(_2).slice(1),_1,_3.evalType=="RESULT");
}
return false;
};
}
