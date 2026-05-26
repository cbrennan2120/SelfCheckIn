// -----------------------------------------------------------------
// Self-Coach Core Application Logic: Data-First Presentation Engine
// -----------------------------------------------------------------

// Refined Seed Questions (Excluding Powerlifting)
const SEED_QUESTIONS = [
  {
    id: "q-sleep",
    title: "Sleep & Circadian Restoration",
    domain: "physical",
    type: "scale",
    prompt: "Rate your sleep duration, latency, and sleep architecture. Note any night wakefulness or early awakenings.",
    active: true,
    isDefault: true
  },
  {
    id: "q-nutrition",
    title: "Nutritional Compliance & Macros",
    domain: "nutrition",
    type: "scale",
    prompt: "Rate your overall adherence to your target macronutrients, portion sizes, and scheduled meals (10 = perfect).",
    active: true,
    isDefault: true
  },
  {
    id: "q-soreness",
    title: "Muscular Soreness & Recovery DOMS",
    domain: "physical",
    type: "scale",
    prompt: "Rate your muscle fatigue and overall tissue recovery. (10 = fully fresh/recovered, 1 = severe, debilitating DOMS).",
    active: true,
    isDefault: true
  },
  {
    id: "q-digestion",
    title: "Gastrointestinal & Gut Comfort",
    domain: "nutrition",
    type: "scale",
    prompt: "Rate your digestion comfort, absence of bloating/gas, and regular metabolic clearance.",
    active: true,
    isDefault: true
  },
  {
    id: "q-stress",
    title: "Life Stress & Cognitive Load",
    domain: "mental",
    type: "scale",
    prompt: "Rate your non-training cognitive burden, emotional stress, work pressure, and focus clarity (10 = completely calm).",
    active: true,
    isDefault: true
  },
  {
    id: "q-reflection",
    title: "Tactical Weekly Breakthroughs",
    domain: "mental",
    type: "text",
    prompt: "Detail your biggest physiological/behavioral success and specify the #1 bottleneck you must solve for next week.",
    active: true,
    isDefault: true
  }
];

// App State
let state = {
  questions: [],
  checkins: [],
  biometrics: [], // Tracks chronological: { date, timestamp, weight, hrv, rhr, glucose, bpSystolic, bpDiastolic, temp, steps, hydration, calories, caffeine, energy }
  activeView: "dashboard",
  currentDraft: {},
  currentQuestionIndex: 0,
  uploadedPhotos: []
};

// -----------------------------------------------------------------
// Initialization & Identity Listeners
// -----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupPhotoDropzone();
  setupIdentityListeners();
  renderDashboard();
  renderHistory();
  renderSettingsQuestions();
});

// Load local state initially
function loadData() {
  const savedQuestions = localStorage.getItem("selfcoach_questions_v3");
  if (savedQuestions) {
    state.questions = JSON.parse(savedQuestions);
  } else {
    state.questions = [...SEED_QUESTIONS];
    saveQuestions();
  }

  // Load from local storage as a robust fallback
  const savedCheckins = localStorage.getItem("selfcoach_checkins_v3");
  state.checkins = savedCheckins ? JSON.parse(savedCheckins) : [];

  const savedBiometrics = localStorage.getItem("selfcoach_biometrics_v3");
  if (savedBiometrics) {
    state.biometrics = JSON.parse(savedBiometrics);
  } else {
    // Seed detailed, realistic 7-day vitals database for an elite tracking profile
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    state.biometrics = [
      { timestamp: now - 6 * oneDay, date: getFormattedDate(now - 6 * oneDay), weight: 182.4, hrv: 62, rhr: 58, glucose: 95, bpSystolic: 120, bpDiastolic: 78, temp: 98.2, steps: 10200, hydration: 110, calories: 2400, caffeine: 150, energy: 7 },
      { timestamp: now - 5 * oneDay, date: getFormattedDate(now - 5 * oneDay), weight: 181.9, hrv: 65, rhr: 56, glucose: 92, bpSystolic: 118, bpDiastolic: 76, temp: 98.1, steps: 11500, hydration: 125, calories: 2550, caffeine: 200, energy: 8 },
      { timestamp: now - 4 * oneDay, date: getFormattedDate(now - 4 * oneDay), weight: 182.1, hrv: 58, rhr: 59, glucose: 98, bpSystolic: 122, bpDiastolic: 80, temp: 98.4, steps: 9800, hydration: 95, calories: 2300, caffeine: 300, energy: 6 },
      { timestamp: now - 3 * oneDay, date: getFormattedDate(now - 3 * oneDay), weight: 181.5, hrv: 70, rhr: 54, glucose: 89, bpSystolic: 115, bpDiastolic: 74, temp: 97.8, steps: 12400, hydration: 130, calories: 2600, caffeine: 150, energy: 9 },
      { timestamp: now - 2 * oneDay, date: getFormattedDate(now - 2 * oneDay), weight: 181.8, hrv: 72, rhr: 53, glucose: 91, bpSystolic: 116, bpDiastolic: 75, temp: 98.0, steps: 10800, hydration: 120, calories: 2450, caffeine: 150, energy: 8 },
      { timestamp: now - 1 * oneDay, date: getFormattedDate(now - 1 * oneDay), weight: 181.2, hrv: 68, rhr: 55, glucose: 90, bpSystolic: 117, bpDiastolic: 76, temp: 97.9, steps: 11200, hydration: 115, calories: 2500, caffeine: 100, energy: 8 },
      { timestamp: now, date: getFormattedDate(now), weight: 181.0, hrv: 75, rhr: 52, glucose: 88, bpSystolic: 114, bpDiastolic: 72, temp: 97.7, steps: 13000, hydration: 140, calories: 2700, caffeine: 150, energy: 9 }
    ];
    saveBiometrics();
  }
}

function saveQuestions() {
  localStorage.setItem("selfcoach_questions_v3", JSON.stringify(state.questions));
}

function saveCheckins() {
  localStorage.setItem("selfcoach_checkins_v3", JSON.stringify(state.checkins));
}

function saveBiometrics() {
  state.biometrics.sort((a, b) => a.timestamp - b.timestamp);
  localStorage.setItem("selfcoach_biometrics_v3", JSON.stringify(state.biometrics));
}

function getFormattedDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// -----------------------------------------------------------------
// Netlify Identity Cloud Sync
// -----------------------------------------------------------------
function setupIdentityListeners() {
  if (window.netlifyIdentity) {
    // Initial load check
    window.netlifyIdentity.on("init", user => {
      updateIdentityUI(user);
      if (user) {
        syncFromCloud(user);
      }
    });

    // Login event
    window.netlifyIdentity.on("login", user => {
      showToast("Logged in successfully!", "success");
      updateIdentityUI(user);
      syncFromCloud(user);
      window.netlifyIdentity.close();
    });

    // Logout event
    window.netlifyIdentity.on("logout", () => {
      showToast("Logged out successfully.", "info");
      updateIdentityUI(null);
      
      // Reset state and re-load local storage data
      state.checkins = [];
      state.biometrics = [];
      loadData();
      renderDashboard();
      renderHistory();
    });
  }
}

function updateIdentityUI(user) {
  const container = document.getElementById("identity-footer-container");
  if (!container) return;

  if (!user) {
    container.innerHTML = `
      <button class="btn btn-primary" onclick="window.netlifyIdentity.open()" style="width: 100%; font-size: 0.72rem; padding: 0.6rem 0.5rem; letter-spacing: 0.02em;">
        Log In / Join Cloud
      </button>
    `;
  } else {
    const email = user.email;
    const name = user.user_metadata?.full_name || email.split("@")[0];
    const initials = name.substring(0, 2).toUpperCase();
    
    container.innerHTML = `
      <div class="user-avatar" id="sidebar-avatar">${initials}</div>
      <div class="user-info" style="flex: 1; min-width: 0;">
        <span class="user-name" id="sidebar-username" style="font-size:0.75rem; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-transform:uppercase;">${name}</span>
        <a href="#" onclick="window.netlifyIdentity.logout(); return false;" style="font-size:0.68rem; color:var(--error); font-weight:900; text-transform:uppercase; text-decoration:none; margin-top:2px; display:inline-block;">Log Out</a>
      </div>
    `;
  }
}

// Fetch logs securely from Netlify Serverless API & Netlify Blobs
async function syncFromCloud(user) {
  if (!user) return;
  
  showToast("Syncing with Netlify Cloud...", "info");
  
  try {
    const token = await window.netlifyIdentity.currentUser().jwt();
    const res = await fetch("/.netlify/functions/get-logs", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 200) {
      const data = await res.json();
      
      // Override local state if cloud data has records
      if (data.checkins && data.biometrics) {
        state.checkins = data.checkins;
        state.biometrics = data.biometrics;
        
        // Back up to LocalStorage
        saveCheckins();
        saveBiometrics();
        
        renderDashboard();
        renderHistory();
        showToast("Synchronized with Cloud!", "success");
      }
    } else {
      showToast("Cloud sync failed.", "error");
    }
  } catch (err) {
    console.error("Cloud synchronization error: ", err);
    showToast("Network error syncing with cloud.", "error");
  }
}

// Push local logs securely to Netlify Serverless API & Netlify Blobs
async function syncToCloud() {
  const user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
  if (!user) {
    // If not logged in, just save locally (already handled)
    return;
  }

  try {
    const token = await user.jwt();
    const res = await fetch("/.netlify/functions/save-logs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        checkins: state.checkins,
        biometrics: state.biometrics
      })
    });

    if (res.status === 200) {
      showToast("Cloud Database Synced!", "success");
    } else {
      console.error("Save logs API failed:", await res.text());
      showToast("Could not back up to Cloud database.", "error");
    }
  } catch (err) {
    console.error("Error syncing to cloud API: ", err);
  }
}

// -----------------------------------------------------------------
// View Switching & Navigation
// -----------------------------------------------------------------
function switchView(viewId) {
  const links = document.querySelectorAll(".nav-link");
  links.forEach(link => {
    if (link.id === `nav-${viewId}`) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  const views = document.querySelectorAll(".app-view");
  views.forEach(view => {
    if (view.id === `view-${viewId}`) {
      view.classList.add("active");
    } else {
      view.classList.remove("active");
    }
  });

  state.activeView = viewId;

  if (viewId === "dashboard") {
    renderDashboard();
  } else if (viewId === "checkin") {
    startCheckinWizard();
  } else if (viewId === "history") {
    renderHistory();
  } else if (viewId === "settings") {
    renderSettingsQuestions();
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -----------------------------------------------------------------
// Comprehensive Daily Biometrics Logging
// -----------------------------------------------------------------
function saveBiometricsLog(event) {
  event.preventDefault();

  const weight = parseFloat(document.getElementById("bio-weight").value);
  const hrv = parseInt(document.getElementById("bio-hrv").value);
  const rhr = parseInt(document.getElementById("bio-rhr").value) || null;
  const glucose = parseInt(document.getElementById("bio-glucose").value) || null;
  
  const bpSystolic = parseInt(document.getElementById("bio-bp-sys").value) || null;
  const bpDiastolic = parseInt(document.getElementById("bio-bp-dia").value) || null;
  const temp = parseFloat(document.getElementById("bio-temp").value) || null;
  
  const steps = parseInt(document.getElementById("bio-steps").value) || null;
  const hydration = parseInt(document.getElementById("bio-hydra").value) || null;
  const calories = parseInt(document.getElementById("bio-cal").value) || null;
  const caffeine = parseInt(document.getElementById("bio-caff").value) || null;
  const energy = parseInt(document.getElementById("bio-energy").value) || null;

  if (isNaN(weight) || isNaN(hrv)) {
    showToast("Weight and HRV are required baseline vitals.", "error");
    return;
  }

  const now = Date.now();
  const newLog = {
    timestamp: now,
    date: getFormattedDate(now),
    weight,
    hrv,
    rhr,
    glucose,
    bpSystolic,
    bpDiastolic,
    temp,
    steps,
    hydration,
    calories,
    caffeine,
    energy
  };

  state.biometrics.push(newLog);
  saveBiometrics();
  showToast("Waking vitals log saved!", "success");

  // Sync to Netlify Blobs instantly!
  syncToCloud();

  document.getElementById("biometrics-quick-form").reset();
  renderDashboard();
}

function deleteBiometricEntry(timestamp) {
  if (confirm("Are you sure you want to delete this vital entry?")) {
    state.biometrics = state.biometrics.filter(b => b.timestamp !== timestamp);
    saveBiometrics();
    showToast("Vital entry deleted.", "info");
    
    // Sync deletion to cloud!
    syncToCloud();

    renderDashboard();
  }
}

// -----------------------------------------------------------------
// SVG High-Fidelity Data Charts Rendering
// -----------------------------------------------------------------
function drawSvgChart(containerId, dataPoints, dataKey, strokeColor, labelText, yMinOffset = 0.9, yMaxOffset = 1.1) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (dataPoints.length < 2) {
    container.innerHTML = `
      <div style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 0.9rem;">
        Log at least 2 entries to render the ${labelText} trend line.
      </div>
    `;
    return;
  }

  const values = dataPoints.map(dp => dp[dataKey]).filter(v => v !== null && v !== undefined);
  if (values.length < 2) {
    container.innerHTML = `<div style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-dim);">Insufficient data points.</div>`;
    return;
  }

  const minVal = Math.min(...values) * yMinOffset;
  const maxVal = Math.max(...values) * yMaxOffset;
  const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const width = container.clientWidth || 400;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - (paddingX * 2);
  const chartHeight = height - (paddingY * 2);

  const coords = dataPoints.map((dp, idx) => {
    const x = paddingX + (idx / (dataPoints.length - 1)) * chartWidth;
    const yVal = dp[dataKey];
    const y = paddingY + chartHeight - ((yVal - minVal) / valRange) * chartHeight;
    return { x, y, value: yVal, date: dp.date };
  });

  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    pathD += ` L ${coords[i].x} ${coords[i].y}`;
  }

  let areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

  let gridLinesHtml = "";
  const numGridLines = 3;
  for (let i = 0; i <= numGridLines; i++) {
    const y = paddingY + (i / numGridLines) * chartHeight;
    const gridVal = maxVal - (i / numGridLines) * valRange;
    gridLinesHtml += `
      <line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4" />
      <text x="${paddingX - 8}" y="${y + 4}" fill="var(--text-dim)" font-size="9" text-anchor="end">${gridVal.toFixed(1)}</text>
    `;
  }

  let elementsHtml = "";
  coords.forEach((coord, idx) => {
    const showLabel = idx === 0 || idx === coords.length - 1 || coords.length <= 5;
    const labelY = height - 8;
    
    elementsHtml += `
      <circle cx="${coord.x}" cy="${coord.y}" r="4" fill="${strokeColor}" stroke="var(--bg-card)" stroke-width="1.5" class="chart-point" data-value="${coord.value}" data-date="${coord.date}">
        <title>${labelText}: ${coord.value} (${coord.date})</title>
      </circle>
    `;

    if (showLabel) {
      elementsHtml += `
        <text x="${coord.x}" y="${labelY}" fill="var(--text-dim)" font-size="9" text-anchor="middle">${coord.date}</text>
      `;
    }
  });

  container.innerHTML = `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
      <defs>
        <linearGradient id="grad-${containerId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridLinesHtml}
      <path d="${areaD}" fill="url(#grad-${containerId})" />
      <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${elementsHtml}
    </svg>
  `;
}

// -----------------------------------------------------------------
// Settings & Custom Question Management
// -----------------------------------------------------------------
function toggleCustomInputPlaceholder() {
  const typeSelect = document.getElementById("cq-type");
  const placeholderGroup = document.getElementById("cq-placeholder-group");
  if (placeholderGroup) {
    placeholderGroup.style.display = typeSelect.value === "number" ? "block" : "none";
  }
}

function renderSettingsQuestions() {
  const container = document.getElementById("settings-questions-list");
  if (!container) return;

  container.innerHTML = "";

  state.questions.forEach((q) => {
    const card = document.createElement("div");
    card.className = `question-card-item ${q.active ? '' : 'disabled'}`;
    const badgeClass = `badge badge-${q.domain}`;
    
    let typeText = "Rating Scale (1-10)";
    if (q.type === "binary") typeText = "Yes/No Option";
    if (q.type === "number") typeText = `Raw Number (${q.placeholder || 'units'})`;
    if (q.type === "text") typeText = "Open Reflection Text";

    card.innerHTML = `
      <div class="question-info">
        <div class="question-meta">
          <span class="${badgeClass}">${q.domain}</span>
          <span class="question-type-badge">${typeText}</span>
        </div>
        <div class="question-title-text">${q.title}</div>
        <div class="question-coach-prompt">${q.prompt}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <label class="switch" title="Toggle active status">
          <input type="checkbox" ${q.active ? 'checked' : ''} onchange="toggleQuestionActive('${q.id}')">
          <span class="slider"></span>
        </label>
        ${!q.isDefault ? `
          <button class="btn btn-danger btn-sm" onclick="deleteCustomQuestion('${q.id}')" title="Delete custom question" style="padding: 0.25rem 0.5rem; border-radius: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        ` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

function toggleQuestionActive(questionId) {
  const index = state.questions.findIndex(q => q.id === questionId);
  if (index !== -1) {
    state.questions[index].active = !state.questions[index].active;
    saveQuestions();
    showToast(`${state.questions[index].active ? 'Activated' : 'Deactivated'} metric: ${state.questions[index].title}`, "info");
    renderSettingsQuestions();
  }
}

function saveCustomQuestion(event) {
  event.preventDefault();
  
  const title = document.getElementById("cq-title").value.trim();
  const domain = document.getElementById("cq-domain").value;
  const type = document.getElementById("cq-type").value;
  const placeholder = document.getElementById("cq-placeholder").value.trim() || "units";
  const prompt = document.getElementById("cq-prompt").value.trim();
  
  if (!title || !prompt) {
    showToast("Please fill in all required question details.", "error");
    return;
  }

  const newQuestion = {
    id: `q-custom-${Date.now()}`,
    title: title,
    domain: domain,
    type: type,
    prompt: prompt,
    active: true,
    isDefault: false
  };

  if (type === "number") {
    newQuestion.placeholder = placeholder;
  }

  state.questions.push(newQuestion);
  saveQuestions();
  showToast(`Custom metric "${title}" added successfully!`, "success");
  
  document.getElementById("custom-question-form").reset();
  toggleCustomInputPlaceholder();
  renderSettingsQuestions();
}

// -----------------------------------------------------------------
// Step-by-Step Check-In Wizard
// -----------------------------------------------------------------
function getActiveQuestions() {
  return state.questions.filter(q => q.active);
}

function startCheckinWizard() {
  const activeQs = getActiveQuestions();
  if (activeQs.length === 0) {
    alert("No active check-in questions found. Please activate metrics in settings.");
    switchView("settings");
    return;
  }

  state.currentDraft = {
    date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    timestamp: Date.now(),
    answers: {},
    photos: []
  };
  state.currentQuestionIndex = 0;
  state.uploadedPhotos = [];

  renderCheckinProgressBar();
  renderActiveWizardStep();
}

function cancelCheckin() {
  if (confirm("Cancel check-in? Active answers will not be saved.")) {
    switchView("dashboard");
  }
}

function renderCheckinProgressBar() {
  const bar = document.getElementById("checkin-progress-bar");
  const fill = document.getElementById("checkin-progress-fill");
  const activeQs = getActiveQuestions();
  
  if (!bar || !fill) return;

  bar.querySelectorAll(".progress-node").forEach(node => node.remove());
  fill.style.width = `0%`;

  activeQs.forEach((q, idx) => {
    const node = document.createElement("div");
    node.className = "progress-node";
    node.id = `progress-node-${idx}`;
    node.innerText = idx + 1;
    node.title = q.title;
    bar.appendChild(node);
  });
}

function updateCheckinProgressBar() {
  const activeQs = getActiveQuestions();
  const fill = document.getElementById("checkin-progress-fill");
  const total = activeQs.length;
  
  if (total <= 1) {
    fill.style.width = "100%";
  } else {
    const percent = (state.currentQuestionIndex / (total - 1)) * 100;
    fill.style.width = `${percent}%`;
  }

  activeQs.forEach((_, idx) => {
    const node = document.getElementById(`progress-node-${idx}`);
    if (!node) return;

    node.classList.remove("active", "completed");
    if (idx === state.currentQuestionIndex) {
      node.classList.add("active");
    } else if (idx < state.currentQuestionIndex) {
      node.classList.add("completed");
    }
  });
}

function renderActiveWizardStep() {
  const activeQs = getActiveQuestions();
  const currentQ = activeQs[state.currentQuestionIndex];
  if (!currentQ) return;

  const domainHeader = document.getElementById("active-coach-domain");
  const questionText = document.getElementById("active-coach-question");
  const promptDetail = document.getElementById("active-coach-prompt");

  domainHeader.innerText = currentQ.domain.charAt(0).toUpperCase() + currentQ.domain.slice(1) + " Domain";
  domainHeader.className = `coach-title badge-${currentQ.domain}`;
  questionText.innerText = currentQ.title;
  promptDetail.innerText = currentQ.prompt;

  const inputZone = document.getElementById("response-input-zone");
  inputZone.innerHTML = "";

  const savedAnswer = state.currentDraft.answers[currentQ.id] || { value: "", comment: "" };
  const inputBlock = document.createElement("div");
  inputBlock.className = "slider-container";

  if (currentQ.type === "scale") {
    const startVal = savedAnswer.value !== "" ? savedAnswer.value : 7;
    inputBlock.innerHTML = `
      <div class="slider-header">
        <label for="wizard-value-scale">Metrics Rating Scale</label>
        <span class="slider-val-box" id="scale-val-display">${startVal}</span>
      </div>
      <input type="range" id="wizard-value-scale" class="range-slider" min="1" max="10" step="1" value="${startVal}" oninput="document.getElementById('scale-val-display').innerText=this.value">
      <div class="slider-labels">
        <span>1 - Extreme Issue / Regression</span>
        <span>5 - Neutral Baseline</span>
        <span>10 - Elite Standing / Fully Recovered</span>
      </div>
    `;
  } else if (currentQ.type === "binary") {
    const activeVal = savedAnswer.value !== "" ? savedAnswer.value : "yes";
    inputBlock.innerHTML = `
      <label style="font-weight: 700; margin-bottom: 0.5rem; display:block;">Select Affirmation</label>
      <div class="binary-options">
        <button class="binary-btn ${activeVal === 'yes' ? 'active' : ''}" type="button" id="binary-yes" onclick="setBinaryWizard('yes')">Yes / Compliant</button>
        <button class="binary-btn no-btn ${activeVal === 'no' ? 'active' : ''}" type="button" id="binary-no" onclick="setBinaryWizard('no')">No / Deviation</button>
      </div>
      <input type="hidden" id="wizard-value-binary" value="${activeVal}">
    `;
  } else if (currentQ.type === "number") {
    const rawVal = savedAnswer.value !== "" ? savedAnswer.value : "";
    inputBlock.innerHTML = `
      <label for="wizard-value-number" style="font-weight: 700; margin-bottom: 0.5rem; display:block;">Logged Value</label>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <input type="number" id="wizard-value-number" class="form-input" style="flex:1;" placeholder="Enter value" value="${rawVal}" step="any">
        <span style="font-weight: 700; font-family: var(--font-display); font-size:1.1rem; padding: 0.5rem 1rem; border-radius: 8px; background-color: var(--bg-deep); border:1px solid var(--border-color);">${currentQ.placeholder || 'Units'}</span>
      </div>
    `;
  } else {
    inputBlock.innerHTML = `
      <label style="font-weight: 700; margin-bottom: 0.5rem; display:block;">Subjective Review</label>
      <p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Provide fully exhaustive notes in the notes section below.</p>
      <input type="hidden" id="wizard-value-text" value="text_entry">
    `;
  }

  inputZone.appendChild(inputBlock);

  const commentBlock = document.createElement("div");
  commentBlock.className = "form-group";
  commentBlock.style.marginTop = "1.5rem";
  commentBlock.innerHTML = `
    <label for="wizard-comment" style="font-weight:700; font-size:0.95rem; margin-bottom:0.5rem; display:block;">
      Journal Notes & Contextual Observations (Mandatory)
    </label>
    <textarea id="wizard-comment" class="form-input" placeholder="Elaborate details about sleep factors, fueling compliance, body stress, digestion triggers, or workouts..." required>${savedAnswer.comment}</textarea>
  `;
  inputZone.appendChild(commentBlock);

  if (state.currentQuestionIndex === activeQs.length - 1) {
    const mediaBlock = document.createElement("div");
    mediaBlock.className = "form-group";
    mediaBlock.style.marginTop = "2rem";
    mediaBlock.innerHTML = `
      <label style="font-weight:700; font-size:0.95rem; margin-bottom:0.75rem; display:block;">
        Weekly Progress & Body Composition Photos
      </label>
      <div class="photo-uploader" id="photo-dropzone" onclick="document.getElementById('photo-file-input').click()">
        <input type="file" id="photo-file-input" style="display:none;" accept="image/*" multiple onchange="handlePhotoSelect(event)">
        <div class="photo-uploader-icon">
          <svg viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
        <div class="photo-uploader-text">
          <h4>Drag & Drop Check-In Photos here</h4>
          <p>Click to browse. Upload progress photos, vitals logs, or meal prep sheets (max 3 images).</p>
        </div>
      </div>
      <div class="uploaded-preview-grid" id="photo-preview-grid"></div>
    `;
    inputZone.appendChild(mediaBlock);
    setupPhotoDropzone();
    renderPhotoPreviews();
  }

  const prevBtn = document.getElementById("btn-checkin-prev");
  const nextBtn = document.getElementById("btn-checkin-next");

  prevBtn.disabled = state.currentQuestionIndex === 0;

  if (state.currentQuestionIndex === activeQs.length - 1) {
    nextBtn.innerHTML = `
      File Check-In & Save
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    `;
    nextBtn.className = "btn btn-accent";
  } else {
    nextBtn.innerHTML = `
      Next Step
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    `;
    nextBtn.className = "btn btn-primary";
  }

  updateCheckinProgressBar();
}

function setBinaryWizard(val) {
  const binaryInput = document.getElementById("wizard-value-binary");
  if (!binaryInput) return;
  
  binaryInput.value = val;
  const yesBtn = document.getElementById("binary-yes");
  const noBtn = document.getElementById("binary-no");
  
  if (val === "yes") {
    yesBtn.classList.add("active");
    noBtn.classList.remove("active");
  } else {
    yesBtn.classList.remove("active");
    noBtn.classList.add("active");
  }
}

function saveDraftAnswer() {
  const activeQs = getActiveQuestions();
  const currentQ = activeQs[state.currentQuestionIndex];
  
  let val = "";
  if (currentQ.type === "scale") {
    val = document.getElementById("wizard-value-scale").value;
  } else if (currentQ.type === "binary") {
    val = document.getElementById("wizard-value-binary").value;
  } else if (currentQ.type === "number") {
    val = document.getElementById("wizard-value-number").value.trim();
  } else {
    val = "text_entry";
  }

  const comment = document.getElementById("wizard-comment").value.trim();

  state.currentDraft.answers[currentQ.id] = {
    value: val,
    comment: comment
  };
}

function prevQuestion() {
  if (state.currentQuestionIndex > 0) {
    saveDraftAnswer();
    state.currentQuestionIndex--;
    renderActiveWizardStep();
  }
}

function nextQuestion() {
  const activeQs = getActiveQuestions();
  const comment = document.getElementById("wizard-comment").value.trim();
  
  if (comment.length < 5) {
    alert("Please provide detailed comments for this metric to ensure high-fidelity logging.");
    return;
  }

  saveDraftAnswer();

  if (state.currentQuestionIndex < activeQs.length - 1) {
    state.currentQuestionIndex++;
    renderActiveWizardStep();
  } else {
    finishCheckin();
  }
}

function finishCheckin() {
  state.currentDraft.photos = [...state.uploadedPhotos];

  let scoreSum = 0;
  let scoreCount = 0;
  const activeQs = getActiveQuestions();

  activeQs.forEach(q => {
    const ans = state.currentDraft.answers[q.id];
    if (ans && q.type === "scale") {
      scoreSum += parseInt(ans.value);
      scoreCount++;
    }
  });

  const overallScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : "N/A";
  state.currentDraft.overallScore = overallScore;

  // Add comprehensive vitals snapshot to weekly check-in
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayVitals = state.biometrics.find(b => b.timestamp >= todayStart);
  if (todayVitals) {
    state.currentDraft.vitalsSnapshot = { ...todayVitals };
  } else if (state.biometrics.length > 0) {
    state.currentDraft.vitalsSnapshot = { ...state.biometrics[state.biometrics.length - 1] };
  }

  state.currentDraft.insights = generateCoachFeedback(state.currentDraft.answers, overallScore, state.currentDraft.vitalsSnapshot);
  state.currentDraft.id = `checkin-${Date.now()}`;

  state.checkins.unshift(state.currentDraft);
  saveCheckins();
  
  showToast("Weekly check-in logged and parsed successfully!", "success");
  
  // Sync full database to Netlify Blobs!
  syncToCloud();

  switchView("dashboard");
}

// -----------------------------------------------------------------
// High-Fidelity Heuristic AI Virtual Coach Feedback Generator
// -----------------------------------------------------------------
function generateCoachFeedback(answers, overallScore, vitals) {
  let insights = [];

  // 1. Overall Score Assessment
  const score = parseFloat(overallScore);
  if (!isNaN(score)) {
    if (score >= 8.5) {
      insights.push("🚀 Systemic recovery stands in an elite baseline. Physiology is highly receptive to progressive overload. Continue driving current intensity with full confidence.");
    } else if (score >= 6.5) {
      insights.push("⚖️ Physiological adaptive capacity is moderately strained. Focus on minor nutritional compliance or sleep hygiene corrections. Maintain load but avoid excessive volume spikes.");
    } else {
      insights.push("⚠️ CRITICAL RECOVERY WARNING: Systemic autonomic stress is high. CNS output and recovery baseline are compromised. Recommend a scheduled deload or a 15% reduction in training volume to prevent overreaching.");
    }
  }

  // 2. Vitals Analysis (if available)
  if (vitals) {
    // HRV analysis
    if (vitals.hrv && vitals.hrv < 55) {
      insights.push("📉 Waking HRV is depressed, indicating heightened sympathetic (fight-or-flight) nervous system dominance. Prioritize parasympathetic activation: integrate 5-10 minutes of box breathing post-training and ensure a 2-hour buffer between your last meal and sleep.");
    } else if (vitals.hrv && vitals.hrv >= 70) {
      insights.push("📈 Strong HRV baseline detected. Autonomic nervous system is highly balanced, showing excellent parasympathetic tone. Excellent window for high-intensity stimulation or maximum effort training.");
    }

    // Resting Heart Rate
    if (vitals.rhr && vitals.rhr > 60) {
      insights.push("💓 Resting Heart Rate is slightly elevated above your elite baseline. This often correlates with systemic fatigue, late-night digestion, or early immune response. Monitor closely over the next 48 hours.");
    }

    // Fasting Glucose
    if (vitals.glucose && vitals.glucose > 98) {
      insights.push("🩸 Waking glucose is elevated (>98 mg/dL). This could be driven by elevated cortisol, poor sleep quality, or a late-night carbohydrate-heavy meal. Try shifting your last meal earlier or reducing late-night carbohydrate density.");
    }

    // Blood Pressure
    if (vitals.bpSystolic && (vitals.bpSystolic > 125 || vitals.bpDiastolic > 82)) {
      insights.push("🩺 Blood Pressure shows mild elevation. Ensure adequate hydration, check electrolyte balance (sodium-to-potassium ratio), and integrate mindfulness exercises to manage systemic stress.");
    }

    // Caffeine & Sleep link
    if (vitals.caffeine && vitals.caffeine > 300) {
      const sleepAns = answers["q-sleep"];
      if (sleepAns && parseInt(sleepAns.value) < 7) {
        insights.push("☕ High daily caffeine intake (>300mg) is coupled with a lower sleep quality rating. Recommend setting a strict caffeine cutoff at 12:00 PM to prevent adenosis-receptor disruption during deep sleep stages.");
      }
    }

    // Hydration
    if (vitals.hydration && vitals.hydration < 100) {
      insights.push("💧 Daily hydration level is below the 100oz high-performance threshold. Adequate cellular hydration is critical for muscle protein synthesis, joint lubrication, and cognitive clarity. Increase fluid intake.");
    }
  }

  // 3. Subjective Domain Pillars from Answers
  const sleep = answers["q-sleep"];
  if (sleep && parseInt(sleep.value) < 6) {
    insights.push("🛌 Sleep architecture is compromised. Ensure your sleep chamber is completely dark, cool (65-68°F), and free of blue-light emitting devices 1 hour prior to sleep.");
  }

  const soreness = answers["q-soreness"];
  if (soreness && parseInt(soreness.value) < 6) {
    insights.push("💥 Elevated muscular soreness (DOMS) reported. Focus on light active recovery (e.g. 20-min low-intensity zone 1 cardio), localized heat application, and ensure daily protein intakes are hit to support tissue repair.");
  }

  const stress = answers["q-stress"];
  if (stress && parseInt(stress.value) < 6) {
    insights.push("🧠 High non-training cognitive load detected. High cortisol levels from life stressors compete directly with physical adaptation. Prioritize time-blocking, meditation, or a brief walk in nature.");
  }

  const digestion = answers["q-digestion"];
  if (digestion && parseInt(digestion.value) < 6) {
    insights.push("🦠 Digestive irregularities or discomfort reported. Audit recent food sources for potential inflammatory triggers, focus on eating slowly, and consider incorporating fermented foods or digestive enzymes.");
  }

  // Fallback if no specific insights generated
  if (insights.length === 0) {
    insights.push("✨ All tracked vital markers and subjective recovery pillars are in stable alignment. Continue with current training progressions, active nutrition protocols, and lifestyle habits.");
  }

  return insights.join("\n\n");
}

// -----------------------------------------------------------------
// Check-In Photo Upload System (Base64 compression)
// -----------------------------------------------------------------
function setupPhotoDropzone() {
  const dropzone = document.getElementById("photo-dropzone");
  if (!dropzone) return;

  ["dragenter", "dragover"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    }, false);
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    }, false);
  });

  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handlePhotos(files);
  }, false);
}

function handlePhotoSelect(event) {
  const files = event.target.files;
  handlePhotos(files);
}

function handlePhotos(files) {
  if (state.uploadedPhotos.length + files.length > 3) {
    alert("Maximum of 3 progress photos per week.");
    return;
  }

  Array.from(files).forEach(file => {
    if (!file.type.startsWith("image/")) {
      alert("Invalid format.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        state.uploadedPhotos.push(dataUrl);
        renderPhotoPreviews();
      };
    };
  });
}

function renderPhotoPreviews() {
  const grid = document.getElementById("photo-preview-grid");
  if (!grid) return;

  grid.innerHTML = "";
  state.uploadedPhotos.forEach((base64, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "preview-thumb";
    wrapper.innerHTML = `
      <img src="${base64}" alt="Check-in Photo">
      <button type="button" class="remove-thumb-btn" onclick="removeUploadedPhoto(${idx})">×</button>
    `;
    grid.appendChild(wrapper);
  });
}

function removeUploadedPhoto(idx) {
  state.uploadedPhotos.splice(idx, 1);
  renderPhotoPreviews();
}

// -----------------------------------------------------------------
// Settings & Deletion Helpers
// -----------------------------------------------------------------
function deleteCustomQuestion(questionId) {
  if (confirm("Are you sure you want to delete this custom metric?")) {
    state.questions = state.questions.filter(q => q.id !== questionId);
    saveQuestions();
    showToast("Custom metric deleted.", "info");
    renderSettingsQuestions();
  }
}

// -----------------------------------------------------------------
// Dashboard Rendering & Data Visualizations
// -----------------------------------------------------------------
function renderDashboard() {
  const totalLogs = state.checkins.length;
  document.getElementById("stat-total-checkins").innerText = totalLogs;

  let scoreSum = 0;
  let scoreCount = 0;
  let totalPhotos = 0;

  state.checkins.forEach(log => {
    totalPhotos += (log.photos ? log.photos.length : 0);
    const scoreVal = parseFloat(log.overallScore);
    if (!isNaN(scoreVal)) {
      scoreSum += scoreVal;
      scoreCount++;
    }
  });

  const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : "--";
  document.getElementById("stat-avg-score").innerText = avgScore;
  document.getElementById("stat-photos-uploaded").innerText = totalPhotos;

  // Dynamically update welcome message with logged-in user name
  const user = window.netlifyIdentity && window.netlifyIdentity.currentUser();
  if (user) {
    const name = user.user_metadata?.full_name || user.email.split("@")[0];
    document.getElementById("dashboard-welcome").innerText = `Welcome back, ${name}`;
  } else {
    document.getElementById("dashboard-welcome").innerText = "Welcome back, Athlete";
  }

  // Dynamically update latest check-in insights
  if (state.checkins.length > 0) {
    document.getElementById("dashboard-insight-text").innerText = state.checkins[0].insights;
  } else {
    document.getElementById("dashboard-insight-text").innerText = "Submit your weekly check-in or daily vitals to view performance metrics analysis.";
  }

  renderBiometricsQuickList();

  if (state.biometrics.length > 0) {
    const recentBiometrics = state.biometrics.slice(-10);
    
    drawSvgChart("weight-chart-container", recentBiometrics, "weight", "#06b6d4", "Weight (lbs/kg)", 0.995, 1.005);
    drawSvgChart("hrv-chart-container", recentBiometrics, "hrv", "#8b5cf6", "HRV (ms)", 0.9, 1.1);

    const latest = state.biometrics[state.biometrics.length - 1];

    let avgSteps = 0, avgCal = 0, avgHydra = 0, stepsCount = 0, calCount = 0, hydraCount = 0;
    
    state.biometrics.slice(-7).forEach(b => {
      if (b.steps) { avgSteps += b.steps; stepsCount++; }
      if (b.calories) { avgCal += b.calories; calCount++; }
      if (b.hydration) { avgHydra += b.hydration; hydraCount++; }
    });

    const stepsAvgVal = stepsCount > 0 ? Math.round(avgSteps / stepsCount) : "--";
    const calAvgVal = calCount > 0 ? Math.round(avgCal / calCount) : "--";
    const hydraAvgVal = hydraCount > 0 ? Math.round(avgHydra / hydraCount) : "--";

    const trendsContainer = document.getElementById("dashboard-metric-trends");
    trendsContainer.innerHTML = `
      <div class="metric-pill">
        <span>Current Weight:</span>
        <span class="metric-pill-val">${latest.weight} lbs/kg</span>
      </div>
      <div class="metric-pill">
        <span>Morning HRV:</span>
        <span class="metric-pill-val" style="color: hsl(var(--primary));">${latest.hrv} ms</span>
      </div>
      <div class="metric-pill">
        <span>Resting HR:</span>
        <span class="metric-pill-val" style="color: hsl(var(--secondary));">${latest.rhr || '--'} BPM</span>
      </div>
      ${latest.bpSystolic ? `
        <div class="metric-pill">
          <span>Blood Pressure:</span>
          <span class="metric-pill-val" style="color: hsl(var(--warning));">${latest.bpSystolic}/${latest.bpDiastolic} mmHg</span>
        </div>
      ` : ''}
      ${latest.temp ? `
        <div class="metric-pill">
          <span>Body Temp:</span>
          <span class="metric-pill-val">${latest.temp} °F/°C</span>
        </div>
      ` : ''}
      <div class="metric-pill">
        <span>7d Steps Avg:</span>
        <span class="metric-pill-val">${stepsAvgVal !== '--' ? stepsAvgVal.toLocaleString() : '--'} steps</span>
      </div>
      <div class="metric-pill">
        <span>7d Calories Avg:</span>
        <span class="metric-pill-val">${calAvgVal !== '--' ? calAvgVal.toLocaleString() : '--'} kcal</span>
      </div>
      <div class="metric-pill">
        <span>7d Hydration Avg:</span>
        <span class="metric-pill-val">${hydraAvgVal} oz/L</span>
      </div>
    `;

    if (latest.glucose) {
      trendsContainer.innerHTML += `
        <div class="metric-pill">
          <span>Morning Glucose:</span>
          <span class="metric-pill-val" style="color:${latest.glucose > 100 ? 'hsl(var(--warning))' : 'hsl(var(--success))'};">${latest.glucose} mg/dL</span>
        </div>
      `;
    }
    if (latest.caffeine !== null) {
      trendsContainer.innerHTML += `
        <div class="metric-pill">
          <span>Daily Caffeine:</span>
          <span class="metric-pill-val">${latest.caffeine} mg</span>
        </div>
      `;
    }
    if (latest.energy !== null) {
      trendsContainer.innerHTML += `
        <div class="metric-pill">
          <span>Subjective Energy:</span>
          <span class="metric-pill-val" style="color: var(--success);">${latest.energy}/10</span>
        </div>
      `;
    }

  } else {
    const name = user ? (user.user_metadata?.full_name || user.email.split("@")[0]) : "Athlete";
    document.getElementById("dashboard-welcome").innerText = `Welcome, ${name}`;
    document.getElementById("dashboard-insight-text").innerText = "Log your first weekly check-in or submit daily morning weight and HRV statistics below to view rolling baseline trends.";
  }

  renderComparativeMatrix();
}

function renderBiometricsQuickList() {
  const listContainer = document.getElementById("dashboard-biometrics-list");
  if (!listContainer) return;

  if (state.biometrics.length === 0) {
    listContainer.innerHTML = `<p style="color: var(--text-dim); font-size:0.85rem; font-style:italic;">No biometric records. Submit morning values above.</p>`;
    return;
  }

  const reverseList = [...state.biometrics].reverse().slice(0, 5);

  let html = `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left; min-width: 500px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-dim); font-weight: 600;">
            <th style="padding: 0.5rem 0;">Date</th>
            <th style="padding: 0.5rem 0;">Weight</th>
            <th style="padding: 0.5rem 0;">HRV</th>
            <th style="padding: 0.5rem 0;">BP</th>
            <th style="padding: 0.5rem 0;">Calories</th>
            <th style="padding: 0.5rem 0;">Steps</th>
            <th style="padding: 0.5rem 0; text-align:right;">Action</th>
          </tr>
        </thead>
        <tbody>
    `;

  reverseList.forEach(b => {
    const bpStr = b.bpSystolic ? `${b.bpSystolic}/${b.bpDiastolic}` : '--';
    html += `
      <tr style="border-bottom: 1px solid rgba(92, 245, 216, 0.08);">
        <td style="padding: 0.5rem 0; font-weight:600;">${b.date}</td>
        <td style="padding: 0.5rem 0;">${b.weight}</td>
        <td style="padding: 0.5rem 0; color: var(--primary); font-weight:700;">${b.hrv} ms</td>
        <td style="padding: 0.5rem 0;">${bpStr}</td>
        <td style="padding: 0.5rem 0;">${b.calories ? b.calories.toLocaleString() + ' kcal' : '--'}</td>
        <td style="padding: 0.5rem 0;">${b.steps ? b.steps.toLocaleString() : '--'}</td>
        <td style="padding: 0.5rem 0; text-align:right;">
          <button class="btn btn-danger btn-sm" onclick="deleteBiometricEntry(${b.timestamp})" style="padding: 0.15rem 0.35rem; font-size: 0.7rem; border-radius: 4px;">
            Delete
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  listContainer.innerHTML = html;
}

function renderComparativeMatrix() {
  const container = document.getElementById("dashboard-matrix-container");
  if (!container) return;

  if (state.checkins.length < 2) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align:center; color: var(--text-dim); font-size:0.9rem;">
        Log at least 2 check-ins to build a side-by-side weekly comparative data matrix.
      </div>
    `;
    return;
  }

  const recentCheckins = state.checkins.slice(0, 4);
  const activeQs = state.questions.filter(q => q.active);

  let headersHtml = `<th style="padding: 0.75rem; text-align:left;">Metrics & Pillars</th>`;
  recentCheckins.forEach(log => {
    headersHtml += `<th style="padding: 0.75rem; text-align:center;">Week of ${log.date.split(',')[0]}</th>`;
  });

  let rowsHtml = "";

  activeQs.forEach(q => {
    if (q.type !== "scale" && q.type !== "binary") return;

    rowsHtml += `
      <tr style="border-bottom: 1px solid rgba(92, 245, 216, 0.08);">
        <td style="padding: 0.75rem; font-weight: 500; font-size: 0.85rem;">
          <span class="badge badge-${q.domain}" style="font-size:0.65rem; margin-right: 0.5rem;">${q.domain}</span>
          ${q.title}
        </td>
    `;

    recentCheckins.forEach(log => {
      const ans = log.answers[q.id];
      let valStr = "--";
      let cellColor = "var(--text-muted)";

      if (ans) {
        if (q.type === "scale") {
          valStr = `${ans.value}/10`;
          const score = parseInt(ans.value);
          cellColor = score >= 8 ? "var(--success)" : score >= 5.5 ? "var(--warning)" : "var(--error)";
        } else if (q.type === "binary") {
          valStr = ans.value.toUpperCase();
          cellColor = ans.value === "yes" ? "var(--success)" : "var(--error)";
        }
      }

      rowsHtml += `<td style="padding: 0.75rem; text-align:center; font-weight:700; color: ${cellColor}; font-size: 0.85rem;">${valStr}</td>`;
    });

    rowsHtml += `</tr>`;
  });

  // Overall Score Row
  rowsHtml += `
    <tr style="border-bottom: 2px solid var(--border-color); font-weight: 700; background-color: rgba(8, 18, 25, 0.35);">
      <td style="padding: 0.75rem; font-size: 0.85rem; color: #fff;">Overall Check-In Score</td>
  `;
  recentCheckins.forEach(log => {
    rowsHtml += `<td style="padding: 0.75rem; text-align:center; font-size: 0.9rem; color: var(--secondary);">${log.overallScore}/10</td>`;
  });
  rowsHtml += `</tr>`;

  // Weight snapshots
  rowsHtml += `
    <tr style="border-bottom: 1px solid rgba(92, 245, 216, 0.08); font-weight: 500;">
      <td style="padding: 0.75rem; font-size: 0.85rem; color: var(--text-muted);">Biometric Body Weight</td>
  `;
  recentCheckins.forEach(log => {
    const wt = log.vitalsSnapshot ? `${log.vitalsSnapshot.weight} lbs/kg` : "Not Filed";
    rowsHtml += `<td style="padding: 0.75rem; text-align:center; font-size: 0.85rem;">${wt}</td>`;
  });
  rowsHtml += `</tr>`;

  // HRV snapshots
  rowsHtml += `
    <tr style="border-bottom: 1px solid rgba(92, 245, 216, 0.08); font-weight: 500;">
      <td style="padding: 0.75rem; font-size: 0.85rem; color: var(--text-muted);">Morning HRV RMSSD</td>
  `;
  recentCheckins.forEach(log => {
    const hrv = log.vitalsSnapshot ? `${log.vitalsSnapshot.hrv} ms` : "Not Filed";
    rowsHtml += `<td style="padding: 0.75rem; text-align:center; font-size: 0.85rem; color: var(--primary); font-weight:700;">${hrv}</td>`;
  });
  rowsHtml += `</tr>`;

  // BP snapshots
  rowsHtml += `
    <tr style="border-bottom: 1px solid rgba(92, 245, 216, 0.08); font-weight: 500;">
      <td style="padding: 0.75rem; font-size: 0.85rem; color: var(--text-muted);">Blood Pressure Snapshot</td>
  `;
  recentCheckins.forEach(log => {
    const bp = log.vitalsSnapshot && log.vitalsSnapshot.bpSystolic ? `${log.vitalsSnapshot.bpSystolic}/${log.vitalsSnapshot.bpDiastolic} mmHg` : "--";
    rowsHtml += `<td style="padding: 0.75rem; text-align:center; font-size: 0.85rem;">${bp}</td>`;
  });
  rowsHtml += `</tr>`;

  // Calories snapshots
  rowsHtml += `
    <tr style="border-bottom: 1px solid rgba(92, 245, 216, 0.08); font-weight: 500;">
      <td style="padding: 0.75rem; font-size: 0.85rem; color: var(--text-muted);">Caloric Intake snapshot</td>
  `;
  recentCheckins.forEach(log => {
    const cal = log.vitalsSnapshot && log.vitalsSnapshot.calories ? `${log.vitalsSnapshot.calories.toLocaleString()} kcal` : "--";
    rowsHtml += `<td style="padding: 0.75rem; text-align:center; font-size: 0.85rem;">${cal}</td>`;
  });
  rowsHtml += `</tr>`;

  // Steps snapshots
  rowsHtml += `
    <tr style="font-weight: 500;">
      <td style="padding: 0.75rem; font-size: 0.85rem; color: var(--text-muted);">Activity Level (Steps)</td>
  `;
  recentCheckins.forEach(log => {
    const steps = log.vitalsSnapshot && log.vitalsSnapshot.steps ? log.vitalsSnapshot.steps.toLocaleString() : "--";
    rowsHtml += `<td style="padding: 0.75rem; text-align:center; font-size: 0.85rem;">${steps}</td>`;
  });
  rowsHtml += `</tr>`;

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
      <thead>
        <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-dim); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing:0.03em;">
          ${headersHtml}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

// -----------------------------------------------------------------
// History Rendering & Detail Modals
// -----------------------------------------------------------------
function renderHistory() {
  const container = document.getElementById("logs-list-container");
  if (!container) return;

  if (state.checkins.length === 0) {
    container.innerHTML = `
      <div class="glass-card empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h3>No Check-Ins Logged Yet</h3>
        <p>Build consistency. Complete your first weekly questionnaire to populate your high-level log blog.</p>
        <button class="btn btn-primary" onclick="switchView('checkin')">Begin First Check-In</button>
      </div>
    `;
    return;
  }

  let html = `<div class="logs-grid">`;

  state.checkins.forEach((log) => {
    let summaryText = "";
    Object.keys(log.answers).forEach(qId => {
      const q = state.questions.find(quest => quest.id === qId);
      if (q && q.type === "text") {
        summaryText += log.answers[qId].comment + " ";
      }
    });

    if (!summaryText) {
      summaryText = "Data metrics logged correctly. recovery analysis processed.";
    }

    const scoreStr = log.overallScore !== "N/A" ? `${log.overallScore}/10` : "Logged";

    let mediaPreviewHtml = "";
    if (log.photos && log.photos.length > 0) {
      mediaPreviewHtml = `<div class="log-media-prev">`;
      log.photos.forEach(photo => {
        mediaPreviewHtml += `<img src="${photo}" class="log-media-prev-img" alt="Weekly Photo">`;
      });
      mediaPreviewHtml += `</div>`;
    }

    html += `
      <div class="glass-card log-card" onclick="openLogModal('${log.id}')">
        <div class="log-card-header">
          <span class="log-date">${log.date}</span>
          <span class="log-score-badge">${scoreStr}</span>
        </div>
        <p class="log-summary-text">${summaryText}</p>
        ${mediaPreviewHtml}
        <div class="log-footer">
          <span>${log.photos ? log.photos.length : 0} photos attached</span>
          <span style="color: var(--secondary); font-weight:700;">View Details &rarr;</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function openLogModal(logId) {
  const log = state.checkins.find(l => l.id === logId);
  if (!log) return;

  state.selectedLogId = logId;

  document.getElementById("modal-log-date").innerText = `Check-In: Week of ${log.date}`;
  const scoreDisplay = log.overallScore !== "N/A" ? `${log.overallScore}/10` : "Metrics Filed";
  document.getElementById("modal-log-subtitle").innerHTML = `Overall Check-In Score: <span id="modal-log-score" style="font-weight:700; color:var(--secondary);">${scoreDisplay}</span>`;

  const modalBody = document.getElementById("modal-log-body");
  modalBody.innerHTML = "";

  const leftCol = document.createElement("div");
  leftCol.className = "log-modal-responses";

  Object.keys(log.answers).forEach(qId => {
    const q = state.questions.find(quest => quest.id === qId);
    if (!q) return;

    const answer = log.answers[qId];
    const item = document.createElement("div");
    item.className = "modal-response-item";
    item.style.borderLeftColor = `hsl(var(--${q.domain === 'vitals' ? 'secondary' : q.domain === 'nutrition' ? 'warning' : 'primary'}))`;

    let valDisplay = "";
    if (q.type === "scale") valDisplay = `Rating: ${answer.value}/10`;
    else if (q.type === "binary") valDisplay = `Answer: ${answer.value.toUpperCase()}`;
    else if (q.type === "number") valDisplay = `Recorded Value: ${answer.value} ${q.placeholder || ''}`;
    else valDisplay = "Text-Only Reflection";

    item.innerHTML = `
      <div class="modal-response-title">${q.title}</div>
      <div class="modal-response-score">${valDisplay}</div>
      <div class="modal-response-text">${answer.comment || 'No notes compiled.'}</div>
    `;
    leftCol.appendChild(item);
  });

  const rightCol = document.createElement("div");
  rightCol.className = "log-modal-sidebar";

  if (log.vitalsSnapshot) {
    const bioSnapCard = document.createElement("div");
    bioSnapCard.className = "coach-notes-card";
    bioSnapCard.style.borderColor = "rgba(92, 245, 216, 0.22)";
    bioSnapCard.style.background = "var(--secondary-glow)";
    
    let snapListHtml = `
      <li><strong>Weight:</strong> ${log.vitalsSnapshot.weight} lbs/kg</li>
      <li><strong>HRV RMSSD:</strong> <span style="color: var(--secondary); font-weight:700;">${log.vitalsSnapshot.hrv} ms</span></li>
    `;
    if (log.vitalsSnapshot.rhr) snapListHtml += `<li><strong>Resting Heart Rate:</strong> ${log.vitalsSnapshot.rhr} BPM</li>`;
    if (log.vitalsSnapshot.bpSystolic) snapListHtml += `<li><strong>Blood Pressure:</strong> ${log.vitalsSnapshot.bpSystolic}/${log.vitalsSnapshot.bpDiastolic} mmHg</li>`;
    if (log.vitalsSnapshot.temp) snapListHtml += `<li><strong>Body Temp:</strong> ${log.vitalsSnapshot.temp} °F/°C</li>`;
    if (log.vitalsSnapshot.steps) snapListHtml += `<li><strong>Daily Steps:</strong> ${log.vitalsSnapshot.steps.toLocaleString()}</li>`;
    if (log.vitalsSnapshot.calories) snapListHtml += `<li><strong>Calories Logged:</strong> ${log.vitalsSnapshot.calories.toLocaleString()} kcal</li>`;
    if (log.vitalsSnapshot.hydration) snapListHtml += `<li><strong>Hydration Level:</strong> ${log.vitalsSnapshot.hydration} oz/L</li>`;
    if (log.vitalsSnapshot.caffeine !== null && log.vitalsSnapshot.caffeine !== undefined) snapListHtml += `<li><strong>Caffeine Intake:</strong> ${log.vitalsSnapshot.caffeine} mg</li>`;
    if (log.vitalsSnapshot.energy) snapListHtml += `<li><strong>Waking Readiness:</strong> ${log.vitalsSnapshot.energy}/10</li>`;

    bioSnapCard.innerHTML = `
      <h4 style="color: var(--secondary); font-size: 0.95rem; font-weight:700; margin-bottom: 0.75rem;">Weekly Vitals Snapshot</h4>
      <ul style="list-style:none; font-size: 0.85rem; display: flex; flex-direction:column; gap:0.5rem;">
        ${snapListHtml}
      </ul>
    `;
    rightCol.appendChild(bioSnapCard);
  }

  const notesCard = document.createElement("div");
  notesCard.className = "coach-notes-card";
  notesCard.innerHTML = `
    <h4>Biometric Adaptation Warnings</h4>
    <p style="font-size:0.92rem; line-height:1.6; white-space: pre-line;">${log.insights}</p>
  `;
  rightCol.appendChild(notesCard);

  if (log.photos && log.photos.length > 0) {
    const photosCard = document.createElement("div");
    photosCard.className = "photo-gallery-card";
    photosCard.innerHTML = `
      <h4 style="font-size: 0.95rem; font-weight:700;">Check-In Media Logs</h4>
      <div class="photo-gallery-grid">
        ${log.photos.map(p => `
          <div class="gallery-image-wrapper" onclick="window.open('${p}')">
            <img src="${p}" alt="Weekly composition photo">
          </div>
        `).join('')}
      </div>
    `;
    rightCol.appendChild(photosCard);
  }

  modalBody.appendChild(leftCol);
  modalBody.appendChild(rightCol);

  const modal = document.getElementById("log-details-modal");
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeLogModal() {
  const modal = document.getElementById("log-details-modal");
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

// -----------------------------------------------------------------
// Sharing & Export System (Drawer options)
// -----------------------------------------------------------------
function openExportDrawer() {
  document.getElementById("export-drawer").classList.add("active");
}

function closeExportDrawer() {
  document.getElementById("export-drawer").classList.remove("active");
}

function generateMarkdownReport(log) {
  let md = `# WEEKLY PERFORMANCE & METRICS CHECK-IN\n`;
  md += `**Date**: Week of ${log.date}\n`;
  md += `**Overall Score**: ${log.overallScore !== 'N/A' ? log.overallScore + '/10' : 'Logged'}\n`;
  
  if (log.vitalsSnapshot) {
    md += `\n### [Vitals Snapshot]\n`;
    md += `* **Body Weight**: ${log.vitalsSnapshot.weight} lbs/kg\n`;
    md += `* **Morning HRV**: ${log.vitalsSnapshot.hrv} ms\n`;
    if (log.vitalsSnapshot.rhr) md += `* **Resting Heart Rate**: ${log.vitalsSnapshot.rhr} BPM\n`;
    if (log.vitalsSnapshot.bpSystolic) md += `* **Blood Pressure**: ${log.vitalsSnapshot.bpSystolic}/${log.vitalsSnapshot.bpDiastolic} mmHg\n`;
    if (log.vitalsSnapshot.temp) md += `* **Basal Temperature**: ${log.vitalsSnapshot.temp} °F/°C\n`;
    if (log.vitalsSnapshot.steps) md += `* **Daily Steps**: ${log.vitalsSnapshot.steps.toLocaleString()}\n`;
    if (log.vitalsSnapshot.calories) md += `* **Caloric Intake**: ${log.vitalsSnapshot.calories.toLocaleString()} kcal\n`;
    if (log.vitalsSnapshot.hydration) md += `* **Hydration Level**: ${log.vitalsSnapshot.hydration} oz/L\n`;
    if (log.vitalsSnapshot.caffeine !== null && log.vitalsSnapshot.caffeine !== undefined) md += `* **Caffeine Intake**: ${log.vitalsSnapshot.caffeine} mg\n`;
    if (log.vitalsSnapshot.energy) md += `* **Waking Energy**: ${log.vitalsSnapshot.energy}/10\n`;
  }
  md += `\n=========================================\n\n`;

  Object.keys(log.answers).forEach(qId => {
    const q = state.questions.find(quest => quest.id === qId);
    if (!q) return;

    const answer = log.answers[qId];
    let valDisplay = "";
    if (q.type === "scale") valDisplay = `${answer.value}/10`;
    else if (q.type === "binary") valDisplay = answer.value.toUpperCase();
    else if (q.type === "number") valDisplay = `${answer.value} ${q.placeholder || ''}`;
    else valDisplay = "Reflection Entry";

    md += `### [${q.domain.toUpperCase()}] ${q.title}\n`;
    md += `* **Value**: ${valDisplay}\n`;
    md += `* **Journal Note**: ${answer.comment || 'N/A'}\n\n`;
  });

  md += `=========================================\n`;
  md += `### BIOMETRIC TREND ANALYSIS\n`;
  md += `${log.insights}\n\n`;
  md += `*Self-Coach System Report.*`;

  return md;
}

function triggerCopyClipboard() {
  const log = state.checkins.find(l => l.id === state.selectedLogId);
  if (!log) return;

  const reportText = generateMarkdownReport(log);
  navigator.clipboard.writeText(reportText).then(() => {
    showToast("Markdown report copied to clipboard!", "success");
    closeExportDrawer();
  }).catch(err => {
    showToast("Clipboard blocked.", "error");
  });
}

function triggerTextDownload() {
  const log = state.checkins.find(l => l.id === state.selectedLogId);
  if (!log) return;

  const reportText = generateMarkdownReport(log);
  const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `SelfCoach-Report-${log.date.replace(/[^a-z0-9]/gi, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Check-in report download initiated!", "success");
  closeExportDrawer();
}

function triggerPdfExport() {
  closeExportDrawer();
  showToast("Rendering Print Layout...", "info");
  setTimeout(() => {
    window.print();
  }, 350);
}

// -----------------------------------------------------------------
// Native Toasts System
// -----------------------------------------------------------------
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let iconHtml = "";
  if (type === "success") {
    iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === "error") {
    iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else {
    iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `
    ${iconHtml}
    <span style="font-weight: 500; font-size: 0.9rem;">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("active");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("active");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}
