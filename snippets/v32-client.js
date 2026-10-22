/* ===== Resume Fit Score v3.2 · browser code for reading JDs from links (pasted into script.js) ===== */

/* [EDIT 8] NEW helper: put it directly after the parseJdLinkTitle() function (top level, same scope as parsePdfFile). */
  async function fetchJdFromLink(url) {
    state.jdLinkPending = true;
    try {
      let token = null;
      try { const u = window.firebase && firebase.auth && firebase.auth().currentUser; if (u) token = await u.getIdToken(); } catch (_) { /* not signed in */ }
      const resp = await fetch('/api/fetch-jd', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: JSON.stringify({ url })     // only the link is sent; the resume never leaves the browser
      });
      let job = null;
      try { job = await resp.json(); } catch (_) { job = { ok: false, reason: 'service', message: 'the JD reader service is not available (HTTP ' + resp.status + ')' }; }
      if (job && job.ok && (job.kind === 'pdf' || job.kind === 'docx') && job.base64) {   // JD links that point to a PDF / Word file
        const bin = atob(job.base64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const parsed = job.kind === 'pdf' ? await parsePdfFile(bytes.buffer, false) : await parseDocxFile(bytes.buffer, false);
        job.text = parsed.text; job.words = parsed.text.trim().split(/\s+/).length; job.title = job.title.replace(/\.(pdf|docx)$/i, '');
      }
      if (job && job.ok && job.text) { state.jdLinkText = job.text; state.jdLinkTitle = job.title || ''; }
      return job;
    } catch (err) {
      console.warn('[JD link reader] failed:', err);
      return { ok: false, reason: 'network', message: 'the job page could not be read' };
    } finally {
      state.jdLinkPending = false;
    }
  }

/* [EDIT 9] REPLACE the whole function that registers the JD link (registerJdUrl) with this version (it stays in the same place). */
    async function registerJdUrl() {
      if (!jdUrlInput) return;
      const url = jdUrlInput.value.trim();
      if (!url || !/^https?:\/\/[^\s/]+\.[^\s]+/i.test(url)) {
        if (urlStatusNote) {
          urlStatusNote.className = 'url-status-note warning';
          urlStatusNote.innerHTML = '&#9888; Please paste a full job link starting with https://';
        }
        return;
      }
      if (url === state.jdLinkFetchedUrl && (state.jdLinkPending || state.jdLinkText)) return;   // already read / being read
      state.jdUrl = url;
      state.jdLinkFetchedUrl = url;
      state.jdLinkText = '';
      state.jdLinkTitle = '';
      const parsedTitle = parseJdLinkTitle(url);
      if (urlStatusNote) {
        urlStatusNote.className = 'url-status-note';
        urlStatusNote.innerHTML = '&#8987; Reading the job page… <span style="opacity:.8">' + escapeHtml(parsedTitle) + '</span>';
      }
      const job = await fetchJdFromLink(url);
      if (state.jdLinkFetchedUrl !== url) return;                       // the user changed the link meanwhile
      const det = window.RFSv3Bridge ? window.RFSv3Bridge.detectJd(state.jdLinkText || url, state.jdLinkText ? state.jdLinkTitle : '', url) : null;
      const unclear = !!(det && det.askUser && !state.jdLinkText);                 // nothing readable: don't guess a domain
      const detectedDomain = det ? det.legacyKey : detectDomainFromJd(state.jdLinkText || url, parsedTitle);
      if (detectedDomain && !unclear) state.targetRole = detectedDomain;
      const domLabel = unclear ? 'not clear from the link yet' : det ? det.label : ((detectedDomain && DOMAIN_METADATA[detectedDomain]) ? DOMAIN_METADATA[detectedDomain].shortLabel : 'General');
      const shownTitle = state.jdLinkTitle || parsedTitle;
      if (urlStatusNote) {
        if (job && job.ok && state.jdLinkText) {
          urlStatusNote.className = 'url-status-note success';
          urlStatusNote.innerHTML = '&#10003; <strong>JD read from the link:</strong> ' + escapeHtml(shownTitle) +
            (job.company && shownTitle.toLowerCase().indexOf(String(job.company).toLowerCase()) < 0 ? ' · ' + escapeHtml(job.company) : '') +
            ' (' + (job.words || 0) + ' words) [Target Domain: ' + escapeHtml(domLabel) + ']' +
            (job.quality === 'partial' ? '<br><span style="opacity:.85">Only part of the page could be read. For an exact match, paste the full JD text in the Paste tab.</span>' : '');
        } else {
          urlStatusNote.className = 'url-status-note warning';
          urlStatusNote.innerHTML = '&#9888; <strong>We could not read this job page automatically</strong> (' + escapeHtml((job && job.message) || 'unknown error') + ').' +
            ' Using the link title for now: ' + escapeHtml(parsedTitle) + ' [Target Domain: ' + escapeHtml(domLabel) + '].' +
            '<br><span style="opacity:.85">For an exact match, copy the JD text from the page and paste it in the Paste tab.</span>';
        }
      }
      const profileOnReg = (typeof syncProfileFromInputs === 'function') ? syncProfileFromInputs() : { candidateType: state.candidateType, institutionName: state.institutionName };
      if (window.RepositoryService && typeof window.RepositoryService.recordJobDescription === 'function') {
        window.RepositoryService.recordJobDescription({
          url: url, title: shownTitle, text: state.jdLinkText || undefined, domain: det ? det.name : (state.targetRole || 'general'), tab: 'link',
          candidateType: profileOnReg.candidateType, institutionName: profileOnReg.institutionName
        }).then(() => { if (typeof updateHeaderRepoCount === 'function') updateHeaderRepoCount(); })
          .catch(err => console.warn('[Repository] Link JD record note:', err));
      }
    }

/* [EDIT 10] in handleExecuteDiagnostic(): REPLACE the Link-tab branch that picks the JD text with this. */
      } else if (state.jdTab === 'link') {
        if (state.jdUrl && state.jdLinkFetchedUrl !== state.jdUrl) {      // link typed but not read yet → read it now
          state.jdLinkFetchedUrl = state.jdUrl; state.jdLinkText = ''; state.jdLinkTitle = '';
          if (typeof showLoading === 'function') showLoading('Reading the job page from your link...');
          await fetchJdFromLink(state.jdUrl);
        }
        for (let i = 0; i < 100 && state.jdLinkPending; i++) await new Promise(r => setTimeout(r, 200));   // wait up to 20 s if still reading
        jdTextToAnalyze = state.jdLinkText || state.jdUrl || '';
      }
