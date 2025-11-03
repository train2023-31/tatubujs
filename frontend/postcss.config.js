module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.tatubu.com/api/:path*',
      },
    ];
  },
}

