exports.defineTags = function (dictionary) {
  // @internalConstructor defines some formatting options, but otherwise
  // is formatted like a class.
  const classTag = dictionary.lookUp("class");
  const classOnTagged = classTag.onTagged;
  dictionary.defineTag("internalConstructor", {
    onTagged: function (doclet, tag) {
      classOnTagged(doclet, tag);
      doclet.isInternalConstructor = true;
    },
  });

  dictionary
    .defineTag("glsl", {
      onTagged: function (doclet, tag) {
        doclet.addTag("kind", "glsl");
        doclet.filename = doclet.name;
      },
    })
    .synonym("glslStruct")
    .synonym("glslUniform")
    .synonym("glslConstant")
    .synonym("glslFunction");

  dictionary.defineTag("performance", {
    mustHaveValue: true,
    onTagged: function (doclet, tag) {
      if (!doclet.performance) {
        doclet.performance = [];
      }
      doclet.performance.push(tag.value);
    },
  });

  dictionary.defineTag("demo", {
    mustHaveValue: true,
    onTagged: function (doclet, tag) {
      if (!doclet.demo) {
        doclet.demo = [];
      }
      doclet.demo.push(tag.value);
    },
  });

  dictionary.defineTag("experimental", {
    mustHaveValue: true,
    onTagged: function (doclet, tag) {
      if (!doclet.experimental) {
        doclet.experimental = [];
      }
      doclet.experimental.push(tag.value);
    },
  });

  // @privateParam looks just like @param in the code, but is ignored
  // in the output
  dictionary.defineTag("privateParam", {
    canHaveType: true,
    canHaveName: true,
    mustHaveValue: true,
  });
};
