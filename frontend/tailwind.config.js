/** @type {import('tailwindcss').Config} */

// Direction A, "Highlighter". `colors` replaces Tailwind's palette instead of extending it, so
// stock classes like bg-blue-600 don't exist. Contrast is against paper unless noted.
const colors = {
  transparent: 'transparent',
  current: 'currentColor',
  paper: '#FAFAF8', // page background
  surface: '#F1F1EE', // selected rows, quiet fills
  'surface-2': '#ECECE8', // pressed toggles, the user's question
  line: '#E2E2DD', // dividers
  edge: '#8E9196', // input and control borders, 3.0:1
  ink: '#16181A', // text and primary buttons, 17.0:1
  muted: '#5D6166', // secondary text, 6.0:1
  hl: '#F7E37A', // highlighter behind cited text, ink on it 13.8:1
  'hl-soft': '#FBF0B8', // query terms inside retrieved passages, ink on it 15.5:1
  cite: '#7A4A00', // citation markers, 7.2:1
  ok: '#2B6A3E', // ready, 6.2:1
  'ok-soft': '#E6F0E8', // ok on it 5.6:1
  warn: '#7A4A00', // processing, 7.2:1
  'warn-soft': '#FBF3DD', // warn on it 6.8:1
  bad: '#A3261A', // failed and errors, 7.1:1
  'bad-soft': '#F8E7E4', // bad on it 6.2:1
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors,
    fontFamily: {
      serif: ['Newsreader', 'Georgia', 'Cambria', 'serif'],
      sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
    },
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '4px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      // Only floating things (toasts) get a shadow; everything else separates with 1px lines.
      float: '0 1px 2px rgba(22, 24, 26, 0.06), 0 12px 32px -12px rgba(22, 24, 26, 0.24)',
    },
    extend: {
      fontSize: {
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
        answer: ['1.0625rem', { lineHeight: '1.65' }],
        title: ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        display: ['clamp(2.5rem, 6.2vw, 4.75rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
      },
      spacing: {
        bar: '3.5rem', // app top bar height
      },
      maxWidth: {
        prose: '62ch',
        page: '76rem',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      keyframes: {
        sweep: { from: { backgroundSize: '0% 100%' }, to: { backgroundSize: '100% 100%' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        pulse: { '50%': { opacity: '0.35' } },
      },
      animation: {
        // `backwards`, not `both`: once done, the mark drops to its plain background, which re-wraps correctly.
        sweep: 'sweep 450ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards',
        'fade-in': 'fade-in 150ms ease-out both',
        pulse: 'pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
