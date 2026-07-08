import { Section, Text, Button } from '@react-email/components';
import { EmailLayout } from './layout';
import { env } from '#config/env';

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <EmailLayout title="Bem-vindo(a) ao E-commerce">
      <Section>
        <Text style={headingStyle}>Bem-vindo(a), {name}!</Text>
        <Text style={paragraphStyle}>
          Sua conta foi criada com sucesso. Estamos felizes em te-lo(a) com a gente.
        </Text>
      </Section>

      <Section style={boxStyle}>
        <Text style={boxTitleStyle}>O que voce pode fazer agora:</Text>
        <Text style={listStyle}>• Explorar nossos produtos</Text>
        <Text style={listStyle}>• Adicionar itens à sua wishlist</Text>
        <Text style={listStyle}>• Fazer seu primeiro pedido</Text>
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <Button href={`${env.FRONTEND_URL}/products`} style={buttonStyle}>
          Explorar Produtos
        </Button>
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

const boxStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
};

const boxTitleStyle: React.CSSProperties = {
  margin: '0 0 12px',
  color: '#111827',
  fontSize: '14px',
  fontWeight: '600',
};

const listStyle: React.CSSProperties = {
  margin: '0 0 4px',
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.8',
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
