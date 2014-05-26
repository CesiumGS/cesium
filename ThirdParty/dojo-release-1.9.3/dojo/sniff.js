/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/sniff",["./has"],function(_1){
if(1){
var n=navigator,_2=n.userAgent,_3=n.appVersion,tv=parseFloat(_3);
_1.add("air",_2.indexOf("AdobeAIR")>=0);
_1.add("msapp",parseFloat(_2.split("MSAppHost/")[1])||undefined);
_1.add("khtml",_3.indexOf("Konqueror")>=0?tv:undefined);
_1.add("webkit",parseFloat(_2.split("WebKit/")[1])||undefined);
_1.add("chrome",parseFloat(_2.split("Chrome/")[1])||undefined);
_1.add("safari",_3.indexOf("Safari")>=0&&!_1("chrome")?parseFloat(_3.split("Version/")[1]):undefined);
_1.add("mac",_3.indexOf("Macintosh")>=0);
_1.add("quirks",document.compatMode=="BackCompat");
if(_2.match(/(iPhone|iPod|iPad)/)){
var p=RegExp.$1.replace(/P/,"p");
var v=_2.match(/OS ([\d_]+)/)?RegExp.$1:"1";
var os=parseFloat(v.replace(/_/,".").replace(/_/g,""));
_1.add(p,os);
_1.add("ios",os);
}
_1.add("android",parseFloat(_2.split("Android ")[1])||undefined);
_1.add("bb",(_2.indexOf("BlackBerry")>=0||_2.indexOf("BB10")>=0)&&parseFloat(_2.split("Version/")[1])||undefined);
_1.add("trident",parseFloat(_3.split("Trident/")[1])||undefined);
_1.add("svg",typeof SVGAngle!=="undefined");
if(!_1("webkit")){
if(_2.indexOf("Opera")>=0){
_1.add("opera",tv>=9.8?parseFloat(_2.split("Version/")[1])||tv:tv);
}
if(_2.indexOf("Gecko")>=0&&!_1("khtml")&&!_1("webkit")&&!_1("trident")){
_1.add("mozilla",tv);
}
if(_1("mozilla")){
_1.add("ff",parseFloat(_2.split("Firefox/")[1]||_2.split("Minefield/")[1])||undefined);
}
if(document.all&&!_1("opera")){
var _4=parseFloat(_3.split("MSIE ")[1])||undefined;
var _5=document.documentMode;
if(_5&&_5!=5&&Math.floor(_4)!=_5){
_4=_5;
}
_1.add("ie",_4);
}
_1.add("wii",typeof opera!="undefined"&&opera.wiiremote);
}
}
return _1;
});
