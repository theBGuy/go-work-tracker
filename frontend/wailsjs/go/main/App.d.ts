// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {time} from '../models';

export function ConfirmAction(arg1:string,arg2:string):Promise<boolean>;

export function DeleteOrganization(arg1:string):Promise<void>;

export function DeleteProject(arg1:string):Promise<void>;

export function ExportCSVByMonth(arg1:string,arg2:number,arg3:time.Month):Promise<string>;

export function ExportCSVByYear(arg1:string,arg2:number):Promise<string>;

export function GetMonthlyWorkTime(arg1:number,arg2:string):Promise<Array<number>>;

export function GetMonthlyWorktimeByProject(arg1:number,arg2:time.Month,arg3:string):Promise<{[key: string]: number}>;

export function GetOrganizations():Promise<Array<string>>;

export function GetProjects(arg1:string):Promise<Array<string>>;

export function GetVersion():Promise<string>;

export function GetWeeklyWorkTime(arg1:number,arg2:time.Month,arg3:string):Promise<{[key: number]: number}>;

export function GetWorkTime(arg1:string,arg2:string):Promise<number>;

export function GetWorkTimeByProject(arg1:string,arg2:string,arg3:string):Promise<number>;

export function GetYearlyWorkTime(arg1:number,arg2:string):Promise<number>;

export function GetYearlyWorkTimeByProject(arg1:number,arg2:string):Promise<{[key: string]: number}>;

export function MonitorTime():Promise<void>;

export function NewOrganization(arg1:string,arg2:string):Promise<void>;

export function RenameOrganization(arg1:string,arg2:string):Promise<void>;

export function RenameProject(arg1:string,arg2:string):Promise<void>;

export function SetOrganization(arg1:string,arg2:string):Promise<void>;

export function SetProject(arg1:string):Promise<void>;

export function ShowWindow():Promise<void>;

export function StartTimer(arg1:string,arg2:string):Promise<void>;

export function StopTimer(arg1:string,arg2:string):Promise<void>;

export function TimeElapsed():Promise<number>;

export function UpdateAvailable():Promise<boolean>;
