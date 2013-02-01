define(["dojo","dijit/popup","../../library/greek","dijit/focus","dijit/_Widget","dijit/_TemplatedMixin",
"dijit/_PaletteMixin","dojo/i18n!dojox/editor/plugins/nls/latinEntities"],
function(dojo, popup, greek, focus, Widget, TemplatedMixin, PaletteMixin, latinEntities){

//dojo.requireLocalization("dojox.editor.plugins", "latinEntities");

var Greeks = dojo.declare(null,
{
	// summary:
	//		Represents a character.
	//		Initialized using an alias for the character (like cent) rather
	//		than with the character itself.

	constructor: function(/*String*/ alias){
		// summary:
		//	 Construct JS object representing an entity (associated w/a cell
		//		in the palette)
		// value: String
		//		alias name: 'cent', 'pound' ..
		this._alias = alias;
	},

	getValue: function(){
		// summary:
		//		Returns HTML representing the character, like &amp;

		return this._alias;
	},

	fillCell: function(/*DOMNode*/ cell){
		// Deal with entities that have keys which are reserved words.
		cell.innerHTML = "&"+this._alias+";";
	}
});

return dojo.declare("dojox.drawing.plugins.drawing.GreekPalette",
  [Widget, TemplatedMixin, PaletteMixin],
	{
	// summary:
	//		This plugin uses the palette dijit in order to give tips for
	//		non-english (mostly greek for now) letters.
	//
	//		IMPORTANT!  Because it is a full blown dijit it is NOT loaded
	//		like the other plugins.  INSTEAD currently it is instantiated
	//		in markup.  TextBlock LOOKS FOR IT by ID - "greekPalette"
	//		and if it finds it does the necessary initialization/connections.
	// description:
	//		Grid showing all available entity options which the
	//		user can pick from.  The library loaded for use by the picker
	//		is found in dojox.drawing.library.greek.  Adding characters
	//		there will automatically add them to the palette.
	//
	//		This works as a popup and as such its onChange and onCancel
	//		close it.  TextBlock manages it, since it's what uses the assist
	//		so it calls show (all actual popup management happens here).
	//		In order to activate the plugin require it and then include the
	//		markup in the example:
	// example:
	// |	<!--Because this is a widget it is included in markup and NOT like the other plugins-->
	// |	<div dojoType="dojox.drawing.plugins.drawing.GreekPalette" id="greekPalette"></div>
	
	postMixInProperties: function(){
		// Convert hash of entities into two-dimensional rows/columns table (array of arrays)
		var choices = greek;//dojox.drawing.library.greek;
		var numChoices = 0;
		var entityKey;
		for(entityKey in choices){numChoices++;}
		var choicesPerRow = Math.floor(Math.sqrt(numChoices));
		var numRows = choicesPerRow;
		var currChoiceIdx = 0;
		var rows = [];
		var row = [];
		for(entityKey in choices){
			currChoiceIdx++;
			row.push(entityKey);
			if(currChoiceIdx % numRows === 0){
				rows.push(row);
				row = [];
			}
		}
		if(row.length > 0){
			rows.push(row);
		}
		this._palette = rows;
	},
	
	show: function(obj){
		dojo.mixin(obj, {popup: this});
		popup.open(obj);
	},
	
	onChange: function(val){
		var textBlock = this._textBlock;
		popup.hide(this);
		textBlock.insertText(this._pushChangeTo,val);
		textBlock._dropMode = false;
	},
	
	onCancel: function(/*Boolean*/ closeAll){
		// summary:
		//		attach point for notification about when the user cancels the current menu
		popup.hide(this);
		this._textBlock._dropMode = false;
	},

	// templateString: String
	//		The template of this widget.  Using dojoxEntityPalette classes
	//		in order to allow easy transfer of css
	templateString: '<div class="dojoxEntityPalette">\n' +
			'	<table>\n' +
			'		<tbody>\n' +
			'			<tr>\n' +
			'				<td>\n' +
			'					<table class="dijitPaletteTable">\n' +
			'						<tbody dojoAttachPoint="gridNode"></tbody>\n' +
			'				   </table>\n' +
			'				</td>\n' +
			'			</tr>\n' +
			'			<tr>\n' +
			'				<td>\n'+
			'					<table dojoAttachPoint="previewPane" class="dojoxEntityPalettePreviewTable">\n' +
			'						<tbody>\n' +
			'							<tr>\n' +
			'								<td class="dojoxEntityPalettePreviewDetailEntity">Type: <span class="dojoxEntityPalettePreviewDetail" dojoAttachPoint="previewNode"></span></td>\n' +
			'							</tr>\n' +
			'						</tbody>\n' +
			'					</table>\n' +
			'				</td>\n' +
			'			</tr>\n' +
			'		</tbody>\n' +
			'	</table>\n' +
			'</div>',


	baseClass: "dojoxEntityPalette",
        
        // showPreview: [public] Boolean
	//	  Whether the preview pane will be displayed, to show details about the selected entity.
	showPreview: true,

	dyeClass: Greeks, //'dojox.drawing.plugins.Greeks',

	// domNodeClass [protected] String
	paletteClass: 'editorLatinEntityPalette',

	cellClass: "dojoxEntityPaletteCell",

	buildRendering: function(){
		this.inherited(arguments);

		var i18n = latinEntities;//dojo.i18n.getLocalization("dojox.editor.plugins", "latinEntities");

		this._preparePalette(
			this._palette,
			i18n
		);
		
		var cells = dojo.query(".dojoxEntityPaletteCell", this.gridNode);
		dojo.forEach(cells, function(cellNode){
			this.connect(cellNode, "onmouseenter", "_onCellMouseEnter");
		}, this);
	},
	
        _onCellMouseEnter: function(e){
		// summary:
		//		Simple function to handle updating the display at the bottom of
		//		the palette.
		// e:
		//		The event.
		// tags:
		//		private
		if(this.showPreview){
			this._displayDetails(e.target);
		}
	},
	
	_onCellClick: function(/*Event*/ evt){
		// summary:
		//		Handler for click, enter key & space key. Selects the cell.
		// evt:
		//		The event.
		// tags:
		//		private
		var target = evt.type == "click" ? evt.currentTarget : this._currentFocus,
			value = this._getDye(target).getValue();

		// First focus the clicked cell, and then send onChange() notification.
		// onChange() (via _setValueAttr) must be after the focus call, because
		// it may trigger a refocus to somewhere else (like the Editor content area), and that
		// second focus should win.
		// Use setTimeout because IE doesn't like changing focus inside of an event handler.
		this._setCurrent(target);
		setTimeout(dojo.hitch(this, function(){
			focus(target);
			this._setValueAttr(value, true);
		}));

		// workaround bug where hover class is not removed on popup because the popup is
		// closed and then there's no onblur event on the cell
		dojo.removeClass(target, "dijitPaletteCellHover");

		dojo.stopEvent(evt);
	},

	postCreate: function(){
		this.inherited(arguments);

		if(!this.showPreview){
			dojo.style(this.previewNode,"display","none");
		}
		popup.moveOffScreen(this);
	},

	_setCurrent: function(/*DOMNode*/ node){
		// summary:
		//		Sets which node is the focused cell.
		// description:
   		//		At any point in time there's exactly one
		//		cell with tabIndex != -1.   If focus is inside the palette then
		//		focus is on that cell.
		//
		//		After calling this method, arrow key handlers and mouse click handlers
		//		should focus the cell in a setTimeout().
		// tags:
		//		protected
		if("_currentFocus" in this){
			// Remove tabIndex on old cell
			dojo.attr(this._currentFocus, "tabIndex", "-1");
			dojo.removeClass(this._currentFocus,"dojoxEntityPaletteCellHover");
		}

		// Set tabIndex of new cell
		this._currentFocus = node;
		if(node){
			dojo.attr(node, "tabIndex", this.tabIndex);
			dojo.addClass(this._currentFocus,"dojoxEntityPaletteCellHover");
		}
		if(this.showPreview){
			this._displayDetails(node);
		}
	},

	_displayDetails: function(/*DOMNode*/ cell){
		// summary:
		//	  Display the details of the currently focused entity in the preview pane
		var dye = this._getDye(cell);
		if(dye){
			var ehtml = dye.getValue();
			var ename = dye._alias;
                        //console.warn("Greek help: ",dye._alias);
			this.previewNode.innerHTML=ehtml;
		}else{
			this.previewNode.innerHTML="";
			this.descNode.innerHTML="";
		}
	},
	
	_preparePalette: function(choices, titles) {
		// summary:
		//		Subclass must call _preparePalette() from postCreate(), passing in the tooltip
		//		for each cell
		// choices: String[][]
		//		id's for each cell of the palette, used to create Dye JS object for each cell
		// titles: String[]
		//		Localized tooltip for each cell

		this._cells = [];
		var url = this._blankGif;
		
		var dyeClassObj = typeof this.dyeClass === 'string' ? dojo.getObject(this.dyeClass) : this.dyeClass;

		for(var row=0; row < choices.length; row++){
			var rowNode = dojo.create("tr", {tabIndex: "-1"}, this.gridNode);
			for(var col=0; col < choices[row].length; col++){
				var value = choices[row][col];
				if(value){
					var cellObject = new dyeClassObj(value);
					
					var cellNode = dojo.create("td", {
						"class": this.cellClass,
						tabIndex: "-1",
						title: titles[value]
					});

					// prepare cell inner structure
					cellObject.fillCell(cellNode, url);

					this.connect(cellNode, "ondijitclick", "_onCellClick");
					this._trackMouseState(cellNode, this.cellClass);

					dojo.place(cellNode, rowNode);

					cellNode.idx = this._cells.length;

					// save cell info into _cells
					this._cells.push({node:cellNode, dye:cellObject});
				}
			}
		}
		this._xDim = choices[0].length;
		this._yDim = choices.length;
		
	},
	
	_navigateByArrow: function(evt){
		// summary:
		// 	  	This is a departure from the dijit, the textBlock needs
		//		navigation without losing focus, this allows that
		// increment:
		//		How much the key is navigated.
		// tags:
		//		private
		var keyIncrementMap = {
			38: -this._xDim,
			// The down key the index is increase by the x dimension.
			40: this._xDim,
			// Right and left move the index by 1.
			39: this.isLeftToRight() ? 1 : -1,
			37: this.isLeftToRight() ? -1 : 1
		};
		
		var increment = keyIncrementMap[evt.keyCode];
		var newFocusIndex = this._currentFocus.idx + increment;
		if(newFocusIndex < this._cells.length && newFocusIndex > -1){
			var focusNode = this._cells[newFocusIndex].node;
			this._setCurrent(focusNode);
		}
	}
});

});
