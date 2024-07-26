import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware'
import { StartTimer, StopTimer } from "../../wailsjs/go/main/App";
import { useAppStore } from "./main";

interface TimerStore {
  running: boolean;
  setRunning: (value: boolean) => void;
  workTime: number;
  setWorkTime: (value: number) => void;
  updateWorkTime: (value: number) => void;
  projectWorkTime: number;
  setProjectWorkTime: (value: number) => void;
  updateProjectWorkTime: (value: number) => void;
  elapsedTime: number;
  setElapsedTime: (value: number) => void;
  openConfirm: boolean;
  setOpenConfirm: (value: boolean) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  showMiniTimer: boolean;
  setShowMiniTimer: (value: boolean) => void;
}

export const useTimerStore = create(subscribeWithSelector<TimerStore>((set, get) => ({
  running: false,
  setRunning: (value: boolean) => set({ running: value }),
  workTime: 0,
  setWorkTime: (value: number) => set({ workTime:  value }),
  updateWorkTime: (value: number) => set((state) => ({ workTime: state.workTime + value })),
  projectWorkTime: 0,
  setProjectWorkTime: (value: number) => set({ projectWorkTime: value }),
  updateProjectWorkTime: (value: number) => set((state) => ({ projectWorkTime: state.projectWorkTime + value })),
  elapsedTime: 0,
  setElapsedTime: (value: number) => set({ elapsedTime: value }),
  openConfirm: false,
  setOpenConfirm: (value: boolean) => set({ openConfirm: value }),
  startTimer: () => {
    const selectedOrganization = useAppStore.getState().selectedOrganization;
    const selectedProject = useAppStore.getState().selectedProject;
    StartTimer(selectedOrganization, selectedProject).then(() => {
      set({ running: true, elapsedTime: 0 });
    });
  },
  stopTimer: () => {
    const selectedOrganization = useAppStore.getState().selectedOrganization;
    const selectedProject = useAppStore.getState().selectedProject;
    StopTimer(selectedOrganization, selectedProject).then(() => {
      get().resetTimer();
    });
  },
  resetTimer: () => {
    set({ running: false, openConfirm: false });
  },
  showMiniTimer: false,
  setShowMiniTimer: (value: boolean) => set({ showMiniTimer: value }),
})));