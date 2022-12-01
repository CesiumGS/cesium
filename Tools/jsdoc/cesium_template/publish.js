/*global env: true */
"use strict";

var fs = require("jsdoc/fs");
var helper = require("jsdoc/util/templateHelper");
var logger = require("jsdoc/util/logger");
var path = require("jsdoc/path");
var taffy = require("taffydb").taffy;
var template = require("jsdoc/template");
var util = require("util");

var htmlsafe = helper.htmlsafe;
var linkto = helper.linkto;
var resolveAuthorLinks = helper.resolveAuthorLinks;
var scopeToPunc = helper.scopeToPunc;
var hasOwnProp = Object.prototype.hasOwnProperty;

var data;
var view;

var outdir = env.opts.destination;

function find(spec) {
  return helper.find(data, spec);
}

function tutoriallink(tutorial) {
  return helper.toTutorial(tutorial, null, {
    tag: "em",
    classname: "disabled",
    prefix: "Tutorial: ",
  });
}

function getAncestorLinks(doclet) {
  return helper.getAncestorLinks(data, doclet);
}

function hashToLink(doclet, hash) {
  if (!/^(#.+)/.test(hash)) {
    return hash;
  }

  var url = helper.createLink(doclet);

  url = url.replace(/(#.+|$)/, hash);
  return '<a href="' + url + '">' + hash + "</a>";
}

function needsSignature(doclet) {
  var needsSig = false;

  // function and class definitions always get a signature
  if (
    doclet.kind === "function" ||
    doclet.kind === "class" ||
    doclet.kind === "module"
  ) {
    needsSig = true;
  }
  // typedefs that contain functions get a signature, too
  else if (
    doclet.kind === "typedef" &&
    doclet.type &&
    doclet.type.names &&
    doclet.type.names.length
  ) {
    for (var i = 0, l = doclet.type.names.length; i < l; i++) {
      if (doclet.type.names[i].toLowerCase() === "function") {
        needsSig = true;
        break;
      }
    }
  }

  return needsSig;
}

function addSignatureParams(f) {
  var params = helper.getSignatureParams(f, "optional");

  f.signature = (f.signature || "") + "(" + params.join(", ") + ")";
}

function addSignatureReturns(f) {
  var returnTypes = helper.getSignatureReturns(f);

  f.signature = '<span class="signature">' + (f.signature || "") + "</span>";

  if (returnTypes.length) {
    f.signature +=
      ' &rarr; <span class="type-signature returnType">' +
      (returnTypes.length ? returnTypes.join("|") : "") +
      "</span>";
  }
}

function addSignatureTypes(f) {
  var types = helper.getSignatureTypes(f);

  f.signature =
    (f.signature || "") +
    '<span class="type-signature">' +
    (types.length ? " : " + types.join("|") : "") +
    "</span>";
}

function addAttribs(f) {
  var attribs = helper.getAttribs(f);

  if (f.deprecated) {
    attribs.push("deprecated");
  }

  if (attribs.length) {
    f.attribs = attribs
      .map(function (attrib) {
        return (
          '<span class="type-signature attribute-' +
          attrib +
          '">' +
          htmlsafe(attrib) +
          "</span> "
        );
      })
      .join("");
  }
}

function shortenPaths(files, commonPrefix) {
  Object.keys(files).forEach(function (file) {
    files[file].shortened = files[file].resolved
      .replace(commonPrefix, "")
      // always use forward slashes
      .replace(/\\/g, "/");
  });

  return files;
}

function getPathFromDoclet(doclet) {
  if (!doclet.meta) {
    return null;
  }

  return doclet.meta.path && doclet.meta.path !== "null"
    ? path.join(doclet.meta.path, doclet.meta.filename)
    : doclet.meta.filename;
}

function generate(title, docs, filename, resolveLinks) {
  resolveLinks = resolveLinks === false ? false : true;

  var docData = {
    filename: filename,
    title: title,
    docs: docs,
  };

  var outpath = path.join(outdir, filename),
    html = view.render("container.tmpl", docData);

  if (resolveLinks) {
    html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
  }

  fs.writeFileSync(outpath, html, "utf8");
}

/**
 * Look for classes or functions with the same name as modules (which indicates that the module
 * exports only that class or function), then attach the classes or functions to the `module`
 * property of the appropriate module doclets. The name of each class or function is also updated
 * for display purposes. This function mutates the original arrays.
 *
 * @private
 * @param {Array.<module:jsdoc/doclet.Doclet>} doclets - The array of classes and functions to
 * check.
 * @param {Array.<module:jsdoc/doclet.Doclet>} modules - The array of module doclets to search.
 */
function attachModuleSymbols(doclets, modules) {
  var symbols = {};

  // build a lookup table
  doclets.forEach(function (symbol) {
    symbols[symbol.longname] = symbol;
  });

  return modules.map(function (module) {
    if (symbols[module.longname]) {
      module.module = symbols[module.longname];
      module.module.name =
        module.module.name.replace("module:", 'require("') + '")';
    }
  });
}

/**
 * Create the navigation sidebar.
 * @param {object} members The members that will be used to create the sidebar.
 * @param {array<object>} members.classes
 * @param {array<object>} members.externals
 * @param {array<object>} members.globals
 * @param {array<object>} members.mixins
 * @param {array<object>} members.modules
 * @param {array<object>} members.namespaces
 * @param {array<object>} members.tutorials
 * @param {array<object>} members.events
 * @return {string} The HTML for the navigation sidebar.
 */
function buildNav(members) {
  var nav = '<div id="ClassList">',
    seen = {},
    hasClassList = false,
    classNav = "",
    globalNav = "";

  var items = members.modules
    .concat(members.classes)
    .concat(members.globals)
    .concat(members.namespaces)
    .sort(function (a, b) {
      return a.longname.toLowerCase().localeCompare(b.longname.toLowerCase());
    });

  const addItems = (items) => {
    if (items.length) {
      items.forEach(function (m) {
        if (!hasOwnProp.call(seen, m.longname)) {
          nav +=
            '<li data-name="' +
            m.name +
            '">' +
            linkto(m.longname, m.name) +
            "</li>";
        }
        seen[m.longname] = true;
      });
    }
  };

  if (process.env.CESIUM_PACKAGES) {
    process.env.CESIUM_PACKAGES.split(",").forEach((package) => {
      nav += `<h5>${package}</h5>`;
      nav += "<ul>";
      addItems(items.filter((item) => item.meta.package === package));
      nav += "</ul>";
    });
  } else {
    nav += "<ul>";
    addItems(items);
    nav += "</ul>";
  }

  nav += "</div>";

  return nav;
}

/**
    @param {TAFFY} taffyData See <http://taffydb.com/>.
    @param {object} opts
    @param {Tutorial} tutorials
 */
exports.publish = function (taffyData, opts, tutorials) {
  data = taffyData;

  var conf = env.conf.templates || {};
  conf["default"] = conf["default"] || {};

  var templatePath = opts.template;
  view = new template.Template(templatePath + "/tmpl");

  // claim some special filenames in advance, so the All-Powerful Overseer of Filename Uniqueness
  // doesn't try to hand them out later
  var indexUrl = helper.getUniqueFilename("index");
  // don't call registerLink() on this one! 'index' is also a valid longname

  var globalUrl = helper.getUniqueFilename("global");
  helper.registerLink("global", globalUrl);

  // set up templating
  view.layout = "layout.tmpl";

  // set up tutorials for helper
  helper.setTutorials(tutorials);

  data = helper.prune(data);
  data.sort("longname, version, since");
  helper.addEventListeners(data);

  var sourceFiles = {};
  var sourceFilePaths = [];
  data().each(function (doclet) {
    doclet.attribs = "";

    doclet.longname = doclet.longname.replace(/^module:/, "");
    if (doclet.memberof)
      doclet.memberof = doclet.memberof.replace(/^module:/, "");

    if (doclet.examples) {
      doclet.examples = doclet.examples.map(function (example) {
        var caption, code;

        if (
          example.match(
            /^\s*<caption>([\s\S]+?)<\/caption>(\s*[\n\r])([\s\S]+)$/i
          )
        ) {
          caption = RegExp.$1;
          code = RegExp.$3;
        }

        return {
          caption: caption || "",
          code: code || example,
        };
      });
    }
    if (doclet.see) {
      doclet.see.forEach(function (seeItem, i) {
        doclet.see[i] = hashToLink(doclet, seeItem);
      });
    }

    // build a list of source files
    var sourcePath;
    if (doclet.meta) {
      sourcePath = getPathFromDoclet(doclet);
      sourceFiles[sourcePath] = {
        resolved: sourcePath,
        shortened: null,
      };
      if (sourceFilePaths.indexOf(sourcePath) === -1) {
        sourceFilePaths.push(sourcePath);
      }
    }
  });

  // update outdir if necessary, then create outdir
  var packageInfo = (find({ kind: "package" }) || [])[0];
  if (packageInfo && packageInfo.name) {
    outdir = path.join(outdir, packageInfo.name, packageInfo.version);
  }
  fs.mkPath(outdir);

  // copy the template's static files to outdir
  var fromDir = path.join(templatePath, "static");
  var staticFiles = fs.ls(fromDir, 3);

  staticFiles.forEach(function (fileName) {
    var toDir = fs.toDir(fileName.replace(fromDir, outdir));
    fs.mkPath(toDir);
    fs.copyFileSync(fileName, toDir);
  });

  if (sourceFilePaths.length) {
    sourceFiles = shortenPaths(sourceFiles, path.commonPrefix(sourceFilePaths));
  }
  data().each(function (doclet) {
    var url = helper.createLink(doclet);
    helper.registerLink(doclet.longname, url);

    // replace the filename with a shortened version of the full path
    var docletPath;
    if (doclet.meta) {
      docletPath = getPathFromDoclet(doclet);
      docletPath = sourceFiles[docletPath].shortened;
      if (docletPath) {
        doclet.meta.filename = docletPath;
        doclet.meta.sourceUrl = conf["sourceUrl"]
          .replace("{version}", process.env.CESIUM_VERSION)
          .replace("{filename}", docletPath);
        if (process.env.CESIUM_PACKAGES) {
          doclet.meta.package = process.env.CESIUM_PACKAGES.split(",").find(
            (package) => doclet.meta.sourceUrl.indexOf(package) > -1
          );
        }
      }
    }
  });

  data().each(function (doclet) {
    var url = helper.longnameToUrl[doclet.longname];

    if (url.indexOf("#") > -1) {
      doclet.id = helper.longnameToUrl[doclet.longname].split(/#/).pop();
    } else {
      doclet.id = doclet.name;
    }

    if (needsSignature(doclet)) {
      addSignatureParams(doclet);
      addSignatureReturns(doclet);
      addAttribs(doclet);
    }
  });

  // do this after the urls have all been generated
  data().each(function (doclet) {
    doclet.ancestors = getAncestorLinks(doclet);

    if (doclet.kind === "member") {
      addSignatureTypes(doclet);
      addAttribs(doclet);
    }

    if (doclet.kind === "constant") {
      addSignatureTypes(doclet);
      addAttribs(doclet);
      doclet.kind = "member";
    }
  });

  var members = helper.getMembers(data);

  // add template helpers
  view.find = find;
  view.linkto = linkto;
  view.resolveAuthorLinks = resolveAuthorLinks;
  view.tutoriallink = tutoriallink;
  view.htmlsafe = htmlsafe;

  // once for all
  view.nav = buildNav(members);
  attachModuleSymbols(
    find({ kind: ["class", "function"], longname: { left: "module:" } }),
    members.modules
  );

  if (members.globals.length) {
    generate("Global", [{ kind: "globalobj" }], globalUrl);
  }

  // index page displays information from package.json and lists files
  var files = find({ kind: "file" }),
    packages = find({ kind: "package" });

  var origLayout = view.layout;
  view.layout = "indexLayout.tmpl";
  generate(
    "Index",
    packages
      .concat([
        {
          kind: "mainpage",
          readme: opts.readme,
          longname: opts.mainpagetitle ? opts.mainpagetitle : "Main Page",
        },
      ])
      .concat(files),
    indexUrl
  );
  view.layout = origLayout;

  // set up the lists that we'll use to generate pages
  var classes = taffy(members.classes);
  var modules = taffy(members.modules);
  var namespaces = taffy(members.namespaces);
  var globals = taffy(members.globals);

  var typesJson = {};

  Object.keys(helper.longnameToUrl).forEach(function (longname) {
    var items = helper.find(classes, { longname: longname });

    if (!items.length) {
      items = helper.find(modules, { longname: longname });
    }

    if (!items.length) {
      items = helper.find(namespaces, { longname: longname });
    }

    if (!items.length) {
      items = helper.find(globals, { longname: longname });
    }

    if (items.length) {
      var title = items[0].name;
      var filename = helper.longnameToUrl[longname];
      generate(title, items, filename);

      var titleLower = title.toLowerCase();

      typesJson[titleLower] = typesJson[titleLower] || [];
      typesJson[titleLower].push(filename);

      var members = find({ kind: ["function", "member"], memberof: longname });
      members.forEach(function (member) {
        member = member.id;
        var memberLower = member.toLowerCase();
        var firstChar = memberLower.charAt(0);
        if (firstChar === "." || firstChar === "~") {
          memberLower = memberLower.substring(1);
        }

        typesJson[memberLower] = typesJson[memberLower] || [];
        typesJson[memberLower].push(filename + "#" + member);
      });
    }
  });

  fs.writeFileSync(outdir + "/types.txt", JSON.stringify(typesJson), "utf8");
};
