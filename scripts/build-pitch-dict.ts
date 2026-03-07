#!/usr/bin/env tsx
/**
 * Downloads Kanjium accents.txt and converts it to a compact JSON file
 * at public/pitch-accents.json for use in the pitch accent feature.
 *
 * Input TSV format: word\treading\taccent_number
 * Output JSON format: { "word": [{ "r": "reading", "p": accentNumber }], ... }
 */

import * as fs from 'fs';
import * as https from 'https';
import * as readline from 'readline';
import * as path from 'path';

const SOURCE_URL =
  'https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt';

const OUTPUT_PATH = path.resolve(process.cwd(), 'public/pitch-accents.json');

type AccentEntry = { r: string; p: number };
type AccentDict = Record<string, AccentEntry[]>;

function downloadToStream(url: string): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const location = response.headers.location;
        if (!location) {
          reject(new Error('Redirect with no location header'));
          return;
        }
        downloadToStream(location).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode ?? 'unknown'} from ${url}`));
        return;
      }
      resolve(response);
    }).on('error', reject);
  });
}

async function buildDict(stream: NodeJS.ReadableStream): Promise<AccentDict> {
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const dict: AccentDict = {};
  let lineCount = 0;
  let skipped = 0;

  for await (const line of rl) {
    lineCount++;
    const parts = line.split('\t');
    if (parts.length < 3) {
      skipped++;
      continue;
    }

    const [word, reading, accentRaw] = parts;
    const p = parseInt(accentRaw, 10);

    if (!word || !reading || isNaN(p)) {
      skipped++;
      continue;
    }

    const entry: AccentEntry = { r: reading, p };
    const existing = dict[word];

    if (existing) {
      // Avoid duplicate readings
      const isDuplicate = existing.some((e) => e.r === reading && e.p === p);
      if (!isDuplicate) {
        dict[word] = [...existing, entry];
      }
    } else {
      dict[word] = [entry];
    }
  }

  process.stdout.write(
    `Processed ${lineCount} lines, skipped ${skipped}, dict size: ${Object.keys(dict).length}\n`
  );

  return dict;
}

async function main(): Promise<void> {
  process.stdout.write(`Downloading ${SOURCE_URL}\n`);
  const stream = await downloadToStream(SOURCE_URL);

  process.stdout.write('Parsing TSV...\n');
  const dict = await buildDict(stream);

  const json = JSON.stringify(dict);
  fs.writeFileSync(OUTPUT_PATH, json, 'utf-8');

  const sizeKB = Math.round(Buffer.byteLength(json, 'utf-8') / 1024);
  process.stdout.write(`Written to ${OUTPUT_PATH} (${sizeKB} KB)\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`Error: ${String(err)}\n`);
  process.exit(1);
});
