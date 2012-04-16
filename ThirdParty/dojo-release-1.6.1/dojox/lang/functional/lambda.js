/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.functional.lambda"]){
dojo._hasResource["dojox.lang.functional.lambda"]=true;
dojo.provide("dojox.lang.functional.lambda");
(function(){
var df=dojox.lang.functional,_1={};
var _2="ab".split(/a*/).length>1?String.prototype.split:function(_3){
var r=this.split.call(this,_3),m=_3.exec(this);
if(m&&m.index==0){
r.unshift("");
}
return r;
};
var _4=function(s){
var _5=[],_6=_2.call(s,/\s*->\s*/m);
if(_6.length>1){
while(_6.length){
s=_6.pop();
_5=_6.pop().split(/\s*,\s*|\s+/m);
if(_6.length){
_6.push("(function("+_5+"){return ("+s+")})");
}
}
}else{
if(s.match(/\b_\b/)){
_5=["_"];
}else{
var l=s.match(/^\s*(?:[+*\/%&|\^\.=<>]|!=)/m),r=s.match(/[+\-*\/%&|\^\.=<>!]\s*$/m);
if(l||r){
if(l){
_5.push("$1");
s="$1"+s;
}
if(r){
_5.push("$2");
s=s+"$2";
}
}else{
var _7=s.replace(/(?:\b[A-Z]|\.[a-zA-Z_$])[a-zA-Z_$\d]*|[a-zA-Z_$][a-zA-Z_$\d]*:|this|true|false|null|undefined|typeof|instanceof|in|delete|new|void|arguments|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|escape|eval|isFinite|isNaN|parseFloat|parseInt|unescape|dojo|dijit|dojox|window|document|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g,"").match(/([a-z_$][a-z_$\d]*)/gi)||[],t={};
dojo.forEach(_7,function(v){
if(!(v in t)){
_5.push(v);
t[v]=1;
}
});
}
}
}
return {args:_5,body:s};
};
var _8=function(a){
return a.length?function(){
var i=a.length-1,x=df.lambda(a[i]).apply(this,arguments);
for(--i;i>=0;--i){
x=df.lambda(a[i]).call(this,x);
}
return x;
}:function(x){
return x;
};
};
dojo.mixin(df,{rawLambda:function(s){
return _4(s);
},buildLambda:function(s){
s=_4(s);
return "function("+s.args.join(",")+"){return ("+s.body+");}";
},lambda:function(s){
if(typeof s=="function"){
return s;
}
if(s instanceof Array){
return _8(s);
}
if(s in _1){
return _1[s];
}
s=_4(s);
return _1[s]=new Function(s.args,"return ("+s.body+");");
},clearLambdaCache:function(){
_1={};
}});
})();
}
