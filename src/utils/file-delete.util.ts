import { promises as fsPromises } from 'fs';
import { join } from 'path';

export async function deleteFileFromUploads(filePath: string): Promise<void> {
  if (!filePath) return;

  try {
    const filename = filePath.split('/').pop() || filePath;

    const possiblePaths = [
      join(process.cwd(), 'uploads', filename),
      join(process.cwd(), filePath),
      join(__dirname, '..', '..', 'uploads', filename),
      join(__dirname, '..', '..', filePath),
    ];

    let deleted = false;

    for (const fullPath of possiblePaths) {
      try {
        await fsPromises.unlink(fullPath);
        console.log(`Successfully deleted file: ${fullPath}`);
        deleted = true;
        break;
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error(`Error deleting ${fullPath}:`, error);
        }
      }
    }

    if (!deleted) {
      console.warn(`File not found in any location: ${filename}`);
    }
  } catch (error) {
    console.error(`Failed to delete file: ${filePath}`, error);
  }
}
