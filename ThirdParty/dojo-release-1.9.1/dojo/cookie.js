/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/cookie",["./_base/kernel","./regexp"],function(_1,_2){
_1.cookie=function(_3,_4,_5){
var c=document.cookie,_6;
if(arguments.length==1){
var _7=c.match(new RegExp("(?:^|; )"+_2.escapeString(_3)+"=([^;]*)"));
_6=_7?decodeURIComponent(_7[1]):undefined;
}else{
_5=_5||{};
var _8=_5.expires;
if(typeof _8=="number"){
var d=new Date();
d.setTime(d.getTime()+_8*24*60*60*1000);
_8=_5.expires=d;
}
if(_8&&_8.toUTCString){
_5.expires=_8.toUTCString();
}
_4=encodeURIComponent(_4);
var _9=_3+"="+_4,_a;
for(_a in _5){
_9+="; "+_a;
var _b=_5[_a];
if(_b!==true){
_9+="="+_b;
}
}
document.cookie=_9;
}
return _6;
};
_1.cookie.isSupported=function(){
if(!("cookieEnabled" in navigator)){
this("__djCookieTest__","CookiesAllowed");
navigator.cookieEnabled=this("__djCookieTest__")=="CookiesAllowed";
if(navigator.cookieEnabled){
this("__djCookieTest__","",{expires:-1});
}
}
return navigator.cookieEnabled;
};
return _1.cookie;
});
