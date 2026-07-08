import { Section, Text, Button, Row, Column, Hr } from '@react-email/components';
import { EmailLayout } from './layout';
import { env } from '#config/env';

interface OrderItem {
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Address {
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  zipCode: string;
}

interface OrderConfirmedEmailProps {
  customerName: string;
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  address: Address;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrderConfirmedEmail({
  customerName,
  orderId,
  items,
  subtotal,
  discount,
  shippingFee,
  total,
  address,
}: OrderConfirmedEmailProps) {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const addressLine = `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ''} — ${address.district}, ${address.city}/${address.state} — CEP ${address.zipCode}`;

  return (
    <EmailLayout title={`Pedido #${shortId} confirmado`}>
      <Section>
        <Text style={headingStyle}>Pedido confirmado!</Text>
        <Text style={paragraphStyle}>
          Ola, <strong>{customerName}</strong>. Seu pedido <strong>#{shortId}</strong> foi confirmado.
        </Text>
      </Section>

      <Section style={{ marginBottom: '24px' }}>
        <Row style={tableHeaderStyle}>
          <Column style={{ textAlign: 'left', ...headerCellStyle }}>Produto</Column>
          <Column style={{ textAlign: 'center', ...headerCellStyle }}>Qtd</Column>
          <Column style={{ textAlign: 'right', ...headerCellStyle }}>Total</Column>
        </Row>
        {items.map((item, i) => (
          <Row key={i} style={rowStyle}>
            <Column style={{ textAlign: 'left' }}>
              <Text style={itemTextStyle}>{item.productName}</Text>
              <Text style={itemSubTextStyle}>{item.variantName}</Text>
            </Column>
            <Column style={{ textAlign: 'center', ...cellStyle }}>{item.quantity}x</Column>
            <Column style={{ textAlign: 'right', ...cellStyle }}>{formatCurrency(item.subtotal)}</Column>
          </Row>
        ))}
      </Section>

      <Section style={{ marginBottom: '24px' }}>
        <Row style={totalsRowStyle}>
          <Text style={totalsLabelStyle}>Subtotal</Text>
          <Text style={totalsValueStyle}>{formatCurrency(subtotal)}</Text>
        </Row>
        {discount > 0 && (
          <Row style={totalsRowStyle}>
            <Text style={discountLabelStyle}>Desconto</Text>
            <Text style={discountValueStyle}>-{formatCurrency(discount)}</Text>
          </Row>
        )}
        <Row style={totalsRowStyle}>
          <Text style={totalsLabelStyle}>Frete</Text>
          <Text style={totalsValueStyle}>
            {shippingFee === 0 ? 'Gratis' : formatCurrency(shippingFee)}
          </Text>
        </Row>
        <Hr style={{ border: 'none', borderTop: '2px solid #111827', margin: '12px 0' }} />
        <Row style={totalsRowStyle}>
          <Text style={totalLabelStyle}>Total</Text>
          <Text style={totalValueStyle}>{formatCurrency(total)}</Text>
        </Row>
      </Section>

      <Section style={addressBoxStyle}>
        <Text style={addressTitleStyle}>Endereco de entrega</Text>
        <Text style={addressTextStyle}>{addressLine}</Text>
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <Button href={`${env.FRONTEND_URL}/orders/${orderId}`} style={buttonStyle}>
          Acompanhar Pedido
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

const tableHeaderStyle: React.CSSProperties = {
  marginBottom: '8px',
};

const headerCellStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  textTransform: 'uppercase',
  paddingBottom: '8px',
};

const rowStyle: React.CSSProperties = {
  borderBottom: '1px solid #f3f4f6',
};

const cellStyle: React.CSSProperties = {
  color: '#111827',
  fontSize: '14px',
  padding: '12px 0',
};

const itemTextStyle: React.CSSProperties = {
  margin: '0',
  color: '#111827',
  fontSize: '14px',
  fontWeight: '500',
};

const itemSubTextStyle: React.CSSProperties = {
  margin: '2px 0 0',
  color: '#6b7280',
  fontSize: '12px',
};

const totalsRowStyle: React.CSSProperties = {
  marginBottom: '4px',
};

const totalsLabelStyle: React.CSSProperties = {
  margin: '0',
  color: '#6b7280',
  fontSize: '14px',
  display: 'inline',
};

const totalsValueStyle: React.CSSProperties = {
  margin: '0',
  color: '#111827',
  fontSize: '14px',
  float: 'right' as const,
  display: 'inline',
};

const discountLabelStyle: React.CSSProperties = {
  margin: '0',
  color: '#10b981',
  fontSize: '14px',
  display: 'inline',
};

const discountValueStyle: React.CSSProperties = {
  margin: '0',
  color: '#10b981',
  fontSize: '14px',
  float: 'right' as const,
  display: 'inline',
};

const totalLabelStyle: React.CSSProperties = {
  margin: '0',
  color: '#111827',
  fontSize: '16px',
  fontWeight: '700',
  display: 'inline',
};

const totalValueStyle: React.CSSProperties = {
  margin: '0',
  color: '#111827',
  fontSize: '16px',
  fontWeight: '700',
  float: 'right' as const,
  display: 'inline',
};

const addressBoxStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
};

const addressTitleStyle: React.CSSProperties = {
  margin: '0 0 4px',
  color: '#111827',
  fontSize: '13px',
  fontWeight: '600',
};

const addressTextStyle: React.CSSProperties = {
  margin: '0',
  color: '#6b7280',
  fontSize: '13px',
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
