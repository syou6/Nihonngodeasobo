interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

const CACHE_KEY = 'weather_cache';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Tokyo fallback coordinates
const DEFAULT_LAT = 35.6762;
const DEFAULT_LON = 139.6503;

function getCachedWeather(): WeatherData | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedWeather(data: WeatherData): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // sessionStorage may be full or unavailable
  }
}

function getUserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
      },
      { timeout: 5000 }
    );
  });
}

export async function fetchWeather(): Promise<WeatherData> {
  const cached = getCachedWeather();
  if (cached) return cached;

  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
  if (!apiKey || apiKey === 'your_openweathermap_api_key') {
    return { temp: 25, description: 'Sunny', icon: '01d' };
  }

  const { lat, lon } = await getUserLocation();

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=en`
  );

  if (!res.ok) {
    return { temp: 25, description: 'Sunny', icon: '01d' };
  }

  const json = await res.json();
  const weather: WeatherData = {
    temp: Math.round(json.main.temp),
    description: json.weather[0].description,
    icon: json.weather[0].icon,
  };

  setCachedWeather(weather);
  return weather;
}

export function getWeatherIconName(icon: string): string {
  // OpenWeatherMap icon codes -> lucide icon names
  if (icon.startsWith('01')) return 'Sun';
  if (icon.startsWith('02')) return 'CloudSun';
  if (icon.startsWith('03') || icon.startsWith('04')) return 'Cloud';
  if (icon.startsWith('09') || icon.startsWith('10')) return 'CloudRain';
  if (icon.startsWith('11')) return 'CloudLightning';
  if (icon.startsWith('13')) return 'Snowflake';
  if (icon.startsWith('50')) return 'CloudFog';
  return 'Sun';
}

export type { WeatherData };
