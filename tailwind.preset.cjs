// Consumers: `presets: [require('@fileverse-dev/ddoc/tailwind')]` and add
// node_modules/@fileverse-dev/ddoc/dist/index.es.js plus
// node_modules/@fileverse/ui/dist/index.es.js to `content`.
module.exports = {
  presets: [require('@fileverse/ui/tailwind')],
  theme: {
    extend: {
      screens: {
        mobile: '960px',
      },
    },
  },
};
