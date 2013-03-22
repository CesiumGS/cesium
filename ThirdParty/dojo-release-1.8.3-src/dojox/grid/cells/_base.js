define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/_base/sniff",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dijit/_Widget",
	"../util"
], function(dojo, declare, lang, event, connect, array, has, dom, domAttr, domConstruct, _Widget, util){

	var _DeferredTextWidget = declare("dojox.grid._DeferredTextWidget", _Widget, {
		deferred: null,
		_destroyOnRemove: true,
		postCreate: function(){
			if(this.deferred){
				this.deferred.addBoth(lang.hitch(this, function(text){
					if(this.domNode){
						this.domNode.innerHTML = text;
					}
				}));
			}
		}
	});

	var focusSelectNode = function(inNode){
		try{
			util.fire(inNode, "focus");
			util.fire(inNode, "select");
		}catch(e){// IE sux bad
		}
	};
	
	var whenIdle = function(/*inContext, inMethod, args ...*/){
		setTimeout(lang.hitch.apply(dojo, arguments), 0);
	};

	var BaseCell = declare("dojox.grid.cells._Base", null, {
		// summary:
		//		Represents a grid cell and contains information about column options and methods
		//		for retrieving cell related information.
		//		Each column in a grid layout has a cell object and most events and many methods
		//		provide access to these objects.
		styles: '',
		classes: '',
		editable: false,
		alwaysEditing: false,
		formatter: null,
		defaultValue: '...',
		value: null,
		hidden: false,
		noresize: false,
		draggable: true,
		//private
		_valueProp: "value",
		_formatPending: false,

		constructor: function(inProps){
			this._props = inProps || {};
			lang.mixin(this, inProps);
			if(this.draggable === undefined){
				this.draggable = true;
			}
		},

		_defaultFormat: function(inValue, callArgs){
			var s = this.grid.formatterScope || this;
			var f = this.formatter;
			if(f && s && typeof f == "string"){
				f = this.formatter = s[f];
			}
			var v = (inValue != this.defaultValue && f) ? f.apply(s, callArgs) : inValue;
			if(typeof v == "undefined"){
				return this.defaultValue;
			}
			if(v && v.addBoth){
				// Check if it's a deferred
				v = new _DeferredTextWidget({deferred: v},
									domConstruct.create("span", {innerHTML: this.defaultValue}));
			}
			if(v && v.declaredClass && v.startup){
				return "<div class='dojoxGridStubNode' linkWidget='" +
						v.id +
						"' cellIdx='" +
						this.index +
						"'>" +
						this.defaultValue +
						"</div>";
			}
			return v;
		},
		
		// data source
		format: function(inRowIndex, inItem){
			// summary:
			//		provides the html for a given grid cell.
			// inRowIndex: int
			//		grid row index
			// returns:
			//		html for a given grid cell
			var f, i=this.grid.edit.info, d=this.get ? this.get(inRowIndex, inItem) : (this.value || this.defaultValue);
			d = (d && d.replace && this.grid.escapeHTMLInData) ? d.replace(/&/g, '&amp;').replace(/</g, '&lt;') : d;
			if(this.editable && (this.alwaysEditing || (i.rowIndex==inRowIndex && i.cell==this))){
				return this.formatEditing(d, inRowIndex);
			}else{
				return this._defaultFormat(d, [d, inRowIndex, this]);
			}
		},
		formatEditing: function(inDatum, inRowIndex){
			// summary:
			//		formats the cell for editing
			// inDatum: anything
			//		cell data to edit
			// inRowIndex: int
			//		grid row index
			// returns:
			//		string of html to place in grid cell
		},
		// utility
		getNode: function(inRowIndex){
			// summary:
			//		gets the dom node for a given grid cell.
			// inRowIndex: int
			//		grid row index
			// returns:
			//		dom node for a given grid cell
			return this.view.getCellNode(inRowIndex, this.index);
		},
		getHeaderNode: function(){
			return this.view.getHeaderCellNode(this.index);
		},
		getEditNode: function(inRowIndex){
			return (this.getNode(inRowIndex) || 0).firstChild || 0;
		},
		canResize: function(){
			var uw = this.unitWidth;
			return uw && (uw!=='auto');
		},
		isFlex: function(){
			var uw = this.unitWidth;
			return uw && lang.isString(uw) && (uw=='auto' || uw.slice(-1)=='%');
		},
		// edit support
		applyEdit: function(inValue, inRowIndex){
			if(this.getNode(inRowIndex)){
				this.grid.edit.applyCellEdit(inValue, this, inRowIndex);
			}
		},
		cancelEdit: function(inRowIndex){
			this.grid.doCancelEdit(inRowIndex);
		},
		_onEditBlur: function(inRowIndex){
			if(this.grid.edit.isEditCell(inRowIndex, this.index)){
				//console.log('editor onblur', e);
				this.grid.edit.apply();
			}
		},
		registerOnBlur: function(inNode, inRowIndex){
			if(this.commitOnBlur){
				connect.connect(inNode, "onblur", function(e){
					// hack: if editor still thinks this editor is current some ms after it blurs, assume we've focused away from grid
					setTimeout(lang.hitch(this, "_onEditBlur", inRowIndex), 250);
				});
			}
		},
		//protected
		needFormatNode: function(inDatum, inRowIndex){
			this._formatPending = true;
			whenIdle(this, "_formatNode", inDatum, inRowIndex);
		},
		cancelFormatNode: function(){
			this._formatPending = false;
		},
		//private
		_formatNode: function(inDatum, inRowIndex){
			if(this._formatPending){
				this._formatPending = false;
				// make cell selectable
				if(!has('ie')){
					dom.setSelectable(this.grid.domNode, true);
				}
				this.formatNode(this.getEditNode(inRowIndex), inDatum, inRowIndex);
			}
		},
		//protected
		formatNode: function(inNode, inDatum, inRowIndex){
			// summary:
			//		format the editing dom node. Use when editor is a widget.
			// inNode: dom node
			//		dom node for the editor
			// inDatum: anything
			//		cell data to edit
			// inRowIndex: int
			//		grid row index
			if(has('ie')){
				// IE sux bad
				whenIdle(this, "focus", inRowIndex, inNode);
			}else{
				this.focus(inRowIndex, inNode);
			}
		},
		dispatchEvent: function(m, e){
			if(m in this){
				return this[m](e);
			}
		},
		//public
		getValue: function(inRowIndex){
			// summary:
			//		returns value entered into editor
			// inRowIndex: int
			//		grid row index
			// returns:
			//		value of editor
			return this.getEditNode(inRowIndex)[this._valueProp];
		},
		setValue: function(inRowIndex, inValue){
			// summary:
			//		set the value of the grid editor
			// inRowIndex: int
			//		grid row index
			// inValue: anything
			//		value of editor
			var n = this.getEditNode(inRowIndex);
			if(n){
				n[this._valueProp] = inValue;
			}
		},
		focus: function(inRowIndex, inNode){
			// summary:
			//		focus the grid editor
			// inRowIndex: int
			//		grid row index
			// inNode: dom node
			//		editor node
			focusSelectNode(inNode || this.getEditNode(inRowIndex));
		},
		save: function(inRowIndex){
			// summary:
			//		save editor state
			// inRowIndex: int
			//		grid row index
			this.value = this.value || this.getValue(inRowIndex);
			//console.log("save", this.value, inCell.index, inRowIndex);
		},
		restore: function(inRowIndex){
			// summary:
			//		restore editor state
			// inRowIndex: int
			//		grid row index
			this.setValue(inRowIndex, this.value);
			//console.log("restore", this.value, inCell.index, inRowIndex);
		},
		//protected
		_finish: function(inRowIndex){
			// summary:
			//		called when editing is completed to clean up editor
			// inRowIndex: int
			//		grid row index
			dom.setSelectable(this.grid.domNode, false);
			this.cancelFormatNode();
		},
		//public
		apply: function(inRowIndex){
			// summary:
			//		apply edit from cell editor
			// inRowIndex: int
			//		grid row index
			this.applyEdit(this.getValue(inRowIndex), inRowIndex);
			this._finish(inRowIndex);
		},
		cancel: function(inRowIndex){
			// summary:
			//		cancel cell edit
			// inRowIndex: int
			//		grid row index
			this.cancelEdit(inRowIndex);
			this._finish(inRowIndex);
		}
	});
	BaseCell.markupFactory = function(node, cellDef){
		var formatter = lang.trim(domAttr.get(node, "formatter")||"");
		if(formatter){
			cellDef.formatter = lang.getObject(formatter)||formatter;
		}
		var get = lang.trim(domAttr.get(node, "get")||"");
		if(get){
			cellDef.get = lang.getObject(get);
		}
		var getBoolAttr = function(attr, cell, cellAttr){
			var value = lang.trim(domAttr.get(node, attr)||"");
			if(value){ cell[cellAttr||attr] = !(value.toLowerCase()=="false"); }
		};
		getBoolAttr("sortDesc", cellDef);
		getBoolAttr("editable", cellDef);
		getBoolAttr("alwaysEditing", cellDef);
		getBoolAttr("noresize", cellDef);
		getBoolAttr("draggable", cellDef);

		var value = lang.trim(domAttr.get(node, "loadingText")||domAttr.get(node, "defaultValue")||"");
		if(value){
			cellDef.defaultValue = value;
		}

		var getStrAttr = function(attr, cell, cellAttr){
			var value = lang.trim(domAttr.get(node, attr)||"")||undefined;
			if(value){ cell[cellAttr||attr] = value; }
		};
		getStrAttr("styles", cellDef);
		getStrAttr("headerStyles", cellDef);
		getStrAttr("cellStyles", cellDef);
		getStrAttr("classes", cellDef);
		getStrAttr("headerClasses", cellDef);
		getStrAttr("cellClasses", cellDef);
	};

	var Cell = declare("dojox.grid.cells.Cell", BaseCell, {
		// summary:
		//		grid cell that provides a standard text input box upon editing
		constructor: function(){
			this.keyFilter = this.keyFilter;
		},
		// keyFilter: RegExp
		//		optional regex for disallowing keypresses
		keyFilter: null,
		formatEditing: function(inDatum, inRowIndex){
			this.needFormatNode(inDatum, inRowIndex);
			return '<input class="dojoxGridInput" type="text" value="' + inDatum + '">';
		},
		formatNode: function(inNode, inDatum, inRowIndex){
			this.inherited(arguments);
			// FIXME: feels too specific for this interface
			this.registerOnBlur(inNode, inRowIndex);
		},
		doKey: function(e){
			if(this.keyFilter){
				var key = String.fromCharCode(e.charCode);
				if(key.search(this.keyFilter) == -1){
					event.stop(e);
				}
			}
		},
		_finish: function(inRowIndex){
			this.inherited(arguments);
			var n = this.getEditNode(inRowIndex);
			try{
				util.fire(n, "blur");
			}catch(e){}
		}
	});
	Cell.markupFactory = function(node, cellDef){
		BaseCell.markupFactory(node, cellDef);
		var keyFilter = lang.trim(domAttr.get(node, "keyFilter")||"");
		if(keyFilter){
			cellDef.keyFilter = new RegExp(keyFilter);
		}
	};

	var RowIndex = declare("dojox.grid.cells.RowIndex", Cell, {
		name: 'Row',

		postscript: function(){
			this.editable = false;
		},
		get: function(inRowIndex){
			return inRowIndex + 1;
		}
	});
	RowIndex.markupFactory = function(node, cellDef){
		Cell.markupFactory(node, cellDef);
	};

	var Select = declare("dojox.grid.cells.Select", Cell, {
		// summary:
		//		grid cell that provides a standard select for editing

		// options: Array
		//		text of each item
		options: null,

		// values: Array
		//		value for each item
		values: null,

		// returnIndex: Integer
		//		editor returns only the index of the selected option and not the value
		returnIndex: -1,

		constructor: function(inCell){
			this.values = this.values || this.options;
		},
		formatEditing: function(inDatum, inRowIndex){
			this.needFormatNode(inDatum, inRowIndex);
			var h = [ '<select class="dojoxGridSelect">' ];
			for (var i=0, o, v; ((o=this.options[i]) !== undefined)&&((v=this.values[i]) !== undefined); i++){
				v = v.replace ? v.replace(/&/g, '&amp;').replace(/</g, '&lt;') : v;
				o = o.replace ? o.replace(/&/g, '&amp;').replace(/</g, '&lt;') : o;
				h.push("<option", (inDatum==v ? ' selected' : ''), ' value="' + v + '"', ">", o, "</option>");
			}
			h.push('</select>');
			return h.join('');
		},
		_defaultFormat: function(inValue, callArgs){
			var v = this.inherited(arguments);
			// when 'values' and 'options' both provided and there is no cutomized formatter,
			// then we use 'options' as label in order to be consistent
			if(!this.formatter && this.values && this.options){
				var i = array.indexOf(this.values, v);
				if(i >= 0){
					v = this.options[i];
				}
			}
			return v;
		},
		getValue: function(inRowIndex){
			var n = this.getEditNode(inRowIndex);
			if(n){
				var i = n.selectedIndex, o = n.options[i];
				return this.returnIndex > -1 ? i : o.value || o.innerHTML;
			}
		}
	});
	Select.markupFactory = function(node, cell){
		Cell.markupFactory(node, cell);
		var options = lang.trim(domAttr.get(node, "options")||"");
		if(options){
			var o = options.split(',');
			if(o[0] != options){
				cell.options = o;
			}
		}
		var values = lang.trim(domAttr.get(node, "values")||"");
		if(values){
			var v = values.split(',');
			if(v[0] != values){
				cell.values = v;
			}
		}
	};

	var AlwaysEdit = declare("dojox.grid.cells.AlwaysEdit", Cell, {
		// summary:
		//		grid cell that is always in an editable state, regardless of grid editing state
		alwaysEditing: true,
		_formatNode: function(inDatum, inRowIndex){
			this.formatNode(this.getEditNode(inRowIndex), inDatum, inRowIndex);
		},
		applyStaticValue: function(inRowIndex){
			var e = this.grid.edit;
			e.applyCellEdit(this.getValue(inRowIndex), this, inRowIndex);
			e.start(this, inRowIndex, true);
		}
	});
	AlwaysEdit.markupFactory = function(node, cell){
		Cell.markupFactory(node, cell);
	};

	var Bool = declare("dojox.grid.cells.Bool", AlwaysEdit, {
		// summary:
		//		grid cell that provides a standard checkbox that is always on for editing
		_valueProp: "checked",
		formatEditing: function(inDatum, inRowIndex){
			return '<input class="dojoxGridInput" type="checkbox"' + (inDatum ? ' checked="checked"' : '') + ' style="width: auto" />';
		},
		doclick: function(e){
			if(e.target.tagName == 'INPUT'){
				this.applyStaticValue(e.rowIndex);
			}
		}
	});
	Bool.markupFactory = function(node, cell){
		AlwaysEdit.markupFactory(node, cell);
	};

	return BaseCell;

});