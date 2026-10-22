import { execFileSync } from 'node:child_process';
const git='C:/Program Files/Git/cmd/git.exe';
// Credentials stay in process memory and are never printed or written to disk.
const credential=execFileSync(git,['credential','fill'],{input:'protocol=https\nhost=github.com\nusername=tanvijain108\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
const token=credential.split('\n').find(line=>line.startsWith('password='))?.slice(9);
if(!token)throw Error('GitHub owner sign-in is required.');
const action=process.argv[2]||'status';
const root='https://api.github.com/repos/tanvijain108/Tanvi-Portfolio';
const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
async function request(route,method='GET',body){const r=await fetch(root+route,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const data=await r.json().catch(()=>({}));return {status:r.status,data};}
if(action==='publish'){
 let result=await request('/pages');
 const body={build_type:'legacy',source:{branch:'gh-pages',path:'/'}};
 if(result.status===404)result=await request('/pages','POST',body);
 else if(result.status===200 && (result.data.source?.branch!=='gh-pages'||result.data.build_type!=='legacy'))result=await request('/pages','PUT',body);
 if(result.status>=300)throw Error('Pages configuration failed: '+result.status+' '+result.data.message);
 const current=await request('/pages');console.log(JSON.stringify({status:current.status,url:current.data.html_url,state:current.data.status,source:current.data.source}));
}else{
 const [site,build]=await Promise.all([request('/pages'),request('/pages/builds/latest')]);
 console.log(JSON.stringify({site:{status:site.status,url:site.data.html_url,state:site.data.status,source:site.data.source},build:{status:build.status,state:build.data.status,error:build.data.error,commit:build.data.commit}}));
}
