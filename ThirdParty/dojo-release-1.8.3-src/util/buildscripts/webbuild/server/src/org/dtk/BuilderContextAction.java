package org.dtk;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextAction;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Script;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

public class BuilderContextAction implements ContextAction {
    private String builderPath;
    private String version;
    private String cdn;
    private String dependencies;
    private String optimize;

    private Exception exception;
    private Scriptable topScope;
    private Context context;
    private String result;

    public BuilderContextAction(String builderPath, String version, String cdn, String dependencies, String optimize) {
        this.builderPath = builderPath;
        this.version = version;
        this.cdn = cdn;
        this.dependencies = dependencies;
        this.optimize = optimize;

        this.exception = null;
        this.context = null;
        this.topScope = null;
    }

    public Object run(Context newContext) {
        context = newContext;
        context.setOptimizationLevel(-1);

        // Set up standard scripts
        topScope = context.initStandardObjects();

        try {
            String fileName = builderPath + "build.js";
            String fileContent = FileUtil.readFromFile(fileName, null);
            Script script = context.compileString(fileContent, fileName, 1, null);
            
            // Expose top level scope as the "global" scope.
            //TODO: only need this for the load function, maybe there is a built in way
            //to get this.
            ScriptableObject.putProperty(topScope, "global", Context.javaToJS(topScope, topScope));

            // Exec the build script.
            script.exec(context, topScope);

            // Call build.make(builderPath)
            Scriptable build = Context.toObject(topScope.get("build", topScope), topScope);
            Object args[] = {
                    builderPath,
                    version,
                    cdn,
                    dependencies,
                    optimize
            };
            Function make = (Function) build.get("make", topScope);
            Object resultObj = make.call(context, topScope, build, args);
            result = (String) Context.jsToJava(resultObj, String.class); 
        } catch (Exception e) {
            this.exception = e;

        }
        return null;
    }

    public String getResult() {
        return result;
    }

    public Exception getException() {
        return exception;
    }
}
