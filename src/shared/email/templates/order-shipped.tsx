import { Section, Text, Button } from '@react-email/components';
import { EmailLayout } from './layout';
import { env } from '#config/env';

interface OrderShippedEmailProps {
  customerName: string;
  orderId: string;
  trackingCode?: string;
  shippingMethod: string;
  estimatedDays?: number;
}

export function OrderShippedEmail({
  customerName,
  orderId,
  trackingCode,
  shippingMethod,
  estimatedDays,
}: OrderShippedEmailProps) {
  const shortId = orderId.slice(0, 8).toUpperCase();

  return (
    <EmailLayout title={`Pedido #${shortId} enviado`}>
      <Section>
        <Text style={headingStyle}>Seu pedido esta a caminho!</Text>
        <Text style={paragraphStyle}>
          Ola, <strong>{customerName}</strong>. Seu pedido <strong>#{shortId}</strong> foi enviado.
        </Text>
      </Section>

      <Section style={shippingBoxStyle}>
        <Text style={shippingTitleStyle}>Detalhes do envio</Text>
        <Text style={shippingTextStyle}>Modalidade: <strong>{shippingMethod}</strong></Text>
        {estimatedDays && (
          <Text style={shippingTextStyle}>
            Previsao de entrega: <strong>{estimatedDays} dias uteis</strong>
          </Text>
        )}
        {trackingCode && (
          <Text style={shippingTextStyle}>
            Codigo de rastreio: <strong>{trackingCode}</strong>
          </Text>
        )}
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <Button href={`${env.FRONTEND_URL}/orders/${orderId}`} style={buttonStyle}>
          Rastrear Pedido
        </Button>
      </Section>
    </EmailLayout>
  );
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 4px',
  color: '#111827',
  fontSize: '24px',
  fontWeight: '700',
};

const paragraphStyle: React.CSSProperties = {
  margin: '0 0 24px',
  color: '#6b7280',
  fontSize: '14px',
};

const shippingBoxStyle: React.CSSProperties = {
  backgroundColor: '#ecfdf5',
  border: '1px solid #6ee7b7',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
};

const shippingTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: '#065f46',
  fontSize: '14px',
  fontWeight: '600',
};

const shippingTextStyle: React.CSSProperties = {
  margin: '0 0 4px',
  color: '#065f46',
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
