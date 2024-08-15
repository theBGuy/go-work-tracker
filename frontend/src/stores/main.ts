import { dateString } from "@/utils/utils";
import { main } from "@go/models";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";

interface Store {
  appMode: "normal" | "widget";
  setAppMode: (mode: "normal" | "widget") => void;
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
  orgDayTotal: number;
  setOrgDayTotal: (value: number) => void;
  updateWorkTime: (value: number) => void;
  projDayTotal: number;
  setProjDayTotal: (value: number) => void;
  updateProjectWorkTime: (value: number) => void;
  updateDayWorkTotals: (value: number) => void;
  orgWeekTotal: number;
  setOrgWeekTotal: (value: number) => void;
  updateOrgWeekTotal: (value: number) => void;
  orgMonthTotal: number;
  setOrgMonthTotal: (value: number) => void;
  updateOrgMonthTotal: (value: number) => void;
  dateStr: string;
  setDateStr: (date: string) => void;
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
      appMode: "normal",
      setAppMode: (mode: "normal" | "widget") => {
        if (mode === get().appMode) return;
        set({ appMode: mode });
      },
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
        const sortedCurrent = current.toSorted((a, b) => a.id - b.id);
        const sortedNew = organizations.toSorted((a, b) => a.id - b.id);
        const hasChanged =
          sortedCurrent.length !== sortedNew.length ||
          sortedCurrent.some(
            (o, i) => o.name !== sortedNew[i].name || o.id !== sortedNew[i].id || o.favorite !== sortedNew[i].favorite
          );
        if (!hasChanged) return;
        set({ organizations });
      },
      activeOrg: null,
      getActiveOrganization: () => get().activeOrg,
      setActiveOrganization: (organization: main.Organization) => {
        if (organization === get().activeOrg) return;
        localStorage.setItem("activeOrg", organization.id.toString());
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
        const sortedCurrent = current.toSorted((a, b) => a.id - b.id);
        const sortedNew = projects.toSorted((a, b) => a.id - b.id);
        const hasChanged =
          sortedCurrent.length !== sortedNew.length ||
          sortedCurrent.some(
            (p, i) => p.name !== sortedNew[i].name || p.id !== sortedNew[i].id || p.favorite !== sortedNew[i].favorite
          );
        if (!hasChanged) return;
        set({ projects });
      },
      activeProj: null,
      getActiveProject: () => get().activeProj as main.Project,
      setActiveProject: (project: main.Project) => {
        if (project === get().activeProj) return;
        localStorage.setItem("activeProj", project.id.toString());
        set({ activeProj: project });
      },
      setActiveInfo: (organization: main.Organization, project: main.Project) => {
        localStorage.setItem("activeOrg", organization.id.toString());
        localStorage.setItem("activeProj", project.id.toString());
        set(() => ({
          activeOrg: organization,
          activeProj: project,
        }));
      },
      alertTime: Number(localStorage.getItem("alertTime")) || 30,
      setAlertTime: (time: number) => {
        if (time === get().alertTime) return;
        // temp fix so this value persists
        localStorage.setItem("alertTime", time.toString());
        set({ alertTime: time });
      },
      orgDayTotal: 0,
      setOrgDayTotal: (value: number) => {
        if (value === get().orgDayTotal) return;
        set({ orgDayTotal: value });
      },
      updateWorkTime: (value: number) => set((state) => ({ orgDayTotal: state.orgDayTotal + value })),
      projDayTotal: 0,
      setProjDayTotal: (value: number) => {
        if (value === get().projDayTotal) return;
        set({ projDayTotal: value });
      },
      updateProjectWorkTime: (value: number) => set((state) => ({ projDayTotal: state.projDayTotal + value })),
      updateDayWorkTotals: (value: number) => {
        set((state) => ({
          orgDayTotal: state.orgDayTotal + value,
          projDayTotal: state.projDayTotal + value,
        }));
      },
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
      dateStr: dateString(),
      setDateStr: (date: string) => {
        if (date === get().dateStr) return;
        set({ dateStr: date });
      },
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
        const currDay = get().projDayTotal;
        const currWeek = get().projWeekTotal;
        const currMonth = get().projMonthTotal;
        if (dayTime === currDay && weekTime === currWeek && monthTime === currMonth) return;
        set(() => ({
          projDayTotal: dayTime,
          projWeekTotal: weekTime,
          projMonthTotal: monthTime,
        }));
      },
      setOrgWorkTimeTotals: (dayTime: number, weekTime: number, monthTime: number) => {
        const currDay = get().orgDayTotal;
        const currWeek = get().orgWeekTotal;
        const currMonth = get().orgMonthTotal;
        if (dayTime === currDay && weekTime === currWeek && monthTime === currMonth) return;
        set(() => ({
          orgDayTotal: dayTime,
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
