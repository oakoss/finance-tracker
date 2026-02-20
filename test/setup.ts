// Jest-DOM matchers (toBeInTheDocument, toHaveTextContent, etc.)
// See: https://github.com/testing-library/jest-dom#vitest
import '@testing-library/jest-dom/vitest';

// NOTE: @testing-library/react auto-registers afterEach(cleanup) when
// vitest globals are enabled (`globals: true` in vitest.config.ts).
// No manual cleanup() call needed here.
