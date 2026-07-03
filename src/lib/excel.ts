export async function exportToXlsx(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1',
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);
  writeFile(wb, `${filename}.xlsx`);
}
