/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.string.BidiComplex"]){
dojo._hasResource["dojox.string.BidiComplex"]=true;
dojo.provide("dojox.string.BidiComplex");
dojo.experimental("dojox.string.BidiComplex");
(function(){
var _1=[];
dojox.string.BidiComplex.attachInput=function(_2,_3){
_2.alt=_3;
dojo.connect(_2,"onkeydown",this,"_ceKeyDown");
dojo.connect(_2,"onkeyup",this,"_ceKeyUp");
dojo.connect(_2,"oncut",this,"_ceCutText");
dojo.connect(_2,"oncopy",this,"_ceCopyText");
_2.value=dojox.string.BidiComplex.createDisplayString(_2.value,_2.alt);
};
dojox.string.BidiComplex.createDisplayString=function(_4,_5){
_4=dojox.string.BidiComplex.stripSpecialCharacters(_4);
var _6=dojox.string.BidiComplex._parse(_4,_5);
var _7="‪"+_4;
var _8=1;
dojo.forEach(_6,function(n){
if(n!=null){
var _9=_7.substring(0,n+_8);
var _a=_7.substring(n+_8,_7.length);
_7=_9+"‎"+_a;
_8++;
}
});
return _7;
};
dojox.string.BidiComplex.stripSpecialCharacters=function(_b){
return _b.replace(/[\u200E\u200F\u202A-\u202E]/g,"");
};
dojox.string.BidiComplex._ceKeyDown=function(_c){
var _d=dojo.isIE?_c.srcElement:_c.target;
_1=_d.value;
};
dojox.string.BidiComplex._ceKeyUp=function(_e){
var _f="‎";
var _10=dojo.isIE?_e.srcElement:_e.target;
var _11=_10.value;
var _12=_e.keyCode;
if((_12==dojo.keys.HOME)||(_12==dojo.keys.END)||(_12==dojo.keys.SHIFT)){
return;
}
var _13,_14;
var _15=dojox.string.BidiComplex._getCaretPos(_e,_10);
if(_15){
_13=_15[0];
_14=_15[1];
}
if(dojo.isIE){
var _16=_13,_17=_14;
if(_12==dojo.keys.LEFT_ARROW){
if((_11.charAt(_14-1)==_f)&&(_13==_14)){
dojox.string.BidiComplex._setSelectedRange(_10,_13-1,_14-1);
}
return;
}
if(_12==dojo.keys.RIGHT_ARROW){
if(_11.charAt(_14-1)==_f){
_17=_14+1;
if(_13==_14){
_16=_13+1;
}
}
dojox.string.BidiComplex._setSelectedRange(_10,_16,_17);
return;
}
}else{
if(_12==dojo.keys.LEFT_ARROW){
if(_11.charAt(_14-1)==_f){
dojox.string.BidiComplex._setSelectedRange(_10,_13-1,_14-1);
}
return;
}
if(_12==dojo.keys.RIGHT_ARROW){
if(_11.charAt(_14-1)==_f){
dojox.string.BidiComplex._setSelectedRange(_10,_13+1,_14+1);
}
return;
}
}
var _18=dojox.string.BidiComplex.createDisplayString(_11,_10.alt);
if(_11!=_18){
window.status=_11+" c="+_14;
_10.value=_18;
if((_12==dojo.keys.DELETE)&&(_18.charAt(_14)==_f)){
_10.value=_18.substring(0,_14)+_18.substring(_14+2,_18.length);
}
if(_12==dojo.keys.DELETE){
dojox.string.BidiComplex._setSelectedRange(_10,_13,_14);
}else{
if(_12==dojo.keys.BACKSPACE){
if((_1.length>=_14)&&(_1.charAt(_14-1)==_f)){
dojox.string.BidiComplex._setSelectedRange(_10,_13-1,_14-1);
}else{
dojox.string.BidiComplex._setSelectedRange(_10,_13,_14);
}
}else{
if(_10.value.charAt(_14)!=_f){
dojox.string.BidiComplex._setSelectedRange(_10,_13+1,_14+1);
}
}
}
}
};
dojox.string.BidiComplex._processCopy=function(_19,_1a,_1b){
if(_1a==null){
if(dojo.isIE){
var _1c=document.selection.createRange();
_1a=_1c.text;
}else{
_1a=_19.value.substring(_19.selectionStart,_19.selectionEnd);
}
}
var _1d=dojox.string.BidiComplex.stripSpecialCharacters(_1a);
if(dojo.isIE){
window.clipboardData.setData("Text",_1d);
}
return true;
};
dojox.string.BidiComplex._ceCopyText=function(_1e){
if(dojo.isIE){
_1e.returnValue=false;
}
return dojox.string.BidiComplex._processCopy(_1e,null,false);
};
dojox.string.BidiComplex._ceCutText=function(_1f){
var ret=dojox.string.BidiComplex._processCopy(_1f,null,false);
if(!ret){
return false;
}
if(dojo.isIE){
document.selection.clear();
}else{
var _20=_1f.selectionStart;
_1f.value=_1f.value.substring(0,_20)+_1f.value.substring(_1f.selectionEnd);
_1f.setSelectionRange(_20,_20);
}
return true;
};
dojox.string.BidiComplex._getCaretPos=function(_21,_22){
if(dojo.isIE){
var _23=0,_24=document.selection.createRange().duplicate(),_25=_24.duplicate(),_26=_24.text.length;
if(_22.type=="textarea"){
_25.moveToElementText(_22);
}else{
_25.expand("textedit");
}
while(_24.compareEndPoints("StartToStart",_25)>0){
_24.moveStart("character",-1);
++_23;
}
return [_23,_23+_26];
}
return [_21.target.selectionStart,_21.target.selectionEnd];
};
dojox.string.BidiComplex._setSelectedRange=function(_27,_28,_29){
if(dojo.isIE){
var _2a=_27.createTextRange();
if(_2a){
if(_27.type=="textarea"){
_2a.moveToElementText(_27);
}else{
_2a.expand("textedit");
}
_2a.collapse();
_2a.moveEnd("character",_29);
_2a.moveStart("character",_28);
_2a.select();
}
}else{
_27.selectionStart=_28;
_27.selectionEnd=_29;
}
};
var _2b=function(c){
return (c>="0"&&c<="9")||(c>"ÿ");
};
var _2c=function(c){
return (c>="A"&&c<="Z")||(c>="a"&&c<="z");
};
var _2d=function(_2e,i,_2f){
while(i>0){
if(i==_2f){
return false;
}
i--;
if(_2b(_2e.charAt(i))){
return true;
}
if(_2c(_2e.charAt(i))){
return false;
}
}
return false;
};
dojox.string.BidiComplex._parse=function(str,_30){
var _31=-1,_32=[];
var _33={FILE_PATH:"/\\:.",URL:"/:.?=&#",XPATH:"/\\:.<>=[]",EMAIL:"<>@.,;"}[_30];
switch(_30){
case "FILE_PATH":
case "URL":
case "XPATH":
dojo.forEach(str,function(ch,i){
if(_33.indexOf(ch)>=0&&_2d(str,i,_31)){
_31=i;
_32.push(i);
}
});
break;
case "EMAIL":
var _34=false;
dojo.forEach(str,function(ch,i){
if(ch=="\""){
if(_2d(str,i,_31)){
_31=i;
_32.push(i);
}
i++;
var i1=str.indexOf("\"",i);
if(i1>=i){
i=i1;
}
if(_2d(str,i,_31)){
_31=i;
_32.push(i);
}
}
if(_33.indexOf(ch)>=0&&_2d(str,i,_31)){
_31=i;
_32.push(i);
}
});
}
return _32;
};
})();
}
