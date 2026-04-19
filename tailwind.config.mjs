/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base palette — navy / cream / saffron
        navy: {
          DEFAULT: '#1a1840',
          deepest: '#0f0d2b',
          deep: '#15133a',
          base: '#1a1840',
          elevated: '#221f4a',
          card: '#2a2758',
          line: 'rgba(250, 247, 239, 0.08)',
        },
        cream: {
          DEFAULT: '#faf7ef',
          50: '#fdfcf7',
          100: '#faf7ef',
          200: '#f4efe0',
          300: '#ede6cf',
          400: '#d8d0b8',
        },
        saffron: {
          DEFAULT: '#d99133',
          50: '#fbf1e2',
          100: '#f6deba',
          200: '#efbf7a',
          300: '#e5a74c',
          400: '#d99133',
          500: '#b87627',
          600: '#8f5a1c',
        },
        maroon: {
          DEFAULT: '#8a1538',
          soft: '#a83254',
        },
        // Semantic text colors — all WCAG AA compliant
        ink: {
          // on cream
          primary: '#1a1840',
          secondary: '#3c3a6b',
          muted: '#6b688f',
          faint: '#9996b8',
        },
        onDark: {
          primary: '#faf7ef',
          secondary: 'rgba(250, 247, 239, 0.82)',
          muted: 'rgba(250, 247, 239, 0.68)',
          faint: 'rgba(250, 247, 239, 0.5)',
        },
        // Functional
        success: '#3f7d4f',
        warning: '#c67c2a',
        error: '#a8323e',
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        devanagari: ['"Noto Serif Devanagari"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Fluid type scale
        'display-xl': ['clamp(3rem, 7vw, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.03em', fontWeight: '400' }],
        'display-lg': ['clamp(2.5rem, 5.5vw, 4.5rem)', { lineHeight: '1', letterSpacing: '-0.025em', fontWeight: '400' }],
        'display-md': ['clamp(2rem, 4vw, 3.25rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '400' }],
        'display-sm': ['clamp(1.625rem, 3vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '500' }],
        'lead': ['clamp(1.125rem, 1.75vw, 1.375rem)', { lineHeight: '1.55', letterSpacing: '-0.005em' }],
        'micro': ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.16em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        eyebrow: '0.18em',
      },
      spacing: {
        gutter: 'clamp(1.25rem, 4vw, 2.5rem)',
        section: 'clamp(4rem, 9vw, 8rem)',
      },
      maxWidth: {
        container: '78rem',
        narrow: '58rem',
        prose: '42rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(26, 24, 64, 0.04), 0 6px 24px rgba(26, 24, 64, 0.06)',
        lift: '0 2px 4px rgba(26, 24, 64, 0.06), 0 20px 50px rgba(26, 24, 64, 0.12)',
        glow: '0 0 40px rgba(217, 145, 51, 0.25)',
        ring: '0 0 0 1px rgba(26, 24, 64, 0.08)',
        'ring-dark': '0 0 0 1px rgba(250, 247, 239, 0.1)',
      },
      borderRadius: {
        'xs': '0.25rem',
        'sm': '0.375rem',
        DEFAULT: '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      backgroundImage: {
        'gradient-signature': 'linear-gradient(135deg, #d99133 0%, #e5a74c 40%, #f6deba 100%)',
        'gradient-hero-dark': 'radial-gradient(ellipse at top right, rgba(217, 145, 51, 0.18), transparent 60%), linear-gradient(180deg, #0f0d2b 0%, #1a1840 100%)',
        'gradient-hero-light': 'linear-gradient(180deg, #faf7ef 0%, #f4efe0 100%)',
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fadeIn 600ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'gentle-pulse': 'gentlePulse 4s ease-in-out infinite',
        'gradient-shift': 'gradientShift 12s ease infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        gentlePulse: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: theme('colors.ink.secondary'),
            a: {
              color: theme('colors.saffron.500'),
              textDecoration: 'underline',
              textDecorationThickness: '1px',
              textUnderlineOffset: '3px',
              fontWeight: '500',
              '&:hover': { color: theme('colors.saffron.600') },
            },
            'h1, h2, h3, h4': {
              color: theme('colors.navy.DEFAULT'),
              fontFamily: theme('fontFamily.serif').join(', '),
              fontWeight: '400',
              letterSpacing: '-0.015em',
            },
            h2: { fontSize: theme('fontSize.display-sm')[0], marginTop: '2.5em', marginBottom: '0.75em' },
            h3: { fontSize: '1.375rem', marginTop: '2em', marginBottom: '0.5em', fontWeight: '500' },
            p: { lineHeight: '1.75', marginTop: '1.1em', marginBottom: '1.1em' },
            blockquote: {
              fontStyle: 'italic',
              borderLeftColor: theme('colors.saffron.400'),
              borderLeftWidth: '3px',
              color: theme('colors.ink.primary'),
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            code: {
              backgroundColor: theme('colors.cream.200'),
              color: theme('colors.navy.DEFAULT'),
              padding: '0.15em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '500',
              fontSize: '0.9em',
            },
          },
        },
        invert: {
          css: {
            color: theme('colors.onDark.secondary'),
            'h1, h2, h3, h4': { color: theme('colors.onDark.primary') },
            a: {
              color: theme('colors.saffron.200'),
              '&:hover': { color: theme('colors.saffron.100') },
            },
            blockquote: { color: theme('colors.onDark.primary') },
            code: {
              backgroundColor: 'rgba(250, 247, 239, 0.1)',
              color: theme('colors.cream.DEFAULT'),
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};
