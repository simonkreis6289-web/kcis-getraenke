const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','firestore.rules'),'utf8');
// Execute the actual guard expressions with a small mapping of Rules primitives.
// This checks the protocol contract, not the Firebase compiler, access-call cache,
// authentication, or real server behavior; Firebase validation remains required.
function guards(before,after,row,requestTime=100){
 let functions=source.slice(source.indexOf('function kcRoot'),source.indexOf('match /clubs/'));
 functions=functions.replace(/\/databases\/\$\(database\)\/documents\/clubs\/\$\(clubId\)\/state\/current/g,'`clubs/${clubId}/state/current`')
 .replace(/\/databases\/\$\(database\)\/documents\/clubs\/\$\(clubId\)\/syncCommands\/\$\(operation\)/g,'`clubs/${clubId}/syncCommands/${operation}`')
 .replace(/root\.syncRevision is int/g,'Number.isSafeInteger(root.syncRevision)')
 .replace(/operation is string/g,"typeof operation === 'string'")
 .replace(/operation\.matches\(([^\n]+)\)/g,'new RegExp($1).test(operation)')
 .replace(/get\(root\)\.data\.keys\(\)\.hasAll\(\['syncRevision'\]\)/g,"Object.hasOwn(get(root).data, 'syncRevision')");
 const c={request:{time:requestTime,resource:{data:row}},exists:p=>Object.hasOwn(before,p),existsAfter:p=>Object.hasOwn(after,p),get:p=>({data:before[p]}),getAfter:p=>({data:after[p]}),Number,Object,RegExp};
 vm.createContext(c);vm.runInContext(functions,c);return {command:()=>safe(()=>c.kcSharedCommand('club')),row:()=>safe(()=>c.kcSharedRow('club')),receipt:id=>{const old=c.request.resource.data;c.request.resource.data=after['clubs/club/syncCommands/'+id];const result=safe(()=>c.kcSharedReceipt('club',id));c.request.resource.data=old;return result;}};
}
function safe(fn){try{return fn()===true;}catch{return false;}}
const root='clubs/club/state/current',proof='clubs/club/syncCommands/sync_one';
function valid(){return {before:{[root]:{syncProtocol:1,syncRevision:5,updatedAt:99,syncOperation:'sync_old'}},after:{[root]:{syncProtocol:1,syncRevision:6,updatedAt:100,syncOperation:'sync_one'},[proof]:{commandId:'sync_one',createdAt:100}},row:{syncProtocol:1,syncRevision:6,updatedAt:100,syncOperation:'sync_one'}};}
test('rules preserve existing reads without retaining the global write bypass',()=>{assert.match(source,/match \/\{document=\*\*\} \{\s*allow read: if true;\s*\}/);assert(!/allow[^;]*(?:write|create|update|delete)[^;]*if\s+true/.test(source));assert.match(source,/match \/syncCommands\/\{commandId\} \{\s*allow create: if kcSharedReceipt/);});
test('rule guards allow an initialized transaction and first migration with a new proof',()=>{const x=valid(),g=guards(x.before,x.after,x.row);assert(g.command());assert(g.row());assert(g.receipt('sync_one'));delete x.before[root];x.after[root].syncRevision=1;x.row.syncRevision=1;assert(guards(x.before,x.after,x.row).row());});
test('rule guards deny old standalone person/snapshot writes and missing root updates',()=>{const x=valid();assert(!guards(x.before,x.before,{name:'A',drinks:{beer:1}}).row());delete x.after[proof];assert(!guards(x.before,x.after,x.row).command());});
test('rule guards reject reused proofs, skipped revisions and fabricated timestamps',()=>{for(const change of [x=>x.before[proof]=x.after[proof],x=>x.after[root].syncRevision=8,x=>x.after[root].updatedAt=99,x=>x.after[proof].createdAt=99,x=>x.after[proof].commandId='sync_wrong']){const x=valid();change(x);assert(!guards(x.before,x.after,x.row).command());}});
test('rule guards reject mismatched mirror rows and receipts from another command',()=>{for(const change of [x=>x.row.syncProtocol=0,x=>x.row.syncRevision=5,x=>x.row.syncOperation='sync_other',x=>x.row.updatedAt=99]){const x=valid();change(x);assert(!guards(x.before,x.after,x.row).row());}const x=valid();assert(!guards(x.before,x.after,x.row).receipt('sync_other'));});
