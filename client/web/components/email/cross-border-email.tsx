import {
  Button,
  Container,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";

export type CrossBorderEmailProps = {
  concern: string;
  customerName: string;
  offer: string;
  productName: string;
  subject: string;
};

export function CrossBorderEmail({
  concern,
  customerName,
  offer,
  productName,
  subject,
}: CrossBorderEmailProps) {
  return (
    <Container style={styles.container}>
      <Section style={styles.badge}>Cross-border support</Section>
      <Heading style={styles.heading}>{subject}</Heading>
      <Text style={styles.text}>Hi {customerName || "there"},</Text>
      <Text style={styles.text}>
        Thank you for your interest in {productName || "our product"}. I’m
        happy to help with your question about {concern || "the order"}.
      </Text>
      <Section style={styles.highlight}>
        <Text style={styles.highlightTitle}>Quick answer</Text>
        <Text style={styles.highlightText}>
          We have checked the details and can confirm the product is ready for
          cross-border shipping. If you need a plug type, size, or delivery
          estimate, we can verify it before dispatch.
        </Text>
      </Section>
      <Text style={styles.text}>
        As a small thank-you, {offer || "we can include priority handling for this order"}.
      </Text>
      <Button href="https://example.com" style={styles.button}>
        View product details
      </Button>
      <Hr style={styles.hr} />
      <Text style={styles.footer}>
        Best regards,<br />
        Cross-border Support Team
      </Text>
    </Container>
  );
}

const styles = {
  badge: {
    backgroundColor: "#ecfeff",
    borderRadius: "999px",
    color: "#0e7490",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.04em",
    marginBottom: "18px",
    padding: "8px 12px",
    textTransform: "uppercase" as const,
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: "14px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "700",
    marginTop: "10px",
    padding: "12px 18px",
    textDecoration: "none",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: "28px",
    margin: "32px auto",
    maxWidth: "560px",
    padding: "32px",
  },
  footer: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: "22px",
    margin: "0",
  },
  heading: {
    color: "#0f172a",
    fontSize: "28px",
    letterSpacing: "-0.04em",
    lineHeight: "34px",
    margin: "0 0 20px",
  },
  highlight: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "20px",
    margin: "22px 0",
    padding: "18px",
  },
  highlightText: {
    color: "#334155",
    fontSize: "14px",
    lineHeight: "24px",
    margin: "6px 0 0",
  },
  highlightTitle: {
    color: "#0369a1",
    fontSize: "13px",
    fontWeight: "700",
    margin: "0",
  },
  hr: {
    borderColor: "#e2e8f0",
    margin: "28px 0",
  },
  text: {
    color: "#334155",
    fontSize: "15px",
    lineHeight: "26px",
    margin: "0 0 16px",
  },
};
