/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.filter.strings"]){
dojo._hasResource["dojox.dtl.filter.strings"]=true;
dojo.provide("dojox.dtl.filter.strings");
dojo.require("dojox.dtl.filter.htmlstrings");
dojo.require("dojox.string.sprintf");
dojo.require("dojox.string.tokenize");
dojo.mixin(dojox.dtl.filter.strings,{_urlquote:function(_1,_2){
if(!_2){
_2="/";
}
return dojox.string.tokenize(_1,/([^\w-_.])/g,function(_3){
if(_2.indexOf(_3)==-1){
if(_3==" "){
return "+";
}else{
return "%"+_3.charCodeAt(0).toString(16).toUpperCase();
}
}
return _3;
}).join("");
},addslashes:function(_4){
return _4.replace(/\\/g,"\\\\").replace(/"/g,"\\\"").replace(/'/g,"\\'");
},capfirst:function(_5){
_5=""+_5;
return _5.charAt(0).toUpperCase()+_5.substring(1);
},center:function(_6,_7){
_7=_7||_6.length;
_6=_6+"";
var _8=_7-_6.length;
if(_8%2){
_6=_6+" ";
_8-=1;
}
for(var i=0;i<_8;i+=2){
_6=" "+_6+" ";
}
return _6;
},cut:function(_9,_a){
_a=_a+""||"";
_9=_9+"";
return _9.replace(new RegExp(_a,"g"),"");
},_fix_ampersands:/&(?!(\w+|#\d+);)/g,fix_ampersands:function(_b){
return _b.replace(dojox.dtl.filter.strings._fix_ampersands,"&amp;");
},floatformat:function(_c,_d){
_d=parseInt(_d||-1,10);
_c=parseFloat(_c);
var m=_c-_c.toFixed(0);
if(!m&&_d<0){
return _c.toFixed();
}
_c=_c.toFixed(Math.abs(_d));
return (_d<0)?parseFloat(_c)+"":_c;
},iriencode:function(_e){
return dojox.dtl.filter.strings._urlquote(_e,"/#%[]=:;$&()+,!");
},linenumbers:function(_f){
var df=dojox.dtl.filter;
var _10=_f.split("\n");
var _11=[];
var _12=(_10.length+"").length;
for(var i=0,_13;i<_10.length;i++){
_13=_10[i];
_11.push(df.strings.ljust(i+1,_12)+". "+dojox.dtl._base.escape(_13));
}
return _11.join("\n");
},ljust:function(_14,arg){
_14=_14+"";
arg=parseInt(arg,10);
while(_14.length<arg){
_14=_14+" ";
}
return _14;
},lower:function(_15){
return (_15+"").toLowerCase();
},make_list:function(_16){
var _17=[];
if(typeof _16=="number"){
_16=_16+"";
}
if(_16.charAt){
for(var i=0;i<_16.length;i++){
_17.push(_16.charAt(i));
}
return _17;
}
if(typeof _16=="object"){
for(var key in _16){
_17.push(_16[key]);
}
return _17;
}
return [];
},rjust:function(_18,arg){
_18=_18+"";
arg=parseInt(arg,10);
while(_18.length<arg){
_18=" "+_18;
}
return _18;
},slugify:function(_19){
_19=_19.replace(/[^\w\s-]/g,"").toLowerCase();
return _19.replace(/[\-\s]+/g,"-");
},_strings:{},stringformat:function(_1a,arg){
arg=""+arg;
var _1b=dojox.dtl.filter.strings._strings;
if(!_1b[arg]){
_1b[arg]=new dojox.string.sprintf.Formatter("%"+arg);
}
return _1b[arg].format(_1a);
},title:function(_1c){
var _1d,_1e="";
for(var i=0,_1f;i<_1c.length;i++){
_1f=_1c.charAt(i);
if(_1d==" "||_1d=="\n"||_1d=="\t"||!_1d){
_1e+=_1f.toUpperCase();
}else{
_1e+=_1f.toLowerCase();
}
_1d=_1f;
}
return _1e;
},_truncatewords:/[ \n\r\t]/,truncatewords:function(_20,arg){
arg=parseInt(arg,10);
if(!arg){
return _20;
}
for(var i=0,j=_20.length,_21=0,_22,_23;i<_20.length;i++){
_22=_20.charAt(i);
if(dojox.dtl.filter.strings._truncatewords.test(_23)){
if(!dojox.dtl.filter.strings._truncatewords.test(_22)){
++_21;
if(_21==arg){
return _20.substring(0,j+1);
}
}
}else{
if(!dojox.dtl.filter.strings._truncatewords.test(_22)){
j=i;
}
}
_23=_22;
}
return _20;
},_truncate_words:/(&.*?;|<.*?>|(\w[\w\-]*))/g,_truncate_tag:/<(\/)?([^ ]+?)(?: (\/)| .*?)?>/,_truncate_singlets:{br:true,col:true,link:true,base:true,img:true,param:true,area:true,hr:true,input:true},truncatewords_html:function(_24,arg){
arg=parseInt(arg,10);
if(arg<=0){
return "";
}
var _25=dojox.dtl.filter.strings;
var _26=0;
var _27=[];
var _28=dojox.string.tokenize(_24,_25._truncate_words,function(all,_29){
if(_29){
++_26;
if(_26<arg){
return _29;
}else{
if(_26==arg){
return _29+" ...";
}
}
}
var tag=all.match(_25._truncate_tag);
if(!tag||_26>=arg){
return;
}
var _2a=tag[1];
var _2b=tag[2].toLowerCase();
var _2c=tag[3];
if(_2a||_25._truncate_singlets[_2b]){
}else{
if(_2a){
var i=dojo.indexOf(_27,_2b);
if(i!=-1){
_27=_27.slice(i+1);
}
}else{
_27.unshift(_2b);
}
}
return all;
}).join("");
_28=_28.replace(/\s+$/g,"");
for(var i=0,tag;tag=_27[i];i++){
_28+="</"+tag+">";
}
return _28;
},upper:function(_2d){
return _2d.toUpperCase();
},urlencode:function(_2e){
return dojox.dtl.filter.strings._urlquote(_2e);
},_urlize:/^((?:[(>]|&lt;)*)(.*?)((?:[.,)>\n]|&gt;)*)$/,_urlize2:/^\S+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/,urlize:function(_2f){
return dojox.dtl.filter.strings.urlizetrunc(_2f);
},urlizetrunc:function(_30,arg){
arg=parseInt(arg);
return dojox.string.tokenize(_30,/(\S+)/g,function(_31){
var _32=dojox.dtl.filter.strings._urlize.exec(_31);
if(!_32){
return _31;
}
var _33=_32[1];
var _34=_32[2];
var _35=_32[3];
var _36=_34.indexOf("www.")==0;
var _37=_34.indexOf("@")!=-1;
var _38=_34.indexOf(":")!=-1;
var _39=_34.indexOf("http://")==0;
var _3a=_34.indexOf("https://")==0;
var _3b=/[a-zA-Z0-9]/.test(_34.charAt(0));
var _3c=_34.substring(_34.length-4);
var _3d=_34;
if(arg>3){
_3d=_3d.substring(0,arg-3)+"...";
}
if(_36||(!_37&&!_39&&_34.length&&_3b&&(_3c==".org"||_3c==".net"||_3c==".com"))){
return "<a href=\"http://"+_34+"\" rel=\"nofollow\">"+_3d+"</a>";
}else{
if(_39||_3a){
return "<a href=\""+_34+"\" rel=\"nofollow\">"+_3d+"</a>";
}else{
if(_37&&!_36&&!_38&&dojox.dtl.filter.strings._urlize2.test(_34)){
return "<a href=\"mailto:"+_34+"\">"+_34+"</a>";
}
}
}
return _31;
}).join("");
},wordcount:function(_3e){
_3e=dojo.trim(_3e);
if(!_3e){
return 0;
}
return _3e.split(/\s+/g).length;
},wordwrap:function(_3f,arg){
arg=parseInt(arg);
var _40=[];
var _41=_3f.split(/\s+/g);
if(_41.length){
var _42=_41.shift();
_40.push(_42);
var pos=_42.length-_42.lastIndexOf("\n")-1;
for(var i=0;i<_41.length;i++){
_42=_41[i];
if(_42.indexOf("\n")!=-1){
var _43=_42.split(/\n/g);
}else{
var _43=[_42];
}
pos+=_43[0].length+1;
if(arg&&pos>arg){
_40.push("\n");
pos=_43[_43.length-1].length;
}else{
_40.push(" ");
if(_43.length>1){
pos=_43[_43.length-1].length;
}
}
_40.push(_42);
}
}
return _40.join("");
}});
}
