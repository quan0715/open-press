/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--op-ink)',
        'ink-strong': 'var(--op-ink-strong)',
        'ink-on-dark': 'var(--op-ink-on-dark)',
        paper: 'var(--op-paper)',
        'paper-soft': 'var(--op-paper-soft)',
        surface: 'var(--op-surface)',
        subdued: 'var(--op-subdued)',
        'subdued-strong': 'var(--op-subdued-strong)',
        'subdued-on-dark': 'var(--op-subdued-on-dark)',
        accent: 'var(--op-accent)',
        'accent-soft': 'var(--op-accent-soft)',
        hairline: 'var(--op-hairline)',
        'hairline-strong': 'var(--op-hairline-strong)',
      },
      fontFamily: {
        body: ['var(--op-font-body)', 'sans-serif'],
        display: ['var(--op-font-display)', 'serif'],
        mono: ['var(--op-font-mono)', 'monospace'],
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
      },
    },
  },
  plugins: [],
};
