define([
	"dojo/dom-construct",
	".",
	"./contrib/dijit",
	"./render/dom",
	"dojo/cache",
	"dijit/_TemplatedMixin"
	], function(domConstruct,dtl,ddcd,ddrd,cache,TemplatedMixin){

	dtl._DomTemplated = function(){
		// summary:
		//		The base class for DOM-based templating.
	};
	dtl._DomTemplated.prototype = {
		_dijitTemplateCompat: false,
		buildRendering: function(){
			// summary:
			//		Constructs the DOM representation.
			
			//render needs a domNode to work with
			this.domNode = this.srcNodeRef || dojo.create('div');

			if(!this._render){
				var old = ddcd.widgetsInTemplate;
				ddcd.widgetsInTemplate = this.widgetsInTemplate;
				this.template = this.template && this.template !== true ? this.template : this._getCachedTemplate(this.templatePath, this.templateString);
				this._render = new ddrd.Render(this.domNode, this.template);
				ddcd.widgetsInTemplate = old;
			}

			var context = this._getContext();
			if(!this._created){
				delete context._getter;
			}
			this.render(context);

			this.domNode = this.template.getRootNode();
			if(this.srcNodeRef && this.srcNodeRef.parentNode){
				domConstruct.destroy(this.srcNodeRef);
				delete this.srcNodeRef;
			}
		},
		setTemplate: function(/*String|dojo/url*/ template, /*dojox/dtl/Context?*/ context){
			// summary:
			//		Quickly switch between templated by location
			// template:
			//		The new template.
			// context:
			//		The runtime context.
			if(dojox.dtl.text._isTemplate(template)){
				this.template = this._getCachedTemplate(null, template);
			}else{
				this.template = this._getCachedTemplate(template);
			}
			this.render(context);
		},
		render: function(/*dojox/dtl/Context?*/ context, /*dojox/dtl/DomTemplate?*/ tpl){
			// summary:
			//		Renders this template.
			// context:
			//		The runtime context.
			// tpl:
			//		The template to render. Optional.
			if(tpl){
				this.template = tpl;
			}
			this._render.render(this._getContext(context), this.template);
		},
		_getContext: function(context){
			if(!(context instanceof dojox.dtl.Context)){
				context = false;
			}
			context = context || new dojox.dtl.Context(this);
			context.setThis(this);
			return context;
		},
		_getCachedTemplate: function(templatePath, templateString){
			if(!this._templates){
				this._templates = {};
			}
			if(!templateString){
				templateString = cache(templatePath, {sanitize: true});
			}
			var key = templateString;
			var tmplts = this._templates;
			if(tmplts[key]){
				return tmplts[key];
			}
			return (tmplts[key] = new dojox.dtl.DomTemplate(
				TemplatedMixin.getCachedTemplate(
					templateString,
					true
				)
			));
		}
	};
	return dtl._DomTemplated;
});

