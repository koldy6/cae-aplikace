import type { z } from 'zod';
import type { rue1Schema, rue2Schema, rue3Schema, rue4Schema, rue5Schema, rue6Schema, rue7Schema, rue8Schema, lis1Schema, lis2Schema, lis3Schema, lis4Schema, writingSchema, referenceSchema } from './schema';

export type Rue1Set = z.infer<typeof rue1Schema>;
export type Rue2Set = z.infer<typeof rue2Schema>;
export type Rue3Set = z.infer<typeof rue3Schema>;
export type Rue4Set = z.infer<typeof rue4Schema>;
export type Rue5Set = z.infer<typeof rue5Schema>;
export type Rue6Set = z.infer<typeof rue6Schema>;
export type Rue8Set = z.infer<typeof rue8Schema>;
export type Rue7Set = z.infer<typeof rue7Schema>;
export type Lis1Set = z.infer<typeof lis1Schema>;
export type Lis2Set = z.infer<typeof lis2Schema>;
export type Lis3Set = z.infer<typeof lis3Schema>;
export type Lis4Set = z.infer<typeof lis4Schema>;
export type ListeningSet = Lis1Set | Lis2Set | Lis3Set | Lis4Set;
// R&UoE sets only: existing screens rely on this. Listening sets are ListeningSet (content.listening[part]).
export type ContentSet = Rue1Set | Rue2Set | Rue3Set | Rue4Set | Rue5Set | Rue6Set | Rue7Set | Rue8Set;
export type Explanation = Rue1Set['questions'][number]['explanation'];
export type WritingTask = z.infer<typeof writingSchema>;
export type FormatReference = z.infer<typeof referenceSchema>;
