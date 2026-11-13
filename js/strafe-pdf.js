/* Gemeinsame Nummern für die Geldspalte und die ungeteilten PDF-Spielkacheln. */
(() => {
 const cents=value=>Math.round((Number(value)||0)*100),norm=value=>String(value||'').trim().toLocaleLowerCase('de'),plain=value=>String(value??'').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu,'').trim();
 function build(snapshot){
  const titles=window.KCGameResults?.titles||{},eligible=e=>e.type==='game_result'||e.type==='free'||e.type==='teamspiel_strafe'||Object.hasOwn(titles,e.type),seen=new Set(),history=(window.KCGameResults?.ordered(snapshot.history)||(snapshot.history||[]).filter(eligible).slice().sort((a,b)=>(Date.parse(a.createdAt||a.date)||0)-(Date.parse(b.createdAt||b.date)||0))).filter(e=>{if(e.id&&seen.has(e.id))return false;if(e.id)seen.add(e.id);return true;}),cards=history.map((entry,i)=>({number:window.KCGameResults?.number(snapshot.history,entry)||i+1,entry,title:entry.title||titles[entry.gameKey||entry.type]||(entry.type==='free'?entry.reason||'Freier Betrag':entry.spieltyp||'Spiel'),date:entry.createdAt||entry.date,onTop:entry.gameFineOnTop===true||entry.onTop===true,amounts:new Map()}));
  let nextNumber=Math.max(0,...cards.map(card=>card.number))+1;
  const add=(card,name,amount)=>{if(!name||!Number.isFinite(amount))return;const old=card.amounts.get(name)||0;card.amounts.set(name,old+amount);};
  for(const card of cards){const e=card.entry;
   if(e.type==='free')add(card,e.person||e.personName,e.amountCents??cents(e.amount));
   else if(e.amounts?.length)for(const row of window.KCGameResults?.amounts(e)||e.amounts)add(card,row.name,Number(row.amountCents)||0);
   else if(e.assignedTo?.length)for(const row of e.assignedTo)add(card,row.name,cents(row.amount));
   else{const counters=e.type==='teamspiel_strafe'?(e.members||[]).map(name=>({personName:name,key:(snapshot.strafen||[]).find(p=>/^1\.?\s*verlierer/i.test(p.label))?.key,delta:1})):Array.isArray(e.counterCharges)?e.counterCharges:(e.ranking||[]).flatMap((g,i)=>{const rank=g.rank||i+1,key=(snapshot.strafen||[]).find(p=>new RegExp('^'+rank+'\\.?\\s*verlierer','i').test(p.label))?.key;return key?(g.names||[]).map(name=>({personName:name,key,delta:1})):[];});for(const charge of counters){const price=(snapshot.strafen||[]).find(p=>p.key===charge.key)?.price||0;add(card,charge.personName||charge.name,cents(price)*(Number(charge.delta??charge.count)||0));}}
  }
  const entryGameId=e=>e.gameId||(e.id?.startsWith('game_result_'+e.gameKey+'_')?e.id.slice(('game_result_'+e.gameKey+'_').length):''),ledger=(snapshot.pdfGameLedger||[]).filter(row=>!snapshot.pdfEveningStartedAt||row.eveningStartedAt===snapshot.pdfEveningStartedAt),items=new Map();
  for(const person of [...(snapshot.members||[]),...(snapshot.guests||[])]){
   const rows=[],taken=new Set(),source=[...(person.freeStrafen||[]),...(person.tannenbaumCharges||[]).map(item=>({...item,gameKey:'tannenbaum',reason:'Tannenbaum'}))],ownLedger=ledger.filter(row=>norm(row.personName)===norm(person.name)),grouped=new Map();
   for(const row of ownLedger){const id=row.gameId||row.id;if(!grouped.has(id))grouped.set(id,{...row,amountCents:0});grouped.get(id).amountCents+=Number(row.amountCents)||0;}
   const resolve=(row,amount)=>{
    const key=row.gameKey||Object.keys(titles).find(k=>norm(row.reason).startsWith(norm(titles[k]))),gameId=row.gameId;
    return cards.find(c=>c.entry.id&&c.entry.id===row.id)||cards.find(c=>gameId&&entryGameId(c.entry)===gameId)||cards.find(c=>row.individualChargeId&&entryGameId(c.entry)&&row.individualChargeId.startsWith('indcharge_'+entryGameId(c.entry)+'_'))||cards.find(c=>!taken.has(c.number)&&(c.entry.gameKey||c.entry.type)===key&&Math.abs((c.amounts.get(person.name)||0)-amount)<1);
   };
   const put=(row,amount)=>{
    if(!amount)return;const king=/gossen(könig|koenig)/i.test(row.reason||'')&&!cards.some(c=>c.entry.id&&c.entry.id===row.id);
    let card=king?cards.find(c=>c.gosseKing):resolve(row,amount);if(!card){card={number:nextNumber++,gosseKing:king,entry:{id:row.id,gameId:row.gameId,gameKey:row.gameKey},title:king?'Gossenkönig':titles[row.gameKey]||row.reason||'Freier Betrag',date:row.createdAt,onTop:row.onTop===true,amounts:new Map()};cards.push(card);}
    taken.add(card.number);const existing=rows.find(r=>r.number===card.number);if(existing)existing.amountCents+=amount;else rows.push({number:card.number,amountCents:amount});
    // Die Tabelle ist die Quelle für den Geldposten; niemals eine bereits dokumentierte Gebühr verdoppeln.
    card.amounts.set(person.name,rows.find(r=>r.number===card.number).amountCents);
   };
   for(const row of source){if(row.individualChargeId&&(ownLedger.some(l=>l.id===row.individualChargeId)||row.individualChargeId==='hindernis-summary'&&ownLedger.some(l=>l.gameKey==='hindernis')))continue;put(row,cents(row.amount));}
   for(const row of grouped.values())put(row,Number(row.amountCents)||0);
   if(person.isGosseKing&&!rows.some(r=>/gossenkönig/i.test(r.reason||''))&&!source.some(r=>/gossen(könig|koenig)/i.test(r.reason||'')))put({reason:'Gossenkönig',onTop:true},300);
   items.set(norm(person.name),rows.sort((a,b)=>(a.number??Infinity)-(b.number??Infinity)));
  }
  return {cards:cards.map(card=>({...card,title:plain(card.title),amounts:[...card.amounts].sort(([a],[b])=>a.localeCompare(b,'de')).map(([name,amountCents])=>({name,amountCents}))})),itemsFor:person=>items.get(norm(person.name))||[]};
 }
 function drawCards(doc,cards,{pageWidth,pageHeight,margin=12,startY,date=value=>value?new Date(value).toLocaleString('de-DE'):'',money=value=>(value/100).toFixed(2).replace('.',',')+' EUR',clean=plain}={}){
  const gap=7,width=(pageWidth-margin*2-gap)/2,maxHeight=pageHeight-margin*2-20,boxes=[];let y=startY,column=0,rowHeight=0;
  const setFont=(size,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);};
  function measure(card,w,font=9){
   setFont(font+1,true);const title=doc.splitTextToSize(clean(card.number+'. '+card.title+(card.onTop?' (OnTop)':'')),w-10);setFont(font-1);const stamp=card.date?doc.splitTextToSize(clean(date(card.date)),w-10):[];setFont(font);const rows=card.amounts.map(row=>({name:doc.splitTextToSize(clean(row.name),w-40),amount:money(row.amountCents),height:Math.max(font*.6,doc.splitTextToSize(clean(row.name),w-40).length*font*.43+font*.2)}));const header=title.length*(font+1)*.42+stamp.length*(font-1)*.42+10,height=header+rows.reduce((n,r)=>n+r.height,0)+(rows.length?8:12);return {title,stamp,rows,header,height,font,w};
  }
  function page(){doc.addPage();y=margin+6;setFont(12,true);doc.setTextColor(35,57,88);doc.text('Spiele und Buchungen (Fortsetzung)',margin,y);y+=8;doc.setTextColor(0,0,0);}
  function paint(card,x,top,m){
   doc.setDrawColor(184,198,218);doc.setFillColor(248,250,254);doc.setLineWidth(.35);doc.roundedRect(x,top,m.w,m.height,2.5,2.5,'FD');doc.setTextColor(31,54,86);setFont(m.font+1,true);let baseline=top+6;doc.text(m.title,x+5,baseline);baseline+=m.title.length*(m.font+1)*.42+1;
   if(m.stamp.length){setFont(m.font-1);doc.setTextColor(90,105,126);doc.text(m.stamp,x+5,baseline);}
   doc.setDrawColor(207,217,232);doc.line(x+5,top+m.header-2,x+m.w-5,top+m.header-2);let rowY=top+m.header+3;setFont(m.font);doc.setTextColor(0,0,0);
   if(!m.rows.length)doc.text('Keine zusätzliche Geldbuchung.',x+5,rowY);
   for(const row of m.rows){doc.text(row.name,x+5,rowY);setFont(m.font,true);doc.text(row.amount,x+m.w-5,rowY,{align:'right'});setFont(m.font);rowY+=row.height;}
   boxes.push({number:card.number,page:doc.internal.getNumberOfPages(),x,y:top,width:m.w,height:m.height});doc.setTextColor(0,0,0);
  }
  const first=cards[0];if(first){let m=measure(first,width);if(m.height>maxHeight)m=measure(first,pageWidth-margin*2);if(y+Math.min(m.height,maxHeight)+14>pageHeight-margin){doc.addPage();y=margin+6;}setFont(13,true);doc.setTextColor(31,54,86);doc.text('Abgeschlossene Spiele und weitere Buchungen',margin,y);y+=9;doc.setTextColor(0,0,0);}
  for(const card of cards){let m=measure(card,width),wide=m.height>maxHeight;if(wide){if(column){y+=rowHeight+gap;column=0;rowHeight=0;}m=measure(card,pageWidth-margin*2);for(let i=0;m.height>maxHeight&&i<30;i++)m=measure(card,m.w,m.font*.88);}
   if(column&&y+m.height>pageHeight-margin){y+=rowHeight+gap;column=0;rowHeight=0;}
   if(!column&&y+m.height>pageHeight-margin)page();
   paint(card,margin+(column?width+gap:0),y,m);rowHeight=Math.max(rowHeight,m.height);
   if(wide||column){y+=rowHeight+gap;column=0;rowHeight=0;}else column=1;
  }
  return {y:y+(column?rowHeight+gap:0),boxes};
 }
 window.KCStrafenPdf=Object.freeze({build,drawCards});
})();


function getPdfAttendanceStatus(person) {
  const status =
    normalizeAttendanceStatus(
      person
    );

  if (
    status ===
    ATTENDANCE_STATUS.PRESENT
  ) {
    return 'present';
  }

  if (
    status ===
    ATTENDANCE_STATUS.EXCUSED
  ) {
    return 'excused';
  }

  if (
    status ===
    ATTENDANCE_STATUS.UNEXCUSED
  ) {
    return 'unexcused';
  }

  return 'unknown';
}

function getPdfAttendanceStatusLabel(
  status
) {
  if (status === 'present') {
    return 'Anwesend';
  }

  if (status === 'excused') {
    return 'Abgemeldet';
  }

  if (status === 'unexcused') {
    return 'Nicht abgemeldet';
  }

  return 'Kein Status';
}

function getPresentMemberPenaltyMaximum() {
  const totals =
    persons
      .filter(person =>
        !person.isGuest && !person.isDrinksOnly && !person.inactive &&
        getPdfAttendanceStatus(
          person
        ) === 'present'
      )
      .map(person =>
        Math.max(
          0,
          parseFloat(
            calcPersonStrafenTotalCapped(
              person
            ) || 0
          ) || 0
        )
      );

  if (!totals.length) {
    return 0;
  }

  return Math.max(...totals);
}

function getMemberPdfPenaltyTotal(
  person,
  highestPresent
) {
  const status =
    getPdfAttendanceStatus(
      person
    );

  if (status === 'present') {
    return Math.max(
      0,
      parseFloat(
        calcPersonStrafenTotalCapped(
          person
        ) || 0
      ) || 0
    );
  }

  if (status === 'excused') {
    return highestPresent + 2;
  }

  if (status === 'unexcused') {
    return highestPresent + 22;
  }

  return 0;
}

function getMissingMemberStatuses() {
  return persons
    .filter(person =>
      !person.isGuest && !person.isDrinksOnly && !person.inactive &&
      getPdfAttendanceStatus(
        person
      ) === 'unknown'
    )
    .map(person => person.name)
    .sort((a, b) =>
      a.localeCompare(
        b,
        'de'
      )
    );
}

function getStrafenSnapshot() {
  const highestPresent =
    getPresentMemberPenaltyMaximum();

  const memberPersons =
    persons
      .filter(person =>
        !person.isGuest && !person.isDrinksOnly && !person.inactive
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          'de'
        )
      );

  const guestPersons =
    persons
      .filter(person =>
        person.isGuest && !person.isDrinksOnly && !person.inactive &&
        (
          person.present ||
          person.left ||
          calcPersonStrafenTotalCapped(
            person
          ) > 0
        )
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          'de'
        )
      );

  const mapBasePerson =
    person => ({
      name:
        person.name,

      isGuest:
        !!person.isGuest,

      status:
        getPdfAttendanceStatus(
          person
        ),

      statusLabel:
        getPdfAttendanceStatusLabel(
          getPdfAttendanceStatus(
            person
          )
        ),

      tisch:
        person.tisch || '',

      strafen: {
        ...(
          person.strafen ||
          {}
        )
      },

      freeStrafen:
        Array.isArray(
          person.freeStrafen
        )
          ? [...person.freeStrafen.map(item => ({ ...item,onTop:typeof gameFineOnTop==='function'?gameFineOnTop(item):!!item.onTop })), ...getMissingGameCharges(person)]
          : getMissingGameCharges(person),

      isGosseKing: !!(person.present && getGosseKings().includes(person.name)),

      tannenbaumCharges:
        Array.isArray(
          person.tannenbaumCharges
        )
          ? person.tannenbaumCharges.map(
              item => ({
                ...item,onTop:typeof gameFineOnTop==='function'?gameFineOnTop(item,'tannenbaum'):!!item.onTop
              })
            )
          : [],

      actualPenaltyTotal:
        Math.max(
          0,
          parseFloat(
            calcPersonStrafenTotalCapped(
              person
            ) || 0
          ) || 0
        ),

      arrivalTime:
        person.arrivalTime || '',

      left:
        !!person.left,

      leftAt:
        person.leftAt || '',

      leftEarlyAt:
        person.leftEarlyAt || '',

      boughtThrows:
        Math.max(
          0,
          parseInt(
            person.boughtThrows || 0,
            10
          ) || 0
        )
    });

  const members =
    memberPersons.map(person => {
      const base =
        mapBasePerson(
          person
        );

      const penaltyTotal =
        getMemberPdfPenaltyTotal(
          person,
          highestPresent
        );

      return {
        ...base,

        penaltyTotal,

        monthlyFee:
          monatsbeitrag,

        total:
          penaltyTotal +
          monatsbeitrag
      };
    });

  const guests =
    guestPersons.map(person => {
      const base =
        mapBasePerson(
          person
        );

      return {
        ...base,

        penaltyTotal:
          base.actualPenaltyTotal,

        monthlyFee:
          0,

        total:
          base.actualPenaltyTotal
      };
    });

  const memberPenaltyTotal =
    members.reduce(
      (sum, person) =>
        sum +
        person.penaltyTotal,
      0
    );

  const memberFeeTotal =
    members.reduce(
      (sum, person) =>
        sum +
        person.monthlyFee,
      0
    );

  const memberTotal =
    members.reduce(
      (sum, person) =>
        sum +
        person.total,
      0
    );

  const guestTotal =
    guests.reduce(
      (sum, person) =>
        sum +
        person.total,
      0
    );

  const statsPeople=typeof KCPenaltyStats!=='undefined'&&typeof currentEveningStartedAt!=='undefined'?(()=>{const data=KCPenaltyStats.build({people:persons,catalog:STRAFEN,logs:typeof penaltyStatsLog==='undefined'?[]:penaltyStatsLog,eveningStartedAt:currentEveningStartedAt});return data.sessions.find(x=>x.key===data.currentKey)?.people||[];})():[];
  return {
    statsPeople,
    pdfEveningStartedAt:typeof currentEveningStartedAt==='undefined'?'':currentEveningStartedAt,
    pdfGameLedger:typeof individualGameLedger==='undefined'?[]:JSON.parse(JSON.stringify(individualGameLedger.filter(row=>row.eveningStartedAt===currentEveningStartedAt))),
    date:
      new Date().toISOString(),

    club:
      ACTIVE_CLUB || '',

    monthlyFee:
      monatsbeitrag,

    highestPresent,

    strafen:
      STRAFEN.map(strafe => ({
        key:
          strafe.key,

        label:
          strafe.label,

        price:
          Math.max(
            0,
            parseFloat(
              strafPrices[
                strafe.key
              ] || 0
            ) || 0
          )
      })),

    members,
    guests,

    totals: {
      memberPenaltyTotal,
      memberFeeTotal,
      memberTotal,
      guestTotal,

      grandTotal:
        memberTotal +
        guestTotal
    },

    history:
      Array.isArray(
        strafenHistory
      )
        ? strafenHistory.map(
            entry => typeof gameFineHistoryEntry==='function'?gameFineHistoryEntry(entry):({...entry})
          )
        : []
  };
}


async function generateStrafenPDF(snapshot) {
  const { jsPDF } = window.jspdf;
  const pdfClubName=snapshot.club||getPdfClubName();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3'
  });

  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const margin = 12;

  const formatEuro = value => {
    const number =
      Math.round(
        (
          parseFloat(value || 0) || 0
        ) * 100
      ) / 100;

    return (
      number
        .toFixed(2)
        .replace('.', ',') +
      ' EUR'
    );
  };

  const formatDate = value => {
    if (!value) {
      return '-';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return date.toLocaleDateString(
      'de-DE'
    );
  };

  const formatDateTimeSafe =
    value => {
      if (!value) {
        return '-';
      }

      try {
        return formatDateTime(
          value
        );
      } catch {
        return String(value);
      }
    };

  function getPlainTeamName(
    teamKey
  ) {
    if (
      teamKey !== 'T1' &&
      teamKey !== 'T2'
    ) {
      return String(
        teamKey || 'Kein Team'
      );
    }

    const fallback =
      teamKey === 'T1'
        ? 'Team 1'
        : 'Team 2';

    const configuredName =
      (snapshot.groupSettings||groupSettings)?.[
        teamKey
      ]?.name || fallback;

    return String(
      configuredName
    )
      .replace(
        /[\u{1F300}-\u{1FAFF}]/gu,
        ''
      )
      .replace(
        /[\u2600-\u27BF]/g,
        ''
      )
      .trim() ||
      fallback;
  }

  function getPlainText(
    value
  ) {
    return String(
      value || ''
    )
      .replace(
        /[\u{1F300}-\u{1FAFF}]/gu,
        ''
      )
      .replace(
        /[\u2600-\u27BF]/g,
        ''
      )
      .trim();
  }

  function drawPageTitle(
    title,
    subtitle
  ) {
    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(18);

    doc.text(
      getPlainText(title),
      margin,
      16
    );

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(10);

    doc.text(
      getPlainText(subtitle),
      margin,
      23
    );
  }

  function ensurePageSpace(
    neededHeight,
    resetY = margin
  ) {
    if (
      currentY +
      neededHeight >
      pageHeight -
      margin
    ) {
      doc.addPage();
      currentY = resetY;

      return true;
    }

    return false;
  }

  const pdfModel=window.KCStrafenPdf.build(snapshot);

  const visibleStrafen =
    (
      snapshot.strafen ||
      []
    ).filter(
      strafe =>
        !(snapshot.manualEntry?(snapshot.autoTimeKeys||[]).includes(strafe.key):isAutoTimeStrafeKey(strafe.key))
    );

  function getFreeAndGameTotal(
    person
  ) {
    const freeTotal =
      (
        person.freeStrafen ||
        []
      ).reduce(
        (sum, item) =>
          sum +
          (
            parseFloat(
              item.amount || 0
            ) || 0
          ),
        0
      );

    const tannenbaumTotal =
      (
        person
          .tannenbaumCharges ||
        []
      ).reduce(
        (sum, item) =>
          sum +
          (
            parseFloat(
              item.amount || 0
            ) || 0
          ),
        0
      );

    return (
      freeTotal +
      tannenbaumTotal
    );
  }

  function getLatePdfData(
    person
  ) {
    if(snapshot.manualEntry)return person.latePdfData||null;
    if (
      person.status &&
      person.status !== 'present'
    ) {
      return null;
    }

    const penalty =
      getLatePenaltyDisplay(
        person
      );

    if (!penalty) {
      return null;
    }

    return {
      count:
        Math.max(
          0,
          parseInt(
            penalty.count || 0,
            10
          ) || 0
        ),

      amount:
        Math.max(
          0,
          parseFloat(
            penalty.amount || 0
          ) || 0
        )
    };
  }

  function getEarlyPdfData(
    person
  ) {
    if(snapshot.manualEntry)return person.earlyPdfData||null;
    if (
      person.status &&
      person.status !== 'present'
    ) {
      return null;
    }

    const penalty =
      getEarlyPenaltyDisplay(
        person
      );

    if (!penalty) {
      return null;
    }

    return {
      count:
        Math.max(
          0,
          parseInt(
            penalty.count || 0,
            10
          ) || 0
        ),

      amount:
        Math.max(
          0,
          parseFloat(
            penalty.amount || 0
          ) || 0
        )
    };
  }

  const overflowExtras=[];
  function drawTable({
    title,
    rows,
    startY,
    includeStatus,
    includeMonthlyFee
  }) {
    let y =
      startY;

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(13);

    doc.text(
      getPlainText(title),
      margin,
      y
    );

    y += 6;

    const usableWidth =
      pageWidth -
      margin * 2;

    const nameWidth = 39;

    const statusWidth = 0;

    const lateWidth = 32;
    const earlyWidth = 0;
    const extrasWidth = 34;
    const penaltyTotalWidth = 25;

    const monthlyWidth =
      includeMonthlyFee
        ? 27
        : 0;

    const totalWidth = 27;

    const paidWidth = 23;

    const fixedWidth =
      nameWidth +
      statusWidth +
      lateWidth +
      earlyWidth +
      extrasWidth +
      penaltyTotalWidth +
      monthlyWidth +
      totalWidth +
      paidWidth;

    const penaltyColumnWidth =
      visibleStrafen.length
        ? Math.max(
            9,
            (
              usableWidth -
              fixedWidth
            ) /
            visibleStrafen.length
          )
        : 0;

    const headerHeight = 20;



    let frameStartY =
      y;

    function drawCell(
      x,
      top,
      width,
      height,
      options = {}
    ) {
      doc.setLineWidth(
        options.thick
          ? 0.35
          : 0.12
      );

      doc.rect(
        x,
        top,
        width,
        height
      );
    }

    function drawOuterFrame(
      start,
      end
    ) {
      if (
        end <= start
      ) {
        return;
      }

      doc.setLineWidth(0.8);

      doc.rect(
        margin,
        start,
        usableWidth,
        end - start
      );

      doc.setLineWidth(0.12);
    }

    function drawCenteredText(
      text,
      x,
      top,
      width,
      height,
      options = {}
    ) {
      doc.setFont(
        'helvetica',
        options.bold
          ? 'bold'
          : 'normal'
      );

      doc.setFontSize(
        options.fontSize || 8
      );

      const lines =
        doc.splitTextToSize(
          getPlainText(text),
          Math.max(
            4,
            width - 2
          )
        );

      const lineHeight =
        options.lineHeight ||
        3.2;

      const totalTextHeight =
        lines.length *
        lineHeight;

      let textY =
        top +
        (
          height -
          totalTextHeight
        ) /
        2 +
        2.5;

      lines.forEach(line => {
        doc.text(
          line,
          x +
          width / 2,
          textY,
          {
            align: 'center'
          }
        );

        textY +=
          lineHeight;
      });
    }

    function drawLeftText(
      text,
      x,
      top,
      width,
      height,
      options = {}
    ) {
      doc.setFont(
        'helvetica',
        options.bold
          ? 'bold'
          : 'normal'
      );

      doc.setFontSize(
        options.fontSize || 8
      );

      const lines =
        doc.splitTextToSize(
          getPlainText(text),
          Math.max(
            4,
            width - 4
          )
        );

      const lineHeight = 3.2;

      const totalTextHeight =
        lines.length *
        lineHeight;

      let textY =
        top +
        (
          height -
          totalTextHeight
        ) /
        2 +
        2.5;

      lines.forEach(line => {
        doc.text(
          line,
          x + 2,
          textY
        );

        textY +=
          lineHeight;
      });
    }

    function drawTimePenaltyCell(
      penalty,
      x,
      top,
      width,
      height
    ) {
      drawCell(
        x,
        top,
        width,
        height
      );

      if (
        !penalty ||
        penalty.count <= 0 ||
        penalty.amount <= 0
      ) {
        drawCenteredText(
          '-',
          x,
          top,
          width,
          height,
          {
            fontSize: 7
          }
        );

        return;
      }

      drawCenteredText(
        `${penalty.count}x\n${formatEuro(
          penalty.amount
        )}`,
        x,
        top,
        width,
        height,
        {
          fontSize: 6.2,
          lineHeight: 3
        }
      );
    }

    function drawHeader() {
      let x =
        margin;

      drawCell(
        x,
        y,
        nameWidth,
        headerHeight,
        {
          thick: true
        }
      );

      drawCenteredText(
        'Name',
        x,
        y,
        nameWidth,
        headerHeight,
        {
          bold: true,
          fontSize: 9
        }
      );

      x +=
        nameWidth;

      if (false) {
        drawCell(
          x,
          y,
          statusWidth,
          headerHeight,
          {
            thick: true
          }
        );

        drawCenteredText(
          'Status',
          x,
          y,
          statusWidth,
          headerHeight,
          {
            bold: true,
            fontSize: 7
          }
        );

        x +=
          statusWidth;
      }

      visibleStrafen.forEach(
        strafe => {
          drawCell(
            x,
            y,
            penaltyColumnWidth,
            headerHeight,
            {
              thick: true
            }
          );

          drawCenteredText(
            `${strafe.label}\n${formatEuro(
              strafe.price
            )}`,
            x,
            y,
            penaltyColumnWidth,
            headerHeight,
            {
              bold: true,
              fontSize: 6.2,
              lineHeight: 3
            }
          );

          x +=
            penaltyColumnWidth;
        }
      );

      drawCell(
        x,
        y,
        lateWidth,
        headerHeight,
        {
          thick: true
        }
      );

      drawCenteredText(
        'Kommen / Gehen',
        x,
        y,
        lateWidth,
        headerHeight,
        {
          bold: true,
          fontSize: 6.8
        }
      );

      x +=
        lateWidth;

      drawCell(
        x,
        y,
        earlyWidth,
        headerHeight,
        {
          thick: true
        }
      );

      drawCenteredText(
        '',
        x,
        y,
        earlyWidth,
        headerHeight,
        {
          bold: true,
          fontSize: 6.3
        }
      );

      x +=
        earlyWidth;

      drawCell(
        x,
        y,
        extrasWidth,
        headerHeight,
        {
          thick: true
        }
      );

      drawCenteredText(
        'Freie Beträge / Spiele',
        x,
        y,
        extrasWidth,
        headerHeight,
        {
          bold: true,
          fontSize: 6.2
        }
      );

      x +=
        extrasWidth;

      drawCell(
        x,
        y,
        penaltyTotalWidth,
        headerHeight,
        {
          thick: true
        }
      );

      drawCenteredText(
        'Strafen',
        x,
        y,
        penaltyTotalWidth,
        headerHeight,
        {
          bold: true,
          fontSize: 8
        }
      );

      x +=
        penaltyTotalWidth;

      if (
        includeMonthlyFee
      ) {
        drawCell(
          x,
          y,
          monthlyWidth,
          headerHeight,
          {
            thick: true
          }
        );

        drawCenteredText(
          'Monatsbeitrag',
          x,
          y,
          monthlyWidth,
          headerHeight,
          {
            bold: true,
            fontSize: 7
          }
        );

        x +=
          monthlyWidth;
      }

      drawCell(
        x,
        y,
        totalWidth,
        headerHeight,
        {
          thick: true
        }
      );

      drawCenteredText(
        'Gesamt',
        x,
        y,
        totalWidth,
        headerHeight,
        {
          bold: true,
          fontSize: 8
        }
      );

      x +=
        totalWidth;

      drawCell(
        x,
        y,
        paidWidth,
        headerHeight,
        {
          thick: true
        }
      );

      drawCenteredText(
        'Bezahlt',
        x,
        y,
        paidWidth,
        headerHeight,
        {
          bold: true,
          fontSize: 8
        }
      );

      y +=
        headerHeight;
    }

    frameStartY =
      y;

    drawHeader();

    rows.forEach(person => {
      const extraLines = pdfModel.itemsFor(person).map(item=>(item.number?item.number+'. ':item.reason+' ')+(item.amountCents>=0?'+':'')+formatEuro(item.amountCents/100));
      doc.setFont('helvetica','normal');doc.setFontSize(6.8);
      const extraWrapped=doc.splitTextToSize(getPlainText(extraLines.join('\n')),extrasWidth-2);
      const extraHeight=extraLines.length?extraWrapped.length*3.2+4:18;
      if(extraHeight>150){overflowExtras.push({name:person.name,lines:extraLines.slice()});extraLines.splice(0,extraLines.length,'Einzelposten siehe Anhang: '+person.name);}
      const rowHeight=extraHeight>150?18:Math.max(18,extraHeight);

      if (
        y +
        rowHeight >
        pageHeight -
        margin
      ) {
        drawOuterFrame(
          frameStartY,
          y
        );

        doc.addPage();

        y =
          margin;

        frameStartY =
          y;

        drawHeader();
      }

      let x =
        margin;

      drawCell(
        x,
        y,
        nameWidth,
        rowHeight
      );

      const statusColor = person.status === 'present' ? [30, 155, 70] : person.status === 'excused' ? [220, 165, 30] : [205, 55, 55];
      doc.setFillColor(...statusColor);
      doc.circle(x + 4, y + rowHeight / 2, 1.8, 'F');
      // Symbole belegen eigene feste Positionen, statt den Namen zu ueberlagern.
      let nameOffset = 8;
      if (person.isGosseKing) {
        const cx = x + 9.5;
        const cy = y + rowHeight / 2;
        doc.setFillColor(230, 176, 28);
        doc.triangle(cx - 2.3, cy - 1.1, cx - 1.2, cy + 1.4, cx + 2.3, cy + 1.4, 'F');
        doc.triangle(cx - 2.3, cy - 1.1, cx + 0.2, cy + 1.4, cx + 1.2, cy - 1.1, 'F');
        doc.rect(cx - 2.3, cy + 1.0, 4.6, 1.0, 'F');
        nameOffset = 15;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(25, 25, 25);
      drawLeftText(person.name, x + nameOffset - 2, y, nameWidth - nameOffset + 2, rowHeight, {bold: true, fontSize: 8});

      x +=
        nameWidth;

      if (false) {
        drawCell(
          x,
          y,
          statusWidth,
          rowHeight
        );

        drawCenteredText(
          person.statusLabel,
          x,
          y,
          statusWidth,
          rowHeight,
          {
            fontSize: 6.3
          }
        );

        x +=
          statusWidth;
      }

      visibleStrafen.forEach(
        strafe => {
          const count =
            Math.max(
              0,
              parseInt(
                person
                  .strafen?.[
                    strafe.key
                  ] || 0,
                10
              ) || 0
            );

          drawCell(
            x,
            y,
            penaltyColumnWidth,
            rowHeight
          );

          drawCenteredText(
            count > 0
              ? count
              : '-',
            x,
            y,
            penaltyColumnWidth,
            rowHeight,
            {
              fontSize: 8
            }
          );

          x +=
            penaltyColumnWidth;
        }
      );

      const latePenalty =
        getLatePdfData(
          person
        );

      const earlyPenalty = getEarlyPdfData(person);
      drawCell(x, y, lateWidth, rowHeight);
      const timeLines = [];
      if (latePenalty) timeLines.push(`Spaeter ${latePenalty.count}x = ${formatEuro(latePenalty.amount)}`);
      if (earlyPenalty) timeLines.push(`Frueher ${earlyPenalty.count}x = ${formatEuro(earlyPenalty.amount)}`);
      drawCenteredText(timeLines.length ? timeLines.join('\n') : '-', x, y, lateWidth, rowHeight, {fontSize: 6.2});

      x +=
        lateWidth;

      // Frueheres Gehen steht bereits in der kombinierten Spalte.
      drawCell(x, y, earlyWidth, rowHeight);

      x +=
        earlyWidth;

      drawCell(
        x,
        y,
        extrasWidth,
        rowHeight
      );

      const extraTotal =
        getFreeAndGameTotal(
          person
        );

      drawCenteredText(extraLines.length ? extraLines.join('\n') : '-', x, y, extrasWidth, rowHeight, {fontSize: 6.8});

      x +=
        extrasWidth;

      drawCell(
        x,
        y,
        penaltyTotalWidth,
        rowHeight
      );

      drawCenteredText(
        formatEuro(
          person.penaltyTotal
        ),
        x,
        y,
        penaltyTotalWidth,
        rowHeight,
        {
          bold: true,
          fontSize: 7.2
        }
      );

      x +=
        penaltyTotalWidth;

      if (
        includeMonthlyFee
      ) {
        drawCell(
          x,
          y,
          monthlyWidth,
          rowHeight
        );

        drawCenteredText(
          formatEuro(
            person.monthlyFee
          ),
          x,
          y,
          monthlyWidth,
          rowHeight,
          {
            fontSize: 7.2
          }
        );

        x +=
          monthlyWidth;
      }

      drawCell(
        x,
        y,
        totalWidth,
        rowHeight
      );

      drawCenteredText(
        formatEuro(
          person.total
        ),
        x,
        y,
        totalWidth,
        rowHeight,
        {
          bold: true,
          fontSize: 7.2
        }
      );

      x +=
        totalWidth;

      /*
       * Bezahlt bleibt absichtlich leer.
       */
      drawCell(
        x,
        y,
        paidWidth,
        rowHeight
      );

      y +=
        rowHeight;
    });

    drawOuterFrame(
      frameStartY,
      y
    );

    return y;
  }

  drawPageTitle(
    `${pdfClubName} - Strafenabrechnung`,
    `Abrechnung vom ${formatDate(
      snapshot.date
    )}${snapshot.manualEntry ? " - Nachtrag" : ""}`
  );

  let currentY =
    drawTable({
      title:
        'Mitglieder',

      rows:
        snapshot.members || [],

      startY:
        32,

      includeStatus:
        true,

      includeMonthlyFee:
        true
    });

  currentY += 7;

  // Zusammenfassung nicht am unteren Seitenrand abschneiden.
  if (currentY + 25 > pageHeight - margin) {
    doc.addPage();
    drawPageTitle(
      `${pdfClubName} - Strafenabrechnung`,
      `Zusammenfassung vom ${formatDate(snapshot.date)}`
    );
    currentY = 33;
  }

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(10);

  doc.text(
    `Mitglieder: Strafen ${formatEuro(
      snapshot.totals
        ?.memberPenaltyTotal
    )} | Monatsbeiträge ${formatEuro(
      snapshot.totals
        ?.memberFeeTotal
    )} | Gesamt ${formatEuro(
      snapshot.totals
        ?.memberTotal
    )}`,
    margin,
    currentY
  );

  currentY += 10;

  if (
    Array.isArray(
      snapshot.guests
    ) &&
    snapshot.guests.length
  ) {
    if (
      currentY + 60 >
      pageHeight -
      margin
    ) {
      doc.addPage();

      drawPageTitle(
        `${pdfClubName} - Strafenabrechnung`,
        `Gastkegler vom ${formatDate(
          snapshot.date
        )}`
      );

      currentY = 32;
    }

    currentY =
      drawTable({
        title:
          'Gastkegler',

        rows:
          snapshot.guests,

        startY:
          currentY,

        includeStatus:
          false,

        includeMonthlyFee:
          false
      });

    currentY += 7;

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(10);

    doc.text(
      `Gastkegler gesamt: ${formatEuro(
        snapshot.totals
          ?.guestTotal
      )}`,
      margin,
      currentY
    );
  }

  currentY += 10;

  if (currentY + 22 > pageHeight - margin) {
    doc.addPage();
    drawPageTitle(
      `${pdfClubName} - Strafenabrechnung`,
      `Zusammenfassung vom ${formatDate(snapshot.date)}`
    );
    currentY = 33;
  }

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(12);

  doc.text(
    `Gesamtsumme: ${formatEuro(
      snapshot.totals
        ?.grandTotal
    )}`,
    margin,
    currentY
  );

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(8);

  const infoText =
    `Grundlage für Abwesende: höchste Strafe eines anwesenden Mitglieds = ${formatEuro(
      snapshot.highestPresent
    )}. Abgemeldet: höchste Strafe + 2 EUR. Nicht abgemeldet: höchste Strafe + 22 EUR.`;

  const infoLines =
    doc.splitTextToSize(
      infoText,
      pageWidth -
      margin * 2
    );

  doc.text(
    infoLines,
    margin,
    currentY + 6
  );

  // Anwesenheit direkt nach der Gesamtsumme fortsetzen.
  // Nur bei tatsächlichem Platzmangel eine neue Seite beginnen.
  currentY += 6 + Math.max(1, infoLines.length) * 4 + 10;
  if (currentY + 22 > pageHeight - margin) {
    doc.addPage();
    drawPageTitle(
      `${pdfClubName} - Kegelabend`,
      `Anwesenheit und Spielübersicht vom ${formatDate(snapshot.date)}`
    );
    currentY = 33;
  }

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(13);

  doc.text(
    'Anwesenheit',
    margin,
    currentY
  );

  currentY += 7;

  doc.setFont(
    'helvetica',
    'normal'
  );

  doc.setFontSize(9);

  (
    snapshot.members ||
    []
  ).forEach(person => {
    if (
      currentY >
      pageHeight -
      margin -
      12
    ) {
      doc.addPage();
      currentY = margin;
    }

    let detail =
      `${person.name}: ${person.statusLabel}`;

    if (
      person.status ===
      'present'
    ) {
      const parts = [];

      if (
        person.arrivalTime
      ) {
        parts.push(
          `gekommen ${person.arrivalTime} Uhr`
        );
      }

      const departureTime =
        person.leftEarlyAt ||
        person.leftAt ||
        '';

      if (
        departureTime
      ) {
        parts.push(
          `gegangen ${departureTime} Uhr`
        );
      }

      const late =
        getLatePdfData(
          person
        );

      if (late) {
        parts.push(
          `Verspätung ${late.count}x = ${formatEuro(
            late.amount
          )}`
        );
      }

      const early =
        getEarlyPdfData(
          person
        );

      if (early) {
        parts.push(
          `früher gegangen ${early.count}x = ${formatEuro(
            early.amount
          )}`
        );
      }

      if (
        parts.length
      ) {
        detail +=
          ` | ${parts.join(
            ' | '
          )}`;
      }
    }

    const lines =
      doc.splitTextToSize(
        getPlainText(detail),
        pageWidth -
        margin * 2
      );

    doc.text(
      lines,
      margin,
      currentY
    );

    currentY +=
      Math.max(
        6,
        lines.length * 4
      );
  });

  if (
    Array.isArray(
      snapshot.guests
    ) &&
    snapshot.guests.length
  ) {
    currentY += 5;

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.setFontSize(11);

    doc.text(
      'Gastkegler',
      margin,
      currentY
    );

    currentY += 6;

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(9);

    snapshot.guests.forEach(
      person => {
        if (
          currentY >
          pageHeight -
          margin -
          12
        ) {
          doc.addPage();
          currentY = margin;
        }

        let detail =
          person.name;

        const parts = [];

        if (
          person.arrivalTime
        ) {
          parts.push(
            `gekommen ${person.arrivalTime} Uhr`
          );
        }

        const departureTime =
          person.leftEarlyAt ||
          person.leftAt ||
          '';

        if (
          departureTime
        ) {
          parts.push(
            `gegangen ${departureTime} Uhr`
          );
        }

        const late =
          getLatePdfData(
            person
          );

        if (late) {
          parts.push(
            `Verspätung ${late.count}x = ${formatEuro(
              late.amount
            )}`
          );
        }

        const early =
          getEarlyPdfData(
            person
          );

        if (early) {
          parts.push(
            `früher gegangen ${early.count}x = ${formatEuro(
              early.amount
            )}`
          );
        }

        if (
          parts.length
        ) {
          detail +=
            ` | ${parts.join(
              ' | '
            )}`;
        }

        const lines =
          doc.splitTextToSize(
            getPlainText(detail),
            pageWidth -
            margin * 2
          );

        doc.text(
          lines,
          margin,
          currentY
        );

        currentY +=
          Math.max(
            6,
            lines.length * 4
          );
      }
    );
  }

  currentY += 8;
  if(!pdfModel.cards.length){ensurePageSpace(20);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('Abgeschlossene Spiele und weitere Buchungen',margin,currentY);currentY+=7;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Keine abgeschlossenen Spiele vorhanden.',margin,currentY);currentY+=7;}
  else currentY=window.KCStrafenPdf.drawCards(doc,pdfModel.cards,{pageWidth,pageHeight,margin,startY:currentY,date:formatDateTimeSafe,money:value=>formatEuro(value/100),clean:getPlainText}).y;

  if(snapshot.manualEntry && snapshot.note){
    const lines=doc.splitTextToSize(getPlainText(snapshot.note),pageWidth-margin*2);
    ensurePageSpace(lines.length*4+14);doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text(lines,margin,currentY+8);
    currentY+=lines.length*4+14;
  }
  if(Number.isSafeInteger(snapshot.laneCostCents)){
    ensurePageSpace(29);doc.setFont('helvetica','bold');doc.setFontSize(12);
    doc.text('Bahngebühr: '+formatEuro(snapshot.laneCostCents/100),margin,currentY+10);
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text(snapshot.laneExpenseExcluded?'Die Bahngebühr ist aus den Kassenausgaben ausgeschlossen.':'Ausgabe der Clubkasse; nicht in den Einzelbeträgen der Mitglieder enthalten.',margin,currentY+17);
  }
  if(Number.isSafeInteger(snapshot.laneCostCents))currentY+=29;
  for(const extra of overflowExtras){
    ensurePageSpace(20);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Zusätzliche Beträge - '+getPlainText(extra.name),margin,currentY+8);currentY+=15;
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    for(const entry of extra.lines){const lines=doc.splitTextToSize(getPlainText(entry),pageWidth-margin*2);for(const line of lines){ensurePageSpace(5);doc.text(line,margin,currentY+4);currentY+=5;}currentY+=2;}
    currentY+=5;
  }
  return doc;
}

async function closeStrafenAndExportPDF() {
  return openStrafenCloseDialog();
}

async function archiveStrafenEvent(snapshot,context) {
  if(!context||!window.firestoreApi?.saveStrafenClosure)throw new Error('Abschlusszugriff nicht verfügbar');
  return window.firestoreApi.saveStrafenClosure(getClubFirestoreId(context.club),context.archiveId,{
    ...snapshot,status:'closed',category:'strafen',club:context.club,
    eveningStartedAt:context.archiveStartedAt||context.startedAt||snapshot.date,
    closedAt:new Date().toISOString()
  },context.revision);
}
