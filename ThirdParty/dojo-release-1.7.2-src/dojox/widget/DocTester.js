dojo.provide("dojox.widget.DocTester");

dojo.require("dojo.string");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.form.BusyButton");
dojo.require("dojox.testing.DocTest");

dojo.declare('dojox.widget.DocTester',
	[dijit._Widget, dijit._Templated],
	{
		// summary: A widget to run DocTests inside an HTML page.
		//
		templateString: dojo.cache('dojox.widget','DocTester/DocTester.html'),
		widgetsInTemplate: true,
	
		_fillContent:function(/*DomNode*/source){
			// summary: Overridden from _Templates.js, which actually just takes care of filling the containerNode.
			var src = source.innerHTML;
			this.doctests = new dojox.testing.DocTest();
			this.tests = this.doctests.getTestsFromString(this._unescapeHtml(src));
			var lineNumbers = dojo.map(this.tests, 'return item.line-1');
			var lines = src.split("\n");
			var actualResultHtml = '<div class="actualResult">FAILED, actual result was: <span class="result"></span></div>';
			var content = '<pre class="testCase testNum0 odd">';
			for (var i=0; i<lines.length; i++){
				var index = dojo.indexOf(lineNumbers, i);
				if (index>0 && index!=-1){
					var evenOdd = index%2 ? "even" : "odd";
					content += actualResultHtml;
 					content += '</pre><pre class="testCase testNum'+ index +' '+evenOdd+'">';
				}
				content += lines[i].replace(/^\s+/, "")+"\n";
			}
			content += actualResultHtml + '</pre>';
			this.containerNode.innerHTML = content;
		},
	
		postCreate:function(){
			this.inherited("postCreate", arguments);
			dojo.connect(this.runButtonNode, "onClick", dojo.hitch(this, "runTests"));
			dojo.connect(this.resetButtonNode, "onClick", dojo.hitch(this, "reset"));
			this.numTestsNode.innerHTML = this.tests.length;
		},
		
		runTests:function(){
			var results = {ok:0, nok:0};
			for (var i=0; i<this.tests.length; i++){
				var ret = this.doctests.runTest(this.tests[i].commands, this.tests[i].expectedResult);
				dojo.query(".testNum"+i, this.domNode).addClass(ret.success ? "resultOk" : "resultNok");
				if (!ret.success){
					results.nok++;
					this.numTestsNokNode.innerHTML = results.nok;
					var act = dojo.query(".testNum"+i+" .actualResult", this.domNode)[0];
					dojo.style(act, "display", "inline");
					dojo.query(".result", act)[0].innerHTML = dojo.toJson(ret.actualResult);
				} else {
					results.ok++;
					this.numTestsOkNode.innerHTML = results.ok;
				}
			}
			this.runButtonNode.cancel();
			dojo.style(this.runButtonNode.domNode, "display", "none");
			dojo.style(this.resetButtonNode.domNode, "display", "");
		},
		
		reset:function(){
			// summary: Reset the DocTester visuals and enable the "Run tests" button again.
			dojo.style(this.runButtonNode.domNode, "display", "");
			dojo.style(this.resetButtonNode.domNode, "display", "none");
			this.numTestsOkNode.innerHTML = "0";
			this.numTestsNokNode.innerHTML = "0";
			dojo.query(".actualResult", this.domNode).style("display", "none");
			dojo.query(".testCase", this.domNode).removeClass("resultOk").removeClass("resultNok");
		},
		
		_unescapeHtml:function(/*string*/str){
			// TODO Should become dojo.html.unentities() or so, when exists use instead
			// summary:
			//		Adds escape sequences for special characters in XML: &<>"'
			str = String(str).replace(/&amp;/gm, "&").replace(/&lt;/gm, "<")
				.replace(/&gt;/gm, ">").replace(/&quot;/gm, '"');
			return str; // string
		}
	}
);