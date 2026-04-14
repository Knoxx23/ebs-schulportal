import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import dotenv from 'dotenv';

dotenv.config();

const DOCUMENTS_PATH = path.resolve(process.env.DOCUMENTS_PATH || './documents');
const TEMPLATE_PATH = path.resolve(process.env.TEMPLATE_PATH || '../../EBS_blanko.doc');

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr || '';
  }
}

function mapGender(gender: string | null): string {
  if (!gender) return '';
  const map: Record<string, string> = {
    'm': 'männlich',
    'f': 'weiblich',
    'w': 'weiblich',
    'd': 'divers',
    'male': 'männlich',
    'female': 'weiblich',
    'diverse': 'divers',
  };
  return map[gender.toLowerCase()] || gender;
}

function mapFuturePath(path: string | null): string {
  if (!path) return '';
  const map: Record<string, string> = {
    'A': 'Weiterführende Schule',
    'B': 'Berufsausbildung',
    'C': 'Weiterhin Schule',
    'D': 'Sonstiges',
  };
  return map[path] || path;
}

export interface DocumentResult {
  documentPath: string;
  documentHash: string;
}

export async function generateDocument(caseRecord: any): Promise<DocumentResult> {
  // Ensure documents directory exists
  if (!fs.existsSync(DOCUMENTS_PATH)) {
    fs.mkdirSync(DOCUMENTS_PATH, { recursive: true });
  }

  // Check if template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    // If no template found, create a simple placeholder document
    return generatePlaceholderDocument(caseRecord);
  }

  try {
    const templateContent = fs.readFileSync(TEMPLATE_PATH, 'binary');
    const zip = new PizZip(templateContent);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '«', end: '»' },
    });

    const data = {
      Nachname: caseRecord.last_name || '',
      Vorname: caseRecord.first_name || '',
      Geburtsdatum: formatDate(caseRecord.birth_date),
      Geburtsort: caseRecord.birth_place || '',
      Geschlecht: mapGender(caseRecord.gender),
      Staatsangehörigkeit: caseRecord.nationality || '',
      Erziehungsberechtigter: caseRecord.guardian_name || '',
      Erzieher_Straße: caseRecord.guardian_street || '',
      Erzieher_Postleitzahl: caseRecord.guardian_zip || '',
      Erzieher_Ort: caseRecord.guardian_city || '',
      TelefonNr: caseRecord.phone || '',
      Email: caseRecord.email || '',
      Kindergarten: caseRecord.kindergarten || '',
      Einschulungsjahr: caseRecord.enrollment_year || '',
      Aufnahmedatum: formatDate(caseRecord.enrollment_date),
      KünftigeTätigkeit: mapFuturePath(caseRecord.future_path),
      ZukünftigeSchule: caseRecord.future_school || '',
      Bemerkungen: caseRecord.future_notes || '',
      Erstellungsdatum: formatDate(new Date().toISOString()),
    };

    doc.render(data);

    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    const fileName = `EBS_${caseRecord.id}_${Date.now()}.docx`;
    const filePath = path.join(DOCUMENTS_PATH, fileName);
    fs.writeFileSync(filePath, buf);

    const hash = crypto.createHash('sha256').update(buf).digest('hex');

    return { documentPath: filePath, documentHash: hash };
  } catch (error) {
    console.error('docxtemplater error:', error);
    // Fall back to placeholder
    return generatePlaceholderDocument(caseRecord);
  }
}

async function generatePlaceholderDocument(caseRecord: any): Promise<DocumentResult> {
  // Create a minimal valid .docx using PizZip
  const fileName = `EBS_${caseRecord.id}_${Date.now()}.docx`;
  const filePath = path.join(DOCUMENTS_PATH, fileName);

  // Create a minimal Word document structure
  const content = `
Einschulungsblatt (EBS)
=======================

Schüler/in:
  Nachname: ${caseRecord.last_name || ''}
  Vorname: ${caseRecord.first_name || ''}
  Geburtsdatum: ${formatDate(caseRecord.birth_date)}
  Geburtsort: ${caseRecord.birth_place || ''}
  Geschlecht: ${mapGender(caseRecord.gender)}
  Staatsangehörigkeit: ${caseRecord.nationality || ''}

Erziehungsberechtigte/r:
  Name: ${caseRecord.guardian_name || ''}
  Straße: ${caseRecord.guardian_street || ''}
  PLZ: ${caseRecord.guardian_zip || ''}
  Ort: ${caseRecord.guardian_city || ''}
  Telefon: ${caseRecord.phone || ''}
  E-Mail: ${caseRecord.email || ''}

Schullaufbahn:
  Kindergarten/Kita: ${caseRecord.kindergarten || ''}
  Einschulungsjahr: ${caseRecord.enrollment_year || ''}
  Aufnahmedatum: ${formatDate(caseRecord.enrollment_date)}

Künftige Tätigkeit: ${mapFuturePath(caseRecord.future_path)}
  Schule: ${caseRecord.future_school || ''}
  Bemerkungen: ${caseRecord.future_notes || ''}

Erstellt am: ${formatDate(new Date().toISOString())}
`;

  // Create a basic docx using PizZip
  const zip = new PizZip();
  const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink"
  xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:oel="http://schemas.microsoft.com/office/2019/extlst"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
  xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex"
  xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid"
  xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml"
  xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"
  xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh wp14">
  <w:body>
${content.split('\n').map(line =>
    `    <w:p><w:r><w:t xml:space="preserve">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`
  ).join('\n')}
    <w:sectPr/>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', wordXml);
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

  const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(filePath, buf);

  const hash = crypto.createHash('sha256').update(buf).digest('hex');

  return { documentPath: filePath, documentHash: hash };
}
