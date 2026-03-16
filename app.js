/* ============================================
   js/app.js — Main app controller
   Orchestrates UI, file handling, and API calls
   ============================================ */

// ── Analyze Resume ─────────────────────────────────────
async function analyzeResume() {
  hideError();

  const resumeText  = document.getElementById('resumeText').value.trim();
  const jdText      = document.getElementById('jdTextarea').value.trim();
  const imageData   = window.imageResumeData || null;
  const isImageMode = !!imageData;

  // Validate
  if (!isImageMode && (!resumeText || resumeText.length < 50)) {
    showError('Please paste your resume content or upload a file before analyzing.');
    return;
  }

  // Show loading, hide input
  document.getElementById('inputCard').style.display = 'none';
  document.getElementById('results').classList.remove('visible');
  document.getElementById('results').style.display = 'none';
  document.getElementById('loadingState').classList.add('visible');
  startLoadingCycle();

  try {
  const parsed = await callAnalysisAPI(resumeText, jdText, imageData);

    stopLoadingCycle();
    document.getElementById('loadingState').classList.remove('visible');
    showResults(parsed);

  } catch (err) {
    stopLoadingCycle();
    document.getElementById('loadingState').classList.remove('visible');
    document.getElementById('inputCard').style.display = 'block';
    showError(`Something went wrong: ${err.message}`);
    console.error(err);
  }
}

// ── Reset App ──────────────────────────────────────────
function resetApp() {
  // Hide results, show input
  document.getElementById('results').classList.remove('visible');
  document.getElementById('results').style.display = 'none';
  document.getElementById('inputCard').style.display = 'block';

  // Reset score ring
  const arc = document.getElementById('scoreArc');
  arc.style.transition = 'none';
  arc.style.strokeDashoffset = '264';

  // Clear file state
  window.imageResumeData = null;
  document.getElementById('fileStatus').style.display = 'none';
  document.getElementById('resumeText').placeholder =
    'Paste your full resume here — include all sections: contact info, summary, experience, education, skills...';

  hideError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
