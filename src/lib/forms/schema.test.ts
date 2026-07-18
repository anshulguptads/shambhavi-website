import { describe, it, expect } from 'vitest';
import { parseSubmission, PLATFORM_SLUGS } from './schema';

const validDemo = {
  name: 'Priya Sharma',
  email: 'priya@greenvalley.edu.in',
  organisation: 'Green Valley School',
  role: 'Principal',
  platforms: ['aspirems'],
  orgType: 'school',
  country: 'India',
  message: 'We have 800 students in grades 8-12.',
};

const validContact = {
  name: 'Arjun Mehta',
  email: 'arjun@presshouse.in',
  topic: 'press',
  message: 'Interested in covering the crisis-detection work.',
};

function toFormData(obj: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) v.forEach((item) => fd.append(k, String(item)));
    else if (v !== undefined) fd.append(k, String(v));
  }
  return fd;
}

describe('demo-request schema', () => {
  it('parses a valid submission (JSON object)', () => {
    const r = parseSubmission('demo-request', validDemo);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.kind).toBe('demo-request');
      expect(r.value.name).toBe('Priya Sharma');
      expect(r.value.platforms).toEqual(['aspirems']);
    }
  });

  it('parses a valid submission (FormData)', () => {
    const r = parseSubmission('demo-request', toFormData(validDemo));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.organisation).toBe('Green Valley School');
  });

  it('collects multiple platforms from FormData', () => {
    const r = parseSubmission('demo-request', toFormData({ ...validDemo, platforms: ['aspirems', 'sanadeep'] }));
    expect(r.ok).toBe(true);
    if (r.ok && r.value.kind === 'demo-request') expect(r.value.platforms).toEqual(['aspirems', 'sanadeep']);
  });

  it('rejects missing required fields with per-field errors', () => {
    const r = parseSubmission('demo-request', { ...validDemo, name: '', email: undefined, organisation: '  ' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['name', 'email', 'organisation']));
    }
  });

  it('rejects a bad email', () => {
    const r = parseSubmission('demo-request', { ...validDemo, email: 'not-an-email' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.email).toBeTruthy();
  });

  it('rejects empty platforms and unknown slugs', () => {
    expect(parseSubmission('demo-request', { ...validDemo, platforms: [] }).ok).toBe(false);
    expect(parseSubmission('demo-request', { ...validDemo, platforms: ['excel'] }).ok).toBe(false);
    for (const slug of PLATFORM_SLUGS) {
      expect(parseSubmission('demo-request', { ...validDemo, platforms: [slug] }).ok).toBe(true);
    }
  });

  it('strips unknown fields and trims strings', () => {
    const r = parseSubmission('demo-request', { ...validDemo, name: '  Priya  ', evil: 'payload' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe('Priya');
      expect('evil' in r.value).toBe(false);
    }
  });
});

describe('contact schema', () => {
  it('parses a valid contact message', () => {
    const r = parseSubmission('contact', validContact);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.kind).toBe('contact');
  });

  it('requires message and a known topic', () => {
    expect(parseSubmission('contact', { ...validContact, message: '' }).ok).toBe(false);
    expect(parseSubmission('contact', { ...validContact, topic: 'spam-topic' }).ok).toBe(false);
  });

  it('parses from FormData', () => {
    const r = parseSubmission('contact', toFormData(validContact));
    expect(r.ok).toBe(true);
  });
});
