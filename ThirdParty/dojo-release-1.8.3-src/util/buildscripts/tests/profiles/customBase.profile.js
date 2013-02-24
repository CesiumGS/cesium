var dependencies = {
  layers: [
    {
      name: "dojo.js",
      //Using the customBase: true property means that the dojo._base is not
      //included by default for dojo.js. Define the _base modules by putting
      //the appropriate _base resource names in the dependencies array below.
      //If no dependencies are listed, then just the basic loader files are
      //included (the appropriate files in _base/_loader).
      customBase: true,
      dependencies: [
      ]
    }
  ]
};