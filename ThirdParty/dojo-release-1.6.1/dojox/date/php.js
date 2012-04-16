/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.php"]){
dojo._hasResource["dojox.date.php"]=true;
dojo.provide("dojox.date.php");
dojo.require("dojo.date");
dojo.require("dojox.string.tokenize");
dojox.date.php.format=function(_1,_2){
var df=new dojox.date.php.DateFormat(_2);
return df.format(_1);
};
dojox.date.php.DateFormat=function(_3){
if(!this.regex){
var _4=[];
for(var _5 in this.constructor.prototype){
if(dojo.isString(_5)&&_5.length==1&&dojo.isFunction(this[_5])){
_4.push(_5);
}
}
this.constructor.prototype.regex=new RegExp("(?:(\\\\.)|(["+_4.join("")+"]))","g");
}
var _6=[];
this.tokens=dojox.string.tokenize(_3,this.regex,function(_7,_8,i){
if(_8){
_6.push([i,_8]);
return _8;
}
if(_7){
return _7.charAt(1);
}
});
this.replacements=_6;
};
dojo.extend(dojox.date.php.DateFormat,{weekdays:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],weekdays_3:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],months:["January","February","March","April","May","June","July","August","September","October","November","December"],months_3:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],monthdays:[31,28,31,30,31,30,31,31,30,31,30,31],format:function(_9){
this.date=_9;
for(var i=0,_a;_a=this.replacements[i];i++){
this.tokens[_a[0]]=this[_a[1]]();
}
return this.tokens.join("");
},d:function(){
var j=this.j();
return (j.length==1)?"0"+j:j;
},D:function(){
return this.weekdays_3[this.date.getDay()];
},j:function(){
return this.date.getDate()+"";
},l:function(){
return this.weekdays[this.date.getDay()];
},N:function(){
var w=this.w();
return (!w)?7:w;
},S:function(){
switch(this.date.getDate()){
case 11:
case 12:
case 13:
return "th";
case 1:
case 21:
case 31:
return "st";
case 2:
case 22:
return "nd";
case 3:
case 23:
return "rd";
default:
return "th";
}
},w:function(){
return this.date.getDay()+"";
},z:function(){
var _b=this.date.getTime()-new Date(this.date.getFullYear(),0,1).getTime();
return Math.floor(_b/86400000)+"";
},W:function(){
var _c;
var _d=new Date(this.date.getFullYear(),0,1).getDay()+1;
var w=this.date.getDay()+1;
var z=parseInt(this.z());
if(z<=(8-_d)&&_d>4){
var _e=new Date(this.date.getFullYear()-1,this.date.getMonth(),this.date.getDate());
if(_d==5||(_d==6&&dojo.date.isLeapYear(_e))){
_c=53;
}else{
_c=52;
}
}else{
var i;
if(Boolean(this.L())){
i=366;
}else{
i=365;
}
if((i-z)<(4-w)){
_c=1;
}else{
var j=z+(7-w)+(_d-1);
_c=Math.ceil(j/7);
if(_d>4){
--_c;
}
}
}
return _c;
},F:function(){
return this.months[this.date.getMonth()];
},m:function(){
var n=this.n();
return (n.length==1)?"0"+n:n;
},M:function(){
return this.months_3[this.date.getMonth()];
},n:function(){
return this.date.getMonth()+1+"";
},t:function(){
return (Boolean(this.L())&&this.date.getMonth()==1)?29:this.monthdays[this.getMonth()];
},L:function(){
return (dojo.date.isLeapYear(this.date))?"1":"0";
},o:function(){
},Y:function(){
return this.date.getFullYear()+"";
},y:function(){
return this.Y().slice(-2);
},a:function(){
return this.date.getHours()>=12?"pm":"am";
},b:function(){
return this.a().toUpperCase();
},B:function(){
var _f=this.date.getTimezoneOffset()+60;
var _10=(this.date.getHours()*3600)+(this.date.getMinutes()*60)+this.getSeconds()+(_f*60);
var _11=Math.abs(Math.floor(_10/86.4)%1000)+"";
while(_11.length<2){
_11="0"+_11;
}
return _11;
},g:function(){
return (this.date.getHours()>12)?this.date.getHours()-12+"":this.date.getHours()+"";
},G:function(){
return this.date.getHours()+"";
},h:function(){
var g=this.g();
return (g.length==1)?"0"+g:g;
},H:function(){
var G=this.G();
return (G.length==1)?"0"+G:G;
},i:function(){
var _12=this.date.getMinutes()+"";
return (_12.length==1)?"0"+_12:_12;
},s:function(){
var _13=this.date.getSeconds()+"";
return (_13.length==1)?"0"+_13:_13;
},e:function(){
return dojo.date.getTimezoneName(this.date);
},I:function(){
},O:function(){
var off=Math.abs(this.date.getTimezoneOffset());
var _14=Math.floor(off/60)+"";
var _15=(off%60)+"";
if(_14.length==1){
_14="0"+_14;
}
if(_15.length==1){
_14="0"+_15;
}
return ((this.date.getTimezoneOffset()<0)?"+":"-")+_14+_15;
},P:function(){
var O=this.O();
return O.substring(0,2)+":"+O.substring(2,4);
},T:function(){
return this.e().substring(0,3);
},Z:function(){
return this.date.getTimezoneOffset()*-60;
},c:function(){
return this.Y()+"-"+this.m()+"-"+this.d()+"T"+this.h()+":"+this.i()+":"+this.s()+this.P();
},r:function(){
return this.D()+", "+this.d()+" "+this.M()+" "+this.Y()+" "+this.H()+":"+this.i()+":"+this.s()+" "+this.O();
},U:function(){
return Math.floor(this.date.getTime()/1000);
}});
}
