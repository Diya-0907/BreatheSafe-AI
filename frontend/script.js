console.log("🔥 NEW SCRIPT LOADED 🔥");

const API_URL = "http://127.0.0.1:5000";
let chart;

/* ================= THEME ================= */
function toggleTheme() {
  document.body.classList.toggle("light");
}

/* ================= POPUP SYSTEM ================= */
function showPopup(title, message, suggestion = "", confidence = 85, whyText = "") {
  const popup = document.createElement("div");
  popup.className = "popup";

  popup.innerHTML = `
    <div class="popup-card">
      <h3>${title}</h3>
      <p>${message}</p>

      <div class="confidence">
        <div class="confidence-label">Model confidence: ${confidence}%</div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width:${confidence}%"></div>
        </div>
      </div>

      ${suggestion ? `<small>${suggestion}</small>` : ""}

      ${whyText ? `
        <details class="why">
          <summary>Why this prediction?</summary>
          <p>${whyText}</p>
        </details>
      ` : ""}

      <button onclick="this.closest('.popup').remove()">Close</button>
    </div>
  `;

  document.body.appendChild(popup);
}

/* ================= DEMO AQI DATA ================= */
const AQI_DATA = {
  US: [140,145,150,155,158,160,162,170],
  IN: [120,130,138,145,150,155,158,165],
  CN: [160,165,170,175,180,185,190,200],
  GLOBAL: [100,105,110,115,120,125,130,135]
};

/* ================= AQI UI ================= */
function updateAQI(aqi) {
  document.getElementById("liveAQI").innerText = aqi;

  const fill = document.getElementById("aqiFill");
  let color = "#22c55e", status = "Good";

  if (aqi > 150) {
    color = "#ef4444";
    status = "Unhealthy";
  } else if (aqi > 100) {
    color = "#f59e0b";
    status = "Moderate";
  }

  fill.style.width = Math.min(aqi / 3, 100) + "%";
  fill.style.background = color;
  document.getElementById("aqiStatus").innerText = status;
}

/* ================= CHART ================= */
function renderChart(country = "US") {
  const ctx = document.getElementById("aqiChart");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["-6h","-5h","-4h","-3h","-2h","-1h","Now","+1d"],
      datasets: [{
        label: `AQI (${country})`,
        data: AQI_DATA[country],
        borderColor: "#38bdf8",
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#94a3b8" } }
      },
      scales: {
        x: { ticks: { color: "#94a3b8" } },
        y: { ticks: { color: "#94a3b8" } }
      }
    }
  });

  updateAQI(AQI_DATA[country].at(-2));
}

function changeCountry(country) {
  renderChart(country);
}

renderChart("US");

/* ================= LSTM AQI FORECAST ================= */
function predictAQI() {
  const raw = document.getElementById("aqiInput").value;
  const values = raw.split(",").map(Number);

  fetch(`${API_URL}/predict-aqi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aqi: values })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showPopup("❌ Error", data.error);
    } else {
      showPopup(
        "📈 AQI Forecast",
        `Predicted AQI: ${data.predicted_aqi}`,
        "Forecast based on recent AQI trends.",
        82,
        "The LSTM model analyzes the last 30 AQI values to learn temporal pollution patterns and forecast future air quality."
      );
    }
  })
  .catch(() => showPopup("❌ Error", "Backend not reachable"));
}

/* ================= RF AQI ESTIMATION ================= */
function runRFAQI() {
  const value = Number(document.getElementById("rfInput").value);
  if (Number.isNaN(value)) {
    showPopup("⚠ Invalid Input", "Please enter a numeric AQI value.");
    return;
  }

  fetch(`${API_URL}/rf-aqi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aqi: value })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showPopup("❌ Error", data.error);
    } else {
      showPopup(
        "🌫 RF AQI Estimation",
        `Estimated AQI: ${data.rf_predicted_aqi}`,
        "Regression-based AQI estimation.",
        88,
        "Random Forest combines multiple decision trees trained on AQI-related patterns to produce a robust estimation."
      );
    }
  })
  .catch(() => showPopup("❌ Error", "Backend not reachable"));
}

/* ================= SPIKE DETECTION ================= */
function detectSpike() {
  const value = Number(document.getElementById("spikeInput").value);
  if (Number.isNaN(value)) {
    showPopup("⚠ Invalid Input", "Please enter a numeric AQI value.");
    return;
  }

  fetch(`${API_URL}/detect-spike`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aqi: value })
  })
  .then(res => res.json())
  .then(data => {
    showPopup(
      data.spike ? "⚠ Pollution Spike Detected" : "✅ No Spike Detected",
      data.spike ? "Sudden abnormal AQI rise detected." : "AQI is within normal range.",
      "Isolation Forest anomaly detection.",
      75,
      "Isolation Forest isolates unusual AQI values that deviate significantly from historical pollution patterns."
    );
  })
  .catch(() => showPopup("❌ Error", "Backend not reachable"));
}

/* ================= HEALTH RISK ================= */
function checkHealth() {
  const value = Number(document.getElementById("healthInput").value);
  if (Number.isNaN(value)) {
    showPopup("⚠ Invalid Input", "Please enter a numeric AQI value.");
    return;
  }

  fetch(`${API_URL}/health-risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aqi: value })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showPopup("❌ Error", data.error);
    } else {
      showPopup(
        "🫁 Health Risk Assessment",
        data.risk_level,
        "Health advisory based on AQI standards.",
        90,
        "Health risk is classified using established AQI thresholds recommended by environmental agencies."
      );
    }
  })
  .catch(() => showPopup("❌ Error", "Backend not reachable"));
}
