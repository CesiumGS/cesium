define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/fx",
	"dojo/_base/sniff",
	"dojo/dom",
	"dojo/dom-style",
	"dojo/dom-construct",
	"dijit/_Widget",
	"dijit/_Templated",
	"dijit/_Container",
	"dijit/Editor",
	"dijit/form/TextBox",
	"dijit/form/SimpleTextarea",
	"./FeedEntryViewer",
	"../io/model",
	"dojo/text!./templates/FeedEntryEditor.html",
	"dojo/text!./templates/PeopleEditor.html",
	"dojo/i18n!./nls/FeedEntryViewer",
	"dojo/i18n!./nls/FeedEntryEditor",
	"dojo/i18n!./nls/PeopleEditor"
], function (dojo, lang, connect, declare, fx, has, domUtil, domStyle, domConstruct,
			 _Widget, _Templated, _Container, Editor, TextBox, SimpleTextarea,
			 FeedEntryViewer, model, template, peopleEditorTemplate, i18nViewer, i18nEditor, i18nPeople) {
dojo.experimental("dojox.atom.widget.FeedEntryEditor");


var FeedEntryEditor = declare("dojox.atom.widget.FeedEntryEditor", FeedEntryViewer,{
	// summary:
	//		An ATOM feed entry editor that allows viewing of the individual attributes of an entry.

	_contentEditor: null,
	_oldContent: null,
	_setObject: null,
	enableEdit: false,
	_contentEditorCreator: null,
	_editors: {},
	entryNewButton: null,
	_editable: false,		//Flag denoting if the current entry is editable or not.

	//Templates for the HTML rendering.  Need to figure these out better, admittedly.
	templateString: template,

	postCreate: function(){
		if(this.entrySelectionTopic !== ""){
			this._subscriptions = [dojo.subscribe(this.entrySelectionTopic, this, "_handleEvent")];
		}
		var _nlsResources = i18nViewer;
		this.displayOptions.innerHTML = _nlsResources.displayOptions;
		this.feedEntryCheckBoxLabelTitle.innerHTML = _nlsResources.title;
		this.feedEntryCheckBoxLabelAuthors.innerHTML = _nlsResources.authors;
		this.feedEntryCheckBoxLabelContributors.innerHTML = _nlsResources.contributors;
		this.feedEntryCheckBoxLabelId.innerHTML = _nlsResources.id;
		this.close.innerHTML = _nlsResources.close;
		this.feedEntryCheckBoxLabelUpdated.innerHTML = _nlsResources.updated;
		this.feedEntryCheckBoxLabelSummary.innerHTML = _nlsResources.summary;
		this.feedEntryCheckBoxLabelContent.innerHTML = _nlsResources.content;

		_nlsResources = i18nEditor;
		this.doNew.innerHTML = _nlsResources.doNew;
		this.edit.innerHTML = _nlsResources.edit;
		this.save.innerHTML = _nlsResources.save;
		this.cancel.innerHTML = _nlsResources.cancel;
	},
	
	setEntry: function(/*object*/entry, /*object*/feed, /*boolean*/leaveMenuState){
		// summary:
		//		Function to set the current entry that is being edited.
		// entry:
		//		Instance of dojox.atom.io.model.Entry to display for reading/editing.
		if(this._entry !== entry){
			//If we swap entries, we don't want to keep the menu states and modes.
			this._editMode=false;
			leaveMenuState=false;
		}else{
			leaveMenuState = true;
		}
		FeedEntryEditor.superclass.setEntry.call(this, entry, feed);
		this._editable = this._isEditable(entry);
		if(!leaveMenuState && !this._editable){
			domStyle.set(this.entryEditButton, 'display', 'none');
			domStyle.set(this.entrySaveCancelButtons, 'display', 'none');
		}
		if(this._editable && this.enableEdit){
			if(!leaveMenuState){
				domStyle.set(this.entryEditButton, 'display', '');
				//TODO double check this &&...
				if(this.enableMenuFade && this.entrySaveCancelButton){
					fx.fadeOut({node: this.entrySaveCancelButton,duration: 250}).play();
				}
			}
		}
	},

	_toggleEdit: function(){
		// summary:
		//		Internal function for toggling/enabling the display of edit mode
		// returns:
		//		Nothing.
		if(this._editable && this.enableEdit){
			domStyle.set(this.entryEditButton, 'display', 'none');
			domStyle.set(this.entrySaveCancelButtons, 'display', '');
			this._editMode = true;

			//Rebuild the view using the same entry and feed.
			this.setEntry(this._entry, this._feed, true);
		}
	},

	_handleEvent: function(/*object*/entrySelectionEvent){
		// summary:
		//		Internal function for listening to a topic that will handle entry notification.
		// entrySelectionEvent:
		//		The topic message containing the entry that was selected for view.
		// returns:
		//		Nothing.
		if(entrySelectionEvent.source != this && entrySelectionEvent.action == "delete" &&
			entrySelectionEvent.entry && entrySelectionEvent.entry == this._entry){
				domStyle.set(this.entryEditButton, 'display', 'none');
		}
		FeedEntryEditor.superclass._handleEvent.call(this, entrySelectionEvent);
	},

	_isEditable: function(/*object*/entry){
		// summary:
		//		Internal function for determining of a particular entry is editable.
		// description:
		//		Internal function for determining of a particular entry is editable.
		//		This is used for determining if the delete action should be displayed or not.
		// entry:
		//		The dojox.atom.io.model.Entry object to examine
		// returns:
		//		Boolean denoting if the entry seems editable or not..
		var retVal = false;
		if(entry && entry !== null && entry.links && entry.links !== null){
			for(var x in entry.links){
				if(entry.links[x].rel && entry.links[x].rel == "edit"){
					retVal = true;
					break;
				}
			}
		}
		return retVal;
	},
	
	// The following set<Attribute> functions override the corresponding functions in FeedEntryViewer.  These handle
	// the editMode flag by inserting appropriate editor widgets inside of just splashing the content in the page.
	setTitle: function(/*DOM node*/titleAnchorNode, /*boolean*/editMode, /*object*/entry){
		// summary:
		//		Function to set the contents of the title node in the template to some value from the entry.
		// description:
		//		Function to set the contents of the title node in the template to some value from the entry.
		//		This exists specifically so users can over-ride how the title data is filled out from an entry.
		// titleAnchorNode:
		//		The DOM node to attach the title data to.
		// editMode:
		//		Boolean to indicate if the display should be in edit mode or not.
		// entry:
		//		The Feed Entry to work with.

		if(!editMode){
			FeedEntryEditor.superclass.setTitle.call(this, titleAnchorNode, editMode, entry);
			if(entry.title && entry.title.value && entry.title.value !== null){
				this.setFieldValidity("title", true);
			}
		}else{
			if(entry.title && entry.title.value && entry.title.value !== null){
				if(!this._toLoad){
					this._toLoad = [];
				}
				this.entryTitleSelect.value = entry.title.type;
				
				var editor = this._createEditor(titleAnchorNode, entry.title, true, entry.title.type === "html" || entry.title.type === "xhtml");
				editor.name = "title";
				this._toLoad.push(editor);
				this.setFieldValidity("titleedit",true);
				this.setFieldValidity("title",true);
			}
		}
	},

	setAuthors: function(/*DOM node*/authorsAnchorNode, /*boolean*/editMode, /*object*/entry){
		// summary:
		//		Function to set the contents of the author node in the template to some value from the entry.
		// description:
		//		Function to set the contents of the author node in the template to some value from the entry.
		//		This exists specifically so users can over-ride how the title data is filled out from an entry.
		// authorsAnchorNode:
		//		The DOM node to attach the author data to.
		// editMode:
		//		Boolean to indicate if the display should be in edit mode or not.
		// entry:
		//		The Feed Entry to work with.
		if(!editMode){
			FeedEntryEditor.superclass.setAuthors.call(this, authorsAnchorNode, editMode, entry);
			if(entry.authors && entry.authors.length > 0){
				this.setFieldValidity("authors", true);
			}
		}else{
			if(entry.authors && entry.authors.length > 0){
				this._editors.authors = this._createPeopleEditor(this.entryAuthorNode, {data: entry.authors, name: "Author"});
				this.setFieldValidity("authors", true);
			}
		}
	},


	setContributors: function(/*DOM node*/contributorsAnchorNode, /*boolean*/editMode, /*object*/entry){
		// summary:
		//		Function to set the contents of the contributor node in the template to some value from the entry.
		// description:
		//		Function to set the contents of the contributor node in the template to some value from the entry.
		//		This exists specifically so users can over-ride how the title data is filled out from an entry.
		// contributorsAnchorNode:
		//		The DOM node to attach the contributor data to.
		// editMode:
		//		Boolean to indicate if the display should be in edit mode or not.
		// entry:
		//		The Feed Entry to work with.
		if(!editMode){
			FeedEntryEditor.superclass.setContributors.call(this, contributorsAnchorNode, editMode, entry);
			if(entry.contributors && entry.contributors.length > 0){
				this.setFieldValidity("contributors", true);
			}
		}else{
			if(entry.contributors && entry.contributors.length > 0){
				this._editors.contributors = this._createPeopleEditor(this.entryContributorNode, {data: entry.contributors, name: "Contributor"});
				this.setFieldValidity("contributors", true);
			}
		}
	},


	setId: function(/*DOM node*/idAnchorNode, /*boolean*/editMode, /*object*/entry){
		// summary:
		//		Function to set the contents of the ID  node in the template to some value from the entry.
		// description:
		//		Function to set the contents of the ID node in the template to some value from the entry.
		//		This exists specifically so users can over-ride how the title data is filled out from an entry.
		// idAnchorNode:
		//		The DOM node to attach the ID data to.
		// editMode:
		//		Boolean to indicate if the display should be in edit mode or not.
		// entry:
		//		The Feed Entry to work with.
		if(!editMode){
			FeedEntryEditor.superclass.setId.call(this, idAnchorNode, editMode, entry);
			if(entry.id && entry.id !== null){
				this.setFieldValidity("id", true);
			}
		}else{
			if(entry.id && entry.id !== null){
				this._editors.id = this._createEditor(idAnchorNode, entry.id);
				this.setFieldValidity("id",true);
			}
		}
	},

	setUpdated: function(/*DOM node*/updatedAnchorNode, /*boolean*/editMode, /*object*/entry){
		// summary:
		//		Function to set the contents of the updated  node in the template to some value from the entry.
		// description:
		//		Function to set the contents of the updated node in the template to some value from the entry.
		//		This exists specifically so users can over-ride how the title data is filled out from an entry.
		// updatedAnchorNode:
		//		The DOM node to attach the updated data to.
		// editMode:
		//		Boolean to indicate if the display should be in edit mode or not.
		// entry:
		//		The Feed Entry to work with.
		if(!editMode){
			FeedEntryEditor.superclass.setUpdated.call(this, updatedAnchorNode, editMode, entry);
			if(entry.updated && entry.updated !== null){
				this.setFieldValidity("updated", true);
			}
		}else{
			if(entry.updated && entry.updated !== null){
				this._editors.updated = this._createEditor(updatedAnchorNode, entry.updated);
				this.setFieldValidity("updated",true);
			}
		}
	},


	setSummary: function(/*DOM node*/summaryAnchorNode, /*boolean*/editMode, /*object*/entry){
		// summary:
		//		Function to set the contents of the summary  node in the template to some value from the entry.
		// description:
		//		Function to set the contents of the summary node in the template to some value from the entry.
		//		This exists specifically so users can over-ride how the title data is filled out from an entry.
		// summaryAnchorNode:
		//		The DOM node to attach the summary data to.
		// editMode:
		//		Boolean to indicate if the display should be in edit mode or not.
		// entry:
		//		The Feed Entry to work with.
		if(!editMode){
			FeedEntryEditor.superclass.setSummary.call(this, summaryAnchorNode, editMode, entry);
			if(entry.summary && entry.summary.value && entry.summary.value !== null){
				this.setFieldValidity("summary", true);
			}
		}else{
			if(entry.summary && entry.summary.value && entry.summary.value !== null){
				if(!this._toLoad){
					this._toLoad = [];
				}
				this.entrySummarySelect.value = entry.summary.type;
				
				var editor = this._createEditor(summaryAnchorNode, entry.summary, true, entry.summary.type === "html" || entry.summary.type === "xhtml");
				editor.name = "summary";
				this._toLoad.push(editor);
				this.setFieldValidity("summaryedit",true);
				this.setFieldValidity("summary",true);
			}
		}
	},

	setContent: function(/*DOM node*/contentAnchorNode, /*boolean*/editMode, /*object*/entry){
		// summary:
		//		Function to set the contents of the content node in the template to some value from the entry.
		// description:
		//		Function to set the contents of the content node in the template to some value from the entry.
		//		This exists specifically so users can over-ride how the title data is filled out from an entry.
		// summaryAnchorNode:
		//		The DOM node to attach the content data to.
		// editMode:
		//		Boolean to indicate if the display should be in edit mode or not.
		// entry:
		//		The Feed Entry to work with.
		if(!editMode){
			FeedEntryEditor.superclass.setContent.call(this, contentAnchorNode, editMode, entry);
			if(entry.content && entry.content.value && entry.content.value !== null){
				this.setFieldValidity("content",true);
			}
		}else{
			if(entry.content && entry.content.value && entry.content.value !== null){
				if(!this._toLoad){
					this._toLoad = [];
				}
				this.entryContentSelect.value = entry.content.type;
				var editor = this._createEditor(contentAnchorNode, entry.content, true, entry.content.type === "html" || entry.content.type === "xhtml");
				editor.name = "content";
				this._toLoad.push(editor);
				this.setFieldValidity("contentedit",true);
				this.setFieldValidity("content",true);
			}
		}
	},
	
	_createEditor: function(/*DOM node*/anchorNode, /*DOM node*/node, /*boolean*/multiline, /*object*/rte){
		// summary:
		//		Function to create an appropriate text editor widget based on the given parameters.
		// anchorNode:
		//		The DOM node to attach the editor widget to.
		// node:
		//		An object containing the value to be put into the editor.  This ranges from an anonymous object
		//		with a value parameter to a dojox.atom.io.model.Content object.
		// multiline:
		//		A boolean indicating whether the content should be multiline (such as a textarea) instead of a
		//		single line (such as a textbox).
		// rte:
		//		A boolean indicating whether the content should be a rich text editor widget.
		// returns:
		//		Either a widget (for textarea or textbox widgets) or an anonymous object to be used to create a
		//		rich text area widget.
		var viewNode;
		var box;
		if(!node){
			if(rte){
				// Returns an anonymous object which would then be loaded later, after the containing element
				// exists on the page.
				return {anchorNode: anchorNode,
						entryValue: "",
						editor: null,
						generateEditor: function(){
							// The only way I found I could get the editor to behave consistently was to
							// create the content on a span, and allow the content editor to replace it.
							// This gets around the dynamic/delayed way in which content editors get created.
							var node = document.createElement("div");
							node.innerHTML = this.entryValue;
							this.anchorNode.appendChild(node);
							var _editor = new Editor({}, node);
							this.editor = _editor;
							return _editor;
						}
				};
			}
			if(multiline){
				// If multiline, create a textarea
				viewNode = document.createElement("textarea");
				anchorNode.appendChild(viewNode);
				domStyle.set(viewNode, 'width', '90%');
				box = new SimpleTextarea({},viewNode);
			}else{
				// If single line, create a textbox.
				viewNode = document.createElement("input");
				anchorNode.appendChild(viewNode);
				domStyle.set(viewNode, 'width', '95%');
				box = new TextBox({},viewNode);
			}
			box.attr('value', '');
			return box;
		}

		// Check through the node parameter to get the value to be used.
		var value;
		if(node.value !== undefined){
			value = node.value;
		}else if(node.attr){
			value = node.attr('value');
		}else{
			value = node;
		}
		if(rte){
			// Returns an anonymous object which would then be loaded later, after the containing element
			// exists on the page.
			if(value.indexOf("<") != -1){
				value = value.replace(/</g, "&lt;");
			}
			return {anchorNode: anchorNode,
					entryValue: value,
					editor: null,
					generateEditor: function(){
						// The only way I found I could get the editor to behave consistently was to
						// create the content on a span, and allow the content editor to replace it.
						// This gets around the dynamic/delayed way in which content editors get created.
						var node = document.createElement("div");
						node.innerHTML = this.entryValue;
						this.anchorNode.appendChild(node);
						var _editor = new Editor({}, node);
						this.editor = _editor;
						return _editor;
					}
			};
		}
		if(multiline){
			// If multiline, create a textarea
			viewNode = document.createElement("textarea");
			anchorNode.appendChild(viewNode);
			domStyle.set(viewNode, 'width', '90%');
			box = new SimpleTextarea({},viewNode);
		}else{
			// If single line, create a textbox.
			viewNode = document.createElement("input");
			anchorNode.appendChild(viewNode);
			domStyle.set(viewNode, 'width', '95%');
			box = new TextBox({},viewNode);
		}
		box.attr('value', value);
		return box;
	},
	
	_switchEditor: function(/*object*/event){
		// summary:
		//		Function to switch between editor types.
		// description:
		//		Function to switch between a rich text editor and a textarea widget.  Used for title, summary,
		//		And content when switching between text and html/xhtml content.
		// event:
		//		The event generated by the change in the select box on the page.
		var type = null;
		var target = null;
		var parent = null;
		
		// Determine the source/target of this event (to determine which editor we're switching)
		if(has("ie")){
			target = event.srcElement;
		}else{
			target = event.target;
		}
			
		// Determine which editor (title, summary, or content)
		if(target === this.entryTitleSelect){
			parent = this.entryTitleNode;
			type = "title";
		} else if(target === this.entrySummarySelect){
			parent = this.entrySummaryNode;
			type = "summary";
		}else{
			parent = this.entryContentNode;
			type = "content";
		}

		// Grab the existing editor.
		var editor = this._editors[type];
		var newEditor;
		var value;
		
		if(target.value === "text"){
			if(editor.isInstanceOf(Editor)){
				// If we're changing the type to text and our existing editor is a rich text editor, we need to destroy
				// it and switch to a multiline editor.
				value = editor.attr('value', false);
				editor.close(false,true);
				editor.destroy();
				while(parent.firstChild){
					domConstruct.destroy(parent.firstChild);
				}
				newEditor = this._createEditor(parent, {value: value}, true, false);
				this._editors[type] = newEditor;
			}
		}else{
			if(!editor.isInstanceOf(Editor)){
				// Otherwise, we're switching to a html or xhtml type, but we currently have a textarea widget.  We need
				// to destroy the existing RTE and create a multiline textarea widget.
				value = editor.attr('value');
				editor.destroy();
				while(parent.firstChild){
					domConstruct.destroy(parent.firstChild);
				}
				newEditor = this._createEditor(parent, {value: value}, true, true);
				newEditor = lang.hitch(newEditor, newEditor.generateEditor)();
				this._editors[type] = newEditor;
			}
		}
	},
	
	_createPeopleEditor: function(/*DOM node*/anchorNode, /*DOM node*/node){
		// summary:
		//		Creates a People Editor widget, sets its value, and returns it.
		// anchorNode:
		//		The node to attach the editor to.
		// node:
		//		An object containing the value to be put into the editor. Typically, this is an
		//		dojox.atom.io.model.Person object.
		// returns:
		//		A new People Editor object.
		var viewNode = document.createElement("div");
		anchorNode.appendChild(viewNode);
		return new PeopleEditor(node,viewNode);
	},

	saveEdits: function(){
		// summary:
		//		Saves edits submitted when the 'save' button is pressed.
		// description:
		//		Saves edits submitted when the 'save' button is pressed.  Distinguishes between new and existing
		//		entries and saves appropriately.  Fetches the values of the editors, and, if existing, compares them to
		//		the existing values and submits the updates, otherwise creates a new entry and posts it as a new entry.
		// returns:
		//		Nothing.
		domStyle.set(this.entrySaveCancelButtons, 'display', 'none');
		domStyle.set(this.entryEditButton, 'display', '');
		domStyle.set(this.entryNewButton, 'display', '');
		var modifiedEntry = false;
		var value;
		var i;
		var changed;
		var entry;
		var authors;
		var contributors;
		if(!this._new){
			entry = this.getEntry();
			if(this._editors.title && (this._editors.title.attr('value') != entry.title.value || this.entryTitleSelect.value != entry.title.type)){
				value = this._editors.title.attr('value');
				if(this.entryTitleSelect.value === "xhtml"){
					value = this._enforceXhtml(value);
					if(value.indexOf('<div xmlns="http://www.w3.org/1999/xhtml">') !== 0){
						value = '<div xmlns="http://www.w3.org/1999/xhtml">' + value + '</div>';
					}
				}
				entry.title = new model.Content("title", value, null, this.entryTitleSelect.value);
				modifiedEntry = true;
			}
			
			if(this._editors.id.attr('value') != entry.id){
				entry.id = this._editors.id.attr('value');
				modifiedEntry = true;
			}
			
			if(this._editors.summary && (this._editors.summary.attr('value') != entry.summary.value || this.entrySummarySelect.value != entry.summary.type)){
				value = this._editors.summary.attr('value');
				if(this.entrySummarySelect.value === "xhtml"){
					value = this._enforceXhtml(value);
					if(value.indexOf('<div xmlns="http://www.w3.org/1999/xhtml">') !== 0){
						value = '<div xmlns="http://www.w3.org/1999/xhtml">' + value + '</div>';
					}
				}
				entry.summary = new model.Content("summary", value, null, this.entrySummarySelect.value);
				modifiedEntry = true;
			}
			
			if(this._editors.content && (this._editors.content.attr('value') != entry.content.value || this.entryContentSelect.value != entry.content.type)){
				value = this._editors.content.attr('value');
				if(this.entryContentSelect.value === "xhtml"){
					value = this._enforceXhtml(value);
					if(value.indexOf('<div xmlns="http://www.w3.org/1999/xhtml">') !== 0){
						value = '<div xmlns="http://www.w3.org/1999/xhtml">' + value + '</div>';
					}
				}
				entry.content = new model.Content("content", value, null, this.entryContentSelect.value);
				modifiedEntry = true;
			}
			
			if(this._editors.authors){
				if(modifiedEntry){
					entry.authors = [];
					authors = this._editors.authors.getValues();
					for(i in authors){
						if(authors[i].name || authors[i].email || authors[i].uri){
							entry.addAuthor(authors[i].name, authors[i].email, authors[i].uri);
						}
					}
				}else{
					var currentAuthors = entry.authors;
					var searchAuthors = function(name, email, uri){
						for(i in currentAuthors){
							if(currentAuthors[i].name === name && currentAuthors[i].email === email && currentAuthors[i].uri === uri){
								return true;
							}
						}
						return false;
					};
					authors = this._editors.authors.getValues();
					changed = false;
					for(i in authors){
						if(!searchAuthors(authors[i].name, authors[i].email, authors[i].uri)){
							changed = true;
							break;
						}
					}
					if(changed){
						entry.authors = [];
						for(i in authors){
							if(authors[i].name || authors[i].email || authors[i].uri){
								entry.addAuthor(authors[i].name, authors[i].email, authors[i].uri);
							}
						}
						modifiedEntry = true;
					}
				}
			}
			
			if(this._editors.contributors){
    			if(modifiedEntry){
					entry.contributors = [];
					contributors = this._editors.contributors.getValues();
					for(i in contributors){
						if(contributors[i].name || contributors[i].email || contributors[i].uri){
							entry.addAuthor(contributors[i].name, contributors[i].email, contributors[i].uri);
						}
					}
				}else{
					var currentContributors = entry.contributors;
					var searchContributors = function(name, email, uri){
						for(i in currentContributors){
							if(currentContributors[i].name === name && currentContributors[i].email === email && currentContributors[i].uri === uri){
								return true;
							}
						}
						return false;
					};
					contributors = this._editors.contributors.getValues();
					changed = false;
					for(i in contributors){
						if(searchContributors(contributors[i].name, contributors[i].email, contributors[i].uri)){
							changed = true;
							break;
						}
					}
					if(changed){
						entry.contributors = [];
						for(i in contributors){
							if(contributors[i].name || contributors[i].email || contributors[i].uri){
								entry.addContributor(contributors[i].name, contributors[i].email, contributors[i].uri);
							}
						}
						modifiedEntry = true;
					}
				}
			}

			if(modifiedEntry){
				dojo.publish(this.entrySelectionTopic, [{action: "update", source: this, entry: entry, callback: this._handleSave }]);
				//TODO: REMOVE BELOW
				//var atomIO = new dojox.atom.io.Connection();
				//atomIO.updateEntry(entry, dojo.hitch(this,this._handleSave));
				//WARNING: Use above when testing with SimpleProxy (or any other servlet which
				//			doesn't actually create a new entry and return it properly)
				//atomIO.updateEntry(entry, dojo.hitch(this,this._handleSave), true);
			}
		}else{
			this._new = false;
			entry = new model.Entry();
			
			value = this._editors.title.attr('value');
			if(this.entryTitleSelect.value === "xhtml"){
				value = this._enforceXhtml(value);
				value = '<div xmlns="http://www.w3.org/1999/xhtml">' + value + '</div>';
			}
			entry.setTitle(value, this.entryTitleSelect.value);
			entry.id = this._editors.id.attr('value');
			
			authors = this._editors.authors.getValues();
			for(i in authors){
				if(authors[i].name || authors[i].email || authors[i].uri){
					entry.addAuthor(authors[i].name, authors[i].email, authors[i].uri);
				}
			}
					
			contributors = this._editors.contributors.getValues();
			for(i in contributors){
				if(contributors[i].name || contributors[i].email || contributors[i].uri){
					entry.addContributor(contributors[i].name, contributors[i].email, contributors[i].uri);
				}
			}

			
			value = this._editors.summary.attr('value');
			if(this.entrySummarySelect.value === "xhtml"){
				value = this._enforceXhtml(value);
				value = '<div xmlns="http://www.w3.org/1999/xhtml">' + value + '</div>';
			}
			entry.summary = new model.Content("summary", value, null, this.entrySummarySelect.value);

			value = this._editors.content.attr('value');
			if(this.entryContentSelect.value === "xhtml"){
				value = this._enforceXhtml(value);
				value = '<div xmlns="http://www.w3.org/1999/xhtml">' + value + '</div>';
			}
			entry.content = new model.Content("content", value, null, this.entryContentSelect.value);

			domStyle.set(this.entryNewButton, 'display', '');
			dojo.publish(this.entrySelectionTopic, [{action: "post", source: this, entry: entry }]);
		}
		this._editMode = false;
		
		//Rebuild the view using the same entry and feed.
		this.setEntry(entry, this._feed, true);
	},
	
	_handleSave: function(/*object*/entry, /*string*/ location){
		// summary:
		//		Function for handling the save of an entry, cleaning up the display after the edit is completed.
		// entry: dojox.atom.io.model.Entry object
		//		The entry that was saved.
		// Location: String
		//		A URL to be used, not used here, but part of the call back from the AtomIO
		// returns: Nothing

		//Close the editor and revert out.
		this._editMode = false;
		
		//Rebuild the view using the same entry and feed.
		this.clear();
		this.setEntry(entry, this.getFeed(), true);
	},

	cancelEdits: function(){
		// summary:
		//		Cancels edits and reverts the editor to its previous state (display mode)
		// returns:
		//		Nothing.
		this._new = false;
		domStyle.set(this.entrySaveCancelButtons, 'display', 'none');
		if(this._editable){
			domStyle.set(this.entryEditButton, 'display', '');
		}
		domStyle.set(this.entryNewButton, 'display', '');
		this._editMode = false;
		
		//Rebuild the view using the same entry and feed.
		this.clearEditors();
		this.setEntry(this.getEntry(), this.getFeed(), true);
	},

	clear: function(){
		// summary:
		//		Clears the editor, destroys all editors, leaving the editor completely clear
		this._editable=false;
		this.clearEditors();
		FeedEntryEditor.superclass.clear.apply(this);
		if(this._contentEditor){
			// Note that the superclass clear destroys the widget since it's in the child widget list,
			// so this is just ref clearing.
			this._contentEditor = this._setObject = this._oldContent = this._contentEditorCreator = null;
			this._editors = {};
		}
	},
	
	clearEditors: function(){
		for(var key in this._editors){
			if(this._editors[key].isInstanceOf(Editor)){
				this._editors[key].close(false, true);
			}
			this._editors[key].destroy();
		}
		this._editors = {};
	},

	_enforceXhtml: function(/*string*/html){
		// summary:
		//		Function for cleaning up/enforcing the XHTML standard in HTML returned from the editor2 widget.
		// html:
		//		HTML string to be enforced as xhtml.
		// returns:
		//		string of cleaned up HTML.
		var xhtml = null;
		if(html){
			//Handle <BR>
			var brRegExp = /<br>/g;
			xhtml = html.replace(brRegExp, "<br/>");

			//Handle <HR>
			xhtml = this._closeTag(xhtml, "hr");

			//Handle <img>
			xhtml = this._closeTag(xhtml, "img");
		}
		return xhtml;
	},

	_closeTag: function(/*string*/xhtml, /*string*/tag){
		// summary:
		//		Function for closing tags in a text of HTML/XHTML
		// xhtml: String
		//		XHTML string which needs the closing tag.
		// tag:
		//		The tag to close.
		// returns:
		//		string of cleaned up HTML.

		// NOTE:  Probably should redo this function in a more efficient way.  This could get expensive.
		var tagStart = "<" + tag;
		var tagIndex = xhtml.indexOf(tagStart);
		if(tagIndex !== -1){
			while (tagIndex !== -1){
				var tempString = "";
				var foundTagEnd = false;
				for (var i = 0; i < xhtml.length; i++){
					var c = xhtml.charAt(i);
					if(i <= tagIndex ||foundTagEnd){
						tempString += c;
					}
					else
					{
						if(c === '>'){
							tempString += "/";
							foundTagEnd = true;
						}
						tempString +=c;
					}
				}
				xhtml = tempString;
				tagIndex = xhtml.indexOf(tagStart, tagIndex + 1);
			}
		}
		return xhtml;
	},
	
	_toggleNew: function(){
		// summary:
		//		Function to put the editor into a state to create a new entry.

		// Hide the edit/new buttons and show the save/cancel buttons.
		domStyle.set(this.entryNewButton, 'display', 'none');
		domStyle.set(this.entryEditButton, 'display', 'none');
		domStyle.set(this.entrySaveCancelButtons, 'display', '');
		
		// Reset the type select boxes to text.
		this.entrySummarySelect.value = "text";
		this.entryContentSelect.value = "text";
		this.entryTitleSelect.value = "text";
		
		// Clear all nodes.
		this.clearNodes();
		this._new = true;
		
		var _nlsResources = i18nViewer;
		// Create all headers and editors.
		var titleHeader = new FeedEntryViewer.EntryHeader({title: _nlsResources.title});
		this.entryTitleHeader.appendChild(titleHeader.domNode);
		
		this._editors.title = this._createEditor(this.entryTitleNode, null);
		this.setFieldValidity("title",true);
		
		var authorHeader = new FeedEntryViewer.EntryHeader({title: _nlsResources.authors});
		this.entryAuthorHeader.appendChild(authorHeader.domNode);

		this._editors.authors = this._createPeopleEditor(this.entryAuthorNode, {name: "Author"});
		this.setFieldValidity("authors", true);
		
		var contributorHeader = new FeedEntryViewer.EntryHeader({title: _nlsResources.contributors});
		this.entryContributorHeader.appendChild(contributorHeader.domNode);

		this._editors.contributors = this._createPeopleEditor(this.entryContributorNode, {name: "Contributor"});
		this.setFieldValidity("contributors", true);
		
		var idHeader = new FeedEntryViewer.EntryHeader({title: _nlsResources.id});
		this.entryIdHeader.appendChild(idHeader.domNode);
		
		this._editors.id = this._createEditor(this.entryIdNode, null);
		this.setFieldValidity("id",true);

		var updatedHeader = new FeedEntryViewer.EntryHeader({title: _nlsResources.updated});
		this.entryUpdatedHeader.appendChild(updatedHeader.domNode);
		
		this._editors.updated = this._createEditor(this.entryUpdatedNode, null);
		this.setFieldValidity("updated",true);

		var summaryHeader = new FeedEntryViewer.EntryHeader({title: _nlsResources.summary});
		this.entrySummaryHeader.appendChild(summaryHeader.domNode);
		
		this._editors.summary = this._createEditor(this.entrySummaryNode, null, true);
		this.setFieldValidity("summaryedit",true);
		this.setFieldValidity("summary",true);

		var contentHeader = new FeedEntryViewer.EntryHeader({title: _nlsResources.content});
		this.entryContentHeader.appendChild(contentHeader.domNode);
		
		this._editors.content = this._createEditor(this.entryContentNode, null, true);
		this.setFieldValidity("contentedit",true);
		this.setFieldValidity("content",true);

		// Show the sections.
		this._displaySections();
	},
	
	_displaySections: function(){
		// summary:
		//		Function to display the appropriate sections based on validity.

		// Hide select boxes.
		domStyle.set(this.entrySummarySelect, 'display', 'none');
		domStyle.set(this.entryContentSelect, 'display', 'none');
		domStyle.set(this.entryTitleSelect, 'display', 'none');

		// Show select boxes if the flags are set.
		if(this.isFieldValid("contentedit")){
			domStyle.set(this.entryContentSelect, 'display', '');
		}
		if(this.isFieldValid("summaryedit")){
			domStyle.set(this.entrySummarySelect, 'display', '');
		}
		if(this.isFieldValid("titleedit")){
			domStyle.set(this.entryTitleSelect, 'display', '');
		}
		// Call super's _displaySections.
		FeedEntryEditor.superclass._displaySections.apply(this);
		
		// If we have editors to load after the nodes are created on the page, execute those now.
		if(this._toLoad){
			for(var i in this._toLoad){
				var editor;
				if(this._toLoad[i].generateEditor){
					editor = lang.hitch(this._toLoad[i], this._toLoad[i].generateEditor)();
				}else{
					editor = this._toLoad[i];
				}
				this._editors[this._toLoad[i].name] = editor;
				this._toLoad[i] = null;
			}
			this._toLoad = null;
		}
	}
});

var PeopleEditor = declare("dojox.atom.widget.PeopleEditor", [_Widget, _Templated, _Container],{
		// summary:
		//		An editor for dojox.atom.io.model.Person objects.
		// description:
		//		An editor for dojox.atom.io.model.Person objects.  Displays multiple rows for the respective arrays
		//		of people.  Can add/remove rows on the fly.
		templateString: peopleEditorTemplate,

		_rows: [],
		_editors: [],
		_index: 0,
		_numRows: 0,
		
		postCreate: function(){
			// Initializer function for the PeopleEditor widget.
			var _nlsResources = i18nPeople;
			if(this.name){
				if(this.name == "Author"){
					this.peopleEditorButton.appendChild(document.createTextNode("["+_nlsResources.addAuthor+"]"));
				}else if(this.name == "Contributor"){
					this.peopleEditorButton.appendChild(document.createTextNode("["+_nlsResources.addContributor+"]"));
				}
			}else{
				this.peopleEditorButton.appendChild(document.createTextNode("["+_nlsResources.add+"]"));
			}
			this._editors = [];

			if(!this.data || this.data.length===0){
				this._createEditors(null, null, null, 0, this.name);
				this._index = 1;
			}else{
				for(var i in this.data){
					this._createEditors(this.data[i].name, this.data[i].email, this.data[i].uri, i);
					this._index++;
					this._numRows++;
				}
			}
		},
		
		destroy: function(){
			for(var key in this._editors){
				for(var key2 in this._editors[key]){
					this._editors[key][key2].destroy();
				}
			}
			this._editors = [];
		},
		
		_createEditors: function(/*string*/name, /*string*/email, /*string*/uri, /*int*/index, /*string*/widgetName){
			// summary:
			//		creates editor boxes (textbox widgets) for the individual values of a Person.
			// name:
			//		The name of this Person.
			// email:
			//		The email of this Person.
			// uri:
			//		The Person's URI.
			// index:
			//		The row index to use for this Person.
			var row = document.createElement("tr");
			this.peopleEditorEditors.appendChild(row);
			row.id = "removeRow"+index;
			
			var node = document.createElement("td");
			node.setAttribute('align', 'right');
			row.appendChild(node);
			node.colSpan = 2;
			
			if(this._numRows>0){
				var hr = document.createElement("hr");
				node.appendChild(hr);
				hr.id = "hr"+index;
			}
			
			row = document.createElement("span");
			node.appendChild(row);
			row.className = "peopleEditorButton";
			domStyle.set(row, 'font-size', 'x-small');
			connect.connect(row, "onclick", this, "_removeEditor");
			row.id = "remove"+index;
			
			node = document.createTextNode("[X]");
			row.appendChild(node);
			
			row = document.createElement("tr");
			this.peopleEditorEditors.appendChild(row);
			row.id = "editorsRow"+index;
			
			var labelNode = document.createElement("td");
			row.appendChild(labelNode);
			domStyle.set(labelNode, 'width', '20%');
			
			node = document.createElement("td");
			row.appendChild(node);
			
			row = document.createElement("table");
			labelNode.appendChild(row);
			domStyle.set(row, 'width', '100%');
			
			labelNode = document.createElement("tbody");
			row.appendChild(labelNode);
			
			row = document.createElement("table");
			node.appendChild(row);
			domStyle.set(row, 'width', '100%');
			
			node = document.createElement("tbody");
			row.appendChild(node);

			this._editors[index] = [];
			this._editors[index].push(this._createEditor(name, widgetName+'name'+index, 'Name:', labelNode, node));
			this._editors[index].push(this._createEditor(email, widgetName+'email'+index, 'Email:', labelNode, node));
			this._editors[index].push(this._createEditor(uri, widgetName+'uri'+index, 'URI:', labelNode, node));
		},
		
		_createEditor: function(/*string*/value, /*string*/id, /*string*/name, /*DOM node*/labelNode, /*DOM node*/node){
			// summary:
			//		Creates an individual editor widget (textbox) for a value.
			// value:
			//		The initial value of the textbox
			// id:
			//		The id the textbox should have.
			// name:
			//		The text to put in the label element for this textbox.
			// labelNode:
			//		The node to attach the label to.
			// node:
			//		The node to attach the editor rows to.
			// returns:
			//		Editor widget.
			var row = document.createElement("tr");
			labelNode.appendChild(row);
			
			var label = document.createElement("label");
			label.setAttribute('for', id);
			label.appendChild(document.createTextNode(name));
			labelNode = document.createElement("td");
			labelNode.appendChild(label);
			row.appendChild(labelNode);
			
			row = document.createElement("tr");
			node.appendChild(row);
				
			node = document.createElement("td");
			row.appendChild(node);
			
			var viewNode = document.createElement("input");
			viewNode.setAttribute('id', id);
			node.appendChild(viewNode);
			domStyle.set(viewNode, 'width', '95%');
			
			var box = new TextBox({},viewNode);
			box.attr('value', value);
			return box;
		},
		
		_removeEditor: function(/*object*/event){
			// summary:
			//		Removes a Person from our list of editors.
			// description:
			//		Removes a Person from our list of editors by removing the block of editors that
			//		make up that Person.
			// event:
			//		The event generated when the remove button is pressed on the page.
			var target = null;
		
			if(has("ie")){
				target = event.srcElement;
			}else{
				target = event.target;
			}
				
			var id = target.id;
			id = id.substring(6);
			for(var key in this._editors[id]){
				this._editors[id][key].destroy();
			}
			
			var node = domUtil.byId("editorsRow"+id);
			var parent = node.parentNode;
			parent.removeChild(node);
			
			node = domUtil.byId("removeRow"+id);
			parent = node.parentNode;
			parent.removeChild(node);

			this._numRows--;
			if(this._numRows === 1 && parent.firstChild.firstChild.firstChild.tagName.toLowerCase() === "hr"){
				node = parent.firstChild.firstChild;
				node.removeChild(node.firstChild);
			}
			this._editors[id] = null;
		},
		
		_add: function(){
			// summary:
			//		Adds a new block of blank editors to represent a Person.
			this._createEditors(null, null, null, this._index);
			this._index++;
			this._numRows++;
		},
		
		getValues: function(){
			// summary:
			//		Gets the values of this editor in an array.
			// description:
			//		Gets the values of this editor in an array, with each Person as an object within the array.
			// returns:
			//		An array of anonymous objects representing dojox.atom.io.model.Persons.
			var values = [];
			for(var i in this._editors){
				if(this._editors[i]){
					values.push({name: this._editors[i][0].attr('value'), email: this._editors[i][1].attr('value'), uri: this._editors[i][2].attr('value')});
				}
			}
			return values;
		}
});

return FeedEntryEditor;
});
