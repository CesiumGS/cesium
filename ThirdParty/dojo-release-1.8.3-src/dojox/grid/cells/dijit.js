define([
	"dojo/_base/kernel",
	"../../main",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/json",
	"dojo/_base/connect",
	"dojo/_base/sniff",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/data/ItemFileReadStore",
	"dijit/form/DateTextBox",
	"dijit/form/TimeTextBox",
	"dijit/form/ComboBox",
	"dijit/form/CheckBox",
	"dijit/form/TextBox",
	"dijit/form/NumberSpinner",
	"dijit/form/NumberTextBox",
	"dijit/form/CurrencyTextBox",
	"dijit/form/HorizontalSlider",
	"dijit/form/_TextBoxMixin",
	"dijit/Editor",
	"../util",
	"./_base"
], function(dojo, dojox, declare, array, lang, json, connect, has, dom, domAttr, domConstruct, domStyle,
	domGeometry, ItemFileReadStore, DateTextBox, TimeTextBox, ComboBox, CheckBox, TextBox,
	NumberSpinner, NumberTextBox, CurrencyTextBox, HorizontalSlider, _TextBoxMixin, Editor, util, BaseCell){
		
// TODO: shouldn't it be the test file's job to require these modules,
// if it is using them?  Most of these modules aren't referenced by this file.
	
	var _Widget = declare("dojox.grid.cells._Widget", BaseCell, {
		widgetClass: TextBox,
		constructor: function(inCell){
			this.widget = null;
			if(typeof this.widgetClass == "string"){
				dojo.deprecated("Passing a string to widgetClass is deprecated", "pass the widget class object instead", "2.0");
				this.widgetClass = lang.getObject(this.widgetClass);
			}
		},
		formatEditing: function(inDatum, inRowIndex){
			this.needFormatNode(inDatum, inRowIndex);
			return "<div></div>";
		},
		getValue: function(inRowIndex){
			return this.widget.get('value');
		},
		_unescapeHTML: function(value){
			return (value && value.replace && this.grid.escapeHTMLInData) ? 
					value.replace(/&lt;/g, '<').replace(/&amp;/g, '&') : value;
		},
		setValue: function(inRowIndex, inValue){
			if(this.widget&&this.widget.set){
				inValue = this._unescapeHTML(inValue);
				//Look for lazy-loading editor and handle it via its deferred.
				if(this.widget.onLoadDeferred){
					var self = this;
					this.widget.onLoadDeferred.addCallback(function(){
						self.widget.set("value",inValue===null?"":inValue);
					});
				}else{
					this.widget.set("value", inValue);
				}
			}else{
				this.inherited(arguments);
			}
		},
		getWidgetProps: function(inDatum){
			return lang.mixin(
				{
					dir: this.dir,
					lang: this.lang
				},
				this.widgetProps||{},
				{
					constraints: lang.mixin({}, this.constraint) || {}, //TODO: really just for ValidationTextBoxes
					required: (this.constraint || {}).required,
					value: this._unescapeHTML(inDatum)
				}
			);
		},
		createWidget: function(inNode, inDatum, inRowIndex){
			return new this.widgetClass(this.getWidgetProps(inDatum), inNode);
		},
		attachWidget: function(inNode, inDatum, inRowIndex){
			inNode.appendChild(this.widget.domNode);
			this.setValue(inRowIndex, inDatum);
		},
		formatNode: function(inNode, inDatum, inRowIndex){
			if(!this.widgetClass){
				return inDatum;
			}
			if(!this.widget){
				this.widget = this.createWidget.apply(this, arguments);
			}else{
				this.attachWidget.apply(this, arguments);
			}
			this.sizeWidget.apply(this, arguments);
			this.grid.views.renormalizeRow(inRowIndex);
			this.grid.scroller.rowHeightChanged(inRowIndex, true/*fix #11101*/);
			this.focus();
			return undefined;
		},
		sizeWidget: function(inNode, inDatum, inRowIndex){
			var p = this.getNode(inRowIndex);
			dojo.marginBox(this.widget.domNode, {w: domStyle.get(p, 'width')});
		},
		focus: function(inRowIndex, inNode){
			if(this.widget){
				setTimeout(lang.hitch(this.widget, function(){
					util.fire(this, "focus");
					if(this.focusNode && this.focusNode.tagName === "INPUT"){
						_TextBoxMixin.selectInputText(this.focusNode);
					}
				}), 0);
			}
		},
		_finish: function(inRowIndex){
			this.inherited(arguments);
			util.removeNode(this.widget.domNode);
			if(has('ie')){
				dom.setSelectable(this.widget.domNode, true);
			}
		}
	});
	_Widget.markupFactory = function(node, cell){
		BaseCell.markupFactory(node, cell);
		var widgetProps = lang.trim(domAttr.get(node, "widgetProps")||"");
		var constraint = lang.trim(domAttr.get(node, "constraint")||"");
		var widgetClass = lang.trim(domAttr.get(node, "widgetClass")||"");
		if(widgetProps){
			cell.widgetProps = json.fromJson(widgetProps);
		}
		if(constraint){
			cell.constraint = json.fromJson(constraint);
		}
		if(widgetClass){
			cell.widgetClass = lang.getObject(widgetClass);
		}
	};

	var ComboBox = declare("dojox.grid.cells.ComboBox", _Widget, {
		widgetClass: ComboBox,
		getWidgetProps: function(inDatum){
			var items=[];
			array.forEach(this.options, function(o){
				items.push({name: o, value: o});
			});
			var store = new ItemFileReadStore({data: {identifier:"name", items: items}});
			return lang.mixin({}, this.widgetProps||{}, {
				value: inDatum,
				store: store
			});
		},
		getValue: function(){
			var e = this.widget;
			// make sure to apply the displayed value
			e.set('displayedValue', e.get('displayedValue'));
			return e.get('value');
		}
	});
	ComboBox.markupFactory = function(node, cell){
		_Widget.markupFactory(node, cell);
		var options = lang.trim(domAttr.get(node, "options")||"");
		if(options){
			var o = options.split(',');
			if(o[0] != options){
				cell.options = o;
			}
		}
	};

	var DateTextBox = declare("dojox.grid.cells.DateTextBox", _Widget, {
		widgetClass: DateTextBox,
		setValue: function(inRowIndex, inValue){
			if(this.widget){
				this.widget.set('value', new Date(inValue));
			}else{
				this.inherited(arguments);
			}
		},
		getWidgetProps: function(inDatum){
			return lang.mixin(this.inherited(arguments), {
				value: new Date(inDatum)
			});
		}
	});
	DateTextBox.markupFactory = function(node, cell){
		_Widget.markupFactory(node, cell);
	};

	var CheckBox = declare("dojox.grid.cells.CheckBox", _Widget, {
		widgetClass: CheckBox,
		getValue: function(){
			return this.widget.checked;
		},
		setValue: function(inRowIndex, inValue){
			if(this.widget&&this.widget.attributeMap.checked){
				this.widget.set("checked", inValue);
			}else{
				this.inherited(arguments);
			}
		},
		sizeWidget: function(inNode, inDatum, inRowIndex){
			return;
		}
	});
	CheckBox.markupFactory = function(node, cell){
		_Widget.markupFactory(node, cell);
	};

	var Editor = declare("dojox.grid.cells.Editor", _Widget, {
		widgetClass: Editor,
		getWidgetProps: function(inDatum){
			return lang.mixin({}, this.widgetProps||{}, {
				height: this.widgetHeight || "100px"
			});
		},
		createWidget: function(inNode, inDatum, inRowIndex){
			// widget needs its value set after creation
			var widget = new this.widgetClass(this.getWidgetProps(inDatum), inNode);
			// use onLoadDeferred because onLoad may have already fired
			widget.onLoadDeferred.then(lang.hitch(this, 'populateEditor'));
			return widget;
		},
		formatNode: function(inNode, inDatum, inRowIndex){
			this.content = inDatum;
			this.inherited(arguments);
			if(has('mozilla')){
				// FIXME: seem to need to reopen the editor and display the toolbar
				var e = this.widget;
				e.open();
				if(this.widgetToolbar){
					domConstruct.place(e.toolbar.domNode, e.editingArea, "before");
				}
			}
		},
		populateEditor: function(){
			this.widget.set('value', this.content);
			this.widget.placeCursorAtEnd();
		}
	});
	Editor.markupFactory = function(node, cell){
		_Widget.markupFactory(node, cell);
		var h = lang.trim(domAttr.get(node, "widgetHeight")||"");
		if(h){
			if((h != "auto")&&(h.substr(-2) != "em")){
				h = parseInt(h, 10)+"px";
			}
			cell.widgetHeight = h;
		}
	};

	return dojox.grid.cells.dijit;

});
