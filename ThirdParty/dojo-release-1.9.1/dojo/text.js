/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/text",["./_base/kernel","require","./has","./request"],function(_1,_2,_3,_4){
var _5;
if(1){
_5=function(_6,_7,_8){
_4(_6,{sync:!!_7}).then(_8);
};
}else{
if(_2.getText){
_5=_2.getText;
}else{
console.error("dojo/text plugin failed to load because loader does not support getText");
}
}
var _9={},_a=function(_b){
if(_b){
_b=_b.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,"");
var _c=_b.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
if(_c){
_b=_c[1];
}
}else{
_b="";
}
return _b;
},_d={},_e={};
_1.cache=function(_f,url,_10){
var key;
if(typeof _f=="string"){
if(/\//.test(_f)){
key=_f;
_10=url;
}else{
key=_2.toUrl(_f.replace(/\./g,"/")+(url?("/"+url):""));
}
}else{
key=_f+"";
_10=url;
}
var val=(_10!=undefined&&typeof _10!="string")?_10.value:_10,_11=_10&&_10.sanitize;
if(typeof val=="string"){
_9[key]=val;
return _11?_a(val):val;
}else{
if(val===null){
delete _9[key];
return null;
}else{
if(!(key in _9)){
_5(key,true,function(_12){
_9[key]=_12;
});
}
return _11?_a(_9[key]):_9[key];
}
}
};
return {dynamic:true,normalize:function(id,_13){
var _14=id.split("!"),url=_14[0];
return (/^\./.test(url)?_13(url):url)+(_14[1]?"!"+_14[1]:"");
},load:function(id,_15,_16){
var _17=id.split("!"),_18=_17.length>1,_19=_17[0],url=_15.toUrl(_17[0]),_1a="url:"+url,_1b=_d,_1c=function(_1d){
_16(_18?_a(_1d):_1d);
};
if(_19 in _9){
_1b=_9[_19];
}else{
if(_15.cache&&_1a in _15.cache){
_1b=_15.cache[_1a];
}else{
if(url in _9){
_1b=_9[url];
}
}
}
if(_1b===_d){
if(_e[url]){
_e[url].push(_1c);
}else{
var _1e=_e[url]=[_1c];
_5(url,!_15.async,function(_1f){
_9[_19]=_9[url]=_1f;
for(var i=0;i<_1e.length;){
_1e[i++](_1f);
}
delete _e[url];
});
}
}else{
_1c(_1b);
}
}};
});
