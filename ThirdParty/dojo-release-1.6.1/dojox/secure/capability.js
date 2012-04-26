/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.secure.capability"]){
dojo._hasResource["dojox.secure.capability"]=true;
dojo.provide("dojox.secure.capability");
dojox.secure.badProps=/^__|^(apply|call|callee|caller|constructor|eval|prototype|this|unwatch|valueOf|watch)$|__$/;
dojox.secure.capability={keywords:["break","case","catch","const","continue","debugger","default","delete","do","else","enum","false","finally","for","function","if","in","instanceof","new","null","yield","return","switch","throw","true","try","typeof","var","void","while"],validate:function(_1,_2,_3){
var _4=this.keywords;
for(var i=0;i<_4.length;i++){
_3[_4[i]]=true;
}
var _5="|this| keyword in object literal without a Class call";
var _6=[];
if(_1.match(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\uff00-\uffff]/)){
throw new Error("Illegal unicode characters detected");
}
if(_1.match(/\/\*@cc_on/)){
throw new Error("Conditional compilation token is not allowed");
}
_1=_1.replace(/\\["'\\\/bfnrtu]/g,"@").replace(/\/\/.*|\/\*[\w\W]*?\*\/|\/(\\[\/\\]|[^*\/])(\\.|[^\/\n\\])*\/[gim]*|("[^"]*")|('[^']*')/g,function(t){
return t.match(/^\/\/|^\/\*/)?" ":"0";
}).replace(/\.\s*([a-z\$_A-Z][\w\$_]*)|([;,{])\s*([a-z\$_A-Z][\w\$_]*\s*):/g,function(t,_7,_8,_9){
_7=_7||_9;
if(/^__|^(apply|call|callee|caller|constructor|eval|prototype|this|unwatch|valueOf|watch)$|__$/.test(_7)){
throw new Error("Illegal property name "+_7);
}
return (_8&&(_8+"0:"))||"~";
});
_1.replace(/([^\[][\]\}]\s*=)|((\Wreturn|\S)\s*\[\s*\+?)|([^=!][=!]=[^=])/g,function(_a){
if(!_a.match(/((\Wreturn|[=\&\|\:\?\,])\s*\[)|\[\s*\+$/)){
throw new Error("Illegal operator "+_a.substring(1));
}
});
_1=_1.replace(new RegExp("("+_2.join("|")+")[\\s~]*\\(","g"),function(_b){
return "new(";
});
function _c(_d,_e){
var _f={};
_d.replace(/#\d+/g,function(b){
var _10=_6[b.substring(1)];
for(var i in _10){
if(i==_5){
throw i;
}
if(i=="this"&&_10[":method"]&&_10["this"]==1){
i=_5;
}
if(i!=":method"){
_f[i]=2;
}
}
});
_d.replace(/(\W|^)([a-z_\$A-Z][\w_\$]*)/g,function(t,a,_11){
if(_11.charAt(0)=="_"){
throw new Error("Names may not start with _");
}
_f[_11]=1;
});
return _f;
};
var _12,_13;
function _14(t,_15,a,b,_16,_17){
_17.replace(/(^|,)0:\s*function#(\d+)/g,function(t,a,b){
var _18=_6[b];
_18[":method"]=1;
});
_17=_17.replace(/(^|[^_\w\$])Class\s*\(\s*([_\w\$]+\s*,\s*)*#(\d+)/g,function(t,p,a,b){
var _19=_6[b];
delete _19[_5];
return (p||"")+(a||"")+"#"+b;
});
_13=_c(_17,_15);
function _1a(t,a,b,_1b){
_1b.replace(/,?([a-z\$A-Z][_\w\$]*)/g,function(t,_1c){
if(_1c=="Class"){
throw new Error("Class is reserved");
}
delete _13[_1c];
});
};
if(_15){
_1a(t,a,a,_16);
}
_17.replace(/(\W|^)(var) ([ \t,_\w\$]+)/g,_1a);
return (a||"")+(b||"")+"#"+(_6.push(_13)-1);
};
do{
_12=_1.replace(/((function|catch)(\s+[_\w\$]+)?\s*\(([^\)]*)\)\s*)?{([^{}]*)}/g,_14);
}while(_12!=_1&&(_1=_12));
_14(0,0,0,0,0,_1);
for(i in _13){
if(!(i in _3)){
throw new Error("Illegal reference to "+i);
}
}
}};
}
