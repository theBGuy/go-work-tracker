import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { subscribeWithSelector } from "zustand/middleware";
import { main } from "@go/models";

interface Store {
  organizations: main.Organization[];
  getOrganizations: () => main.Organization[];
  addOrganization: (organization: main.Organization) => void;
  removeOrganization: (organization: main.Organization) => void;
  setOrganizations: (organizations: main.Organization[]) => void;
  activeOrg: main.Organization | null;
  getActiveOrganization: () => main.Organization | null;
  setActiveOrganization: (organization: main.Organization) => void;
  projects: main.Project[];
  getProjects: () => main.Project[];
  addProject: (project: main.Project) => void;
  removeProject: (project: main.Project) => void;
  setProjects: (projects: main.Project[]) => void;
  activeProj: main.Project | null;
  getActiveProject: () => main.Project | null;
  setActiveProject: (project: main.Project) => void;
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
  projWeekTotal: number;
  setProjWeekTotal: (value: number) => void;
  updateProjWeekTotal: (value: number) => void;
  projMonthTotal: number;
  setProjMonthTotal: (value: number) => void;
  updateProjMonthTotal: (value: number) => void;
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
      activeOrg: null,
      getActiveOrganization: () => get().activeOrg,
      setActiveOrganization: (organization: main.Organization) => {
        set({ activeOrg: organization });
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
      activeProj: null,
      getActiveProject: () => get().activeProj as main.Project,
      setActiveProject: (project: main.Project) => {
        set({ activeProj: project });
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
      projWeekTotal: 0,
      setProjWeekTotal: (value: number) => set({ projWeekTotal: value }),
      updateProjWeekTotal: (value: number) => set((state) => ({ projWeekTotal: state.projWeekTotal + value })),
      projMonthTotal: 0,
      setProjMonthTotal: (value: number) => set({ projMonthTotal: value }),
      updateProjMonthTotal: (value: number) => set((state) => ({ projMonthTotal: state.projMonthTotal + value })),
    })),
    {
      name: "store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
