import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2  caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres')
    .trim()
    .nonempty('Nome é obrigatório'),

  email: z.email('E-mail inválido').toLowerCase().trim().nonempty('E-mail é obrigatório'),

  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caracter especial'),
});

export const loginSchema = z.object({
  email: z.email('E-mail inválido').toLowerCase().trim().nonempty('E-mail é obrigatório'),
  password: z.string().nonempty('A senha é obrigatória'),
});

export const refreshtTokenSchema = z.object({
  refreshtToken: z.string().nonempty('Refresh token é obrigatório'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('E-mail inválido').toLowerCase().trim().nonempty('E-mail é obrigatório'),
});

export const resetPasswordSchema = z.object({
  token: z.string().nonempty('Token é obrigatório'),

  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caracter especial'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshToken = z.infer<typeof refreshtTokenSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
