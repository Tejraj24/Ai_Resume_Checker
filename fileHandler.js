/* ============================================
   js/fileHandler.js — File parsing & upload
   Supports: .txt, .pdf, .docx, .png, .jpg, .webp
   ============================================ */

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Shared state — image resumes can't be text-extracted,
// so we store base64 and pass it directly to the API
window.imageResumeData = null;

// ── Entry point ────────────────────────────────────────
async function handleFile(file) {
  hideError();
  window.imageResumeData = null;

  const ext = file.name.split('.').pop().toLowerCase();

  try {
    if (ext === 'txt') {
      await parseTxt(file);
    } else if (ext === 'pdf') {
      await parsePdf(file);
    } else if (ext === 'docx') {
      await parseDocx(file);
    } else if (ext === 'doc') {
      showError('.doc (old Word format) is not supported in-browser. Please save as .docx or .txt and re-upload.');
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      await parseImage(file, ext);
    } else {
      showError(`Unsupported file type ".${ext}". Supported formats: PDF, DOCX, TXT, PNG, JPG, WEBP.`);
    }
  } catch (err) {
    showError(`Could not read file: ${err.message}`);
    console.error(err);
  }
}

// ── TXT parser ─────────────────────────────────────────
function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      loadTextIntoApp(e.target.result, file.name);
      resolve();
    };
    reader.onerror = () => reject(new Error('Failed to read .txt file'));
    reader.readAsText(file);
  });
}

// ── PDF parser (PDF.js) ────────────────────────────────
async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }

  if (!fullText.trim()) {
    showError('This PDF appears to be scanned/image-based. Upload a JPG or PNG screenshot instead — ResumeIQ will read it visually.');
    return;
  }

  loadTextIntoApp(fullText, file.name);
}

// ── DOCX parser (Mammoth.js) ───────────────────────────
async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  if (!result.value.trim()) {
    showError('Could not extract text from this DOCX. Try saving it as .txt and re-uploading.');
    return;
  }

  loadTextIntoApp(result.value, file.name);
}

// ── Image parser (stored as base64 for the visual analysis model) ──
function parseImage(file, ext) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const base64 = e.target.result.split(',')[1];
      const mediaType =
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'png'  ? 'image/png'  : 'image/webp';

      window.imageResumeData = { base64, mediaType };

      // Switch to paste tab and show a placeholder
      document.querySelectorAll('.tab-btn')[0].click();
      const ta = document.getElementById('resumeText');
      ta.value = '';
      ta.placeholder = `Image loaded: ${file.name}\nResumeIQ will read your resume directly from the image.`;
      document.getElementById('charCount').textContent = 'Image mode — ResumeIQ will read visually';
      setFileStatus(file.name, `${mediaType} — will be analyzed visually by ResumeIQ`);

      resolve();
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

// ── Shared: inject extracted text into the app ─────────
function loadTextIntoApp(text, filename) {
  document.querySelectorAll('.tab-btn')[0].click();
  document.getElementById('resumeText').value = text;
  document.getElementById('charCount').textContent = `${text.length.toLocaleString()} characters`;
  setFileStatus(filename, `${text.length.toLocaleString()} characters extracted`);
}

// ── Drop zone & file input wiring ─────────────────────
const dropZone  = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});
