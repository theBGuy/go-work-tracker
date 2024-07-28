import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import { StartTimer, StopTimer } from "@go/main/App";
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
      setRunning: (value: boolean) => set({ running: value }),
      elapsedTime: 0,
      setElapsedTime: (value: number) => set({ elapsedTime: value }),
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
      setShowMiniTimer: (value: boolean) => set({ showMiniTimer: value }),
    })),
    {
      name: "timer-store",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
