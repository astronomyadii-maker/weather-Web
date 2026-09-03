const API_KEY = "fa9b2a4ed8434273a0c32321260707";
const API_URL = "https://api.weatherapi.com/v1/current.json";

const form = document.getElementById("searchForm");
const input = document.getElementById("cityInput");
const statusEl = document.getElementById("status");
const result = document.getElementById("result");
const sky = document.getElementById("sky");
const clock = document.getElementById("localClock");

// Sky palettes keyed by a simplified condition + day/night.
// Signature touch: the whole page's backdrop shifts to match the real sky.
const PALETTES = {
  "clear-day":    { a: "#5fb3e8", b: "#eaf6ee", sun: "#ffd889" },
  "clear-night":  { a: "#0e1a3a", b: "#26305c", sun: "#c9d4f2" },
  "cloudy-day":   { a: "#8fa3b3", b: "#dfe6e8", sun: "#e7ecef" },
  "cloudy-night": { a: "#141c2c", b: "#2c3446", sun: "#5a6580" },
  "rain-day":     { a: "#48566a", b: "#c7d1d6", sun: "#9aa7b5" },
  "rain-night":   { a: "#0a0f1c", b: "#212a3d", sun: "#3c465e" },
  "snow-day":     { a: "#aebfd1", b: "#f5f8fb", sun: "#ffffff" },
  "snow-night":   { a: "#131b30", b: "#3a4562", sun: "#dce4f2" },
  "storm":        { a: "#232a3a", b: "#4b4f5c", sun: "#8b8fa0" }
};

function paletteKey(conditionText, isDay){
  const t = conditionText.toLowerCase();
  const phase = isDay ? "day" : "night";
  if (t.includes("thunder")) return "storm";
  if (t.includes("snow") || t.includes("sleet") || t.includes("ice")) return `snow-${phase}`;
  if (t.includes("rain") || t.includes("drizzle")) return `rain-${phase}`;
  if (t.includes("cloud") || t.includes("overcast") || t.includes("mist") || t.includes("fog")) return `cloudy-${phase}`;
  return `clear-${phase}`;
}

function applySky(conditionText, isDay){
  const key = paletteKey(conditionText, isDay);
  const p = PALETTES[key] || PALETTES["clear-day"];
  sky.style.setProperty("--sky-a", p.a);
  sky.style.setProperty("--sky-b", p.b);
  sky.style.setProperty("--sun", p.sun);
}

function setStatus(message, tone){
  statusEl.textContent = message || "";
  if (tone) statusEl.setAttribute("data-tone", tone);
  else statusEl.removeAttribute("data-tone");
}

function aqiLabel(usEpaIndex){
  const labels = ["—", "Good", "Moderate", "Unhealthy (sensitive)", "Unhealthy", "Very unhealthy", "Hazardous"];
  return labels[usEpaIndex] || "—";
}

function updateLocalClock(localtime){
  // localtime looks like "2026-07-07 14:32"
  const timePart = localtime.split(" ")[1] || "--:--";
  clock.textContent = timePart;
}

async function fetchWeather(city){
  const url = `${API_URL}?key=${API_KEY}&q=${encodeURIComponent(city)}&aqi=yes`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok){
    const message = (data && data.error && data.error.message) || "Couldn't find that place.";
    throw new Error(message);
  }
  return data;
}

function renderWeather(data){
  const { location, current } = data;

  document.getElementById("cityName").textContent = location.name;
  document.getElementById("regionCountry").textContent =
    [location.region, location.country].filter(Boolean).join(", ");
  document.getElementById("updatedAt").textContent = `As of ${current.last_updated.split(" ")[1]}`;

  const icon = document.getElementById("conditionIcon");
  icon.src = current.condition.icon.startsWith("http")
    ? current.condition.icon
    : `https:${current.condition.icon}`;
  icon.alt = current.condition.text;

  document.getElementById("tempC").textContent = `${Math.round(current.temp_c)}°`;
  document.getElementById("conditionText").textContent = current.condition.text;
  document.getElementById("feelsLike").textContent = `Feels like ${Math.round(current.feelslike_c)}°C`;

  document.getElementById("wind").textContent = `${current.wind_kph} kph ${current.wind_dir}`;
  document.getElementById("humidity").textContent = `${current.humidity}%`;
  document.getElementById("uv").textContent = current.uv;

  const usEpa = current.air_quality && current.air_quality["us-epa-index"];
  document.getElementById("aqi").textContent = aqiLabel(usEpa);

  updateLocalClock(location.localtime);
  applySky(current.condition.text, current.is_day === 1);

  result.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = input.value.trim();
  if (!city) return;

  setStatus("Checking the sky over " + city + " …");
  document.getElementById("searchBtn").disabled = true;

  try {
    const data = await fetchWeather(city);
    renderWeather(data);
    setStatus("");
  } catch (err) {
    result.hidden = true;
    setStatus(err.message || "Something went wrong. Try again.", "error");
  } finally {
    document.getElementById("searchBtn").disabled = false;
  }
});

// Load a default city on first visit so the page isn't empty.
window.addEventListener("DOMContentLoaded", () => {
  input.value = "London";
  form.dispatchEvent(new Event("submit"));
});