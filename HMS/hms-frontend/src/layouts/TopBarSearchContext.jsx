import { createContext, useContext } from "react";

export const TopBarSearchContext = createContext({
  search: "",
  setSearch: () => {},
  clearSearch: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export function useTopBarSearch() {
  return useContext(TopBarSearchContext);
}
