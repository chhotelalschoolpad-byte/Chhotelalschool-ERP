import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Image, Svg, Path
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 7,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    position: 'relative',
  },

  // Outer Double Border
  pageBorder: {
    position: 'absolute', top: 10, left: 10, right: 10, bottom: 10,
    borderWidth: 1.5, borderColor: '#000', padding: 2,
  },
  innerPageBorder: {
    borderWidth: 1, borderColor: '#000', flex: 1, padding: 8,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  logoBox: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
  },
  schoolInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 90, // Balance the logo width to center text properly
  },
  schoolName: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: 6,
  },
  address: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  emailId: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  sessionLabel: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ef4444',
  },

  reportTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    padding: 5,
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  // Table Styling
  table: {
    marginTop: 5,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  th: {
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    borderRightWidth: 1.5,
    borderRightColor: '#000',
    textAlign: 'center',
    justifyContent: 'center',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  td: {
    padding: 5,
    fontSize: 9,
    borderRightWidth: 1.5,
    borderRightColor: '#000',
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thLast: { borderRightWidth: 0 },
  tdLast: { borderRightWidth: 0 },

  // Columns Widths (Total approx 780 for landscape narrow margins)
  colSno:      { width: 35 },
  colName:     { flex: 1.5, textAlign: 'left', paddingLeft: 10 },
  colClass:    { width: 55 },
  colYear:     { width: 55 },
  colPhone:    { width: 85 },
  colStatus:   { width: 65 },
  colPending:  { width: 65 },
  colFlagFull: { width: 55 },

  footerText: {
    marginTop: 20,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'left',
    color: '#dc2626',
  },
  printDate: {
    fontSize: 9,
    color: '#000',
    fontFamily: 'Helvetica',
  },

  iconContainer: {
    width: 14,
    height: 14,
  }
});

const StatusIcon = ({ condition }) => (
  <View style={styles.iconContainer}>
    {condition ? (
      <Svg viewBox="0 0 24 24">
        <Path
          d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
          fill="#10b981"
        />
      </Svg>
    ) : (
      <Svg viewBox="0 0 24 24">
        <Path
          d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z"
          fill="#ef4444"
        />
      </Svg>
    )}
  </View>
);

export default function PassoutListPDF({ students, filters, settings }) {
  const schoolName = settings?.schoolName || "CHHOTELAL SCHOOL BASTI";
  const schoolAddress = settings?.address || "Padari (Buchwapur), Kusaura Bazar, Basti, UP — 272301";
  const logo = settings?.logoBase64;
  const currentSession = filters?.academicYear === 'all' ? '2026-27' : filters?.academicYear;

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.pageBorder}>
          <View style={styles.innerPageBorder}>
            
            <View style={styles.header}>
              <View style={styles.logoBox}>
                {logo && <Image src={logo} style={styles.logo} />}
              </View>
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName}>{schoolName}</Text>
                <Text style={styles.address}>{schoolAddress}</Text>
                <Text style={styles.emailId}>E-mail Id :- chhotelalpublicjuniorschoolpad@gmail.com</Text>
                <Text style={styles.sessionLabel}>SESSION : ({currentSession})</Text>
              </View>
            </View>

            <Text style={styles.reportTitle}>PASSOUT STUDENT REGISTER ({currentSession})</Text>

            {/* Table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colSno]}>SNo</Text>
                <Text style={[styles.th, styles.colName]}>Full Student Name</Text>
                <Text style={[styles.th, styles.colClass]}>Class</Text>
                <Text style={[styles.th, styles.colYear]}>Session</Text>
                <Text style={[styles.th, styles.colStatus]}>Fees Status</Text>
                <Text style={[styles.th, styles.colPending]}>Pending</Text>
                <Text style={[styles.th, styles.colFlagFull]}>TC Taken</Text>
                <Text style={[styles.th, styles.colFlagFull]}>Result</Text>
                <Text style={[styles.th, styles.colFlagFull]}>Books</Text>
                <Text style={[styles.th, styles.tdLast, styles.colFlagFull]}>Uniform</Text>
              </View>

              {students.map((item, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, styles.colSno]}>{i + 1}</Text>
                  <View style={[styles.td, styles.colName, { alignItems: 'flex-start', justifyContent: 'center' }]}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9 }}>{item.fullName.toUpperCase()}</Text>
                    {(item.fatherName || item.address) && (
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: '#4b5563', marginTop: 2 }}>
                        {item.fatherName ? `Father: ${item.fatherName}` : ''}
                        {item.fatherName && item.address ? ' | ' : ''}
                        {item.address ? `Address: ${item.address}` : ''}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.td, styles.colClass]}>{item.className}</Text>
                  <Text style={[styles.td, styles.colYear]}>{item.academicYear}</Text>
                  <Text style={[styles.td, styles.colStatus, { color: item.feesStatus === 'PAID' ? '#10b981' : '#ef4444', fontFamily: 'Helvetica-Bold' }]}>{item.feesStatus}</Text>
                  <Text style={[styles.td, styles.colPending, { fontFamily: 'Helvetica-Bold' }]}>{item.feesStatus === 'PAID' ? '0' : (item.pendingAmount > 0 ? item.pendingAmount : '0')}</Text>
                  <View style={[styles.td, styles.colFlagFull]}><StatusIcon condition={item.tcTaken} /></View>
                  <View style={[styles.td, styles.colFlagFull]}><StatusIcon condition={item.resultCollected} /></View>
                  <View style={[styles.td, styles.colFlagFull]}><StatusIcon condition={item.booksPaid} /></View>
                  <View style={[styles.td, styles.tdLast, styles.colFlagFull]}><StatusIcon condition={item.uniformPaid} /></View>
                </View>
              ))}
            </View>

            <View style={{ marginTop: 20 }}>
              <Text style={styles.footerText}>Authentic Record <Text style={styles.printDate}>Printed on {printDate}</Text></Text>
            </View>
            
          </View>
        </View>
      </Page>
    </Document>
  );
}
