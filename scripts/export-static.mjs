import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { contentTypes } from '../src/content.js';
import { createSiteStore } from '../src/site.js';
import { getShowcaseProjects } from '../src/showcase.js';
import { getWorkProjects } from '../src/workContent.js';
import { homePage } from '../src/views/home.js';
import { aboutPage, workPage, servicesPage, serviceDetailPage, contactPage } from '../src/views/studioPages.js';
import { projectPage } from '../src/views/project.js';
import { notFoundPage } from '../src/views/notFound.js';
import { STUDIO_SERVICES } from '../src/studioServices.js';

const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist');
const base=process.env.PUBLIC_BASE_PATH || '/Tanvi-Portfolio';
const origin=process.env.PUBLIC_ORIGIN || 'https://tanvijain108.github.io';
const db=new DatabaseSync(path.join(root,'data/portfolio.db'),{readOnly:true});
const site=createSiteStore(db).get();
const published=db.prepare('SELECT * FROM projects WHERE published=1 ORDER BY sort_order,id').all().map(contentTypes.projects.fromRow);
const ctx={site,siteUrl:origin+base,projects:getShowcaseProjects({site,projects:published})};
const work=getWorkProjects(ctx,published);
db.close();
await fs.mkdir(out,{recursive:true});
await fs.cp(path.join(root,'public/assets'),path.join(out,'assets'),{recursive:true});
await fs.copyFile(path.join(root,'public/favicon.svg'),path.join(out,'favicon.svg'));
let contactScript=await fs.readFile(path.join(out,'assets/js/contact.js'),'utf8');
contactScript=contactScript.replace('    sending = true;', `    var subject = 'Portfolio enquiry: ' + (selectedNeeds.join(', ') || 'New project');
    var body = ['Name: ' + data.name, 'Email: ' + data.email, 'Budget: ' + (data.budget || 'Not specified'), '', data.message].join(String.fromCharCode(10));
    window.location.href = 'mailto:' + form.dataset.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    setStatus('Your email app will open with your enquiry. Please send the email from there.', 'ok');
    return;
    sending = true;`);
await fs.writeFile(path.join(out,'assets/js/contact.js'),contactScript);
const routes=new Map([['/',homePage(ctx)],['/about',aboutPage(ctx)],['/work',workPage({...ctx,projects:work})],['/services',servicesPage(ctx)],['/contact',contactPage(ctx)]]);
for(const service of STUDIO_SERVICES)routes.set('/services/'+service.slug,serviceDetailPage({...ctx,service}));
for(const [index,project] of work.entries())routes.set('/work/'+project.slug,projectPage({...ctx,project,next:work[(index+1)%work.length]}));
function rewrite(markup){return String(markup).replace('Send enquiry <span', 'Open email <span').replace('I?ll get back to you to talk through the details.', 'Your enquiry opens in your email app, ready to send.').replace(/\b(href|src|action)="\/(?!\/)([^"\s]*)"/g,(_,attribute,url)=>`${attribute}="${base}/${url}"`);}
for(const [route,markup] of routes){const target=path.join(out,route,'index.html');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,rewrite(markup));}
await fs.writeFile(path.join(out,'404.html'),rewrite(notFoundPage(ctx)));
await fs.writeFile(path.join(out,'.nojekyll'),'');
await fs.writeFile(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin+base}/sitemap.xml\n`);
await fs.writeFile(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...routes.keys()].map(route=>`<url><loc>${origin+base+route}</loc></url>`).join('')}</urlset>`);
let checked=0;
for(const route of routes.keys()){
 const markup=await fs.readFile(path.join(out,route,'index.html'),'utf8');
 for(const match of markup.matchAll(/\b(?:href|src)="([^"?#]*)/g)){
  if(!match[1].startsWith(base+'/'))continue;
  const local=path.join(out,match[1].slice(base.length));
  try{await fs.stat(local);}catch{throw Error(`Missing local target on ${route}: ${match[1]}`);}
  checked++;
 }
}
console.log(`Exported ${routes.size} pages and verified ${checked} internal links/assets. Contact enquiries open a drafted email.`);
