import { Html, Head, Body, Container, Section, Text, Hr } from '@react-email/components';

interface EmailLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function EmailLayout({ title, children }: EmailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head>
        <title>{title}</title>
      </Head>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={headerTextStyle}>E-commerce</Text>
          </Section>

          <Section style={contentStyle}>{children}</Section>

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Voce esta recebendo este e-mail porque possui uma conta em nosso site.
            </Text>
            <Text style={footerTextStyle}>
              &copy; {new Date().getFullYear()} E-commerce. Todos os direitos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  margin: '0',
  padding: '0',
  backgroundColor: '#f4f4f5',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#111827',
  padding: '24px 40px',
  borderRadius: '8px 8px 0 0',
  textAlign: 'center',
};

const headerTextStyle: React.CSSProperties = {
  margin: '0',
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700',
  letterSpacing: '-0.5px',
};

const contentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '40px',
  borderLeft: '1px solid #e5e7eb',
  borderRight: '1px solid #e5e7eb',
};

const footerStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '24px 40px',
  border: '1px solid #e5e7eb',
  borderRadius: '0 0 8px 8px',
  textAlign: 'center',
};

const footerTextStyle: React.CSSProperties = {
  margin: '0 0 4px',
  color: '#6b7280',
  fontSize: '12px',
};
