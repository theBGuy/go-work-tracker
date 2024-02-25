export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export const formatTime = (timeInSeconds: number) => {
  let hours = String(Math.floor(timeInSeconds / 3600)).padStart(2, '0');
  let minutes = String(Math.floor((timeInSeconds % 3600) / 60)).padStart(2, '0');
  let seconds = String(Math.floor(timeInSeconds % 60)).padStart(2, '0');

  return `${hours}h ${minutes}m ${seconds}s`;
};

export const dateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  return dateString;
};