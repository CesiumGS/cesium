import { createContext } from "react";
import { IonOAuthClient, UserInfo } from "./IonOAuthClient.ts";

export const initialUserContext = {
  // This is a "last resort" default if not inside the context
  ionClient: undefined,
  userInfo: undefined,
  getUserInfo: () => Promise.resolve(undefined),
};

export const UserContext = createContext<{
  ionClient: IonOAuthClient | undefined;
  userInfo: UserInfo | undefined;
  getUserInfo: () => Promise<UserInfo | undefined>;
}>(initialUserContext);
