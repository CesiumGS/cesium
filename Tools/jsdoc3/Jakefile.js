// see: https://github.com/mde/jake

desc('Updating package.json revision.');
task('default', [], function(params) {
    var fs = require('fs'), sys = require('sys');

    // import the Mustache template tool
    eval(fs.readFileSync('Jake/lib/mustache.js', 'utf8'));

    var templates = {
        packagejson : fs.readFileSync('Jake/templates/package.json.tmpl', 'utf8')
    };

    var metadata = {
        appname : 'JSDoc',
        appversion : '3.0.0',
        timestamp : '' + new Date().getTime()
    };

    var outdir = './';

    var rendered = Mustache.to_html(templates.packagejson, metadata);

    fs.writeFileSync(outdir + 'package.json', rendered, 'utf8');

    process.exit(0);

});

desc('Installs a plugin/template.');
task('install', [], function(loc) {
    var fs = require('fs'), util = require('util'), path = require('path'), wrench = require('wrench/wrench');

    if(!loc) {
        fail("You must specify the location of the plugin/template.");
    }

    if(!path.existsSync(loc)) {
        fail("plugin/template location [" + loc + "] is not valid.");
    }

    var pluginLoc = path.join(loc, "plugins"), templateLoc = path.join(loc, "templates"), jsdocLoc = process.cwd(), name, config;

    //First the plugin
    if(path.existsSync(pluginLoc)) {
        //copy it over
        wrench.copyDirSyncRecursive(pluginLoc, path.join(jsdocLoc, "plugins"), {
            preserve : true
        });
        //find out what it's called
        name = fs.readdirSync(pluginLoc)[0].replace(".js", "");
        //And finally edit the conf.json
        try {
            config = JSON.parse(fs.readFileSync(path.join(jsdocLoc, 'conf.json'), 'utf8'));
            if(config.plugins.indexOf('plugins/' + name) == -1) {
                config.plugins.push('plugins/' + name);
                fs.writeFileSync(path.join(jsdocLoc, 'conf.json'), JSON.stringify(config, null, "    "), 'utf8');
            }
        } catch (e) {
            fail("Could not edit the conf.json file: " + e);
        }
    }

    //Then the template
    if(path.existsSync(pluginLoc)) {
        wrench.copyDirSyncRecursive(templateLoc, path.join(jsdocLoc, "templates"), {
            preserve : true
        });
    }

    process.exit(0);

});