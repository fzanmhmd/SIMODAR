import { useState, useCallback, useEffect } from "react";
import { api } from "../api.js";

export function useApiData(path, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const reload = useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    setState((current) => ({
      ...current,
      loading: silent && current.data ? false : true,
      error: "",
    }));
    try {
      setState({ loading: false, data: await api(path), error: "" });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message });
    }
  }, [path]);
  useEffect(() => {
    reload();
  }, deps);
  return { ...state, reload };
}
