/* My Career Company · Resume Fit Score v3 · Curated content & configuration.
 * Hand-maintained. Matching syntax for phrase variants (used by the engine's term matcher):
 *   *  = word-stem wildcard   ("negotiat*" matches negotiate/negotiated/negotiation)
 *   ~  = up to 3 words in between ("achieved~target" matches "achieved 112% of target")
 *   British and American spellings are both handled automatically (analyse/analyze, modelling/modeling,
 *   programme/program, behaviour/behavior, optimise/optimize), so list each phrase once.
 * Prices and dates are "verify before display" values from research done in October 2026.
 */
(function (root) {
  var C = {};

  /* ---------------------------------------------------------------- 1. Domains */
  C.DOMAINS = {
    CON:{n:'Consulting',f:'consulting',t:'function',adj:['GM','BA','ENT','ITS']},
    FIN:{n:'Finance',f:'finance',t:'function',adj:['IB','RE','INF','CON']},
    IB:{n:'Investment Banking',f:'finance',t:'function',adj:['FIN','CON']},
    SAL:{n:'Sales',f:'sales',t:'function',adj:['MKT','CSM','ECM','TEL','AGB','EDT']},
    MKT:{n:'Marketing',f:'marketing',t:'function',adj:['SAL','ECM','PRC','MED','RTL']},
    PM:{n:'Product Management',f:'product',t:'function',adj:['BA','ITS','ECM','EDT']},
    HR:{n:'Human Resources',f:'hr',t:'function',adj:['GM']},
    GM:{n:'General Management',f:'general',t:'function',adj:['CON','OPS','ENT','HR']},
    OPS:{n:'Operations',f:'operations',t:'function',adj:['SCM','RTL','HCM','GM','ECM']},
    SCM:{n:'Supply Chain',f:'operations',t:'function',adj:['OPS','AGB','RTL','ECM']},
    PRC:{n:'PR & Communications',f:'marketing',t:'function',adj:['MKT','MED']},
    LEG:{n:'Legal',f:'specialist',t:'function',adj:['PPD']},
    BA:{n:'Business Analytics',f:'analytics',t:'function',adj:['PM','CON','ITS']},
    ITS:{n:'IT & Systems',f:'analytics',t:'function',adj:['BA','PM','CON']},
    CSM:{n:'Customer Success',f:'sales',t:'function',adj:['SAL','PM']},
    ENT:{n:'Entrepreneurship',f:'general',t:'function',adj:['GM','CON','PM']},
    HCM:{n:'Healthcare Management',f:'operations',t:'industry',adj:['OPS']},
    AGB:{n:'Agribusiness',f:'sales',t:'industry',adj:['SCM','SAL']},
    RTL:{n:'Retail Management',f:'operations',t:'industry',adj:['OPS','MKT','ECM']},
    RE:{n:'Real Estate',f:'specialist',t:'industry',adj:['FIN','INF']},
    PPD:{n:'Public Policy & Development',f:'general',t:'industry',adj:['ESG','LEG','CON']},
    ESG:{n:'ESG & Sustainability',f:'specialist',t:'industry',adj:['PPD','ENR','CON']},
    ECM:{n:'E-commerce',f:'sales',t:'industry',adj:['MKT','OPS','PM','SCM']},
    MED:{n:'Media & Entertainment',f:'marketing',t:'industry',adj:['MKT','PRC','SAL']},
    ENR:{n:'Energy',f:'specialist',t:'industry',adj:['INF','ESG','FIN']},
    INF:{n:'Infrastructure',f:'operations',t:'industry',adj:['ENR','RE','FIN']},
    TEL:{n:'Telecom',f:'sales',t:'industry',adj:['SAL','ITS']},
    EDT:{n:'EdTech',f:'sales',t:'industry',adj:['PM','SAL']}
  };
  C.LEVELS = { CAMPUS:{n:'Campus',band:'0–2 yrs',min:0,max:24}, EARLY:{n:'Early',band:'2–5 yrs',min:24,max:60},
               MID:{n:'Mid',band:'5–10 yrs',min:60,max:120}, SENIOR:{n:'Senior',band:'10+ yrs',min:120,max:600} };

  /* ---------------------------------------------------------------- 2. Fit Score weights
   * Base weights by the TARGET JD's level (sum = 100), then multiplied by the JD's role family and renormalised.
   * JD-dependent share (V1+V2+V3): Campus 38 · Early 44 · Mid 46 · Senior 46 (was 15 in the 8-dimension engine). */
  C.VECTORS = [
    {id:'V1',key:'skill',   label:'JD Skill & Must-Have Match',       jd:true},
    {id:'V2',key:'role',    label:'Role & Domain Alignment',          jd:true},
    {id:'V3',key:'exp',     label:'Experience & Level Fit',           jd:true},
    {id:'V4',key:'impact',  label:'Quantified Impact',                jd:false},
    {id:'V5',key:'bullets', label:'Bullet Strength (Action / Result-First)', jd:false},
    {id:'V6',key:'lead',    label:'Leadership, PoR & Achievements',   jd:false},
    {id:'V7',key:'edu',     label:'Education & Credentials',          jd:true},
    {id:'V8',key:'struct',  label:'Structure, Sections & Contact',    jd:false},
    {id:'V9',key:'length',  label:'Length & Bullet Discipline',       jd:false},
    {id:'V10',key:'ats',    label:'ATS Parse Health',                 jd:false}
  ];
  C.LEVEL_WEIGHTS = {
    CAMPUS:{skill:22,role:5, exp:11,impact:14,bullets:10,lead:12,edu:9,struct:7,length:5,ats:5},
    EARLY: {skill:24,role:10,exp:10,impact:15,bullets:9, lead:10,edu:7,struct:6,length:5,ats:4},
    MID:   {skill:22,role:12,exp:12,impact:15,bullets:8, lead:11,edu:5,struct:6,length:5,ats:4},
    SENIOR:{skill:20,role:14,exp:12,impact:15,bullets:7, lead:13,edu:4,struct:6,length:5,ats:4}
  };
  C.FAMILY_MULT = {
    consulting:{lead:1.25,edu:1.15,impact:1.1},
    finance:   {edu:1.3,skill:1.1,impact:0.9},          // credentials matter; deal/model scope counts as impact
    sales:     {impact:1.3,exp:1.1,edu:0.8},
    marketing: {lead:1.15,exp:1.1,edu:0.85},
    product:   {skill:1.15,role:1.1,edu:0.85},
    hr:        {lead:1.15,edu:1.1},
    operations:{impact:1.15,edu:1.1},
    analytics: {skill:1.25,edu:1.1,bullets:0.9},
    general:   {lead:1.25,role:0.9},
    specialist:{edu:1.25,skill:1.1}
  };
  C.BANDS = [{min:75,name:'STRONG',sym:'★'},{min:55,name:'MODERATE',sym:'◆'},{min:0,name:'NEEDS WORK',sym:'▲'}];

  /* Terms that appear in every domain at Mid/Senior level. Scored under Leadership (V6), never as JD skills. */
  C.LEVEL_GENERIC_TERMS = ['leadership','team leadership','strategic planning','budget management','performance reporting',
    'strategy setting','p&l ownership','mentoring','board reporting'];

  /* ---------------------------------------------------------------- 3. Bullet-strength lexicons */
  C.STRONG_VERBS = ('accelerated achieved acquired activated added advised aligned amplified analyzed architected assessed audited automated benchmarked boosted '+
   'brokered budgeted built captured championed closed coached co-founded co-led collaborated commercialized conceived conceptualized consolidated '+
   'converted convinced crafted created cultivated curated cut decreased defined delivered deployed designed developed devised diagnosed digitized directed '+
   'doubled drafted drove earned eliminated enabled engineered enhanced established evaluated exceeded executed expanded expedited facilitated forecast forecasted '+
   'formulated forged founded generated grew guided halved headed hired identified implemented improved increased influenced initiated innovated instituted '+
   'integrated introduced investigated launched led leveraged lifted localized lowered managed mapped maximized mentored merged migrated minimized mobilized '+
   'modeled modernized monetized negotiated onboarded optimized orchestrated organized originated outperformed overhauled owned partnered persuaded piloted '+
   'pioneered pitched planned positioned presented prioritized produced profiled programmed projected promoted prototyped quantified raised ranked rationalized '+
   're-engineered rebuilt recommended reconciled recovered recruited redesigned reduced re-designed refined reinvented relaunched renegotiated reorganized '+
   'repositioned researched resolved restructured retained revamped revitalized revived saved scaled scoped secured segmented shaped shipped simplified '+
   'sized slashed solved sourced spearheaded sped standardized steered strategized streamlined strengthened structured surpassed synthesized systematized '+
   'tested tracked trained transformed tripled turned underwrote unified unlocked upsold upskilled validated valued won wrote').split(' ');
  // Verbs that show activity but not ownership: score as neutral unless the bullet carries a metric.
  C.NEUTRAL_VERBS = ('handled prepared conducted coordinated maintained supported monitored ensured compiled liaised tracked organised arranged attended '+
   'collected gathered processed updated reviewed studied explored interacted communicated documented performed served operated undertook did made worked').split(' ');
  // Weak openers: penalised ONLY when they open a bullet (first 4 words), never mid-sentence or in headings.
  C.WEAK_OPENERS = ['responsible for','duties included','duties include','tasked with','worked on','worked as','worked with','involved in','was involved',
    'part of','was part of','participated in','helped','helped with','helped in','assisted','assisted with','assisted in','exposure to','got exposure',
    'learnt','learned','got the opportunity','was given','was responsible','looked after','in charge of','dealt with','engaged in','handled various'];
  C.FILLER = ['hardworking','hard-working','team player','results-driven','result-oriented','passionate','dynamic','go-getter','self-motivated','detail-oriented','various','etc'];
  // Result-first / noun-phrase achievement openers (IIM-style bullets are valid, not weak).
  C.RESULT_FIRST_OPENERS = ['winner','won','runner-up','runners-up','finalist','semi-finalist','semifinalist','national finalist','top','rank','ranked','awarded',
    'recipient','selected','secured','gold medal','silver medal','bronze medal','topper','scholar','scholarship','dean','air','all india rank','certified',
    'among top','1st','2nd','3rd','first','second','third','best','one of','only','received','featured','published','pre-placement offer','pre-placement interview','ppo','ppi','promoted','fast-tracked'];
  C.FIRST_PERSON = /\b(i|me|my|myself)\b/i;

  /* ---------------------------------------------------------------- 4. Skill synonyms (JD Library must-haves + key ATS terms) */
  C.SYN = {
    'account management':['account management','key account*','managed~accounts','client portfolio','account plan*'],
    'accounting':['accounting','bookkeeping','ledger*','journal entr*','reconciliation*','ind as','ifrs','gaap','tally'],
    'advertising sales':['ad sales','advertising sales','media sales','ad inventory','ad revenue'],
    'agile':['agile','scrum','sprint*','kanban'],
    'agri value chain':['agri value chain','value chain~agri*','farm-to-fork','fpo','fpos','farmer*','mandi*','agri input*'],
    'audience analytics':['audience analytics','audience insight*','viewership','watch time','barc','audience data'],
    'brsr':['brsr','business responsibility and sustainability'],
    'business development':['business development','new business','lead generation','client acquisition','partnership*','b2b sales'],
    'campaign management':['campaign*','media plan*','brand activation*','activation*'],
    'category management':['category management','category manag*','assortment','range planning','category p&l','category growth'],
    'churn analytics':['churn analy*','churn','retention analy*','cohort*'],
    'churn management':['churn','retention','renewal*','win-back'],
    'consumer insights':['consumer insight*','consumer research','market research','consumer survey*','focus group*','fgd*','primary research','shopper insight*','consumer behavior','u&a'],
    'content economics':['content economics','content cost*','content roi','monetiz*'],
    'content strategy':['content strategy','content calendar','content plan*','editorial'],
    'contract drafting':['contract drafting','drafted~contract*','drafted~agreement*','nda*','mou*'],
    'contract management':['contract management','vendor contract*','contract administration','contracts~managed'],
    'corporate law':['corporate law','companies act','company law','sebi lodr','corporate governance'],
    'cost control':['cost control','cost reduction','cost saving*','budget control','cost optimiz*'],
    'crisis communication':['crisis communication*','crisis management','reputation management'],
    'crm':['crm','salesforce','hubspot','zoho crm','leadsquared','customer relationship management'],
    'customer discovery':['customer discovery','customer interview*','user interview*','problem validation'],
    'customer success metrics':['nps','csat','nrr','net revenue retention','health score*','churn rate','renewal rate'],
    'dashboarding':['dashboard*','power bi','tableau','looker','mis report*','reporting automation'],
    'data analysis':['data analy*','analyzed~data','analytics','pivot*','data-driven','excel model*'],
    'demand planning':['demand planning','demand forecast*','s&op','sales and operations planning','forecasting'],
    'digital marketing':['digital marketing','performance marketing','social media','seo','sem','google ads','meta ads','paid media','influencer*','email marketing','instagram'],
    'e-commerce analytics':['e-commerce analytics','gmv','conversion rate','marketplace analytics','funnel*'],
    'employee relations':['employee relations','industrial relations','grievance*','disciplinary'],
    'energy regulation':['energy regulation','cerc','serc','tariff*','electricity act','regulatory filing*'],
    'enterprise selling':['enterprise sales','enterprise selling','b2b sales','solution selling','large account*'],
    'erp':['erp','sap','oracle erp','microsoft dynamics','netsuite'],
    'esg data analysis':['esg data','esg analy*','sustainability data','esg reporting','esg rating*'],
    'esg frameworks':['gri','sasb','tcfd','issb','brsr','cdp','esg framework*'],
    'excel':['excel','spreadsheet*','vlookup','xlookup','pivot table*','vba','macros'],
    'executive communication':['executive communication','presented to~(cxo|cxos|leadership|senior management|board|directors?|ceo|cfo|md)','cxo','board deck*','leadership review*'],
    'feasibility analysis':['feasibility','viability analy*'],
    'field operations':['field operations','field sales','field force','on-ground','ground operations'],
    'financial acumen':['financial acumen','p&l','profit and loss','unit economics','ebitda','budget*','margin*'],
    'financial modelling':['financial model*','dcf','discounted cash flow','three-statement','3-statement','lbo','valuation model*','revenue model*','business case model*'],
    'financial statement analysis':['financial statement*','ratio analy*','balance sheet*','cash flow analy*','annual report*','financial analy*'],
    'fundraising':['fundrais*','raised~funding','investor pitch*','seed round','series a','angel invest*'],
    'funnel analytics':['funnel*','conversion*','drop-off*'],
    'ghg accounting':['ghg','greenhouse gas','carbon footprint','scope 1','scope 2','scope 3','emission* inventory'],
    'go-to-market':['go-to-market','gtm','launch strateg*','market entry','product launch'],
    'healthcare analytics':['healthcare analytics','clinical data','hospital data','patient data'],
    'healthcare operations':['healthcare operations','hospital operations','opd','ipd','bed occupancy','patient flow','hospital administration'],
    'hr analytics':['hr analytics','people analytics','attrition analy*','workforce analytics','hr dashboard*'],
    'inside sales':['inside sales','tele-sales','telesales','inbound sales','outbound call*','lead conversion'],
    'inventory control':['inventory control','stock control','shrinkage','cycle count*','stock audit*'],
    'inventory management':['inventory management','inventory','stock management','safety stock','inventory turn*','days of inventory'],
    'kpi management':['kpi*','key performance indicator*','okr*','scorecard*'],
    'labour law':['labor law*','labor code*','labor court*','industrial relations','industrial disputes','standing orders','esic','factories act','shops and establishment*','statutory compliance','provident fund'],
    'legal research':['legal research','case law*','manupatra','scc online','precedent*'],
    'logistics':['logistics','transportation','last-mile','last mile','freight','warehousing','3pl','distribution network'],
    'marketing analytics':['marketing analytics','campaign analytics','marketing mix','mmm','attribution','roas','cac','ga4','google analytics'],
    'marketing strategy':['marketing strategy','marketing plan*','brand strateg*','brand plan*','positioning','segmentation','consumer segment*','stp','4ps','marketing mix','market-entry strateg*','gtm plan','go-to-market','price-pack architecture'],
    'media relations':['media relations','press release*','journalist*','media coverage','public relations'],
    'merchandise planning':['merchandise planning','merchandising','assortment planning','open-to-buy','otb'],
    'monitoring and evaluation':['monitoring and evaluation','m&e','impact evaluation','impact assessment','logframe','baseline survey*'],
    'negotiation':['negotiat*','renegotiat*','closed~deal*','contract terms'],
    'operations analytics':['operations analytics','operational metric*','process data','ops analytics'],
    'performance management':['performance management','appraisal*','kra*','pms','performance review*','goal setting','bell curve'],
    'pitch book':['pitch book*','pitchbook*','pitch deck*','information memorand*','teaser*','cim'],
    'policy analysis':['policy analy*','policy research','policy brief*','white paper*','regulatory analy*'],
    'powerpoint':['powerpoint','ppt','slide deck*','deck*','storyline*'],
    'prd':['prd','prds','product requirement*','requirements document','user stor*','brd'],
    'pricing':['pricing','price point*','price-pack','price optimiz*','revenue management'],
    'process improvement':['process improvement','process re-engineering','process reengineering','kaizen','lean','six sigma','streamlined~process*','sop*'],
    'process mapping':['process mapping','process map*','value stream map*','vsm','as-is','to-be','swimlane*'],
    'procurement':['procurement','sourcing','purchase order*','vendor selection','rfq*','rfp*'],
    'product analytics':['product analytics','mixpanel','amplitude','dau','mau','cohort*','a/b test*','ab test*','retention'],
    'programme management':['program management','pmo','project management','milestone*','cross-functional program*'],
    'project finance':['project finance','debt syndication','financial closure','dscr','term loan*'],
    'project management':['project management','project manag*','pmp','gantt','milestone*'],
    'python':['python','pandas','numpy','scikit-learn','sklearn','jupyter'],
    'quality standards':['quality standard*','nabh','nabl','jci','iso 9001','accreditation','quality audit*'],
    'real estate financial modelling':['real estate~model*','cash flow model*','irr','noi','cap rate','financial model*'],
    'regulatory compliance':['regulatory compliance','compliance','rbi','sebi','irdai','regulatory filing*','kyc','aml'],
    'report writing':['report writing','research report*','policy brief*','white paper*','wrote~report*'],
    'requirements gathering':['requirements gathering','requirement elicitation','brd','frd','user stor*','business requirement*'],
    'rera':['rera','real estate regulat*'],
    'retail analytics':['retail analytics','sell-through','like-for-like','lfl','sales per sq*','footfall','basket size','atv'],
    'retail operations':['retail operations','store operations','store management','visual merchandising','store p&l'],
    'revenue cycle management':['revenue cycle','rcm','medical billing','claims','tpa','denial*'],
    'roadmap prioritisation':['roadmap*','prioritiz*','rice','moscow','backlog'],
    'root cause analysis':['root cause*','rca','fishbone','5 whys','pareto','capa'],
    'rural sales':['rural sales','rural market*','rural distribution','haat*','villages'],
    'sales analytics':['sales analytics','sales data','sales mis','sell-out','secondary sales','primary sales','sales report*'],
    'sdlc':['sdlc','software development life cycle','waterfall','uat'],
    'sql':['sql','mysql','postgresql','bigquery','queries'],
    'statistics':['statistic*','regression','hypothesis test*','anova','probability','econometric*','spss'],
    'strategic analysis':['strategic analy*','market sizing','competitive analy*','competitor analy*','swot','porter*','business case'],
    'structured problem solving':['structured problem solving','problem solving','issue tree*','hypothesis','mece','case competition*','root cause*'],
    'supply chain analytics':['supply chain analytics','supply chain data','demand forecast*','inventory analy*','network optimiz*'],
    'talent acquisition':['talent acquisition','recruit*','hiring','hires','campus hiring','time-to-fill','time to fill','time-to-hire','time-to-offer','sourced~candidates','interviewed~candidates','onboarded~(hires|employees|candidates)'],
    'target achievement':['target achievement','achieved~target*','exceeded~target*','% of target','of target','quota*','sales target*'],
    'techno-commercial analysis':['techno-commercial','techno commercial','commercial evaluation','bid evaluation','tender evaluation'],
    'telecom distribution':['telecom distribution','retailer*','distributor*','recharge*','channel partner*'],
    'tendering':['tender*','bidding','rfp*','gem portal','boq'],
    'territory management':['territor*','beat plan*','route plan*','area sales'],
    'transaction management':['transaction management','deal closure','leasing transaction*','conveyancing'],
    'unit economics':['unit economics','cac','ltv','contribution margin','cm1','cm2','payback'],
    'user research':['user research','user interview*','usability test*','customer interview*','persona*','jobs to be done'],
    'valuation':['valuation*','dcf','comparable compan*','comps','precedent transaction*','ev/ebitda','multiples','intrinsic value'],
    'writing':['writing','copywriting','content writing','articles','editorial','blog*','newsletter*'],
    // frequent ATS keywords
    'market sizing':['market sizing','sized~market','tam','sam','market size'],
    'due diligence':['due diligence','dd'],
    'stakeholder management':['stakeholder management','stakeholder*','cross-functional','liaised with'],
    'a/b testing':['a/b test*','ab test*','split test*','experiment*'],
    'distribution':['distribution','distributor*','dealer*','channel partner*'],
    'key account management':['key account*','kam','account management'],
    'brand management':['brand management','brand manag*','brand plan*','brand p&l'],
    'performance marketing':['performance marketing','paid acquisition','roas','cpa','google ads','meta ads'],
    'variance analysis':['variance analy*','budget vs actual','bva'],
    'credit appraisal':['credit appraisal','credit assessment','credit memo*','cam','underwrit*','cma data'],
    'working capital':['working capital','receivables','payables','cash conversion cycle'],
    'fp&a':['fp&a','financial planning','budgeting','forecasting','variance analy*'],
    's&op':['s&op','sales and operations planning'],
    'six sigma':['six sigma','green belt','black belt','dmaic'],
    'lean':['lean','kaizen','5s','value stream'],
    'recruitment':['recruit*','hiring','talent acquisition'],
    'employee engagement':['employee engagement','engagement survey*','enps'],
    'learning and development':['learning and development','l&d','training program*','capability building'],
    'machine learning':['machine learning','ml model*','random forest','xgboost','classification model*','clustering'],
    'power bi':['power bi','powerbi'],
    'tableau':['tableau']
  };

  /* ---------------------------------------------------------------- 5. Titles */
  // Strong (non-ambiguous) title patterns per domain, used for JD title zone and resume role headers.
  C.TITLES = {
    CON:['management consultant','strategy consultant','consulting analyst','strategy analyst','engagement manager','business consultant','strategy associate'],
    FIN:['financial analyst','credit analyst','credit manager','fp&a','finance manager','finance executive','treasury','financial controller','controller','chartered accountant','risk analyst','credit risk','wealth manager','finance management trainee','management trainee – finance','management trainee - finance','audit associate','tax associate','article assistant','articleship'],
    IB:['investment banking','investment banker','ib analyst','m&a','equity research','ecm','dcm','private equity','venture capital','research analyst – equity','deal advisory'],
    SAL:['management trainee - sales','sales manager','area sales manager','asm','territory sales','territory manager','sales officer','sales executive','key account manager','kam','account executive','inside sales','sdr','bdr','regional sales manager','sales management trainee','sales trainee','business development manager','business development executive','zonal sales'],
    MKT:['brand manager','assistant brand manager','abm','marketing manager','marketing executive','product marketing','growth marketing','digital marketing','performance marketing','brand associate','marketing management trainee','marketing intern','brand intern','marketing associate'],
    PM:['product manager','associate product manager','apm','product owner','head of product','product management intern','product intern','group product manager'],
    HR:['human resources','hrbp','hr business partner','talent acquisition','recruiter','hr generalist','hr executive','hr manager','hr intern','l&d','compensation','people partner','hr management trainee'],
    GM:['chief of staff','general manager','leadership programme','leadership program','business head','strategy manager','founder\'s office','founders office','young leaders'],
    OPS:['operations manager','operations executive','operations associate','process excellence','continuous improvement','business operations','plant manager','production manager','operations intern','operations management trainee','process analyst'],
    SCM:['supply chain','procurement','sourcing','logistics','demand planner','planning analyst','s&op','purchase manager','warehouse manager','category buyer'],
    PRC:['corporate communications','public relations','pr manager','communications manager','media relations','pr executive'],
    LEG:['legal counsel','corporate counsel','legal associate','company secretary','legal manager','contracts manager'],
    BA:['data analyst','business intelligence','bi analyst','data scientist','analytics manager','analytics associate','decision scientist','analytics consultant'],
    ITS:['it consultant','systems analyst','sap consultant','erp consultant','solutions architect','functional consultant','software engineer','systems engineer','software developer','developer','technology analyst','it analyst'],
    CSM:['customer success','client success','onboarding specialist','customer experience manager'],
    ENT:['founder','co-founder','cofounder','entrepreneur','venture fellow','incubation'],
    HCM:['hospital','healthcare','clinical','medical representative','pharma'],
    AGB:['agri','agribusiness','agronomist','rural manager'],
    RTL:['store manager','retail manager','merchandiser','visual merchandiser','retail management trainee'],
    RE:['real estate','leasing manager','property manager','land acquisition'],
    PPD:['policy analyst','policy fellow','young professional','programme officer','program officer','csr','development sector','government advisory'],
    ESG:['esg','sustainability','climate','carbon'],
    ECM:['e-commerce','ecommerce','marketplace','d2c','quick commerce','seller success','category manager'],
    MED:['media','entertainment','ad sales','ott','content monetization'],
    ENR:['energy','renewable','solar','power trading','oil and gas'],
    INF:['infrastructure','epc','ppp','project analyst – infrastructure'],
    TEL:['telecom','5g','network commercial'],
    EDT:['edtech','academic','admissions counselor','learning experience']
  };
  // Function words inside otherwise generic titles. Order matters: more specific phrases first.
  C.TITLE_FUNCTION_WORDS = [
    ['product marketing','MKT'],['growth marketing','MKT'],['digital marketing','MKT'],['investment banking','IB'],['equity research','IB'],['m&a','IB'],
    ['customer success','CSM'],['supply chain','SCM'],['human resource*','HR'],['talent','HR'],['people','HR'],['hr','HR'],['business intelligence','BA'],
    ['data','BA'],['analytics','BA'],['product','PM'],['sales','SAL'],['business development','SAL'],['marketing','MKT'],['brand','MKT'],
    ['credit','FIN'],['finance','FIN'],['treasury','FIN'],['accounts','FIN'],['risk','FIN'],['wealth','FIN'],['procurement','SCM'],['sourcing','SCM'],
    ['logistics','SCM'],['operations','OPS'],['plant','OPS'],['strategy','CON'],['consulting','CON'],['legal','LEG'],['compliance','LEG'],
    ['communications','PRC'],['public relations','PRC'],['category','ECM'],['e-commerce','ECM'],['esg','ESG'],['sustainability','ESG'],
    ['policy','PPD'],['hospital','HCM'],['healthcare','HCM'],['agri*','AGB'],['retail','RTL'],['store','RTL'],['real estate','RE'],['leasing','RE'],
    ['energy','ENR'],['renewable','ENR'],['infrastructure','INF'],['telecom','TEL'],['media','MED'],['content','MED'],['edtech','EDT'],['admissions','EDT'],
    ['it','ITS'],['sap','ITS'],['erp','ITS'],['systems','ITS'],['founder','ENT'],['chief of staff','GM'],['general management','GM']];
  // Titles used across many domains; resolved through the company lookup and bullet content, never credited on their own.
  C.AMBIGUOUS_TITLES = ['analyst','senior analyst','associate','senior associate','consultant','senior consultant','associate consultant','management trainee',
    'manager','assistant manager','deputy manager','senior manager','executive','officer','business analyst','relationship manager','programme manager',
    'program manager','project manager','account manager','associate director','director','vice president','vp','product analyst','research associate',
    'research analyst','intern','summer intern','trainee','graduate trainee','team lead','lead'];

  /* ---------------------------------------------------------------- 6. Resume background signals */
  C.SPECIALISATION = [
    ['marketing',{MKT:1,SAL:0.4}],['sales',{SAL:1,MKT:0.4}],['finance',{FIN:1,IB:0.6}],['banking',{FIN:1}],['financial markets',{IB:0.8,FIN:0.8}],
    ['human resource',{HR:1}],['hrm',{HR:1}],['hr',{HR:1}],['personnel',{HR:1}],['operations',{OPS:1,SCM:0.6}],['supply chain',{SCM:1,OPS:0.5}],['logistics',{SCM:1}],
    ['analytics',{BA:1}],['business analytics',{BA:1}],['data science',{BA:1}],['information technology',{ITS:1}],['systems',{ITS:1}],['it',{ITS:0.8}],
    ['strategy',{CON:0.8,GM:0.6}],['general management',{GM:1}],['international business',{GM:0.5,SCM:0.4}],['entrepreneurship',{ENT:1}],['family business',{ENT:0.8,GM:0.5}],
    ['agribusiness',{AGB:1}],['agri',{AGB:1}],['rural',{AGB:0.8,PPD:0.4}],['healthcare',{HCM:1}],['hospital',{HCM:1}],['pharma',{HCM:0.8,SAL:0.3}],
    ['retail',{RTL:1}],['real estate',{RE:1}],['energy',{ENR:1}],['power',{ENR:0.6}],['infrastructure',{INF:1}],['telecom',{TEL:1}],['media',{MED:1}],
    ['communications',{PRC:1}],['advertising',{MKT:0.7,MED:0.5}],['public policy',{PPD:1}],['development',{PPD:0.5}],['sustainability',{ESG:1}],['esg',{ESG:1}],['product',{PM:0.8}],['e-commerce',{ECM:1}],['digital business',{ECM:0.6,MKT:0.4}]];
  C.UG_DEGREE = [
    [/\b(b ?tech|b ?e|bachelor of (engineering|technology))\b/,{ITS:0.6,PM:0.5,BA:0.5,OPS:0.5,CON:0.3,SCM:0.3}],
    [/\b(b ?com|bachelor of commerce|baf|bbi)\b/,{FIN:0.7,IB:0.4}],
    [/\b(chartered accountant|ca final|ca inter\w*|cma|icwa)\b/,{FIN:1,IB:0.6}],
    [/\b(bba|bms|bachelor of (business|management))\b/,{MKT:0.3,SAL:0.3,FIN:0.2,GM:0.2}],
    [/\b(mbbs|bds|b ?pharm\w*|nursing|bpt|physiotherapy)\b/,{HCM:1}],
    [/\b(b ?sc (agri\w*|horticulture)|agricultur\w*)\b/,{AGB:1}],
    [/\b(llb|ba llb|bba llb|bachelor of laws?)\b/,{LEG:1}],
    [/\b(economics|eco hons)\b/,{CON:0.3,PPD:0.4,FIN:0.3,BA:0.2}],
    [/\b(statistics|mathematics|maths)\b/,{BA:0.6}],
    [/\b(b ?arch|civil engineering)\b/,{RE:0.5,INF:0.6}],
    [/\b(electrical engineering)\b/,{ENR:0.4}],
    [/\b(mass comm\w*|journalism|bmm|media studies)\b/,{PRC:0.8,MED:0.6}],
    [/\b(computer science|information technology|bca|mca)\b/,{ITS:0.7,PM:0.5,BA:0.5}]];
  C.CERT_SIGNALS = [ // resume certification → domains it signals (and id for de-duplication against suggestions)
    [/\bcfa\b/,{FIN:1,IB:1},'CFA1'],[/\bfrm\b/,{FIN:1},'FRM1'],[/\bnism\b/,{FIN:0.8,IB:0.6},'NISM'],[/\bnism[\s-]*(series[\s-]*)?(viii|8)\b/,{FIN:0.8},'NISM8'],
    [/\bnism[\s-]*(series[\s-]*)?(xv|15)\b/,{IB:0.8,FIN:0.6},'NISM15'],[/\bnism[\s-]*(series[\s-]*)?(v-?a|5a)\b/,{FIN:0.8},'NISM5A'],[/\bnism[\s-]*(series[\s-]*)?x-?a\b/,{FIN:0.8},'NISM10A'],
    [/\b(financial modeling|financial modelling) (certificat\w*|course)\b/,{FIN:0.6,IB:0.6},'FMOD'],[/\bsix sigma|green belt|black belt\b/,{OPS:1,SCM:0.4},'LSSGB'],
    [/\b(cscp|cpim|apics|ascm)\b/,{SCM:1},'CSCP'],[/\bshrm\b/,{HR:1},'SHRMCP'],[/\b(pmp|capm|prince2)\b/,{OPS:0.5,ITS:0.6,INF:0.5},'PMP'],
    [/\b(google ads|google analytics|ga4|meta blueprint|hubspot|digital marketing (certificat\w*|course))\b/,{MKT:1},'GADS'],
    [/\b(pl-?300|power bi (data analyst|certificat\w*))\b/,{BA:1},'PL300'],[/\btableau (desktop|certified|specialist)\b/,{BA:1},'TABLEAU'],
    [/\bgoogle data analytics\b/,{BA:0.8},'GDA'],[/\b(sql|python) (certificat\w*|course)\b/,{BA:0.6},'SQLC'],[/\b(cspo|pspo|psm|scrum master|product owner|product management certificat\w*)\b/,{PM:1},'CSPO'],
    [/\b(ecba|ccba|cbap|iiba)\b/,{BA:0.6,ITS:0.6,PM:0.4},'ECBA'],[/\bsalesforce (admin\w*|certified)\b/,{SAL:0.5,CSM:0.6,ITS:0.5},'SFDC'],[/\bsap (fico|mm|sd|certified|s\/4hana)\b/,{ITS:0.8,SCM:0.4,FIN:0.3},'SAP'],
    [/\b(gri certified|esg (certificat\w*|analyst)|cesga|sasb fsa)\b/,{ESG:1},'ESGC'],[/\birdai|ic-?38\b/,{FIN:0.5,SAL:0.4},'IC38']];
  C.CLUB_SIGNALS = [
    [/\bfinance club|finance and investment club|investment club|fin club\b/,{FIN:1,IB:0.6}],[/\bmarketing club|marketing cell|brand club\b/,{MKT:1}],
    [/\bconsulting club|consult club|strategy club\b/,{CON:1}],[/\bproduct club|product management club\b/,{PM:1}],[/\bhr club|people club|hr cell\b/,{HR:1}],
    [/\boperations club|ops club|supply chain club\b/,{OPS:1,SCM:0.6}],[/\banalytics club|data club|ai club\b/,{BA:1}],[/\be-?cell|entrepreneurship cell|incubat\w*\b/,{ENT:1}],
    [/\b(hul )?l\.?i\.?m\.?e\.?\b|\blime season\b/,{MKT:1,SAL:0.4}],[/\bbrandstorm\b/,{MKT:1}],[/\binterrobang\b/,{MKT:0.7,HR:0.4,SCM:0.4}],[/\bover the wall\b/,{MKT:0.8}],
    [/\baccenture (b-?school|strategy) challenge|\bstratos\b|\bwar room\b|\bcase (competition|challenge)\b/,{CON:0.8,GM:0.4}],[/\btata imagination challenge\b/,{GM:0.7,ENT:0.5}],
    [/\bwired\b|\bflipkart (wired|grid)\b/,{ECM:0.8,SCM:0.5}],[/\bamex campus challenge|american express campus\b/,{FIN:0.6,BA:0.6}],[/\bplacement committee|placecom|placement cell\b/,{HR:0.4,GM:0.3}],
    [/\bpolicy (club|cell)|public policy\b/,{PPD:0.8}],[/\bsustainability club|net zero club|green club\b/,{ESG:0.8}]];

  /* ---------------------------------------------------------------- 7. Domain-calibrated language (used by fixes and rewrites) */
  C.METRIC_MENU = {
    CON:'₹ savings identified, market size (₹ Cr), recommendations adopted, decision supported, client scope (revenue/plants/SKUs)',
    FIN:'portfolio or loan book (₹ Cr), TAT cut (days), variance closed (%), forecast accuracy (%), NPAs flagged, close cycle (days)',
    IB:'deal size (₹/$ Mn), models built (DCF/LBO/comps), targets screened, pitch outcomes, coverage universe',
    SAL:'% of target, ₹ revenue / secondary sales, outlets or distributors added, rank among peers, numeric distribution',
    MKT:'sales or share uplift, reach / CTR / ROAS, CAC change, trial or penetration, consumer sample size, campaign budget (₹)',
    PM:'users (DAU/MAU), adoption or activation %, retention / D30, conversion lift (pp), features shipped, NPS',
    HR:'hires closed, time-to-fill (days), attrition change, engagement / eNPS, employees covered, cost per hire',
    GM:'P&L or budget (₹ Cr), margin change (bps), initiatives delivered, cross-functional teams aligned, cost saved',
    OPS:'TAT / cycle time cut, OTIF %, cost saved (₹), defects or rework %, throughput, SLA adherence',
    SCM:'inventory days, fill rate %, forecast accuracy %, freight cost (₹), procurement savings %, OTIF %',
    PRC:'coverage pieces, share of voice, reach, sentiment shift, crisis response time',
    LEG:'contracts drafted/reviewed, turnaround time, compliance gaps closed, disputes resolved, risk exposure (₹)',
    BA:'hours saved per week, model accuracy, ₹ impact of decision, dashboard users, data latency cut',
    ITS:'go-live delivered, users onboarded, defects reduced, uptime %, process time cut, modules implemented',
    CSM:'churn reduced, NRR %, renewals (₹), CSAT/NPS, onboarding time, accounts managed',
    ENT:'revenue/users reached, funding raised (₹), unit economics (CAC/LTV), pilots signed, team built',
    HCM:'bed occupancy %, patient TAT, claim denial rate, NABH gaps closed, revenue per bed',
    AGB:'farmers/FPOs reached, procurement volume (MT), yield or price realisation, rural outlets, input sales',
    RTL:'like-for-like sales, sell-through %, shrinkage %, footfall conversion, store P&L, ATV',
    RE:'leasing (sq ft), IRR / NOI, project cost (₹ Cr), approvals secured, collections',
    PPD:'beneficiaries reached, programme budget (₹), policy recommendations adopted, districts covered',
    ESG:'emissions mapped (tCO2e), disclosures completed (BRSR/GRI), suppliers assessed, rating change',
    ECM:'GMV, conversion %, contribution margin, sellers onboarded, AOV, fulfilment TAT',
    MED:'ad revenue (₹), audience/watch time, CPM, content ROI, subscribers',
    ENR:'MW evaluated or commissioned, tariff impact, project IRR, PPA value, cost per unit',
    INF:'project value (₹ Cr), schedule variance, cost overrun avoided, tenders won, milestones met',
    TEL:'subscribers/ARPU, churn, retailer network, enterprise deals (₹), market share',
    EDT:'enrolments, funnel conversion %, completion rate, revenue (₹), learner NPS'
  };
  C.DOMAIN_VERBS = {
    consulting:['Diagnosed','Structured','Sized','Benchmarked','Synthesised','Recommended'],
    finance:['Valued','Modelled','Underwrote','Appraised','Forecast','Reconciled'],
    sales:['Closed','Grew','Expanded','Converted','Negotiated','Onboarded'],
    marketing:['Launched','Repositioned','Activated','Drove','Grew','Optimised'],
    product:['Shipped','Prioritised','Defined','Tested','Instrumented','Launched'],
    hr:['Hired','Designed','Rolled out','Reduced','Upskilled','Retained'],
    operations:['Reduced','Streamlined','Standardised','Automated','Optimised','Implemented'],
    analytics:['Built','Automated','Modelled','Segmented','Predicted','Visualised'],
    general:['Led','Steered','Delivered','Aligned','Mobilised','Launched'],
    specialist:['Drafted','Assessed','Evaluated','Secured','Mapped','Delivered']
  };
  // Objects detected inside a bullet → outcome placeholder clause (no invented numbers; [ ] = user fills in).
  C.OBJECT_TYPES = [
    ['diligence',/\b(due diligence|diligence|red flags?|dd)\b/],
    ['integration',/\b(integration|day 1|day one|day 100|synerg\w*|separation|carve-?outs?|tsas?|pmo|imo|cut-?over|workstreams?)\b/],
    ['research',/\b(research|survey|interviews?|insights?|focus group|fgd|study|questionnaire|respondents|preference|perception)\b/],
    ['campaign',/\b(campaign|social media|content|instagram|influencer|ads?|activation|promotion|launch event)\b/],
    ['model',/\b(model|valuation|dcf|forecast|projection|financial analysis|ratio)\b/],
    ['sales',/\b(sales|clients?|accounts?|distributors?|dealers?|retailers?|leads?|customers?|outlets?|territory|revenue)\b/],
    ['process',/\b(process|processing|operations?|inventory|logistics|procurement|warehouse|vendor|supply|sop|workflow|turnaround|documents?|documentation|kyc|disbursal|tat)\b/],
    ['hiring',/\b(recruit\w*|hiring|hires|sourcing|campus hiring|time-to-(fill|offer|hire)|interviews? (of|with) candidates|candidates?|offers?)\b/],
    ['people',/\b(training|onboarding|engagement|employees?|appraisal|performance management|kras?|learning|grievances?|industrial relations|attrition|retention|team of|member team|asms|sales officers)\b/],
    ['delivery',/\b(sprints?|user stor\w+|backlog|releases?|scrum|uat|go-live|deployment)\b/],
    ['product',/\b(product|feature|app|platform|user|ux|prd|roadmap|release|module)\b/],
    ['data',/\b(dashboard|data|sql|python|automation|automated|report|mis|analytics|tableau|power bi|excel)\b/],
    ['event',/\b(event|fest|conclave|summit|committee|club|council|team of|members?|volunteers?)\b/],
    ['strategy',/\b(strategy|market entry|market sizing|go-to-market|gtm|business plan|recommendations?|competitor|benchmark)\b/]
  ];
  /* Outcome templates per role family × object type.  a = action-first clause (bullet has no numbers),
   * v = value clause (bullet already has a count/scale, so never repeat "[N]"), r = result-first lead. Brackets are user inputs. */
  C.OUTCOME = {
    _default:{_any:{a:', delivering [outcome: X% / ₹X L / N units] for [team / client]',v:', delivering [outcome: X% / ₹X L] for [team / client]',r:'[Outcome: X% / ₹X L] for [team / client]'}},
    consulting:{diligence:{a:', flagging [N] [IT / commercial] red flags that shaped the [price / SPA / integration plan]',v:', flagging [N] red flags that shaped the [price / SPA / integration plan]',r:'[N] red flags that shaped the [price / SPA] flagged'},
      integration:{a:', adopted for Day 1 across [N] workstreams with [X]% of milestones delivered on time',v:', with [X]% of milestones delivered on time for Day 1',r:'[X]% on-time Day 1 milestones'},
      research:{a:', synthesising [N] interviews into [N] recommendations adopted by [client]',v:', with [N] recommendations adopted by [client / partner]',r:'[N] recommendations adopted by [client]'},
      model:{a:', sizing a ₹[X] Cr opportunity used in the [client] decision',v:', sizing a ₹[X] Cr opportunity for the [client] decision',r:'₹[X] Cr opportunity sized for [client decision]'},
      strategy:{a:', with [N] of [N] recommendations accepted by [client CXO]',v:', with [N] recommendations accepted by [client CXO]',r:'[N] of [N] recommendations accepted by [client CXO]'},
      process:{a:', identifying ₹[X] L annualised savings across [N] [sites / categories]',v:', identifying ₹[X] L annualised savings',r:'₹[X] L annualised savings identified'},
      _any:{a:', informing a [client / leadership] decision worth ₹[X] Cr',v:', informing a [client] decision worth ₹[X] Cr',r:'₹[X] Cr [client] decision informed'}},
    finance:{research:{a:', surveying [N] investors to recommend [product / channel] changes',v:', with [recommendation] adopted by [team / faculty]',r:'[Recommendation] adopted from a [N]-respondent study'},
      model:{a:', supporting a ₹[X] Cr [credit / investment / pricing] decision',v:', supporting a ₹[X] Cr [credit / investment] decision',r:'₹[X] Cr [credit / investment] decision supported'},
      sales:{a:', across a ₹[X] Cr [loan book / portfolio] of [N] clients',v:', across a ₹[X] Cr [loan book / portfolio]',r:'₹[X] Cr [portfolio] covered'},
      portfolio:{a:', with ₹[X] Cr exposure and [zero / X%] slippage',v:', with ₹[X] Cr exposure and [zero / X%] slippage',r:'₹[X] Cr exposure with [zero / X%] slippage'},
      process:{a:', cutting [TAT / processing time] from [X] to [Y] days for [N] files',v:', cutting [TAT] from [X] to [Y] days',r:'[TAT] cut from [X] to [Y] days'},
      data:{a:', saving [X] analyst-hours per [week] in [MIS / reporting]',v:', saving [X] analyst-hours per [week]',r:'[X] analyst-hours saved per [week]'},
      _any:{a:', covering ₹[X] Cr of [exposure / spend] with [outcome]',v:', covering ₹[X] Cr of [exposure]',r:'₹[X] Cr of [exposure] reviewed'}},
    sales:{sales:{a:', delivering [X]% of a ₹[Y] Cr target (rank [n] of [N])',v:', delivering [X]% of a ₹[Y] Cr target (rank [n] of [N])',r:'[X]% of a ₹[Y] Cr target; rank [n] of [N]'},
      people:{a:', with team target attainment of [X]% and [N] promotions',v:', taking team attainment to [X]% of a ₹[Y] Cr target',r:'[X]% team attainment of a ₹[Y] Cr target'},
      campaign:{a:', converting [N] leads into ₹[X] L of orders',v:', converting them into ₹[X] L of orders',r:'₹[X] L of orders from [N] leads'},
      process:{a:', adding [N] outlets / distributors in [T] months',v:', lifting [secondary sales / numeric distribution] by [X]%',r:'[X]% lift in [secondary sales]'},
      _any:{a:', growing [territory / account] revenue by [X]% YoY',v:', growing revenue by [X]% YoY',r:'[X]% YoY revenue growth'}},
    marketing:{research:{a:', insights from [N] consumers shaped the [pack / price / channel] decision for [brand]',v:', with insights adopted in the [brand] [pack / price / channel] plan',r:'Insights adopted in the [brand] [pack / price] plan'},
      campaign:{a:', reaching [N] L users at [X]% CTR / [X]x ROAS on ₹[X] L spend',v:', at [X]x ROAS / [X]% CTR',r:'[X]x ROAS / [X]% CTR'},
      sales:{a:', lifting [offtake / trial] by [X]% across [N] outlets',v:', lifting [offtake / trial] by [X]%',r:'[X]% [offtake / trial] lift'},
      strategy:{a:', with the [GTM / positioning] plan adopted for [launch / region]',v:', with the plan adopted for [launch / region]',r:'[GTM] plan adopted for [launch]'},
      _any:{a:', driving [X]% [share / sales / engagement] uplift for [brand]',v:', driving [X]% [share / sales] uplift',r:'[X]% [share / sales] uplift for [brand]'}},
    product:{product:{a:', lifting [activation / retention] by [X] pp for [N] users',v:', lifting [activation / retention] by [X] pp',r:'[X] pp [activation / retention] lift'},
      delivery:{a:', shipping [N] releases on schedule across [N] sprints',v:', shipping [N] releases on schedule',r:'[N] on-time releases'},
      research:{a:', turning [N] user interviews into [N] prioritised features',v:', turning them into [N] prioritised features',r:'[N] features prioritised'},
      data:{a:', instrumenting [N] funnel events that cut drop-off by [X]%',v:', cutting funnel drop-off by [X]%',r:'[X]% lower funnel drop-off'},
      _any:{a:', shipped to [N] users with [X]% adoption in [T] weeks',v:', reaching [X]% adoption in [T] weeks',r:'[X]% adoption in [T] weeks'}},
    hr:{hiring:{a:', closing [N] hires in [X] days (vs [Y] earlier)',v:', cutting time-to-fill from [X] to [Y] days',r:'Time-to-fill cut from [X] to [Y] days'},
      people:{a:', reaching [N] employees with [X]% completion / adoption',v:', cutting [time-to-productivity / early attrition] by [X]%',r:'[X]% lower [early attrition]'},
      data:{a:', with [N] of [N] recommendations adopted by [HR leadership]',v:', with [N] recommendations adopted by [HR leadership]',r:'[N] recommendations adopted by [HR leadership]'},
      research:{a:', with [N] of [N] recommendations adopted by [HR leadership]',v:', with [N] recommendations adopted by [HR leadership]',r:'[N] recommendations adopted by [HR leadership]'},
      event:{a:', drawing [N] attendees and ₹[X] L in sponsorship',v:', raising ₹[X] L in sponsorship / [X]% higher turnout YoY',r:'₹[X] L sponsorship / [X]% higher turnout'},
      _any:{a:', reducing [attrition / time-to-fill] by [X]% for [N] employees',v:', reducing [attrition / time-to-fill] by [X]%',r:'[X]% lower [attrition / time-to-fill]'}},
    operations:{process:{a:', cutting [TAT / cycle time] from [X] to [Y] [hrs / days] and saving ₹[X] L/yr',v:', saving ₹[X] L/yr',r:'₹[X] L/yr saved'},
      data:{a:', giving [N] managers daily [OTIF / inventory] visibility and cutting [stock-outs] by [X]%',v:', cutting [stock-outs / delays] by [X]%',r:'[X]% fewer [stock-outs]'},
      _any:{a:', improving [OTIF / fill rate / SLA] from [X]% to [Y]%',v:', improving [OTIF / SLA] from [X]% to [Y]%',r:'[OTIF] up from [X]% to [Y]%'}},
    analytics:{data:{a:', saving [X] hours per week for [N] stakeholders',v:', saving [X] hours per week',r:'[X] hours/week saved'},
      model:{a:', at [X]% accuracy, informing a ₹[X] L [retention / pricing] decision',v:', informing a ₹[X] L [retention / pricing] decision',r:'₹[X] L decision informed'},
      _any:{a:', informing a [decision] worth ₹[X] L for [team]',v:', informing a [decision] worth ₹[X] L',r:'₹[X] L [decision] informed'}},
    general:{event:{a:', leading a [N]-member team to [N] attendees and ₹[X] L sponsorship',v:', raising ₹[X] L in sponsorship / [X]% higher turnout YoY',r:'₹[X] L sponsorship / [X]% higher turnout'},
      strategy:{a:', aligning [N] functions behind an initiative worth ₹[X] Cr',v:', aligning [N] functions behind it',r:'[N] functions aligned'},
      _any:{a:', delivering [initiative] across [N] [functions / sites] [X]% under budget',v:', delivering it [X]% under budget / [T] weeks early',r:'Delivered [X]% under budget'}},
    specialist:{_any:{a:', covering [N] [contracts / sites / disclosures] with [outcome]',v:', with [outcome: risk avoided / approvals secured]',r:'[Outcome] secured'}}
  };
  C.OWNERSHIP = { product:'the feature or module you owned, engineers / squads you worked with, launch decisions you made', sales:'territory, accounts, ₹ target and team',
    finance:'₹ portfolio, clients or models you owned', consulting:'your workstream, client stakeholders and juniors you guided', hr:'employee population covered, hiring targets, programmes you owned',
    operations:'sites or lines, ₹ cost base and team you ran', analytics:'dashboards or models you owned and the stakeholders who used them', marketing:'brand or campaign budget (₹), agencies and channels you ran',
    general:'initiatives, budget and teams you aligned', specialist:'contracts, projects or disclosures you owned and their stakeholders' };
  C.LEVEL_SCOPE = { // optional scope phrase offered in rewrites (needs user confirmation)
    CAMPUS:'', EARLY:'owning the [workstream / accounts] ', MID:'leading a [N]-member team ', SENIOR:'owning a ₹[X] Cr [P&L / function] '
  };

  /* ---------------------------------------------------------------- 8. Certification catalogue (India, verify before display)
   * lv = levels where it may be suggested; gate = minimum full-time months to be eligible to certify (A5 rules in the JD Library).
   * cr = credibility tier with Indian recruiters (1 high … 3 low). */
  C.CERTS = [
    {id:'NISM8',n:'NISM Series VIII – Equity Derivatives',d:['FIN','IB'],lv:['CAMPUS','EARLY','MID'],cost:'₹1,500',time:'2–3 weeks',cr:1,covers:['valuation','regulatory compliance','capital markets'],v:'https://www.nism.ac.in',note:'SEBI-linked; fastest credible markets signal'},
    {id:'NISM15',n:'NISM Series XV – Research Analyst',d:['IB','FIN'],lv:['CAMPUS','EARLY','MID'],cost:'₹1,500 incl. GST',time:'2–4 weeks',cr:1,covers:['equity research','financial statement analysis','valuation'],v:'https://www.nism.ac.in',note:'Mandatory for publishing research (SEBI RA Regulations)'},
    {id:'NISM5A',n:'NISM Series V-A – Mutual Fund Distributors',d:['FIN','SAL'],lv:['CAMPUS','EARLY'],cost:'₹1,500 (approx.)',time:'1–2 weeks',cr:2,covers:['regulatory compliance','wealth'],v:'https://www.nism.ac.in',note:'Needed for MF distribution / AMFI ARN'},
    {id:'CFA1',n:'CFA Level I (candidate)',d:['IB','FIN'],lv:['CAMPUS','EARLY'],cost:'USD 1,140 early / 1,490 standard',time:'~300 hrs',cr:1,covers:['valuation','financial modelling','financial statement analysis','accounting'],v:'https://www.cfainstitute.org',note:'List as "CFA Level I candidate (window)" only once registered'},
    {id:'IIBFCCP',n:'IIBF credit certification (Certified Credit Professional / MSME credit)',d:['FIN'],lv:['CAMPUS','EARLY','MID'],cost:'Verify on iibf.org.in',time:'4–8 weeks',cr:2,covers:['credit appraisal','financial statement analysis','regulatory compliance'],v:'https://www.iibf.org.in',note:'Banking-body credential; strong for credit and SME-lending roles'},
    {id:'FRM1',n:'FRM Part I',d:['FIN'],lv:['CAMPUS','EARLY'],cost:'USD 400 enrolment + 600–800 exam',time:'~240 hrs',cr:1,covers:['risk management','regulatory compliance'],v:'https://www.garp.org/frm',note:'Certification needs 2 yrs relevant experience'},
    {id:'FMOD',n:'Financial modelling & valuation course with a published model',d:['FIN','IB','RE','INF','ENR'],lv:['CAMPUS','EARLY'],cost:'Low (₹0–5k)',time:'3–4 weeks',cr:2,covers:['financial modelling','valuation','real estate financial modelling','project finance'],v:'',note:'Credible only with a shareable model'},
    {id:'GADS',n:'Google Ads + GA4 certifications (Skillshop)',d:['MKT','ECM','MED','EDT'],lv:['CAMPUS','EARLY'],cost:'Free',time:'1–2 weeks',cr:2,covers:['digital marketing','marketing analytics','performance marketing'],v:'https://skillshop.withgoogle.com',note:'Pair with a live ₹5–10k campaign to matter'},
    {id:'META',n:'Meta Blueprint – Digital Marketing Associate',d:['MKT','ECM','MED'],lv:['CAMPUS','EARLY'],cost:'≈USD 99 (verify)',time:'2–3 weeks',cr:2,covers:['digital marketing','campaign management'],v:'https://www.facebookblueprint.com',note:''},
    {id:'HUBSPOT',n:'HubSpot Inbound / Content Marketing',d:['MKT','PRC','CSM'],lv:['CAMPUS'],cost:'Free',time:'1 week',cr:3,covers:['content strategy','digital marketing','crm'],v:'https://academy.hubspot.com',note:'Low signal alone'},
    {id:'PL300',n:'Microsoft PL-300 Power BI Data Analyst',d:['BA','FIN','OPS','SCM','PM','HR','RTL','ECM'],lv:['CAMPUS','EARLY','MID'],cost:'≈₹4,865 + GST (verify)',time:'4–6 weeks',cr:1,covers:['dashboarding','data analysis','operations analytics','sales analytics','hr analytics','retail analytics','e-commerce analytics','power bi'],v:'https://learn.microsoft.com/credentials',note:'Renews free every 12 months'},
    {id:'TABLEAU',n:'Tableau Desktop Foundations',d:['BA','MKT','ECM'],lv:['CAMPUS','EARLY'],cost:'≈USD 100 (verify)',time:'2–4 weeks',cr:2,covers:['dashboarding','data analysis','tableau'],v:'https://www.tableau.com/learn/certification',note:''},
    {id:'GDA',n:'Google Data Analytics Certificate (SQL, R, Tableau)',d:['BA','PM','CON'],lv:['CAMPUS'],cost:'≈USD 20/month (Coursera)',time:'3–6 months',cr:2,covers:['sql','data analysis','statistics','dashboarding'],v:'https://grow.google',note:'Use the capstone as a project'},
    {id:'SQLC',n:'SQL for analytics (with a public query portfolio)',d:['BA','PM','ECM','CON','CSM'],lv:['CAMPUS','EARLY'],cost:'Free–low',time:'2–3 weeks',cr:2,covers:['sql','product analytics','funnel analytics','e-commerce analytics'],v:'',note:'Show 5–10 queries on GitHub'},
    {id:'PYDS',n:'Python for data analysis (pandas) with a notebook portfolio',d:['BA','PM','FIN'],lv:['CAMPUS','EARLY'],cost:'Free–low',time:'3–5 weeks',cr:2,covers:['python','statistics','data analysis'],v:'',note:''},
    {id:'LSSGB',n:'Lean Six Sigma Green Belt (ISI / QAI / KPMG India)',d:['OPS','SCM','HCM','INF','CON'],lv:['CAMPUS','EARLY','MID'],cost:'₹17,700 (ISI Delhi) – ₹23,600 (KPMG India)',time:'3–6 days + project',cr:1,covers:['process improvement','root cause analysis','process mapping','quality standards','kpi management'],v:'',note:'ASQ CSSGB needs 3 yrs experience'},
    {id:'CSCP',n:'ASCM / APICS CSCP',d:['SCM','OPS'],lv:['EARLY','MID'],cost:'USD 1,450 member / 2,015 non-member',time:'~100 hrs',cr:1,covers:['demand planning','supply chain analytics','procurement','logistics','inventory management'],v:'https://www.ascm.org',note:'Bachelor\'s or 3 yrs experience'},
    {id:'CPIM',n:'ASCM / APICS CPIM',d:['SCM','OPS'],lv:['EARLY','MID'],cost:'USD 1,265 member / 1,755 non-member',time:'100–150 hrs',cr:1,covers:['demand planning','inventory management','inventory control'],v:'https://www.ascm.org',note:''},
    {id:'SHRMCP',n:'SHRM-CP',d:['HR'],lv:['CAMPUS','EARLY','MID'],cost:'USD 399 member / 499 non-member',time:'80–120 hrs',cr:1,covers:['performance management','employee relations','talent acquisition','hr analytics'],v:'https://www.shrm.org',note:'No degree or experience needed (SHRM-SCP needs 3+ yrs)'},
    {id:'HRAN',n:'HR analytics course with an attrition-dashboard project',d:['HR'],lv:['CAMPUS','EARLY'],cost:'Low',time:'3–4 weeks',cr:2,covers:['hr analytics','dashboarding'],v:'',note:''},
    {id:'ECBA',n:'IIBA ECBA',d:['ITS','BA','PM','CON'],lv:['CAMPUS','EARLY'],cost:'USD 395 incl. first-year membership',time:'4–8 weeks',cr:2,covers:['requirements gathering','process mapping','sdlc','prd'],v:'https://www.iiba.org',note:'CCBA needs 3,750 hrs; CBAP 7,500 hrs'},
    {id:'CSPO',n:'Scrum / Product Owner certification (CSPO or PSPO I)',d:['PM','ITS','EDT'],lv:['CAMPUS','EARLY','MID'],cost:'Varies (≈USD 200–500)',time:'2 days–2 weeks',cr:2,covers:['agile','roadmap prioritisation','prd'],v:'',note:'Pair with a PRD in your portfolio'},
    {id:'SAP',n:'SAP Certified Associate (FICO / MM / SD as relevant)',d:['ITS','SCM','FIN'],lv:['CAMPUS','EARLY','MID'],cost:'Varies (verify with SAP)',time:'4–8 weeks',cr:1,covers:['erp','procurement','accounting'],v:'https://learning.sap.com',note:''},
    {id:'PMP',n:'PMP',d:['OPS','ITS','INF','GM','CON'],lv:['MID','SENIOR'],gate:36,cost:'≈USD 405 member / 575 non-member (verify)',time:'2–3 months',cr:1,covers:['project management','programme management'],v:'https://www.pmi.org',note:'Needs 36 months leading projects; PMI training rules change 1 Dec 2026'},
    {id:'CAPM',n:'PMI CAPM',d:['OPS','ITS','INF','GM'],lv:['CAMPUS','EARLY'],cost:'≈USD 225 member / 300 non-member (verify)',time:'4–6 weeks',cr:2,covers:['project management','programme management'],v:'https://www.pmi.org',note:''},
    {id:'SFDC',n:'Salesforce Certified Administrator',d:['CSM','SAL','ITS'],lv:['CAMPUS','EARLY'],cost:'≈USD 200 (verify)',time:'4–6 weeks',cr:2,covers:['crm','account management'],v:'https://trailhead.salesforce.com',note:''},
    {id:'ESGC',n:'GRI Certified Sustainability Professional / BRSR course',d:['ESG','PPD','ENR'],lv:['CAMPUS','EARLY','MID'],cost:'Varies (verify)',time:'3–6 weeks',cr:2,covers:['esg frameworks','brsr','ghg accounting','esg data analysis'],v:'https://www.globalreporting.org',note:''},
    {id:'IC38',n:'IRDAI IC-38 (insurance roles only)',d:['FIN','SAL'],lv:['CAMPUS','EARLY'],cost:'Low',time:'1–2 weeks',cr:2,covers:['regulatory compliance'],v:'',note:'Only if the role sells insurance / bancassurance'},
    {id:'NABH',n:'NABH / hospital quality awareness programme',d:['HCM'],lv:['CAMPUS','EARLY'],cost:'Low (verify)',time:'1–2 weeks',cr:2,covers:['quality standards','healthcare operations'],v:'https://nabh.co',note:''}
  ];

  /* ---------------------------------------------------------------- 9. Project / capstone bank (per domain; s = skills it evidences) */
  C.PROJECTS = {
    CON:[{n:'Market-entry or cost-diagnostic case for an Indian company (10-slide deck, bottom-up sizing)',s:['structured problem solving','market sizing','strategic analysis','powerpoint','financial modelling'],lv:['CAMPUS','EARLY'],w:3,proof:'Deck reviewed by consulting club / faculty'},
         {n:'Pro-bono strategy sprint for an NGO or MSME (problem → recommendations → adoption)',s:['structured problem solving','stakeholder management','data analysis','executive communication'],lv:['CAMPUS','EARLY'],w:4,proof:'Client email confirming adoption'}],
    FIN:[{n:'Credit appraisal of a listed MSME/NBFC borrower (CMA-style note, ratio & cash-flow analysis)',s:['credit appraisal','financial statement analysis','excel','accounting'],lv:['CAMPUS','EARLY'],w:3,proof:'Faculty-reviewed credit note'},
         {n:'3-statement + DCF model of a Nifty 100 company with a 2-page investment memo',s:['financial modelling','valuation','financial statement analysis','excel'],lv:['CAMPUS','EARLY'],w:3,proof:'Shareable model + memo'},
         {n:'FP&A rebuild: budget-vs-actual and rolling forecast for a family business or club',s:['fp&a','variance analysis','excel','dashboarding'],lv:['CAMPUS','EARLY'],w:3,proof:'Owner confirmation'}],
    IB:[{n:'Initiating-coverage report on a mid-cap (DCF + comps + target price)',s:['valuation','financial modelling','pitch book','equity research'],lv:['CAMPUS','EARLY'],w:4,proof:'Published report'},
        {n:'M&A teardown of a recent Indian deal (synergies, accretion/dilution, pitch-book pages)',s:['pitch book','valuation','financial modelling','due diligence'],lv:['CAMPUS','EARLY'],w:3,proof:'Pitch pages'}],
    SAL:[{n:'Beat-plan / territory redesign for 30–50 outlets with a distributor ROI analysis',s:['territory management','sales analytics','distribution','excel'],lv:['CAMPUS','EARLY'],w:3,proof:'Data sheet + distributor sign-off'},
         {n:'Live B2B lead-generation sprint for a startup (pipeline, conversion, CRM)',s:['crm','business development','negotiation','target achievement'],lv:['CAMPUS','EARLY'],w:4,proof:'CRM export / founder email'}],
    MKT:[{n:'Category deep-dive: price-pack architecture and share estimate for an FMCG category (retail audit of 30 outlets)',s:['consumer insights','marketing strategy','pricing','market research'],lv:['CAMPUS','EARLY'],w:3,proof:'Audit data + deck'},
         {n:'Live ₹5–10k performance campaign for a D2C brand or campus venture (CTR, CAC, ROAS reported)',s:['digital marketing','campaign management','marketing analytics','performance marketing'],lv:['CAMPUS','EARLY'],w:3,proof:'Ads-manager screenshot'},
         {n:'Consumer research study (n ≥ 100 + 2 FGDs) translated into a positioning recommendation',s:['consumer insights','marketing strategy','user research'],lv:['CAMPUS'],w:3,proof:'Report'}],
    PM:[{n:'Product teardown + PRD for a feature in an Indian app (problem, metrics, wireframes)',s:['prd','user research','roadmap prioritisation','product analytics'],lv:['CAMPUS','EARLY'],w:3,proof:'PRD + Figma link'},
        {n:'SQL funnel analysis on a public dataset with an experiment design',s:['sql','product analytics','a/b testing','funnel analytics'],lv:['CAMPUS','EARLY'],w:2,proof:'Notebook / GitHub'}],
    HR:[{n:'Attrition-driver analysis (survey n ≥ 50) with a retention plan and HR dashboard',s:['hr analytics','employee relations','dashboarding'],lv:['CAMPUS','EARLY'],w:3,proof:'Dashboard + report'},
        {n:'Campus/lateral hiring funnel redesign for a startup (sourcing → offer, time-to-fill)',s:['talent acquisition','hr analytics','process improvement'],lv:['CAMPUS','EARLY'],w:3,proof:'Founder email'},
        {n:'Competency/KRA framework and appraisal design for an SME',s:['performance management','labour law'],lv:['CAMPUS','EARLY'],w:3,proof:'Framework doc'}],
    GM:[{n:'Founder\'s-office style business-plan sprint for a startup (unit economics, OKRs, ops plan)',s:['strategic analysis','financial acumen','programme management','executive communication'],lv:['CAMPUS','EARLY'],w:4,proof:'Founder email'},
        {n:'Cross-functional campus initiative with a budget, KPIs and a post-mortem',s:['programme management','kpi management','executive communication'],lv:['CAMPUS'],w:4,proof:'Faculty / committee confirmation'}],
    OPS:[{n:'Lean / Kaizen project at an MSME, hospital or campus facility (before→after TAT and cost)',s:['process improvement','root cause analysis','process mapping','kpi management'],lv:['CAMPUS','EARLY'],w:4,proof:'Unit head confirmation'},
         {n:'Operations dashboard (OTIF, TAT, SLA) for a small business using Power BI',s:['operations analytics','dashboarding','kpi management'],lv:['CAMPUS','EARLY'],w:2,proof:'Dashboard'}],
    SCM:[{n:'ABC-XYZ inventory and safety-stock model for a distributor or retailer',s:['inventory management','demand planning','supply chain analytics','excel'],lv:['CAMPUS','EARLY'],w:3,proof:'Model + owner confirmation'},
         {n:'Procurement should-cost and vendor-consolidation analysis',s:['procurement','cost control','negotiation'],lv:['CAMPUS','EARLY'],w:3,proof:'Analysis'}],
    PRC:[{n:'Media-relations plan and press kit for a campus event or startup launch (coverage tracked)',s:['media relations','writing','content strategy'],lv:['CAMPUS','EARLY'],w:3,proof:'Coverage links'},
         {n:'Crisis-communication simulation with holding statements and a stakeholder map',s:['crisis communication','writing'],lv:['CAMPUS'],w:2,proof:'Playbook'}],
    LEG:[{n:'Contract-review playbook (NDA/MSA) with a clause risk matrix',s:['contract drafting','contract management','regulatory compliance'],lv:['CAMPUS','EARLY'],w:3,proof:'Playbook'},
         {n:'Regulatory compliance calendar for an SME (Companies Act, GST, labour codes)',s:['regulatory compliance','corporate law','legal research'],lv:['CAMPUS'],w:2,proof:'Calendar'}],
    BA:[{n:'End-to-end SQL + Power BI dashboard on public data (RBI / MoSPI / Kaggle retail) tied to one decision',s:['sql','dashboarding','data analysis','statistics','excel'],lv:['CAMPUS','EARLY'],w:3,proof:'Live dashboard link'},
        {n:'Churn or demand-forecast model in Python with a business write-up',s:['python','statistics','machine learning','data analysis'],lv:['CAMPUS','EARLY'],w:3,proof:'GitHub notebook'}],
    ITS:[{n:'ERP process mapping and requirements document (BRD/FRD) for an SME function',s:['requirements gathering','process mapping','erp','sdlc'],lv:['CAMPUS','EARLY'],w:3,proof:'BRD + process maps'},
         {n:'UAT plan and test cases for a live campus or NGO system rollout',s:['sdlc','project management'],lv:['CAMPUS'],w:2,proof:'Test plan'}],
    CSM:[{n:'Customer health-score model and churn playbook for a SaaS startup',s:['customer success metrics','churn management','crm','account management'],lv:['CAMPUS','EARLY'],w:3,proof:'Founder email'}],
    ENT:[{n:'Validated venture: 20+ customer-discovery interviews, MVP and unit economics',s:['customer discovery','unit economics','go-to-market','fundraising'],lv:['CAMPUS','EARLY'],w:6,proof:'MVP link / incubator letter'}],
    HCM:[{n:'Hospital OPD/IPD patient-flow study with TAT reduction recommendations',s:['healthcare operations','process improvement','healthcare analytics'],lv:['CAMPUS','EARLY'],w:3,proof:'Hospital confirmation'},
         {n:'Revenue-cycle (TPA claims) denial analysis',s:['revenue cycle management','healthcare analytics'],lv:['CAMPUS'],w:2,proof:'Analysis'}],
    AGB:[{n:'Agri value-chain study for one crop with an FPO (procurement, price realisation, margins)',s:['agri value chain','procurement','field operations'],lv:['CAMPUS','EARLY'],w:4,proof:'FPO letter'},
         {n:'Rural distribution plan for an agri-input brand (haats, retailers, demo farms)',s:['rural sales','field operations','distribution'],lv:['CAMPUS'],w:3,proof:'Plan + field data'}],
    RTL:[{n:'Store audit across 10 outlets: sell-through, shrinkage, VM compliance, LFL',s:['retail operations','retail analytics','inventory control'],lv:['CAMPUS','EARLY'],w:3,proof:'Audit data'},
         {n:'Assortment and open-to-buy plan for a category',s:['merchandise planning','retail analytics'],lv:['CAMPUS'],w:2,proof:'Plan'}],
    RE:[{n:'Real-estate project feasibility model (IRR, NOI, RERA timelines) for a listed project',s:['real estate financial modelling','feasibility analysis','rera'],lv:['CAMPUS','EARLY'],w:3,proof:'Model'}],
    PPD:[{n:'Policy brief with a monitoring & evaluation framework for a state scheme',s:['policy analysis','monitoring and evaluation','report writing'],lv:['CAMPUS','EARLY'],w:3,proof:'Published brief'},
         {n:'Field impact assessment with an NGO (baseline survey, logframe)',s:['monitoring and evaluation','programme management'],lv:['CAMPUS'],w:4,proof:'NGO letter'}],
    ESG:[{n:'BRSR-style disclosure gap analysis and Scope 1–2 inventory for a listed company',s:['brsr','ghg accounting','esg frameworks','esg data analysis'],lv:['CAMPUS','EARLY'],w:3,proof:'Report'}],
    ECM:[{n:'Category P&L and unit-economics teardown for a quick-commerce or marketplace category',s:['category management','unit economics','pricing','e-commerce analytics'],lv:['CAMPUS','EARLY'],w:3,proof:'Model + deck'},
         {n:'Seller-onboarding funnel analysis with conversion improvements',s:['e-commerce analytics','funnel analytics'],lv:['CAMPUS'],w:2,proof:'Analysis'}],
    MED:[{n:'Audience and content-economics analysis for an OTT/YouTube channel',s:['audience analytics','content economics','digital marketing'],lv:['CAMPUS','EARLY'],w:3,proof:'Analysis'}],
    ENR:[{n:'Techno-commercial evaluation of a solar/wind project (tariff, PPA, IRR)',s:['techno-commercial analysis','project finance','energy regulation'],lv:['CAMPUS','EARLY'],w:3,proof:'Model'}],
    INF:[{n:'PPP project cost-control and tender analysis (BOQ, schedule variance)',s:['tendering','cost control','contract management','project management'],lv:['CAMPUS','EARLY'],w:3,proof:'Analysis'}],
    TEL:[{n:'Retailer-network and churn analysis for a telecom circle',s:['telecom distribution','churn analytics','pricing'],lv:['CAMPUS','EARLY'],w:3,proof:'Analysis'}],
    EDT:[{n:'Admissions-funnel analytics and inside-sales script test for an EdTech programme',s:['funnel analytics','inside sales','crm'],lv:['CAMPUS','EARLY'],w:3,proof:'Funnel data'}]
  };
  // For Mid/Senior users "projects" become evidence-building initiatives inside the current role.
  C.INITIATIVES = {
    _default:'Pick one initiative from the last 12 months and document it as problem → lever → ₹/% outcome → scale (team, budget, sites)',
    MID:'Lead (or document) one cross-functional initiative with a named budget, team size and a before/after metric',
    SENIOR:'Frame a flagship transformation with P&L / function scope, board or CXO visibility and a multi-year outcome'
  };
  // National competitions: typical windows recur yearly; always show "verify current season dates".
  C.COMPETITIONS = [
    {n:'HUL L.I.M.E.',d:['MKT','SAL','SCM','HR'],win:'Aug–Sep (1st-year MBA)',open:'all',v:'https://unstop.com'},
    {n:'L\'Oréal Brandstorm',d:['MKT','ESG'],win:'Oct–Mar',open:'all',v:'https://brandstorm.loreal.com'},
    {n:'ITC Interrobang',d:['MKT','HR','SCM'],win:'Aug–Oct (listed campuses)',open:'listed',v:'https://www.itcportal.com'},
    {n:'Marico Over The Wall',d:['MKT'],win:'Aug–Oct',open:'all',v:'https://unstop.com'},
    {n:'Accenture B-School Challenge',d:['CON','ITS','BA'],win:'Jul–Aug',open:'all',v:'https://unstop.com'},
    {n:'Aditya Birla Group Stratos',d:['CON','GM','FIN'],win:'Jul–Aug (invite-only B-schools)',open:'invite',v:'https://unstop.com'},
    {n:'Mahindra War Room',d:['CON','GM','OPS'],win:'Sep–Feb (listed campuses)',open:'listed',v:'https://unstop.com'},
    {n:'Tata Imagination Challenge',d:['GM','ENT','CON'],win:'Aug–Nov',open:'all',v:'https://www.tata.com/careers'},
    {n:'Flipkart WiRED',d:['ECM','SCM','OPS'],win:'Varies (women students)',open:'all',v:'https://unstop.com'},
    {n:'American Express Campus Challenge',d:['FIN','BA','MKT'],win:'Varies',open:'listed',v:'https://unstop.com'},
    {n:'Axis Bank / BFSI campus case challenges',d:['FIN','SAL'],win:'Varies',open:'listed',v:'https://unstop.com'},
    {n:'Reckitt / Nestlé / P&G campus challenges',d:['MKT','SCM','SAL'],win:'Varies',open:'listed',v:'https://unstop.com'},
    {n:'Institute-level case & product competitions (Unstop)',d:['CON','PM','BA','MKT','FIN','HR','OPS','SCM','GM','ECM'],win:'Jan–Mar wave (1st-years)',open:'all',v:'https://unstop.com'}
  ];
  C.PLANNER_HOOKS = { report:'Day 1 (Resume checker report)', certs:'Day 3 · Visit 1 (Resumes & certifications walkthrough)',
    rewrite:'Day 13 (Resume rephrasing) → Day 15 (Resume v2 due)', oneToOne:'Day 16 · Visit 3 (1:1 resume iteration)', final:'Day 28 (Resume v3, re-run checker)' };


  /* ================================================================ v3.1 additions (Oct 2026 feedback round) */
  // Sub-areas inside a domain. Detected from the JD (title weighted 2x). Each adds role-specific skills, certifications and
  // projects so "IT M&A consulting" is never treated as generic "IT & Systems". List the most specific first.
  C.SUBAREAS = [
    {key:'CON_ITMA', d:'CON', label:'IT M&A · deal technology', re:/\b(it|technology|tech)\b[^.\n]{0,30}\b(m&a|due diligence|dd|diligence|integration|separation|carve-?outs?)\b|\bm&a technology\b|\bit m&a\b|\btechnology (dd|due diligence)\b|\bit due diligence\b/,
     terms:['it due diligence','post-merger integration','separation','day 1 planning','it synergies','one-off costs','transition services agreement','it operating model','application rationalisation','infrastructure assessment','pmo','erp'],
     core:['it due diligence','post-merger integration','day 1 planning','it synergies'], certs:['TOGAF','ITIL4','AZ900','AWSCCP','PMP','CAPM','PRINCE2'], projects:'CON_ITMA'},
    {key:'CON_DEAL', d:'CON', label:'Deal advisory / M&A', re:/\bdeal (advisory|transformation)\b|\btransaction (services|advisory)\b|\bpost[- ]merger\b|\bpmi\b|\bcarve-?outs?\b|\b(commercial|operational|financial|vendor) due diligence\b|\bintegration (and|&) separation\b|\bm&a\b|\bsynerg/,
     terms:['due diligence','m&a','post-merger integration','separation','synergies','day 1 planning','valuation','financial modelling','pmo'],
     core:['due diligence','m&a','post-merger integration','synergies'], certs:['FMOD','CFA1','CFA3','PMP','CAPM'], projects:'CON_DEAL'},
    {key:'CON_TECH', d:'CON', label:'Technology / digital consulting', re:/\bdigital transformation\b|\btechnology consult|\berp\b|\bsap\b|\bimplementation\b|\bit strategy\b|\bcloud\b/,
     terms:['digital transformation','erp','requirements gathering','process mapping','pmo','agile','solution design'], core:['digital transformation','requirements gathering','pmo'], certs:['ECBA','SAP','CSPO','AZ900','ITIL4'], projects:'ITS'},
    {key:'CON_RISK', d:'CON', label:'Risk advisory', re:/\brisk advisory\b|\binternal audit\b|\bsox\b|\binternal controls?\b|\bgrc\b|\bforensic\b/,
     terms:['internal audit','internal controls','risk management','regulatory compliance','process mapping'], core:['internal audit','internal controls','risk management'], certs:['CISA','LSSGB'], projects:'CON_RISK'},
    {key:'CON_OPS', d:'CON', label:'Operations consulting', re:/\boperations consult|\bcost (reduction|transformation)\b|\boperational excellence\b|\bprocess excellence\b|\bsupply chain consult/,
     terms:['cost control','process improvement','procurement','lean','root cause analysis'], core:['process improvement','cost control'], certs:['LSSGB','CSCP'], projects:'OPS'},
    {key:'CON_STRAT', d:'CON', label:'Strategy consulting', re:/\bstrategy\b|\bmarket entry\b|\bgrowth strategy\b|\bmanagement consult/,
     terms:['market sizing','strategic analysis','structured problem solving','business case','go-to-market','competitive analysis'], core:['structured problem solving','market sizing'], certs:['FMOD','CFA1'], projects:'CON'},
    {key:'FIN_CREDIT', d:'FIN', label:'Credit & corporate banking', re:/\bcredit\b|\bunderwrit|\blending\b|\bcorporate banking\b|\bnbfc\b|\bloans?\b/,
     terms:['credit appraisal','financial statement analysis','cma data','portfolio monitoring','underwriting','due diligence'], core:['credit appraisal','financial statement analysis'], certs:['IIBFCCP','FRM1','CFA1','FMOD'], projects:'FIN_CREDIT'},
    {key:'FIN_FPA', d:'FIN', label:'FP&A / corporate finance', re:/\bfp&a\b|\bfinancial planning\b|\bbudget|\bcontroller|\bcontrollership\b|\bcorporate finance\b/,
     terms:['fp&a','budgeting','variance analysis','forecasting','mis','financial modelling'], core:['budgeting','variance analysis'], certs:['PL300','CFA1','FMOD'], projects:'FIN'},
    {key:'IB_MA', d:'IB', label:'M&A / capital markets advisory', re:/\bpitch ?books?\b|\becm\b|\bdcm\b|\borigination\b|\bmerchant banking\b|\bdeal execution\b|\bmergers and acquisitions\b/,
     terms:['valuation','financial modelling','pitch book','due diligence','m&a'], core:['valuation','financial modelling','pitch book'], certs:['CFA1','CFA3','FMOD','NISM15'], projects:'IB'},
    {key:'IB_ER', d:'IB', label:'Equity research', re:/\bequity research\b|\bresearch analyst\b|\binitiat\w* coverage\b/,
     terms:['valuation','financial modelling','financial statement analysis','report writing'], core:['valuation','financial modelling'], certs:['NISM15','CFA1','CFA3'], projects:'IB'},
    {key:'MKT_DIGITAL', d:'MKT', label:'Digital / performance marketing', re:/\bdigital marketing\b|\bperformance marketing\b|\bgrowth marketing\b|\bseo\b|\bsem\b|\bpaid (media|acquisition)\b/,
     terms:['digital marketing','performance marketing','marketing analytics','campaign management','a/b testing'], core:['digital marketing','marketing analytics'], certs:['GADS','META','TABLEAU'], projects:'MKT'},
    {key:'MKT_BRAND', d:'MKT', label:'Brand management', re:/\bbrand\b|\babm\b|\bfmcg\b|\bconsumer insight/,
     terms:['brand management','consumer insights','marketing strategy','campaign management','pricing'], core:['consumer insights','marketing strategy'], certs:['GADS','META'], projects:'MKT'},
    {key:'SAL_B2B', d:'SAL', label:'B2B / enterprise sales', re:/\bb2b\b|\benterprise (sales|selling)\b|\bsaas\b|\baccount executive\b|\bsdr\b|\bbdr\b/,
     terms:['business development','crm','negotiation','enterprise selling','account management'], core:['business development','crm'], certs:['SFDC'], projects:'SAL'},
    {key:'SAL_FMCG', d:'SAL', label:'FMCG / channel sales', re:/\bdistributors?\b|\bgeneral trade\b|\bmodern trade\b|\bfmcg\b|\bbeat plan|\bterritory\b/,
     terms:['territory management','distribution','target achievement','sales analytics','negotiation'], core:['territory management','target achievement'], certs:['PL300'], projects:'SAL'},
    {key:'HR_TA', d:'HR', label:'Talent acquisition', re:/\btalent acquisition\b|\brecruit|\bhiring\b/,
     terms:['talent acquisition','hr analytics','employee relations'], core:['talent acquisition'], certs:['SHRMCP','HRAN'], projects:'HR'},
    {key:'HR_HRBP', d:'HR', label:'HR business partnering', re:/\bhrbp\b|\bbusiness partner\b|\bemployee relations\b|\bindustrial relations\b/,
     terms:['performance management','employee relations','labour law','hr analytics'], core:['performance management','employee relations'], certs:['SHRMCP','HRAN'], projects:'HR'}
  ];
  // Phrase rules that decide the domain when a JD's words are shared across domains (applied to title + body).
  C.JD_CONTEXT_RULES = [
    [/\bpost[- ]merger integration\b|\bpmi\b|\bintegration (and|&) separation\b|\bcarve-?outs?\b|\btransition services agreements?\b|\btsas?\b|\bday[- ]?(1|one|100)\b|\bdeal transformation\b|\btransaction services\b|\b(operational|commercial|it|technology) due diligence\b|\btechnology dd\b|\bm&a technology\b|\bit m&a\b/, {CON:0.35, IB:-0.2, ITS:-0.15}],
    [/\bpitch ?books?\b|\becm\b|\bdcm\b|\borigination\b|\bmerchant banking\b|\blbo\b|\bleveraged finance\b|\bdeal execution\b|\bsell[- ]side\b/, {IB:0.3}],
    [/\b(it|technical|tech) recruit\w*\b/, {HR:0.35, ITS:-0.25}],
    [/\b(it|software|saas|cloud) sales\b/, {SAL:0.3, ITS:-0.2}],
    [/\brisk advisory\b|\binternal audit\b|\bsox\b|\binternal controls?\b/, {CON:0.15, FIN:0.08}],
    [/\b(it|technology) (procurement|sourcing)\b/, {SCM:0.25, ITS:-0.1}],
    [/\bmanagement consult\w*\b|\bstrategy consult\w*\b|\bbig[- ]?4\b|\bbig four\b|\bstrategy (&|and) transactions\b/, {CON:0.2}]
  ];
  // Cities used to split job-link slugs into title / location / department.
  // "Put a number on it" menus for sub-areas (more specific than the domain menu)
  C.METRIC_MENU_SUB = {
    CON_ITMA:'deal value (₹ Cr), number of deals or targets, IT red flags raised, IT synergies (₹ Cr), one-off costs, TSA services scoped, Day 1 milestones / workstreams',
    CON_DEAL:'deal value (₹ Cr), targets assessed, synergies identified (₹ Cr), red flags raised, workstreams run, price or SPA impact',
    CON_TECH:'modules implemented, users migrated, go-live on time, process time cut (%), programme budget (₹ Cr)',
    CON_RISK:'processes reviewed, control gaps closed, audit observations, risk exposure (₹)',
    FIN_CREDIT:'portfolio / exposure (₹ Cr), proposals appraised, TAT (days), slippage or NPA rate, covenant breaches caught',
    IB_MA:'deal size (₹/$ Mn), mandates supported, models built, buyers / investors contacted'
  };
  C.CITIES = ['new delhi','delhi ncr','delhi','gurugram','gurgaon','noida','navi mumbai','mumbai','thane','bengaluru','bangalore','hyderabad','pune','chennai','kolkata',
    'ahmedabad','jaipur','kochi','chandigarh','indore','coimbatore','lucknow','bhubaneswar','vadodara','nagpur','gift city','remote','pan india','india'];
  C.TITLE_HEADS = ['manager','analyst','consultant','associate','executive','officer','lead','head','director','intern','trainee','specialist','engineer','partner',
    'president','vp','avp','advisor','adviser','architect','owner','planner','buyer','counsel','controller','scientist','strategist','representative','coordinator'];
  C.JOB_BOARDS = /(^|\.)(naukri|linkedin|indeed|foundit|monsterindia|iimjobs|hirist|instahyre|glassdoor|wellfound|angel|cutshort|apna|shine|timesjobs|unstop|internshala|greenhouse|lever|workday|myworkdayjobs|smartrecruiters|ashbyhq|freshteam|zohorecruit|successfactors|taleo|icims)\./;
  // Leading adverbs that hide the real verb ("Successfully cleared…", "Actively managed…").
  C.ADVERBS = ['successfully','actively','effectively','independently','jointly','personally','consistently','proactively','single-handedly','directly','closely','extensively','also','regularly'];
  // Lines that state a credential or exam result. Scored as achievements and never rewritten as work bullets.
  C.CREDENTIAL_LINE = /\b(cleared|passed|qualified|completed|awarded|attained|earned|certified|pursuing|appeared)\b[^.\n]{0,70}\b(cfa|frm|caia|cfp|ca|cs|cma|nism|acca|cpa|level|exam\w*|certification|certificate|course|gmat|gre|cat)\b|\b(cfa|frm|caia)\b[^.\n]{0,25}\blevel\b/;
  C.CERT_LABEL = {CFA1:'CFA',FRM1:'FRM',NISM:'NISM',NISM8:'NISM VIII',NISM15:'NISM XV',NISM5A:'NISM V-A',NISM10A:'NISM X-A',FMOD:'Financial modelling course',LSSGB:'Six Sigma',
    CSCP:'APICS/ASCM',SHRMCP:'SHRM',PMP:'PMP/PRINCE2',GADS:'Google Ads / GA4',PL300:'Power BI (PL-300)',TABLEAU:'Tableau',GDA:'Google Data Analytics',SQLC:'SQL certification',
    CSPO:'Scrum / Product Owner',ECBA:'IIBA',SFDC:'Salesforce',SAP:'SAP',ESGC:'ESG / GRI',IC38:'IRDAI IC-38',TOGAF:'TOGAF',ITIL4:'ITIL 4',AZ900:'Azure Fundamentals',AWSCCP:'AWS Cloud Practitioner',CISA:'CISA'};
  C.UG_LABEL = ['Engineering degree','Commerce degree','CA / CMA','BBA / BMS','Medical / pharma degree','Agriculture degree','Law degree','Economics','Statistics / maths','Architecture / civil','Electrical engineering','Mass communication','Computer science / IT'];
  // Extra skills (and their resume variants) used by the sub-areas above.
  var SYN2 = {
    'it due diligence':['it due diligence','it~due diligence','technology due diligence','technology~due diligence','technology dd','it dd','it diligence','it red flags'],
    'post-merger integration':['post-merger integration','post merger integration','pmi','integration management office','imo','integration planning','integration programme'],
    'separation':['separation','carve-out','carve out','carveout','divestiture','demerger','standalone'],
    'day 1 planning':['day 1','day one','day 100','100-day plan','cut-over','cutover','day-1 readiness'],
    'it synergies':['it synergies','technology synergies','cost synergies','synergy model','synergy tracker*'],
    'one-off costs':['one-off cost*','one-time cost*','ongoing cost*','dis-synerg*','stranded cost*'],
    'transition services agreement':['transition services agreement*','tsa','tsas','reverse tsa'],
    'it operating model':['it operating model','target operating model','operating model','tom'],
    'application rationalisation':['application rationaliz*','application landscape','application portfolio','legacy systems'],
    'infrastructure assessment':['it infrastructure','infrastructure assessment','data center*','cloud migration','network infrastructure'],
    'synergies':['synerg*'],
    'm&a':['m&a','mergers and acquisitions','acquisition*','merger*'],
    'carve-out':['carve-out','carve out','carveout','divestiture'],
    'portfolio monitoring':['portfolio monitoring','covenant*','annual review*','early warning','stock audit*','portfolio of'],
    'cma data':['cma data','cma'],
    'underwriting':['underwrit*','credit underwrit*'],
    'internal audit':['internal audit*','audit plan*','audit observation*'],
    'internal controls':['internal control*','ifc','icfr','sox','control testing'],
    'risk management':['risk management','risk assessment*','risk register','risk mitigation'],
    'solution design':['solution design','solutioning','solution architecture'],
    'competitive analysis':['competitive analy*','competitor analy*','competitive landscape','benchmarking'],
    'mis':['mis','management information'],
    'budgeting':['budget*'],
    'forecasting':['forecast*']
  };
  Object.keys(SYN2).forEach(function (k) { if (!C.SYN[k]) C.SYN[k] = SYN2[k]; });
  // Certifications for the sub-areas (costs are indicative: verify on the official site before showing a price).
  C.CERTS = C.CERTS.concat([
    {id:'TOGAF',n:'TOGAF Enterprise Architecture Foundation (The Open Group)',d:['CON','ITS'],lv:['EARLY','MID','SENIOR'],cost:'Verify (The Open Group)',time:'3–5 weeks',cr:1,covers:['it operating model','application rationalisation','solution design','infrastructure assessment'],v:'https://www.opengroup.org/certifications',note:'Shows you can read an IT landscape in due diligence and integration'},
    {id:'ITIL4',n:'ITIL 4 Foundation',d:['CON','ITS','OPS'],lv:['CAMPUS','EARLY','MID'],cost:'Verify (accredited partners, incl. exam)',time:'2–3 weeks',cr:1,covers:['transition services agreement','it operating model','separation'],v:'https://www.axelos.com',note:'Useful for TSA, service separation and Day 1 IT operations'},
    {id:'AZ900',n:'Microsoft Azure Fundamentals (AZ-900)',d:['CON','ITS','BA'],lv:['CAMPUS','EARLY','MID'],cost:'Verify (Microsoft India pricing)',time:'1–3 weeks',cr:2,covers:['infrastructure assessment','application rationalisation'],v:'https://learn.microsoft.com/credentials',note:'Cloud basics for infrastructure diligence'},
    {id:'AWSCCP',n:'AWS Certified Cloud Practitioner',d:['CON','ITS','BA'],lv:['CAMPUS','EARLY','MID'],cost:'≈USD 100 (verify)',time:'2–4 weeks',cr:2,covers:['infrastructure assessment','application rationalisation'],v:'https://aws.amazon.com/certification',note:'Alternative to AZ-900; pick one'},
    {id:'PRINCE2',n:'PRINCE2 Foundation',d:['CON','OPS','ITS','INF'],lv:['EARLY','MID'],cost:'Verify (accredited partners)',time:'1–2 weeks',cr:2,covers:['pmo','project management','programme management'],v:'https://www.axelos.com',note:'No experience requirement, unlike PMP'},
    {id:'CFA3',n:'CFA Level III (next step after Level II)',d:['IB','FIN','CON'],lv:['EARLY','MID'],cost:'USD 1,140 early / 1,490 standard (verify)',time:'~300 hrs',cr:1,covers:['valuation','financial modelling'],v:'https://www.cfainstitute.org',note:'Suggested only when Level II is already on your resume',needs:'CFA_L2'},
    {id:'CISA',n:'ISACA CISA',d:['CON','FIN','ITS'],lv:['MID','SENIOR'],gate:60,cost:'Verify (ISACA)',time:'2–3 months',cr:1,covers:['internal audit','internal controls','risk management'],v:'https://www.isaca.org',note:'Certification needs 5 yrs of IS audit/control experience'}
  ]);
  // Projects and work samples for the sub-areas (Early+ candidates see them as interview-ready work samples).
  C.PROJECTS.CON_ITMA = [
    {n:'IT due-diligence red-flag memo on a recent listed Indian acquisition (applications, infrastructure, cyber, licences, IT people) built from public filings',s:['it due diligence','infrastructure assessment','application rationalisation','m&a'],lv:['CAMPUS','EARLY','MID'],w:2,proof:'2-page memo you can walk through in the interview'},
    {n:'Day 1 / Day 100 IT integration plan with TSA scope and exit roadmap for a carve-out',s:['day 1 planning','transition services agreement','separation','post-merger integration','pmo'],lv:['CAMPUS','EARLY','MID'],w:2,proof:'Plan + TSA schedule (Excel/PPT)'},
    {n:'IT synergy and one-off cost model for a merger (application rationalisation, infrastructure consolidation, licence renegotiation)',s:['it synergies','one-off costs','application rationalisation','financial modelling'],lv:['CAMPUS','EARLY','MID'],w:2,proof:'Synergy model with assumptions sheet'}];
  C.PROJECTS.CON_DEAL = [
    {n:'Commercial due-diligence pack on a listed mid-cap target (market, customers, competitive position, red flags)',s:['due diligence','strategic analysis','market sizing','m&a'],lv:['CAMPUS','EARLY','MID'],w:3,proof:'10-slide pack'},
    {n:'Synergy model and integration tracker for a recent Indian merger (revenue and cost synergies, one-off costs, Day 1 priorities)',s:['synergies','post-merger integration','day 1 planning','financial modelling'],lv:['CAMPUS','EARLY','MID'],w:2,proof:'Model + tracker'}];
  C.PROJECTS.CON_RISK = [
    {n:'Risk and control matrix (RCM) with test steps for one business process of a listed company',s:['internal controls','internal audit','risk management','process mapping'],lv:['CAMPUS','EARLY'],w:2,proof:'RCM workbook'}];
  C.PROJECTS.FIN_CREDIT = [
    {n:'Credit appraisal note on a listed mid-corporate borrower (CMA data, ratio and cash-flow analysis, covenant proposal)',s:['credit appraisal','financial statement analysis','cma data','underwriting'],lv:['CAMPUS','EARLY'],w:2,proof:'Credit note'},
    {n:'Early-warning dashboard for a 20-account portfolio (ratios, delays, covenant breaches)',s:['portfolio monitoring','dashboarding','financial statement analysis'],lv:['CAMPUS','EARLY','MID'],w:2,proof:'Dashboard'}];

  if (typeof module === 'object' && module.exports) { module.exports = C; } else { root.RFS_CONTENT = C; }
})(this);
