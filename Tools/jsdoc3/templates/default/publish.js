(function() {

    var template = require('jsdoc/template'),
        fs = require('fs'),
        helper = require('jsdoc/util/templateHelper'),
        scopeToPunc = { 'static': '.', 'inner': '~', 'instance': '#' };
    
    /**
        @global
        @param {TAFFY} data See <http://taffydb.com/>.
        @param {object} opts
        @param {Tutorial} tutorials
     */
    publish = function(data, opts, tutorials) {
        var out = '',
            view = new template.Template(__dirname + '/templates/default/tmpl');
        
        // set up templating
        view.layout = 'layout.tmpl';

        // set up tutorials for helper
        helper.setTutorials(tutorials);

        function find(spec) {
            return data.get( data.find(spec) );
        }
        
        function htmlsafe(str) {
            return str.replace(/</g, '&lt;');
        }

        function addSignatureParams(f) {
            var pnames = [];
            if (f.params) {
                f.params.forEach(function(p) {
                    if (p.name && p.name.indexOf('.') === -1) {
                        if (p.optional) { pnames.push('<span class="optional">'+p.name+'</span>'); }
                        else { pnames.push(p.name); }
                    }
                });
            }
            
            f.signature = (f.signature || '') + '('+pnames.join(', ')+')';
        }
        
        function generateAncestry(thisdoc) {
            var ancestors = [],
                doc = thisdoc;

            while (doc = doc.memberof) {
                doc = find({longname: doc});
                if (doc) { doc = doc[0]; }
                if (!doc) break;
                ancestors.unshift( linkto(doc.longname, (scopeToPunc[doc.scope] || '') + doc.name) );
            }
            if (ancestors.length) {
                ancestors[ancestors.length-1] += (scopeToPunc[thisdoc.scope] || '');
            }
            return ancestors;
        }
        
        function addSignatureReturns(f) {
            var returnTypes = [];
            
            if (f.returns) {
                f.returns.forEach(function(r) {
                    if (r.type && r.type.names) {
                        if (! returnTypes.length) { returnTypes = r.type.names; }
                    }
                });
            }
            
            if (returnTypes && returnTypes.length) {
                returnTypes = returnTypes.map(function(r) {
                    return linkto(r);
                });
            }
            f.signature = '<span class="signature">'+(f.signature || '') + '</span>' + '<span class="type-signature">'+(returnTypes.length? ' &rarr; {'+returnTypes.join('|')+'}' : '')+'</span>';
        }
        
        function addSignatureType(f) {
            var types = [];
            
            if (f.type && f.type.names) {
                types = f.type.names;
            }
            
            if (types && types.length) {
                types = types.map(function(t) {
                    return linkto(t, htmlsafe(t));
                });
            } 
               
            f.signature = (f.signature || '') + '<span class="type-signature">'+(types.length? ' :'+types.join('|') : '')+'</span>';
        }
        
        function addAttribs(f) {
            var attribs = [];
            
            if (f.virtual) {
                attribs.push('virtual');
            }
            
            if (f.access && f.access !== 'public') {
                attribs.push(f.access);
            }
            
            if (f.scope && f.scope !== 'instance' && f.scope !== 'global') {
                if (f.kind == 'function' || f.kind == 'member' || f.kind == 'constant') attribs.push(f.scope);
            }
            
            if (f.readonly === true) {
                if (f.kind == 'member') attribs.push('readonly');
            }
            
            if (f.kind === 'constant') {
                attribs.push('constant');
                f.kind = 'member';
            }
            
            f.attribs = '<span class="type-signature">'+htmlsafe(attribs.length? '<'+attribs.join(', ')+'> ' : '')+'</span>';
        }
        
        data.remove({undocumented: true});
        data.remove({ignore: true});
        if (!opts.private) { data.remove({access: 'private'}); }
        data.remove({memberof: '<anonymous>'});
	    
	    var packageInfo = (find({kind: 'package'}) || []) [0];
        
        //function renderLinks(text) {
        //    return helper.resolveLinks(text);
        //}
        
	    data.forEach(function(doclet) {
             doclet.attribs = '';

	        
	        if (doclet.examples) {
	            doclet.examples = doclet.examples.map(function(example) {
	                var caption, code;
	                
	                if (example.match(/^\s*<caption>([\s\S]+?)<\/caption>(\s*[\n\r])([\s\S]+)$/i)) {
	                    caption = RegExp.$1;
	                    code    = RegExp.$3;
	                }
	                
                    return {
                        caption: caption || '',
                        code: code || example
                    };
                });
	        }
	        if (doclet.see) {
	            doclet.see.forEach(function(seeItem, i) {
	                doclet.see[i] = hashToLink(doclet, seeItem);
	            });
	        }
	    });
	    
	    data.orderBy(['longname', 'version', 'since']);
        
        // kinds of containers
        var globals = find( {kind: ['member', 'constant', 'typedef'], memberof: {isUndefined: true}} ),
            modules = find({kind: 'module'}),
            externals = find({kind: 'external'}),
            mixins = find({kind: 'mixin'}),
	        namespaces = find({kind: 'namespace'}),
			glslTypes = find({kind: 'glsl'});

        var outdir = opts.destination;
        if (packageInfo && packageInfo.name) {
            outdir += '/' + packageInfo.name + '/' + packageInfo.version + '/';
        }
        fs.mkPath(outdir);

        // copy static files to outdir
        var fromDir = __dirname + '/templates/default/static',
            staticFiles = fs.ls(fromDir, 3);
            
        staticFiles.forEach(function(fileName) {
            var toDir = fs.toDir(fileName.replace(fromDir, outdir));
            fs.mkPath(toDir);
            fs.copyFile(fileName, toDir);
        });
        
        function linkto(longname, linktext) {
            var url = helper.longnameToUrl[longname];
            return url? '<a href="'+url+'" target="_self">'+(linktext || longname)+'</a>' : (linktext || longname);
        }
        
        function tutoriallink(tutorial) {
            return helper.toTutorial(tutorial);
        }
        
        var containers = ['class', 'module', 'external', 'namespace', 'mixin'];
        
        data.forEach(function(doclet) {
            var url = helper.createLink(doclet);
            helper.registerLink(doclet.longname, url);
        });
        
        data.forEach(function(doclet) {
            var url = helper.longnameToUrl[doclet.longname];

	        if (url.indexOf('#') > -1) {
	            doclet.id = helper.longnameToUrl[doclet.longname].split(/#/).pop();
	        }
	        else {
	            doclet.id = doclet.name;
	        }
	        
	        if (doclet.kind === 'function' || doclet.kind === 'class') {
	            addSignatureParams(doclet);
	            addSignatureReturns(doclet);
	            addAttribs(doclet);
	        }
	    })
        
        // do this after the urls have all been generated
        data.forEach(function(doclet) {
            doclet.ancestors = generateAncestry(doclet);
            
            doclet.signature = '';
	        
	        if (doclet.kind === 'member') {
	            addSignatureType(doclet);
	            addAttribs(doclet)
	        }
	        
	        if (doclet.kind === 'constant') {
	            addSignatureType(doclet);
	            addAttribs(doclet)
	        }
        });
        
        var nav = '',
            seen = {};
        
        nav += '<ul id="ClassList"><div id="classItems">';	// Start single class list, begin JavaScript div
        var classNames = find({kind: 'class'});
        if (classNames.length) {
            //nav += '<h3>Classes</h3><ul>';
            classNames.forEach(function(c) {
                var moduleSameName = find({kind: 'module', longname: c.longname});
                if (moduleSameName.length) {
                    c.name = c.name.replace('module:', 'require(')+')';
                    moduleSameName[0].module = c;
                }
                
                if (!seen.hasOwnProperty(c.longname) ) nav += '<li>'+linkto(c.longname, c.name)+'</li>';
                seen[c.longname] = true;
            });
            //nav += '</ul>';
        }
		
        var moduleNames = find({kind: 'module'});
        if (moduleNames.length) {
            //nav += '<h3>Modules</h3><ul>';
            moduleNames.forEach(function(m) {
                if ( !seen.hasOwnProperty(m.longname) ) nav += '<li>'+linkto(m.longname, m.name)+'</li>';
                seen[m.longname] = true;
            });
            //nav += '</ul>';
        }
        
        var externalNames = find({kind: 'external'});
        if (externalNames.length) {
            //nav += '<h3>Externals</h3><ul>';
            externalNames.forEach(function(e) {
                if ( !seen.hasOwnProperty(e.longname) ) nav += '<li>'+linkto( e.longname, e.name.replace(/(^"|"$)/g, '') )+'</li>';
                seen[e.longname] = true;
            });
            //nav += '</ul>';
        }
        
        var namespaceNames = find({kind: 'namespace'});
        if (namespaceNames.length) {
            //nav += '<h3>Namespaces</h3><ul>';
            namespaceNames.forEach(function(n) {
                if ( !seen.hasOwnProperty(n.longname) ) nav += '<li>'+linkto(n.longname, n.name)+'</li>';
                seen[n.longname] = true;
            });
            //nav += '</ul>';
        }
        
        var enumerationNames = find({kind: 'enumeration'});
        if (enumerationNames.length) {
        	enumerationNames.forEach(function(g) {
                if (!seen.hasOwnProperty(g.longname) ) nav += '<li>'+linkto(g.longname, g.name)+'</li>';
                seen[g.longname] = true;
            });
        }
        
        nav += '</div><div id="glslItems">';	// End classItems div, start GLSL div
        var glslNames = find({kind: 'glsl'});
        if (glslNames.length) {
            glslNames.forEach(function(g) {
                if ( !seen.hasOwnProperty(g.longname) ) nav += '<li>'+linkto(g.longname, g.name)+'</li>';
                seen[g.longname] = true;
            });    
        }
        nav += '</div></ul>';	// End GLSL div, end Class list
        
//         var constantNames = find({kind: 'constants'});
//         if (constantNames.length) {
//             nav += '<h3>Constants</h3><ul>';
//             constantNames.forEach(function(c) {
//                 if ( !seen.hasOwnProperty(c.longname) ) nav += '<li>'+linkto(c.longname, c.name)+'</li>';
//                 seen[c.longname] = true;
//             });
//             
//             nav += '</ul>';
//         }
/*        
        var mixinNames = find({kind: 'mixin'});
        if (mixinNames.length) {
            nav += '<h3>Mixins</h3><ul>';
            mixinNames.forEach(function(m) {
                if ( !seen.hasOwnProperty(m.longname) ) nav += '<li>'+linkto(m.longname, m.name)+'</li>';
                seen[m.longname] = true;
            });
            
            nav += '</ul>';
        }

        if (tutorials.children.length) {
            nav += '<h3>Tutorials</h3><ul>';
            tutorials.children.forEach(function(t) {
                nav += '<li>'+tutoriallink(t.name)+'</li>';
            });
            
            nav += '</ul>';
        }
        
        var globalNames = find({kind: ['function', 'constant', 'typedef'], 'memberof': {'isUndefined': true}});
        if (globalNames.length) {
            //nav += '<h3>Global</h3><ul>';
            globalNames.forEach(function(g) {
                if ( g.kind !== 'typedef' && !seen.hasOwnProperty(g.longname) ) nav += '<li>'+linkto(g.longname, g.name)+'</li>';
                seen[g.longname] = true;
            });
            
            nav += '</ul>';
        }
*/
        // add template helpers
        view.find = find;
        view.linkto = linkto;
        view.tutoriallink = tutoriallink;
        view.htmlsafe = htmlsafe;
        // once for all
        view.nav = nav;

        var types_json = {};
        for (var longname in helper.longnameToUrl) {
            var classes = find({kind: 'class', longname: longname});
            if (classes.length) generate(classes[0].name, classes, helper.longnameToUrl[longname]);
			
            var enumerations = find({kind: 'enumeration', longname: longname});
            if (enumerations.length) generate(enumerations[0].name, enumerations, helper.longnameToUrl[longname]);
            
			var glslTypes = find({kind: 'glsl', longname: longname});
            if (glslTypes.length) generate(glslTypes[0].name, glslTypes, helper.longnameToUrl[longname]);
			
            var modules = find({kind: 'module', longname: longname});
            if (modules.length) generate(modules[0].name, modules, helper.longnameToUrl[longname]);
            
            var namespaces = find({kind: 'namespace', longname: longname});
            if (namespaces.length) generate('Namespace: '+namespaces[0].name, namespaces, helper.longnameToUrl[longname]);
      
//            var constants = find({kind: 'constant', longname: longname});
//            if (constants.length) generate('Constant: '+constants[0].name, constants, helper.longnameToUrl[longname]);        

            var mixins = find({kind: 'mixin', longname: longname});
            if (mixins.length) generate('Mixin: '+mixins[0].name, mixins, helper.longnameToUrl[longname]);        
        
            var externals = find({kind: 'external', longname: longname});
            if (externals.length) generate('External: '+externals[0].name, externals, helper.longnameToUrl[longname]);
        }

        // if (globals.length) generate('Global', [{kind: 'globalobj'}], 'global.html');
        
        view.layout = 'index.tmpl';
        var indexHtml = view.render('empty.tmpl', { title: 'Cesium Documentation' });
        fs.writeFileSync(outdir + '/index.html', indexHtml);
        
        fs.writeFileSync(outdir + '/types.txt', JSON.stringify(types_json));
        
        function generate(title, docs, filename) {
            var data = {
                title: title,
                docs: docs
            };

            var path = outdir + '/' + filename,
                html = view.render('container.tmpl', data),
                titleLower = title.toLowerCase();
            
            html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
            
            if (titleLower in types_json) {
                types_json[titleLower].push(filename);
            } else {
                types_json[titleLower] = [ filename ];
            }
            
            var pos = 0, pos2, member, memberLower, match = 'h4 class="name" id="', matchLen = match.length;
            while ((pos = html.indexOf(match, pos)) >= 0) {
                pos += matchLen;
                if ((pos2 = html.indexOf('"', pos)) > 0) {
                    member = html.substring(pos, pos2);
                    memberLower = member.toLowerCase();
                    if (memberLower !== titleLower) {
                        if (memberLower in types_json) {
                            // Note ".toString" and ".valueOf" used to be discarded here, before .toLowerCase() was used.
                            if (typeof types_json[memberLower].push === 'function') {
                                types_json[memberLower].push(filename + '#' + member);
                            }
                        } else {
                            types_json[memberLower] = [ filename + '#' + member ];
                        }
                    }
                }
            }
            
            fs.writeFileSync(path, html);
        }
        
        function generateTutorial(title, tutorial, filename) {
            var data = {
                title: title,
                header: tutorial.title,
                content: tutorial.parse(),
                children: tutorial.children
            };
            
            var path = outdir + '/' + filename,
                html = view.render('tutorial.tmpl', data);
            
            // yes, you can use {@link} in tutorials too!
            html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
            
            fs.writeFileSync(path, html);
        }
        
        // tutorials can have only one parent so there is no risk for loops
        function saveChildren(node) {
            node.children.forEach(function(child) {
                generateTutorial('Tutorial: '+child.title, child, helper.tutorialToUrl(child.name));
                saveChildren(child);
            });
        }
        saveChildren(tutorials);
    }
    
    function hashToLink(doclet, hash) {
        if ( !/^(#.+)/.test(hash) ) { return hash; }
        
        var url = helper.createLink(doclet);
        
        url = url.replace(/(#.+|$)/, hash);
        pos = url.indexOf('|')
        if(pos === -1){
            return '<a href="'+url+'" target="_self">'+hash.substr(1)+'</a>';
        }
        return '<a href="'+url.substr(0, pos)+'" target="_self">'+url.substr(pos+1)+'</a>';

    }
    
})();
