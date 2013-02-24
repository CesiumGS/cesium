define("foo/bar/one",
            ["require", "./two", "../three", "text!./message.txt"],
            function(require, two, three, message){
    return {
        name: "one",
        twoName: two.name,
        threeName: three.name,
        message: message
    };
});
