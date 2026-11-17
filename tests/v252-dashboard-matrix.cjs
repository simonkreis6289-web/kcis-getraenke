const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const html=fs.readFileSync(path.join(__dirname,'../dashboard.html'),'utf8');
test('Lotterie and Tiberius share full-height matrix layout and narrower name column',()=>{
 const css=html.slice(html.indexOf('/* V252: Lotterie'),html.indexOf('/* End V252 matrix dashboard layout. */'));
 assert.match(css,/#game-body \.tv-matrix-board\s*\{[^}]*height:100%;/);
 assert.match(css,/#game-body \.tv-matrix-board \.tv-table\s*\{[^}]*height:100%;/);
 assert.match(css,/td:first-child\s*\{width:14%\}/);
 assert.match(css,/\.tv-cell\s*\{[^}]*font-size:clamp\(24px/);
 assert(!css.includes('#game-body .plusminus-board'));
});
test('Tiberius scoreboard has three distinct equally wide stat rectangles',()=>{
 const css=html.slice(html.indexOf('/* V252: Lotterie'),html.indexOf('/* End V252 matrix dashboard layout. */'));
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.tv-stat strong\s*\{[^}]*font-size:clamp\(36px,4\.3vw,76px\)/);
 const source=html.slice(html.indexOf('function renderTiberiusBoard('),html.indexOf('function plusminusSlotValue(',html.indexOf('function renderTiberiusBoard(')));
 const sandbox={safe:v=>String(v),activeNames:order=>order,fmt:{format:v=>String(v)},gamePenalty:()=>0,makeTable:(heads,rows)=>'<table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+String(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const markup=sandbox.renderTiberiusBoard({targets:[10,20,30],playerOrder:['Peter','Simon'],score:7,penalties:[]});
 const doc=parseHTML('<div id="host">'+markup+'</div>').document;
 assert.equal(doc.querySelectorAll('.tv-stats>.tv-stat').length,3);
 assert.equal(doc.querySelectorAll('.tv-stats strong').length,3);
 assert.equal(doc.querySelectorAll('.tv-table').length,0);
});
test('lottery retains matrix markup and penalty column while using the shared layout',()=>{
 const part=html.slice(html.indexOf('function renderLottery('),html.indexOf('function renderTiberiusBoard('));
 assert.match(part,/class="tv-board tv-matrix-board"/);
 assert.match(part,/\['Spieler','Strafen'/);
 assert.match(part,/makeTable\(/);
});
