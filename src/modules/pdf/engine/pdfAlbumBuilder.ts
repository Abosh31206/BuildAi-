import { jsPDF } from 'jspdf';
import { ProjectAlbumData } from '../types';

/**
 * Builds a multi-sheet engineering project album using jsPDF.
 * Renders:
 * - Sheet 1: Title page (Титульный лист) with SPDS border and official attributes.
 * - Sheet 2: General Data & Calculation Summary (Общие данные и сводка расчетов по СП РК).
 * - Sheet 3: Floor Plan Drawing & Room Explication (План этажа, экспликация и штамп ГОСТ 21.101).
 * - Sheet 4: Material Specification (Спецификация и ведомость материалов ГОСТ 21.110).
 */
export function generatePdfAlbum(data: ProjectAlbumData, language: 'ru' | 'kk' = 'ru') {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // SPDS Margins: Left = 20mm, Right = 5mm, Top = 5mm, Bottom = 5mm
  const marginLeft = 20;
  const marginRight = 5;
  const marginTop = 5;
  const marginBottom = 5;

  const frameWidth = pageWidth - marginLeft - marginRight; // 272 mm
  const frameHeight = pageHeight - marginTop - marginBottom; // 200 mm

  const drawGostFrame = (isTitlePage: boolean = false, sheetNum: number = 1, totalSheets: number = 4) => {
    // Outer border (thin)
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.7);
    doc.rect(marginLeft, marginTop, frameWidth, frameHeight);

    if (isTitlePage) {
      // Decorative inner border for Title Sheet
      doc.setLineWidth(0.2);
      doc.rect(marginLeft + 2, marginTop + 2, frameWidth - 4, frameHeight - 4);
      return;
    }

    // Standard SPDS Title Block (ГОСТ 21.101 Form 3): 185mm wide x 55mm high in bottom-right corner
    const stampW = 185;
    const stampH = 55;
    const stampX = marginLeft + frameWidth - stampW;
    const stampY = marginTop + frameHeight - stampH;

    doc.setLineWidth(0.6);
    doc.rect(stampX, stampY, stampW, stampH);

    // Grid lines within stamp
    doc.setLineWidth(0.25);
    // Vertical dividing lines
    doc.line(stampX + 17, stampY, stampX + 17, stampY + stampH); // Roles column
    doc.line(stampX + 40, stampY, stampX + 40, stampY + stampH); // Names column
    doc.line(stampX + 55, stampY, stampX + 55, stampY + stampH); // Sign column
    doc.line(stampX + 70, stampY, stampX + 70, stampY + stampH); // Date column
    doc.line(stampX + 140, stampY, stampX + 140, stampY + stampH); // Stage / Sheets

    // Horizontal lines
    for (let i = 1; i <= 6; i++) {
      doc.line(stampX, stampY + i * 8, stampX + 70, stampY + i * 8);
    }
    doc.line(stampX + 70, stampY + 15, stampX + stampW, stampY + 15);
    doc.line(stampX + 70, stampY + 35, stampX + stampW, stampY + 35);
    doc.line(stampX + 140, stampY + 25, stampX + stampW, stampY + 25);

    // Text labels inside Stamp
    doc.setFontSize(6.5);
    doc.text('Изм.', stampX + 2, stampY + 5);
    doc.text('Кол.уч', stampX + 8, stampY + 5);
    doc.text('Лист', stampX + 18, stampY + 5);
    doc.text('№ док.', stampX + 27, stampY + 5);
    doc.text('Подп.', stampX + 43, stampY + 5);
    doc.text('Дата', stampX + 58, stampY + 5);

    doc.text('ГИП', stampX + 2, stampY + 13);
    doc.text(data.metadata.generalEngineerGip, stampX + 19, stampY + 13);
    doc.text(data.metadata.dateStr, stampX + 57, stampY + 13);

    doc.text('Разраб.', stampX + 2, stampY + 21);
    doc.text(data.metadata.leadArchitect, stampX + 19, stampY + 21);
    doc.text(data.metadata.dateStr, stampX + 57, stampY + 21);

    doc.text('Пров.', stampX + 2, stampY + 29);
    doc.text('BuildAI KZ', stampX + 19, stampY + 29);

    doc.text('Н.контр.', stampX + 2, stampY + 37);
    doc.text('СП РК OK', stampX + 19, stampY + 37);

    // Project Code & Title in middle cell
    doc.setFontSize(9);
    doc.text(data.metadata.projectCode, stampX + 75, stampY + 9);

    doc.setFontSize(7.5);
    doc.text(data.metadata.projectName.substring(0, 35), stampX + 75, stampY + 22);
    doc.text(data.metadata.objectAddress.substring(0, 40), stampX + 75, stampY + 30);

    // Stage / Sheet / Total Sheets
    doc.setFontSize(6.5);
    doc.text('Стадия', stampX + 143, stampY + 19);
    doc.text('Лист', stampX + 158, stampY + 19);
    doc.text('Листов', stampX + 172, stampY + 19);

    doc.setFontSize(8);
    doc.text(data.metadata.stage, stampX + 146, stampY + 31);
    doc.text(String(sheetNum), stampX + 161, stampY + 31);
    doc.text(String(totalSheets), stampX + 175, stampY + 31);

    // Organization
    doc.setFontSize(8);
    doc.text('ТОО "BuildAI KZ Engineering"', stampX + 85, stampY + 48);
  };

  // ==========================================
  // SHEET 1: TITLE PAGE (Титульный лист)
  // ==========================================
  drawGostFrame(true, 1, 4);

  doc.setFontSize(10);
  doc.text('РЕСПУБЛИКА КАЗАХСТАН', pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text('КОМИТЕТ ПО ДЕЛАМ СТРОИТЕЛЬСТВА И ЖКХ МИНИСТЕРСТВА ПРОМЫШЛЕННОСТИ И СТРОИТЕЛЬСТВА РК', pageWidth / 2, 34, { align: 'center' });

  doc.setLineWidth(0.4);
  doc.line(70, 38, pageWidth - 70, 38);

  doc.setFontSize(11);
  doc.text('ТОО "BuildAI KZ Engineering" · Инжиниринговая проектная платформа', pageWidth / 2, 48, { align: 'center' });

  doc.setFontSize(18);
  doc.text('ПРОЕКТНАЯ ДОКУМЕНТАЦИЯ', pageWidth / 2, 75, { align: 'center' });

  doc.setFontSize(13);
  doc.text(`ШИФР: ${data.metadata.projectCode}`, pageWidth / 2, 85, { align: 'center' });

  doc.setFontSize(15);
  doc.text(data.metadata.projectName.toUpperCase(), pageWidth / 2, 102, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Адрес объекта: г. ${data.metadata.city}, ${data.metadata.objectAddress}`, pageWidth / 2, 112, { align: 'center' });
  doc.text(`Заказчик: ${data.metadata.clientName}`, pageWidth / 2, 120, { align: 'center' });

  doc.setFontSize(11);
  doc.text(`РАЗДЕЛ: ${data.metadata.stage} (АРХИТЕКТУРНО-СТРОИТЕЛЬНЫЕ РЕШЕНИЯ И РАСЧЕТЫ)`, pageWidth / 2, 134, { align: 'center' });

  // Disclaimer Stamp Box on Title
  const discBoxX = 50;
  const discBoxY = 146;
  const discBoxW = pageWidth - 100;
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.3);
  doc.rect(discBoxX, discBoxY, discBoxW, 20);
  doc.setTextColor(180, 20, 20);
  doc.setFontSize(7.5);
  doc.text('ОБЯЗАТЕЛЬНОЕ ПРЕДУПРЕЖДЕНИЕ / ЕСКЕРТУ:', discBoxX + 5, discBoxY + 6);
  doc.setFontSize(6.5);
  doc.text('Настоящая проектная документация сформирована платформой BuildAI KZ в концептуально-эскизном формате.', discBoxX + 5, discBoxY + 11);
  doc.text('Чертежи и расчеты подлежат обязательной верификации Главным инженером проекта (ГИП) и экспертизе РК.', discBoxX + 5, discBoxY + 16);
  doc.setTextColor(30, 41, 59);

  doc.setFontSize(9);
  doc.text(`г. ${data.metadata.city} — ${data.metadata.year} г.`, pageWidth / 2, 195, { align: 'center' });

  // ==========================================
  // SHEET 2: GENERAL DATA & CALCULATION SUMMARY
  // ==========================================
  doc.addPage();
  drawGostFrame(false, 2, 4);

  doc.setFontSize(11);
  doc.text('ВЕДОМОСТЬ РАБОЧИХ ЧЕРТЕЖЕЙ ОСНОВНОГО КОМПЛЕКТА', marginLeft + 5, marginTop + 10);

  // Table of sheets
  const tableX = marginLeft + 5;
  let currY = marginTop + 14;
  doc.setFontSize(7.5);
  doc.setLineWidth(0.2);
  doc.rect(tableX, currY, 180, 24);
  doc.line(tableX + 15, currY, tableX + 15, currY + 24);
  doc.line(tableX + 130, currY, tableX + 130, currY + 24);

  doc.text('Лист', tableX + 3, currY + 4);
  doc.text('Наименование', tableX + 45, currY + 4);
  doc.text('Примечание', tableX + 140, currY + 4);
  doc.line(tableX, currY + 6, tableX + 180, currY + 6);

  const sheetsList = [
    { num: '1', title: 'Титульный лист и общие сведения', note: 'Оформлен' },
    { num: '2', title: 'Общие данные. Сводка инженерных расчетов по СП РК', note: 'Текущий' },
    { num: '3', title: 'Архитектурно-строительный план этажа. Экспликация помещений', note: 'М 1:100' },
    { num: '4', title: 'Спецификация и ведомость расхода основных материалов', note: 'ГОСТ 21.110' },
  ];

  sheetsList.forEach((s, idx) => {
    const rowY = currY + 11 + idx * 4.5;
    doc.text(s.num, tableX + 5, rowY);
    doc.text(s.title, tableX + 18, rowY);
    doc.text(s.note, tableX + 135, rowY);
    if (idx < 3) doc.line(tableX, rowY + 1.5, tableX + 180, rowY + 1.5);
  });

  // Regulatory Basis Box
  currY += 32;
  doc.setFontSize(10);
  doc.text('НОРМАТИВНАЯ БАЗА РЕСПУБЛИКИ КАЗАХСТАН (СП РК / СН РК / ГОСТ):', tableX, currY);
  currY += 4;
  doc.setFontSize(7);
  const normPoints = [
    '• СП РК 5.03-107-2013 «Несущие и ограждающие конструкции» (бетон, защитный слой, уход);',
    '• СП РК 5.01-102-2013 «Основания зданий и сооружений» (расчет глубины промерзания);',
    '• СП РК 2.04-01-2017 «Строительная климатология» (климатические параметры г. ' + data.metadata.city + ');',
    '• СП РК 2.03-30-2017 «Строительство в сейсмических зонах РК» (требования к армированию и поясам);',
    '• ГОСТ 21.101-2020 «Основные требования к проектной и рабочей документации».',
  ];
  normPoints.forEach((np) => {
    doc.text(np, tableX, currY);
    currY += 4.5;
  });

  // Engineering Calculations Table
  currY += 4;
  doc.setFontSize(10);
  doc.text('СВОДКА ИНЖЕНЕРНЫХ РАСЧЕТОВ:', tableX, currY);
  currY += 4;

  doc.rect(tableX, currY, 190, 48);
  doc.line(tableX + 40, currY, tableX + 40, currY + 48);
  doc.line(tableX + 85, currY, tableX + 85, currY + 48);
  doc.line(tableX + 140, currY, tableX + 140, currY + 48);

  doc.setFontSize(7);
  doc.text('Конструктивный элемент', tableX + 3, currY + 4);
  doc.text('Нормативный документ', tableX + 43, currY + 4);
  doc.text('Расчетная формула', tableX + 88, currY + 4);
  doc.text('Результат расчета', tableX + 143, currY + 4);
  doc.line(tableX, currY + 6, tableX + 190, currY + 6);

  data.calculations.slice(0, 5).forEach((calc, idx) => {
    const rY = currY + 12 + idx * 8;
    doc.text(calc.calculatorTitle.substring(0, 24), tableX + 2, rY);
    doc.text(calc.normCode, tableX + 42, rY);
    doc.text(calc.keyFormula.substring(0, 32), tableX + 87, rY);
    doc.text(calc.primaryResult.substring(0, 28), tableX + 142, rY);
    if (idx < 4) doc.line(tableX, rY + 3, tableX + 190, rY + 3);
  });

  // ==========================================
  // SHEET 3: ARCHITECTURAL PLAN & ROOM EXPLICATION
  // ==========================================
  doc.addPage();
  drawGostFrame(false, 3, 4);

  doc.setFontSize(11);
  doc.text('ПЛАН ЭТАЖА НА ОТМ. +0.000 (М 1:100)', marginLeft + 10, marginTop + 12);

  // Vector architectural plan representation
  const planOriginX = marginLeft + 18;
  const planOriginY = marginTop + 22;
  const planW = 100;
  const planH = 75;

  // Outer walls (thick)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.rect(planOriginX, planOriginY, planW, planH);

  // Inner partition walls
  doc.setLineWidth(0.4);
  doc.line(planOriginX + 50, planOriginY, planOriginX + 50, planOriginY + planH); // Center divider
  doc.line(planOriginX, planOriginY + 38, planOriginX + planW, planOriginY + 38); // Horizontal divider

  // Dimension lines & Axis bubbles
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.2);

  // Axis 1, 2, 3 (Bottom)
  const drawAxisBubble = (x: number, y: number, label: string) => {
    doc.circle(x, y, 3);
    doc.setFontSize(6.5);
    doc.text(label, x - 1.2, y + 1.2);
  };

  drawAxisBubble(planOriginX, planOriginY + planH + 12, '1');
  drawAxisBubble(planOriginX + 50, planOriginY + planH + 12, '2');
  drawAxisBubble(planOriginX + planW, planOriginY + planH + 12, '3');

  doc.line(planOriginX, planOriginY + planH + 2, planOriginX, planOriginY + planH + 9);
  doc.line(planOriginX + 50, planOriginY + planH + 2, planOriginX + 50, planOriginY + planH + 9);
  doc.line(planOriginX + planW, planOriginY + planH + 2, planOriginX + planW, planOriginY + planH + 9);
  doc.line(planOriginX, planOriginY + planH + 6, planOriginX + planW, planOriginY + planH + 6);

  // Axis А, Б (Left)
  drawAxisBubble(planOriginX - 12, planOriginY + planH, 'А');
  drawAxisBubble(planOriginX - 12, planOriginY, 'Б');
  doc.line(planOriginX - 2, planOriginY + planH, planOriginX - 9, planOriginY + planH);
  doc.line(planOriginX - 2, planOriginY, planOriginX - 9, planOriginY);
  doc.line(planOriginX - 6, planOriginY, planOriginX - 6, planOriginY + planH);

  // Room Numbers & Labels on Plan
  doc.setFontSize(8);
  doc.text('1. Гостиная (28.5 м²)', planOriginX + 8, planOriginY + 20);
  doc.text('2. Кухня-столовая (18.2 м²)', planOriginX + 56, planOriginY + 20);
  doc.text('3. Спальня 1 (16.4 м²)', planOriginX + 8, planOriginY + 55);
  doc.text('4. Холл и с/у (12.0 м²)', planOriginX + 56, planOriginY + 55);

  // Right Side: Explication Table
  const explX = marginLeft + 130;
  const explY = marginTop + 14;
  doc.setFontSize(9);
  doc.text('ЭКСПЛИКАЦИЯ ПОМЕЩЕНИЙ', explX, explY);

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.25);
  doc.rect(explX, explY + 3, 130, 42);
  doc.line(explX + 10, explY + 3, explX + 10, explY + 45);
  doc.line(explX + 80, explY + 3, explX + 80, explY + 45);
  doc.line(explX + 105, explY + 3, explX + 105, explY + 45);
  doc.line(explX, explY + 9, explX + 130, explY + 9);

  doc.setFontSize(6.5);
  doc.text('№', explX + 3, explY + 7);
  doc.text('Наименование помещения', explX + 14, explY + 7);
  doc.text('Площадь, м²', explX + 82, explY + 7);
  doc.text('Категория', explX + 108, explY + 7);

  const roomsList = [
    { n: '1', title: 'Гостиная / Common Living', area: '28.50', cat: 'Жилая' },
    { n: '2', title: 'Кухня-столовая / Kitchen', area: '18.20', cat: 'Вспом.' },
    { n: '3', title: 'Спальня мастер / Bedroom', area: '16.40', cat: 'Жилая' },
    { n: '4', title: 'Холл-прихожая / Corridor', area: '7.80', cat: 'Вспом.' },
    { n: '5', title: 'Санузел совмещенный', area: '4.20', cat: 'Вспом.' },
  ];

  roomsList.forEach((rm, i) => {
    const rowY = explY + 15 + i * 5.8;
    doc.text(rm.n, explX + 4, rowY);
    doc.text(rm.title, explX + 13, rowY);
    doc.text(rm.area, explX + 86, rowY);
    doc.text(rm.cat, explX + 110, rowY);
    if (i < 4) doc.line(explX, rowY + 2, explX + 130, rowY + 2);
  });

  // ==========================================
  // SHEET 4: MATERIAL SPECIFICATION
  // ==========================================
  doc.addPage();
  drawGostFrame(false, 4, 4);

  doc.setFontSize(11);
  doc.text('ВЕДОМОСТЬ РАСХОДА МАТЕРИАЛОВ (ГОСТ 21.110-2013)', marginLeft + 5, marginTop + 10);

  const specX = marginLeft + 5;
  const specY = marginTop + 14;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.25);

  const colWidths = [12, 60, 45, 18, 20, 18, 20, 45];
  const tableTotalW = colWidths.reduce((a, b) => a + b, 0); // ~238 mm

  doc.rect(specX, specY, tableTotalW, 70);

  // Column headers
  let curX = specX;
  const headers = [
    'Поз.',
    'Наименование материала',
    'Марка / ГОСТ',
    'Ед. изм.',
    'Кол-во',
    'Запас %',
    'С запасом',
    'Примечание',
  ];

  doc.setFontSize(6.5);
  headers.forEach((h, i) => {
    doc.text(h, curX + 2, specY + 4.5);
    curX += colWidths[i];
    if (i < headers.length - 1) {
      doc.line(curX, specY, curX, specY + 70);
    }
  });
  doc.line(specX, specY + 6.5, specX + tableTotalW, specY + 6.5);

  // Populate rows
  data.materials.slice(0, 9).forEach((mat, idx) => {
    const rowY = specY + 12 + idx * 6.2;
    let rX = specX;

    doc.text(String(idx + 1), rX + 4, rowY);
    rX += colWidths[0];

    doc.text(mat.name.substring(0, 32), rX + 2, rowY);
    rX += colWidths[1];

    doc.text(mat.gostOrStandard.substring(0, 24), rX + 2, rowY);
    rX += colWidths[2];

    doc.text(mat.unit, rX + 3, rowY);
    rX += colWidths[3];

    doc.text(String(mat.quantity), rX + 3, rowY);
    rX += colWidths[4];

    doc.text(`${mat.safetyMarginPct}%`, rX + 3, rowY);
    rX += colWidths[5];

    doc.text(String(mat.totalWithMargin), rX + 3, rowY);
    rX += colWidths[6];

    doc.text(mat.note.substring(0, 26), rX + 2, rowY);

    if (idx < 8) {
      doc.line(specX, rowY + 2, specX + tableTotalW, rowY + 2);
    }
  });

  return doc;
}
