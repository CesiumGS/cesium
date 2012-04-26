/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.filter.htmlstrings"]){
dojo._hasResource["dojox.dtl.filter.htmlstrings"]=true;
dojo.provide("dojox.dtl.filter.htmlstrings");
dojo.require("dojox.dtl._base");
dojo.mixin(dojox.dtl.filter.htmlstrings,{_linebreaksrn:/(\r\n|\n\r)/g,_linebreaksn:/\n{2,}/g,_linebreakss:/(^\s+|\s+$)/g,_linebreaksbr:/\n/g,_removetagsfind:/[a-z0-9]+/g,_striptags:/<[^>]*?>/g,linebreaks:function(_1){
var _2=[];
var dh=dojox.dtl.filter.htmlstrings;
_1=_1.replace(dh._linebreaksrn,"\n");
var _3=_1.split(dh._linebreaksn);
for(var i=0;i<_3.length;i++){
var _4=_3[i].replace(dh._linebreakss,"").replace(dh._linebreaksbr,"<br />");
_2.push("<p>"+_4+"</p>");
}
return _2.join("\n\n");
},linebreaksbr:function(_5){
var dh=dojox.dtl.filter.htmlstrings;
return _5.replace(dh._linebreaksrn,"\n").replace(dh._linebreaksbr,"<br />");
},removetags:function(_6,_7){
var dh=dojox.dtl.filter.htmlstrings;
var _8=[];
var _9;
while(_9=dh._removetagsfind.exec(_7)){
_8.push(_9[0]);
}
_8="("+_8.join("|")+")";
return _6.replace(new RegExp("</?s*"+_8+"s*[^>]*>","gi"),"");
},striptags:function(_a){
return _a.replace(dojox.dtl.filter.htmlstrings._striptags,"");
}});
}
