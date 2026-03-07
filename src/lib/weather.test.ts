import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWeather, getWeatherIconName } from './weather';

describe('getWeatherIconName', () => {
  it('returns Sun for clear sky (01d/01n)', () => {
    expect(getWeatherIconName('01d')).toBe('Sun');
    expect(getWeatherIconName('01n')).toBe('Sun');
  });

  it('returns CloudSun for few clouds (02d/02n)', () => {
    expect(getWeatherIconName('02d')).toBe('CloudSun');
    expect(getWeatherIconName('02n')).toBe('CloudSun');
  });

  it('returns Cloud for scattered/broken clouds (03/04)', () => {
    expect(getWeatherIconName('03d')).toBe('Cloud');
    expect(getWeatherIconName('04d')).toBe('Cloud');
  });

  it('returns CloudRain for rain (09/10)', () => {
    expect(getWeatherIconName('09d')).toBe('CloudRain');
    expect(getWeatherIconName('10n')).toBe('CloudRain');
  });

  it('returns CloudLightning for thunderstorm (11)', () => {
    expect(getWeatherIconName('11d')).toBe('CloudLightning');
  });

  it('returns Snowflake for snow (13)', () => {
    expect(getWeatherIconName('13d')).toBe('Snowflake');
  });

  it('returns CloudFog for mist (50)', () => {
    expect(getWeatherIconName('50d')).toBe('CloudFog');
  });

  it('returns Sun for unknown icon code', () => {
    expect(getWeatherIconName('99x')).toBe('Sun');
    expect(getWeatherIconName('')).toBe('Sun');
  });
});

describe('fetchWeather', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();

    // Reset import.meta.env mock
    vi.stubEnv('VITE_WEATHER_API_KEY', '');
  });

  it('returns default weather when no API key configured', async () => {
    vi.stubEnv('VITE_WEATHER_API_KEY', '');

    const result = await fetchWeather();
    expect(result).toEqual({ temp: 25, description: 'Sunny', icon: '01d' });
  });

  it('returns default weather when API key is placeholder', async () => {
    vi.stubEnv('VITE_WEATHER_API_KEY', 'your_openweathermap_api_key');

    const result = await fetchWeather();
    expect(result).toEqual({ temp: 25, description: 'Sunny', icon: '01d' });
  });

  it('returns cached weather if available', async () => {
    const cached = { temp: 15, description: 'Cloudy', icon: '03d' };
    sessionStorage.setItem(
      'weather_cache',
      JSON.stringify({ data: cached, timestamp: Date.now() })
    );

    const result = await fetchWeather();
    expect(result).toEqual(cached);
  });

  it('ignores expired cache', async () => {
    const cached = { temp: 15, description: 'Cloudy', icon: '03d' };
    const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
    sessionStorage.setItem(
      'weather_cache',
      JSON.stringify({ data: cached, timestamp: thirtyOneMinutesAgo })
    );

    vi.stubEnv('VITE_WEATHER_API_KEY', '');

    const result = await fetchWeather();
    // No API key, so returns default
    expect(result).toEqual({ temp: 25, description: 'Sunny', icon: '01d' });
  });

  it('fetches weather from API when key is set', async () => {
    vi.stubEnv('VITE_WEATHER_API_KEY', 'real_api_key');

    // Mock navigator.geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({ coords: { latitude: 35.68, longitude: 139.65 } });
      }),
    };
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });

    // Mock fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          main: { temp: 22.4 },
          weather: [{ description: 'clear sky', icon: '01d' }],
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchWeather();
    expect(result).toEqual({ temp: 22, description: 'clear sky', icon: '01d' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.openweathermap.org')
    );
  });

  it('returns default weather when API returns non-ok response', async () => {
    vi.stubEnv('VITE_WEATHER_API_KEY', 'real_api_key');

    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({ coords: { latitude: 35.68, longitude: 139.65 } });
      }),
    };
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const result = await fetchWeather();
    expect(result).toEqual({ temp: 25, description: 'Sunny', icon: '01d' });
  });

  it('uses Tokyo fallback when geolocation is not available', async () => {
    vi.stubEnv('VITE_WEATHER_API_KEY', 'real_api_key');

    // Remove geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            main: { temp: 20 },
            weather: [{ description: 'clouds', icon: '03d' }],
          }),
      })
    );

    const result = await fetchWeather();
    expect(result.temp).toBe(20);

    // Verify Tokyo coordinates were used
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('lat=35.6762')
    );
  });

  it('uses Tokyo fallback when geolocation errors', async () => {
    vi.stubEnv('VITE_WEATHER_API_KEY', 'real_api_key');

    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) => {
        error(new Error('denied'));
      }),
    };
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            main: { temp: 18 },
            weather: [{ description: 'rain', icon: '10d' }],
          }),
      })
    );

    const result = await fetchWeather();
    expect(result.temp).toBe(18);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('lat=35.6762')
    );
  });

  it('caches successful weather response in sessionStorage', async () => {
    vi.stubEnv('VITE_WEATHER_API_KEY', 'real_api_key');

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success) => {
          success({ coords: { latitude: 35.68, longitude: 139.65 } });
        }),
      },
      writable: true,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            main: { temp: 25 },
            weather: [{ description: 'sunny', icon: '01d' }],
          }),
      })
    );

    await fetchWeather();

    const cached = sessionStorage.getItem('weather_cache');
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached!);
    expect(parsed.data.temp).toBe(25);
  });

  it('handles corrupted cache gracefully', async () => {
    sessionStorage.setItem('weather_cache', 'not json');
    vi.stubEnv('VITE_WEATHER_API_KEY', '');

    const result = await fetchWeather();
    expect(result).toEqual({ temp: 25, description: 'Sunny', icon: '01d' });
  });
});
