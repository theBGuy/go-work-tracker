import { StartTimer, StopTimer } from "@go/main/App";
import { create } from "zustand";
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware";
import { useAppStore } from "./main";

interface TimerStore {
  running: boolean;
  setRunning: (value: boolean) => void;
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

export const useTimerStore = create(
  persist(
    subscribeWithSelector<TimerStore>((set, get) => ({
      running: false,
      setRunning: (value: boolean) => {
        if (value === get().running) return;
        set({ running: value });
      },
      elapsedTime: 0,
      setElapsedTime: (value: number) => {
        if (value === get().elapsedTime) return;
        set({ elapsedTime: value });
      },
      openConfirm: false,
      setOpenConfirm: (value: boolean) => set({ openConfirm: value }),
      startTimer: () => {
        const selectedOrganization = useAppStore.getState().activeOrg;
        if (!selectedOrganization) return;
        const selectedProject = useAppStore.getState().activeProj;
        if (!selectedProject) return;
        StartTimer(selectedOrganization, selectedProject).then(() => {
          set({ running: true, elapsedTime: 0 });
        });
      },
      stopTimer: () => {
        StopTimer().then(() => {
          get().resetTimer();
        });
      },
      resetTimer: () => {
        set({ running: false, openConfirm: false });
      },
      showMiniTimer: false,
      setShowMiniTimer: (value: boolean) => {
        if (value === get().showMiniTimer) return;
        set({ showMiniTimer: value });
      },
    })),
    {
      name: "timer-store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
