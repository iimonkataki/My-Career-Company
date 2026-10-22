/* CURRENT production engine — scoring functions copied verbatim from career-clinic-resume-checker/script.js (Oct 2026).
 * Only DOM/UI code is omitted. Priority-fix advice strings are shortened (selection logic unchanged).
 * formatJdText() and getScoringRoleFamily() are copied verbatim from jd-database.js. */
var ROLE_KEYWORDS = {
  consulting: [/\bmarket\s*sizing\b/i,/\bdue\s*diligence\b/i,/\b(?:go[- ]to[- ]market|gtm)\b/i,/\b(?:competitive|industry)\s*benchmark(?:ing|s)?\b/i,/\bcost\s*optimi[zs]ation\b/i,/\bmece\b/i,/\bvalue\s*proposition\b/i,/\bfinancial\s*model(?:ing|s)?\b/i,/\bcompetitive\s*(?:landscape|landscaping|intelligence)\b/i,/\bhypothesis[- ]driven\b/i,/\boperational\s*excellence\b/i,/\bcagr\b/i,/\bgrowth\s*strateg(?:y|ies)\b/i,/\bsynerg(?:y|ies)\b/i,/\bstakeholder\s*management\b/i,/\bchange\s*management\b/i,/\b(?:post[- ]merger\s*integration|pmi)\b/i,/\bdigital\s*transformation\b/i],
  finance: [/\bdcf\b/i,/\bfinancial\s*model(?:ing|s)?\b/i,/\bvaluation(?:s)?\b/i,/\bebitda\b/i,/\bp\s*&\s*l|profit\s*and\s*loss\b/i,/\bcredit\s*risk\b/i,/\bportfolio\s*management\b/i,/\bequity\s*research\b/i,/\bcapital\s*structure\b/i,/\bworking\s*capital\b/i,/\bm\s*&\s*a|mergers?\s*and\s*acquisitions?\b/i,/\bbasel(?:\s*(?:ii|iii|iv))?\b/i,/\bfixed\s*income\b/i,/\bderivative(?:s)?\b/i,/\bsensitivity\s*analysis\b/i,/\birr|internal\s*rate\s*of\s*return\b/i,/\bnpv|net\s*present\s*value\b/i,/\bdue\s*diligence\b/i],
  marketing: [/\bbrand\s*strateg(?:y|ies)\b/i,/\bcustomer\s*acquisition\b/i,/\bcac|customer\s*acquisition\s*cost\b/i,/\bltv|customer\s*lifetime\s*value\b/i,/\b(?:go[- ]to[- ]market|gtm)\b/i,/\bcampaign\s*optimi[zs]ation\b/i,/\bdigital\s*marketing\b/i,/\bmarket\s*research\b/i,/\bconsumer\s*insights?\b/i,/\bbrand\s*positioning\b/i,/\b(?:seo|sem)\b/i,/\bconversion\s*funnel\b/i,/\bretention\b/i,/\bcontent\s*strateg(?:y|ies)\b/i,/\broas|return\s*on\s*ad\s*spend\b/i,/\bproduct\s*marketing\b/i,/\bbrand\s*equity\b/i,/\bomnichannel\b/i],
  product: [/\b(?:product\s*)?roadmap(?:s)?\b/i,/\buser\s*stor(?:y|ies)\b/i,/\b(?:wirefram(?:e|ing|es)|mockups?|prototyp(?:e|ing|es)|figma)\b/i,/\b(?:agile|scrum|sprint(?:s| planning)?|kanban|jira)\b/i,/\b(?:a\/b\s*test(?:ing|s)?|multivariate\s*testing|experimentation)\b/i,/\b(?:feature\s*prioriti[zs]ation|rice\s*framework|moscow|backlog\s*prioritization)\b/i,/\b(?:prd|product\s*requirement(?:s)?\s*document|product\s*specs?|technical\s*specifications?)\b/i,/\b(?:user\s*personas?|user\s*research|customer\s*discovery|usability\s*testing)\b/i,/\b(?:ui\/ux|user\s*experience|customer\s*journeys?|user\s*flows?)\b/i,/\b(?:north\s*star(?:\s*metric)?|okrs?|product\s*kpis?)\b/i,/\b(?:retention(?:\s*rate)?|churn(?:\s*rate|\s*reduction)?|cohort\s*retention)\b/i,/\b(?:product\s*discovery|mvp|minimum\s*viable\s*product)\b/i,/\b(?:backlog(?:\s*grooming|\s*refinement)?|sprint\s*backlog)\b/i,/\b(?:api(?:s)?|cross[- ]functional\s*engineering|engineering\s*sprints)\b/i,/\b(?:product[- ]market\s*fit|pmf)\b/i,/\b(?:funnel\s*optimi[zs]ation|drop[- ]off|activation\s*rate|onboarding\s*flow)\b/i,/\b(?:product\s*analytics|mixpanel|amplitude|google\s*analytics|ga4|metabase)\b/i,/\b(?:product\s*lifecycle|feature\s*adoption|go[- ]to[- ]market|gtm)\b/i],
  operations: [/\bsupply\s*chain\b/i,/\bsix\s*sigma\b/i,/\blean\b/i,/\binventory\s*management\b/i,/\blogistics?\b/i,/\bprocurement\b/i,/\bvendor\s*management\b/i,/\broot\s*cause\s*analysis|rca\b/i,/\bkaizen\b/i,/\bwarehouse\s*management\b/i,/\bdemand\s*forecasting\b/i,/\bs&op|sales\s*and\s*operations\s*planning\b/i,/\bturnaround\s*time|tat\b/i,/\bquality\s*assurance|qa\b/i,/\bbottleneck(?:s)?\b/i,/\berp|sap|oracle\b/i,/\bcost\s*reduction\b/i,/\bprocess\s*automation\b/i],
  hr: [/\btalent\s*acquisition\b/i,/\bemployee\s*engagement\b/i,/\bperformance\s*management\b/i,/\bhrbp|human\s*resources?\s*business\s*partner\b/i,/\bcompensation\s*&\s*benefits|c&b\b/i,/\battrition\b/i,/\bonboarding\b/i,/\bsuccession\s*planning\b/i,/\bcompetency\s*mapping\b/i,/\bemployee\s*relations\b/i,/\bhr\s*analytics\b/i,/\bdiversity\s*&\s*inclusion|d&i\b/i,/\bpolicy\s*formulation\b/i,/\blearning\s*&\s*development|l&d|training\b/i,/\bworkforce\s*planning\b/i,/\bkpi(?:s)?\b/i,/\bhris|workday|peoplesoft\b/i,/\borgani[zs]ation(?:al)?\s*design\b/i],
  analytics: [/\bpredictive\s*model(?:ing)?\b/i,/\bsql\b/i,/\bpython\b/i,/\btableau\b/i,/\bpower\s*bi\b/i,/\bmachine\s*learning|ml\b/i,/\bdata\s*visuali[zs]ation\b/i,/\bstatistical\s*analysis|statistics\b/i,/\betl\b/i,/\bregression\b/i,/\bcohort\s*analysis\b/i,/\ba\/b\s*testing\b/i,/\bdata\s*(?:wrangling|cleaning)\b/i,/\bdashboard(?:s)?\b/i,/\bexploratory\s*data\s*analysis|eda\b/i,/\br\s*programming|\br\s*language\b/i,/\bclustering\b/i,/\btime\s*series\b/i],
  genman: [/\bp\s*&\s*l|profit\s*and\s*loss\b/i,/\bcross[- ]functional\b/i,/\bstrategic\s*planning\b/i,/\bbusiness\s*development\b/i,/\boperations?\s*management\b/i,/\bresource\s*allocation\b/i,/\bchange\s*leadership\b/i,/\brevenue\s*growth\b/i,/\bbudget(?:ing)?\b/i,/\brisk\s*management\b/i,/\bgovernance\b/i,/\borgani[zs]ation(?:al)?\s*transformation\b/i,/\bclient\s*relationship\b/i,/\bprogram\s*management\b/i,/\bteam\s*(?:mentoring|leadership|supervision)\b/i,/\bperformance\s*tracking\b/i,/\bcontinuous\s*improvement\b/i,/\bcontract\s*negotiation\b/i],
  sales: [/\bb2b(?:\s*sales)?\b/i,/\bpipeline\b/i,/\bquota\b/i,/\blead\s*generation\b/i,/\bkey\s*account(?:s)?|kam\b/i,/\bcontract\s*negotiation\b/i,/\brevenue\s*generation|arr|acv\b/i,/\bclient\s*acquisition\b/i,/\bcrm|salesforce|hubspot\b/i,/\bprospecting|outbound\b/i,/\bdeal\s*si[zs]ing|deal\s*closure\b/i,/\bstakeholder\s*engagement\b/i,/\bsales\s*enablement\b/i,/\bcross[- ]selling|up[- ]selling\b/i,/\bvalue[- ]based\s*selling\b/i,/\brfp|bid\s*management\b/i,/\bterritory\s*management\b/i,/\bcustomer\s*retention\b/i]
};
Object.keys(ROLE_KEYWORDS).forEach(function (k) { ROLE_KEYWORDS[k] = ROLE_KEYWORDS[k].map(function (re, i) { return { name: k + '#' + (i + 1) + ' ' + re.source.replace(/\\b|\\s\*|\(\?:|\)/g, '').slice(0, 24), regex: re }; }); });
var TK = {
  consulting: ['management consultant','strategy consultant','associate consultant','senior consultant','principal consultant','engagement manager','consulting analyst','strategy advisory','mckinsey','bcg','bain'],
  finance: ['finance','investment banking','equity research','wealth management','dcf','valuation','m&a','financial analyst','credit risk','portfolio'],
  marketing: ['marketing','brand manager','brand management','growth marketing','digital marketing','campaign','gtm','social media','consumer insights'],
  sales: ['sales','business development','account executive','b2b','quota','pipeline','sales manager','client acquisition','revenue','prospecting'],
  product: ['product manager','associate product manager','apm','senior product manager','group product manager','product management','product owner','technical product manager','head of product','prd','wireframes','product roadmap'],
  operations: ['operations','supply chain','procurement','logistics','inventory','six sigma','manufacturing','warehouse','lean'],
  analytics: ['analytics','data analyst','data scientist','bi','tableau','power bi','machine learning','predictive','sql','python'],
  genman: ['general management','business unit','p&l','leadership','management trainee','cross-functional','program management'],
  hr: ['human resources','talent acquisition','hrbp','people operations','recruiter','learning and development','compensation']
};
var DOMAIN_METADATA = {}; Object.keys(TK).forEach(function (k) { DOMAIN_METADATA[k] = { shortLabel: k, label: k, icon: '', titleKeywords: TK[k] }; });
function detectDomainFromJd(textOrUrl, optionalTitle, optionalFileName) {
  optionalTitle = optionalTitle || ''; optionalFileName = optionalFileName || '';
  if (!textOrUrl && !optionalTitle && !optionalFileName) return null;
  var normalized = (optionalTitle + ' ' + optionalFileName + ' ' + (textOrUrl || '')).toLowerCase().replace(/[-_\\/:]+/g, ' ').replace(/\s+/g, ' ');
  var slugPatterns = [
    { pattern: /\b(?:product\s*manager|associate\s*product\s*manager|apm|product\s*owner|head\s*of\s*product|technical\s*product\s*manager)\b/i, domain: 'product', weight: 20 },
    { pattern: /\b(?:management\s*consultant|strategy\s*consultant|associate\s*consultant|engagement\s*manager|consulting\s*analyst|mckinsey|bcg|bain)\b/i, domain: 'consulting', weight: 20 },
    { pattern: /\b(?:investment\s*bank(?:er|ing)|equity\s*research|financial\s*analyst|portfolio\s*manager|corporate\s*finance|wealth\s*management|credit\s*risk)\b/i, domain: 'finance', weight: 20 },
    { pattern: /\b(?:brand\s*manager|product\s*marketing|growth\s*marketing|digital\s*marketing|marketing\s*manager|content\s*marketing)\b/i, domain: 'marketing', weight: 20 },
    { pattern: /\b(?:b2b\s*sales|account\s*executive|business\s*development|sales\s*manager|enterprise\s*sales|key\s*account)\b/i, domain: 'sales', weight: 20 },
    { pattern: /\b(?:supply\s*chain|operations\s*manager|procurement|logistics|warehouse|operations\s*executive)\b/i, domain: 'operations', weight: 20 },
    { pattern: /\b(?:data\s*scientist|data\s*analyst|business\s*analytics|bi\s*analyst|analytics\s*manager|machine\s*learning)\b/i, domain: 'analytics', weight: 20 },
    { pattern: /\b(?:hr\s*business\s*partner|hrbp|talent\s*acquisition|human\s*resources|recruiter|people\s*operations)\b/i, domain: 'hr', weight: 20 },
    { pattern: /\b(?:general\s*management|management\s*trainee|chief\s*of\s*staff|program\s*manager)\b/i, domain: 'genman', weight: 20 }];
  var bestDomain = null, maxScore = 0, scores = {};
  slugPatterns.forEach(function (sp) { if (sp.pattern.test(normalized)) scores[sp.domain] = (scores[sp.domain] || 0) + sp.weight; });
  Object.keys(DOMAIN_METADATA).forEach(function (key) {
    var meta = DOMAIN_METADATA[key], score = scores[key] || 0;
    (ROLE_KEYWORDS[key] || []).forEach(function (kw) { if (kw.regex.test(normalized)) score += 3; });
    meta.titleKeywords.forEach(function (tk) { var re = new RegExp('\\b' + tk.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i'); if (re.test(normalized)) score += 6; });
    scores[key] = score; if (score > maxScore) { maxScore = score; bestDomain = key; }
  });
  return maxScore >= 6 ? bestDomain : null;
}
var STRONG_ACTION_VERBS = ["led","spearheaded","accelerated","formulated","streamlined","orchestrated","designed","executed","delivered","optimized","boosted","generated","automated","structured","negotiated","cultivated","piloted","initiated","pioneered","engineered","achieved","implemented","expanded","transformed","established","analyzed","built","reduced","increased","maximized","championed","directed","integrated","developed","identified","revamped","scaled","spearhead","accelerate","formulate","streamline","orchestrate","design","execute","deliver","optimize","boost","generate","automate"];
var WEAK_PHRASES = ["responsible for","worked on","helped","assisted with","assisted","tasked with","handled","duties included","involved in"].map(function (p) { return { phrase: p, label: p }; });
function extractBullets(rawText) {
  var lines = rawText.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean), bullets = [];
  var bulletPrefixRegex = /^[-•*–—▪▫\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u27A2\u279C\u25BA]|\b\d+[\.\)]\s*/;
  lines.forEach(function (line) {
    var cleanLine = line.replace(bulletPrefixRegex, '').trim();
    if (/@|\+91\b|linkedin\.com/i.test(cleanLine) && (cleanLine.toLowerCase().includes('email') || cleanLine.toLowerCase().includes('mobile') || cleanLine.toLowerCase().includes('phone'))) return;
    var words = cleanLine.split(/\s+/).filter(Boolean);
    if (words.length >= 4) bullets.push({ raw: line, clean: cleanLine, words: words, wordCount: words.length });
  });
  return bullets;
}
function extractKeywordsFromJd(jdText, targetRoleKey) {
  var matched = [], seen = new Set();
  var allVocab = [].concat(ROLE_KEYWORDS.consulting, ROLE_KEYWORDS.finance, ROLE_KEYWORDS.marketing, ROLE_KEYWORDS.product, ROLE_KEYWORDS.operations, ROLE_KEYWORDS.hr, ROLE_KEYWORDS.analytics, ROLE_KEYWORDS.genman);
  allVocab.forEach(function (item) { if (item.regex.test(jdText) && !seen.has(item.name.toLowerCase())) { matched.push(item); seen.add(item.name.toLowerCase()); } });
  (jdText.match(/\b[A-Z][A-Za-z0-9&/-]{1,10}\b/g) || []).forEach(function (term) {
    var t = term.trim();
    if (['AND','THE','FOR','YOU','OUR','NOT','ARE','WITH','FROM','THIS','WILL'].indexOf(t.toUpperCase()) < 0 && t.length >= 3 && !seen.has(t.toLowerCase())) {
      matched.push({ name: t, regex: new RegExp('\\b' + t + '\\b', 'i') }); seen.add(t.toLowerCase());
    }
  });
  (ROLE_KEYWORDS[targetRoleKey] || ROLE_KEYWORDS.consulting).forEach(function (item) { if (!seen.has(item.name.toLowerCase()) && matched.length < 18) { matched.push(item); seen.add(item.name.toLowerCase()); } });
  return matched.slice(0, 18);
}
function scoreResume(text, numPages, targetRoleKey, customJdText) {
  customJdText = customJdText || '';
  var cleanText = text.trim(), wordCount = cleanText.split(/\s+/).filter(Boolean).length, bullets = extractBullets(cleanText), totalBullets = bullets.length > 0 ? bullets.length : 1;
  var hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(cleanText), hasMobile = /(?:\+91[\s.-]?|91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}\b/.test(cleanText), hasLinkedIn = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[a-zA-Z0-9_-]+|\blinkedin(?:\.com)?\b/i.test(cleanText);
  var contactScore = (hasEmail ? 3 : 0) + (hasMobile ? 3 : 0) + (hasLinkedIn ? 4 : 0);
  var sections = {
    education: { weight: 3, detected: /(?:^|\n|\b)(?:education|academic(?:s| qualifications| background)|scholastic achievements)(?::|\b|\n)/i.test(cleanText) },
    experience: { weight: 3, detected: /(?:^|\n|\b)(?:experience|work experience|professional experience|employment history|internship(?:s)?|summer internship)(?::|\b|\n)/i.test(cleanText) },
    projects: { weight: 2, detected: /(?:^|\n|\b)(?:projects|academic projects|key projects|capstone|live projects)(?::|\b|\n)/i.test(cleanText) },
    achievements: { weight: 2, detected: /(?:^|\n|\b)(?:achievements|honors|awards|accomplishments|accolades)(?::|\b|\n)/i.test(cleanText) },
    por: { weight: 2, detected: /(?:^|\n|\b)(?:positions? of responsibility|por|leadership roles?|responsibilities|extracurricular leadership)(?::|\b|\n)/i.test(cleanText) },
    skills: { weight: 2, detected: /(?:^|\n|\b)(?:skills|technical skills|core competencies|key skills|areas of expertise|competencies)(?::|\b|\n)/i.test(cleanText) },
    certifications: { weight: 1, detected: /(?:^|\n|\b)(?:certifications?|certificates?|licenses?|courses?)(?::|\b|\n)/i.test(cleanText) } };
  var sectionScore = 0; Object.keys(sections).forEach(function (k) { if (sections[k].detected) sectionScore += sections[k].weight; });
  var yearPattern = /\b(?:19|20)\d{2}\b/g, metricRegex = /(?:%|\bRs\.?\b|\bINR\b|₹|\$|€|£|\blakh(?:s)?\b|\blac(?:s)?\b|\bcrore(?:s)?\b|\bcr\b|\bmillion\b|\bmn\b|\bbillion\b|\bbn\b|\bk\b|\b\d+(?:,\d+)*(?:\.\d+)?\b)/i;
  var quantified = bullets.filter(function (b) { return metricRegex.test(b.clean.replace(yearPattern, '')); }), unquantified = bullets.filter(function (b) { return !metricRegex.test(b.clean.replace(yearPattern, '')); });
  var quantShare = quantified.length / totalBullets, quantifiedScore = Math.min(20, Math.round((quantShare / 0.50) * 20));
  var strong = bullets.filter(function (b) { return STRONG_ACTION_VERBS.indexOf((b.words[0] || '').toLowerCase().replace(/[^a-z]/g, '')) >= 0; });
  var strongVerbShare = strong.length / totalBullets, baseActionScore = Math.min(10, Math.round((strongVerbShare / 0.60) * 10));
  var weakFound = WEAK_PHRASES.filter(function (wp) { return new RegExp('\\b' + wp.phrase + '\\b', 'gi').test(cleanText); });
  var actionVerbsScore = Math.max(0, Math.min(10, baseActionScore - Math.min(4, weakFound.length)));
  var ideal = bullets.filter(function (b) { return b.wordCount >= 10 && b.wordCount <= 30; }).length, bulletQualityScore = Math.min(10, Math.round((ideal / totalBullets / 0.70) * 10));
  var lengthScore = (numPages !== null && numPages !== undefined) ? (numPages === 1 ? 10 : numPages === 2 ? 5 : 2) : (wordCount <= 450 ? 10 : wordCount <= 900 ? 5 : 2);
  var roleKeywordList = (customJdText && customJdText.trim().split(/\s+/).filter(Boolean).length >= 12) ? extractKeywordsFromJd(customJdText, targetRoleKey) : (ROLE_KEYWORDS[targetRoleKey] || ROLE_KEYWORDS.consulting);
  var detected = roleKeywordList.filter(function (kw) { return kw.regex.test(cleanText); });
  var roleKeywordScore = Math.min(15, Math.round((detected.length / 9) * 15));
  var formatScore = (wordCount >= 150 ? 3 : 0) + ((bullets.filter(function (b) { return b.wordCount < 4; }).length / Math.max(1, bullets.length)) < 0.25 ? 2 : 0) + (/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(cleanText) ? 0 : 2) + (Object.keys(sections).filter(function (k) { return sections[k].detected; }).length >= 4 ? 2 : 0) + (/\b(?:19|20)\d{2}\b/.test(cleanText) ? 1 : 0);
  var totalScore = contactScore + sectionScore + quantifiedScore + actionVerbsScore + bulletQualityScore + lengthScore + roleKeywordScore + formatScore;
  var band = totalScore >= 75 ? (roleKeywordScore >= 5 ? 'STRONG' : 'MODERATE') : totalScore >= 55 ? 'MODERATE' : 'NEEDS WORK';
  var dims = [['contact','Contact & LinkedIn',contactScore,10],['structure','Section Structure',sectionScore,15],['quantified','Quantified Impact',quantifiedScore,20],['verbs','Action Verbs vs Weak Phrases',actionVerbsScore,10],['quality','Bullet Quality & Length',bulletQualityScore,10],['length','Resume Length',lengthScore,10],['keywords','Role-Keyword Match',roleKeywordScore,15],['ats','Formatting & ATS Compliance',formatScore,10]].map(function (d) { return { id: d[0], name: d[1], score: d[2], max: d[3], loss: d[3] - d[2] }; });
  var priorityFixes = dims.filter(function (d) { return d.loss > 0; }).sort(function (a, b) { return b.loss - a.loss; }).slice(0, 4).map(function (d, i) { return 'Priority 0' + (i + 1) + ' ' + d.name; });
  return { totalScore: totalScore, band: band, dims: dims, priorityFixes: priorityFixes, bullets: bullets, strongCount: strong.length, weakTypes: weakFound.map(function (w) { return w.phrase; }), keywordList: roleKeywordList.map(function (k) { return k.name; }), detected: detected.map(function (k) { return k.name; }),
    rewrites: generateBulletRewrites(bullets, cleanText, targetRoleKey), suitability: calculateDomainSuitability(text, targetRoleKey) };
}
function generateBulletRewrites(bullets, cleanText, roleKey) {
  var weakRegex = /\b(responsible for|worked on|helped with|helped|assisted with|assisted|tasked with|handled|duties included|involved in|part of|participated in|contributed to|managed|served as|supported|coordinated with|acted as|worked as)\b/i;
  var yearPattern = /\b(?:19|20)\d{2}\b/g, metricRegex = /(?:%|\bRs\.?\b|\bINR\b|₹|\$|€|£|\blakh(?:s)?\b|\blac(?:s)?\b|\bcrore(?:s)?\b|\bcr\b|\bmillion\b|\bmn\b|\bbillion\b|\bbn\b|\bk\b|\b\d+(?:,\d+)*(?:\.\d+)?\b)/i;
  var scored = bullets.map(function (b) { var s = 0; if (weakRegex.test(b.clean)) s += 50; if (!metricRegex.test(b.clean.replace(yearPattern, ''))) s += 30; if (STRONG_ACTION_VERBS.indexOf((b.words[0] || '').toLowerCase().replace(/[^a-z]/g, '')) < 0) s += 20; if (b.wordCount < 10 || b.wordCount > 32) s += 10; return { b: b, s: s }; }).sort(function (a, b) { return b.s - a.s; });
  var BM = { consulting: { v: ["Spearheaded","Formulated","Structured"], m: [", cutting cycle turnaround time by [32% / ₹24 Lakh] across business units.", ", delivering an annual EBITDA enhancement of [₹18.5 Crore / 14% margin].", ", unlocking [22% CAGR / ₹40 Crore] addressable market expansion."] },
    finance: { v: ["Constructed","Modeled","Appraised"], m: [", identifying [₹120 Crore] in M&A synergy value and sensitivity upside.", ", optimizing portfolio working capital release by [₹14.5 Crore / 180 bps].", ", evaluating DCF scenarios across 45+ asset classes, mitigating downside risk by [15%]."] },
    marketing: { v: ["Orchestrated","Scaled","Accelerated"], m: [", reducing blended Customer Acquisition Cost (CAC) by [28%] while scaling LTV by [1.8x].", ", delivering [₹3.2 Crore] in incremental annualized pipeline via full-funnel GTM.", ", lifting conversion funnel throughput by [34% / 420 bps] across 4 digital channels."] },
    sales: { v: ["Negotiated","Secured","Expanded"], m: [", securing [₹12.5 Crore] in enterprise contract value at [124%] quota attainment.", ", expanding Tier-1 key account ARR by [35% / ₹4.8 Crore] through cross-sell positioning.", ", accelerating enterprise deal sales cycle velocity by [40 days]."] },
    product: { v: ["Architected","Prioritized","Delivered"], m: [", driving [42%] user adoption and reducing onboarding drop-off by [26%].", ", accelerating sprint feature velocity by [30%] while boosting day-30 user retention by [18%].", ", lifting North Star metric engagement by [35%] across 250k+ monthly active users."] },
    hr: { v: ["Instituted","Revamped","Benchmarked"], m: [", reducing annualized high-performer attrition by [22%] while lifting engagement scores by [18 points].", ", compressing campus recruitment TAT by [35%] across Day-0 hiring drives.", ", standardizing competency rubrics across [1,200+] employees nationwide."] } };
  var bm = BM[roleKey] || BM.consulting, out = [];
  scored.slice(0, 3).forEach(function (sc, i) {
    var c = sc.b.clean; WEAK_PHRASES.some(function (wp) { var re = new RegExp('^' + wp.phrase + '\\s+', 'i'); if (re.test(c)) { c = c.replace(re, ''); return true; } });
    if (/^[^:]{3,60}:\s*/.test(c)) c = c.replace(/^[^:]{3,60}:\s*/, '');
    var fw = (c.split(/\s+/)[0] || '').toLowerCase(), body = STRONG_ACTION_VERBS.indexOf(fw) >= 0 ? c.replace(new RegExp('^' + fw + '\\s+', 'i'), '') : c.charAt(0).toLowerCase() + c.slice(1);
    body = body.replace(/[.,;:\s]+$/, '');
    var kpi = /(?:%|\bRs\.?\b|\bINR\b|₹|\$|\blakh|\bcrore|\bcr\b|\bmillion\b|\bmn\b|\bbps\b|\bcagr\b)/i.test(body.replace(yearPattern, ''));
    out.push({ before: sc.b.clean, after: bm.v[i % 3] + ' ' + body + (kpi ? '.' : bm.m[i % 3]) });
  });
  return out;
}
function calculateDomainSuitability(text, targetRoleKey) {
  var lower = text.toLowerCase();
  var PRIMARY = { product: /\b(?:product\s*manager|associate\s*product\s*manager|apm|product\s*owner|head\s*of\s*product|vp\s*product|product\s*lead|technical\s*product\s*manager)\b/i, consulting: /\b(?:management\s*consultant|strategy\s*consultant|associate\s*consultant|engagement\s*manager|consulting\s*analyst)\b/i, finance: /\b(?:investment\s*bank(?:er|ing)|equity\s*research\s*analyst|financial\s*analyst|portfolio\s*manager|wealth\s*manager)\b/i, marketing: /\b(?:brand\s*manager|product\s*marketing\s*manager|growth\s*marketer|digital\s*marketing\s*manager)\b/i, operations: /\b(?:supply\s*chain\s*manager|operations\s*manager|procurement\s*manager|logistics\s*manager)\b/i, analytics: /\b(?:data\s*scientist|data\s*analyst|business\s*intelligence\s*analyst|bi\s*analyst)\b/i, sales: /\b(?:account\s*executive|b2b\s*sales\s*manager|business\s*development\s*manager|key\s*account\s*manager)\b/i, hr: /\b(?:hr\s*business\s*partner|hrbp|talent\s*acquisition\s*manager|people\s*operations\s*manager)\b/i };
  return Object.keys(DOMAIN_METADATA).map(function (key) {
    var kw = ROLE_KEYWORDS[key] || [], m = kw.filter(function (k) { return k.regex.test(lower); }).length;
    var tm = DOMAIN_METADATA[key].titleKeywords.filter(function (tk) { return new RegExp('\\b' + tk.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(lower); }).length;
    var raw = Math.round((m / Math.max(1, kw.length)) * 55 + Math.min(18, tm * 6) + (PRIMARY[key] && PRIMARY[key].test(lower) ? 25 : 0) + 10);
    return { key: key, score: Math.max(20, Math.min(98, raw)) };
  }).sort(function (a, b) { return b.score - a.score; });
}
// ---- formatJdText() and getScoringRoleFamily() copied verbatim from jd-database.js (jdlib-2026.10-v2) ----
function formatJdText(j) {
  if (!j) return '';
  const locs = Array.isArray(j.locations) ? j.locations.join(', ') : j.locations;
  const resps = Array.isArray(j.responsibilities) ? j.responsibilities.map(function (r) { return '• ' + r; }).join('\n') : j.responsibilities;
  const techSkills = j.skills && j.skills.technical ? j.skills.technical.join('; ') : '';
  const behSkills = j.skills && j.skills.behavioural ? j.skills.behavioural.join('; ') : '';
  const tools = Array.isArray(j.tools) ? j.tools.join('; ') : j.tools;
  const keywords = Array.isArray(j.atsKeywords) ? j.atsKeywords.join(', ') : j.atsKeywords;
  const titles = Array.isArray(j.titles) ? j.titles.join(', ') : '';
  const subAreas = Array.isArray(j.subAreas) ? j.subAreas.join(', ') : '';
  const lines = [
    j.domain + ' — ' + j.level + ' (' + j.experienceBand + ') · Target JD ' + j.id, 'Typical titles: ' + titles, 'Sub-areas covered: ' + subAreas,
    'Locations: ' + locs + ' | Typical Employers: ' + (j.employerTypes || 'Tier-1 Recruiters'), '', 'POSITION OVERVIEW', j.summary, '', 'KEY RESPONSIBILITIES', resps, '',
    'REQUIRED SKILLS & COMPETENCIES', '• Technical Skills: ' + techSkills, '• Behavioural Competencies: ' + behSkills,
    '• Core Must-Haves: ' + (Array.isArray(j.mustHave) ? j.mustHave.join('; ') : techSkills), '• Good to Have: ' + (j.goodToHave || 'None specifically required'),
    '• Tools & Software: ' + (tools || 'Standard industry suite'), '', 'ELIGIBILITY & EXPERIENCE', '• Experience: ' + (j.experience ? j.experience.text : 'N/A'),
    '• Education: ' + j.education, '• Academic Cut-off (' + (j.academicCutOff ? j.academicCutOff.code : 'AC-C') + '): ' + (j.academicCutOff ? j.academicCutOff.note : 'Standard 60% consistency norm'),
    '• Certifications Required: ' + (j.certifications && j.certifications.required ? j.certifications.required : 'None'),
    '• Certifications Preferred: ' + (j.certifications && j.certifications.preferred ? j.certifications.preferred : 'None typically')];
  if (j.certifications && j.certifications.conditional && j.certifications.conditional.length) { lines.push('• Conditional Requirements (Regulated Sub-Areas):'); j.certifications.conditional.forEach(function (c) { lines.push('  - ' + c); }); }
  lines.push(''); lines.push('TARGET ATS KEYWORDS'); lines.push(keywords);
  return lines.join('\n');
}
function getScoringRoleFamily(j) { if (!j || !j.scoring || !j.scoring.roleFamily) return 'consulting'; return j.scoring.roleFamily; }
var SAMPLE_MBA_RESUME = "RAHUL SHARMA\nIIM Indore | Post Graduate Programme in Management (MBA)\nEmail: rahul.sharma.pgp2025@iimidr.ac.in | Mobile: +91 9876543210 | LinkedIn: linkedin.com/in/rahulsharma-strategy\n\nEDUCATION\n• Indian Institute of Management Indore (IIM Indore) | MBA (PGPM) | CGPA: 3.65 / 4.00 | 2023 - 2025\n• National Institute of Technology (NIT) Kurukshetra | B.Tech, Mechanical Engineering | CGPA: 8.42 / 10.00 | 2017 - 2021\n• Delhi Public School, R.K. Puram | Class XII (CBSE) - 94.6% | Class X (CBSE) - 96.2%\n\nWORK EXPERIENCE\nAccenture Strategy & Consulting | Management Consultant | 2021 - 2023\n• Spearheaded market sizing and competitive benchmarking for a Tier-1 FMCG client, identifying Rs 45 crore growth opportunity in North India.\n• Formulated Go-To-Market (GTM) strategy for new direct-to-consumer beverage line, reducing expected customer acquisition cost by 22%.\n• Engineered hypothesis-driven cost optimization model across 14 manufacturing plants, delivering annual EBITDA enhancement of Rs 18.5 crore.\n• Streamlined supply chain turnaround time by 30% through bottleneck analysis and lean inventory re-allocation across 6 regional warehouses.\n• Responsible for reviewing client operations reports and weekly project deliverables for Fortune 500 leadership steering committee.\n• Automated weekly PMO tracking dashboard using SQL and Tableau, cutting manual reporting time by 18 hours per sprint.\n\nSUMMER INTERNSHIP\nMcKinsey & Company | Summer Associate (Consulting) | Apr 2024 - Jun 2024\n• Conducted comprehensive commercial due diligence for a Rs 1,200 crore cross-border private equity acquisition in healthcare.\n• Built detailed financial models with DCF valuation and sensitivity analysis, evaluating post-merger synergy potential of 15% CAGR.\n• Worked on stakeholder interviews across 18 hospital networks to synthesize market perception and customer willingness to pay.\n• Delivered board-level final synthesis presentation to senior partners, receiving pre-placement interview (PPI) recommendation.\n\nACADEMIC PROJECTS\n• Digital Transformation in BFSI (Capstone): Designed digital customer onboarding framework, modeling 28% churn reduction.\n• EV Fleet Electrification Study: Formulated CAPEX-OPEX sensitivity matrix across 5 urban transit hubs.\n\nPOSITIONS OF RESPONSIBILITY\n• Senior Coordinator, Management Consulting Club, IIM Indore: Mentored 240+ students on MECE frameworks and case interview prep.\n• Member, Placement Committee (Junior): Managed corporate engagements for 110+ recruiters during Summer Placement drive.\n\nSCHOLASTIC ACHIEVEMENTS & AWARDS\n• National Finalist (Top 3 out of 1,800+ teams), Tata Steel Steel-a-thon Business Case Competition.\n• Merit Scholarship Awardee for academic distinction in first year of MBA at IIM Indore.\n• Published research paper on supply chain resilience in International Journal of Industrial Engineering.\n\nSKILLS & CERTIFICATIONS\n• Consulting Frameworks: MECE Structuring, Market Sizing, Due Diligence, Value Proposition Design, Financial Modeling\n• Analytical Tools: Python, SQL, Tableau, Power BI, Advanced Excel (Financial Valuation)\n• Certifications: Bloomberg Market Concepts (BMC), Six Sigma Green Belt, Corporate Finance Institute (CFI)";
module.exports = { scoreResume: scoreResume, detectDomainFromJd: detectDomainFromJd, calculateDomainSuitability: calculateDomainSuitability, extractBullets: extractBullets, extractKeywordsFromJd: extractKeywordsFromJd, formatJdText: formatJdText, getScoringRoleFamily: getScoringRoleFamily, SAMPLE_MBA_RESUME: SAMPLE_MBA_RESUME };
