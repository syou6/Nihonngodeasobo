#!/usr/bin/env node
// GA4 Data API puller for eyecare.love
// Usage: node scripts/analytics.mjs [--days=90]
//
// Required env:
//   GA_PROPERTY_ID         e.g. 500348138
//   GOOGLE_APPLICATION_CREDENTIALS path to service account JSON
//
// Outputs JSON to ./analytics-data/<timestamp>/*.json + prints summary

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const PROPERTY_ID = process.env.GA_PROPERTY_ID;
if (!PROPERTY_ID) {
  console.error('Missing GA_PROPERTY_ID env var');
  process.exit(1);
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn(
    '[info] GOOGLE_APPLICATION_CREDENTIALS not set — falling back to Application Default Credentials.\n' +
      '       Run `gcloud auth application-default login` if you have not already.',
  );
}

const daysArg = process.argv.find((a) => a.startsWith('--days='));
const DAYS = daysArg ? Number(daysArg.split('=')[1]) : 90;
const DATE_RANGE = [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }];

const client = new BetaAnalyticsDataClient();
const property = `properties/${PROPERTY_ID}`;

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = resolve(`./analytics-data/${ts}`);
await mkdir(outDir, { recursive: true });

const reports = {
  trafficAcquisition: {
    dimensions: [
      { name: 'sessionDefaultChannelGroup' },
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'engagedSessions' },
      { name: 'averageSessionDuration' },
      { name: 'engagementRate' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 50,
  },
  pages: {
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'totalUsers' },
      { name: 'userEngagementDuration' },
      { name: 'bounceRate' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 50,
  },
  geo: {
    dimensions: [{ name: 'country' }, { name: 'language' }],
    metrics: [
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'engagementRate' },
    ],
    orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
    limit: 100,
  },
  tech: {
    dimensions: [
      { name: 'deviceCategory' },
      { name: 'operatingSystem' },
      { name: 'browser' },
    ],
    metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'engagementRate' }],
    orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
    limit: 50,
  },
  events: {
    dimensions: [{ name: 'eventName' }],
    metrics: [
      { name: 'eventCount' },
      { name: 'totalUsers' },
      { name: 'eventCountPerUser' },
    ],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 50,
  },
  dailyTrend: {
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'engagementRate' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
    limit: 400,
  },
};

function rowsToJson(response) {
  const dimHeaders = response.dimensionHeaders?.map((h) => h.name) ?? [];
  const metHeaders = response.metricHeaders?.map((h) => h.name) ?? [];
  return (
    response.rows?.map((row) => {
      const obj = {};
      dimHeaders.forEach((h, i) => {
        obj[h] = row.dimensionValues?.[i]?.value;
      });
      metHeaders.forEach((h, i) => {
        const v = row.metricValues?.[i]?.value;
        obj[h] = v && !isNaN(Number(v)) ? Number(v) : v;
      });
      return obj;
    }) ?? []
  );
}

async function runReport(name, spec) {
  try {
    const [response] = await client.runReport({
      property,
      dateRanges: DATE_RANGE,
      ...spec,
    });
    const rows = rowsToJson(response);
    await writeFile(join(outDir, `${name}.json`), JSON.stringify(rows, null, 2));
    console.log(`✓ ${name}: ${rows.length} rows`);
    return rows;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    return [];
  }
}

async function runRealtime() {
  try {
    const [response] = await client.runRealtimeReport({
      property,
      dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 50,
    });
    const rows = rowsToJson(response);
    await writeFile(join(outDir, 'realtime.json'), JSON.stringify(rows, null, 2));
    const total = rows.reduce((sum, r) => sum + (r.activeUsers ?? 0), 0);
    console.log(`✓ realtime: ${total} active users (last 30 min)`);
    return { rows, total };
  } catch (err) {
    console.error(`✗ realtime: ${err.message}`);
    return { rows: [], total: 0 };
  }
}

console.log(`GA4 property ${PROPERTY_ID}, last ${DAYS} days → ${outDir}\n`);

const results = {};
for (const [name, spec] of Object.entries(reports)) {
  results[name] = await runReport(name, spec);
}
const rt = await runRealtime();

// Summary
console.log('\n=== SUMMARY ===');
const totals = results.dailyTrend.reduce(
  (acc, d) => ({
    users: acc.users + (d.totalUsers ?? 0),
    sessions: acc.sessions + (d.sessions ?? 0),
    pageviews: acc.pageviews + (d.screenPageViews ?? 0),
  }),
  { users: 0, sessions: 0, pageviews: 0 },
);
console.log(`Last ${DAYS}d  users=${totals.users}  sessions=${totals.sessions}  pageviews=${totals.pageviews}`);
console.log(`Top country: ${results.geo[0]?.country ?? 'n/a'} (${results.geo[0]?.totalUsers ?? 0} users)`);
console.log(`Top channel: ${results.trafficAcquisition[0]?.sessionDefaultChannelGroup ?? 'n/a'} (${results.trafficAcquisition[0]?.sessions ?? 0} sessions)`);
console.log(`Top event: ${results.events[0]?.eventName ?? 'n/a'} (${results.events[0]?.eventCount ?? 0})`);
console.log(`Realtime active: ${rt.total}`);
console.log(`\nJSON dumped to: ${outDir}`);
