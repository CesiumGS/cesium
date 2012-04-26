/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.Rating"]){
dojo._hasResource["dojox.form.Rating"]=true;
dojo.provide("dojox.form.Rating");
dojo.require("dijit.form._FormWidget");
dojo.declare("dojox.form.Rating",dijit.form._FormWidget,{templateString:null,numStars:3,value:0,constructor:function(_1){
dojo.mixin(this,_1);
var _2="<div dojoAttachPoint=\"domNode\" class=\"dojoxRating dijitInline\">"+"<input type=\"hidden\" value=\"0\" dojoAttachPoint=\"focusNode\" /><ul>${stars}</ul>"+"</div>";
var _3="<li class=\"dojoxRatingStar dijitInline\" dojoAttachEvent=\"onclick:onStarClick,onmouseover:_onMouse,onmouseout:_onMouse\" value=\"${value}\"></li>";
var _4="";
for(var i=0;i<this.numStars;i++){
_4+=dojo.string.substitute(_3,{value:i+1});
}
this.templateString=dojo.string.substitute(_2,{stars:_4});
},postCreate:function(){
this.inherited(arguments);
this._renderStars(this.value);
},_onMouse:function(_5){
if(this.hovering){
var _6=+dojo.attr(_5.target,"value");
this.onMouseOver(_5,_6);
this._renderStars(_6,true);
}else{
this._renderStars(this.value);
}
},_renderStars:function(_7,_8){
dojo.query(".dojoxRatingStar",this.domNode).forEach(function(_9,i){
if(i+1>_7){
dojo.removeClass(_9,"dojoxRatingStarHover");
dojo.removeClass(_9,"dojoxRatingStarChecked");
}else{
dojo.removeClass(_9,"dojoxRatingStar"+(_8?"Checked":"Hover"));
dojo.addClass(_9,"dojoxRatingStar"+(_8?"Hover":"Checked"));
}
});
},onStarClick:function(_a){
var _b=+dojo.attr(_a.target,"value");
this.setAttribute("value",_b==this.value?0:_b);
this._renderStars(this.value);
this.onChange(this.value);
},onMouseOver:function(){
},setAttribute:function(_c,_d){
this.inherited("setAttribute",arguments);
if(_c=="value"){
this._renderStars(this.value);
this.onChange(this.value);
}
}});
}
