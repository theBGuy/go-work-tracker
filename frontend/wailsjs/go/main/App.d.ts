// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {time} from '../models';

export function ConfirmAction(arg1:string,arg2:string):Promise<boolean>;

export function DeleteOrganization(arg1:string):Promise<void>;

export function ExportCSVByMonth(arg1:string,arg2:number,arg3:time.Month):Promise<string>;

export function ExportCSVByYear(arg1:string,arg2:number):Promise<string>;

export function ExportPDFByMonth(arg1:string,arg2:number,arg3:time.Month):Promise<string>;

export function ExportPDFByYear(arg1:string,arg2:number):Promise<string>;

export function GetMonthlyWorkTime(arg1:number,arg2:string):Promise<Array<number>>;

export function GetOrganizations():Promise<Array<string>>;

export function GetVersion():Promise<string>;

export function GetWorkTime(arg1:string,arg2:string):Promise<number>;

export function GetYearlyWorkTime(arg1:number,arg2:string):Promise<number>;

export function MonitorTime():Promise<void>;

export function NewOrganization(arg1:string):Promise<void>;

export function RenameOrganization(arg1:string,arg2:string):Promise<void>;

export function SetOrganization(arg1:string):Promise<void>;

export function ShowWindow():Promise<void>;

export function StartTimer(arg1:string):Promise<void>;

export function StopTimer(arg1:string):Promise<void>;

export function TimeElapsed():Promise<number>;

export function UpdateAvailable():Promise<boolean>;
