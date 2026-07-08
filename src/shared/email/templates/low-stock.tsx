import { Section, Text, Button, Row, Column } from '@react-email/components';
import { EmailLayout } from './layout';
import { env } from '#config/env';

interface LowStockItem {
  productName: string;
  variantName: string;
  sku: string;
  stock: number;
  stockMin: number;
}

interface LowStockEmailProps {
  items: LowStockItem[];
}

export function LowStockEmail({ items }: LowStockEmailProps) {
  return (
    <EmailLayout title="Alerta de Estoque Baixo">
      <Section>
        <Text style={headingStyle}>Alerta de estoque baixo</Text>
        <Text style={paragraphStyle}>
          Os seguintes produtos estao com estoque abaixo do minimo configurado:
        </Text>
      </Section>

      <Section style={{ marginBottom: '24px' }}>
        <Row style={tableHeaderStyle}>
          <Column style={{ textAlign: 'left', ...headerCellStyle }}>Produto</Column>
          <Column style={{ textAlign: 'center', ...headerCellStyle }}>Estoque</Column>
          <Column style={{ textAlign: 'center', ...headerCellStyle }}>Minimo</Column>
        </Row>
        {items.map((item, i) => (
          <Row key={i} style={rowStyle}>
            <Column style={{ textAlign: 'left' }}>
              <Text style={itemTextStyle}>{item.productName}</Text>
              <Text style={itemSubTextStyle}>
                {item.variantName} — SKU: {item.sku}
              </Text>
            </Column>
            <Column style={{ textAlign: 'center' }}>
              <Text style={stockBadgeStyle}>{item.stock} un.</Text>
            </Column>
            <Column style={{ textAlign: 'center', ...cellStyle }}>Min: {item.stockMin}</Column>
          </Row>
        ))}
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <Button href={`${env.FRONTEND_URL}/admin/stock`} style={buttonStyle}>
          Gerenciar Estoque
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
  color: '#6b7280',
  fontSize: '13px',
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

const stockBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  padding: '4px 10px',
  borderRadius: '99px',
  fontSize: '13px',
  fontWeight: '600',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
};
