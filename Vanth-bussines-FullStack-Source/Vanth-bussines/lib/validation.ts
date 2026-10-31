import { z } from 'zod';
export const uuid=z.string().uuid();
export const email=z.email().max(250).transform(v=>v.toLowerCase().trim());
export const password=z.string().min(12).max(128);
export const code=z.string().regex(/^\d{6}$/);
export const taskSchema=z.object({title:z.string().trim().min(1).max(180),description:z.string().max(5000).default(''),status:z.enum(['todo','progress','review','done']).default('todo'),priority:z.enum(['urgent','high','medium','low']).default('medium'),due_at:z.iso.datetime({offset:true}).nullable().optional(),project_id:uuid.nullable().optional()});
export const projectSchema=z.object({name:z.string().trim().min(1).max(150),description:z.string().max(5000).default(''),status:z.enum(['active','paused','finished']).default('active'),color:z.string().regex(/^#[a-fA-F0-9]{6}$/).default('#8b5cf6')});
export const noteSchema=z.object({title:z.string().trim().min(1).max(180),content:z.string().max(200000).default(''),pinned:z.boolean().default(false)});
export const eventSchema=z.object({title:z.string().trim().min(1).max(180),description:z.string().max(10000).default(''),starts_at:z.iso.datetime({offset:true}),ends_at:z.iso.datetime({offset:true}),all_day:z.boolean().default(false),location:z.string().max(300).default(''),category:z.enum(['meeting','delivery','appointment','personal','other']).default('meeting'),destination:z.enum(['local','google']).default('local')}).refine(v=>new Date(v.ends_at)>new Date(v.starts_at),{message:'O fim deve ocorrer após o início'});
