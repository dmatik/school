import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import {
  SCHEDULE_PDF_FILENAME,
  SCHEDULE_PDF_LAYOUT,
  buildSchedulePdfHtml,
  buildSchedulePdfModel,
  type SchedulePdfInput,
} from '../../../src/lib/schedule-pdf-shared';

/**
 * Generates the centered A4 landscape schedule PDF using the shared Web/Mobile
 * PDF specification, renames it to `schedule.pdf`, and opens the native share sheet.
 */
export async function shareSchedulePdfMobile(options: SchedulePdfInput): Promise<void> {
  const model = buildSchedulePdfModel(options);
  const html = buildSchedulePdfHtml(model);

  const { uri } = await Print.printToFileAsync({
    html,
    width: Math.round(SCHEDULE_PDF_LAYOUT.pageWidthPt),
    height: Math.round(SCHEDULE_PDF_LAYOUT.pageHeightPt),
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  let shareUri = uri;
  try {
    const sourceFile = new File(uri);
    const targetFile = new File(Paths.cache, SCHEDULE_PDF_FILENAME);
    if (targetFile.exists) {
      targetFile.delete();
    }
    await sourceFile.move(targetFile);
    shareUri = targetFile.uri;
  } catch (err) {
    console.warn('Could not rename schedule PDF to schedule.pdf, falling back to temp URI:', err);
    shareUri = uri;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: options.t('schedule.title'),
    });
  }
}
