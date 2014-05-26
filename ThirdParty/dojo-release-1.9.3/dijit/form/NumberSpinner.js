//>>built
define("dijit/form/NumberSpinner",["dojo/_base/declare","dojo/keys","./_Spinner","./NumberTextBox"],function(_1,_2,_3,_4){
return _1("dijit.form.NumberSpinner",[_3,_4.Mixin],{baseClass:"dijitTextBox dijitSpinner dijitNumberTextBox",adjust:function(_5,_6){
var tc=this.constraints,v=isNaN(_5),_7=!isNaN(tc.max),_8=!isNaN(tc.min);
if(v&&_6!=0){
_5=(_6>0)?_8?tc.min:_7?tc.max:0:_7?this.constraints.max:_8?tc.min:0;
}
var _9=_5+_6;
if(v||isNaN(_9)){
return _5;
}
if(_7&&(_9>tc.max)){
_9=tc.max;
}
if(_8&&(_9<tc.min)){
_9=tc.min;
}
return _9;
},_onKeyDown:function(e){
if(this.disabled||this.readOnly){
return;
}
if((e.keyCode==_2.HOME||e.keyCode==_2.END)&&!(e.ctrlKey||e.altKey||e.metaKey)&&typeof this.get("value")!="undefined"){
var _a=this.constraints[(e.keyCode==_2.HOME?"min":"max")];
if(typeof _a=="number"){
this._setValueAttr(_a,false);
}
e.stopPropagation();
e.preventDefault();
}
}});
});
