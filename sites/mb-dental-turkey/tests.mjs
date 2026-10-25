import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
for(const value of ['site.services','wa.me','leadForm','cookieChoice','/brand','treatments','privacy','prefers-reduced-motion','utm_campaign']) assert(html.includes(value), 'Missing '+value);
console.log('PASS: core navigation, content, lead form, tracking and accessibility hooks');
