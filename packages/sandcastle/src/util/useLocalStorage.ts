import { useDebugValue, useEffect, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (newValue: T) => void] {
  useDebugValue(key);

  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue) {
      setValue(JSON.parse(storedValue) as T);
    } else {
      window.localStorage.setItem(key, JSON.stringify(initialValue));
    }
  }, [key, initialValue]);

  function updateStorage(newValue: T) {
    window.localStorage.setItem(key, JSON.stringify(newValue));
    setValue(newValue);
  }

  return [value, updateStorage];
}
