import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { IonOAuthClient } from "./IonOAuthClient";

const ionClient = new IonOAuthClient({
  clientId: "1420",
  callbackUrl: "http://localhost:5173",
});

export const UserContext = createContext<{
  ionClient: IonOAuthClient;
}>({
  ionClient,
});

export function UserProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line
  const [ionState, setIonState] = useState(ionClient);

  const initStarted = useRef(false);
  useEffect(() => {
    if (!initStarted.current) {
      ionState.init();
      initStarted.current = true;
    }
  }, [ionState]);

  return <UserContext value={{ ionClient: ionState }}>{children}</UserContext>;
}

export default function UserProfile() {
  const userContext = useContext(UserContext);

  return userContext.ionClient.loggedIn ? (
    <div
      onClick={() => userContext.ionClient.signOut()}
      style={{ cursor: "pointer" }}
    >
      {userContext.ionClient.access_token?.slice(0, 10)}...
    </div>
  ) : (
    <div
      onClick={() => userContext.ionClient.signIn()}
      style={{ cursor: "pointer" }}
    >
      Login
    </div>
  );
}
