//>>built
define("dijit/form/RangeBoundTextBox",["dojo/_base/declare","dojo/i18n","./MappedTextBox"],function(_1,_2,_3){
var _4=_1("dijit.form.RangeBoundTextBox",_3,{rangeMessage:"",rangeCheck:function(_5,_6){
return ("min" in _6?(this.compare(_5,_6.min)>=0):true)&&("max" in _6?(this.compare(_5,_6.max)<=0):true);
},isInRange:function(){
return this.rangeCheck(this.get("value"),this.constraints);
},_isDefinitelyOutOfRange:function(){
var _7=this.get("value");
if(_7==null){
return false;
}
var _8=false;
if("min" in this.constraints){
var _9=this.constraints.min;
_8=this.compare(_7,((typeof _9=="number")&&_9>=0&&_7!=0)?0:_9)<0;
}
if(!_8&&("max" in this.constraints)){
var _a=this.constraints.max;
_8=this.compare(_7,((typeof _a!="number")||_a>0)?_a:0)>0;
}
return _8;
},_isValidSubset:function(){
return this.inherited(arguments)&&!this._isDefinitelyOutOfRange();
},isValid:function(_b){
return this.inherited(arguments)&&((this._isEmpty(this.textbox.value)&&!this.required)||this.isInRange(_b));
},getErrorMessage:function(_c){
var v=this.get("value");
if(v!=null&&v!==""&&(typeof v!="number"||!isNaN(v))&&!this.isInRange(_c)){
return this.rangeMessage;
}
return this.inherited(arguments);
},postMixInProperties:function(){
this.inherited(arguments);
if(!this.rangeMessage){
this.messages=_2.getLocalization("dijit.form","validate",this.lang);
this.rangeMessage=this.messages.rangeMessage;
}
}});
return _4;
});
