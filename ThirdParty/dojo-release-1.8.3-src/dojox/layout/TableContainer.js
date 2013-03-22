define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/dom-class", "dojo/dom-construct", 
		"dojo/_base/array", "dojo/dom-prop", "dojo/dom-style", "dijit/_WidgetBase", "dijit/layout/_LayoutWidget"],
function(kernel, lang, declare, domClass, domConstruct, arrayUtil, domProp, domStyle, _WidgetBase, _LayoutWidget){

kernel.experimental("dojox.layout.TableContainer");

var TableContainer = declare("dojox.layout.TableContainer", _LayoutWidget, {
	// summary:
	//		A container that lays out its child widgets in a table layout.
	//
	// description:
	//		The TableContainer lays out child widgets in a Table layout.
	//		Each widget can specify a "label" or a "title" parameter.
	//		This label is displayed either above or to the left of
	//		a widget depending on whether the "orientation" attribute
	//		is "horiz" or "vert", for horizontal and vertical respectively.
	//		The number of columns is configured using the "cols" attribute.
	//		The width of labels can be configured using the "labelWidth" parameter.
	//
	// example:
	// |	<div dojoType="dojox.layout.TableContainer" orientation="vert" cols="3>
	// |		<div dojoType="dijit.form.TextInput" value="John" label="First Name:"></div>
	// |		<div dojoType="dijit.form.CheckBox" label="Is Student?:"></div>
	// |		<div dojoType="dojox.form.DateTextBox" label="Date Of Birth:"></div>
	// |	</div>
	//

	cols: 1,
	
	// labelWidth: Number|String
	//		Defines the width of a label.  If the value is a number, it is
	//		treated as a pixel value.  The other valid value is a percentage,
	//		e.g. "50%"
	labelWidth: "100",

	// showLabels: Boolean
	//		True if labels should be displayed, false otherwise.
	showLabels: true,

	// orientation: String
	//		Either "horiz" or "vert" for label orientation.
	orientation: "horiz",
	
	// spacing: Number
	//		The cell spacing to apply to the table.
	spacing: 1,

	// customClass: String
	//		A CSS class that will be applied to child elements.  For example, if
	//		the class is "myClass", the table will have "myClass-table" applied to it,
	//		each label TD will have "myClass-labelCell" applied, and each
	//		widget TD will have "myClass-valueCell" applied.
	customClass: "",

	postCreate: function(){
		this.inherited(arguments);
		this._children = [];
		
		// If the orientation, customClass or cols attributes are changed,
		// layout the widgets again.
		this.connect(this, "set", function(name, value){
			if(value && (name == "orientation" || name == "customClass" || name == "cols")) {
				this.layout();
			}
		});
	},

	startup: function() {
		if(this._started) {
			return;
		}
		this.inherited(arguments);
		if(this._initialized) {
			return;
		}
		var children = this.getChildren();
		if(children.length < 1) {
			return;
		}
		this._initialized = true;

		domClass.add(this.domNode, "dijitTableLayout");

		// Call startup on all child widgets
		arrayUtil.forEach(children, function(child){
			if(!child.started && !child._started) {
				child.startup();
			}
		});
		this.resize();
		this.layout();
	},

	resize: function(){
		// summary:
		//		Resizes all children.  This widget itself
		//		does not resize, as it takes up 100% of the
		//		available width.
		arrayUtil.forEach(this.getChildren(), function(child){
			if(typeof child.resize == "function") {
				child.resize();
			}
		});
	},

	layout: function(){
		// summary:
		//		Lays out the child widgets.
		if(!this._initialized){
			return;
		}

		var children = this.getChildren();

		var childIds = {};
		var _this = this;

		function addCustomClass(node, type, count) {
			if(_this.customClass != "") {
				var clazz = _this.customClass+ "-" + (type || node.tagName.toLowerCase());
				domClass.add(node, clazz);

				if(arguments.length > 2) {
					domClass.add(node, clazz + "-" + count);
				}
			}
		}

		// Find any new children that have been added since the last layout() call
		arrayUtil.forEach(this._children, lang.hitch(this, function(child){
			childIds[child.id] = child;
		}));

		arrayUtil.forEach(children, lang.hitch(this, function(child, index){
			if(!childIds[child.id]) {
				// Add pre-existing children to the start of the array
				this._children.push(child);
			}
		}));

		// Create the table.  It fills the width of it's container.
		var table = domConstruct.create("table", {
			"width": "100%",
			 "class": "tableContainer-table tableContainer-table-" + this.orientation,
			 "cellspacing" : this.spacing
			},
			this.domNode);

		var tbody = domConstruct.create("tbody");
		table.appendChild(tbody);

		addCustomClass(table, "table", this.orientation);

		var width = Math.floor(100 / this.cols) + "%";

		var labelRow = domConstruct.create("tr", {}, tbody);
		var childRow = (!this.showLabels || this.orientation == "horiz")
						? labelRow : domConstruct.create("tr", {}, tbody);
		var maxCols = this.cols * (this.showLabels ? 2 : 1);
		var numCols = 0;

		// Iterate over the children, adding them to the table.
		arrayUtil.forEach(this._children, lang.hitch(this, function(child, index){
			
			var colspan = child.colspan || 1;
			
			if(colspan > 1) {
				colspan = this.showLabels ?
					Math.min(maxCols - 1, colspan * 2 -1): Math.min(maxCols, colspan);
			}

			// Create a new row if we need one
			if(numCols + colspan - 1 + (this.showLabels ? 1 : 0)>= maxCols) {
				numCols = 0;
				labelRow = domConstruct.create("tr", {}, tbody);
				childRow = this.orientation == "horiz" ? labelRow : domConstruct.create("tr", {}, tbody);
			}
			var labelCell;
			
			// If labels should be visible, add them
			if(this.showLabels) {
				labelCell = domConstruct.create("td", {"class": "tableContainer-labelCell"}, labelRow);

				// If the widget should take up both the label and value,
				// then just set the class on it.
				if(child.spanLabel) {
					domProp.set(labelCell, this.orientation == "vert" ? "rowspan" : "colspan", 2);
				}
				else {
					// Add the custom label class to the label cell
					addCustomClass(labelCell, "labelCell");
					var labelProps = {"for": child.get("id")};
					var label = domConstruct.create("label", labelProps, labelCell);

					if(Number(this.labelWidth) > -1 ||
						String(this.labelWidth).indexOf("%") > -1) {
							
						// Set the width of the label cell with either a pixel or percentage value
						domStyle.set(labelCell, "width",
							String(this.labelWidth).indexOf("%") < 0
								? this.labelWidth + "px" : this.labelWidth);
					}

					label.innerHTML = child.get("label") || child.get("title");
				}
			}
			var childCell;

			if(child.spanLabel && labelCell) {
				childCell = labelCell;
			} else {
				 childCell = domConstruct.create("td", {
				 	"class" : "tableContainer-valueCell"
				}, childRow);
			}
			if(colspan > 1) {
				domProp.set(childCell, "colspan", colspan);
			}
			
			// Add the widget cell's custom class, if one exists.
			addCustomClass(childCell, "valueCell", index);

			childCell.appendChild(child.domNode);
			numCols += colspan + (this.showLabels ? 1 : 0);
		}));

		if(this.table)	 {
			this.table.parentNode.removeChild(this.table);
		}
		// Refresh the layout of any child widgets, allowing them to resize
		// to their new parent.
		arrayUtil.forEach(children, function(child){
			if(typeof child.layout == "function") {
				child.layout();
			}
		});
		this.table = table;
		this.resize();
	},
	
	destroyDescendants: function(/*Boolean*/ preserveDom){
		// summary:
		//		Destroys all the widgets inside this.containerNode,
		//		but not this widget itself
		arrayUtil.forEach(this._children, function(child){ child.destroyRecursive(preserveDom); });
	},
	
	_setSpacingAttr: function(value) {
		// summary:
		//		Sets the spacing attribute.
		this.spacing = value;
		if(this.table) {
			this.table.cellspacing = Number(value);
		}
	}
});

TableContainer.ChildWidgetProperties = {
	// summary:
	//		Properties to be set on children of TableContainer

	// label: String
	//		The label to display for a given widget
	label: "",
	
	// title: String
	//		The label to display for a given widget.  This is interchangeable
	//		with the 'label' parameter, as some widgets already have a use
	//		for the 'label', and this can be used instead to avoid conflicts.
	title: "",
	
	// spanLabel: Boolean
	//		Setting spanLabel to true makes the widget take up both the
	//		label and value cells. Defaults to false.
	spanLabel: false,
	
	// colspan: Number
	//		The number of columns this widget should span.
	colspan: 1
};

// Add to widget base for benefit of parser.   Remove for 2.0.   Also, hide from doc viewer.
lang.extend(_WidgetBase, /*===== {} || =====*/ TableContainer.ChildWidgetProperties);

return TableContainer;
});
