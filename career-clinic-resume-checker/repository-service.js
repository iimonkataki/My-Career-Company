/**
 * Career Clinic — Assessment Repository & Firebase Storage Service
 * My Career Company — "Diagnose. Prepare. Practise. Perform."
 * 
 * Securely stores all uploaded candidate resumes, uploaded JDs, and generated
 * Fit Score™ diagnostic reports to Firebase (Firestore & Storage) with comprehensive
 * metadata, timestamps, evaluator email tracking, and tagging.
 * 
 * Instantaneous Recording:
 * - Standalone unique resumes recorded immediately upon upload / paste
 * - Standalone unique JDs recorded immediately upon upload / link / paste
 * - Complete paired diagnostic reports recorded immediately upon scoring
 */

(function () {
  'use strict';

  const ASSESSMENTS_COLLECTION = 'resume_assessments';
  const RESUMES_COLLECTION = 'unique_resumes';
  const JDS_COLLECTION = 'unique_job_descriptions';

  const LOCAL_CACHE_ASSESSMENTS = 'CC_RESUME_ASSESSMENTS_V1';
  const LOCAL_CACHE_RESUMES = 'CC_UNIQUE_RESUMES_V1';
  const LOCAL_CACHE_JDS = 'CC_UNIQUE_JDS_V1';

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
  let firestoreListeners = [];

  // Initialize Firebase Firestore and Storage
  function initFirebaseServices() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        if (!db) {
          db = firebase.firestore();
          isFirestoreAvailable = true;
        }
      } catch (err) {
        console.warn("[RepositoryService] Firestore initialization warning:", err.message);
      }

      try {
        if (!storage) {
          storage = firebase.storage();
          isStorageAvailable = true;
        }
      } catch (err) {
        console.warn("[RepositoryService] Storage initialization warning:", err.message);
      }
    }
  }

  // Fast string hash for content deduplication
  function computeHash(str) {
    let hash = 0;
    if (!str || str.length === 0) return 'empty';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  // Normalize text for content fingerprinting (lowercased alphanumeric string)
  function normalizeTextForComparison(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 3000);
  }

  // Normalize candidate name (e.g. "Anirban Roy" -> "anirbanroy")
  function normalizeNameForComparison(name) {
    if (!name || typeof name !== 'string') return '';
    return name
      .toLowerCase()
      .replace(/[-_]?(resume|cv|profile|final|updated|v\d+)[-_]?/gi, '')
      .replace(/[^a-z]/g, '')
      .trim();
  }

  // Normalize filename (e.g. "Anirban_Roy_Resume.pdf" -> "anirbanroyresume")
  function normalizeFileNameForComparison(fileName) {
    if (!fileName || typeof fileName !== 'string') return '';
    return fileName
      .toLowerCase()
      .replace(/\.(pdf|docx|doc|txt)$/i, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  // Deterministic content hash from normalized text, filename, and file size
  function generateContentHash(text, fileName = '', size = 0) {
    const normText = normalizeTextForComparison(text);
    const normFile = normalizeFileNameForComparison(fileName);
    return computeHash(`${normFile}_${normText}_${size || 0}`);
  }

  /**
   * Determine if two resume records are duplicates based on name, size, filename, and content
   */
  function isDuplicateResume(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;

    // 1. Content hash match
    if (a.contentHash && b.contentHash && a.contentHash === b.contentHash) return true;

    // 2. Candidate name match
    const nameA = normalizeNameForComparison(a.candidateName);
    const nameB = normalizeNameForComparison(b.candidateName);
    const sameName = nameA && nameB && nameA === nameB && nameA !== 'candidate';

    // 3. Filename match
    const fileA = normalizeFileNameForComparison(a.fileName);
    const fileB = normalizeFileNameForComparison(b.fileName);
    const sameFile = fileA && fileB && fileA === fileB;

    // 4. File size match (within ±300 bytes)
    const sizeA = Number(a.fileSizeBytes) || 0;
    const sizeB = Number(b.fileSizeBytes) || 0;
    const sameSize = sizeA > 0 && sizeB > 0 && Math.abs(sizeA - sizeB) <= 300;

    // 5. Word count match (within ±5 words)
    const wordsA = Number(a.wordCount) || 0;
    const wordsB = Number(b.wordCount) || 0;
    const sameWordCount = wordsA > 0 && wordsB > 0 && Math.abs(wordsA - wordsB) <= 5;

    // Same candidate name AND (same file OR same size OR same word count)
    if (sameName && (sameFile || sameSize || sameWordCount)) {
      return true;
    }

    // Same candidate name when candidate name is distinct (>= 5 chars)
    if (sameName && nameA.length >= 5) {
      return true;
    }

    // Same file name AND same file size
    if (sameFile && sameSize) {
      return true;
    }

    // Text snippet / content comparison
    if (a.snippet && b.snippet && a.snippet.length >= 60 && b.snippet.length >= 60) {
      const snipA = normalizeTextForComparison(a.snippet).substring(0, 120);
      const snipB = normalizeTextForComparison(b.snippet).substring(0, 120);
      if (snipA && snipB && snipA === snipB) {
        return true;
      }
    }

    return false;
  }

  /**
   * Scan and deduplicate an array of resume records.
   * Merges duplicate items, keeps the canonical/latest record,
   * and identifies duplicate IDs that can be removed from Firestore.
   */
  function deduplicateResumeList(rawList = []) {
    const uniqueList = [];
    const duplicateIdsToDelete = [];

    for (const item of rawList) {
      if (!item) continue;
      const existingIdx = uniqueList.findIndex(existing => isDuplicateResume(existing, item));
      if (existingIdx >= 0) {
        const existing = uniqueList[existingIdx];
        if ((item.savedAt || 0) > (existing.savedAt || 0)) {
          existing.savedAt = item.savedAt;
          existing.formattedTime = item.formattedTime;
          if (item.evaluator && item.evaluator.email) existing.evaluator = item.evaluator;
        }
        if (!existing.fullText && item.fullText) {
          existing.fullText = item.fullText;
          existing.snippet = item.snippet;
        }
        if (item.id && item.id !== existing.id) {
          duplicateIdsToDelete.push(item.id);
        }
      } else {
        uniqueList.push(item);
      }
    }

    return { uniqueList, duplicateIdsToDelete };
  }

  /**
   * Determine if two Job Descriptions are duplicates
   */
  function isDuplicateJd(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;

    if (a.contentHash && b.contentHash && a.contentHash === b.contentHash) return true;

    // URL match
    const urlA = (a.url || '').toLowerCase().trim();
    const urlB = (b.url || '').toLowerCase().trim();
    if (urlA && urlB && urlA === urlB) return true;

    const titleA = normalizeFileNameForComparison(a.title || a.fileName);
    const titleB = normalizeFileNameForComparison(b.title || b.fileName);
    const sameTitle = titleA && titleB && titleA === titleB;

    const domainA = (a.domain || '').toLowerCase().trim();
    const domainB = (b.domain || '').toLowerCase().trim();
    const sameDomain = domainA && domainB && domainA === domainB;

    const sizeA = Number(a.fileSizeBytes) || 0;
    const sizeB = Number(b.fileSizeBytes) || 0;
    const sameSize = sizeA > 0 && sizeB > 0 && Math.abs(sizeA - sizeB) <= 200;

    const wordsA = Number(a.wordCount) || 0;
    const wordsB = Number(b.wordCount) || 0;
    const sameWordCount = wordsA > 0 && wordsB > 0 && Math.abs(wordsA - wordsB) <= 5;

    if (sameTitle && (sameDomain || sameSize || sameWordCount)) {
      return true;
    }

    if (a.snippet && b.snippet && a.snippet.length >= 60 && b.snippet.length >= 60) {
      const snipA = normalizeTextForComparison(a.snippet).substring(0, 120);
      const snipB = normalizeTextForComparison(b.snippet).substring(0, 120);
      if (snipA && snipB && snipA === snipB) {
        return true;
      }
    }

    return false;
  }

  /**
   * Scan and deduplicate an array of Job Descriptions
   */
  function deduplicateJdList(rawList = []) {
    const uniqueList = [];
    const duplicateIdsToDelete = [];

    for (const item of rawList) {
      if (!item) continue;
      const existingIdx = uniqueList.findIndex(existing => isDuplicateJd(existing, item));
      if (existingIdx >= 0) {
        const existing = uniqueList[existingIdx];
        if ((item.savedAt || 0) > (existing.savedAt || 0)) {
          existing.savedAt = item.savedAt;
          existing.formattedTime = item.formattedTime;
          if (item.evaluator && item.evaluator.email) existing.evaluator = item.evaluator;
        }
        if (!existing.fullText && item.fullText) {
          existing.fullText = item.fullText;
          existing.snippet = item.snippet;
        }
        if (item.id && item.id !== existing.id) {
          duplicateIdsToDelete.push(item.id);
        }
      } else {
        uniqueList.push(item);
      }
    }

    return { uniqueList, duplicateIdsToDelete };
  }

  // Sanitize filename for safe storage keys
  function sanitizeKey(str) {
    if (!str) return 'document';
    return str.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 80);
  }

  // Deep recursive sanitizer to eliminate 'undefined' values before sending to Firestore
  function sanitizeForFirestore(obj) {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
    const clean = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      clean[key] = (val !== undefined) ? sanitizeForFirestore(val) : null;
    }
    return clean;
  }

  // Format readable date and time (e.g. "18 Oct 2026, 01:15 AM")
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

  // --- Local Cache Helpers ---
  function getListFromCache(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn(`[RepositoryService] Failed to read ${key}:`, e);
      return [];
    }
  }

  function saveListToCache(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify((list || []).slice(0, 250)));
    } catch (e) {
      console.warn(`[RepositoryService] Failed to save ${key}:`, e);
    }
  }

  function upsertItemInCache(key, item) {
    const list = getListFromCache(key);
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    saveListToCache(key, list);
    return list;
  }

  function removeItemFromCache(key, itemId) {
    const list = getListFromCache(key).filter(i => i.id !== itemId);
    saveListToCache(key, list);
    return list;
  }

  /**
   * Upload File Blob to Firebase Storage with a strict 2-second timeout.
   * If Firebase Storage is not enabled or times out, it safely falls back
   * without blocking or crashing Firestore storage.
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

      const uploadPromise = fileRef.put(file, metadata).then(async snap => {
        const downloadUrl = await snap.ref.getDownloadURL();
        return { url: downloadUrl, path: storagePath };
      });

      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => resolve({ url: null, path: null, timedOut: true }), 2000);
      });

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err) {
      console.warn(`[RepositoryService] Storage upload note for ${folder}:`, err.message);
      return { url: null, path: null, error: err.message };
    }
  }

  /**
   * Extract or resolve candidate name from user profile, resume text, filename, or email
   */
  function extractCandidateName(user, resumeFile, resumeText) {
    // 1. Resume text analysis (highest priority for candidate name)
    if (resumeText && typeof resumeText === 'string') {
      const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        if (/^[A-Z][a-zA-Z'.]+(?:\s+[A-Z][a-zA-Z'.]+){1,3}$/.test(line) && line.length <= 40) {
          if (!/resume|curriculum|vitae|profile|education|experience|summary|skills|objective|contact/i.test(line)) {
            return line;
          }
        }
      }
    }

    // 2. Resume filename (e.g. "Arun_Kumar_CV.pdf" -> "Arun Kumar")
    if (resumeFile && resumeFile.name) {
      const base = resumeFile.name.replace(/\.[^/.]+$/, '');
      const candidateParts = base
        .replace(/[-_]?(resume|cv|profile|final|updated|v\d+)[-_]?/gi, ' ')
        .replace(/[_\-]+/g, ' ')
        .replace(/[^a-zA-Z\s]/g, '')
        .trim();
      if (candidateParts.length >= 3 && candidateParts.length <= 40) {
        return candidateParts;
      }
    }

    // 3. Google display name if provided and not generic
    if (user && user.displayName && user.displayName.trim()) {
      const dName = user.displayName.trim();
      if (!/^(user|evaluator|admin|administrator|student|candidate)$/i.test(dName)) {
        return dName;
      }
    }

    // 4. Email address username part (e.g. "rohan.sharma@gmail.com" -> "Rohan Sharma")
    if (user && user.email) {
      const prefix = user.email.split('@')[0];
      const parts = prefix.split(/[._-]+/).filter(p => !/^\d+$/.test(p) && p.length > 1);
      if (parts.length >= 1) {
        return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      }
      return prefix;
    }

    return 'Candidate';
  }

  function getAuthenticatedUserInfo() {
    let userEmail = 'anonymous';
    let userName = 'Evaluator';
    let userPhoto = null;
    let isCoFounderUser = false;

    if (window.AuthGuard) {
      if (typeof window.AuthGuard.getCurrentUser === 'function') {
        const u = window.AuthGuard.getCurrentUser();
        if (u) {
          userEmail = (u.email || '').toLowerCase().trim();
          userName = u.displayName || u.email.split('@')[0];
          userPhoto = u.photoURL || null;
        }
      }
      if (typeof window.AuthGuard.isCoFounder === 'function') {
        isCoFounderUser = window.AuthGuard.isCoFounder();
      }
    }

    return { userEmail, userName, userPhoto, isCoFounderUser };
  }

  /**
   * RECORD UNIQUE RESUME IMMEDIATELY
   * Automatically triggered when a resume is selected, dropped, or pasted.
   * Scans existing records by name, file size, filename, and content to prevent duplicates.
   */
  async function recordResume(payload = {}) {
    initFirebaseServices();
    const now = new Date();
    const { file, text = '', numPages = 1 } = payload;
    const fileName = file ? file.name : (payload.fileName || 'Pasted-Resume.txt');
    const wordCount = (text.match(/\b[A-Za-z0-9'-]+\b/g) || []).length;
    const fileSizeBytes = file ? file.size : text.length;

    const { userEmail, userName, userPhoto } = getAuthenticatedUserInfo();
    const candidateName = extractCandidateName({ displayName: userName, email: userEmail }, file, text);
    const contentHash = generateContentHash(text, fileName, fileSizeBytes);

    const cleanCandidate = candidateName
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s-]+/g, '_')
      .replace(/^_+|_+$/g, '');

    // Deterministic canonical ID based strictly on candidate name and content signature
    const canonicalId = `RES_${cleanCandidate || 'Candidate'}_${contentHash}`;

    const resumeRecord = {
      id: canonicalId,
      candidateName: candidateName,
      fileName: fileName,
      fileType: file ? (fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX') : 'TEXT',
      fileSizeBytes: fileSizeBytes,
      numPages: numPages || 1,
      wordCount: wordCount,
      snippet: text ? text.substring(0, 350) : '',
      fullText: text || '',
      contentHash: contentHash,
      evaluator: {
        email: userEmail,
        name: userName,
        photoURL: userPhoto
      },
      createdAt: now.toISOString(),
      savedAt: Date.now(),
      formattedTime: formatReadableDateTime(now)
    };

    // Scan existing cached resumes to detect duplicate by name, size, filename, or content
    const cachedResumes = getListFromCache(LOCAL_CACHE_RESUMES);
    const existingMatch = cachedResumes.find(r => isDuplicateResume(r, resumeRecord));
    if (existingMatch) {
      // Reuse existing document ID and preserve original creation time
      resumeRecord.id = existingMatch.id;
      resumeRecord.createdAt = existingMatch.createdAt || resumeRecord.createdAt;
      if (!resumeRecord.fullText && existingMatch.fullText) {
        resumeRecord.fullText = existingMatch.fullText;
        resumeRecord.snippet = existingMatch.snippet;
      }
    }

    const cleanDoc = sanitizeForFirestore(resumeRecord);

    if (isFirestoreAvailable && db) {
      try {
        await db.collection(RESUMES_COLLECTION).doc(resumeRecord.id).set(cleanDoc);
      } catch (err) {
        console.warn("[RepositoryService] Firestore unique_resumes write note:", err.message);
      }
    }

    upsertItemInCache(LOCAL_CACHE_RESUMES, resumeRecord);
    dispatchRepositoryUpdate({ type: 'resume', record: resumeRecord });
    return resumeRecord;
  }

  /**
   * RECORD UNIQUE JOB DESCRIPTION IMMEDIATELY
   * Automatically triggered when a JD is uploaded, pasted, linked, or chosen.
   * Scans existing records by title, domain, file size, and content to prevent duplicates.
   */
  async function recordJobDescription(payload = {}) {
    initFirebaseServices();
    const now = new Date();
    const {
      file,
      text = '',
      title = '',
      domain = 'Consulting',
      subDomain = '',
      tab = 'upload',
      url = ''
    } = payload;

    const fileName = file ? file.name : (title || 'Target-Job-Description.txt');
    const wordCount = (text.match(/\b[A-Za-z0-9'-]+\b/g) || []).length;
    const fileSizeBytes = file ? file.size : text.length;
    const contentHash = generateContentHash(text, fileName || title, fileSizeBytes);

    const { userEmail, userName, userPhoto } = getAuthenticatedUserInfo();

    const cleanTitle = (title || fileName || 'JD')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s-]+/g, '_')
      .substring(0, 30);

    const canonicalId = `JD_${cleanTitle}_${contentHash}`;

    const jdRecord = {
      id: canonicalId,
      title: title || (file ? file.name : 'Target Job Description'),
      domain: domain || 'Consulting',
      subDomain: subDomain || '',
      fileName: file ? file.name : null,
      fileSizeBytes: fileSizeBytes,
      wordCount: wordCount,
      tab: tab || 'upload',
      url: url || '',
      snippet: text ? text.substring(0, 350) : '',
      fullText: text || '',
      contentHash: contentHash,
      evaluator: {
        email: userEmail,
        name: userName,
        photoURL: userPhoto
      },
      createdAt: now.toISOString(),
      savedAt: Date.now(),
      formattedTime: formatReadableDateTime(now)
    };

    const cachedJds = getListFromCache(LOCAL_CACHE_JDS);
    const existingMatch = cachedJds.find(j => isDuplicateJd(j, jdRecord));
    if (existingMatch) {
      jdRecord.id = existingMatch.id;
      jdRecord.createdAt = existingMatch.createdAt || jdRecord.createdAt;
      if (!jdRecord.fullText && existingMatch.fullText) {
        jdRecord.fullText = existingMatch.fullText;
        jdRecord.snippet = existingMatch.snippet;
      }
    }

    const cleanDoc = sanitizeForFirestore(jdRecord);

    if (isFirestoreAvailable && db) {
      try {
        await db.collection(JDS_COLLECTION).doc(jdRecord.id).set(cleanDoc);
      } catch (err) {
        console.warn("[RepositoryService] Firestore unique_job_descriptions write note:", err.message);
      }
    }

    upsertItemInCache(LOCAL_CACHE_JDS, jdRecord);
    dispatchRepositoryUpdate({ type: 'jd', record: jdRecord });
    return jdRecord;
  }

  /**
   * Save Complete Assessment to Firebase Firestore & Storage
   * Also ensures resume and JD are recorded in unique collections.
   */
  async function saveAssessment(payload) {
    initFirebaseServices();

    const now = new Date();
    const { userEmail, userName, userPhoto, isCoFounderUser } = getAuthenticatedUserInfo();

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
      result = {}
    } = payload;

    // 1. Immediately record resume & JD into unique stores
    const recordedResume = await recordResume({
      file: resumeFile,
      text: resumeText,
      numPages: resumeNumPages
    });

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
      jdTitle = `${(targetRole || 'Placement').toUpperCase()} Placement Benchmark`;
    }

    const recordedJd = await recordJobDescription({
      file: jdFile,
      text: jdText,
      title: jdTitle,
      domain: jdDomain,
      subDomain: jdSubDomain,
      tab: jdTab,
      url: jdUrl
    });

    const candidateName = extractCandidateName({ displayName: userName, email: userEmail }, resumeFile, resumeText);

    // Format Guaranteed Unique Record ID:
    let recordId;
    if (isCoFounderUser) {
      recordId = 'CC-EVAL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    } else {
      const cleanName = candidateName
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s-]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const uniqueSuffix = Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
      recordId = `${cleanName || 'Candidate'}_${uniqueSuffix}`;
    }

    // 2. Upload binary files to storage (with 2-second timeout, non-blocking)
    let resumeStorage = { url: null, path: null };
    let jdStorage = { url: null, path: null };

    if (resumeFile && isStorageAvailable) {
      try {
        resumeStorage = await uploadFileToStorage('resumes', resumeFile, recordId);
      } catch (_) {}
    }

    if (jdFile && isStorageAvailable) {
      try {
        jdStorage = await uploadFileToStorage('job_descriptions', jdFile, recordId);
      } catch (_) {}
    }

    const resumeFileName = resumeFile ? resumeFile.name : 'Pasted-Resume.txt';
    const resumeWords = (resumeText.match(/\b[A-Za-z0-9'-]+\b/g) || []).length;
    const jdWords = (jdText.match(/\b[A-Za-z0-9'-]+\b/g) || []).length;

    // Tags
    const domainTag = (jdDomain || targetRole || 'general').toLowerCase().replace(/\s+/g, '-');
    const bandTag = (result.band || 'calibrated').toLowerCase().replace(/\s+/g, '-');
    const typeTag = resumeFile ? (resumeFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx') : 'pasted';
    const evaluatorTag = userEmail.split('@')[0] || 'evaluator';

    const tags = [
      `#candidate:${(candidateName || 'candidate').toLowerCase().replace(/\s+/g, '-')}`,
      `#domain:${domainTag}`,
      `#band:${bandTag}`,
      `#score:${result.totalScore || 0}`,
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
      candidateName: candidateName,
      createdAt: now.toISOString(),
      savedAt: Date.now(),
      formattedTime: formatReadableDateTime(now),
      
      evaluator: {
        email: userEmail,
        name: candidateName || userName,
        photoURL: userPhoto
      },

      resume: {
        id: recordedResume ? recordedResume.id : null,
        fileName: resumeFileName,
        fileType: resumeFile ? (resumeFile.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX') : 'TEXT',
        fileSizeBytes: resumeFile ? resumeFile.size : resumeText.length,
        numPages: resumeNumPages || 1,
        wordCount: resumeWords,
        snippet: resumeText ? resumeText.substring(0, 350) : '',
        fullText: resumeText || '',
        storageUrl: resumeStorage.url || null,
        storagePath: resumeStorage.path || null
      },

      jobDescription: {
        id: recordedJd ? recordedJd.id : null,
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
        totalScore: result.totalScore || 0,
        band: result.band || 'moderate',
        bandLabel: result.bandLabel || '',
        roleLabel: result.roleLabel || '',
        dimensions: (result.dimensions || []).map(d => ({
          id: d.id || '',
          name: d.name || '',
          score: d.score || 0,
          max: d.max || 0,
          loss: d.loss || 0
        })),
        strengths: (result.strengths || []).map(s => ({
          name: s.name || '',
          score: s.score || 0,
          max: s.max || 0
        })),
        priorityFixes: (result.priorityFixes || []).map(f => ({
          id: f.id || '',
          name: f.name || '',
          score: f.score || 0,
          max: f.max || 0,
          loss: f.loss || 0,
          advice: f.advice || ''
        })),
        stats: result.stats || {},
        detectedKeywords: result.detectedKeywords || [],
        missingKeywords: result.missingKeywords || []
      },

      tags: tags,
      customTags: []
    };

    const cleanRecord = sanitizeForFirestore(record);

    // 1. Store in Firestore collection
    let firestoreSaved = false;
    if (isFirestoreAvailable && db) {
      try {
        await db.collection(ASSESSMENTS_COLLECTION).doc(recordId).set(cleanRecord);
        firestoreSaved = true;
      } catch (err) {
        console.warn("[RepositoryService] Firestore save note (local cache preserved):", err.message);
      }
    }

    // 2. Always persist to browser cache for instantaneous offline access
    upsertItemInCache(LOCAL_CACHE_ASSESSMENTS, cleanRecord);

    // Notify listeners immediately
    dispatchRepositoryUpdate({ type: 'assessment', record: cleanRecord });

    return {
      record: cleanRecord,
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

    if (isFirestoreAvailable && db) {
      try {
        const snapshot = await db.collection(ASSESSMENTS_COLLECTION).get();
        snapshot.forEach(doc => {
          records.push(doc.data());
        });

        // Merge with local cache
        const local = getListFromCache(LOCAL_CACHE_ASSESSMENTS);
        const map = new Map();
        records.forEach(r => map.set(r.id, r));
        local.forEach(r => {
          if (!map.has(r.id)) map.set(r.id, r);
        });
        records = Array.from(map.values());

        saveListToCache(LOCAL_CACHE_ASSESSMENTS, records);
      } catch (err) {
        console.warn("[RepositoryService] Firestore fetch note:", err.message);
        records = getListFromCache(LOCAL_CACHE_ASSESSMENTS);
      }
    } else {
      records = getListFromCache(LOCAL_CACHE_ASSESSMENTS);
    }

    // Sort by savedAt descending
    records.sort((a, b) => ((b.savedAt || 0) - (a.savedAt || 0)));

    // Apply Client-Side Filters
    let filtered = records;

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const id = (item.id || '').toLowerCase();
        const cand = (item.candidateName || '').toLowerCase();
        const resumeName = (item.resume && item.resume.fileName || '').toLowerCase();
        const jdTitle = (item.jobDescription && item.jobDescription.title || '').toLowerCase();
        const evaluator = (item.evaluator && (item.evaluator.email || item.evaluator.name) || '').toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();
        const score = String(item.report && item.report.totalScore || '');

        return id.includes(q) ||
          cand.includes(q) ||
          resumeName.includes(q) ||
          jdTitle.includes(q) ||
          evaluator.includes(q) ||
          tags.includes(q) ||
          score === q;
      });
    }

    if (filters.domain && filters.domain !== 'all') {
      const dom = filters.domain.toLowerCase();
      filtered = filtered.filter(item => {
        const itemDom = (item.jobDescription && item.jobDescription.domain || '').toLowerCase();
        return itemDom.includes(dom) || (item.tags || []).some(t => t.includes(dom));
      });
    }

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

    if (filters.evaluator && filters.evaluator !== 'all') {
      const evalEmail = filters.evaluator.toLowerCase();
      filtered = filtered.filter(item => {
        const email = (item.evaluator && item.evaluator.email || '').toLowerCase();
        return email === evalEmail;
      });
    }

    if (filters.sortBy) {
      const sortBy = filters.sortBy;
      if (sortBy === 'newest') filtered.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      if (sortBy === 'oldest') filtered.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
      if (sortBy === 'score-high') filtered.sort((a, b) => ((b.report && b.report.totalScore) || 0) - ((a.report && a.report.totalScore) || 0));
      if (sortBy === 'score-low') filtered.sort((a, b) => ((a.report && a.report.totalScore) || 0) - ((b.report && b.report.totalScore) || 0));
    }

    return filtered;
  }

  /**
   * Fetch All Unique Resumes (with Active Multi-Vector Deduplication Scanner)
   */
  async function fetchUniqueResumes(filters = {}) {
    initFirebaseServices();
    let records = [];

    if (isFirestoreAvailable && db) {
      try {
        const snapshot = await db.collection(RESUMES_COLLECTION).get();
        snapshot.forEach(doc => records.push(doc.data()));

        const local = getListFromCache(LOCAL_CACHE_RESUMES);
        const map = new Map();
        records.forEach(r => map.set(r.id, r));
        local.forEach(r => {
          if (!map.has(r.id)) map.set(r.id, r);
        });
        records = Array.from(map.values());
      } catch (err) {
        records = getListFromCache(LOCAL_CACHE_RESUMES);
      }
    } else {
      records = getListFromCache(LOCAL_CACHE_RESUMES);
    }

    // Run through multi-vector deduplication scanner (name, size, filename, content)
    const { uniqueList, duplicateIdsToDelete } = deduplicateResumeList(records);
    records = uniqueList;

    // Persist clean deduplicated list to cache
    saveListToCache(LOCAL_CACHE_RESUMES, records);

    // Asynchronously purge duplicate documents from Firestore if authorized co-founder
    if (duplicateIdsToDelete.length > 0 && isFirestoreAvailable && db) {
      const isCoFounder = window.AuthGuard && window.AuthGuard.isCoFounder && window.AuthGuard.isCoFounder();
      if (isCoFounder) {
        duplicateIdsToDelete.forEach(dupId => {
          db.collection(RESUMES_COLLECTION).doc(dupId).delete().catch(e => {
            console.warn('[RepositoryService] Clean duplicate resume document note:', e.message);
          });
        });
      }
    }

    records.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      records = records.filter(item => {
        return (item.candidateName || '').toLowerCase().includes(q) ||
          (item.fileName || '').toLowerCase().includes(q) ||
          (item.evaluator && item.evaluator.email || '').toLowerCase().includes(q);
      });
    }

    return records;
  }

  /**
   * Fetch All Unique Job Descriptions (with Active Deduplication Scanner)
   */
  async function fetchUniqueJobDescriptions(filters = {}) {
    initFirebaseServices();
    let records = [];

    if (isFirestoreAvailable && db) {
      try {
        const snapshot = await db.collection(JDS_COLLECTION).get();
        snapshot.forEach(doc => records.push(doc.data()));

        const local = getListFromCache(LOCAL_CACHE_JDS);
        const map = new Map();
        records.forEach(r => map.set(r.id, r));
        local.forEach(r => {
          if (!map.has(r.id)) map.set(r.id, r);
        });
        records = Array.from(map.values());
      } catch (err) {
        records = getListFromCache(LOCAL_CACHE_JDS);
      }
    } else {
      records = getListFromCache(LOCAL_CACHE_JDS);
    }

    // Run through deduplication scanner (title, domain, size, content)
    const { uniqueList, duplicateIdsToDelete } = deduplicateJdList(records);
    records = uniqueList;

    saveListToCache(LOCAL_CACHE_JDS, records);

    if (duplicateIdsToDelete.length > 0 && isFirestoreAvailable && db) {
      const isCoFounder = window.AuthGuard && window.AuthGuard.isCoFounder && window.AuthGuard.isCoFounder();
      if (isCoFounder) {
        duplicateIdsToDelete.forEach(dupId => {
          db.collection(JDS_COLLECTION).doc(dupId).delete().catch(e => {
            console.warn('[RepositoryService] Clean duplicate JD document note:', e.message);
          });
        });
      }
    }

    records.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      records = records.filter(item => {
        return (item.title || '').toLowerCase().includes(q) ||
          (item.domain || '').toLowerCase().includes(q) ||
          (item.evaluator && item.evaluator.email || '').toLowerCase().includes(q);
      });
    }

    return records;
  }

  /**
   * Delete an Assessment
   */
  async function deleteAssessment(recordId) {
    if (window.AuthGuard && !window.AuthGuard.isCoFounder()) {
      throw new Error("Unauthorized: Assessment deletion is restricted to the 4 co-founders.");
    }

    initFirebaseServices();

    if (isFirestoreAvailable && db) {
      try {
        await db.collection(ASSESSMENTS_COLLECTION).doc(recordId).delete();
      } catch (err) {
        console.warn("[RepositoryService] Firestore delete note:", err.message);
      }
    }

    removeItemFromCache(LOCAL_CACHE_ASSESSMENTS, recordId);
    dispatchRepositoryUpdate({ deletedId: recordId });
    return true;
  }

  /**
   * Delete a Unique Resume
   */
  async function deleteResume(resumeId) {
    if (window.AuthGuard && !window.AuthGuard.isCoFounder()) {
      throw new Error("Unauthorized: Resume deletion is restricted to the 4 co-founders.");
    }

    initFirebaseServices();

    if (isFirestoreAvailable && db) {
      try {
        await db.collection(RESUMES_COLLECTION).doc(resumeId).delete();
      } catch (err) {
        console.warn("[RepositoryService] Firestore delete resume note:", err.message);
      }
    }

    removeItemFromCache(LOCAL_CACHE_RESUMES, resumeId);
    dispatchRepositoryUpdate({ deletedResumeId: resumeId });
    return true;
  }

  /**
   * Delete a Unique Job Description
   */
  async function deleteJobDescription(jdId) {
    if (window.AuthGuard && !window.AuthGuard.isCoFounder()) {
      throw new Error("Unauthorized: Job Description deletion is restricted to the 4 co-founders.");
    }

    initFirebaseServices();

    if (isFirestoreAvailable && db) {
      try {
        await db.collection(JDS_COLLECTION).doc(jdId).delete();
      } catch (err) {
        console.warn("[RepositoryService] Firestore delete JD note:", err.message);
      }
    }

    removeItemFromCache(LOCAL_CACHE_JDS, jdId);
    dispatchRepositoryUpdate({ deletedJdId: jdId });
    return true;
  }

  function removeItemItemFromCache(key, recordId) {
    return removeItemFromCache(key, recordId);
  }

  /**
   * Calculate Repository Aggregate Statistics
   */
  function calculateStats(assessments = [], resumes = [], jds = []) {
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
      uniqueResumesCount: (resumes && resumes.length) || totalCount,
      uniqueJdsCount: (jds && jds.length) || (Object.keys(domainCounts).length || 1),
      averageScore: totalCount > 0 ? Math.round(scoreSum / totalCount) : 0,
      placementReadyCount: readyCount,
      competitiveCount: compCount,
      topDomain: topDomain
    };
  }

  /**
   * Export All Assessments to CSV
   */
  function exportToCsv(assessments) {
    if (window.AuthGuard && !window.AuthGuard.isCoFounder()) {
      alert("Unauthorized: Exporting repository data is restricted to the 4 co-founders.");
      return;
    }
    if (!assessments || assessments.length === 0) return;

    const headers = [
      "Resume Fit Score ID",
      "Candidate Name",
      "Date & Time",
      "User / Evaluator Email",
      "Evaluator Account Name",
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
        escapeCsv(item.candidateName || (item.evaluator && item.evaluator.name)),
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
    if (window.AuthGuard && !window.AuthGuard.isCoFounder()) {
      alert("Unauthorized: Exporting repository data is restricted to the 4 co-founders.");
      return;
    }
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

  function getCachedUniqueResumesCount() {
    try {
      const cached = getListFromCache(LOCAL_CACHE_RESUMES);
      const { uniqueList } = deduplicateResumeList(cached);
      return uniqueList.length;
    } catch (_) {
      return 0;
    }
  }

  let realtimeSyncActive = false;

  // Real-time Firestore snapshot listener for co-founders (listening to both Resumes, JDs & Assessments)
  function setupRealtimeSync(callback) {
    initFirebaseServices();
    if (!isFirestoreAvailable || !db) return;

    if (window.AuthGuard && !window.AuthGuard.isCoFounder()) return;
    if (realtimeSyncActive) return;

    try {
      realtimeSyncActive = true;

      // 1. Listen to Unique Resumes Collection
      const unsubResumes = db.collection(RESUMES_COLLECTION).onSnapshot(() => {
        if (typeof callback === 'function') callback();
        dispatchRepositoryUpdate({ type: 'realtime-sync', collection: 'resumes' });
      }, err => {
        console.warn("[RepositoryService] Resumes realtime sync note:", err.message);
      });
      firestoreListeners.push(unsubResumes);

      // 2. Listen to Unique Job Descriptions Collection
      const unsubJds = db.collection(JDS_COLLECTION).onSnapshot(() => {
        if (typeof callback === 'function') callback();
        dispatchRepositoryUpdate({ type: 'realtime-sync', collection: 'jds' });
      }, err => {
        console.warn("[RepositoryService] JDs realtime sync note:", err.message);
      });
      firestoreListeners.push(unsubJds);

      // 3. Listen to Assessments Collection
      const unsubAssessments = db.collection(ASSESSMENTS_COLLECTION).onSnapshot(() => {
        if (typeof callback === 'function') callback();
        dispatchRepositoryUpdate({ type: 'realtime-sync', collection: 'assessments' });
      }, err => {
        console.warn("[RepositoryService] Assessments realtime sync note:", err.message);
      });
      firestoreListeners.push(unsubAssessments);

    } catch (err) {
      console.warn("[RepositoryService] Setup sync error:", err);
    }
  }

  // Public Interface
  window.RepositoryService = {
    recordResume: recordResume,
    recordJobDescription: recordJobDescription,
    saveAssessment: saveAssessment,
    fetchAssessments: fetchAssessments,
    fetchUniqueResumes: fetchUniqueResumes,
    fetchUniqueJobDescriptions: fetchUniqueJobDescriptions,
    getCachedUniqueResumesCount: getCachedUniqueResumesCount,
    deleteAssessment: deleteAssessment,
    deleteResume: deleteResume,
    deleteJobDescription: deleteJobDescription,
    calculateStats: calculateStats,
    exportToCsv: exportToCsv,
    exportToJson: exportToJson,
    getTeamNotificationData: getTeamNotificationData,
    setupRealtimeSync: setupRealtimeSync,
    permittedEmails: PERMITTED_EMAILS
  };

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebaseServices);
  } else {
    initFirebaseServices();
  }

})();
