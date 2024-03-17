import { GetWeekOfMonth } from '../../wailsjs/go/main/App';

export const months: Record<number, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December"
};

export const formatTime = (timeInSeconds: number) => {
  let hours = String(Math.floor(timeInSeconds / 3600)).padStart(2, '0');
  let minutes = String(Math.floor((timeInSeconds % 3600) / 60)).padStart(2, '0');
  let seconds = String(Math.floor(timeInSeconds % 60)).padStart(2, '0');

  return `${hours}h ${minutes}m ${seconds}s`;
};

/**
 * JS starts month at 0, so we add 1 to the month
 * @param d Date - default is new Date()
 * @returns {number}
 */
export const getMonth = (d = new Date()): number => {
  return d.getMonth() + 1;
};

export const dateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  return dateString;
};

export async function getCurrentWeekOfMonth() {
  const current = new Date();
  const year = current.getFullYear();
  const month = getMonth();
  const day = current.getDate();
  const week = await GetWeekOfMonth(year, month, day);
  return week
};

export type Model = {
  Name: string;
  Favorite: boolean;
  UpdatedAt: string;
};