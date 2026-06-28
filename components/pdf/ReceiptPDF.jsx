"use client"

import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    position: 'relative',
  },

  // Outer Double Border
  pageBorder: {
    position: 'absolute', top: 15, left: 15, right: 15, bottom: 15,
    borderWidth: 1, borderColor: '#000', padding: 2,
  },
  innerPageBorder: {
    borderWidth: 1, borderColor: '#000', flex: 1, padding: 10,
  },

  header: {
    flexDirection: 'row',
    borderBottomWidth: 2, borderBottomColor: '#000',
    paddingBottom: 15, marginBottom: 10,
  },
  logoBox: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 70, height: 70 },
  schoolInfo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  schoolName: {
    fontSize: 22, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase',
    color: '#1e3a8a', textAlign: 'center', marginBottom: 4,
  },
  address: { fontSize: 10, textAlign: 'center', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  emailId: { fontSize: 10, textAlign: 'center', fontFamily: 'Helvetica-Bold', marginTop: 8 },
  sessionLabel: { marginTop: 6, fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ef4444' },

  receiptTitle: {
    textAlign: 'center', fontSize: 12, fontFamily: 'Helvetica-Bold',
    padding: 4, borderBottomWidth: 1, borderBottomColor: '#000',
    marginBottom: 10, textTransform: 'uppercase',
  },

  // Info Section Grid
  infoRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#000', borderBottomWidth: 0 },
  infoCell: { flex: 1, flexDirection: 'row', padding: 6, borderRightWidth: 1, borderRightColor: '#000' },
  infoCellLast: { flex: 1, flexDirection: 'row', padding: 6 },
  label: { width: 90, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  value: { flex: 1, fontSize: 9, fontFamily: 'Helvetica' },

  // Table Styling
  table: { marginTop: 10, borderWidth: 1, borderColor: '#000' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1.5, borderBottomColor: '#000' },
  th: {
    padding: 6, fontFamily: 'Helvetica-Bold', fontSize: 8,
    textTransform: 'uppercase', borderRightWidth: 1, borderRightColor: '#000', textAlign: 'center',
  },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000' },
  td: { padding: 5, fontSize: 9, borderRightWidth: 1, borderRightColor: '#000', textAlign: 'center' },
  thLast: { borderRightWidth: 0 },
  tdLast: { borderRightWidth: 0 },

  // Columns Widths
  colSno:      { width: 30 },
  colParticulars: { flex: 1, textAlign: 'left', paddingLeft: 10 },
  colMonth:    { width: 60 },
  colPayable:  { width: 65, textAlign: 'right' },
  colDiscount: { width: 60, textAlign: 'right' },
  colPaid:     { width: 65, textAlign: 'right' },
  colDue:      { width: 60, textAlign: 'right' },

  totalRow: { flexDirection: 'row', borderBottomWidth: 0, backgroundColor: '#fff' },

  // Footer Boxes
  summaryGrid: { marginTop: 10, flexDirection: 'row', borderWidth: 1, borderColor: '#000' },
  summaryCol: { flex: 1, borderRightWidth: 1, borderRightColor: '#000' },
  summaryColLast: { flex: 1 },
  summaryRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', padding: 5 },
  summaryRowLast: { flexDirection: 'row', padding: 5 },
  summaryLabel: { width: 100, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  summaryValue: { flex: 1, fontSize: 9, textAlign: 'center' },

  signatureArea: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  parentCopy: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  signBlock: { alignItems: 'center', width: 120 },
  signLine: {
    fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center',
    borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4, width: '100%',
  },
  adminTag: { fontSize: 9, fontFamily: 'Helvetica', marginBottom: 20 },
});

export default function ReceiptPDF({ payment, student, settings }) {
  // Safe extraction of props
  const schoolName = settings?.schoolName || "Chhotelal Public School";
  const schoolAddress = settings?.address || "Padari (Buchwapur), Kusaura Bazar, Basti, UP — 272301";
  const logo = settings?.logoBase64 || "/school-logo.png";

  const {
    receiptNumber        = '--',
    paymentDate          = new Date(),
    paymentMode          = 'Cash',
    discount             = 0,
    amount: totalPaidAmt = 0,
    month: payMonth      = '',
    previousDueCleared   = 0,
    recordedBy           = 'admin'
  } = payment || {};

  // CRITICAL FIX: Robust paymentItems detection
  const pItemsRaw = payment?.paymentItems;
  let rawItems = [];
  try {
     if (Array.isArray(pItemsRaw)) {
        rawItems = pItemsRaw;
     } else if (typeof pItemsRaw === 'string') {
        rawItems = JSON.parse(pItemsRaw);
     }
  } catch (e) {
     rawItems = [];
  }

  const {
    fullName        = '--',
    admissionNumber = '--',
    className       = '--',
    fatherName      = '--',
    motherName      = '--',
    mobile1         = '--',
    previousDue     = 0,
    previousDuePaid = 0,
  } = student || {};

  // Session Logic
  const getSession = () => {
    if (payMonth && payMonth.includes('-')) {
      const [y] = payMonth.split('-').map(Number);
      if (!isNaN(y)) {
        return `${y}-${(y + 1).toString().slice(-2)}`;
      }
    }
    const d = new Date(paymentDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; 
    if (m >= 4) return `${y}-${(y + 1).toString().slice(-2)}`;
    return `${y - 1}-${y.toString().slice(-2)}`;
  };
  const sessionStr = getSession();
  const printDate = new Date(paymentDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  });

  const formatMonthLabel = (ym) => {
    if (!ym) return '—';
    const [y, m] = ym.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-IN', { month: 'short' });
  };

  // Build Table Rows
  let finalRows = [...rawItems];
  if (Number(previousDueCleared) > 0) {
    finalRows.push({ type: 'Legacy Balance Cleared', amount: Number(previousDueCleared) });
  }

  // Final Fallback if empty
  if (finalRows.length === 0) {
    finalRows.push({ type: 'FEE PAYMENT', amount: Number(totalPaidAmt) + Number(discount) });
  }

  // Identification Logic
  const monthlyRowIdx = finalRows.findIndex(r => r.type?.toLowerCase().includes('monthly'));
  const topRowIdx = monthlyRowIdx !== -1 ? monthlyRowIdx : 0;
  
  // Calculate remaining balance strictly
  const remainDue = Math.max(0, Number(previousDue) - Number(previousDuePaid));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.pageBorder}>
          <View style={styles.innerPageBorder}>
            
            <View style={styles.header}>
              <View style={styles.logoBox}><Image src={logo} style={styles.logo} /></View>
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName}>{schoolName}</Text>
                <Text style={styles.address}>{schoolAddress}</Text>
                <Text style={styles.emailId}>E-mail Id :- chhotelalpublicjuniorschoolpad@gmail.com</Text>
                <Text style={styles.sessionLabel}>SESSION : ({sessionStr})</Text>
              </View>
            </View>

            <Text style={styles.receiptTitle}>Fee Receipt({sessionStr})</Text>

            {/* Info Grid */}
            <View style={styles.infoRow}>
               <View style={styles.infoCell}><Text style={styles.label}>Receipt No</Text><Text style={styles.value}>{receiptNumber}</Text></View>
               <View style={styles.infoCellLast}><Text style={styles.label}>Date</Text><Text style={styles.value}>{printDate}</Text></View>
            </View>
            <View style={styles.infoRow}>
               <View style={styles.infoCell}><Text style={styles.label}>Name</Text><Text style={styles.value}>{fullName.toUpperCase()}</Text></View>
               <View style={styles.infoCellLast}><Text style={styles.label}>Class</Text><Text style={styles.value}>{className}</Text></View>
            </View>
            <View style={styles.infoRow}>
               <View style={styles.infoCell}><Text style={styles.label}>Adm No</Text><Text style={styles.value}>{admissionNumber}</Text></View>
               <View style={styles.infoCellLast}><Text style={styles.label}>Mother's Name</Text><Text style={styles.value}>{motherName?.toUpperCase() || '--'}</Text></View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 1 }]}>
               <View style={styles.infoCell}><Text style={styles.label}>Father's Name</Text><Text style={styles.value}>{fatherName.toUpperCase() || '--'}</Text></View>
               <View style={styles.infoCellLast}><Text style={styles.label}>Phone Number</Text><Text style={styles.value}>{mobile1 || '--'}</Text></View>
            </View>

            {/* Table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colSno]}>Sno</Text>
                <Text style={[styles.th, styles.colParticulars]}>Particulars</Text>
                <Text style={[styles.th, styles.colMonth]}>Month</Text>
                <Text style={[styles.th, styles.colPayable]}>Payable</Text>
                <Text style={[styles.th, styles.colDiscount]}>Discount</Text>
                <Text style={[styles.th, styles.colPaid]}>Paid</Text>
                <Text style={[styles.th, styles.thLast, styles.colDue]}>Due</Text>
              </View>

              {finalRows.map((item, i) => {
                 const isMo = item.type?.toLowerCase().includes('monthly');
                 const itemD = isMo ? Number(discount) : 0;
                 const isFirst = (i === topRowIdx);
                 return (
                  <View key={i} style={styles.tr}>
                    <Text style={[styles.td, styles.colSno]}>{i + 1}</Text>
                    <Text style={[styles.td, styles.colParticulars]}>{item.type?.toUpperCase() || 'FEE PAYMENT'}</Text>
                    <Text style={[styles.td, styles.colMonth]}>{isMo ? formatMonthLabel(payMonth) : '—'}</Text>
                    <Text style={[styles.td, styles.colPayable]}>{Math.round(item.amount + itemD)}</Text>
                    <Text style={[styles.td, styles.colDiscount]}>{Math.round(itemD)}</Text>
                    <Text style={[styles.td, styles.colPaid]}>{Math.round(item.amount)}</Text>
                    <Text style={[styles.td, styles.tdLast, styles.colDue]}>{isFirst && remainDue > 0 ? Math.round(remainDue) : '—'}</Text>
                  </View>
                 );
              })}

              {/* Total Footer Row */}
              <View style={[styles.tr, styles.totalRow]}>
                <Text style={[styles.td, styles.colSno, { borderRightWidth: 0 }]}></Text>
                <Text style={[styles.td, styles.colParticulars, { fontFamily: 'Helvetica-Bold', textAlign: 'center' }]}>TOTAL</Text>
                <Text style={[styles.td, styles.colMonth]}></Text>
                <Text style={[styles.td, styles.colPayable, { fontFamily: 'Helvetica-Bold' }]}>{Math.round(finalRows.reduce((a, b) => a + Number(b.amount || 0), 0) + Number(discount))}</Text>
                <Text style={[styles.td, styles.colDiscount, { fontFamily: 'Helvetica-Bold' }]}>{Math.round(discount)}</Text>
                <Text style={[styles.td, styles.colPaid, { fontFamily: 'Helvetica-Bold' }]}>{Math.round(totalPaidAmt)}</Text>
                <Text style={[styles.td, styles.tdLast, styles.colDue, { fontFamily: 'Helvetica-Bold' }]}>{Math.round(remainDue)}</Text>
              </View>
            </View>

            {/* Final Footer Boxes */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCol}>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Balance Amount</Text><Text style={styles.summaryValue}>{remainDue > 0 ? Math.round(remainDue) : ''}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Late Fee</Text><Text style={styles.summaryValue}></Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Payment Mode</Text><Text style={styles.summaryValue}>{paymentMode}</Text></View>
                <View style={styles.summaryRowLast}><Text style={styles.summaryLabel}>Bank Name</Text><Text style={styles.summaryValue}></Text></View>
              </View>
              <View style={styles.summaryColLast}>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Payable Fee</Text><Text style={styles.summaryValue}></Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Adjustment</Text><Text style={styles.summaryValue}>{Number(discount) > 0 ? Math.round(discount) : ''}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Currently Received</Text><Text style={[styles.summaryValue, { fontFamily: 'Helvetica-Bold' }]}>{Math.round(totalPaidAmt)}</Text></View>
                <View style={styles.summaryRowLast}><Text style={styles.summaryLabel}>Cheque No/Date</Text><Text style={styles.summaryValue}>-</Text></View>
              </View>
            </View>

            <View style={{ marginTop: 8, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 2 }}>
               <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>Remark :</Text>
            </View>

            <View style={styles.signatureArea}>
              <View>
                 <Text style={[styles.parentCopy, { color: '#dc2626' }]}>Parent Copy <Text style={{ color: '#000' }}>Printed on {printDate}</Text></Text>
              </View>
              <View style={styles.signBlock}>
                <Text style={styles.adminTag}>{recordedBy}</Text>
                <Text style={styles.signLine}>Auth. Sign</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
