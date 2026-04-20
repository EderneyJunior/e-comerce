import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100).trim().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().nonempty('Senha atual é obrigatória'),
    newPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Nova senha deve conter letra maiúscula')
      .regex(/[0-9]/, 'Nova senha deve conter número')
      .regex(/[^a-zA-Z0-9]/, 'Nova senha deve conter caractere especial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['ConfirmPassword'],
  });

export const addressSchema = z.object({
  label: z.string().min(1).max(50),
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(100).optional(),
  district: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().length(2, 'Estado deve ter 2 caracteres (ex: PR)'),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato: 00000-000)'),
  isDefault: z.boolean().default(false),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AnddressInput = z.infer<typeof addressSchema>;
