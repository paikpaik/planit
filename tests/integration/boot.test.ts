import { SCHEMA_VERSION } from '@/core/types';

describe('planit boot', () => {
  it('exposes a schema version', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
