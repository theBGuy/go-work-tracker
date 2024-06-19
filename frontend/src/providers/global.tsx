import { useContext, createContext, useState } from "react";
import { main } from "../../wailsjs/go/models";

type GlobalContext = {
  projects: main.Project[];
  setProjects: React.Dispatch<React.SetStateAction<main.Project[]>>;
  organizations: main.Organization[];
  setOrganizations: React.Dispatch<React.SetStateAction<main.Organization[]>>;
};

export const GlobalContext = createContext<GlobalContext>({
  projects: [],
  setProjects: () => {},
  organizations: [],
  setOrganizations: () => {}
});

export default function GlobalProvider ({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<main.Project[]>([]);
  const [organizations, setOrganizations] = useState<main.Organization[]>([]);

  return (
    <GlobalContext.Provider
      value={{
        projects,
        setProjects,
        organizations,
        setOrganizations
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobal = () => useContext(GlobalContext);