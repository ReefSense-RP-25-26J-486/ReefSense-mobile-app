/**
 * exportCsv.ts — lightweight CSV export helper.
 *
 * Builds a CSV string from an array of records, writes it to the device's
 * cache directory, then opens the native share sheet so the user can save
 * it to Files, Google Drive, email it, etc.
 */

import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface ExportColumn {
  key: string;
  label: string;
}

/** Wrap a cell value in quotes if it contains commas, quotes, or newlines. */
function escapeCell(value: any): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(
  data: Record<string, any>[],
  columns: ExportColumn[],
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const rows = data.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(','),
  );
  return [header, ...rows].join('\r\n');
}

/**
 * Export data to a CSV file and open the native share sheet.
 *
 * @param filename  File name WITHOUT extension (e.g. "bleaching_history")
 * @param data      Array of row objects
 * @param columns   Column definitions: { key: keyof row, label: column header }
 */
export async function exportToCsv(
  filename: string,
  data: Record<string, any>[],
  columns: ExportColumn[],
): Promise<void> {
  if (data.length === 0) {
    Alert.alert('No Data', 'There is no data to export.');
    return;
  }

  try {
    const csv = buildCsv(data, columns);
    const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const file = new File(Paths.cache, `${safeFilename}.csv`);

    file.write(csv);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert(
        'Sharing Not Available',
        'This device does not support file sharing.',
      );
      return;
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: `Export ${safeFilename}.csv`,
      UTI: 'public.comma-separated-values-text',
    });
  } catch (err: any) {
    Alert.alert('Export Failed', err.message ?? 'Could not export data.');
  }
}
