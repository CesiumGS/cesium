/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.validate.web"]){
dojo._hasResource["dojox.validate.web"]=true;
dojo.provide("dojox.validate.web");
dojo.require("dojox.validate._base");
dojox.validate.isIpAddress=function(_1,_2){
var re=new RegExp("^"+dojox.validate.regexp.ipAddress(_2)+"$","i");
return re.test(_1);
};
dojox.validate.isUrl=function(_3,_4){
var re=new RegExp("^"+dojox.validate.regexp.url(_4)+"$","i");
return re.test(_3);
};
dojox.validate.isEmailAddress=function(_5,_6){
var re=new RegExp("^"+dojox.validate.regexp.emailAddress(_6)+"$","i");
return re.test(_5);
};
dojox.validate.isEmailAddressList=function(_7,_8){
var re=new RegExp("^"+dojox.validate.regexp.emailAddressList(_8)+"$","i");
return re.test(_7);
};
dojox.validate.getEmailAddressList=function(_9,_a){
if(!_a){
_a={};
}
if(!_a.listSeparator){
_a.listSeparator="\\s;,";
}
if(dojox.validate.isEmailAddressList(_9,_a)){
return _9.split(new RegExp("\\s*["+_a.listSeparator+"]\\s*"));
}
return [];
};
}
