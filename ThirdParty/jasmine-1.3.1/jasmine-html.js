function getQueryParameter(name) {
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);

    if (match) {
        return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
    return null;
}

jasmine.HtmlReporterHelpers = {};

jasmine.HtmlReporterHelpers.createDom = function(type, attrs, childrenVarArgs) {
  var el = document.createElement(type);

  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];

    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      if (child) {
        el.appendChild(child);
      }
    }
  }

  for (var attr in attrs) {
    if (attr == "className") {
      el[attr] = attrs[attr];
    } else {
      el.setAttribute(attr, attrs[attr]);
    }
  }

  return el;
};

jasmine.HtmlReporterHelpers.getSpecStatus = function(child) {
  var results = child.results();
  var status = results.passed() ? 'passed' : 'failed';
  if (results.skipped) {
    status = 'skipped';
  }

  return status;
};

jasmine.HtmlReporterHelpers.appendToSummary = function(child, childElement) {
  var parentDiv = this.dom.summary;
  var parentSuite = (typeof child.parentSuite == 'undefined') ? 'suite' : 'parentSuite';
  var parent = child[parentSuite];

  if (parent) {
    if (typeof this.views.suites[parent.id] == 'undefined') {
      this.views.suites[parent.id] = new jasmine.HtmlReporter.SuiteView(parent, this.dom, this.views);
    } else if (typeof this.views.suites[parent.id].appendedToSkipped !== 'undefined') {
      // parent was placed in skipped view, remove it and add to non-skipped view.
      var parentView = this.views.suites[parent.id];
      parentView.appendedToSkipped = undefined;
      parentView.element.parentNode.removeChild(parentView.element);
      parentView.appendToSummary(parentView.suite, parentView.element);
    }
    parentDiv = this.views.suites[parent.id].element;
  }

  parentDiv.appendChild(childElement);
};

jasmine.HtmlReporterHelpers.appendToSkipped = function(child, childElement) {
    var parentDiv = this.dom.skipped;
    var parentSuite = (typeof child.parentSuite == 'undefined') ? 'suite' : 'parentSuite';
    var parent = child[parentSuite];

    if (parent) {
      if (typeof this.views.suites[parent.id] == 'undefined') {
        this.views.suites[parent.id] = new jasmine.HtmlReporter.SuiteView(parent, this.dom, this.views, 'skipped');
      }
      parentDiv = this.views.suites[parent.id].element;
    }

    parentDiv.appendChild(childElement);
  };


jasmine.HtmlReporterHelpers.addHelpers = function(ctor) {
  for(var fn in jasmine.HtmlReporterHelpers) {
    ctor.prototype[fn] = jasmine.HtmlReporterHelpers[fn];
  }
};

jasmine.HtmlReporterHelpers.isSuiteFocused = function(suite) {
    var paramMap = [];
    var params = jasmine.HtmlReporter.parameters(window.document);

    for (var i = 0; i < params.length; i++) {
      var p = params[i].split('=');
      paramMap[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
    }

    if (suite.getFullName() === paramMap.spec) {
	  return true;
    }

    var categories;
    if (typeof paramMap.category !== 'undefined') {
      categories = paramMap.category.split(',');
    }

    if (typeof categories !== 'undefined' && typeof suite.categories !== 'undefined') {
      for (var i = 0; i < categories.length; i++) {
        if (suite.categories.indexOf(categories[i]) !== -1) {
          return true;
        }
      }
    }

    var parentSuite = suite.parentSuite;
    while (parentSuite) {
      if (parentSuite.getFullName() === paramMap.spec) {
        return true;
      }

      if (typeof categories !== 'undefined' && typeof parentSuite.categories !== 'undefined') {
        for (var i = 0; i < categories.length; i++) {
          if (parentSuite.categories.indexOf(categories[i]) !== -1) {
            return true;
          }
        }
      }
      parentSuite = parentSuite.parentSuite;
    }

    var childSpecs = suite.specs();
    for (var i = 0, len = childSpecs.length; i < len; i++) {
      if (childSpecs[i].getFullName() === paramMap.spec) {
	    return true;
	  }
      if (typeof categories !== 'undefined' && typeof childSpecs[i].suite.categories !== 'undefined') {
        for (var j = 0; j < categories.length; j++) {
    	  if (childSpecs[i].suite.categories.indexOf(categories[j]) !== -1) {
	    return true;
	  }
        }
      }

      if (typeof categories !== 'undefined' && typeof childSpecs[i].categories !== 'undefined') {
        for (var j = 0; j < categories.length; j++) {
	  if (childSpecs[i].categories.indexOf(categories[j]) !== -1) {
	    return true;
	  }
        }
      }
    }

    var childSuites = suite.suites();
    for (i = 0, len = childSuites.length; i < len; i++) {
      if (jasmine.HtmlReporterHelpers.isSuiteFocused(childSuites[i])) {
        return true;
      }
    }

    return false;
  };

jasmine.HtmlReporter = function(_doc) {
  var self = this;
  var doc = _doc || window.document;

  var reporterView;

  var dom = {};

  // Jasmine Reporter Public Interface
  self.logRunningSpecs = false;

  self.reportRunnerStarting = function(runner) {
    var specs = runner.specs() || [];

    if (specs.length == 0) {
      return;
    }

    createReporterDom(runner.env.versionString());
    doc.body.appendChild(dom.reporter);
    setExceptionHandling();

    var params = '';
    if (getQueryParameter('built')) {
        params += '&built=true';
    }
    if (getQueryParameter('release')) {
        params += '&release=true';
    }

    var runButton = document.getElementById('runButton');
    runButton.onclick = function() {
      if (document.getElementById('no_try_catch').checked) {
        window.location.search = searchWithCatch();
    	return false;
      }

	  var select = document.getElementById('categorySelect');
      if (document.getElementById('categoryException').checked) {
        top.location.href = '?category=All&not=' + encodeURIComponent(select.options[select.selectedIndex].value) + params;
        return false;
      }
      top.location.href = '?category=' + encodeURIComponent(select.options[select.selectedIndex].value) + params;
      return false;
    }

    var runCoverageButton = document.getElementById('runCoverageButton');
    runCoverageButton.onclick = function() {
	  var baseInstrumentUrl = '../Instrumented/jscoverage.html?../Specs/SpecRunner.html' +
            window.encodeURIComponent('?baseUrl=../Instrumented');

      var select = document.getElementById('categorySelect');
	  if (document.getElementById('categoryException').checked) {
        top.location.href = baseInstrumentUrl + window.encodeURIComponent('&category=All&not=' + select.options[select.selectedIndex].value) + params;
        return false;
      }
      top.location.href = baseInstrumentUrl + window.encodeURIComponent('&category=' + select.options[select.selectedIndex].value) + params;
	  return false;
    }

    reporterView = new jasmine.HtmlReporter.ReporterView(dom);
    reporterView.addSpecs(specs, self.specFilter);
  };

  self.reportRunnerResults = function(runner) {
    reporterView && reporterView.complete();
  };

  self.reportSuiteResults = function(suite) {
    reporterView.suiteComplete(suite);
  };

  self.reportSpecStarting = function(spec) {
    if (self.logRunningSpecs) {
      self.log('>> Jasmine Running ' + spec.suite.description + ' ' + spec.description + '...');
    }
	var now = Date.now();
	spec.startTime = now;
	if (typeof spec.suite.startTime === 'undefined') {
	  spec.suite.startTime = now;
	}
  };

  self.reportSpecResults = function(spec) {
    reporterView.specComplete(spec);
  };

  self.log = function() {
    var console = jasmine.getGlobal().console;
    if (console && console.log) {
      if (console.log.apply) {
        console.log.apply(console, arguments);
      } else {
        console.log(arguments); // ie fix: console.log.apply doesn't exist on ie
      }
    }
  };

  self.specFilter = function(spec) {
	var paramMap = [];
    var params = jasmine.HtmlReporter.parameters(doc);

    for (var i = 0; i < params.length; i++) {
      var p = params[i].split('=');
      paramMap[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
    }

    var focusedSpecName = getFocusedSpecName();
    var focusedCategories = getFocusedCategories();

    if (!focusedSpecName && !focusedCategories) {
      return true;
    }

    if (focusedSpecName && focusedCategories && !spec.categories) {
      return false;
    }

    var i, matchedCategory = false;

    if (focusedCategories && focusedCategories.indexOf('All') !== -1) {

      if (typeof spec.categories !== 'undefined') {
        if (paramMap.not && spec.categories.indexOf(paramMap.not) !== -1) {
          return false;
        }
      }

      if (typeof spec.suite.categories !== 'undefined') {
        if (paramMap.not && spec.suite.categories.indexOf(paramMap.not) !== -1) {
          return false;
        }
      }

      return true;
    }

    if (focusedCategories && typeof spec.categories !== 'undefined') {
	  for (i = 0 ; i < focusedCategories.length; i++) {
        if (spec.categories.indexOf(focusedCategories[i]) !== -1) {
          matchedCategory = true;
          break;
        }
      }

      if (focusedSpecName) {
        return (spec.getFullName().indexOf(focusedSpecName) === 0) && matchedCategory;
      }

      return matchedCategory;
    }

    if (focusedCategories && typeof spec.suite.categories !== 'undefined') {
      for (i = 0 ; i < focusedCategories.length; i++) {
	    if (spec.suite.categories.indexOf(focusedCategories[i]) !== -1) {
	      matchedCategory = true;
	      break;
	    }
      }
      return matchedCategory;
    }

    if (spec.getFullName() === focusedSpecName) {
        return true;
    }

    var suite = spec.suite;
    while (suite) {
        if (suite.getFullName() === focusedSpecName) {
            return true;
        }
        suite = suite.parentSuite;
    }

    return false;
  };

  return self;

  function getFocusedCategories() {
    var categoryNames;

    (function memoizeFocusedSpec() {
      if (categoryNames) {
        return;
      }

      var paramMap = [];
      var params = jasmine.HtmlReporter.parameters(doc);

      for (var i = 0; i < params.length; i++) {
        var p = params[i].split('=');
        paramMap[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
      }

      categoryNames = paramMap.category;
    })();

    if (typeof categoryNames !== 'undefined') {
      return categoryNames.split(',');
    }
    return categoryNames;
  }

  function getFocusedSpecName() {
    var specName;

    (function memoizeFocusedSpec() {
      if (specName) {
        return;
      }

      var paramMap = [];
      var params = jasmine.HtmlReporter.parameters(doc);

      for (var i = 0; i < params.length; i++) {
        var p = params[i].split('=');
        paramMap[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
      }

      specName = paramMap.spec;
    })();

    return specName;
  }

  function createReporterDom(version) {
    dom.reporter = self.createDom('div', { id: 'HTMLReporter', className: 'jasmine_reporter' },
      dom.banner = self.createDom('div', { className: 'banner' },
        self.createDom('span', { className: 'title' }, "Jasmine "),
        self.createDom('span', { className: 'version' }, version)),

      //dom.symbolSummary = self.createDom('ul', {className: 'symbolSummary'}),
      dom.alert = self.createDom('div', {className: 'alert'},
        self.createDom('div', {className: 'progressContainer'},
        dom.progress = self.createDom('div', {className: 'progressBar', style: 'width: 0%'})),
        dom.exceptions = self.createDom('span', { className: 'exceptions' },
          self.createDom('label', { className: 'label', 'for': 'no_try_catch' }, 'No try/catch'),
          self.createDom('input', { id: 'no_try_catch', type: 'checkbox' }),
          self.createDom('input', { type: 'button', value: 'run', id: 'runButton'}),
          self.createDom('input',  { type: 'button', value: 'run with coverage', id: 'runCoverageButton' }))),
      dom.results = self.createDom('div', {className: 'results'},
        dom.summary = self.createDom('div', { className: 'summary' }),
        dom.details = self.createDom('div', { id: 'details' }),
        dom.skipped = self.createDom('div', { id: 'skipped', className: 'summary' }))
    );
  }

  function noTryCatch() {
    return window.location.search.match(/catch=false/);
  }

  function searchWithCatch() {
    var params = jasmine.HtmlReporter.parameters(window.document);
    var removed = false;
    var i = 0;

    while (!removed && i < params.length) {
      if (params[i].match(/catch=/)) {
        params.splice(i, 1);
        removed = true;
      }
      i++;
    }
    if (jasmine.CATCH_EXCEPTIONS) {
      params.push("catch=false");
    }

    return params.join("&");
  }

  function setExceptionHandling() {
    var chxCatch = document.getElementById('no_try_catch');

    if (noTryCatch()) {
      chxCatch.setAttribute('checked', true);
      jasmine.CATCH_EXCEPTIONS = false;
    }
  }
};
jasmine.HtmlReporter.parameters = function(doc) {
  var paramStr = doc.location.search.substring(1);
  var params = [];

  if (paramStr.length > 0) {
    params = paramStr.split('&');
  }
  return params;
}
jasmine.HtmlReporter.sectionLink = function(sectionName) {
  var link = '?';
  var params = [];

  if (sectionName) {
    params.push('spec=' + encodeURIComponent(sectionName));
  }
  if (!jasmine.CATCH_EXCEPTIONS) {
    params.push("catch=false");
  }
  if (getQueryParameter('built')) {
      params.push('built=true');
  }
  if (getQueryParameter('release')) {
      params.push('release=true');
  }
  if (params.length > 0) {
    link += params.join("&");
  }

  return link;
};
jasmine.HtmlReporterHelpers.addHelpers(jasmine.HtmlReporter);
jasmine.HtmlReporter.ReporterView = function(dom) {
  this.startedAt = new Date();
  this.runningSpecCount = 0;
  this.completeSpecCount = 0;
  this.passedCount = 0;
  this.failedCount = 0;
  this.skippedCount = 0;

  this.createResultsMenu = function() {
    this.resultsMenu = this.createDom('span', {className: 'resultsMenu bar'},
      'View: ',
      this.summaryMenuItem = this.createDom('a', {className: 'summaryMenuItem', href: "#"}, '0 specs'),
      ' | ',
      this.detailsMenuItem = this.createDom('a', {className: 'detailsMenuItem', href: "#"}, '0 failing'),
      ' | ',
      this.skippedMenuItem = this.createDom('a', {className: 'skippedMenuItem', href: "#"}, '0 skipped'));

    this.summaryMenuItem.onclick = function() {
      showSpecs();
      return false;  // Don't append a # to the URL in the address bar.
    };

    this.detailsMenuItem.onclick = function() {
      showDetails();
      return false;  // Don't append a # to the URL in the address bar.
    };

    this.skippedMenuItem.onclick = function() {
      showSkipped();
      return false;  // Don't append a # to the URL in the address bar.
    };
  };

  this.categories = [];

  function getCurrentCategoryName() {
    var paramMap = [];
    var params = jasmine.HtmlReporter.parameters(window.document);

    for (var i = 0; i < params.length; i++) {
      var p = params[i].split('=');
      paramMap[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
    }

    var categoryNames = paramMap.category;

    if (typeof categoryNames === 'undefined') {
      return 'All';
    }

	if (typeof paramMap.not !== 'undefined') {
      return paramMap.not;
    }

    return categoryNames.split(',')[0];
  }

  this.createCategoryMenu = function() {
    this.categoryMenu = this.createDom('span', {className: 'categoryMenu'}, 'Category: ',
      this.categorySelect = this.createDom('select', {id: 'categorySelect'},
      this.createDom('option', {value: 'All'}, 'All')), 'Run all but selected:',
      this.categoryException = this.createDom('input', {type: 'checkbox', id: 'categoryException'}))

    for (var i = 0; i < this.categories.length; i++) {
      this.categorySelect.appendChild(this.createDom('option', {value: this.categories[i]}, this.categories[i]));
    }

    var currentCategoryName = getCurrentCategoryName();

    for (var i = 0; i < this.categorySelect.options.length; i++) {
      if (this.categorySelect.options[i].value === currentCategoryName) {
        this.categorySelect.selectedIndex = i;
    	if (window.location.search.match(/not=/)) {
    	  this.categoryException.checked = true;
    	}
    	break;
      }
    }
    dom.exceptions.insertBefore(this.categoryMenu, dom.exceptions.getElementsByTagName('input')[0].nextSibling);
  }

  this.addSpecs = function(specs, specFilter) {
    this.totalSpecCount = specs.length;

    this.views = {
      specs: {},
      suites: {}
    };

    for (var i = 0; i < specs.length; i++) {
      var spec = specs[i];
      this.views.specs[spec.id] = new jasmine.HtmlReporter.SpecView(spec, dom, this.views);
      if (specFilter(spec)) {
        this.runningSpecCount++;
      }

      if (typeof spec.categories !== 'undefined') {
        for (var j = 0; j < spec.categories.length; j++) {
          if (this.categories.indexOf(spec.categories[j]) === -1) {
            this.categories.push(spec.categories[j]);
          }
        }
      }

      if (typeof spec.suite.categories !== 'undefined') {
        for (var j = 0; j < spec.suite.categories.length; j++) {
          if (this.categories.indexOf(spec.suite.categories[j]) === -1) {
            this.categories.push(spec.suite.categories[j]);
          }
        }
      }
    }
  };

  this.specComplete = function(spec) {
    this.completeSpecCount++;

	if (typeof spec.startTime !== 'undefined') {
	  spec.stopTime = Date.now();
	  spec.runTime = spec.stopTime - spec.startTime;
	}

    if (isUndefined(this.views.specs[spec.id])) {
      this.views.specs[spec.id] = new jasmine.HtmlReporter.SpecView(spec, dom);
    }

    var specView = this.views.specs[spec.id];
    var name = encodeURIComponent(spec.getFullName());

    var runTime = '', status = specView.status();
    if (isDefined(spec.runTime)) {
      runTime = ' (' + (spec.runTime / 1000) + 's)';
    }
    if (status === 'skipped') {
      runTime += ' (skipped)';
      specView.summary.className += " specSkipped";
    }

    var params = '';
    if (getQueryParameter('built')) {
        params += '&built=true';
    }
    if (getQueryParameter('release')) {
        params += '&release=true';
    }

    specView.summary.appendChild(this.createDom('span', {className: 'specTime'},
        this.createDom('a', {className: 'run_spec', href: '?spec=' + name + params, target: '_top'}, 'run'),
        this.createDom('a', {className: 'run_spec', href: '../Instrumented/jscoverage.html?../Specs/SpecRunner.html' +
            window.encodeURIComponent('?baseUrl=../Instrumented&spec=' + name) + params, target: '_top' }, "coverage"),
        this.createDom('a', {className: 'run_spec', href: '?spec=' + name + '&debug=' + name + params, target: '_top'}, 'debug'),
        runTime));

    switch (status) {
      case 'passed':
        this.passedCount++;
        break;

      case 'failed':
        this.failedCount++;
        break;

      case 'skipped':
        this.skippedCount++;
        break;
    }

    specView.refresh();
    this.refresh();
  };

  this.suiteComplete = function(suite) {
    var suiteView = this.views.suites[suite.id];

	if (typeof suite.startTime !== 'undefined') {
	  suite.stopTime = Date.now();
	  suite.runTime = suite.stopTime - suite.startTime;
	}

    if (isUndefined(suiteView)) {
      return;
    }

    var runTime = '';
    if (isDefined(suite.runTime)) {
      runTime = ' (' + (suite.runTime / 1000) + 's)';
    }

    var params = '';
    if (getQueryParameter('built')) {
        params += '&built=true';
    }
    if (getQueryParameter('release')) {
        params += '&release=true';
    }

	var name = encodeURIComponent(suite.getFullName());
	suiteView.element.insertBefore(this.createDom('span', {className: 'suiteTime'},
      this.createDom('a', {className: 'run_spec', href: '?spec=' + name + params, target: '_top'}, 'run'),
	  this.createDom('a', {className: 'run_spec', href: '../Instrumented/jscoverage.html?../Specs/SpecRunner.html' +
                window.encodeURIComponent('?baseUrl=../Instrumented&spec=' + name) + params, target: '_top' }, "coverage"),
	runTime), suiteView.element.getElementsByTagName('a')[2].nextSibling);

	if (suite.beforeSpec_ && !suite.beforeSpec_.results().passed()) {
        var beforeSpecView = new jasmine.HtmlReporter.SpecView(suite.beforeSpec_, dom, this.views);
        this.failedCount++;
        beforeSpecView.refresh();
    }
    if (suite.afterSpec_ && !suite.afterSpec_.results().passed()) {
        var afterSpecView = new jasmine.HtmlReporter.SpecView(suite.afterSpec_, dom, this.views);
        this.failedCount++;
        afterSpecView.refresh();
    }

    suiteView.refresh();
  };

  this.refresh = function() {

    if (isUndefined(this.resultsMenu)) {
      this.createResultsMenu();
      dom.reporter.insertBefore(this.resultsMenu, dom.results);
    }

	if (isUndefined(this.categoryMenu)) {
	  this.createCategoryMenu();
	}

    // currently running UI
    if (isUndefined(this.runningAlert)) {
      this.runningAlert = this.createDom('a', { href: jasmine.HtmlReporter.sectionLink(), className: "runningAlert bar" });
      dom.alert.appendChild(this.runningAlert);
    }
    this.runningAlert.innerHTML = "Running " + this.completeSpecCount + " of " + specPluralizedFor(this.totalSpecCount);
	dom.progress.style.width = (100 * this.completeSpecCount / this.totalSpecCount) + '%';
	if (this.completeSpecCount === this.totalSpecCount) {
		dom.progress.style.display = 'none';
	}

    // skipped specs UI
    if (isUndefined(this.skippedAlert)) {
      this.skippedAlert = this.createDom('a', { href: jasmine.HtmlReporter.sectionLink(), className: "skippedAlert bar" });
    }

    this.skippedAlert.innerHTML = "Skipping " + this.skippedCount + " of " + specPluralizedFor(this.totalSpecCount) + " - run all";

    if (this.skippedCount === 1 && isDefined(dom.alert)) {
      dom.alert.appendChild(this.skippedAlert);
    }

    // passing specs UI
    if (isUndefined(this.passedAlert)) {
      this.passedAlert = this.createDom('span', { href: jasmine.HtmlReporter.sectionLink(), className: "passingAlert bar" });
    }
    this.passedAlert.innerHTML = "Passing " + specPluralizedFor(this.passedCount);

    // failing specs UI
    if (isUndefined(this.failedAlert)) {
      this.failedAlert = this.createDom('span', {href: "?", className: "failingAlert bar"});
    }
    this.failedAlert.innerHTML = "Failing " + specPluralizedFor(this.failedCount);

    if (this.failedCount === 1 && isDefined(dom.alert)) {
      dom.alert.appendChild(this.failedAlert);
    }

    // summary info
    this.summaryMenuItem.innerHTML = "" + specPluralizedFor(this.runningSpecCount) + ' summary';
    this.detailsMenuItem.innerHTML = "" + this.failedCount + ' failing';
    this.skippedMenuItem.innerHTML = "" + this.skippedCount + ' skipped';
  };

  this.complete = function() {
    dom.alert.removeChild(this.runningAlert);

    this.skippedAlert.innerHTML = "Ran " + this.runningSpecCount + " of " + specPluralizedFor(this.totalSpecCount) + " - run all";

    if (this.failedCount === 0 && this.passedCount === 0) {
      showSkipped();
    } else if (this.failedCount === 0) {
      dom.alert.appendChild(this.createDom('span', {className: 'passingAlert bar'}, "Passing " + specPluralizedFor(this.passedCount)));
    } else {
      showDetails();
    }

    dom.banner.appendChild(this.createDom('span', {className: 'duration'}, "finished in " + ((new Date().getTime() - this.startedAt.getTime()) / 1000) + "s"));
  };

  return this;

  function showSpecs() {
    dom.reporter.className = dom.reporter.className.replace(/ showDetails/g, '').replace(/ showSkipped/g, '');
  }

  function showDetails() {
      if (dom.reporter.className.search(/showDetails/) === -1) {
        dom.reporter.className = dom.reporter.className.replace(/ showSkipped/g, '');
        dom.reporter.className += " showDetails";
      }
    }

  function showSkipped() {
      if (dom.reporter.className.search(/showSkipped/) === -1) {
        dom.reporter.className = dom.reporter.className.replace(/ showDetails/g, '');
        dom.reporter.className += " showSkipped";
      }
    }

  function isUndefined(obj) {
    return typeof obj === 'undefined';
  }

  function isDefined(obj) {
    return !isUndefined(obj);
  }

  function specPluralizedFor(count) {
    var str = count + " spec";
    if (count > 1) {
      str += "s"
    }
    return str;
  }

};

jasmine.HtmlReporterHelpers.addHelpers(jasmine.HtmlReporter.ReporterView);


jasmine.HtmlReporter.SpecView = function(spec, dom, views) {
  this.spec = spec;
  this.dom = dom;
  this.views = views;

  //this.symbol = this.createDom('li', { className: 'pending' });
  //this.dom.symbolSummary.appendChild(this.symbol);

  this.summary = this.createDom('div', { className: 'specSummary' },
    this.createDom('a', {
      className: 'description',
      href: jasmine.HtmlReporter.sectionLink(this.spec.getFullName()),
      title: this.spec.getFullName()
    }, this.spec.description)
  );

  this.detail = this.createDom('div', { className: 'specDetail' },
      this.detailLink = this.createDom('a', {
        className: 'description',
        //href: '?spec=' + encodeURIComponent(this.spec.getFullName()),
        href: '#',
        title: 'Show summary'
      }, this.spec.getFullName() + ' (show summary)')
  );

  var summary = this.summary;
  this.detailLink.onclick = function () {
      //from showSpecs()
      dom.reporter.className = dom.reporter.className.replace(/ showDetails/g, '').replace(/ showSkipped/g, '');

      var rect = summary.getBoundingClientRect();
      window.scrollTo(rect.left, rect.top);
      return false;
  };
};

jasmine.HtmlReporter.SpecView.prototype.status = function() {
  return this.getSpecStatus(this.spec);
};

jasmine.HtmlReporter.SpecView.prototype.refresh = function() {
  //this.symbol.className = this.status();

  switch (this.status()) {
    case 'skipped':
      this.appendToSkipped(this.spec, this.summary);
      break;

    case 'passed':
      this.appendSummaryToSuiteDiv();
      break;

    case 'failed':
      this.appendSummaryToSuiteDiv();
      this.appendFailureDetail();
      break;
  }
};

jasmine.HtmlReporter.SpecView.prototype.appendSummaryToSuiteDiv = function() {
  this.summary.className += ' ' + this.status();
  this.appendToSummary(this.spec, this.summary);
};

jasmine.HtmlReporter.SpecView.prototype.appendFailureDetail = function() {
  this.detail.className += ' ' + this.status();

  var resultItems = this.spec.results().getItems();
  var messagesDiv = this.createDom('div', { className: 'messages' });

  for (var i = 0; i < resultItems.length; i++) {
    var result = resultItems[i];

    if (result.type == 'log') {
      messagesDiv.appendChild(this.createDom('div', {className: 'resultMessage log'}, result.toString()));
    } else if (result.type == 'expect' && result.passed && !result.passed()) {
      messagesDiv.appendChild(this.createDom('div', {className: 'resultMessage fail'}, result.message));

      if (result.trace.stack) {
        messagesDiv.appendChild(this.createDom('div', {className: 'stackTrace'}, result.trace.stack));
      }
    }
  }

  if (messagesDiv.childNodes.length > 0) {
    this.detail.appendChild(messagesDiv);
    this.dom.details.appendChild(this.detail);
  }
};

jasmine.HtmlReporterHelpers.addHelpers(jasmine.HtmlReporter.SpecView);

jasmine.HtmlReporter.SuiteView = function(suite, dom, views, skipped) {
  this.suite = suite;
  this.dom = dom;
  this.views = views;

  var collapser, expander;

  this.element = this.createDom('div', { className: 'suite' + (jasmine.HtmlReporterHelpers.isSuiteFocused(suite) ? '' : ' collapse') },
    expander = this.createDom('a', {className: 'expander'}, '[+]'),
	collapser = this.createDom('a', {className: 'collapser'}, '[-]'),
    this.createDom('a', { className: 'description', href: jasmine.HtmlReporter.sectionLink(this.suite.getFullName()) }, this.suite.description)
  );

	expander.onclick = (function(suiteDiv) {
		return function() {
			var classes = suiteDiv.className.split(' ');
			for (var i = classes.length - 1; i >= 0; i--) {
				if (classes[i] == 'collapse') {
					classes.splice(i, 1);
				}
			}
			suiteDiv.className = classes.join(' ');
		};
	}(this.element));

	collapser.onclick = (function(suiteDiv) {
		return function() {
			suiteDiv.className += ' collapse';
		};
	}(this.element));

  if (typeof skipped !== 'undefined') {
    this.appendedToSkipped = true;
    this.appendToSkipped(this.suite, this.element);
  } else {
    this.appendToSummary(this.suite, this.element);
  }
};

jasmine.HtmlReporter.SuiteView.prototype.status = function() {
  return this.getSpecStatus(this.suite);
};

jasmine.HtmlReporter.SuiteView.prototype.refresh = function() {
  this.element.className += " " + this.status();
};

jasmine.HtmlReporterHelpers.addHelpers(jasmine.HtmlReporter.SuiteView);

/* @deprecated Use jasmine.HtmlReporter instead
 */
jasmine.TrivialReporter = function(doc) {
  this.document = doc || document;
  this.suiteDivs = {};
  this.logRunningSpecs = false;
};

jasmine.TrivialReporter.prototype.createDom = function(type, attrs, childrenVarArgs) {
  var el = document.createElement(type);

  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];

    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      if (child) { el.appendChild(child); }
    }
  }

  for (var attr in attrs) {
    if (attr == "className") {
      el[attr] = attrs[attr];
    } else {
      el.setAttribute(attr, attrs[attr]);
    }
  }

  return el;
};

jasmine.TrivialReporter.prototype.reportRunnerStarting = function(runner) {
  var showPassed, showSkipped;

  this.outerDiv = this.createDom('div', { id: 'TrivialReporter', className: 'jasmine_reporter' },
      this.createDom('div', { className: 'banner' },
        this.createDom('div', { className: 'logo' },
            this.createDom('span', { className: 'title' }, "Jasmine"),
            this.createDom('span', { className: 'version' }, runner.env.versionString())),
        this.createDom('div', { className: 'options' },
            "Show ",
            showPassed = this.createDom('input', { id: "__jasmine_TrivialReporter_showPassed__", type: 'checkbox' }),
            this.createDom('label', { "for": "__jasmine_TrivialReporter_showPassed__" }, " passed "),
            showSkipped = this.createDom('input', { id: "__jasmine_TrivialReporter_showSkipped__", type: 'checkbox' }),
            this.createDom('label', { "for": "__jasmine_TrivialReporter_showSkipped__" }, " skipped")
            )
          ),

      this.runnerDiv = this.createDom('div', { className: 'runner running' },
          this.createDom('a', { className: 'run_spec', href: '?' }, "run all"),
          this.runnerMessageSpan = this.createDom('span', {}, "Running..."),
          this.finishedAtSpan = this.createDom('span', { className: 'finished-at' }, ""))
      );

  this.document.body.appendChild(this.outerDiv);

  var suites = runner.suites();
  for (var i = 0; i < suites.length; i++) {
    var suite = suites[i];
    var suiteDiv = this.createDom('div', { className: 'suite' },
        this.createDom('a', { className: 'run_spec', href: '?spec=' + encodeURIComponent(suite.getFullName()) }, "run"),
        this.createDom('a', { className: 'description', href: '?spec=' + encodeURIComponent(suite.getFullName()) }, suite.description));
    this.suiteDivs[suite.id] = suiteDiv;
    var parentDiv = this.outerDiv;
    if (suite.parentSuite) {
      parentDiv = this.suiteDivs[suite.parentSuite.id];
    }
    parentDiv.appendChild(suiteDiv);
  }

  this.startedAt = new Date();

  var self = this;
  showPassed.onclick = function(evt) {
    if (showPassed.checked) {
      self.outerDiv.className += ' show-passed';
    } else {
      self.outerDiv.className = self.outerDiv.className.replace(/ show-passed/, '');
    }
  };

  showSkipped.onclick = function(evt) {
    if (showSkipped.checked) {
      self.outerDiv.className += ' show-skipped';
    } else {
      self.outerDiv.className = self.outerDiv.className.replace(/ show-skipped/, '');
    }
  };
};

jasmine.TrivialReporter.prototype.reportRunnerResults = function(runner) {
  var results = runner.results();
  var className = (results.failedCount > 0) ? "runner failed" : "runner passed";
  this.runnerDiv.setAttribute("class", className);
  //do it twice for IE
  this.runnerDiv.setAttribute("className", className);
  var specs = runner.specs();
  var specCount = 0;
  for (var i = 0; i < specs.length; i++) {
    if (this.specFilter(specs[i])) {
      specCount++;
    }
  }
  var message = "" + specCount + " spec" + (specCount == 1 ? "" : "s" ) + ", " + results.failedCount + " failure" + ((results.failedCount == 1) ? "" : "s");
  message += " in " + ((new Date().getTime() - this.startedAt.getTime()) / 1000) + "s";
  this.runnerMessageSpan.replaceChild(this.createDom('a', { className: 'description', href: '?'}, message), this.runnerMessageSpan.firstChild);

  this.finishedAtSpan.appendChild(document.createTextNode("Finished at " + new Date().toString()));
};

jasmine.TrivialReporter.prototype.reportSuiteResults = function(suite) {
  var results = suite.results();
  var status = results.passed() ? 'passed' : 'failed';
  if (results.totalCount === 0) { // todo: change this to check results.skipped
    status = 'skipped';
  }
  this.suiteDivs[suite.id].className += " " + status;
};

jasmine.TrivialReporter.prototype.reportSpecStarting = function(spec) {
  if (this.logRunningSpecs) {
    this.log('>> Jasmine Running ' + spec.suite.description + ' ' + spec.description + '...');
  }
};

jasmine.TrivialReporter.prototype.reportSpecResults = function(spec) {
  var results = spec.results();
  var status = results.passed() ? 'passed' : 'failed';
  if (results.skipped) {
    status = 'skipped';
  }
  var specDiv = this.createDom('div', { className: 'spec '  + status },
      this.createDom('a', { className: 'run_spec', href: '?spec=' + encodeURIComponent(spec.getFullName()) }, "run"),
      this.createDom('a', {
        className: 'description',
        href: '?spec=' + encodeURIComponent(spec.getFullName()),
        title: spec.getFullName()
      }, spec.description));


  var resultItems = results.getItems();
  var messagesDiv = this.createDom('div', { className: 'messages' });
  for (var i = 0; i < resultItems.length; i++) {
    var result = resultItems[i];

    if (result.type == 'log') {
      messagesDiv.appendChild(this.createDom('div', {className: 'resultMessage log'}, result.toString()));
    } else if (result.type == 'expect' && result.passed && !result.passed()) {
      messagesDiv.appendChild(this.createDom('div', {className: 'resultMessage fail'}, result.message));

      if (result.trace.stack) {
        messagesDiv.appendChild(this.createDom('div', {className: 'stackTrace'}, result.trace.stack));
      }
    }
  }

  if (messagesDiv.childNodes.length > 0) {
    specDiv.appendChild(messagesDiv);
  }

  this.suiteDivs[spec.suite.id].appendChild(specDiv);
};

jasmine.TrivialReporter.prototype.log = function() {
  var console = jasmine.getGlobal().console;
  if (console && console.log) {
    if (console.log.apply) {
      console.log.apply(console, arguments);
    } else {
      console.log(arguments); // ie fix: console.log.apply doesn't exist on ie
    }
  }
};

jasmine.TrivialReporter.prototype.getLocation = function() {
  return this.document.location;
};

jasmine.TrivialReporter.prototype.specFilter = function(spec) {
  var paramMap = {};
  var params = this.getLocation().search.substring(1).split('&');
  for (var i = 0; i < params.length; i++) {
    var p = params[i].split('=');
    paramMap[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
  }

  if (!paramMap.spec) {
    return true;
  }
  return spec.getFullName().indexOf(paramMap.spec) === 0;
};
