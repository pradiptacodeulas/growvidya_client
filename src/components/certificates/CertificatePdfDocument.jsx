import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    padding: 20,
    position: 'relative',
    fontFamily: 'Times-Roman',
    color: '#1e293b',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  innerFrame: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#c5a059',
    borderStyle: 'solid',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'dashed',
    paddingBottom: 5,
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    marginRight: 4,
    textTransform: 'uppercase',
  },
  serialNumber: {
    fontSize: 9.5,
    fontFamily: 'Courier-Bold',
    color: '#b91c1c',
  },
  metaValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  header: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  crest: {
    width: 42,
    height: 42,
    objectFit: 'contain',
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 19,
    fontFamily: 'Times-Bold',
    color: '#0c2340',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  affiliation: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#475569',
    marginTop: 2,
    textAlign: 'center',
  },
  addressCode: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginTop: 2,
    textAlign: 'center',
  },
  ornateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '60%',
    marginVertical: 4,
    alignSelf: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#c5a059',
  },
  dividerDiamond: {
    fontSize: 7.5,
    color: '#c5a059',
    marginHorizontal: 6,
  },
  titleWrapper: {
    alignItems: 'center',
    marginVertical: 4,
  },
  titleBadge: {
    fontSize: 12.5,
    fontFamily: 'Times-Bold',
    color: '#0c2340',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingVertical: 3.5,
    paddingHorizontal: 18,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#c5a059',
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
    textAlign: 'center',
  },
  leadIn: {
    fontSize: 11,
    fontFamily: 'Times-Italic',
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 2,
  },
  recipientWrapper: {
    alignItems: 'center',
    marginVertical: 4,
  },
  recipientName: {
    fontSize: 19,
    fontFamily: 'Times-Bold',
    color: '#0c2340',
    letterSpacing: 0.8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#c5a059',
    paddingBottom: 2,
    paddingHorizontal: 14,
    textAlign: 'center',
  },
  bodyContent: {
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  bodyParagraph: {
    fontSize: 10,
    lineHeight: 1.8,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 4,
  },
  bodyHighlight: {
    fontFamily: 'Times-Bold',
    color: '#0f172a',
    textDecoration: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 6,
  },
  signBlock: {
    width: 130,
    alignItems: 'center',
  },
  signLine: {
    width: 110,
    height: 1,
    backgroundColor: '#0f172a',
    marginBottom: 4,
  },
  signTitle: {
    fontSize: 9,
    fontFamily: 'Times-Bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  signSubtitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 1,
  },
  sealBlock: {
    alignItems: 'center',
  },
  sealCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#c5a059',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffcf0',
  },
  sealInnerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#0c2340',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    fontSize: 5,
    fontFamily: 'Helvetica-Bold',
    color: '#0c2340',
    textAlign: 'center',
  },
  sealSubText: {
    fontSize: 4.5,
    fontFamily: 'Helvetica-Bold',
    color: '#c5a059',
    textAlign: 'center',
    marginTop: 1,
  },
});

const parseBodyParagraphs = (template, student, dateStr) => {
  const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Student';
  const guardian = student?.guardian_name || student?.father_name || 'Mr. Parent';
  const dob = student?.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString('en-GB')
    : '—';
  const clsName = student?.class_name || student?.class || 'I';
  const secName = student?.section_name || student?.section || 'A';
  const rollNo = student?.roll_number || '1';
  const admNo = student?.admission_number || (student?.id ? `AD${student.id}` : '');
  const admDate = student?.admission_date
    ? new Date(student.admission_date).toLocaleDateString('en-GB')
    : '12/02/2026';
  const academicYear = student?.academic_year || '2025-2026';

  let desc = template?.description || template?.certificate_description || '';

  if (!desc.trim()) {
    return [
      [
        { text: 'Son / Daughter of ' },
        { text: guardian, highlight: true },
        { text: ', bearing Admission No. ' },
        { text: admNo, highlight: true },
        { text: ' and Roll No. ' },
        { text: rollNo, highlight: true },
        { text: '. His / Her Date of Birth according to the official school record is ' },
        { text: dob, highlight: true },
        { text: '. He / She was admitted on ' },
        { text: admDate, highlight: true },
        { text: ' and has completed the academic session ' },
        { text: academicYear, highlight: true },
        { text: ' in Class ' },
        { text: clsName, highlight: true },
        { text: ` (Section ${secName}). All school dues on his/her account have been cleared in full up to date, and he/she bears a good moral character and conduct.` },
      ],
    ];
  }

  let text = desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, '');

  if (template?.certificate_heading) {
    const hReg = new RegExp(`^\\s*${template.certificate_heading}\\s*`, 'i');
    text = text.replace(hReg, '').trim();
  }
  text = text.replace(/\n\s*Principal\s*\/[^\n]*\n[\s\S]*$/i, '').trim();

  text = text
    .replace(/\{\{\s*(?:student_)?name\s*\}\}/gi, `~~~HL~~~${fullName}~~~END_HL~~~`)
    .replace(/\{\{\s*(?:guardian|father)_name\s*\}\}/gi, `~~~HL~~~${guardian}~~~END_HL~~~`)
    .replace(/\{\{\s*(?:date_of_birth|dob)\s*\}\}/gi, `~~~HL~~~${dob}~~~END_HL~~~`)
    .replace(/\{\{\s*class(?:_name)?\s*\}\}/gi, `~~~HL~~~${clsName}~~~END_HL~~~`)
    .replace(/\{\{\s*section\s*\}\}/gi, `~~~HL~~~${secName}~~~END_HL~~~`)
    .replace(/\{\{\s*roll_(?:number|no)\s*\}\}/gi, `~~~HL~~~${rollNo}~~~END_HL~~~`)
    .replace(/\{\{\s*academic_year\s*\}\}/gi, `~~~HL~~~${academicYear}~~~END_HL~~~`)
    .replace(/\{\{\s*(?:admission_number|admission_no)\s*\}\}/gi, `~~~HL~~~${admNo}~~~END_HL~~~`)
    .replace(/\{\{\s*admission_date\s*\}\}/gi, `~~~HL~~~${admDate}~~~END_HL~~~`)
    .replace(/\{\{\s*(?:issue_)?date\s*\}\}/gi, `~~~HL~~~${dateStr}~~~END_HL~~~`);

  text = text
    .replace(/Mr\.\/Ms\.\s*_{2,}/gi, `Mr./Ms. ~~~HL~~~${fullName}~~~END_HL~~~`)
    .replace(/son\/daughter of Mr\.\/Mrs\.\s*_{2,}/gi, `son/daughter of Mr./Mrs. ~~~HL~~~${guardian}~~~END_HL~~~`)
    .replace(/Class\/Grade\s*_{2,}/gi, `Class/Grade ~~~HL~~~${clsName}~~~END_HL~~~`)
    .replace(/Roll No\.\s*_{2,}/gi, `Roll No. ~~~HL~~~${rollNo}~~~END_HL~~~`)
    .replace(/academic session\s*_{2,}/gi, `academic session ~~~HL~~~${academicYear}~~~END_HL~~~`)
    .replace(/Date:\s*_{2,}/gi, `Date: ~~~HL~~~${dateStr}~~~END_HL~~~`);

  if (!text.includes('~~~HL')) {
    if (fullName && fullName !== 'Student') {
      text = text.split(fullName).join(`~~~HL~~~${fullName}~~~END_HL~~~`);
    }
    if (guardian && guardian !== 'Mr. Parent') {
      text = text.split(guardian).join(`~~~HL~~~${guardian}~~~END_HL~~~`);
    }
  }

  const paras = text.split(/\n\s*\n+/);
  return paras.map((para) => {
    const parts = para.split(/(~~~HL~~~[\s\S]*?~~~END_HL~~~)/g);
    return parts.map((part) => {
      if (part.startsWith('~~~HL~~~')) {
        return {
          text: part.replace('~~~HL~~~', '').replace('~~~END_HL~~~', ''),
          highlight: true,
        };
      }
      return { text: part, highlight: false };
    });
  });
};

export const CertificatePdfDocument = ({
  certificates = [],
  schoolInfo = {},
}) => {
  const {
    schoolName = '',
    affiliation = '',
    schoolAddress = '',
    schoolCode = '',
    schoolLogoSrc,
  } = schoolInfo;

  return (
    <Document>
      {certificates.map((certItem, idx) => {
        const student = certItem.student || certItem;
        const template = certItem.template || {
          template_name: certItem.template_name,
          certificate_heading: certItem.certificate_heading,
          certified_by: certItem.certified_by,
          description: certItem.certificate_description || certItem.description || '',
        };
        const dateStr = certItem.date || certItem.certificate_date || '';
        const formattedDate = dateStr
          ? new Date(dateStr).toLocaleDateString('en-GB')
          : new Date().toLocaleDateString('en-GB');
        const serialNo = certItem.id || student?.id || 100 + idx;
        const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Student';
        const borderImg = certItem.borderImg || certItem.border;
        const heading = template?.certificate_heading || template?.template_name || 'TRANSFER CERTIFICATE';
        const certifiedBy = template?.certified_by || certItem.certified_by || 'Principal';
        const paragraphs = parseBodyParagraphs(template, student, formattedDate);

        return (
          <Page key={idx} size="A4" orientation="portrait" style={styles.page}>
            {borderImg && (
              <Image src={borderImg} style={styles.backgroundImage} />
            )}

            <View style={styles.innerFrame}>
              {/* Top Metadata Header */}
              <View style={styles.topRow}>
                <View style={styles.metaGroup}>
                  <Text style={styles.metaLabel}>CERTIFICATE NO:</Text>
                  <Text style={styles.serialNumber}>{serialNo}</Text>
                </View>
                <View style={styles.metaGroup}>
                  <Text style={styles.metaLabel}>DATE OF ISSUE:</Text>
                  <Text style={styles.metaValue}>{formattedDate}</Text>
                </View>
              </View>

              {/* School Header */}
              <View style={styles.header}>
                {schoolLogoSrc && (
                  <Image src={schoolLogoSrc} style={styles.crest} />
                )}
                <Text style={styles.schoolName}>{schoolName}</Text>
                {affiliation ? <Text style={styles.affiliation}>{affiliation}</Text> : null}
                <Text style={styles.addressCode}>
                  {schoolAddress} {schoolCode ? ` • ${schoolCode}` : ''}
                </Text>
                <View style={styles.ornateDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerDiamond}>*</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>

              {/* Title Badge */}
              <View style={styles.titleWrapper}>
                <Text style={styles.titleBadge}>{heading}</Text>
              </View>

              {/* Lead-in */}
              <Text style={styles.leadIn}>This is to certify that</Text>

              {/* Recipient Name */}
              <View style={styles.recipientWrapper}>
                <Text style={styles.recipientName}>{fullName}</Text>
              </View>

              {/* Body Text */}
              <View style={styles.bodyContent}>
                {paragraphs.map((paraParts, pIdx) => (
                  <Text key={pIdx} style={styles.bodyParagraph}>
                    {paraParts.map((part, partIdx) => (
                      <Text
                        key={partIdx}
                        style={part.highlight ? styles.bodyHighlight : undefined}
                      >
                        {part.text}
                      </Text>
                    ))}
                  </Text>
                ))}
              </View>

              {/* Dual Signatures & Seal Footer */}
              <View style={styles.footer}>
                <View style={styles.signBlock}>
                  <View style={styles.signLine} />
                  <Text style={styles.signTitle}>Class Teacher</Text>
                  <Text style={styles.signSubtitle}>Authorized Verification</Text>
                </View>

                <View style={styles.sealBlock}>
                  <View style={styles.sealCircle}>
                    <View style={styles.sealInnerCircle}>
                      <Text style={styles.sealText}>OFFICIAL SEAL</Text>
                      <Text style={styles.sealSubText}>EXCELLENCE</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.signBlock}>
                  <View style={styles.signLine} />
                  <Text style={styles.signTitle}>{certifiedBy}</Text>
                  <Text style={styles.signSubtitle}>{schoolName}</Text>
                </View>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default CertificatePdfDocument;
