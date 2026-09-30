const fs = require('fs');
let sitemap = fs.readFileSync('sitemap.xml', 'utf8');

const newRoutes = `  <url>
    <loc>https://cric-scorer-pro.app/releases.html</loc>
    <lastmod>2026-09-30</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cric-scorer-pro.app/terms.html</loc>
    <lastmod>2026-09-30</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

sitemap = sitemap.replace('</urlset>', newRoutes);
fs.writeFileSync('sitemap.xml', sitemap);
