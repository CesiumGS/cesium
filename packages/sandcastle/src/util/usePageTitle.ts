import { useEffect, useState } from "react";

/**
 * Hook to easily update the page title based on the specific Sandcastle that's loaded.
 * Handles adding an asterisk * when the code state is dirty
 */
export function usePageTitle() {
  const [title, setPageTitle] = useState("New Sandcastle");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const host = window.location.host;
    let envString = "";
    if (host.includes("localhost") && host !== "localhost:8080") {
      // this helps differentiate tabs for local sandcastle development or other testing
      envString = `${host.replace("localhost:", "")} `;
    }

    const dirtyIndicator = isDirty ? "*" : "";
    if (title === "" || title === "New Sandcastle") {
      // No need to clutter the window/tab with a name if not viewing a named gallery demo
      document.title = `${envString}Sandcastle${dirtyIndicator} | CesiumJS`;
    } else {
      document.title = `${envString}${title}${dirtyIndicator} | Sandcastle | CesiumJS`;
    }
  }, [title, isDirty]);

  return { setPageTitle, setIsDirty };
}
