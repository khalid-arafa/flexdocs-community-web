// tailwind.config.js (light mode only)
module.exports = {
  darkMode: false,
  theme: {
    extend: {
      colors: {
        primary: "#6366F1",
        secondary: "#8B5CF6",
        accent: "#A5B4FC",
        bg: {
          main: "#F7F8FC",
          card: "#FFFFFF",
          sidebar: "#0F172A",
        },
        text: {
          primary: "#0F172A",
          secondary: "#64748B",
          muted: "#94A3B8",
        },
      },
      spacing: {
        card: "1.5rem",
        section: "2rem",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,0.06)",
      },
      backgroundImage: {
        gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)",
      },
    },
  },
};
