module.exports = function(eleventyConfig) {
  // Pass through the public style.css so it isn't processed
  // Since we are writing to public/blog, and reading from blog,
  // we might want to configure standard templates.

  return {
    dir: {
      input: "blog",
      output: "public/blog",
      includes: "_includes",
      layouts: "_includes" // Allows using _includes for layouts as well
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
