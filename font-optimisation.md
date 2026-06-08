# Objective

The current approach is not optimal, doesn't scale well, and requires redundant changes on the package level and the consumer app. We use Google's @import stylesheet way to pull the fonts in. It requires DNS resolving, and extra round-trip to Google servers for them to track the Fonts usage.

Current implementation also doesn't respect our foundation principles of privacy.

# Refactor

We could use fontsource's API to load the Google fonts programmatically using the CSS Font Loading API.

For Font Picker, we could have optimised SVG for font previews so that we don't have to pull every font in.

List virtualisation for rendering the font list.

# Note

I have added consumer app directory `../ddocs.new` for you to understand the redundant font implementation.
