/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/url",["./kernel"],function(_1){
var _2=new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),_3=new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$"),_4=function(){
var n=null,_5=arguments,_6=[_5[0]];
for(var i=1;i<_5.length;i++){
if(!_5[i]){
continue;
}
var _7=new _4(_5[i]+""),_8=new _4(_6[0]+"");
if(_7.path==""&&!_7.scheme&&!_7.authority&&!_7.query){
if(_7.fragment!=n){
_8.fragment=_7.fragment;
}
_7=_8;
}else{
if(!_7.scheme){
_7.scheme=_8.scheme;
if(!_7.authority){
_7.authority=_8.authority;
if(_7.path.charAt(0)!="/"){
var _9=_8.path.substring(0,_8.path.lastIndexOf("/")+1)+_7.path;
var _a=_9.split("/");
for(var j=0;j<_a.length;j++){
if(_a[j]=="."){
if(j==_a.length-1){
_a[j]="";
}else{
_a.splice(j,1);
j--;
}
}else{
if(j>0&&!(j==1&&_a[0]=="")&&_a[j]==".."&&_a[j-1]!=".."){
if(j==(_a.length-1)){
_a.splice(j,1);
_a[j-1]="";
}else{
_a.splice(j-1,2);
j-=2;
}
}
}
}
_7.path=_a.join("/");
}
}
}
}
_6=[];
if(_7.scheme){
_6.push(_7.scheme,":");
}
if(_7.authority){
_6.push("//",_7.authority);
}
_6.push(_7.path);
if(_7.query){
_6.push("?",_7.query);
}
if(_7.fragment){
_6.push("#",_7.fragment);
}
}
this.uri=_6.join("");
var r=this.uri.match(_2);
this.scheme=r[2]||(r[1]?"":n);
this.authority=r[4]||(r[3]?"":n);
this.path=r[5];
this.query=r[7]||(r[6]?"":n);
this.fragment=r[9]||(r[8]?"":n);
if(this.authority!=n){
r=this.authority.match(_3);
this.user=r[3]||n;
this.password=r[4]||n;
this.host=r[6]||r[7];
this.port=r[9]||n;
}
};
_4.prototype.toString=function(){
return this.uri;
};
return _1._Url=_4;
});
