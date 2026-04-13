import { ReactNode, useEffect, useRef, useState } from "react";
import { UserContext } from "./UserContext.ts";
import { IonOAuthClient, UserInfo } from "./IonOAuthClient.ts";

const clientSettings = __ION_CLIENT_SETTINGS__;
const ionClient = clientSettings
  ? new IonOAuthClient(clientSettings)
  : undefined;

export function UserProvider({ children }: { children: ReactNode }) {
  const initStarted = useRef(false);
  useEffect(() => {
    if (ionClient && !initStarted.current) {
      ionClient.init();
      initStarted.current = true;
    }
  }, []);

  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  async function getUserInfo() {
    if (!ionClient || !ionClient.loggedIn) {
      return;
    }
    if (userInfo) {
      return userInfo;
    }
    const resp: UserInfo = await ionClient.fetch("/v1/me");
    if (!resp.username) {
      return undefined;
    }
    // TODO: remove just testing
    if (Math.random() * 10 > 5) {
      resp.avatar = undefined;
    }
    setUserInfo(resp);
    return resp;
  }

  return (
    <UserContext value={{ ionClient, userInfo, getUserInfo }}>
      {children}
    </UserContext>
  );
}
