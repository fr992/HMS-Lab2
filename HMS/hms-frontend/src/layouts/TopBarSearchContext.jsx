import { createContext, useContext } from "react";

export const TopBarSearchContext = createContext({
  search: "",
  setSearch: () => {},
  clearSearch: () => {},
});

export function useTopBarSearch() {
  return useContext(TopBarSearchContext);
}
