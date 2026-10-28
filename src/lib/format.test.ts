import { describe, expect, it } from 'vitest';
import { compact, githubLink, groupEventsByDay, humanEvent } from './format';

describe('format helpers', () => {
  it('abbreviates large values', () => expect(compact(12000)).toMatch(/12/));
  it('validates GitHub URLs', () => {
    expect(githubLink('https://github.com/waifujahat')).toBe('https://github.com/waifujahat');
    expect(githubLink('javascript:alert(1)')).toBeNull();
    expect(githubLink('https://github.com.evil.example/a')).toBeNull();
  });
  it('handles an unknown event type', () =>
    expect(humanEvent('SuperCustomEvent')).toContain('Super'));
  it('builds 14 daily activity buckets', () => expect(groupEventsByDay([])).toHaveLength(14));
});
