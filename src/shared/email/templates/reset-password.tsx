import { Section, Text, Button } from '@react-email/components';
import { EmailLayout } from './layout';
import { env } from '#config/env';

interface ResetPasswordEmailProps {
  name: string;
  token: string;
}

export function ResetPasswordEmail({ name, token }: ResetPasswordEmailProps) {
  const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${token}`;

  return (
    <EmailLayout title="Redefinir senha">
      <Section>
        <Text style={headingStyle}>Redefinir senha</Text>
        <Text style={paragraphStyle}>
          Ola, <strong>{name}</strong>. Recebemos uma solicitacao de redefinicao de senha para sua
          conta.
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Button href={resetUrl} style={buttonStyle}>
          Redefinir Senha
        </Button>
      </Section>

      <Section style={warningBoxStyle}>
        <Text style={warningTextStyle}>
          Este link expira em <strong>30 minutos</strong>. Se voce nao solicitou a redefinicao, ignore
          este e-mail.
        </Text>
      </Section>

      <Section>
        <Text style={fallbackTextStyle}>
          Ou copie e cole este link no navegador:
        </Text>
        <Text style={urlStyle}>{resetUrl}</Text>
      </Section>
    </EmailLayout>
  );
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: '#111827',
  fontSize: '24px',
  fontWeight: '700',
};

const paragraphStyle: React.CSSProperties = {
  margin: '0 0 24px',
  color: '#6b7280',
  fontSize: '14px',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#111827',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
};

const warningBoxStyle: React.CSSProperties = {
  backgroundColor: '#fef9c3',
  border: '1px solid #fde047',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
};

const warningTextStyle: React.CSSProperties = {
  margin: '0',
  color: '#713f12',
  fontSize: '13px',
};

const fallbackTextStyle: React.CSSProperties = {
  margin: '0',
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center',
};

const urlStyle: React.CSSProperties = {
  margin: '0',
  color: '#6b7280',
  fontSize: '12px',
  textAlign: 'center',
  wordBreak: 'break-all',
};
