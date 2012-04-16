/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.HorizontalRule"]){
dojo._hasResource["dijit.form.HorizontalRule"]=true;
dojo.provide("dijit.form.HorizontalRule");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dijit.form.HorizontalRule",[dijit._Widget,dijit._Templated],{templateString:"<div class=\"dijitRuleContainer dijitRuleContainerH\"></div>",count:3,container:"containerNode",ruleStyle:"",_positionPrefix:"<div class=\"dijitRuleMark dijitRuleMarkH\" style=\"left:",_positionSuffix:"%;",_suffix:"\"></div>",_genHTML:function(_1,_2){
return this._positionPrefix+_1+this._positionSuffix+this.ruleStyle+this._suffix;
},_isHorizontal:true,buildRendering:function(){
this.inherited(arguments);
var _3;
if(this.count==1){
_3=this._genHTML(50,0);
}else{
var i;
var _4=100/(this.count-1);
if(!this._isHorizontal||this.isLeftToRight()){
_3=this._genHTML(0,0);
for(i=1;i<this.count-1;i++){
_3+=this._genHTML(_4*i,i);
}
_3+=this._genHTML(100,this.count-1);
}else{
_3=this._genHTML(100,0);
for(i=1;i<this.count-1;i++){
_3+=this._genHTML(100-_4*i,i);
}
_3+=this._genHTML(0,this.count-1);
}
}
this.domNode.innerHTML=_3;
}});
}
