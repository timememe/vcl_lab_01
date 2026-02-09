/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Grid classes
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-6',
    'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-3', 'xl:grid-cols-4', '2xl:grid-cols-6',
    // Color variations
    'bg-red-50', 'bg-red-100', 'bg-red-500', 'bg-red-600', 'bg-red-700',
    'text-red-500', 'text-red-600', 'text-red-700',
    'border-red-200', 'border-red-500',
    // Hover states
    'hover:bg-red-700', 'hover:opacity-80', 'hover:opacity-90',
    'group-hover:opacity-80', 'group-hover:scale-105', 'group-hover:scale-110',
    // Responsive spacing
    'p-4', 'p-6', 'p-8', 'gap-6', 'gap-8',
    // Animation classes
    'transition-all', 'duration-300', 'transform',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}