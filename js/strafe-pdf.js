
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
          ? [...person.freeStrafen.map(item => ({ ...item })), ...getMissingGameCharges(person)]
          : getMissingGameCharges(person),

      isGosseKing: !!(person.present && getGosseKings().includes(person.name)),

      tannenbaumCharges:
        Array.isArray(
          person.tannenbaumCharges
        )
          ? person.tannenbaumCharges.map(
              item => ({
                ...item
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

  return {
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
            entry => ({
              ...entry
            })
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
      const extraLines = [
        ...(person.freeStrafen || []).filter(item => Number(item.amount) !== 0).map(item => `${Number(item.amount) >= 0 ? '+' : ''}${formatEuro(Number(item.amount))} ${item.reason || 'Freier Betrag'}`),
        ...(person.isGosseKing && !(person.freeStrafen || []).some(item => /gossen(könig|koenig)/i.test(String(item.reason || ''))) ? ['Gossenkönig +3,00 EUR'] : []),
        ...(person.tannenbaumCharges || []).filter(item => Number(item.amount) !== 0).map(item => `+${formatEuro(Number(item.amount))} Tannenbaum`)
      ];
      doc.setFont('helvetica','normal');doc.setFontSize(5.5);
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

      drawCenteredText(extraLines.length ? extraLines.join('\n') : '-', x, y, extrasWidth, rowHeight, {fontSize: 5.5});

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

  if (
    currentY >
    pageHeight -
    margin -
    20
  ) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(13);

  doc.text(
    'Teamspiele',
    margin,
    currentY
  );

  currentY += 7;

  // Nur Geldstrafen-Teamspiele dokumentieren; Getränke gehören ausschließlich in die Getränke-PDF.
  const bookedTeamGames = (snapshot.history || []).filter(entry => entry.type === 'teamspiel_strafe');
  if (!bookedTeamGames.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Keine Teamspiel-Strafen gebucht.', margin, currentY); currentY += 8;
  } else {
    bookedTeamGames.slice().reverse().forEach((game, index) => {
      if (currentY > pageHeight - margin - 27) { doc.addPage(); currentY = margin; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(`${index + 1}. Teamspiel`, margin, currentY); currentY += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const details = [
        getPlainText(game.spieltyp || 'Teamspiel'),
        `${getPlainTeamName(game.loser)} verloren`,
        `Spieler: ${(game.members || []).map(getPlainText).join(', ') || '-'}`
      ];
      details.forEach(detail => {
        const lines = doc.splitTextToSize(detail, pageWidth - margin * 2 - 10);
        doc.text(lines, margin + 5, currentY); currentY += Math.max(5, lines.length * 4);
      });
      currentY += 4;
    });
  }

  /*
   * Abgeschlossene Spiele und
   * weitere Buchungen
   */

  currentY += 5;

  if (
    currentY >
    pageHeight -
    margin -
    20
  ) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFont(
    'helvetica',
    'bold'
  );

  doc.setFontSize(13);

  doc.text(
    'Abgeschlossene Spiele und weitere Buchungen',
    margin,
    currentY
  );

  currentY += 7;

  const history =
    (
      snapshot.history ||
      []
    ).filter(entry =>
      [
        'tannenbaum',
        'lotterie',
        'tiberius','game_result','mensch','haushoch','haustief','plusminus'
      ].includes(
        entry.type
      )
    );

  if (
    !history.length
  ) {
    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(9);

    doc.text(
      'Keine abgeschlossenen Spiele vorhanden.',
      margin,
      currentY
    );
  } else {
    history.forEach(
      (
        entry,
        index
      ) => {
        if (
          currentY >
          pageHeight -
          margin -
          28
        ) {
          doc.addPage();
          currentY = margin;
        }

        let gameTitle =entry.title||window.KCGameResults?.titles?.[entry.gameKey||entry.type]||'Spiel';

        if (
          entry.type ===
          'tannenbaum'
        ) {
          gameTitle =
            'Tannenbaum';
        }

        if (
          entry.type ===
          'lotterie'
        ) {
          gameTitle =
            'Lotterie';
        }

        if (
          entry.type ===
          'tiberius'
        ) {
          gameTitle =
            'Tiberius';
        }

        doc.setFont(
          'helvetica',
          'bold'
        );

        doc.setFontSize(10);

        doc.text(
          `${index + 1}. ${gameTitle} | ${formatDateTimeSafe(
            entry.createdAt
          )}`,
          margin,
          currentY
        );

        currentY += 5;

        doc.setFont(
          'helvetica',
          'normal'
        );

        doc.setFontSize(8.5);
        if(['game_result','mensch','haushoch','haustief','plusminus'].includes(entry.type)){
          const winners=entry.winners||(entry.winner?[entry.winner]:[]);
          const details=[...(winners.length?['Gewinner: '+winners.join(' · ')]:[]),...(entry.ranking||[]).slice(0,3).map((g,i)=>(g.rank||i+1)+'. Verlierer: '+(g.team?g.team+' · ':'')+(g.names||[]).join(', ')),...(entry.results||[]).map(r=>r.name+': '+(r.number??r.result??'-'))];
          if(!details.length)details.push('Abschluss dokumentiert; Beträge nach den Spielregeln.');
          for(const detail of details){for(const line of doc.splitTextToSize(getPlainText(detail),pageWidth-margin*2)){ensurePageSpace(5);doc.text(line,margin,currentY);currentY+=5;}}
          currentY+=6;return;
        }


        if (
          entry.type ===
          'tannenbaum'
        ) {
          const team1 =
            getPlainTeamName(
              'T1'
            );

          const team2 =
            getPlainTeamName(
              'T2'
            );

          doc.text(
            `${team1}: ${formatEuro(
              entry.totals?.T1 ||
              0
            )} | ${team2}: ${formatEuro(
              entry.totals?.T2 ||
              0
            )}`,
            margin + 5,
            currentY
          );

          currentY += 5;
        }

        if (
          entry.type ===
          'tiberius'
        ) {
          doc.text(
            `Endstand: ${
              entry.score || 0
            }`,
            margin + 5,
            currentY
          );

          currentY += 5;
        }

        const assignments =
          (
            entry.assignedTo ||
            []
          ).map(item =>
            `${getPlainText(
              item.name
            )}: ${formatEuro(
              item.amount
            )}${
              item.onTop
                ? ' On Top'
                : ''
            }`
          );

        const assignmentText =
          assignments.length
            ? `Belastet: ${assignments.join(
                ', '
              )}`
            : 'Keine Zuordnung';

        const assignmentLines =
          doc.splitTextToSize(
            getPlainText(
              assignmentText
            ),
            pageWidth -
            margin * 2 -
            10
          );

        doc.text(
          assignmentLines,
          margin + 5,
          currentY
        );

        currentY +=
          assignmentLines.length *
          4 +
          6;
      }
    );
  }

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
