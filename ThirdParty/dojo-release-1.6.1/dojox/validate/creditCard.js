/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.validate.creditCard"]){
dojo._hasResource["dojox.validate.creditCard"]=true;
dojo.provide("dojox.validate.creditCard");
dojo.require("dojox.validate._base");
dojox.validate._cardInfo={"mc":"5[1-5][0-9]{14}","ec":"5[1-5][0-9]{14}","vi":"4(?:[0-9]{12}|[0-9]{15})","ax":"3[47][0-9]{13}","dc":"3(?:0[0-5][0-9]{11}|[68][0-9]{12})","bl":"3(?:0[0-5][0-9]{11}|[68][0-9]{12})","di":"6011[0-9]{12}","jcb":"(?:3[0-9]{15}|(2131|1800)[0-9]{11})","er":"2(?:014|149)[0-9]{11}"};
dojox.validate.isValidCreditCard=function(_1,_2){
return ((_2.toLowerCase()=="er"||dojox.validate.isValidLuhn(_1))&&dojox.validate.isValidCreditCardNumber(_1,_2.toLowerCase()));
};
dojox.validate.isValidCreditCardNumber=function(_3,_4){
_3=String(_3).replace(/[- ]/g,"");
var _5=dojox.validate._cardInfo,_6=[];
if(_4){
var _7="^"+_5[_4.toLowerCase()]+"$";
return _7?!!_3.match(_7):false;
}
for(var p in _5){
if(_3.match("^"+_5[p]+"$")){
_6.push(p);
}
}
return _6.length?_6.join("|"):false;
};
dojox.validate.isValidCvv=function(_8,_9){
if(!dojo.isString(_8)){
_8=String(_8);
}
var _a;
switch(_9.toLowerCase()){
case "mc":
case "ec":
case "vi":
case "di":
_a="###";
break;
case "ax":
_a="####";
break;
}
return !!_a&&_8.length&&dojox.validate.isNumberFormat(_8,{format:_a});
};
}
