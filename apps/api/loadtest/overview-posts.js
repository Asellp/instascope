import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = 'http://localhost:3000';
const ACCOUNT_ID = '92fb52d6-4539-42c2-86e3-b780cfe083c8';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'instascope4@gmail.com',
    password: 'stajyerler4',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed with status ${loginRes.status}: ${loginRes.body}`);
  }

  // Set-Cookie header'larından cookie string'ini elle inşa edelim
  const cookies = loginRes.cookies;
  let cookieHeader = '';
  for (const name in cookies) {
    cookieHeader += `${name}=${cookies[name][0].value}; `;
  }

  return { cookieHeader };
}

export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': data.cookieHeader,
    },
  };

  const overviewRes = http.get(`${BASE_URL}/accounts/${ACCOUNT_ID}/overview?range=30d`, params);
  check(overviewRes, { 'overview status 200': (r) => r.status === 200 });

  const postsRes = http.get(`${BASE_URL}/accounts/${ACCOUNT_ID}/posts`, params);
  check(postsRes, { 'posts status 200': (r) => r.status === 200 });

  sleep(1);
}