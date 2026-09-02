import { DriveFolder, DriveUploadedFile } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3';

/**
 * List folders in the user's Google Drive.
 */
export async function listDriveFolders(accessToken: string): Promise<DriveFolder[]> {
  try {
    const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(q)}&fields=files(id, name, webViewLink)&pageSize=50&orderBy=name`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to fetch Drive folders (${response.status})`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error: any) {
    console.error('Error fetching Drive folders:', error);
    throw error;
  }
}

/**
 * Create a new folder in Google Drive (e.g. "My Invoices" or "Invoices 2026").
 */
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<DriveFolder> {
  try {
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const response = await fetch(`${DRIVE_API_URL}/files?fields=id,name,webViewLink`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to create folder (${response.status})`);
    }

    const created = await response.json();
    return {
      id: created.id,
      name: created.name,
      webViewLink: created.webViewLink,
    };
  } catch (error: any) {
    console.error('Error creating Drive folder:', error);
    throw error;
  }
}

/**
 * Upload a PDF blob directly to Google Drive (inside designated folder).
 * Uses multipart upload to set filename, mimeType, and parents in one request.
 */
export async function uploadPdfToDrive(
  accessToken: string,
  pdfBlob: Blob,
  fileName: string,
  folderId?: string
): Promise<DriveUploadedFile> {
  try {
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
      mimeType: 'application/pdf',
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaPartHeader = `${delimiter}Content-Type: application/pdf\r\n\r\n`;

    // Convert blob to array buffer
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();

    // Assemble multipart body
    const encoder = new TextEncoder();
    const part1 = encoder.encode(metadataPart);
    const part2 = encoder.encode(mediaPartHeader);
    const part3 = new Uint8Array(pdfArrayBuffer);
    const part4 = encoder.encode(closeDelimiter);

    const totalLength = part1.length + part2.length + part3.length + part4.length;
    const combinedBuffer = new Uint8Array(totalLength);

    let offset = 0;
    combinedBuffer.set(part1, offset);
    offset += part1.length;
    combinedBuffer.set(part2, offset);
    offset += part2.length;
    combinedBuffer.set(part3, offset);
    offset += part3.length;
    combinedBuffer.set(part4, offset);

    const response = await fetch(
      `${UPLOAD_API_URL}/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,createdTime,size`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: combinedBuffer,
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to upload PDF to Google Drive (${response.status})`);
    }

    const result = await response.json();
    return {
      id: result.id,
      name: result.name,
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
      webContentLink: result.webContentLink,
      createdTime: result.createdTime,
      size: result.size,
    };
  } catch (error: any) {
    console.error('Error uploading PDF to Drive:', error);
    throw error;
  }
}

/**
 * List files saved in the specified Google Drive folder.
 */
export async function listDriveFiles(
  accessToken: string,
  folderId?: string
): Promise<DriveUploadedFile[]> {
  try {
    let q = "trashed = false";
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }

    const url = `${DRIVE_API_URL}/files?q=${encodeURIComponent(q)}&fields=files(id, name, mimeType, webViewLink, webContentLink, createdTime, size)&pageSize=100&orderBy=createdTime desc`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to fetch files from Drive (${response.status})`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error: any) {
    console.error('Error listing Drive files:', error);
    throw error;
  }
}

/**
 * Delete a file from Google Drive.
 */
export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${DRIVE_API_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error: any) {
    console.error('Error deleting Drive file:', error);
    throw error;
  }
}
