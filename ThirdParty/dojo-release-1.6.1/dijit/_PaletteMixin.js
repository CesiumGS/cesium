/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._PaletteMixin"]){
dojo._hasResource["dijit._PaletteMixin"]=true;
dojo.provide("dijit._PaletteMixin");
dojo.require("dijit._CssStateMixin");
dojo.declare("dijit._PaletteMixin",[dijit._CssStateMixin],{defaultTimeout:500,timeoutChangeRate:0.9,value:null,_selectedCell:-1,tabIndex:"0",cellClass:"dijitPaletteCell",dyeClass:"",_preparePalette:function(_1,_2,_3){
this._cells=[];
var _4=this._blankGif;
_3=_3||dojo.getObject(this.dyeClass);
for(var _5=0;_5<_1.length;_5++){
var _6=dojo.create("tr",{tabIndex:"-1"},this.gridNode);
for(var _7=0;_7<_1[_5].length;_7++){
var _8=_1[_5][_7];
if(_8){
var _9=new _3(_8,_5,_7);
var _a=dojo.create("td",{"class":this.cellClass,tabIndex:"-1",title:_2[_8]});
_9.fillCell(_a,_4);
this.connect(_a,"ondijitclick","_onCellClick");
this._trackMouseState(_a,this.cellClass);
dojo.place(_a,_6);
_a.index=this._cells.length;
this._cells.push({node:_a,dye:_9});
}
}
}
this._xDim=_1[0].length;
this._yDim=_1.length;
var _b={UP_ARROW:-this._xDim,DOWN_ARROW:this._xDim,RIGHT_ARROW:this.isLeftToRight()?1:-1,LEFT_ARROW:this.isLeftToRight()?-1:1};
for(var _c in _b){
this._connects.push(dijit.typematic.addKeyListener(this.domNode,{charOrCode:dojo.keys[_c],ctrlKey:false,altKey:false,shiftKey:false},this,function(){
var _d=_b[_c];
return function(_e){
this._navigateByKey(_d,_e);
};
}(),this.timeoutChangeRate,this.defaultTimeout));
}
},postCreate:function(){
this.inherited(arguments);
this._setCurrent(this._cells[0].node);
},focus:function(){
dijit.focus(this._currentFocus);
},_onCellClick:function(_f){
var _10=_f.currentTarget,_11=this._getDye(_10).getValue();
this._setCurrent(_10);
setTimeout(dojo.hitch(this,function(){
dijit.focus(_10);
this._setValueAttr(_11,true);
}));
dojo.removeClass(_10,"dijitPaletteCellHover");
dojo.stopEvent(_f);
},_setCurrent:function(_12){
if("_currentFocus" in this){
dojo.attr(this._currentFocus,"tabIndex","-1");
}
this._currentFocus=_12;
if(_12){
dojo.attr(_12,"tabIndex",this.tabIndex);
}
},_setValueAttr:function(_13,_14){
if(this._selectedCell>=0){
dojo.removeClass(this._cells[this._selectedCell].node,"dijitPaletteCellSelected");
}
this._selectedCell=-1;
if(_13){
for(var i=0;i<this._cells.length;i++){
if(_13==this._cells[i].dye.getValue()){
this._selectedCell=i;
dojo.addClass(this._cells[i].node,"dijitPaletteCellSelected");
break;
}
}
}
this._set("value",this._selectedCell>=0?_13:null);
if(_14||_14===undefined){
this.onChange(_13);
}
},onChange:function(_15){
},_navigateByKey:function(_16,_17){
if(_17==-1){
return;
}
var _18=this._currentFocus.index+_16;
if(_18<this._cells.length&&_18>-1){
var _19=this._cells[_18].node;
this._setCurrent(_19);
setTimeout(dojo.hitch(dijit,"focus",_19),0);
}
},_getDye:function(_1a){
return this._cells[_1a.index].dye;
}});
}
