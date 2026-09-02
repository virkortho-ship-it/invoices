import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

/**
 * Generate a high-resolution PDF Blob from a DOM element (the invoice preview).
 */
export async function generateInvoicePdfBlob(element: HTMLElement, fileName: string): Promise<{ blob: Blob; dataUrl: string }> {
  try {
    // Render the element to a canvas with 2x scale for sharp vector-like text
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024,
      onclone: (clonedDoc) => {
        // Ensure standard visibility and sizing in cloned document
        const clonedElement = clonedDoc.querySelector('[data-invoice-preview="true"]') as HTMLElement | null;
        if (clonedElement) {
          clonedElement.style.transform = 'none';
        }
      }
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const renderHeight = (imgProps.height * pdfWidth) / imgProps.width;

    if (renderHeight <= pdfHeight) {
      // Single page
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, renderHeight);
    } else {
      // Multi-page handling
      let heightLeft = renderHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, renderHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - renderHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, renderHeight);
        heightLeft -= pdfHeight;
      }
    }

    const blob = pdf.output('blob');
    const dataUrl = pdf.output('datauristring');

    return { blob, dataUrl };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Trigger immediate browser download of the PDF blob.
 */
export function downloadPdfBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
