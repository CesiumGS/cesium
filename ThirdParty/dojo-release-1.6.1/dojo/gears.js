/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.gears"]){
dojo._hasResource["dojo.gears"]=true;
dojo.provide("dojo.gears");
dojo.getObject("gears",true,dojo);
dojo.gears._gearsObject=function(){
var _1;
var _2;
var _3=dojo.getObject("google.gears");
if(_3){
return _3;
}
if(typeof GearsFactory!="undefined"){
_1=new GearsFactory();
}else{
if(dojo.isIE){
try{
_1=new ActiveXObject("Gears.Factory");
}
catch(e){
}
}else{
if(navigator.mimeTypes["application/x-googlegears"]){
_1=document.createElement("object");
_1.setAttribute("type","application/x-googlegears");
_1.setAttribute("width",0);
_1.setAttribute("height",0);
_1.style.display="none";
document.documentElement.appendChild(_1);
}
}
}
if(!_1){
return null;
}
dojo.setObject("google.gears.factory",_1);
return dojo.getObject("google.gears");
};
dojo.gears.available=(!!dojo.gears._gearsObject())||0;
}
