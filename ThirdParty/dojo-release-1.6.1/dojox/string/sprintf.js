/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.string.sprintf"]){
dojo._hasResource["dojox.string.sprintf"]=true;
dojo.provide("dojox.string.sprintf");
dojo.require("dojox.string.tokenize");
dojox.string.sprintf=function(_1,_2){
for(var _3=[],i=1;i<arguments.length;i++){
_3.push(arguments[i]);
}
var _4=new dojox.string.sprintf.Formatter(_1);
return _4.format.apply(_4,_3);
};
dojox.string.sprintf.Formatter=function(_5){
var _6=[];
this._mapped=false;
this._format=_5;
this._tokens=dojox.string.tokenize(_5,this._re,this._parseDelim,this);
};
dojo.extend(dojox.string.sprintf.Formatter,{_re:/\%(?:\(([\w_]+)\)|([1-9]\d*)\$)?([0 +\-\#]*)(\*|\d+)?(\.)?(\*|\d+)?[hlL]?([\%scdeEfFgGiouxX])/g,_parseDelim:function(_7,_8,_9,_a,_b,_c,_d){
if(_7){
this._mapped=true;
}
return {mapping:_7,intmapping:_8,flags:_9,_minWidth:_a,period:_b,_precision:_c,specifier:_d};
},_specifiers:{b:{base:2,isInt:true},o:{base:8,isInt:true},x:{base:16,isInt:true},X:{extend:["x"],toUpper:true},d:{base:10,isInt:true},i:{extend:["d"]},u:{extend:["d"],isUnsigned:true},c:{setArg:function(_e){
if(!isNaN(_e.arg)){
var _f=parseInt(_e.arg);
if(_f<0||_f>127){
throw new Error("invalid character code passed to %c in sprintf");
}
_e.arg=isNaN(_f)?""+_f:String.fromCharCode(_f);
}
}},s:{setMaxWidth:function(_10){
_10.maxWidth=(_10.period==".")?_10.precision:-1;
}},e:{isDouble:true,doubleNotation:"e"},E:{extend:["e"],toUpper:true},f:{isDouble:true,doubleNotation:"f"},F:{extend:["f"]},g:{isDouble:true,doubleNotation:"g"},G:{extend:["g"],toUpper:true}},format:function(_11){
if(this._mapped&&typeof _11!="object"){
throw new Error("format requires a mapping");
}
var str="";
var _12=0;
for(var i=0,_13;i<this._tokens.length;i++){
_13=this._tokens[i];
if(typeof _13=="string"){
str+=_13;
}else{
if(this._mapped){
if(typeof _11[_13.mapping]=="undefined"){
throw new Error("missing key "+_13.mapping);
}
_13.arg=_11[_13.mapping];
}else{
if(_13.intmapping){
var _12=parseInt(_13.intmapping)-1;
}
if(_12>=arguments.length){
throw new Error("got "+arguments.length+" printf arguments, insufficient for '"+this._format+"'");
}
_13.arg=arguments[_12++];
}
if(!_13.compiled){
_13.compiled=true;
_13.sign="";
_13.zeroPad=false;
_13.rightJustify=false;
_13.alternative=false;
var _14={};
for(var fi=_13.flags.length;fi--;){
var _15=_13.flags.charAt(fi);
_14[_15]=true;
switch(_15){
case " ":
_13.sign=" ";
break;
case "+":
_13.sign="+";
break;
case "0":
_13.zeroPad=(_14["-"])?false:true;
break;
case "-":
_13.rightJustify=true;
_13.zeroPad=false;
break;
case "#":
_13.alternative=true;
break;
default:
throw Error("bad formatting flag '"+_13.flags.charAt(fi)+"'");
}
}
_13.minWidth=(_13._minWidth)?parseInt(_13._minWidth):0;
_13.maxWidth=-1;
_13.toUpper=false;
_13.isUnsigned=false;
_13.isInt=false;
_13.isDouble=false;
_13.precision=1;
if(_13.period=="."){
if(_13._precision){
_13.precision=parseInt(_13._precision);
}else{
_13.precision=0;
}
}
var _16=this._specifiers[_13.specifier];
if(typeof _16=="undefined"){
throw new Error("unexpected specifier '"+_13.specifier+"'");
}
if(_16.extend){
dojo.mixin(_16,this._specifiers[_16.extend]);
delete _16.extend;
}
dojo.mixin(_13,_16);
}
if(typeof _13.setArg=="function"){
_13.setArg(_13);
}
if(typeof _13.setMaxWidth=="function"){
_13.setMaxWidth(_13);
}
if(_13._minWidth=="*"){
if(this._mapped){
throw new Error("* width not supported in mapped formats");
}
_13.minWidth=parseInt(arguments[_12++]);
if(isNaN(_13.minWidth)){
throw new Error("the argument for * width at position "+_12+" is not a number in "+this._format);
}
if(_13.minWidth<0){
_13.rightJustify=true;
_13.minWidth=-_13.minWidth;
}
}
if(_13._precision=="*"&&_13.period=="."){
if(this._mapped){
throw new Error("* precision not supported in mapped formats");
}
_13.precision=parseInt(arguments[_12++]);
if(isNaN(_13.precision)){
throw Error("the argument for * precision at position "+_12+" is not a number in "+this._format);
}
if(_13.precision<0){
_13.precision=1;
_13.period="";
}
}
if(_13.isInt){
if(_13.period=="."){
_13.zeroPad=false;
}
this.formatInt(_13);
}else{
if(_13.isDouble){
if(_13.period!="."){
_13.precision=6;
}
this.formatDouble(_13);
}
}
this.fitField(_13);
str+=""+_13.arg;
}
}
return str;
},_zeros10:"0000000000",_spaces10:"          ",formatInt:function(_17){
var i=parseInt(_17.arg);
if(!isFinite(i)){
if(typeof _17.arg!="number"){
throw new Error("format argument '"+_17.arg+"' not an integer; parseInt returned "+i);
}
i=0;
}
if(i<0&&(_17.isUnsigned||_17.base!=10)){
i=4294967295+i+1;
}
if(i<0){
_17.arg=(-i).toString(_17.base);
this.zeroPad(_17);
_17.arg="-"+_17.arg;
}else{
_17.arg=i.toString(_17.base);
if(!i&&!_17.precision){
_17.arg="";
}else{
this.zeroPad(_17);
}
if(_17.sign){
_17.arg=_17.sign+_17.arg;
}
}
if(_17.base==16){
if(_17.alternative){
_17.arg="0x"+_17.arg;
}
_17.arg=_17.toUpper?_17.arg.toUpperCase():_17.arg.toLowerCase();
}
if(_17.base==8){
if(_17.alternative&&_17.arg.charAt(0)!="0"){
_17.arg="0"+_17.arg;
}
}
},formatDouble:function(_18){
var f=parseFloat(_18.arg);
if(!isFinite(f)){
if(typeof _18.arg!="number"){
throw new Error("format argument '"+_18.arg+"' not a float; parseFloat returned "+f);
}
f=0;
}
switch(_18.doubleNotation){
case "e":
_18.arg=f.toExponential(_18.precision);
break;
case "f":
_18.arg=f.toFixed(_18.precision);
break;
case "g":
if(Math.abs(f)<0.0001){
_18.arg=f.toExponential(_18.precision>0?_18.precision-1:_18.precision);
}else{
_18.arg=f.toPrecision(_18.precision);
}
if(!_18.alternative){
_18.arg=_18.arg.replace(/(\..*[^0])0*/,"$1");
_18.arg=_18.arg.replace(/\.0*e/,"e").replace(/\.0$/,"");
}
break;
default:
throw new Error("unexpected double notation '"+_18.doubleNotation+"'");
}
_18.arg=_18.arg.replace(/e\+(\d)$/,"e+0$1").replace(/e\-(\d)$/,"e-0$1");
if(dojo.isOpera){
_18.arg=_18.arg.replace(/^\./,"0.");
}
if(_18.alternative){
_18.arg=_18.arg.replace(/^(\d+)$/,"$1.");
_18.arg=_18.arg.replace(/^(\d+)e/,"$1.e");
}
if(f>=0&&_18.sign){
_18.arg=_18.sign+_18.arg;
}
_18.arg=_18.toUpper?_18.arg.toUpperCase():_18.arg.toLowerCase();
},zeroPad:function(_19,_1a){
_1a=(arguments.length==2)?_1a:_19.precision;
if(typeof _19.arg!="string"){
_19.arg=""+_19.arg;
}
var _1b=_1a-10;
while(_19.arg.length<_1b){
_19.arg=(_19.rightJustify)?_19.arg+this._zeros10:this._zeros10+_19.arg;
}
var pad=_1a-_19.arg.length;
_19.arg=(_19.rightJustify)?_19.arg+this._zeros10.substring(0,pad):this._zeros10.substring(0,pad)+_19.arg;
},fitField:function(_1c){
if(_1c.maxWidth>=0&&_1c.arg.length>_1c.maxWidth){
return _1c.arg.substring(0,_1c.maxWidth);
}
if(_1c.zeroPad){
this.zeroPad(_1c,_1c.minWidth);
return;
}
this.spacePad(_1c);
},spacePad:function(_1d,_1e){
_1e=(arguments.length==2)?_1e:_1d.minWidth;
if(typeof _1d.arg!="string"){
_1d.arg=""+_1d.arg;
}
var _1f=_1e-10;
while(_1d.arg.length<_1f){
_1d.arg=(_1d.rightJustify)?_1d.arg+this._spaces10:this._spaces10+_1d.arg;
}
var pad=_1e-_1d.arg.length;
_1d.arg=(_1d.rightJustify)?_1d.arg+this._spaces10.substring(0,pad):this._spaces10.substring(0,pad)+_1d.arg;
}});
}
