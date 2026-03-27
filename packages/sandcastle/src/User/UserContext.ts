import { createContext } from "react";
import { IonOAuthClient, UserInfo } from "./IonOAuthClient.ts";

let clientSettings = {
  // TODO: this needs to be extracted to a config file and/or build level definition
  clientId: "1420",
  callbackUrl: "http://localhost:5173/",
};

if (window.location.hostname === "ci-builds.cesium.com") {
  clientSettings = {
    // TODO: this needs to be extracted to a config file and/or build level definition
    // it also won't work for dynamic branch names in CI...
    clientId: "1741",
    callbackUrl:
      "https://ci-builds.cesium.com/cesium/sandcastle-login/Apps/Sandcastle2/index.html",
  };
} else if (window.location.host === "localhost:8080") {
  clientSettings = {
    // TODO: this needs to be extracted to a config file and/or build level definition
    clientId: "1894",
    callbackUrl: "http://localhost:8080/Apps/Sandcastle2/",
  };
}

const ionClient = new IonOAuthClient(clientSettings);
// TODO: bad but want for testing
// @ts-expect-error debugging
window.ionClient = ionClient;

export const initialUserContext = {
  // This is a "last resort" default if not inside the context
  ionClient,
  userInfo: undefined,
  getUserInfo: () => Promise.resolve(undefined),
};

export const UserContext = createContext<{
  ionClient: IonOAuthClient;
  userInfo: UserInfo | undefined;
  getUserInfo: () => Promise<UserInfo | undefined>;
}>(initialUserContext);
