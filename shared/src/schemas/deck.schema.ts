import { z } from 'zod';
import { notBlankString } from './common';

const deckIdSchema = z
  .string()
  .min(1)
  .max(19)
  .regex(/^-?\d+(\.\d+)?$/);

export const CreateDeckRequestSchema = z
  .object({
    name: notBlankString('デッキ名').max(50, '50文字以内で入力してください'),
    description: notBlankString('説明文')
      .max(5000, '5000文字以内で入力してください')
      .optional(),
  })
  .strict();

export const UpdateDeckRequestSchema = z
  .object({
    deckId: deckIdSchema,
    name: notBlankString('デッキ名').max(50, '50文字以内で入力してください'),
    description: notBlankString('説明文')
      .max(5000, '5000文字以内で入力してください')
      .optional(),
  })
  .strict();

export const RequiredDeckIdRequestSchema = z
  .object({
    deckId: deckIdSchema,
  })
  .strict();

export const DeckResponseSchema = z.object({
  id: z.bigint().transform((v) => v.toString()),
  name: z.string(),
  description: z
    .string()
    .nullable()
    .transform((v) => v ?? undefined),
  createdAt: z.date().transform((v) => v.toISOString()),
});

export type CreateDeckRequest = z.infer<typeof CreateDeckRequestSchema>;
export type UpdateDeckRequest = z.infer<typeof UpdateDeckRequestSchema>;
export type RequiredDeckIdRequest = z.infer<typeof RequiredDeckIdRequestSchema>;
