/**
 * Career Clinic — Assessment Repository & Firebase Storage Service
 * My Career Company — "Diagnose. Prepare. Practise. Perform."
 * 
 * Securely stores all uploaded candidate resumes, uploaded JDs, and generated
 * Fit Score™ diagnostic reports to Firebase (Firestore & Storage) with comprehensive
 * metadata, timestamps, evaluator email tracking, and tagging.
 */

(function () {
  'use strict';

  const COLLECTION_NAME = 'resume_assessments';
  const LOCAL_CACHE_KEY = 'CC_RESUME_ASSESSMENTS_V1';

  // Permitted Reviewer Emails
  const PERMITTED_EMAILS = [
    "upam.patra@gmail.com",
    "iimonkataki@mycareercompany.com",
    "ibonkataki@mycareercompany.com",
    "anirbanroy@mycareercompany.com",
    "anirbanroy@mycareercompanny.com"
  ];

  let db = null;
  let storage = null;
  let isFirestoreAvailable = false;
  let isStorageAvailable = false;

  // Initialize Firebase Firestore and Storage
  function initFirebaseServices() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        db = firebase.firestore();
        isFirestoreAvailable = true;
      } catch (err) {
        console.warn("[RepositoryService] Firestore initialization warning:", err.message);
      }

      try {
        storage = firebase.storage();
        isStorageAvailable = true;
      } catch (err) {
        console.warn("[RepositoryService] Storage initialization warning:", err.message);
      }
    }
  }

  // Sanitize filename for safe storage keys
  function sanitizeKey(str) {
    if (!str) return 'document';
    return str.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 80);
  }

  // Format readable date and time (e.g. "17 Oct 2026, 09:55 PM")
  function formatReadableDateTime(dateObj) {
    const d = dateObj || new Date();
    try {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (_) {
      return d.toISOString();
    }
  }

  // Local Storage Cache Helpers
  function getLocalCache() {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("[RepositoryService] Failed to read local cache:", e);
      return [];
    }
  }

  function saveLocalCache(list) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(list.slice(0, 250)));
    } catch (e) {
      console.warn("[RepositoryService] Failed to update local cache:", e);
    }
  }

  function upsertLocalCache(record) {
    const list = getLocalCache();
    const idx = list.findIndex(item => item.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    saveLocalCache(list);
    return list;
  }

  function removeFromLocalCache(recordId) {
    const list = getLocalCache().filter(item => item.id !== recordId);
    saveLocalCache(list);
    return list;
  }

  /**
   * Upload File Blob to Firebase Storage with Fallback
   */
  async function uploadFileToStorage(folder, file, recordId) {
    if (!storage || !file || !(file instanceof Blob)) {
      return { url: null, path: null };
    }

    try {
      const safeName = sanitizeKey(file.name || 'file');
      const storagePath = `${folder}/${recordId}_${Date.now()}_${safeName}`;
      const fileRef = storage.ref().child(storagePath);

      const metadata = {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          recordId: recordId,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      };

      const snapshot = await fileRef.put(file, metadata);
      const downloadUrl = await snapshot.ref.getDownloadURL();
      return { url: downloadUrl, path: storagePath };
    } catch (err) {
      console.warn(`[RepositoryService] Storage upload error for ${folder} (falling back gracefully):`, err.message);
      return { url: null, path: null, error: err.message };
    }
  }

  /**
   * Save Assessment to Firebase Firestore & Storage
   */
  async function saveAssessment(payload) {
    initFirebaseServices();

    const now = new Date();
    const recordId = 'CC-EVAL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Authenticated User Info
    let userEmail = 'anonymous';
    let userName = 'Evaluator';
    let userPhoto = null;

    if (window.AuthGuard && typeof window.AuthGuard.getCurrentUser === 'function') {
      const u = window.AuthGuard.getCurrentUser();
      if (u) {
        userEmail = (u.email || '').toLowerCase().trim();
        userName = u.displayName || u.email.split('@')[0];
        userPhoto = u.photoURL || null;
      }
    }

    const {
      resumeFile,
      resumeText = '',
      resumeNumPages = 1,
      jdFile,
      jdText = '',
      jdObject,
      jdTab = 'domain',
      jdUrl = '',
      targetRole = 'consulting',
      result
    } = payload;

    // 1. Upload Resume file if provided
    let resumeStorage = { url: null, path: null };
    if (resumeFile && isStorageAvailable) {
      try {
        resumeStorage = await uploadFileToStorage('resumes', resumeFile, recordId);
      } catch (_) {}
    }

    // 2. Upload JD file if provided
    let jdStorage = { url: null, path: null };
    if (jdFile && isStorageAvailable) {
      try {
        jdStorage = await uploadFileToStorage('job_descriptions', jdFile, recordId);
      } catch (_) {}
    }

    // Detect resume file name and word counts
    const resumeFileName = resumeFile ? resumeFile.name : 'Pasted-Resume.txt';
    const resumeWords = (resumeText.match(/\b[A-Za-z0-9'-]+\b/g) || []).length;
    const jdWords = (jdText.match(/\b[A-Za-z0-9'-]+\b/g) || []).length;

    // Target JD title
    let jdTitle = 'Custom Target Job Description';
    let jdDomain = targetRole || 'Consulting';
    let jdSubDomain = '';
    let jdLevels = '';

    if (jdObject) {
      jdTitle = jdObject.role || jdTitle;
      jdDomain = jdObject.domain || jdDomain;
      jdSubDomain = jdObject.subDomain || '';
      jdLevels = Array.isArray(jdObject.levels) ? jdObject.levels.join(' / ') : (jdObject.levels || '');
    } else if (jdFile) {
      jdTitle = jdFile.name;
    } else if (jdTab === 'domain') {
      jdTitle = `${targetRole.toUpperCase()} Placement Benchmark`;
    }

    // Generate comprehensive tags
    const domainTag = (jdDomain || targetRole || 'general').toLowerCase().replace(/\s+/g, '-');
    const bandTag = (result.band || 'calibrated').toLowerCase().replace(/\s+/g, '-');
    const typeTag = resumeFile ? (resumeFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx') : 'pasted';
    const evaluatorTag = userEmail.split('@')[0] || 'evaluator';

    const tags = [
      `#domain:${domainTag}`,
      `#band:${bandTag}`,
      `#score:${result.totalScore}`,
      `#format:${typeTag}`,
      `#evaluator:${evaluatorTag}`
    ];

    if (jdTab === 'domain') tags.push('#institutional-jd');
    if (jdTab === 'upload') tags.push('#uploaded-jd');
    if (jdTab === 'paste') tags.push('#pasted-jd');
    if (jdTab === 'link') tags.push('#linked-jd');

    // Build structured assessment record
    const record = {
      id: recordId,
      createdAt: now.toISOString(),
      savedAt: Date.now(),
      formattedTime: formatReadableDateTime(now),
      
      evaluator: {
        email: userEmail,
        name: userName,
        photoURL: userPhoto
      },

      resume: {
        fileName: resumeFileName,
        fileType: resumeFile ? (resumeFile.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX') : 'TEXT',
        fileSizeBytes: resumeFile ? resumeFile.size : resumeText.length,
        numPages: resumeNumPages,
        wordCount: resumeWords,
        snippet: resumeText ? resumeText.substring(0, 350) : '',
        fullText: resumeText || '',
        storageUrl: resumeStorage.url || null,
        storagePath: resumeStorage.path || null
      },

      jobDescription: {
        title: jdTitle,
        domain: jdDomain,
        subDomain: jdSubDomain,
        levels: jdLevels,
        tab: jdTab,
        fileName: jdFile ? jdFile.name : null,
        fileSizeBytes: jdFile ? jdFile.size : jdText.length,
        wordCount: jdWords,
        url: jdUrl || '',
        snippet: jdText ? jdText.substring(0, 350) : '',
        fullText: jdText || '',
        storageUrl: jdStorage.url || null,
        storagePath: jdStorage.path || null
      },

      report: {
        totalScore: result.totalScore,
        band: result.band,
        bandLabel: result.bandLabel || '',
        roleLabel: result.roleLabel || '',
        dimensions: (result.dimensions || []).map(d => ({
          id: d.id,
          name: d.name,
          score: d.score,
          max: d.max,
          loss: d.loss
        })),
        strengths: (result.strengths || []).map(s => ({
          name: s.name,
          score: s.score,
          max: s.max
        })),
        priorityFixes: (result.priorityFixes || []).map(f => ({
          id: f.id,
          name: f.name,
          score: f.score,
          max: f.max,
          loss: f.loss,
          advice: f.advice
        })),
        stats: result.stats || {},
        detectedKeywords: result.detectedKeywords || [],
        missingKeywords: result.missingKeywords || []
      },

      tags: tags,
      customTags: []
    };

    // 1. Store in Firestore collection
    let firestoreSaved = false;
    if (isFirestoreAvailable && db) {
      try {
        await db.collection(COLLECTION_NAME).doc(recordId).set({
          ...record,
          // Firestore timestamp for server-side index consistency
          serverTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        firestoreSaved = true;
      } catch (err) {
        console.warn("[RepositoryService] Firestore save error (local backup preserved):", err.message);
      }
    }

    // 2. Always persist to browser cache for instantaneous offline access
    upsertLocalCache(record);

    // Notify listeners
    dispatchRepositoryUpdate(record);

    return {
      record: record,
      recordId: recordId,
      firestoreSaved: firestoreSaved,
      storageUploaded: Boolean(resumeStorage.url || jdStorage.url)
    };
  }

  /**
   * Fetch All Assessments from Firebase Firestore with Local Cache Merge
   */
  async function fetchAssessments(filters = {}) {
    initFirebaseServices();

    let records = [];

    // Attempt Firestore fetch
    if (isFirestoreAvailable && db) {
      try {
        const snapshot = await db.collection(COLLECTION_NAME)
          .orderBy('savedAt', 'desc')
          .limit(150)
          .get();

        snapshot.forEach(doc => {
          records.push(doc.data());
        });

        // Update local cache with latest data
        if (records.length > 0) {
          saveLocalCache(records);
        }
      } catch (err) {
        console.warn("[RepositoryService] Firestore fetch error, loading from local cache:", err.message);
        records = getLocalCache();
      }
    } else {
      records = getLocalCache();
    }

    // If Firestore returned empty (or offline), fallback to local cache
    if (!records || records.length === 0) {
      records = getLocalCache();
    }

    // Apply Client-Side Filters
    let filtered = records;

    // Search query: candidate/filename, evaluator email, role title, tags
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const resumeName = (item.resume && item.resume.fileName || '').toLowerCase();
        const resumeText = (item.resume && item.resume.snippet || '').toLowerCase();
        const jdTitle = (item.jobDescription && item.jobDescription.title || '').toLowerCase();
        const evaluator = (item.evaluator && (item.evaluator.email || item.evaluator.name) || '').toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();
        const score = String(item.report && item.report.totalScore || '');

        return resumeName.includes(q) ||
          jdTitle.includes(q) ||
          evaluator.includes(q) ||
          tags.includes(q) ||
          score === q ||
          resumeText.includes(q);
      });
    }

    // Domain filter
    if (filters.domain && filters.domain !== 'all') {
      const dom = filters.domain.toLowerCase();
      filtered = filtered.filter(item => {
        const itemDom = (item.jobDescription && item.jobDescription.domain || '').toLowerCase();
        return itemDom.includes(dom) || (item.tags || []).some(t => t.includes(dom));
      });
    }

    // Score band filter
    if (filters.band && filters.band !== 'all') {
      filtered = filtered.filter(item => {
        const score = item.report ? item.report.totalScore : 0;
        if (filters.band === 'placement-ready') return score >= 80;
        if (filters.band === 'competitive') return score >= 65 && score < 80;
        if (filters.band === 'moderate') return score >= 50 && score < 65;
        if (filters.band === 'needs-calibration') return score < 50;
        return true;
      });
    }

    // Evaluator filter
    if (filters.evaluator && filters.evaluator !== 'all') {
      const evalEmail = filters.evaluator.toLowerCase();
      filtered = filtered.filter(item => {
        const email = (item.evaluator && item.evaluator.email || '').toLowerCase();
        return email === evalEmail;
      });
    }

    // Sorting
    const sortBy = filters.sortBy || 'newest';
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return (b.savedAt || 0) - (a.savedAt || 0);
      if (sortBy === 'oldest') return (a.savedAt || 0) - (b.savedAt || 0);
      if (sortBy === 'score-high') return ((b.report && b.report.totalScore) || 0) - ((a.report && a.report.totalScore) || 0);
      if (sortBy === 'score-low') return ((a.report && a.report.totalScore) || 0) - ((b.report && b.report.totalScore) || 0);
      return 0;
    });

    return filtered;
  }

  /**
   * Delete an Assessment
   */
  async function deleteAssessment(recordId) {
    initFirebaseServices();

    if (isFirestoreAvailable && db) {
      try {
        await db.collection(COLLECTION_NAME).doc(recordId).delete();
      } catch (err) {
        console.warn("[RepositoryService] Firestore delete note:", err.message);
      }
    }

    removeFromLocalCache(recordId);
    dispatchRepositoryUpdate({ deletedId: recordId });
    return true;
  }

  /**
   * Calculate Repository Aggregate Statistics
   */
  function calculateStats(assessments) {
    if (!assessments || assessments.length === 0) {
      return {
        totalCount: 0,
        averageScore: 0,
        placementReadyCount: 0,
        competitiveCount: 0,
        topDomain: 'Consulting'
      };
    }

    const totalCount = assessments.length;
    let scoreSum = 0;
    let readyCount = 0;
    let compCount = 0;
    const domainCounts = {};

    assessments.forEach(item => {
      const score = item.report ? item.report.totalScore : 0;
      scoreSum += score;
      if (score >= 80) readyCount++;
      else if (score >= 65) compCount++;

      const dom = (item.jobDescription && item.jobDescription.domain) || 'Consulting';
      domainCounts[dom] = (domainCounts[dom] || 0) + 1;
    });

    let topDomain = 'Consulting';
    let maxDomainCount = 0;
    Object.keys(domainCounts).forEach(dom => {
      if (domainCounts[dom] > maxDomainCount) {
        maxDomainCount = domainCounts[dom];
        topDomain = dom;
      }
    });

    return {
      totalCount: totalCount,
      averageScore: Math.round(scoreSum / totalCount),
      placementReadyCount: readyCount,
      competitiveCount: compCount,
      topDomain: topDomain
    };
  }

  /**
   * Export All Assessments to CSV
   */
  function exportToCsv(assessments) {
    if (!assessments || assessments.length === 0) return;

    const headers = [
      "Assessment ID",
      "Date & Time",
      "Evaluator Email",
      "Evaluator Name",
      "Resume File Name",
      "Resume File Type",
      "Resume Word Count",
      "Target Role / JD Title",
      "Target Domain",
      "Fit Score (0-100)",
      "Score Band",
      "Quantified Impact Score (Max 20)",
      "Action Verbs Score (Max 10)",
      "Keywords Match Score (Max 15)",
      "ATS Score (Max 10)",
      "Tags",
      "Resume Storage URL",
      "JD Storage URL"
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = assessments.map(item => {
      const rep = item.report || {};
      const dims = rep.dimensions || [];
      const getDimScore = (id) => {
        const found = dims.find(d => d.id === id);
        return found ? found.score : '';
      };

      return [
        escapeCsv(item.id),
        escapeCsv(item.formattedTime || item.createdAt),
        escapeCsv(item.evaluator && item.evaluator.email),
        escapeCsv(item.evaluator && item.evaluator.name),
        escapeCsv(item.resume && item.resume.fileName),
        escapeCsv(item.resume && item.resume.fileType),
        escapeCsv(item.resume && item.resume.wordCount),
        escapeCsv(item.jobDescription && item.jobDescription.title),
        escapeCsv(item.jobDescription && item.jobDescription.domain),
        escapeCsv(rep.totalScore),
        escapeCsv(rep.band),
        escapeCsv(getDimScore('quantified')),
        escapeCsv(getDimScore('verbs')),
        escapeCsv(getDimScore('keywords')),
        escapeCsv(getDimScore('ats')),
        escapeCsv((item.tags || []).join('; ')),
        escapeCsv(item.resume && item.resume.storageUrl || ''),
        escapeCsv(item.jobDescription && item.jobDescription.storageUrl || '')
      ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CareerClinic_ResumeFitScore_Repository_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export All Assessments to JSON
   */
  function exportToJson(assessments) {
    if (!assessments || assessments.length === 0) return;
    const jsonStr = JSON.stringify(assessments, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CareerClinic_ResumeFitScore_Repository_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Team Email Notification Content Generator
   */
  function getTeamNotificationData() {
    const portalUrl = "https://www.mycareercompany.com/ResumeFitScore";
    const subject = "[Career Clinic] Resume Fit Score™ Repository & Storage Portal Access Activated";
    
    const body = `Dear Team,

The centralized institutional repository for Career Clinic's Resume Fit Score™ Diagnostic Engine is now linked to Google Firebase and active.

What has been configured:
• All uploaded candidate resumes (PDF, DOCX, text) are now archived with time saved and file metadata.
• All target Job Descriptions (custom uploads, pasted text, and curated B-School benchmarks) are logged.
• Complete 8-dimension diagnostic reports, fit scores (0-100), quantified bullet analysis, action verb ratios, and ATS compliance checks are stored with tags.
• Full evaluator tracking: Every evaluation is logged under the reviewer's authenticated Google ID.

Authorized Evaluator Access:
The following accounts have been granted administrative and evaluator access to the diagnostic engine and archive repository:
- upam.patra@gmail.com
- iimonkataki@mycareercompany.com
- anirbanroy@mycareercompany.com
- ibonkataki@mycareercompany.com

Portal Access Link:
${portalUrl}

How to Access:
1. Open the portal link above.
2. Sign in with your authorized Google Account.
3. Switch between the "Diagnostic Engine" to run evaluations and the "Assessment Repository" to search, filter, view, and export past candidate evaluations.

Best regards,
Career Clinic Institutional Team
My Career Company
www.mycareercompany.com`;

    const recipients = PERMITTED_EMAILS.filter(e => !e.includes('companny')).join(',');

    const mailtoUrl = `mailto:${encodeURIComponent(recipients)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return {
      recipients: PERMITTED_EMAILS,
      recipientString: recipients,
      subject: subject,
      body: body,
      portalUrl: portalUrl,
      mailtoUrl: mailtoUrl
    };
  }

  // Internal event dispatcher
  function dispatchRepositoryUpdate(detail) {
    try {
      window.dispatchEvent(new CustomEvent('cc-repository-updated', { detail }));
    } catch (_) {}
  }

  // Public Interface
  window.RepositoryService = {
    saveAssessment: saveAssessment,
    fetchAssessments: fetchAssessments,
    deleteAssessment: deleteAssessment,
    calculateStats: calculateStats,
    exportToCsv: exportToCsv,
    exportToJson: exportToJson,
    getTeamNotificationData: getTeamNotificationData,
    permittedEmails: PERMITTED_EMAILS
  };

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebaseServices);
  } else {
    initFirebaseServices();
  }

})();
