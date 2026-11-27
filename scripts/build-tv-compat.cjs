/* Build the same dashboard for Samsung TV web engines based on Chromium 63 and later. */
const fs=require('node:fs');
const path=require('node:path');
const babel=require('@babel/core');
const presetEnv=require('@babel/preset-env');
const esbuild=require('esbuild');
const acorn=require('acorn');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,content)=>fs.writeFileSync(path.join(root,file),content);
const scripts=[];
const html=read('dashboard.html').replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g,(_,attrs,body)=>{
  const source=/\bsrc="([^"?]+)/.exec(attrs);
  if(source)scripts.push({file:source[1],code:read(source[1])});
  else if(/type="module"/.test(attrs))scripts.push({file:'dashboard-inline.js',code:'(function(){\n'+body.replace(/^[ \t]*import ['"]\.\/js\/firebase\.js['"];?\s*/m,'')+'\n})();'});
  return '';
});
const tag=read('js/state.js').match(/const APP_VERSION = '([^']+)'/)[1];

function transform(code,file){
  return babel.transformSync(code,{
    filename:file,sourceType:'script',babelrc:false,configFile:false,compact:true,comments:false,
    presets:[[presetEnv,{targets:{chrome:'63'},modules:false,useBuiltIns:false,include:['@babel/plugin-transform-template-literals']}]]
  }).code;
}
async function bundle(){
  fs.mkdirSync(path.join(root,'tv-compat'),{recursive:true});
  const bootstrap=transform(read('scripts/tv-compat-polyfills.js'),'tv-compat-polyfills.js');
  const compat=await esbuild.build({
    absWorkingDir:root,bundle:true,format:'iife',write:false,minify:true,
    stdin:{contents:[
      'es.global-this','es.array.at','es.array.find-last','es.array.find-last-index','es.array.flat','es.array.flat-map',
      'es.object.from-entries','es.object.has-own','es.promise.all-settled','es.string.replace-all','web.dom-collections.iterator'
    ].map(name=>'import "core-js/modules/'+name+'.js";').join('\n'),resolveDir:root},target:'chrome63'
  });
  const sdk=await esbuild.build({
    absWorkingDir:root,bundle:true,format:'iife',platform:'browser',write:false,minify:true,legalComments:'inline',
    entryPoints:['js/firebase.js'],target:'es2022',plugins:[{name:'firebase-package',setup(build){
      build.onResolve({filter:/^https:\/\/www\.gstatic\.com\/firebasejs\/12\.0\.0\//},args=>
        build.resolve(args.path.includes('firebase-app.js')?'firebase/app':'firebase/firestore',{resolveDir:root,kind:'import-statement'}));
    }}]
  });
  // esbuild may attach a shared license to different retained declarations.
  // Preserve every notice once in a stable header, independent of that placement.
  const sdkText=sdk.outputFiles[0].text;
  const comments=(babel.parseSync(sdkText,{configFile:false,babelrc:false,sourceType:'script'}).comments||[])
    .filter(comment=>/@license/.test(comment.value)||comment.value.startsWith('!'));
  const notices=[...new Set(comments.map(comment=>sdkText.slice(comment.start,comment.end)))].sort().join('\n');
  let sdkBody='',cursor=0;
  for(const comment of comments){sdkBody+=sdkText.slice(cursor,comment.start);cursor=comment.end;}
  sdkBody+=sdkText.slice(cursor);
  const sdkCode=transform(sdkBody,'firebase-tv.js');
  const dashboard=scripts.map(({file,code})=>file==='dashboard-inline.js'?
    'window.KCFirestoreForTV&&window.KCFirestoreForTV();\n'+transform(code,file):transform(code,file)).join('\n');
  const targets={
    'tv-compat/polyfills.js':compat.outputFiles[0].text+'\n'+bootstrap,
    'tv-compat/firebase.js':notices+'\nwindow.KCFirestoreForTV=function(){'+sdkCode+'};',
    'tv-compat/dashboard.js':dashboard
  };
  for(const [file,code] of Object.entries(targets)){
    acorn.parse(code,{ecmaVersion:2018});
    write(file,code+'\n');
  }
  const imports=['polyfills','firebase','dashboard'].map(name=>'<script src="tv-compat/'+name+'.js?v='+tag+'"></script>').join('\n');
  write('dashboard-compat.html',html.replace('</body>',imports+'\n</body>').replace(/[ \t]+(?=\r?$)/gm,''));
}

bundle().catch(error=>{console.error(error);process.exitCode=1;});
