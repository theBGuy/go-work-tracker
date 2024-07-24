import { create } from "zustand";

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
}

export const useTimerStore = create<TimerStore>((set, get) => ({
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
}));