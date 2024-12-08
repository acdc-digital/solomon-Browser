// PDF-Parse API
//Users/matthewsimon/Documents/Github/solomon-electron/next/src/pages/api/parse-pdf.js

import pdfParse from 'pdf-parse';
// If you want to rely on node-fetch. Otherwise, you can use global fetch.
import fetch from 'node-fetch'; 

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentId, fileId } = req.body;

  if (!documentId || !fileId) {
    return res.status(400).json({ error: 'documentId and fileId are required' });
  }

  // The URL of your Convex deployment
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  try {
    // 1. Fetch document info from Convex if needed
    const docRes = await fetch(`${convexUrl}/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: "api.projects.getDocument",
        args: { documentId }
      })
    });
    const docData = await docRes.json();
    if (!docData.fileId) {
      return res.status(400).json({ error: "No file associated with this document" });
    }

    // 2. Get a signed URL for the PDF from Convex
    const urlRes = await fetch(`${convexUrl}/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: "api.projects.getFileUrl",
        args: { fileId: docData.fileId }
      })
    });
    const { url } = await urlRes.json();
    if (!url) {
      return res.status(400).json({ error: "Failed to retrieve PDF URL from Convex" });
    }

    // 3. Fetch the PDF from the signed URL
    const pdfBuffer = await (await fetch(url)).arrayBuffer();

    // 4. Parse the PDF to extract text
    const parsed = await pdfParse(Buffer.from(pdfBuffer));
    const extractedText = parsed.text;

    // 5. Update the document content in Convex
    const updateRes = await fetch(`${convexUrl}/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function: "api.projects.updateDocumentContent",
        args: { documentId, documentContent: extractedText }
      })
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return res.status(500).json({ error: `Failed to update document content: ${err}` });
    }

    // If you want, you can now trigger embedding within Convex by calling another function
    // e.g., processDocumentWithText here if desired.

    res.status(200).json({ message: "Text extracted and updated in Convex" });
  } catch (error) {
    console.error("Error parsing PDF:", error);
    res.status(500).json({ error: error.message });
  }
}