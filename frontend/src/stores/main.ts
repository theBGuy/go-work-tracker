import { main } from "@go/models";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";

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
  setActiveInfo: (organization: main.Organization, project: main.Project) => void;
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
  setProjWorkTimeTotals: (dayTime: number, weekTime: number, monthTime: number) => void;
  setOrgWorkTimeTotals: (dayTime: number, weekTime: number, monthTime: number) => void;
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
        const current = get().organizations;
        const hasChanged =
          current.length !== organizations.length ||
          current.some(
            (o, i) =>
              o.name !== organizations[i].name ||
              o.id !== organizations[i].id ||
              o.favorite !== organizations[i].favorite
          );
        if (!hasChanged) return;
        set({ organizations });
      },
      activeOrg: null,
      getActiveOrganization: () => get().activeOrg,
      setActiveOrganization: (organization: main.Organization) => {
        if (organization === get().activeOrg) return;
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
        const current = get().projects;
        const hasChanged =
          current.length !== projects.length ||
          current.some(
            (p, i) => p.name !== projects[i].name || p.id !== projects[i].id || p.favorite !== projects[i].favorite
          );
        if (!hasChanged) return;
        set({ projects });
      },
      activeProj: null,
      getActiveProject: () => get().activeProj as main.Project,
      setActiveProject: (project: main.Project) => {
        if (project === get().activeProj) return;
        set({ activeProj: project });
      },
      setActiveInfo: (organization: main.Organization, project: main.Project) => {
        set(() => ({
          activeOrg: organization,
          activeProj: project,
        }));
      },
      alertTime: 30,
      setAlertTime: (time: number) => {
        if (time === get().alertTime) return;
        set({ alertTime: time });
      },
      workTime: 0,
      setWorkTime: (value: number) => {
        if (value === get().workTime) return;
        set({ workTime: value });
      },
      updateWorkTime: (value: number) => set((state) => ({ workTime: state.workTime + value })),
      projectWorkTime: 0,
      setProjectWorkTime: (value: number) => {
        if (value === get().projectWorkTime) return;
        set({ projectWorkTime: value });
      },
      updateProjectWorkTime: (value: number) => set((state) => ({ projectWorkTime: state.projectWorkTime + value })),
      orgWeekTotal: 0,
      setOrgWeekTotal: (value: number) => {
        if (value === get().orgWeekTotal) return;
        set({ orgWeekTotal: value });
      },
      updateOrgWeekTotal: (value: number) => set((state) => ({ orgWeekTotal: state.orgWeekTotal + value })),
      orgMonthTotal: 0,
      setOrgMonthTotal: (value: number) => {
        if (value === get().orgMonthTotal) return;
        set({ orgMonthTotal: value });
      },
      updateOrgMonthTotal: (value: number) => set((state) => ({ orgMonthTotal: state.orgMonthTotal + value })),
      currentWeek: 1,
      setCurrentWeek: (week: number) => {
        if (week === get().currentWeek) return;
        set({ currentWeek: week });
      },
      projWeekTotal: 0,
      setProjWeekTotal: (value: number) => {
        if (value === get().projWeekTotal) return;
        set({ projWeekTotal: value });
      },
      updateProjWeekTotal: (value: number) => set((state) => ({ projWeekTotal: state.projWeekTotal + value })),
      projMonthTotal: 0,
      setProjMonthTotal: (value: number) => {
        if (value === get().projMonthTotal) return;
        set({ projMonthTotal: value });
      },
      updateProjMonthTotal: (value: number) => set((state) => ({ projMonthTotal: state.projMonthTotal + value })),
      setProjWorkTimeTotals: (dayTime: number, weekTime: number, monthTime: number) => {
        const currDay = get().projectWorkTime;
        const currWeek = get().projWeekTotal;
        const currMonth = get().projMonthTotal;
        if (dayTime === currDay && weekTime === currWeek && monthTime === currMonth) return;
        set(() => ({
          projectWorkTime: dayTime,
          projWeekTotal: weekTime,
          projMonthTotal: monthTime,
        }));
      },
      setOrgWorkTimeTotals: (dayTime: number, weekTime: number, monthTime: number) => {
        const currDay = get().workTime;
        const currWeek = get().orgWeekTotal;
        const currMonth = get().orgMonthTotal;
        if (dayTime === currDay && weekTime === currWeek && monthTime === currMonth) return;
        set(() => ({
          workTime: dayTime,
          orgWeekTotal: weekTime,
          orgMonthTotal: monthTime,
        }));
      },
    })),
    {
      name: "store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
