dojo.provide("dojox.widget.rotator.ThumbnailController");

(function(d){

	var _css = "dojoxRotatorThumb",
		_selected = _css + "Selected";

	d.declare("dojox.widget.rotator.ThumbnailController", null, {
		//	summary:
		//		A rotator controller that displays thumbnails of each rotator pane.
		//
		//	description:
		//		The ThumbnailController will look at each of the rotator's panes and
		//		only if the node is an <img> tag, then it will create an thumbnail of
		//		the pane's image using the <img> tag's "thumbsrc" or "src" attribute.
		//
		//		The size of the thumbnails and the style of the selected thumbnail is
		//		controlled using CSS.
		//
		//	example:
		//	|	<div dojoType="dojox.widget.Rotator" jsId="myRotator">
		//	|		<img src="/path/to/image1.jpg" thumbsrc="/path/to/thumb1.jpg" alt="Image 1"/>
		//	|		<img src="/path/to/image2.jpg" thumbsrc="/path/to/thumb2.jpg" alt="Image 2"/>
		//	|	</div>
		//	|	<div dojoType="dojox.widget.rotator.ThumbnailController" rotator="myRotator"></div>

		//	rotator: dojox.widget.Rotator
		//		An instance of a Rotator widget.
		rotator: null,

		constructor: function(/*Object*/params, /*DomNode|string*/node){
			//	summary:
			//		Initializes the thumbnails and connect to the rotator.

			d.mixin(this, params);

			this._domNode = node;

			// check if we have a valid rotator
			var r = this.rotator;
			if(r){
				// remove all of the controller's child nodes just in case
				while(node.firstChild){
					node.removeChild(node.firstChild);
				}

				for(var i=0; i<r.panes.length; i++){
					var n = r.panes[i].node,
						s = d.attr(n, "thumbsrc") || d.attr(n, "src"),
						t = d.attr(n, "alt") || "";

					if(/img/i.test(n.tagName)){
						(function(j){
							d.create("a", {
								classname: _css + ' ' + _css + j + ' ' + (j == r.idx ? _selected : ""),
								href: s,
								onclick: function(e){
									d.stopEvent(e);
									if(r){
										r.control.apply(r, ["go", j]);
									}
								},
								title: t,
								innerHTML: '<img src="' + s + '" alt="' + t + '"/>'
							}, node);
						})(i);
					}
				}

				this._con = d.connect(r, "onUpdate", this, "_onUpdate");
			}
		},

		destroy: function(){
			//	summary:
			//		Disconnect from the rotator.

			d.disconnect(this._con);
			d.destroy(this._domNode);
		},

		_onUpdate: function(/*string*/type){
			//	summary:
			//		Updates various pager controls when the rotator updates.

			var r = this.rotator; // no need to test if this is null since _onUpdate is only fired by the rotator
			if(type == "onAfterTransition"){
				var n = d.query('.' + _css, this._domNode).removeClass(_selected);
				if(r.idx < n.length){
					d.addClass(n[r.idx], _selected);
				}
			}
		}
	});

})(dojo);