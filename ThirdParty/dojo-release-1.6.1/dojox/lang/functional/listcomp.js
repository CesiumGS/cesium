/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.functional.listcomp"]){
dojo._hasResource["dojox.lang.functional.listcomp"]=true;
dojo.provide("dojox.lang.functional.listcomp");
(function(){
var _1=/\bfor\b|\bif\b/gm;
var _2=function(s){
var _3=s.split(_1),_4=s.match(_1),_5=["var r = [];"],_6=[],i=0,l=_4.length;
while(i<l){
var a=_4[i],f=_3[++i];
if(a=="for"&&!/^\s*\(\s*(;|var)/.test(f)){
f=f.replace(/^\s*\(/,"(var ");
}
_5.push(a,f,"{");
_6.push("}");
}
return _5.join("")+"r.push("+_3[0]+");"+_6.join("")+"return r;";
};
dojo.mixin(dojox.lang.functional,{buildListcomp:function(s){
return "function(){"+_2(s)+"}";
},compileListcomp:function(s){
return new Function([],_2(s));
},listcomp:function(s){
return (new Function([],_2(s)))();
}});
})();
}
