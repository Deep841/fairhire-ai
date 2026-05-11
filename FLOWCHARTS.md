# FairHire AI — Complete Project Flowchart
# Open this file in any Mermaid renderer:
# - https://mermaid.live
# - VS Code Mermaid Preview extension
# - GitHub (renders automatically in .md files)

---

## FLOWCHART 1 — Full System Architecture

```mermaid
flowchart TD
    subgraph CLIENT["🖥️ FRONTEND  React + TypeScript + Vite"]
        LAND[Landing Page]
        LOGIN[Login Page\nEmail/Password\nGoogle OAuth]
        DASH[Dashboard\nMetrics + Analytics]
        JOBS[Jobs Page\nCreate / Publish]
        PIPE[Pipeline Page\nStage Management]
        CANDS[Candidates Page]
        PROF[Candidate Profile]
        INTV[Interviews Page]
        PROC[Process Resumes]
        CHAT[RecruiterChat\nFloating Widget]
    end

    subgraph AUTH_FLOW["🔐 AUTH LAYER"]
        JWT[JWT Token\nHS256 · 8hr expiry]
        GOOG[Google OAuth2\nAuthorization Code Flow]
    end

    subgraph BACKEND["⚙️ BACKEND  FastAPI + asyncpg"]
        subgraph ROUTES["API Routes  /api/v1/"]
            R_AUTH[/auth/\nregister · login · google]
            R_JOBS[/jobs/\nCRUD · publish]
            R_UPLOAD[/upload/resume\nParse + Profile]
            R_MATCH[/match/jd\nFit Scoring]
            R_APPS[/applications/\nPipeline CRUD]
            R_INTV[/interviews/\nSchedule + Score]
            R_CHAT[/chat/\nChatbot]
            R_ANAL[/analytics/summary]
            R_INTAKE[/intake/submit\nPublic API]
            R_APPLY[/apply/job_id\nPublic HTML Form]
        end

        subgraph SERVICES["Services Layer"]
            SVC_PARSE[parser.py\npypdf → pdfplumber]
            SVC_PROF[profile_extractor.py\nRegex Pipeline]
            SVC_JD[jd_matcher.py\nHybrid Scoring]
            SVC_SEM[semantic_matcher.py\nBM25 TF-IDF]
            SVC_IMP[scoring_service.py\nImpact Scorer]
            SVC_TAX[skill_taxonomy.py\n80+ Skills]
            SVC_DEC[decision_engine.py\nHire/Hold/Reject]
            SVC_EMAIL[email_service.py\nBrevo/Resend/SMTP]
            SVC_JDO[jd_optimizer.py\nJD Quality]
            SVC_QUAL[resume_quality.py\n0-100 Score]
            SVC_LINK[link_verifier.py\nGitHub/LinkedIn]
        end
    end

    subgraph DB["🗄️ PostgreSQL  6 Tables"]
        T_USERS[(hr_users)]
        T_JOBS[(jobs)]
        T_CANDS[(candidates)]
        T_APPS[(applications)]
        T_INTV[(interviews)]
        T_FORMS[(form_submissions)]
    end

    LOGIN -->|email+password| R_AUTH
    LOGIN -->|OAuth code| GOOG
    GOOG -->|exchange code| R_AUTH
    R_AUTH --> JWT
    JWT -->|stored in localStorage| CLIENT

    PROC --> R_UPLOAD
    JOBS --> R_JOBS
    PIPE --> R_APPS
    CANDS --> R_MATCH
    INTV --> R_INTV
    CHAT --> R_CHAT
    DASH --> R_ANAL

    R_UPLOAD --> SVC_PARSE
    SVC_PARSE --> SVC_PROF
    SVC_PROF --> SVC_TAX
    SVC_PROF --> SVC_LINK
    SVC_PROF --> SVC_QUAL

    R_MATCH --> SVC_JD
    SVC_JD --> SVC_SEM
    SVC_JD --> SVC_IMP
    SVC_JD --> SVC_TAX

    R_APPS --> SVC_DEC
    R_APPS --> SVC_EMAIL
    R_CHAT --> SVC_DEC
    R_CHAT --> SVC_JDO

    R_APPLY --> R_INTAKE
    R_INTAKE --> SVC_PROF
    R_INTAKE --> SVC_JD
    R_INTAKE --> SVC_EMAIL

    BACKEND --> DB
```

---

## FLOWCHART 2 — Server Startup Sequence

```mermaid
flowchart TD
    A([uvicorn main:app --reload]) --> B[create_app]
    B --> C[register_middleware\nCORS + Request-ID header]
    C --> D[register_routers\n13 route modules mounted]
    D --> E{lifespan startup}
    E --> F[probe_postgres\nNullPool test connection]
    F --> G{Connection OK?}
    G -->|Yes| H[Use PostgreSQL URL]
    G -->|No| I[Fallback to SQLite\nsqlite+aiosqlite://./fairhire.db]
    H --> J[init_engine\nCreate AsyncEngine + SessionFactory]
    I --> J
    J --> K[Base.metadata.create_all\nCreate all 6 tables if missing]
    K --> L{JWT_SECRET == default?}
    L -->|Yes| M[🚫 RuntimeError\nServer refuses to start]
    L -->|No| N[✅ Server Ready\nlocalhost:8000]
    N --> O[Swagger UI at /docs]
    N --> P[Health check at /health]
```

---

## FLOWCHART 3 — Authentication Flow

```mermaid
flowchart TD
    subgraph EMAIL_AUTH["Email / Password Auth"]
        A1[User fills Login form] --> B1{Mode?}
        B1 -->|Register| C1[POST /auth/register\nemail · password · full_name]
        B1 -->|Login| D1[POST /auth/login\nOAuth2PasswordRequestForm]
        C1 --> E1[hash_password\npasslib bcrypt]
        E1 --> F1[Save HRUser\nrole hardcoded = 'hr']
        D1 --> G1[verify_password\nbcrypt compare]
        G1 -->|Match| H1[create_access_token\npython-jose HS256]
        F1 --> H1
        H1 --> I1[Return JWT\nuser_id · email · role]
        I1 --> J1[Store in localStorage\nquantumlogic_token]
    end

    subgraph GOOGLE_AUTH["Google OAuth2 Flow"]
        A2[Click 'Continue with Google'] --> B2[Redirect to\naccounts.google.com/o/oauth2/v2/auth\nscope: openid email profile]
        B2 --> C2[User picks Google account]
        C2 --> D2[Google redirects to\n/auth/google/callback?code=XXX]
        D2 --> E2[GoogleCallback.tsx\nextracts code from URL]
        E2 --> F2[POST /auth/google\ncredential: code]
        F2 --> G2[httpx POST to\noauth2.googleapis.com/token\nexchange code for id_token]
        G2 --> H2[id_token.verify_oauth2_token\ngoogle-auth library]
        H2 -->|Valid| I2{User exists?}
        I2 -->|No| J2[Create HRUser\nrole = 'hr']
        I2 -->|Yes| K2[Fetch existing user]
        J2 --> L2[create_access_token]
        K2 --> L2
        L2 --> M2[Return JWT]
        M2 --> N2[Navigate to /dashboard]
    end

    subgraph PROTECTED["Every Protected Request"]
        P1[Request with\nAuthorization: Bearer TOKEN] --> P2[get_current_user dependency]
        P2 --> P3[decode_token\npython-jose]
        P3 -->|Invalid/Expired| P4[401 Unauthorized\nFrontend clears localStorage]
        P3 -->|Valid| P5[db.get HRUser by sub]
        P5 --> P6[Route handler executes]
    end
```

---

## FLOWCHART 4 — Resume Upload & Parsing Pipeline

```mermaid
flowchart TD
    A([HR uploads PDF/DOCX\nPOST /upload/resume]) --> B{File type valid?\nPDF · DOC · DOCX}
    B -->|No| C[415 Unsupported Media Type]
    B -->|Yes| D{Size ≤ 10MB?}
    D -->|No| E[413 Too Large]
    D -->|Yes| F[run_in_executor\nThread Pool — non-blocking]

    F --> G{File type?}
    G -->|PDF| H[pypdf\nextract_text all pages]
    G -->|DOCX| I[python-docx\nparagraphs + tables + headers]
    G -->|DOC| J[latin-1 decode]

    H --> K[_score_headings\ncount Skills/Experience/Education/Projects/Certs]
    K --> L{headings ≥ 2?}
    L -->|No — low confidence| M[pdfplumber fallback\nbetter for multi-column]
    L -->|Yes| N[Use pypdf output]
    M --> O{pdfplumber better?}
    O -->|Yes| P[Use pdfplumber output\nused_fallback=True]
    O -->|No| N

    N --> Q[6-Pass Cleanup Pipeline]
    P --> Q

    subgraph CLEANUP["6-Pass Text Cleanup"]
        Q1[Pass 1: Unicode NFC normalise\nBullets/dashes → ASCII]
        Q2[Pass 2: Strip decorative symbols\nBox-drawing · dingbats · icon fonts]
        Q3[Pass 3: Restore missing spaces\nCamelCase · commas · slashes\nEmails/phones masked first]
        Q4[Pass 3b: Rejoin ALL-CAPS broken words\nRELEV ANT → RELEVANT]
        Q5[Pass 4: Rejoin words split across lines\nlowercase-newline-lowercase → rejoin]
        Q6[Pass 5: Isolate section headings\nonto their own lines]
        Q7[Pass 6: Whitespace collapse\ntrailing spaces · blank lines]
        Q1 --> Q2 --> Q3 --> Q4 --> Q5 --> Q6 --> Q7
    end

    Q --> Q1
    Q7 --> R[extract_profile\nProfile Extractor]
    Q7 --> S[verify_links\nGitHub + LinkedIn]
    Q7 --> T[compute_resume_quality\n0-100 score]

    R --> U[Return UploadResponse\nfull_text · profile_summary\nverified_links · resume_quality\ncontact_confidence]
```

---

## FLOWCHART 5 — Profile Extraction (Regex Pipeline)

```mermaid
flowchart TD
    A([Cleaned resume text]) --> B[extract_profile]

    subgraph CONTACT["Contact Extraction"]
        B --> C[_contact_zone\nFirst 25 lines + signal lines]
        C --> D[_normalize_contact_text\nStrip emoji icons · fix spaced @\nhandle at obfuscation]
        D --> E[_extract_email\n3-pass: zone → full text → aggressive]
        D --> F[_extract_phone\n10-15 digits · reject year patterns]
        D --> G[_extract_name\nFirst 15 lines · ALL CAPS · title case\nFallback: derive from email]
        E --> H[contact_confidence\n0-100 score]
    end

    subgraph SKILLS["4-Tier Skill Extraction"]
        B --> S1[Tier 1: Skills section\n_SKILL_HEADING regex slice]
        S1 --> S2[Tier 2: Project tech-stack lines\n'Technologies used:' · 'Built with:']
        S2 --> S3[Tier 3: Experience section]
        S3 --> S4[Tier 4: Full text fallback]
        S4 --> S5[Match against SKILL_TAXONOMY\n80+ skills with aliases\ncompiled re.Pattern objects]
    end

    subgraph EDU["Education Extraction"]
        B --> E1[Slice education section\n_EDU_HEADING regex]
        E1 --> E2[_DEGREE_PATTERN\nB.Tech · Bachelor · Master · PhD]
        E2 --> E3[_FIELD_PATTERN\nonly inside edu section\nCS · IT · Data Science etc.]
    end

    subgraph CERT["Certification Extraction"]
        B --> C1[_CERT_PATTERN anywhere\nAWS Certified · CKA · PMP · CISSP]
        C1 --> C2[Achievement section lines\n_ACHIEVEMENT_SIGNAL\nawarded · winner · ranked · certificate]
    end

    subgraph EXP["Experience Years"]
        B --> X1[Explicit: '5+ years of experience']
        X1 --> X2[Date ranges: Jan 2020 – Present\ncalculate span · clamp to current year]
        X2 --> X3[Max of all spans found]
    end

    S5 --> RESULT[CandidateProfile\nskills · education · certifications\nexperience_years · name · email · phone]
    E3 --> RESULT
    C2 --> RESULT
    X3 --> RESULT
    H --> RESULT
```

---

## FLOWCHART 6 — AI Fit Scoring Pipeline

```mermaid
flowchart TD
    A([POST /match/jd\nCandidateProfile + JD text]) --> B[match_candidate_to_jd]

    B --> C[_extract_jd_skills\nRegex match SKILL_TAXONOMY against JD]
    C --> D[matched = profile.skills ∩ jd_skills\nmissing = jd_skills - profile.skills]

    D --> E[skill_score\nweighted_match / weighted_total\nSKILL_WEIGHTS per skill]

    D --> F[experience_score\n_compute_experience_relevance\nSmooth sqrt curve · 0.5 if no data]

    D --> G[education_score\n_compute_education_relevance\nDegree level + field match · 0.5 if no data]

    D --> H[build_profile_text\nSkills + edu stripped of institution names\n+ cert names + experience tier]

    H --> I[asyncio.gather — PARALLEL]

    subgraph PARALLEL["Run Concurrently"]
        I --> J[semantic_similarity\nBM25 TF-IDF cosine]
        I --> K[score_impact\nDeterministic sentence scorer]
    end

    subgraph BM25["BM25 TF-IDF  semantic_matcher.py"]
        J --> J1[_tokenise\nlowercase · remove stopwords]
        J1 --> J2[BM25 term saturation\nTF_sat = count / count + k·length_norm]
        J2 --> J3[IDF lookup table\nkubernetes=3.8 · python=2.2 · api=1.6]
        J3 --> J4[_bm25_vector_cached\nlru_cache maxsize=128]
        J4 --> J5[_cosine similarity\ndot product / magnitude product]
    end

    subgraph IMPACT["Impact Scorer  scoring_service.py"]
        K --> K1[_extract_achievement_sentences\nSplit on . ! ? and newlines\nFilter by _ACHIEVEMENT_RE]
        K1 --> K2[Score each sentence 0-10\n+4 strong quant % x ms users\n+2 weak quant projects bugs\n+2 strong verb led architected\n+1 per JD keyword max 3\n+1 if ≥12 words\n-3 weak filler 'responsible for']
        K2 --> K3[mean of ALL sentences\n+ excellence bonus if top ≥ 8]
    end

    E --> L[Weighted Sum\nskill×0.30 + sem×0.25 + impact×0.25\n+ exp×0.10 + edu×0.10]
    F --> L
    G --> L
    J5 --> L
    K3 --> L

    L --> M[missing_penalty\nsqrt missing_ratio × 0.12\nnon-linear — fairer than linear]
    M --> N[cert_bonus\n0-5 pts for relevant certs\nno certs = 0 not penalised]
    N --> O[fit_score = raw×100 - penalty + bonus\nclamped 0-100]

    O --> P[MatchResult\nfit_score · matched_skills · missing_skills\nall component scores · impact_highlights]
```

---

## FLOWCHART 7 — Hiring Pipeline (Stage Machine)

```mermaid
flowchart TD
    A([Candidate Applies]) --> B[applied]

    B -->|HR reviews score| C{Score threshold?}
    C -->|≥ threshold| D[shortlisted]
    C -->|too low| REJ[rejected\n📧 Rejection email sent]

    D -->|Send assessment| E[testing\n📧 Test link email sent]
    D -->|Skip test| F[interviewing]
    E -->|Score recorded\nvia webhook or manual| F

    F -->|Final decision| G{Decision Engine}
    G -->|composite ≥ 80%\nskill coverage ≥ 70%| H[Strong Hire ✅]
    G -->|composite ≥ 65%\nskill coverage ≥ 50%| I[Hire 🟢]
    G -->|composite ≥ 50%| J[Hold 🟡]
    G -->|composite < 50%| REJ

    H --> K[offered\n📧 Offer letter sent]
    I --> K
    K -->|Rescind| REJ

    REJ -->|Re-open| B

    subgraph SCORES["Score Components on Application"]
        SC1[resume_score — AI fit score]
        SC2[test_score — assessment result]
        SC3[interview_score — round 1]
        SC4[hr_interview_score — round 2]
        SC5[final_score — weighted composite]
    end

    subgraph WEBHOOK["Test Score Webhook"]
        W1[POST /applications/webhook/test-score\nX-Webhook-Secret header required]
        W1 --> W2[Validate secret\n401 if missing/wrong]
        W2 --> W3[record_test_score\nadvance to testing stage]
    end
```

---

## FLOWCHART 8 — Public Application Form Flow

```mermaid
flowchart TD
    A([Candidate visits\nGET /apply/job_id]) --> B[Serve pure HTML form\nno React · no auth needed]
    B --> C[Candidate fills:\nName · Email · Phone\nLinkedIn · Resume text · Cover note]
    C --> D[POST /apply/job_id/submit\nForm data]

    D --> E[intake_submit]
    E --> F{Job exists?}
    F -->|No| G[404 Job not found]
    F -->|Yes| H[Build full_resume\nresume_text + LinkedIn + cover note]

    H --> I[candidate_service.create\nUpsert by email — no duplicates\nStores linkedin_url]

    I --> J{Duplicate application?}
    J -->|Yes| K[Return existing application\nemail_sent=False]
    J -->|No| L[Score resume against JD\nextract_profile → match_candidate_to_jd]

    L --> M[application_service.create\nSave to applications table]
    M --> N[FormSubmission record\nRaw audit log — immutable\nSaved to form_submissions table]
    N --> O[send_application_acknowledgement\n📧 Brevo/Resend/SMTP]
    O --> P[Return IntakeResponse\ncandidate_id · application_id\nresume_score · email_sent]

    P --> Q{Via HTML form?}
    Q -->|Yes| R[Show success message\non same HTML page]
    Q -->|No — API| S[JSON response]
```

---

## FLOWCHART 9 — Recruiter Chatbot Flow

```mermaid
flowchart TD
    A([HR types message\nPOST /chat/]) --> B[_intent detection\nRegex pattern matching]

    B --> C{Intent?}

    C -->|top/best/highest + candidate| D[_handle_top_candidates\nQuery DB · sort by final_score\nReturn top 5 with scores]

    C -->|shortlist/who to interview| E[_handle_shortlist\nStrong Hire ≥70%\nConsider 50-69%]

    C -->|stage/pipeline/breakdown| F[_handle_pipeline\nCount per stage\nASCII bar chart]

    C -->|missing skill/skill gap| G[_handle_skill_gaps\nCounter on all missing_skills\nTop 7 most common]

    C -->|decision/should hire| H[_handle_hiring_decision\nRun decision_engine.make_decision\nper candidate]

    C -->|analyze jd: text| I[_handle_jd_analysis\njd_optimizer.analyze_jd\nScore + issues + suggestions]

    C -->|interview questions for X| J[_handle_interview_questions\nTechnical + Behavioural\n+ Culture Fit template]

    C -->|offer letter/draft offer| K[_handle_offer_letter\nReady-to-fill template]

    C -->|why rejected| L[_handle_why_rejected\nRejected list with scores\nand missing skills]

    C -->|improve resume| M[_handle_improve_resume\nTop skill gaps + general tips]

    C -->|hi/hello/help| N[_handle_greeting\nCapabilities list]

    D --> Z[ChatResponse.reply\nMarkdown formatted text]
    E --> Z
    F --> Z
    G --> Z
    H --> Z
    I --> Z
    J --> Z
    K --> Z
    L --> Z
    M --> Z
    N --> Z
```

---

## FLOWCHART 10 — Frontend Navigation & State

```mermaid
flowchart TD
    subgraph PROVIDERS["Context Providers wrap entire app"]
        P1[AuthProvider\nuser · token · login · googleLogin · logout\n401 interceptor]
        P2[JobProvider\nactive job persisted in localStorage]
        P3[PipelineProvider\npipeline stage data]
    end

    A([User visits app]) --> B{isAuthenticated?}
    B -->|No| C[Landing Page /]
    C --> D[Login Page /login]
    D -->|Email/Password| E[AuthContext.login\nPOST /auth/login]
    D -->|Google button| F[Redirect to Google OAuth]
    F --> G[/auth/google/callback\nGoogleCallback.tsx\nspinner while processing]
    G --> H[AuthContext.googleLogin\nPOST /auth/google]

    E --> I[JWT stored\nNavigate to /dashboard]
    H --> I

    B -->|Yes| I

    I --> J[Dashboard\nMetrics · Score distribution\nTop candidates · AI insights]
    J --> K[Jobs Page\nCreate job · Set JD · Publish]
    K --> L[Process Resumes\nUpload PDF/DOCX\nSee profile + score]
    L --> M[Pipeline Page\nStage-grouped table\nAdvance · Reject · Offer]
    M --> N[Candidates Page\nAll candidates list]
    N --> O[Candidate Profile\nFull details · scores · links]
    M --> P[Interviews Page\nSchedule · Score rounds]

    J --> Q[RecruiterChat\nFloating widget\nalways visible when logged in]

    subgraph AXIOS["Axios API Client  services/api.ts"]
        AX1[Base URL: /api/v1]
        AX2[JWT injected in\nAuthorization header]
        AX3[401 response → clearAuth\nauto logout]
    end
```

---

## FLOWCHART 11 — Email Notification System

```mermaid
flowchart TD
    A([Email trigger event]) --> B{Which provider\nis configured?}

    B -->|BREVO_API_KEY set| C[Brevo API\nHTTP POST to api.brevo.com\nWorks behind corporate firewalls\nSends to any address]

    B -->|RESEND_API_KEY set| D[Resend API\nHTTP POST to api.resend.com\nFallback provider]

    B -->|SMTP_ENABLED=true| E[smtplib SMTP\nstarttls · login · sendmail\nOften blocked on corporate networks]

    B -->|Nothing configured| F[Log warning\nSkip silently\nReturn False]

    C --> G{Send success?}
    D --> G
    E --> G

    G -->|Yes| H[Return True\nemail_sent=True in response]
    G -->|No| I[Log error\nReturn False]

    subgraph TRIGGERS["Email Trigger Points"]
        T1[Intake form submitted\n→ Acknowledgement email]
        T2[PATCH stage to testing\n→ Test link email]
        T3[POST /reject\n→ Rejection email]
        T4[POST /offer\n→ Offer letter email]
        T5[Interview scheduled\n→ Interview invite]
    end
```

---

## FLOWCHART 12 — Database Write Flow (Complete)

```mermaid
flowchart TD
    subgraph WRITES["Every DB Write Path"]
        W1[Register user\n→ hr_users INSERT]
        W2[Create job\n→ jobs INSERT]
        W3[Upload resume + match\n→ candidates UPSERT\n→ applications UPSERT]
        W4[Intake form submit\n→ candidates UPSERT\n→ applications UPSERT\n→ form_submissions INSERT]
        W5[Advance stage\n→ applications UPDATE stage]
        W6[Record test score\n→ applications UPDATE test_score\n→ recompute final_score]
        W7[Record interview score\n→ applications UPDATE interview_score\n→ recompute final_score]
        W8[Schedule interview\n→ interviews INSERT]
        W9[Reject / Offer\n→ applications UPDATE stage+status]
    end

    subgraph FINAL_SCORE["final_score Recomputation"]
        FS1[resume_score × resume_weight]
        FS2[test_score × test_weight]
        FS3[interview_score × test_weight]
        FS4[hr_interview_score × resume_weight÷2]
        FS1 --> FS5[weighted_sum / total_weight]
        FS2 --> FS5
        FS3 --> FS5
        FS4 --> FS5
    end

    subgraph DEDUP["Candidate Deduplication"]
        D1[New submission arrives\nemail: john@gmail.com]
        D1 --> D2{SELECT WHERE\nemail=X OR phone=Y}
        D2 -->|Found| D3[UPDATE existing\nfull_name · resume_text\nlinkedin_url · phone]
        D2 -->|Not found| D4[INSERT new Candidate]
    end
```
