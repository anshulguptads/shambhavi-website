import { describe, it, expect, vi } from 'vitest';
import { handleSubmission, type FormDeps } from './handle';

const validDemo = {
  name: 'Priya Sharma',
  email: 'priya@greenvalley.edu.in',
  organisation: 'Green Valley School',
  platforms: ['aspirems'],
};

const okDeps = (): FormDeps & { insertRow: ReturnType<typeof vi.fn>; sendEmail: ReturnType<typeof vi.fn> } => ({
  verifyTurnstile: vi.fn(async () => true),
  insertRow: vi.fn(async () => {}),
  sendEmail: vi.fn(async () => {}),
});

describe('handleSubmission degradation matrix', () => {
  it('accepts a valid submission when everything works (200, stored + emailed)', async () => {
    const deps = okDeps();
    const r = await handleSubmission('demo-request', validDemo, deps, { honeypotFilled: false, turnstileToken: 'tok' });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(deps.insertRow).toHaveBeenCalledOnce();
    expect(deps.sendEmail).toHaveBeenCalledOnce();
  });

  it('honeypot: silently accepts and calls nothing', async () => {
    const deps = okDeps();
    const r = await handleSubmission('demo-request', validDemo, deps, { honeypotFilled: true });
    expect(r.status).toBe(200);
    expect(deps.insertRow).not.toHaveBeenCalled();
    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('invalid input → 400 with field errors, nothing stored', async () => {
    const deps = okDeps();
    const r = await handleSubmission('demo-request', { name: '' }, deps, { honeypotFilled: false });
    expect(r.status).toBe(400);
    expect(r.body.ok).toBe(false);
    expect(r.body.errors).toBeTruthy();
    expect(deps.insertRow).not.toHaveBeenCalled();
  });

  it('turnstile configured + verification fails → 403', async () => {
    const deps = { ...okDeps(), verifyTurnstile: vi.fn(async () => false) };
    const r = await handleSubmission('demo-request', validDemo, deps, { honeypotFilled: false, turnstileToken: 'bad' });
    expect(r.status).toBe(403);
    expect(deps.insertRow).not.toHaveBeenCalled();
  });

  it('turnstile NOT configured → proceeds (honeypot remains the guard)', async () => {
    const deps = okDeps();
    delete (deps as FormDeps).verifyTurnstile;
    const r = await handleSubmission('demo-request', validDemo, deps, { honeypotFilled: false });
    expect(r.status).toBe(200);
    expect(deps.insertRow).toHaveBeenCalledOnce();
  });

  it('email throws but D1 stored → still 200 (lead is safe)', async () => {
    const deps = { ...okDeps(), sendEmail: vi.fn(async () => { throw new Error('resend down'); }) };
    const r = await handleSubmission('demo-request', validDemo, deps, { honeypotFilled: false });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it('D1 throws but email sent → still 200 (lead is safe)', async () => {
    const deps = { ...okDeps(), insertRow: vi.fn(async () => { throw new Error('d1 down'); }) };
    const r = await handleSubmission('demo-request', validDemo, deps, { honeypotFilled: false });
    expect(r.status).toBe(200);
  });

  it('neither storage nor email configured → 503 with mailto fallback message', async () => {
    const r = await handleSubmission('demo-request', validDemo, {}, { honeypotFilled: false });
    expect(r.status).toBe(503);
    expect(r.body.ok).toBe(false);
    expect(r.body.message).toMatch(/info@shambhavilabs\.com/);
  });

  it('both configured but both fail → 503 (never silently lose a lead)', async () => {
    const deps = {
      insertRow: vi.fn(async () => { throw new Error('d1 down'); }),
      sendEmail: vi.fn(async () => { throw new Error('resend down'); }),
    };
    const r = await handleSubmission('demo-request', validDemo, deps, { honeypotFilled: false });
    expect(r.status).toBe(503);
  });

  it('contact submissions flow through the same pipeline', async () => {
    const deps = okDeps();
    const r = await handleSubmission(
      'contact',
      { name: 'A', email: 'a@b.co', topic: 'press', message: 'hello' },
      deps,
      { honeypotFilled: false }
    );
    expect(r.status).toBe(200);
    expect(deps.insertRow).toHaveBeenCalledOnce();
  });
});
