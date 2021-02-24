exports.defineTags = function (dictionary) {
  dictionary.lookUp("class").synonym("internalConstructor");

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
};
