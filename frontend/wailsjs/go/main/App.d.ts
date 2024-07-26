// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {main} from '../models';
import {time} from '../models';

export function CheckForUpdates():Promise<boolean>;

export function ConfirmAction(arg1:string,arg2:string):Promise<boolean>;

export function DeleteOrganization(arg1:string):Promise<void>;

export function DeleteProject(arg1:string,arg2:string):Promise<void>;

export function ExportByMonth(arg1:main.ExportType,arg2:string,arg3:number,arg4:time.Month):Promise<string>;

export function ExportByYear(arg1:main.ExportType,arg2:string,arg3:number):Promise<string>;

export function GetActiveTimer():Promise<main.ActiveTimer>;

export function GetDailyWorkTimeByMonth(arg1:number,arg2:time.Month,arg3:string):Promise<{[key: string]: {[key: string]: number}}>;

export function GetMonthlyWorkTime(arg1:number,arg2:string):Promise<{[key: number]: {[key: string]: number}}>;

export function GetOrganizations():Promise<Array<main.Organization>>;

export function GetProjects(arg1:string):Promise<Array<main.Project>>;

export function GetVersion():Promise<string>;

export function GetWeekOfMonth(arg1:number,arg2:time.Month,arg3:number):Promise<number>;

export function GetWeeklyWorkTime(arg1:number,arg2:time.Month,arg3:string):Promise<{[key: number]: {[key: string]: number}}>;

export function GetWorkTime(arg1:string,arg2:string):Promise<number>;

export function GetWorkTimeByProject(arg1:string,arg2:string,arg3:string):Promise<number>;

export function GetYearlyWorkTime(arg1:number,arg2:string):Promise<number>;

export function GetYearlyWorkTimeByProject(arg1:number,arg2:string):Promise<{[key: string]: number}>;

export function NewOrganization(arg1:string,arg2:string):Promise<void>;

export function NewProject(arg1:string,arg2:string):Promise<void>;

export function RenameOrganization(arg1:string,arg2:string):Promise<void>;

export function RenameProject(arg1:string,arg2:string,arg3:string):Promise<void>;

export function SetOrganization(arg1:string,arg2:string):Promise<void>;

export function SetProject(arg1:string):Promise<void>;

export function ShowWindow():Promise<void>;

export function StartTimer(arg1:string,arg2:string):Promise<void>;

export function StopTimer(arg1:string,arg2:string):Promise<void>;

export function TimeElapsed():Promise<number>;

export function TimerRunning():Promise<boolean>;

export function ToggleFavoriteOrganization(arg1:string):Promise<void>;

export function ToggleFavoriteProject(arg1:string,arg2:string):Promise<void>;

export function UpdateAvailable():Promise<boolean>;
