define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-class"
], function(declare, lang, domClass){

	var setStyleText = function(inNode, inStyleText){
		if(inNode.style.cssText == undefined){
			inNode.setAttribute("style", inStyleText);
		}else{
			inNode.style.cssText = inStyleText;
		}
	};

	return declare("dojox.grid._RowManager", null, {
		//	Stores information about grid rows. Owned by grid and used internally.
		constructor: function(inGrid){
			this.grid = inGrid;
		},
		linesToEms: 2,
		overRow: -2,
		// styles
		prepareStylingRow: function(inRowIndex, inRowNode){
			return {
				index: inRowIndex,
				node: inRowNode,
				odd: Boolean(inRowIndex&1),
				selected: !!this.grid.selection.isSelected(inRowIndex),
				over: this.isOver(inRowIndex),
				customStyles: "",
				customClasses: "dojoxGridRow"
			};
		},
		styleRowNode: function(inRowIndex, inRowNode){
			var row = this.prepareStylingRow(inRowIndex, inRowNode);
			this.grid.onStyleRow(row);
			this.applyStyles(row);
		},
		applyStyles: function(inRow){
			var i = inRow;

			i.node.className = i.customClasses;
			var h = i.node.style.height;
			setStyleText(i.node, i.customStyles + ';' + (i.node._style||''));
			i.node.style.height = h;
		},
		updateStyles: function(inRowIndex){
			this.grid.updateRowStyles(inRowIndex);
		},
		// states and events
		setOverRow: function(inRowIndex){
			var last = this.overRow;
			this.overRow = inRowIndex;
			if((last!=this.overRow)&&(lang.isString(last) || last >= 0)){
				this.updateStyles(last);
			}
			this.updateStyles(this.overRow);
		},
		isOver: function(inRowIndex){
			return (this.overRow == inRowIndex && !domClass.contains(this.grid.domNode, "dojoxGridColumnResizing"));
		}
	});
});