import fs from 'node:fs';
const records=JSON.parse(fs.readFileSync('content/framer-records.json','utf8'));
const old=JSON.parse(fs.readFileSync('content/portfolio-import.json','utf8')).projects;
const mappings={'summer-vibes-festival-campaign':'noise-pollution-festivals-events'};
const categories={ajvJHb3kR:'Usability Testing',wGPfGRism:'Service Design',tJtKqZO1V:'Design For Society',amxwg6iY3:'UI / UX Design',i4fLZyU8Z:'Dashboard Design'};
const titles={'two-factor-authentication':'Two Factor Authentication','panchkalyanak-management-system':'Panchkalyanak Management System','procurement-and-inventory-management-system':'Procurement and Inventory Management System','summer-vibes-festival-campaign':'Noise Pollution in Festivals & Events','smart-kitchen-management-system':'Smart Kitchen Management System'};
const plain=node=>{if(!Array.isArray(node))return '';if(node[0]===5)return node[1];if(node[0]===4)return node.slice(3).map(plain).join('');return node.slice(1).map(plain).filter(Boolean).join('\n\n');};
const dir='public/assets/images/projects/framer';fs.mkdirSync(dir,{recursive:true});
const projects=[];
for(const r of records){const slug=mappings[r.FCspUx7gv]||r.FCspUx7gv;let prev=old.find(p=>p.slug===slug)||{};const title=titles[r.FCspUx7gv];
const media={};const seen=new Map();
for(const key of ['AtZcGqORN','XJMvwvNW0','RQMgc6ez4','khzsjimqK','FyPs61Ai9','wFvjhOq6c']){if(slug==='smart-kitchen-management-system' && key==='FyPs61Ai9') continue;if(slug==='procurement-and-inventory-management-system' && key==='RQMgc6ez4') continue;const url=r[key]?.src;if(!url)continue;const canonical=url.split('?')[0];if(seen.has(canonical)){media[key]=seen.get(canonical);continue;}const ext=new URL(url).pathname.split('.').pop();const local='/assets/images/projects/framer/'+slug+'-'+key+'.'+ext;if(!fs.existsSync('public'+local)) throw Error('Download needed: '+local);media[key]=local;seen.set(canonical,local);}
const sections=[{heading:'Project overview',body:r.dMzbnq2mw,images:[]},{heading:'Project credits',body:'Created by: '+r.J8sDnFjS0.trim()+'\n\nMentored by: '+r.ybgTKbfC1.trim(),images:[]}];
const keys=[['BDYn_1i4J','GUwUlkOlg'],['l_cB_OdHP','LCqLUxlhK'],['lWBIMPM8u','Kdq3qCWEi'],['VlrhhnzCF','XlJpyojfY']];
for(const [heading,body] of keys)if(r[heading]||r[body])sections.push({heading:(r[heading]||'').replace(/\s*:\s*$/,'').trim(),body:plain(r[body]),images:[]});
const gallery=[...new Set(Object.entries(media).filter(([k])=>k!=='AtZcGqORN').map(([,v])=>v))];
if(gallery.length)sections.push({heading:'Project images',body:'',images:gallery.map((src,i)=>({src,alt:title+' - project image '+(i+1),caption:''}))});
projects.push({...prev,slug,title,category:categories[r.gPcsfhEl_]||prev.category||'UI / UX Design',summary:r.dMzbnq2mw,duration:r.aaJdfYesh,coverImage:media.AtZcGqORN,sections,url:r.Cgfgqj7KU||prev.url||'',sourceUrl:'https://magenta-mission-235535.framer.app/projects/'+r.FCspUx7gv,published:true,template:false});
}
fs.writeFileSync('content/framer-work.json',JSON.stringify({sourceUrl:'https://magenta-mission-235535.framer.app/',projects},null,2)+'\n');console.log('Prepared '+projects.length+' projects and local case-study images.');
