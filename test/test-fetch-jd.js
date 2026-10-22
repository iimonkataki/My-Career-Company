/* Offline tests for functions/jd-extract.js: a simulated internet (no network needed). Run: node test/test-fetch-jd.js */
'use strict';
const path = require('path');
const X = require(path.join(__dirname, '..', 'functions', 'jd-extract.js'));

const DELOITTE_DESC = `<p><strong>Deputy Manager | IT M&amp;A | Delhi | M&amp;A-Deal Transformation &amp; Post Merger integration</strong></p>
<p><strong>The team</strong></p><p>The team works as an extension of our Deloitte member firms&rsquo; M&amp;A Technology team and provides dedicated support throughout the project lifecycle. Learn more about Strategy &amp; Transactions.</p>
<p><strong>Your work profile</strong></p><ul><li>As a Deputy Manager in our Transaction Services &ndash; M&amp;A Technology team you will build positive working relationships with teams and clients</li>
<li>Identify deal-related IT risks and red flags and provide recommendations based on IT due diligence findings to support client investment decisions</li>
<li>Prepare Day 1 / Day 100 plans for integration and separation; identify IT synergies and one-off / ongoing costs</li>
<li>Support Deloitte member firms&rsquo; (UK, Canadian and European) Technology DD practice with diligence, integration and separation expertise</li></ul>
<p><strong>Desired qualifications</strong></p><ul><li>3 to 5 years of experience of the M&amp;A lifecycle, including writing and reviewing IT due diligence and post-merger integration / separation</li>
<li>Experience in Big-4 management consulting IT M&amp;A teams, IT advisory / transformation, or the consulting BU of an IT services firm</li>
<li>Ability to work in a deal environment with staff at all levels</li><li>Strong PowerPoint and Excel skills</li></ul>`;
const NAV = `<header class="site-header"><nav><a href="/">Home</a> <a href="/jobs">Search jobs</a> <a href="/students">Students</a> <a href="/experienced">Experienced hires</a> <a href="/life">Life at Deloitte</a></nav></header>
<div class="cookie-banner">We use cookies to improve your experience. <a href="/privacy">Privacy</a> <button>Accept all</button></div>`;
const FOOT = `<footer><a href="/terms">Terms of use</a> <a href="/privacy">Privacy</a> © 2026 Deloitte Touche Tohmatsu India LLP. All rights reserved. Deloitte refers to one or more of Deloitte Touche Tohmatsu Limited.</footer>`;
const PAGES = {
  'https://southasiacareers.deloitte.com/job/Delhi-Deputy-Manager-IT-M&A-Delhi-M&A-Deal-Transformation-&-Post-Merger-integration/59723944/':
    { ct: 'text/html; charset=utf-8', body: `<!doctype html><html><head><title>Deputy Manager | IT M&amp;A | Delhi | M&amp;A-Deal Transformation &amp; Post Merger integration Job Details | Deloitte</title>
<meta property="og:title" content="Deputy Manager | IT M&amp;A | Delhi | M&amp;A-Deal Transformation &amp; Post Merger integration">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'JobPosting', title: 'Deputy Manager | IT M&A | Delhi | M&A-Deal Transformation & Post Merger integration', description: DELOITTE_DESC, hiringOrganization: { '@type': 'Organization', name: 'Deloitte Touche Tohmatsu India LLP' }, jobLocation: { '@type': 'Place', address: { addressLocality: 'Delhi', addressCountry: 'IN' } }, datePosted: '2026-10-10' })}</script>
<script>window.dataLayer=[];</script></head><body>${NAV}<div class="jobDisplay"><h1>Deputy Manager | IT M&amp;A | Delhi</h1><span class="jobdescription">${DELOITTE_DESC}</span></div>${FOOT}</body></html>` },
  'https://careers.acme-fmcg.in/jobs/assistant-brand-manager-personal-care':
    { ct: 'text/html', body: `<html><head><title>Assistant Brand Manager – Personal Care | Acme FMCG Careers</title></head><body>${NAV}
<main><h1>Assistant Brand Manager – Personal Care</h1><div class="job-description"><h2>About the role</h2><p>You will support the Brand Manager on a ₹400 Cr personal-care portfolio, owning consumer insights, innovation pipeline and 360° campaigns across TV, digital and modern trade.</p>
<h2>Responsibilities</h2><ul><li>Analyse Nielsen and Kantar data to identify consumer insights and growth opportunities</li><li>Write creative briefs and manage agencies on ATL, BTL and digital campaigns</li><li>Track market share, pricing and promotion ROI and present monthly brand reviews</li><li>Work with sales and supply chain on launches</li></ul>
<h2>Requirements</h2><ul><li>MBA from a premier institute (2025/2026 batch); marketing specialisation preferred</li><li>A marketing or sales internship with measurable outcomes</li><li>Strong Excel and data storytelling skills</li></ul></div>
<aside class="related-jobs"><h3>Similar jobs</h3><a href="/j/1">Brand Manager</a> <a href="/j/2">Trade Marketing Manager</a></aside></main>${FOOT}</body></html>` },
  'https://www.example-nbfc.com/careers/credit-analyst':
    { ct: 'text/html', body: `<html><body><div class="menu"><a href="/">Home</a><a href="/loans">Loans</a></div><div id="content"><article>
<p>We are hiring a Credit Analyst for our SME lending team in Mumbai. The role reports to the Credit Manager and works closely with sales, operations and collections teams.</p>
<p>Key responsibilities include preparing credit appraisal notes, analysing financial statements, banking and GST data, conducting personal discussions with promoters, and monitoring the portfolio for early warning signals.</p>
<p>Qualifications: MBA Finance or CA with 0 to 2 years of experience. Strong accounting knowledge, Excel and financial modelling skills are required. Knowledge of CMA data and Ind AS is preferred.</p>
</article></div></body></html>` },
  'https://boards-api.greenhouse.io/v1/boards/razorpay/jobs/7012345':
    { ct: 'application/json', body: JSON.stringify({ title: 'Product Analyst – Growth', location: { name: 'Bengaluru' }, content: '&lt;h3&gt;What you will do&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Define funnel metrics and analyse activation and retention with SQL&lt;/li&gt;&lt;li&gt;Design and read A/B experiments with product managers&lt;/li&gt;&lt;li&gt;Build dashboards in Looker and Mixpanel for weekly business reviews&lt;/li&gt;&lt;/ul&gt;&lt;h3&gt;Requirements&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;1–3 years in analytics or product with strong SQL and statistics&lt;/li&gt;&lt;li&gt;Experience with experimentation, cohort analysis and data storytelling for senior stakeholders&lt;/li&gt;&lt;li&gt;MBA or engineering background preferred&lt;/li&gt;&lt;/ul&gt;' }) },
  'https://api.lever.co/v0/postings/cred/3f2a9c1e-8d7b-4c2a-9e1f-1234567890ab':
    { ct: 'application/json', body: JSON.stringify({ text: 'Category Manager – Quick Commerce', categories: { location: 'Bengaluru' }, descriptionPlain: 'Own the P&L for the snacks and beverages category on our quick-commerce platform, growing GMV and contribution margin while improving assortment and availability across dark stores.', lists: [{ text: 'What you will do', content: '<li>Expand assortment and negotiate trade terms with brands</li><li>Plan pricing, promotions and sale events with growth marketing</li><li>Track fill rate and availability with supply chain</li>' }, { text: 'What you need', content: '<li>2–4 years in category management or e-commerce</li><li>Strong Excel and SQL; comfort with unit economics</li>' }], additionalPlain: 'MBA preferred.' }) },
  'https://acme.wd3.myworkdayjobs.com/wday/cxs/acme/External/job/Mumbai/HR-Business-Partner_R-10234':
    { ct: 'application/json', body: JSON.stringify({ jobPostingInfo: { title: 'HR Business Partner', location: 'Mumbai', jobDescription: '<p><b>Role overview</b></p><p>Partner business heads on workforce planning, performance management and employee relations for a 1,200-member business unit.</p><p><b>Responsibilities</b></p><ul><li>Run the annual performance cycle and talent reviews</li><li>Handle employee relations cases and labour law compliance</li><li>Use HR analytics to reduce attrition</li></ul><p><b>Requirements</b></p><ul><li>MBA HR with 3–6 years of HRBP experience</li><li>Working knowledge of the Labour Codes</li></ul>' } }) },
  'https://api.smartrecruiters.com/v1/companies/Acme/postings/743999912345':
    { ct: 'application/json', body: JSON.stringify({ name: 'ESG Analyst', company: { name: 'Acme Advisory' }, location: { city: 'Mumbai', country: 'India' }, jobAd: { sections: { jobDescription: { title: 'Job Description', text: '<p>Support BRSR and BRSR Core reporting for listed clients, build Scope 1, 2 and 3 GHG inventories, and run materiality assessments.</p><ul><li>Prepare ESG ratings questionnaire responses</li><li>Engage suppliers for value-chain data</li></ul>' }, qualifications: { title: 'Qualifications', text: '<ul><li>MBA or MSc Environmental Science, 0–2 years</li><li>Knowledge of GRI and ISSB standards; strong Excel</li></ul>' } } } }) },
  'https://api.ashbyhq.com/posting-api/job-board/zepto?includeCompensation=false':
    { ct: 'application/json', body: JSON.stringify({ jobs: [{ id: 'a1b2c3d4-0000-1111-2222-333344445555', title: 'Associate Product Manager', location: 'Mumbai', descriptionPlain: 'About the role\nYou will own a feature area of the customer app end to end, writing PRDs, prioritising the roadmap with engineering and design, and running A/B experiments.\nRequirements\nMBA 2025/2026 or 0–2 years of product experience; strong SQL and user research skills; a technical undergraduate degree is a plus.' }] }) },
  'https://www.naukri.com/jobapi/v4/job/120526004512':
    { ct: 'application/json', body: JSON.stringify({ jobDetails: { title: 'Area Sales Manager - General Trade', companyDetail: { name: 'Dabur India' }, locations: [{ label: 'Lucknow' }], minimumExperience: 3, maximumExperience: 6, description: '<p>Drive secondary sales and distribution across the Lucknow territory, manage 12 distributors and 6 sales officers, execute trade schemes and expand outlet coverage in rural markets.</p><ul><li>Deliver monthly volume and collection targets</li><li>Manage distributor ROI, stock and claims</li></ul>', keySkills: { preferred: [{ label: 'Distribution management' }], other: [{ label: 'General trade' }, { label: 'Team handling' }] } } }) },
  'https://www.linkedin.com/jobs/view/4012345678/': { status: 200, ct: 'text/html', body: '<html><head><script></script></head><body class="authwall"><h1>Join LinkedIn</h1><p>Sign in to view this job and 1M+ others.</p></body></html>' },
  'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4012345678': { status: 429, ct: 'text/html', body: 'Too many requests' },
  'https://careers.spa-only.com/job/12345': { ct: 'text/html', body: '<html><head>' + '<script src="/a.js"></script>'.repeat(8) + '</head><body><div id="root"></div></body></html>' },
  'https://jobs.bot-protected.com/role/88': { status: 403, ct: 'text/html', body: '<html><title>Just a moment...</title><body>Checking your browser <div id="cf-chl-widget"></div></body></html>' },
  'https://www.acme.com/files/JD-Finance-Manager.pdf': { ct: 'application/pdf', body: '%PDF-1.4 sample bytes' },
  'https://short.link/abc': { status: 302, location: 'http://127.0.0.1:8080/admin', ct: 'text/html', body: '' }
};
const DNS = { 'evil-internal.example': '10.0.0.8', 'short.link': '93.184.216.34' };
function lookup(host) { return Promise.resolve([{ address: DNS[host] || '93.184.216.34', family: 4 }]); }
function fakeFetch(url) {
  const p = PAGES[url] || PAGES[decodeURI(url)];
  if (!p) return Promise.resolve(mk(404, 'text/html', '<html><body>Not found</body></html>'));
  return Promise.resolve(mk(p.status || 200, p.ct, p.body, p.location));
}
function mk(status, ct, body, location) {
  const buf = Buffer.from(body || '');
  return { status, headers: { get: k => ({ 'content-type': ct, 'content-length': String(buf.length), location: location || null })[k.toLowerCase()] || null }, body: null, arrayBuffer: () => Promise.resolve(buf) };
}
const deps = { fetch: fakeFetch, lookup };

const CASES = [
  ['Deloitte career page (JSON-LD JobPosting)', 'https://southasiacareers.deloitte.com/job/Delhi-Deputy-Manager-IT-M&A-Delhi-M&A-Deal-Transformation-&-Post-Merger-integration/59723944/', r => r.ok && r.source === 'json-ld' && /IT due diligence/.test(r.text) && /3 to 5 years/.test(r.text) && !/cookies|Terms of use/.test(r.text)],
  ['Company page, job-description container', 'https://careers.acme-fmcg.in/jobs/assistant-brand-manager-personal-care', r => r.ok && r.source === 'selector' && /Nielsen/.test(r.text) && !/Similar jobs|Accept all/.test(r.text)],
  ['Company page, no markup (main-content detection)', 'https://www.example-nbfc.com/careers/credit-analyst', r => r.ok && r.source === 'readability' && /credit appraisal/.test(r.text) && !/Loans/.test(r.text)],
  ['Greenhouse job', 'https://boards.greenhouse.io/razorpay/jobs/7012345', r => r.ok && r.source === 'platform:greenhouse' && /A\/B experiments/.test(r.text)],
  ['Lever job', 'https://jobs.lever.co/cred/3f2a9c1e-8d7b-4c2a-9e1f-1234567890ab', r => r.ok && r.source === 'platform:lever' && /unit economics/.test(r.text)],
  ['Workday job', 'https://acme.wd3.myworkdayjobs.com/en-US/External/job/Mumbai/HR-Business-Partner_R-10234', r => r.ok && r.source === 'platform:workday' && /Labour Codes/.test(r.text)],
  ['SmartRecruiters job', 'https://jobs.smartrecruiters.com/Acme/743999912345-esg-analyst', r => r.ok && r.source === 'platform:smartrecruiters' && /BRSR/.test(r.text)],
  ['Ashby job', 'https://jobs.ashbyhq.com/zepto/a1b2c3d4-0000-1111-2222-333344445555', r => r.ok && r.source === 'platform:ashby' && /PRDs/.test(r.text)],
  ['Naukri job (best effort)', 'https://www.naukri.com/job-listings-area-sales-manager-general-trade-dabur-india-lucknow-3-to-6-years-120526004512', r => r.ok && r.source === 'platform:naukri' && /distributors/.test(r.text) && /3–6 years/.test(r.text)],
  ['LinkedIn behind login → clear message', 'https://www.linkedin.com/jobs/view/4012345678/', r => !r.ok && r.reason === 'login_required'],
  ['Script-only page → clear message', 'https://careers.spa-only.com/job/12345', r => !r.ok && r.reason === 'needs_javascript'],
  ['Bot-protected page → clear message', 'https://jobs.bot-protected.com/role/88', r => !r.ok && r.reason === 'blocked'],
  ['PDF JD link → handed to the browser PDF reader', 'https://www.acme.com/files/JD-Finance-Manager.pdf', r => r.ok && r.kind === 'pdf' && r.base64.length > 10],
  ['SECURITY: cloud metadata address blocked', 'http://169.254.169.254/computeMetadata/v1/', r => !r.ok && r.reason === 'invalid_url'],
  ['SECURITY: localhost blocked', 'http://localhost:3000/api/send-access-email', r => !r.ok && r.reason === 'invalid_url'],
  ['SECURITY: private IP blocked', 'http://10.1.2.3/', r => !r.ok && r.reason === 'invalid_url'],
  ['SECURITY: hostname resolving to a private IP blocked', 'https://evil-internal.example/job', r => !r.ok && r.reason === 'invalid_url'],
  ['SECURITY: redirect to an internal address blocked', 'https://short.link/abc', r => !r.ok && r.reason === 'invalid_url'],
  ['SECURITY: non-web schemes blocked', 'file:///etc/passwd', r => !r.ok && r.reason === 'invalid_url']
];
(async () => {
  let pass = 0; const results = {};
  for (const [name, url, check] of CASES) {
    const r = await X.extractJob(url, deps); results[name] = r;
    const ok = !!check(r); if (ok) pass++;
    console.log((ok ? '✔ PASS  ' : '✘ FAIL  ') + name + '  →  ' + (r.ok ? (r.kind ? r.kind.toUpperCase() + ' file' : r.source + ', ' + r.words + ' words, ' + r.quality + (r.title ? ', "' + r.title.slice(0, 60) + '"' : '')) : r.reason + ': ' + r.message));
  }
  console.log(pass + ' / ' + CASES.length + ' JD-reader checks passed');
  module.exports.results = results;
  if (process.argv.includes('--show')) { const d = results[CASES[0][0]]; console.log('\n--- Extracted Deloitte JD ---\n' + d.text); }
  if (pass !== CASES.length) process.exitCode = 1;
})();
