import { z } from "zod";
export const LANDING_FIELDS = [
 ["eyebrow","Texto superior","Fina selección familiar"],
 ["headline","Título principal","Una sola botella.\nUn solo vino."],
 ["subtitle","Subtítulo","Zumo de uva sin alcohol · 750 ml"],
 ["features","Características (una por línea)","100% natural\n750 ml\n0% alcohol"],
 ["buyLabel","Texto del botón de compra","Comprar ahora"],
 ["detailsLabel","Texto del enlace de detalles","Ver detalles →"],
 ["pourLabel","Texto del contador","Sirviendo"],
 ["storyEyebrow","Texto superior de la historia","Cata · Maridaje · Origen"],
 ["storyTitle","Título de la historia","Una botella, una sola historia"],
 ["cataTitle","Título de cata","Cata"],
 ["cata","Texto de cata","Frutos rojos maduros, especias suaves y un final largo y elegante."],
 ["maridajeTitle","Título de maridaje","Maridaje"],
 ["maridaje","Texto de maridaje","Carnes rojas, quesos curados y cenas que se alargan."],
 ["originTitle","Título de origen","Origen"],
 ["origin","Texto de origen","Pronto compartiremos el origen de ROSH."],
 ["footer","Texto del pie","Zumo de uva · 100% natural · 0% alcohol"],
] as const;
export type LandingKey = typeof LANDING_FIELDS[number][0];
export type LandingCopy = Record<LandingKey,string>;
export const LANDING_LIMITS:Record<LandingKey,number>={eyebrow:100,headline:160,subtitle:220,features:300,buyLabel:40,detailsLabel:60,pourLabel:40,storyEyebrow:100,storyTitle:160,cataTitle:40,cata:2000,maridajeTitle:40,maridaje:2000,originTitle:40,origin:6000,footer:300};
export const landingCopySchema = z.object(Object.fromEntries(LANDING_FIELDS.map(([key])=>[key,z.string().trim().min(1).max(LANDING_LIMITS[key])])) as Record<LandingKey,z.ZodString>);
export function resolveLandingCopy(value: unknown, legacy?: {description?:string;shortDescription?:string|null}): LandingCopy {
 const result=Object.fromEntries(LANDING_FIELDS.map(([key,,fallback])=>[key,fallback])) as LandingCopy;
 if(legacy?.description?.trim())result.origin=legacy.description;
 if(legacy?.shortDescription?.trim())result.subtitle=legacy.shortDescription;
 if(value&&typeof value==="object"&&!Array.isArray(value))for(const [key] of LANDING_FIELDS){const text=(value as Record<string,unknown>)[key];if(typeof text==="string"&&text.trim())result[key]=text;}
 return result;
}
