import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { formatDateOnly } from '#/lib/date-only'
import { formatMoney } from '#/lib/money'

Font.register({
  family: 'Helvetica',
  fonts: [{ src: 'Helvetica' }, { src: 'Helvetica-Bold', fontWeight: 'bold' }],
})

// Times-Roman is a PDF standard font and ships with every PDF reader, so we
// don't need to embed glyphs. Used for prominent serif elements (title, total)
// to mirror the app's Source Serif headline style.
Font.register({
  family: 'Times-Roman',
  fonts: [
    { src: 'Times-Roman' },
    { src: 'Times-Bold', fontWeight: 'bold' },
    { src: 'Times-Italic', fontStyle: 'italic' },
  ],
})

const COLORS = {
  ink: '#1a1a1a',
  body: '#3a3a3a',
  muted: '#6b6b6b',
  faint: '#9a9a9a',
  rule: '#e2e2e2',
  ruleStrong: '#1a1a1a',
}

// Sent is the "normal" state for a delivered invoice, so no chip is needed.
// Draft, Paid, and Void are exceptional states worth marking so the recipient
// can tell at a glance.
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: '#f0eee9', text: '#6b6b6b', label: 'Draft' },
  paid: { bg: '#e3f1e6', text: '#1f6b3a', label: 'Paid' },
  void: { bg: '#f4e6e6', text: '#7a2828', label: 'Void' },
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 44,
    color: COLORS.ink,
  },

  // Thin black bar at the very top of the page (drawn outside the content
  // padding so it spans edge to edge). Acts as a visual anchor and gives the
  // document a printed-letterhead feel.
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.ink,
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    maxWidth: '55%',
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
    color: COLORS.ink,
  },
  companyDetail: {
    fontSize: 8,
    color: COLORS.muted,
    lineHeight: 1.5,
  },
  headerRight: {
    alignItems: 'flex-end',
    minWidth: 220,
  },
  invoiceNumberLabel: {
    fontSize: 7,
    color: COLORS.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  invoiceNumber: {
    fontSize: 20,
    fontFamily: 'Times-Roman',
    color: COLORS.ink,
    marginBottom: 14,
  },
  metaGrid: {
    width: '100%',
    gap: 4,
  },
  metaRowLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 18,
  },
  metaLabel: {
    fontSize: 7,
    color: COLORS.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 9,
    color: COLORS.ink,
    fontWeight: 'bold',
  },
  statusChip: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  // ---- Title ----
  titleBlock: {
    marginBottom: 20,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Times-Roman',
    fontWeight: 'bold',
    color: COLORS.ink,
    lineHeight: 1.35,
  },

  // ---- Billed to ----
  billedTo: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: COLORS.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  clientName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.ink,
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 9,
    color: COLORS.body,
    lineHeight: 1.5,
  },

  // ---- Line items ----
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.ruleStrong,
    paddingBottom: 8,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.rule,
  },
  colDescription: {
    width: '52%',
    paddingRight: 12,
    fontSize: 9,
    color: COLORS.body,
    lineHeight: 1.4,
  },
  colQty: {
    width: '10%',
    textAlign: 'right',
    fontSize: 9,
    color: COLORS.body,
  },
  colUnitPrice: {
    width: '19%',
    textAlign: 'right',
    fontSize: 9,
    color: COLORS.body,
  },
  unitPricePer: {
    fontSize: 7,
    fontStyle: 'italic',
    fontFamily: 'Times-Roman',
    color: COLORS.faint,
    marginTop: 1,
  },
  colAmount: {
    width: '19%',
    textAlign: 'right',
    fontSize: 9,
    color: COLORS.ink,
  },

  // ---- Totals ----
  totalsContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBlock: {
    width: 260,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLORS.muted,
  },
  totalsValue: {
    fontSize: 9,
    color: COLORS.body,
  },
  totalsDivider: {
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ruleStrong,
    marginTop: 10,
    paddingTop: 12,
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: 'Times-Roman',
    color: COLORS.ink,
  },

  // ---- Notes ----
  notesSection: {
    marginTop: 32,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
  },
  notesTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: COLORS.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    color: COLORS.body,
    lineHeight: 1.6,
  },

  // ---- Footer ----
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.rule,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: COLORS.faint,
    letterSpacing: 0.4,
  },
})

export interface InvoiceTemplateProps {
  invoice: {
    number: string
    status: string
    title: string
    poNumber: string
    issueDate: string | Date
    dueDate: string | Date
    taxRate: string
    subtotalCents: bigint
    taxCents: bigint
    totalCents: bigint
    notes: string
  }
  lineItems: Array<{
    id: string
    description: string
    quantity: string
    unitPriceCents: bigint
    lineTotalCents: bigint
    per: string
  }>
  client: {
    name: string
    email: string
    address: string
    city: string
    postcode: string
    country: string
  } | null
  company: {
    businessName: string
    address: string
    city: string
    postcode: string
    country: string
    email: string
    phone: string
    taxId: string
    defaultCurrency: string
  }
  logoSrc: string | null
}

function formatDate(date: string | Date): string {
  return formatDateOnly(date)
}

function companyAddress(c: InvoiceTemplateProps['company']): string {
  const parts = [c.address, [c.city, c.postcode].filter(Boolean).join(', '), c.country].filter(
    Boolean,
  )
  return parts.join('\n')
}

function clientAddress(c: NonNullable<InvoiceTemplateProps['client']>): string {
  const parts = [c.address, [c.city, c.postcode].filter(Boolean).join(', '), c.country].filter(
    Boolean,
  )
  return parts.join('\n')
}

export function InvoiceTemplate({
  invoice: inv,
  lineItems,
  client: cl,
  company,
  logoSrc,
}: InvoiceTemplateProps) {
  const currency = company.defaultCurrency || 'USD'
  const taxRate = Number(inv.taxRate)
  const status = STATUS_STYLES[inv.status]
  const isPaid = inv.status === 'paid'

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.topBar} fixed />

        {/* Header: company on left, invoice number + meta + status on right */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoSrc && <Image style={styles.logo} src={logoSrc} />}
            <View>
              <Text style={styles.companyName}>{company.businessName || '-'}</Text>
              <Text style={styles.companyDetail}>{companyAddress(company)}</Text>
              {company.email && <Text style={styles.companyDetail}>{company.email}</Text>}
              {company.phone && <Text style={styles.companyDetail}>{company.phone}</Text>}
              {company.taxId && <Text style={styles.companyDetail}>Tax ID: {company.taxId}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceNumberLabel}>Invoice no.</Text>
            <Text style={styles.invoiceNumber}>{inv.number}</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaRowLine}>
                <Text style={styles.metaLabel}>Issue date</Text>
                <Text style={styles.metaValue}>{formatDate(inv.issueDate)}</Text>
              </View>
              <View style={styles.metaRowLine}>
                <Text style={styles.metaLabel}>Due date</Text>
                <Text style={styles.metaValue}>{formatDate(inv.dueDate)}</Text>
              </View>
              {inv.poNumber ? (
                <View style={styles.metaRowLine}>
                  <Text style={styles.metaLabel}>PO number</Text>
                  <Text style={styles.metaValue}>{inv.poNumber}</Text>
                </View>
              ) : null}
              {status && (
                <View style={[styles.metaRowLine, { marginTop: 4 }]}>
                  <Text style={styles.metaLabel}>Status</Text>
                  <Text
                    style={[styles.statusChip, { backgroundColor: status.bg, color: status.text }]}
                  >
                    {status.label}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Title: the document's headline (only when set) */}
        {inv.title ? (
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{inv.title}</Text>
          </View>
        ) : null}

        {/* Billed to */}
        <View style={styles.billedTo}>
          <Text style={styles.sectionLabel}>Billed to</Text>
          {cl && (
            <>
              <Text style={styles.clientName}>{cl.name}</Text>
              <Text style={styles.clientDetail}>{clientAddress(cl)}</Text>
              {cl.email && <Text style={styles.clientDetail}>{cl.email}</Text>}
            </>
          )}
        </View>

        {/* Line items table header (fixed = repeats on every page) */}
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.tableHeaderText, { width: '52%' }]}>Description</Text>
          <Text style={[styles.tableHeaderText, { width: '10%', textAlign: 'right' }]}>
            Quantity
          </Text>
          <Text style={[styles.tableHeaderText, { width: '19%', textAlign: 'right' }]}>
            Unit price
          </Text>
          <Text style={[styles.tableHeaderText, { width: '19%', textAlign: 'right' }]}>Amount</Text>
        </View>

        {/* Line items (wrappable) */}
        <View wrap>
          {lineItems.map((li) => (
            <View style={styles.tableRow} key={li.id} wrap={false}>
              <Text style={styles.colDescription}>{li.description}</Text>
              <Text style={styles.colQty}>{li.quantity}</Text>
              <View style={styles.colUnitPrice}>
                <Text>{formatMoney(li.unitPriceCents, currency)}</Text>
                {li.per ? <Text style={styles.unitPricePer}>per {li.per}</Text> : null}
              </View>
              <Text style={styles.colAmount}>{formatMoney(li.lineTotalCents, currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatMoney(inv.subtotalCents, currency)}</Text>
            </View>
            {taxRate > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax {inv.taxRate}%</Text>
                <Text style={styles.totalsValue}>{formatMoney(inv.taxCents, currency)}</Text>
              </View>
            )}
            <View style={[styles.totalsRow, styles.totalsDivider]}>
              <Text style={styles.totalLabel}>{isPaid ? 'Amount paid' : 'Total due'}</Text>
              <Text style={styles.totalAmount}>{formatMoney(inv.totalCents, currency)}</Text>
            </View>
          </View>
        </View>

        {inv.notes ? (
          <View style={styles.notesSection} wrap={false}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{inv.notes}</Text>
          </View>
        ) : null}

        {/* Page footer with thin rule, company tagline on left, page count on right */}
        <View style={styles.footer} fixed>
          <Text>
            {[company.businessName, company.email].filter(Boolean).join(' · ') || inv.number}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
