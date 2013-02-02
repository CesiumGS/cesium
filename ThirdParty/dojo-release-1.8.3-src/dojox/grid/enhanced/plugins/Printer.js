define([
	"dojo/_base/declare",
	"dojo/_base/html",
	"dojo/_base/Deferred",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/_base/xhr",
	"dojo/_base/array",
	"dojo/query", 
	"dojo/DeferredList",
	"../_Plugin",
	"../../EnhancedGrid",
	"./exporter/TableWriter"
], function(declare, html, Deferred, lang, has, xhr, array, query, DeferredList, _Plugin, EnhancedGrid, TableWriter){

var Printer = declare("dojox.grid.enhanced.plugins.Printer", _Plugin, {
	// summary:
	//		Provide printGrid function to the grid.
	// example:
	//	|	dojo.require("dojox.grid.enhanced.plugins.Printer");
	//	|	dijit.byId("grid1").printGrid("my grid",					//A title for the grid,optional
	//	|								["cssfile1.css","cssfile2.css"],//An array of css files to decorate the printed gird,optional
	//	|								{table:"border='border'"}		//tagName:"attrbuteList" pairs, optional,
	//	|																//control the html tags in the generated html
	//	|	);

	/*=====
	__printArgs: {
		// title: String
		//		A title of the printed page can be specified. Optional.
		//		If given, it's shown in an <h1> tag at the top of the page.
		// cssFiles: Array|String
		//		CSS file paths. Optional.
		//		Every row and column is given CSS classes, including:
		//
		//		- grid_row_{row-number}, grid_odd_row, grid_even_row, grid_header,
		//				grid_col_{col-number}, grid_odd_col, grid_even_col
		//		- {row_number} and {col-number} are both integers starting from 1.
		//		- Row classes are for <thead> and <tbody> tags.
		//		- Column classes are for <th> and <td> tags.
		//		- Users can use these classes in the CSS files, but cannot define their own.
		// writerArgs: Object
		//		 Associative Array, arguments for TableWriter.
		// fetchArgs: object?
		//		Any arguments for store.fetch
	},
	=====*/
	
	// name: String
	//		Plugin name
	name: "printer",
	
	constructor: function(grid){
		// summary:
		//		only newed by _Plugin
		// inGrid: EnhancedGrid
		//		The grid to plug in to.
		this.grid = grid;
		this._mixinGrid(grid);
		
		//For print, we usually need the HTML instead of raw data.
		grid.setExportFormatter(function(data, cell, rowIndex, rowItem){
			return cell.format(rowIndex, rowItem);
		});
	},
	_mixinGrid: function(){
		var g = this.grid;
		g.printGrid = lang.hitch(this, this.printGrid);
		g.printSelected = lang.hitch(this, this.printSelected);
		g.exportToHTML = lang.hitch(this, this.exportToHTML);
		g.exportSelectedToHTML = lang.hitch(this, this.exportSelectedToHTML);
		g.normalizePrintedGrid = lang.hitch(this, this.normalizeRowHeight);
	},
	printGrid: function(args){
		// summary:
		//		Print all the data in the grid, using title as a title,
		//		decorating generated html by cssFiles,
		//		using tagName:"attrbuteList" pairs(writerArgs) to control html tags
		//		in the generated html string.
		// tags:
		//		public
		// args: __printArgs?
		//		Arguments for print.
		this.exportToHTML(args, lang.hitch(this, this._print));
	},
	printSelected: function(args){
		// summary:
		//		Print selected data. All other features are the same as printGrid.
		//		For meaning of arguments see function *printGrid*
		// tags:
		//		public
		// args: __printArgs?
		//		Arguments for print.
		this.exportSelectedToHTML(args, lang.hitch(this, this._print));
	},
	exportToHTML: function(args, onExported){
		// summary:
		//		Export to HTML string, but do NOT print.
		//		Users can use this to implement print preview.
		//		For meaning of the 1st-3rd arguments see function *printGrid*.
		// tags:
		//		public
		// args: __printArgs?
		//		Arguments for print.
		// onExported: function(string)
		//		call back function
		args = this._formalizeArgs(args);
		var _this = this;
		this.grid.exportGrid("table", args, function(str){
			_this._wrapHTML(args.title, args.cssFiles, args.titleInBody + str).then(onExported);
		});
	},
	exportSelectedToHTML: function(args, onExported){
		// summary:
		//		Export selected rows to HTML string, but do NOT print.
		//		Users can use this to implement print preview.
		//		For meaning of arguments see function *printGrid*
		// tags:
		//		public
		// args: __printArgs?
		//		Arguments for print.
		args = this._formalizeArgs(args);
		var _this = this;
		this.grid.exportSelected("table", args.writerArgs, function(str){
			_this._wrapHTML(args.title, args.cssFiles, args.titleInBody + str).then(onExported);
		});
	},

	_loadCSSFiles: function(cssFiles){
		var dl = array.map(cssFiles, function(cssFile){
			cssFile = lang.trim(cssFile);
			if(cssFile.substring(cssFile.length - 4).toLowerCase() === '.css'){
				return xhr.get({
					url: cssFile
				});
			}else{
				var d = new Deferred();
				d.callback(cssFile);
				return d;
			}
		});
		return DeferredList.prototype.gatherResults(dl);
	},
	_print: function(/* string */htmlStr){
		// summary:
		//		Do the print job.
		// tags:
		//		private
		// htmlStr: String
		//		The html content string to be printed.
		// returns:
		//		undefined
		var win, _this = this,
			fillDoc = function(w){
				var doc = w.document;
				doc.open();
				doc.write(htmlStr);
				doc.close();
				_this.normalizeRowHeight(doc);
			};
		if(!window.print){
			//We don't have a print facility.
			return;
		}else if(has('chrome') || has('opera')){
			//referred from dijit._editor.plugins.Print._print()
			//In opera and chrome the iframe.contentWindow.print
			//will also print the outside window. So we must create a
			//stand-alone new window.
			win = window.open("javascript: ''", "",
				"status=0,menubar=0,location=0,toolbar=0,width=1,height=1,resizable=0,scrollbars=0");
			fillDoc(win);
			win.print();
			//Opera will stop at this point, showing the popping-out window.
			//If the user closes the window, the following codes will not execute.
			//If the user returns focus to the main window, the print function
			// is executed, but still a no-op.
			win.close();
		}else{
			//Put private things in deeper namespace to avoid poluting grid namespace.
			var fn = this._printFrame,
				dn = this.grid.domNode;
			if(!fn){
				var frameId = dn.id + "_print_frame";
				if(!(fn = html.byId(frameId))){
					//create an iframe to store the grid data.
					fn = html.create("iframe");
					fn.id = frameId;
					fn.frameBorder = 0;
					html.style(fn, {
						width: "1px",
						height: "1px",
						position: "absolute",
						right: 0,
						bottom: 0,
						border: "none",
						overflow: "hidden"
					});
					if(!has('ie')){
						html.style(fn, "visibility", "hidden");
					}
					dn.appendChild(fn);
				}
				//Reuse this iframe
				this._printFrame = fn;
			}
			win = fn.contentWindow;
			fillDoc(win);
			//IE requires the frame to be focused for print to work, and it's harmless for FF.
			win.focus();
			win.print();
		}
	},
	_wrapHTML: function(/* string */title, /* Array */cssFiles, /* string */body_content){
		// summary:
		//		Put title, cssFiles, and body_content together into an HTML string.
		// tags:
		//		private
		// title: String
		//		A title for the html page.
		// cssFiles: Array
		//		css file pathes.
		// body_content: String
		//		Content to print, not including <head></head> part and <html> tags
		// returns:
		//		the wrapped HTML string ready for print
		return this._loadCSSFiles(cssFiles).then(function(cssStrs){
			var i, sb = ['<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">',
					'<html ', html._isBodyLtr() ? '' : 'dir="rtl"', '><head><title>', title,
					'</title><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></meta>'];
			for(i = 0; i < cssStrs.length; ++i){
				sb.push('<style type="text/css">', cssStrs[i], '</style>');
			}
			sb.push('</head>');
			if(body_content.search(/^\s*<body/i) < 0){
				body_content = '<body>' + body_content + '</body>';
			}
			sb.push(body_content, '</html>');
			return sb.join('');
		});
	},
	normalizeRowHeight: function(doc){
		var views = query(".grid_view", doc.body);
		var headPerView = array.map(views, function(view){
			return query(".grid_header", view)[0];
		});
		var rowsPerView = array.map(views, function(view){
			return query(".grid_row", view);
		});
		var rowCount = rowsPerView[0].length;
		var i, v, h, maxHeight = 0;
		for(v = views.length - 1; v >= 0; --v){
			h = html.contentBox(headPerView[v]).h;
			if(h > maxHeight){
				maxHeight = h;
			}
		}
		for(v = views.length - 1; v >= 0; --v){
			html.style(headPerView[v], "height", maxHeight + "px");
		}
		for(i = 0; i < rowCount; ++i){
			maxHeight = 0;
			for(v = views.length - 1; v >= 0; --v){
				h = html.contentBox(rowsPerView[v][i]).h;
				if(h > maxHeight){
					maxHeight = h;
				}
			}
			for(v = views.length - 1; v >= 0; --v){
				html.style(rowsPerView[v][i], "height", maxHeight + "px");
			}
		}
		var left = 0, ltr = html._isBodyLtr();
		for(v = 0; v < views.length; ++v){
			html.style(views[v], ltr ? "left" : "right", left + "px");
			left += html.marginBox(views[v]).w;
		}
	},
	_formalizeArgs: function(args){
		args = (args && lang.isObject(args)) ? args : {};
		args.title = String(args.title) || "";
		if(!lang.isArray(args.cssFiles)){
			args.cssFiles = [args.cssFiles];
		}
		args.titleInBody = args.title ? ['<h1>', args.title, '</h1>'].join('') : '';
		return args;	//Object
	}
});

EnhancedGrid.registerPlugin(Printer/*name:'printer'*/, {
	"dependency": ["exporter"]
});

return Printer;
});
