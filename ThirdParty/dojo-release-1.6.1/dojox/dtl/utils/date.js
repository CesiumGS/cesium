/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.utils.date"]){
dojo._hasResource["dojox.dtl.utils.date"]=true;
dojo.provide("dojox.dtl.utils.date");
dojo.require("dojox.date.php");
dojox.dtl.utils.date.DateFormat=function(_1){
dojox.date.php.DateFormat.call(this,_1);
};
dojo.extend(dojox.dtl.utils.date.DateFormat,dojox.date.php.DateFormat.prototype,{f:function(){
return (!this.date.getMinutes())?this.g():this.g()+":"+this.i();
},N:function(){
return dojox.dtl.utils.date._months_ap[this.date.getMonth()];
},P:function(){
if(!this.date.getMinutes()&&!this.date.getHours()){
return "midnight";
}
if(!this.date.getMinutes()&&this.date.getHours()==12){
return "noon";
}
return this.f()+" "+this.a();
}});
dojo.mixin(dojox.dtl.utils.date,{format:function(_2,_3){
var df=new dojox.dtl.utils.date.DateFormat(_3);
return df.format(_2);
},timesince:function(d,_4){
if(!(d instanceof Date)){
d=new Date(d.year,d.month,d.day);
}
if(!_4){
_4=new Date();
}
var _5=Math.abs(_4.getTime()-d.getTime());
for(var i=0,_6;_6=dojox.dtl.utils.date._chunks[i];i++){
var _7=Math.floor(_5/_6[0]);
if(_7){
break;
}
}
return _7+" "+_6[1](_7);
},_chunks:[[60*60*24*365*1000,function(n){
return (n==1)?"year":"years";
}],[60*60*24*30*1000,function(n){
return (n==1)?"month":"months";
}],[60*60*24*7*1000,function(n){
return (n==1)?"week":"weeks";
}],[60*60*24*1000,function(n){
return (n==1)?"day":"days";
}],[60*60*1000,function(n){
return (n==1)?"hour":"hours";
}],[60*1000,function(n){
return (n==1)?"minute":"minutes";
}]],_months_ap:["Jan.","Feb.","March","April","May","June","July","Aug.","Sept.","Oct.","Nov.","Dec."]});
}
