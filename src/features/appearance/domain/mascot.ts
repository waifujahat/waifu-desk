export type MascotExpression = 'idle' | 'happy' | 'working' | 'thinking' | 'sleepy' | 'surprised';

export interface MascotPreferences {
  version: 1;
  enabled: boolean;
  expression: MascotExpression;
}

export const MASCOT_STORAGE_KEY = 'wd-hana-mascot-v1';
export const EXPRESSIONS: MascotExpression[] = [
  'idle',
  'happy',
  'working',
  'thinking',
  'sleepy',
  'surprised',
];
export const DEFAULT_MASCOT: MascotPreferences = { version: 1, enabled: true, expression: 'idle' };

export function normalizeMascot(value: unknown): MascotPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_MASCOT };
  const input = value as Partial<MascotPreferences>;
  return {
    version: 1,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_MASCOT.enabled,
    expression: EXPRESSIONS.find((item) => item === input.expression) ?? DEFAULT_MASCOT.expression,
  };
}

export function parseMascotPreferences(raw: string | null): MascotPreferences {
  if (!raw) return { ...DEFAULT_MASCOT };
  try {
    return normalizeMascot(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_MASCOT };
  }
}

export function nextMascotExpression(expression: MascotExpression): MascotExpression {
  const index = EXPRESSIONS.indexOf(expression);
  return EXPRESSIONS[(index + 1) % EXPRESSIONS.length];
}
