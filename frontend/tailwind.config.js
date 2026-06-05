export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "Montserrat", "Arial", "sans-serif"],
        display: ["Urbanist", "Montserrat", "Arial", "sans-serif"],
      },
      colors: {
        simodar: {
          red: "#ba121b",
          deep: "#860e14",
          soft: "#fff1f2",
          ink: "#1f2937",
        },
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
