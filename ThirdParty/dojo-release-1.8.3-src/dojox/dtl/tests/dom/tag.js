dojo.provide("dojox.dtl.tests.dom.tag");

dojo.require("dojox.dtl.dom");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.tests.dom.util");
dojo.require("dojo._base.sniff");

doh.register("dojox.dtl.dom.tag",
	[
		function test_errors(t){
			var dd = dojox.dtl;
			var template;

			// No root node after rendering
			var found = false;
			try {
				template = new dd.DomTemplate('No div');
				dd.tests.dom.util.render(template);
			}catch(e){
				t.is("Text should not exist outside of the root node in template", e.message);
				found = true;
			}
			t.t(found);

			var context = new dojox.dtl.Context({test: "Pocket"});
			found = false;
			try {
				template = new dd.DomTemplate('{{ test }}');
				dd.tests.dom.util.render(template, context);
			}catch(e){
				t.is("Text should not exist outside of the root node in template", e.message);
				found = true;
			}
			t.t(found);

			template = new dd.DomTemplate('<div></div>extra content');
			found = false;
			try {
				dd.tests.dom.util.render(template);
			}catch(e){
				t.is("Content should not exist outside of the root node in template", e.message);
				found = true;
			}
			t.t(found);

			// More than one top-level node (except for blocks)
			template = new dd.DomTemplate('<div></div><div></div>');
			found = false;
			try {
				dd.tests.dom.util.render(template);
			}catch(e){
				t.is("Content should not exist outside of the root node in template", e.message);
				found = true;
			}
			t.t(found);

			// Logic block rules out any root node
			template = new dd.DomTemplate('{% if missing %}<div></div>{% endif %}');
			found = false;
			try {
				dd.tests.dom.util.render(template);
			}catch(e){
				t.is("Rendered template does not have a root node", e.message);
				found = true;
			}
			t.t(found);
		},
		function test_tag_attributes(){
			var dd = dojox.dtl;

			var template = new dd.DomTemplate('<div>{% for item in items %}<a index="{{forloop.counter0}}" id="id_{{item.param}}">{{item.param}}</a>{% endfor %}</div>');
			var context = new dd.Context({
				items: [
					{
						name: "apple",
						param: "appleparam"
					},
					{
						name: "banana",
						param: "bananaparam"
					},
					{
						name: "orange",
						param: "orangeparam"
					}
				]
			});
			doh.is('<div><a index="0" id="id_appleparam">appleparam</a><a index="1" id="id_bananaparam">bananaparam</a><a index="2" id="id_orangeparam">orangeparam</a></div>', dd.tests.dom.util.render(template, context));
		},
		function test_tag_extend(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				base: dojo.moduleUrl("dojox.dtl.tests.templates", "base.html")
			});

			var template = new dd.DomTemplate("{% extends base %}{% block base %}<p>1</p><p>2</p><ul><li>2a</li><li>2b</li><li>2c</li></ul><p>3</p><ul><li>3a</li><li>3b</li><li>3c</li></ul><p>4</p><ul><li>4a</li><li>4b</li><li>4c</li></ul><p>5</p>{% endblock %}");
			t.is("<div>BaseBefore<p>1</p><p>2</p><ul><li>2a</li><li>2b</li><li>2c</li></ul><p>3</p><ul><li>3a</li><li>3b</li><li>3c</li></ul><p>4</p><ul><li>4a</li><li>4b</li><li>4c</li></ul><p>5</p>BaseAfter</div>", dd.tests.dom.util.render(template, context));
		},
		function test_tag_for(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				items: ["apple", "banana", "lemon"]
			});
			var template = new dd.DomTemplate('<div><ul>{% for item in items %}<li class="{{ item|length }}">{{ item }}</li>{% endfor %}</ul></div>');

			t.is('<div><ul><li class="5">apple</li><li class="6">banana</li><li class="5">lemon</li></ul></div>', dd.tests.dom.util.render(template, context));

			// The line break is there to make sure our regex works
			template = new dd.DomTemplate('<div><select>{% for item in items %}<option>{{ item }}</option>\n{% endfor %}</select></div>');

			t.is('<div><select><option>apple</option><option>banana</option><option>lemon</option></select></div>', dd.tests.dom.util.render(template, context));
		},
		function test_tag_if(t){
			var dd = dojox.dtl;

			var context = new dd.Context({key: true});
			var template = new dd.DomTemplate('{% if key %}<div>has key</div>{% else %}<div>no key</div>{% endif %}');
			t.is("<div>has key</div>", dd.tests.dom.util.render(template, context));
			context.key = false;
			t.is("<div>no key</div>", dd.tests.dom.util.render(template, context));
		},
		function test_tag_ifchanged(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				year: 2008,
				days: [
					new Date(2008, 0, 12),
					new Date(2008, 0, 28),
					new Date(2008, 1, 1),
					new Date(2008, 1, 1),
					new Date(2008, 1, 1)
				]
			});

			var template = new dd.DomTemplate("<div><h1>Archive for {{ year }}</h1>"+
"{% for date in days %}"+
'{% ifchanged %}<h3>Month: </h3><h3>{{ date|date:"F" }}</h3>{% endifchanged %}'+
'<a href="{{ date|date:\'M/d\'|lower }}/">{{ date|date:\'j\' }}</a>'+
"{% endfor %}</div>");

			t.is('<div><h1>Archive for 2008</h1>'+
'<h3>Month: </h3><h3>January</h3>'+
'<a href="jan/12/">12</a>'+
'<a href="jan/28/">28</a>'+
'<h3>Month: </h3><h3>February</h3>'+
'<a href="feb/01/">1</a>'+
'<a href="feb/01/">1</a>'+
'<a href="feb/01/">1</a></div>', dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate('<div>{% for date in days %}'+
'{% ifchanged date.date %} {{ date.date }} {% endifchanged %}'+
'{% ifchanged date.hour date.date %}'+
'{{ date.hour }}'+
'{% endifchanged %}'+
'{% endfor %}</div>');
			t.is('<div> 2008-01-12 0 2008-01-28 0 2008-02-01 0</div>', dd.tests.dom.util.render(template, context));
		},
		function test_tag_ifequal(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				items: [
					{ name: "apple", color: "red" },
					{ name: "banana", color: "yellow" },
					{ name: "pear", color: "green" },
					{ name: "kiwi", color: "brown" }
				],
				edit_item: "banana"
			});

			var template = new dd.DomTemplate("<div><ul>{% for item in items %}<li>{{ item.name }}</li>{% endfor %}</ul></div>");
			t.is('<div><ul><li>apple</li><li>banana</li><li>pear</li><li>kiwi</li></ul></div>', dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate("<div><ul>{% for item in items %}<li><span>{{ item.name }}</span><br/><p>{{ item.color }}</p></li>{% endfor %}</ul></div>");
			t.is('<div><ul><li><span>apple</span><br/><p>red</p></li><li><span>banana</span><br/><p>yellow</p></li><li><span>pear</span><br/><p>green</p></li><li><span>kiwi</span><br/><p>brown</p></li></ul></div>', dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate("<div><ul>{% for item in items %}<li>{% ifequal item.name edit_item %}<label>Name: <input type='text' name='name' value=\"{{ item.name }}\"/></label><br/><label>Color: <textarea name='color'>{{ item.color }}</textarea></label>{% else %}<span>{{ item.name }}</span><br/><p>{{ item.color }}</p>{% endifequal %}</li>{% endfor %}</ul></div>");
			t.is('<div><ul><li><span>apple</span><br/><p>red</p></li><li><label>Name: <input name="name" value="banana"/></label><br/><label>Color: <textarea name="color">yellow</textarea></label></li><li><span>pear</span><br/><p>green</p></li><li><span>kiwi</span><br/><p>brown</p></li></ul></div>', dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate("<div><ul>{% for item in items %}<li>{% ifequal item.name edit_item %}<div><label>Name: <input type='text' name='name' value=\"{{ item.name }}\"/></label><br/><label>Color: <textarea name='color'>{{ item.color }}</textarea></label></div>{% else %}<div><span>{{ item.name }}</span><br/><p>{{ item.color }}</p></div>{% endifequal %}</li>{% endfor %}</ul></div>");
			t.is('<div><ul><li><div><span>apple</span><br/><p>red</p></div></li><li><div><label>Name: <input name="name" value="banana"/></label><br/><label>Color: <textarea name="color">yellow</textarea></label></div></li><li><div><span>pear</span><br/><p>green</p></div></li><li><div><span>kiwi</span><br/><p>brown</p></div></li></ul></div>', dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate("<div><ul>{% for item in items %}{% ifequal item.name edit_item %}<li><label>Name: <input type='text' name='name' value=\"{{ item.name }}\"/></label><br/><label>Color: <textarea name='color'>{{ item.color }}</textarea></label></li>{% else %}<li><span>{{ item.name }}</span><br/><p>{{ item.color }}</p></li>{% endifequal %}{% endfor %}</ul></div>");
			t.is('<div><ul><li><span>apple</span><br/><p>red</p></li><li><label>Name: <input name="name" value="banana"/></label><br/><label>Color: <textarea name="color">yellow</textarea></label></li><li><span>pear</span><br/><p>green</p></li><li><span>kiwi</span><br/><p>brown</p></li></ul></div>', dd.tests.dom.util.render(template, context));
		},
		function test_tag_include(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				hello: dojo.moduleUrl("dojox.dtl.tests.templates", "hello.html"),
				person: "Bob",
				people: ["Charles", "Ralph", "Julia"]
			});

			var template = new dd.DomTemplate("<div>{% include hello %}</div>");
			t.is("<div>Hello, <span>Bob</span></div>", dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate('<div>{% include "../../dojox/dtl/tests/templates/hello.html" %}</div>');
			t.is("<div>Hello, <span>Bob</span></div>", dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate('<div>{% for person in people %}<div class="include">{% include hello %} </div>{% endfor %}</div>');
			t.is('<div><div class="include">Hello, <span>Charles</span> </div><div class="include">Hello, <span>Ralph</span> </div><div class="include">Hello, <span>Julia</span> </div></div>', dd.tests.dom.util.render(template, context));
		},
		function test_tag_spaceless(t){
			var dd = dojox.dtl;

			var template = new dd.DomTemplate("{% spaceless %}<ul> \n <li>Hot</li> \n\n<li>Pocket </li>\n </ul>{% endspaceless %}");
			t.is("<ul><li>Hot</li><li>Pocket </li></ul>", dd.tests.dom.util.render(template));
		},
		function test_tag_ssi(t){
			var dd = dojox.dtl;

			var context = new dd.Context({
				hello: dojo.moduleUrl("dojox.dtl.tests.templates", "hello.html"),
				person: "Bob",
				people: ["Charles", "Ralph", "Julia"]
			});

			var template = new dd.DomTemplate("<div>{% ssi hello parsed %}</div>");
			t.is("<div>Hello, <span>Bob</span></div>", dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate("<div>{% ssi hello %}</div>");
			t.is("<div>Hello, <span>{{ person }}</span></div>", dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate('<div>{% ssi "../../dojox/dtl/tests/templates/hello.html" parsed %}</div>');
			t.is("<div>Hello, <span>Bob</span></div>", dd.tests.dom.util.render(template, context));

			template = new dd.DomTemplate('<div>{% for person in people %}{% ssi hello parsed %} {% endfor %}</div>');
			t.is("<div>Hello, <span>Charles</span> Hello, <span>Ralph</span> Hello, <span>Julia</span> </div>", dd.tests.dom.util.render(template, context));
		},
		function test_tag_comment(t){
			var dd = dojox.dtl;

			var context = new dd.Context({});

			var template = new dd.DomTemplate("<div>abc{% comment %}{% endif %}<div>{% ssi hello parsed %}</div>{% for item in items %}{% endcomment %}xyz</div>");
			t.is("<div>abcxyz</div>", dd.tests.dom.util.render(template, context));
		},
		function test_annoying_nesting(){
			// In Safari:  table/tr, tr/th, tr/td, thead/tr, tbody/tr
			var dd = dojox.dtl;

			var context = new dd.Context({items: ["apple", "banana", "orange"]});

			// All: select/option
			var template = new dd.DomTemplate("<div><select>{% for item in items %}{% ifequal item 'apple' %}<option>=====</option>{% endifequal %}<option>{{ item }}</option>{% endfor %}</select></div>");
			doh.is("<div><select><option>=====</option><option>apple</option><option>banana</option><option>orange</option></select></div>", dd.tests.dom.util.render(template, context));

			// Safari: table/tr
			template = new dd.DomTemplate('<div><table><tr><td>Fruit</td></tr>{% for fruit in items %}<tr><td>{{ fruit }}</td></tr>{% endfor %}</table></div>');
			doh.is('<div><table><tbody><tr><td>Fruit</td></tr><tr><td>apple</td></tr><tr><td>banana</td></tr><tr><td>orange</td></tr></tbody></table></div>', dd.tests.dom.util.render(template, context));

			// Safari: tbody/tr
			template = new dd.DomTemplate('<div><table><tbody><tr><td>Fruit</td></tr>{% for fruit in items %}<tr><td>{{ fruit }}</td></tr>{% endfor %}</tbody></table></div>');
			doh.is('<div><table><tbody><tr><td>Fruit</td></tr><tr><td>apple</td></tr><tr><td>banana</td></tr><tr><td>orange</td></tr></tbody></table></div>', dd.tests.dom.util.render(template, context));

			// Safari: tr/th
			template = new dd.DomTemplate("<div><table><tr>{% for item in items %}{% ifequal item 'apple' %}<th>=====</th>{% endifequal %}<th>{{ item }}</th>{% endfor %}</tr></table></div>");
			doh.is("<div><table><tbody><tr><th>=====</th><th>apple</th><th>banana</th><th>orange</th></tr></tbody></table></div>", dd.tests.dom.util.render(template, context));

			// Safari: tr/th
			template = new dd.DomTemplate("<div><table><tr>{% for item in items %}{% ifequal item 'apple' %}<td>=====</td>{% endifequal %}<td>{{ item }}</td>{% endfor %}</tr></table></div>");
			doh.is("<div><table><tbody><tr><td>=====</td><td>apple</td><td>banana</td><td>orange</td></tr></tbody></table></div>", dd.tests.dom.util.render(template, context));

			var old = dojo.isWebKit;
			dojo.isWebKit = true;
			// Force WebKit because linebreaks work differently when nesting is parsed
			template = new dd.DomTemplate('<div><table>\n<thead><tr><th>Name</th><th>Count</th></tr></thead>\n<tbody>\n{% for fruit in items %}\n<tr><td>{{ fruit }}</td><td>{{ fruit }}</td></tr>\n{% endfor %}\n</tbody></table></div>');
			doh.is('<div><table><thead><tr><th>Name</th><th>Count</th></tr></thead><tbody><tr><td>apple</td><td>apple</td></tr><tr><td>banana</td><td>banana</td></tr><tr><td>orange</td><td>orange</td></tr></tbody></table></div>', dd.tests.dom.util.render(template, context));
			dojo.isWebKit = old;
		},
		function test_custom_attributes(){
			var dd = dojox.dtl;

			var context = new dd.Context({frag: {start: 10, stop: 20}});

			var template = new dd.DomTemplate('<div startLine="{{ frag.start }}" stopLine="{{ frag.stop }}">abc</div>');
			doh.is('<div startline="10" stopline="20">abc</div>', dd.tests.dom.util.render(template, context));
		},
		function test_emptiness(){
			var dd = dojox.dtl;

			var context = new dd.Context({});
			var template = new dd.DomTemplate('<div>{% if data %}{% else %}<p>Please select a file using the left panel.</p>{% endif %}</div>');
			doh.is('<div><p>Please select a file using the left panel.</p></div>', dd.tests.dom.util.render(template, context));

			context.data = true;
			doh.is('<div/>', dd.tests.dom.util.render(template, context));
		},
		function test_bools(){
			// checked, disabled, readonly
			var dd = dojox.dtl;

			var context = new dd.Context({checked: false});
			var template = new dd.DomTemplate('<div><input checked="{{ checked }}"></div>');
			doh.is('<div><input checked="false"/></div>', dd.tests.dom.util.render(template, context));
		},
		function test_mixedCase(){
			var dd = dojox.dtl;

			var context = new dd.Context();
			var template = new dd.DomTemplate('<div simplecase="simple" mixedCase="mixed">content</div>');
			doh.is('<div simplecase="simple" mixedcase="mixed">content</div>', dd.tests.dom.util.render(template, context));
		},
		function test_tabindex_lowercase(){
			var dd = dojox.dtl;

			var context = new dd.Context();
			var template = new dd.DomTemplate('<div tabindex="-1"></div>');
			//the following should not throw errors
			dd.tests.dom.util.render(template, context);
		},
		function test_tabIndex(){
			var dd = dojox.dtl;

			var context = new dd.Context();
			var template = new dd.DomTemplate('<div tabIndex="-1"></div>');
			//the following should not throw errors in IE
			dd.tests.dom.util.render(template, context);
		}
	]
);