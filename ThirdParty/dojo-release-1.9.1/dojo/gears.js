/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/gears",["./_base/lang","./sniff"],function(_1,_2){
var _3={};
_1.setObject("dojo.gears",_3);
_3._gearsObject=function(){
var _4;
var _5=_1.getObject("google.gears");
if(_5){
return _5;
}
if(typeof GearsFactory!="undefined"){
_4=new GearsFactory();
}else{
if(_2("ie")){
try{
_4=new ActiveXObject("Gears.Factory");
}
catch(e){
}
}else{
if(navigator.mimeTypes["application/x-googlegears"]){
_4=document.createElement("object");
_4.setAttribute("type","application/x-googlegears");
_4.setAttribute("width",0);
_4.setAttribute("height",0);
_4.style.display="none";
document.documentElement.appendChild(_4);
}
}
}
if(!_4){
return null;
}
_1.setObject("google.gears.factory",_4);
return _1.getObject("google.gears");
};
_3.available=(!!_3._gearsObject())||0;
return _3;
});
