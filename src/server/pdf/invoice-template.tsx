import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import { formatDateOnly } from '#/lib/date-only'
import { formatMoney } from '#/lib/money'

Font.register({
  family: 'Helvetica',
  fonts: [{ src: 'Helvetica' }, { src: 'Helvetica-Bold', fontWeight: 'bold' }],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 8,
    color: '#555',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#888',
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 9,
    color: '#555',
    textAlign: 'right',
    marginTop: 4,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  billingBlock: {
    maxWidth: '45%',
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  clientName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 30,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: '#888',
  },
  metaValue: {
    fontSize: 9,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  colDescription: {
    width: '50%',
    paddingRight: 8,
  },
  colQty: {
    width: '12%',
    textAlign: 'right',
  },
  colUnitPrice: {
    width: '19%',
    textAlign: 'right',
  },
  colAmount: {
    width: '19%',
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalsContainer: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalsBlock: {
    width: 200,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalsLabel: {
    color: '#555',
  },
  totalsBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 4,
    paddingTop: 6,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  notesSection: {
    marginTop: 30,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#333',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#aaa',
  },
})

export interface InvoiceTemplateProps {
  invoice: {
    number: string
    status: string
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

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoSrc && <Image style={styles.logo} src={logoSrc} />}
            <View>
              <Text style={styles.companyName}>{company.businessName || '-'}</Text>
              <Text style={styles.companyDetail}>{companyAddress(company)}</Text>
              {company.email && <Text style={styles.companyDetail}>{company.email}</Text>}
              {company.taxId && <Text style={styles.companyDetail}>Tax ID: {company.taxId}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{inv.number}</Text>
          </View>
        </View>

        {/* Billing + Meta */}
        <View style={styles.billingRow}>
          <View style={styles.billingBlock}>
            <Text style={styles.sectionLabel}>Billed to</Text>
            {cl && (
              <>
                <Text style={styles.clientName}>{cl.name}</Text>
                <Text style={styles.companyDetail}>{clientAddress(cl)}</Text>
                {cl.email && <Text style={styles.companyDetail}>{cl.email}</Text>}
              </>
            )}
          </View>
          <View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue date: </Text>
              <Text style={styles.metaValue}>{formatDate(inv.issueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due date: </Text>
              <Text style={styles.metaValue}>{formatDate(inv.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Line items table header (fixed = repeats on every page) */}
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>Unit price</Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
        </View>

        {/* Line items (wrappable) */}
        <View wrap>
          {lineItems.map((li) => (
            <View style={styles.tableRow} key={li.id} wrap={false}>
              <Text style={styles.colDescription}>{li.description}</Text>
              <Text style={styles.colQty}>{li.quantity}</Text>
              <Text style={styles.colUnitPrice}>{formatMoney(li.unitPriceCents, currency)}</Text>
              <Text style={styles.colAmount}>{formatMoney(li.lineTotalCents, currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text>{formatMoney(inv.subtotalCents, currency)}</Text>
            </View>
            {taxRate > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax {inv.taxRate}%</Text>
                <Text>{formatMoney(inv.taxCents, currency)}</Text>
              </View>
            )}
            <View style={[styles.totalsRow, styles.totalsBorder]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatMoney(inv.totalCents, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {inv.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{inv.notes}</Text>
          </View>
        ) : null}

        {/* Page footer with page numbers */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
