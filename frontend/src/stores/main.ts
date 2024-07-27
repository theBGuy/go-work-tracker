import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { subscribeWithSelector } from "zustand/middleware";
import { main } from "../../wailsjs/go/models";

interface Store {
  organizations: main.Organization[];
  getOrganizations: () => main.Organization[];
  addOrganization: (organization: main.Organization) => void;
  removeOrganization: (organization: main.Organization) => void;
  setOrganizations: (organizations: main.Organization[]) => void;
  selectedOrganization: string;
  getSelectedOrganization: () => string;
  setSelectedOrganization: (organization: string) => void;
  projects: main.Project[];
  getProjects: () => main.Project[];
  addProject: (project: main.Project) => void;
  removeProject: (project: main.Project) => void;
  setProjects: (projects: main.Project[]) => void;
  selectedProject: string;
  getSelectedProject: () => string;
  setSelectedProject: (project: string) => void;
  alertTime: number;
  setAlertTime: (time: number) => void;
  workTime: number;
  setWorkTime: (value: number) => void;
  updateWorkTime: (value: number) => void;
  projectWorkTime: number;
  setProjectWorkTime: (value: number) => void;
  updateProjectWorkTime: (value: number) => void;
  orgWeekTotal: number;
  setOrgWeekTotal: (value: number) => void;
  updateOrgWeekTotal: (value: number) => void;
  orgMonthTotal: number;
  setOrgMonthTotal: (value: number) => void;
  updateOrgMonthTotal: (value: number) => void;
  currentWeek: number;
  setCurrentWeek: (week: number) => void;
}

export const useAppStore = create(
  persist(
    subscribeWithSelector<Store>((set, get) => ({
      organizations: [],
      getOrganizations: () => JSON.parse(JSON.stringify(get().organizations)),
      addOrganization: (organization: main.Organization) => {
        set((state) => ({ organizations: [...state.organizations, organization] }));
      },
      removeOrganization: (organization: main.Organization) => {
        set((state) => ({ organizations: state.organizations.filter((org) => org.name !== organization.name) }));
      },
      setOrganizations: (organizations: main.Organization[]) => {
        set({ organizations });
      },
      selectedOrganization: "",
      getSelectedOrganization: () => get().selectedOrganization,
      setSelectedOrganization: (organization: string) => {
        set({ selectedOrganization: organization });
      },
      projects: [],
      getProjects: () => JSON.parse(JSON.stringify(get().projects)),
      addProject: (project: main.Project) => {
        set((state) => ({ projects: [...state.projects, project] }));
      },
      removeProject: (project: main.Project) => {
        set((state) => ({ projects: state.projects.filter((proj) => proj.name !== project.name) }));
      },
      setProjects: (projects: main.Project[]) => {
        set({ projects });
      },
      selectedProject: "",
      getSelectedProject: () => get().selectedProject,
      setSelectedProject: (project: string) => {
        set({ selectedProject: project });
      },
      alertTime: 30,
      setAlertTime: (time: number) => {
        set({ alertTime: time });
      },
      workTime: 0,
      setWorkTime: (value: number) => set({ workTime: value }),
      updateWorkTime: (value: number) => set((state) => ({ workTime: state.workTime + value })),
      projectWorkTime: 0,
      setProjectWorkTime: (value: number) => set({ projectWorkTime: value }),
      updateProjectWorkTime: (value: number) => set((state) => ({ projectWorkTime: state.projectWorkTime + value })),
      orgWeekTotal: 0,
      setOrgWeekTotal: (value: number) => set({ orgWeekTotal: value }),
      updateOrgWeekTotal: (value: number) => set((state) => ({ orgWeekTotal: state.orgWeekTotal + value })),
      orgMonthTotal: 0,
      setOrgMonthTotal: (value: number) => set({ orgMonthTotal: value }),
      updateOrgMonthTotal: (value: number) => set((state) => ({ orgMonthTotal: state.orgMonthTotal + value })),
      currentWeek: 1,
      setCurrentWeek: (week: number) => set({ currentWeek: week }),
    })),
    {
      name: "store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
