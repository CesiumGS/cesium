dojo.provide("dojox.string.tests.BidiEngine.BidiEngineTestLayouts");
dojo.require("dojox.string.BidiEngine");
dojo.addOnLoad(function(){
			
	var unilisrc = [
		"11"
	];

	var bdEngine;
	var errorMessage = "dojox.string.BidiEngine: the bidi layout string is wrong!";
	doh.register('dojox.string.tests.BidiEngine.BidiEngine', [
		{	
			name:'1. test empty',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){	
					doh.is('', bdEngine.bidiTransform('', 'VLNNN', 'IRYNN'),"empty string.");
				},this);
			}
		},
		{	
			name:'2. empty format string.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){	
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, '', ''),"bidi layouts empty");
				},this);
			}
		},
		{	
			name:'3. show error.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ILYNN', ''),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'4. show error.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, '', 'ILYNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'5. show error.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'V', 'I'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'6. Test first letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'KLYNN', 'ILNNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'7. Test first letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VLYNN', 'KLNNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'8. Test second letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VKYNN', 'ILNNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'9. Test second letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYNN', 'IKNNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'10. Test third letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRSNN', 'IRNNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'11. Test third letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYNN', 'IRLNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'12. Test fourth letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRSNN', 'IRNNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'13. Test fourth letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYNN', 'IRSNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'14. Test fifth letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYNA', 'IRCNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'15. Test fifth letter.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYNN', 'ICNNA'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'16. Too much letters.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYNNN', 'IDYNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'16. Too much letters.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					try{
						doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYNN', 'ICYNNN'),"bidi layouts empty");
						throw new Error("Didn't threw error!!");
					}catch(e){
					 doh.is(errorMessage, e.message,"should throw wrong format message!");
					}
				},this);
			}
		},
		{	
			name:'17. Good formats.',

			setUp: function(){
				bdEngine = new dojox.string.BidiEngine();
			},
			
			runTest:function() {
				dojo.forEach(unilisrc, function(el, i){
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ILNNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VLNNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'IRNNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRNNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ICNNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'IDNNN', 'ILNNN'),"bidi layouts empty");

					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ILYNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VLYNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'IRYNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ICYNN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'IDYNN', 'ILNNN'),"bidi layouts empty");
					
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ILYSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VLYSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'IRYSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRYSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ICYSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'IDYSN', 'ILNNN'),"bidi layouts empty");
					
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ILNSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VLNSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'IRNSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'VRNSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'ICNSN', 'ILNNN'),"bidi layouts empty");
					doh.is(unilisrc[i], bdEngine.bidiTransform(el, 'IDNSN', 'ILNNN'),"bidi layouts empty");
					
				},this);
			}
		}
	]);
	

});
