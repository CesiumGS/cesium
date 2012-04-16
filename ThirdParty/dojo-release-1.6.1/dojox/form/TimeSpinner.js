/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.TimeSpinner"]){
dojo._hasResource["dojox.form.TimeSpinner"]=true;
dojo.provide("dojox.form.TimeSpinner");
dojo.require("dijit.form._Spinner");
dojo.require("dojo.date");
dojo.require("dojo.date.locale");
dojo.require("dojo.date.stamp");
dojo.declare("dojox.form.TimeSpinner",[dijit.form._Spinner],{required:false,adjust:function(_1,_2){
return dojo.date.add(_1,"minute",_2);
},isValid:function(){
return true;
},smallDelta:5,largeDelta:30,timeoutChangeRate:0.5,parse:function(_3,_4){
return dojo.date.locale.parse(_3,{selector:"time",formatLength:"short"});
},format:function(_5,_6){
if(dojo.isString(_5)){
return _5;
}
return dojo.date.locale.format(_5,{selector:"time",formatLength:"short"});
},serialize:dojo.date.stamp.toISOString,value:"12:00 AM",_onKeyPress:function(e){
if((e.charOrCode==dojo.keys.HOME||e.charOrCode==dojo.keys.END)&&!(e.ctrlKey||e.altKey||e.metaKey)&&typeof this.get("value")!="undefined"){
var _7=this.constraints[(e.charOrCode==dojo.keys.HOME?"min":"max")];
if(_7){
this._setValueAttr(_7,true);
}
dojo.stopEvent(e);
}
}});
}
