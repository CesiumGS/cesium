require({
        baseUrl: require.has("host-browser") ? "./" : "./relative/",
        paths: {
            text: "../../text"
        }
    },
    ["require", "foo/bar/one", "doh"],
    function(require, one, doh){
        doh.register(
            "relative",
            [
                function relative(t){
                    t.is("one", one.name);
                    t.is("two", one.twoName);
                    t.is("three", one.threeName);
                    t.is("hello world", one.message.replace(/\n/g, ""));
                }
            ]
        );

        doh.run();
    }
);
