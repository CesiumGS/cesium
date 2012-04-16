/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.json.query"]){
dojo._hasResource["dojox.json.query"]=true;
dojo.provide("dojox.json.query");
(function(){
dojox.json._slice=function(_1,_2,_3,_4){
var _5=_1.length,_6=[];
_3=_3||_5;
_2=(_2<0)?Math.max(0,_2+_5):Math.min(_5,_2);
_3=(_3<0)?Math.max(0,_3+_5):Math.min(_5,_3);
for(var i=_2;i<_3;i+=_4){
_6.push(_1[i]);
}
return _6;
};
dojox.json._find=function e(_7,_8){
var _9=[];
function _a(_b){
if(_8){
if(_8===true&&!(_b instanceof Array)){
_9.push(_b);
}else{
if(_b[_8]){
_9.push(_b[_8]);
}
}
}
for(var i in _b){
var _c=_b[i];
if(!_8){
_9.push(_c);
}else{
if(_c&&typeof _c=="object"){
_a(_c);
}
}
}
};
if(_8 instanceof Array){
if(_8.length==1){
return _7[_8[0]];
}
for(var i=0;i<_8.length;i++){
_9.push(_7[_8[i]]);
}
}else{
_a(_7);
}
return _9;
};
dojox.json._distinctFilter=function(_d,_e){
var _f=[];
var _10={};
for(var i=0,l=_d.length;i<l;++i){
var _11=_d[i];
if(_e(_11,i,_d)){
if((typeof _11=="object")&&_11){
if(!_11.__included){
_11.__included=true;
_f.push(_11);
}
}else{
if(!_10[_11+typeof _11]){
_10[_11+typeof _11]=true;
_f.push(_11);
}
}
}
}
for(i=0,l=_f.length;i<l;++i){
if(_f[i]){
delete _f[i].__included;
}
}
return _f;
};
dojox.json.query=function(_12,obj){
var _13=0;
var str=[];
_12=_12.replace(/"(\\.|[^"\\])*"|'(\\.|[^'\\])*'|[\[\]]/g,function(t){
_13+=t=="["?1:t=="]"?-1:0;
return (t=="]"&&_13>0)?"`]":(t.charAt(0)=="\""||t.charAt(0)=="'")?"`"+(str.push(t)-1):t;
});
var _14="";
function _15(_16){
_14=_16+"("+_14;
};
function _17(t,a,b,c,d,e,f,g){
return str[g].match(/[\*\?]/)||f=="~"?"/^"+str[g].substring(1,str[g].length-1).replace(/\\([btnfr\\"'])|([^\w\*\?])/g,"\\$1$2").replace(/([\*\?])/g,"[\\w\\W]$1")+(f=="~"?"$/i":"$/")+".test("+a+")":t;
};
_12.replace(/(\]|\)|push|pop|shift|splice|sort|reverse)\s*\(/,function(){
throw new Error("Unsafe function call");
});
_12=_12.replace(/([^=]=)([^=])/g,"$1=$2").replace(/@|(\.\s*)?[a-zA-Z\$_]+(\s*:)?/g,function(t){
return t.charAt(0)=="."?t:t=="@"?"$obj":(t.match(/:|^(\$|Math|true|false|null)$/)?"":"$obj.")+t;
}).replace(/\.?\.?\[(`\]|[^\]])*\]|\?.*|\.\.([\w\$_]+)|\.\*/g,function(t,a,b){
var _18=t.match(/^\.?\.?(\[\s*\^?\?|\^?\?|\[\s*==)(.*?)\]?$/);
if(_18){
var _19="";
if(t.match(/^\./)){
_15("dojox.json._find");
_19=",true)";
}
_15(_18[1].match(/\=/)?"dojo.map":_18[1].match(/\^/)?"dojox.json._distinctFilter":"dojo.filter");
return _19+",function($obj){return "+_18[2]+"})";
}
_18=t.match(/^\[\s*([\/\\].*)\]/);
if(_18){
return ".concat().sort(function(a,b){"+_18[1].replace(/\s*,?\s*([\/\\])\s*([^,\\\/]+)/g,function(t,a,b){
return "var av= "+b.replace(/\$obj/,"a")+",bv= "+b.replace(/\$obj/,"b")+";if(av>bv||bv==null){return "+(a=="/"?1:-1)+";}\n"+"if(bv>av||av==null){return "+(a=="/"?-1:1)+";}\n";
})+"return 0;})";
}
_18=t.match(/^\[(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)\]/);
if(_18){
_15("dojox.json._slice");
return ","+(_18[1]||0)+","+(_18[2]||0)+","+(_18[3]||1)+")";
}
if(t.match(/^\.\.|\.\*|\[\s*\*\s*\]|,/)){
_15("dojox.json._find");
return (t.charAt(1)=="."?",'"+b+"'":t.match(/,/)?","+t:"")+")";
}
return t;
}).replace(/(\$obj\s*((\.\s*[\w_$]+\s*)|(\[\s*`([0-9]+)\s*`\]))*)(==|~)\s*`([0-9]+)/g,_17).replace(/`([0-9]+)\s*(==|~)\s*(\$obj\s*((\.\s*[\w_$]+)|(\[\s*`([0-9]+)\s*`\]))*)/g,function(t,a,b,c,d,e,f,g){
return _17(t,c,d,e,f,g,b,a);
});
_12=_14+(_12.charAt(0)=="$"?"":"$")+_12.replace(/`([0-9]+|\])/g,function(t,a){
return a=="]"?"]":str[a];
});
var _1a=eval("1&&function($,$1,$2,$3,$4,$5,$6,$7,$8,$9){var $obj=$;return "+_12+"}");
for(var i=0;i<arguments.length-1;i++){
arguments[i]=arguments[i+1];
}
return obj?_1a.apply(this,arguments):_1a;
};
})();
}
