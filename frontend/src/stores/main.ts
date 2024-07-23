import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { main } from "../../wailsjs/go/models";

interface Store {
  organizations: main.Organization[];
  addOrganization: (organization: main.Organization) => void;
  removeOrganization: (organization: main.Organization) => void;
  setOrganizations: (organizations: main.Organization[]) => void;
  selectedOrganization: string;
  setSelectedOrganization: (organization: string) => void;
  projects: main.Project[];
  addProject: (project: main.Project) => void;
  removeProject: (project: main.Project) => void;
  setProjects: (projects: main.Project[]) => void;
  selectedProject: string;
  setSelectedProject: (project: string) => void;
}

export const useStore = create(
  persist<Store>(
    (set, get) => ({
      organizations: [],
      addOrganization: (organization: main.Organization) => {
        set((state) => ({ organizations: [...state.organizations, organization] }))
      },
      removeOrganization: (organization: main.Organization) => {
        set((state) => ({ organizations: state.organizations.filter((org) => org.name !== organization.name) }))
      },
      setOrganizations: (organizations: main.Organization[]) => {
        set({ organizations })
      },
      selectedOrganization: "",
      setSelectedOrganization: (organization: string) => {
        set({ selectedOrganization: organization })
      },
      projects: [],
      addProject: (project: main.Project) => {
        set((state) => ({ projects: [...state.projects, project] }))
      },
      removeProject: (project: main.Project) => {
        set((state) => ({ projects: state.projects.filter((proj) => proj.name !== project.name) }))
      },
      setProjects: (projects: main.Project[]) => {
        set({ projects })
      },
      selectedProject: "",
      setSelectedProject: (project: string) => {
        set({ selectedProject: project })
      },
    }),
    {
      name: "store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);