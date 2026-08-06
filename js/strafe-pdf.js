
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
        !person.isGuest &&
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
      !person.isGuest &&
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
        !person.isGuest
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
        person.isGuest &&
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
          ? person.freeStrafen.map(
              item => ({
                ...item
              })
            )
          : [],

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
      groupSettings?.[
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
        !isAutoTimeStrafeKey(
          strafe.key
        )
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

    const nameWidth =
      includeStatus
        ? 31
        : 38;

    const statusWidth =
      includeStatus
        ? 20
        : 0;

    const lateWidth = 22;
    const earlyWidth = 22;
    const extrasWidth = 23;
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

    const headerHeight = 29;

    const rowHeight = 12;

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

      if (
        includeStatus
      ) {
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
        'Verspätet',
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
        'Früher gegangen',
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

      drawLeftText(
        person.name,
        x,
        y,
        nameWidth,
        rowHeight,
        {
          bold: true,
          fontSize: 8
        }
      );

      x +=
        nameWidth;

      if (
        includeStatus
      ) {
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

      drawTimePenaltyCell(
        latePenalty,
        x,
        y,
        lateWidth,
        rowHeight
      );

      x +=
        lateWidth;

      const earlyPenalty =
        getEarlyPdfData(
          person
        );

      drawTimePenaltyCell(
        earlyPenalty,
        x,
        y,
        earlyWidth,
        rowHeight
      );

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

      drawCenteredText(
        extraTotal > 0
          ? formatEuro(
              extraTotal
            )
          : '-',
        x,
        y,
        extrasWidth,
        rowHeight,
        {
          fontSize: 6.3
        }
      );

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
    `${getPdfClubName()} - Strafenabrechnung`,
    `Abrechnung vom ${formatDate(
      snapshot.date
    )}`
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
        `${getPdfClubName()} - Strafenabrechnung`,
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

  doc.addPage();

  drawPageTitle(
    `${getPdfClubName()} - Kegelabend`,
    `Anwesenheit und Spielübersicht vom ${formatDate(
      snapshot.date
    )}`
  );

  currentY = 33;

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

  const bookedTeamGames =
    Array.isArray(spiele)
      ? spiele
      : [];

  if (
    !bookedTeamGames.length
  ) {
    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.setFontSize(9);

    doc.text(
      'Keine Teamspiele gebucht.',
      margin,
      currentY
    );

    currentY += 8;
  } else {
    bookedTeamGames.forEach(
      (
        game,
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

        const loserName =
          getPlainTeamName(
            game.loser
          );

        const gameName =
          getPlainText(
            game.spieltyp ||
            'Teamspiel'
          );

        const members =
          Array.isArray(
            game.members
          )
            ? game.members
                .map(
                  getPlainText
                )
                .filter(Boolean)
            : [];

        const drinksText =
          DRINKS
            .filter(drink =>
              (
                game.drinks?.[
                  drink.key
                ] || 0
              ) > 0
            )
            .map(drink =>
              `${
                game.drinks[
                  drink.key
                ]
              }x ${getPlainText(
                drink.label
              )}`
            )
            .join(', ');

        doc.setFont(
          'helvetica',
          'bold'
        );

        doc.setFontSize(10);

        doc.text(
          `${index + 1}. ${gameName}`,
          margin,
          currentY
        );

        currentY += 5;

        doc.setFont(
          'helvetica',
          'normal'
        );

        doc.setFontSize(8.5);

        doc.text(
          `Verlierer: ${loserName}`,
          margin + 5,
          currentY
        );

        currentY += 5;

        const gameDetails = [
          `Getränke: ${
            drinksText || '-'
          }`,

          `Gesamt: ${formatEuro(
            game.total || 0
          )}`,

          `Pro Person: ${formatEuro(
            game.proKopf || 0
          )}`,

          `Belastete Spieler: ${
            members.join(', ') ||
            '-'
          }`
        ];

        gameDetails.forEach(
          detail => {
            const lines =
              doc.splitTextToSize(
                getPlainText(detail),
                pageWidth -
                margin * 2 -
                10
              );

            doc.text(
              lines,
              margin + 5,
              currentY
            );

            currentY +=
              Math.max(
                4.5,
                lines.length * 4
              );
          }
        );

        currentY += 4;
      }
    );
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
        'tiberius'
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

        let gameTitle =
          'Spiel';

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

  return doc;
}

async function closeStrafenAndExportPDF() {
  const missingStatuses =
    getMissingMemberStatuses();

  if (
    missingStatuses.length
  ) {
    showToast(
      `❌ Status fehlt: ${missingStatuses.join(', ')}`,
      'error'
    );

    return;
  }

  try {
    const snapshot =
      getStrafenSnapshot();

    const doc =
      await generateStrafenPDF(
        snapshot
      );

    const dateStr =
      new Date()
        .toISOString()
        .slice(0, 10);

    const clubName =
      getSafePdfClubName();

    const filename =
      `${clubName}_Strafenabrechnung_${dateStr}.pdf`;

    doc.save(
      filename
    );

    await archiveStrafenEvent(
      snapshot
    );

    showToast(
      '✅ Straf-PDF erstellt und archiviert',
      'success'
    );
  } catch (error) {
    console.error(
      'Fehler beim Strafabschluss:',
      error
    );

    showToast(
      '❌ Fehler beim Strafabschluss',
      'error'
    );
  }
}

async function archiveStrafenEvent(snapshot) {
  if (!window.firestoreApi || !ACTIVE_CLUB) return;

  const clubId = getClubFirestoreId(ACTIVE_CLUB);
  const archiveId = 'strafen_' + new Date().toISOString().replace(/[:.]/g, '-');

  await window.firestoreApi.archiveClubEvent(clubId, archiveId, {
    ...snapshot,
    status: 'closed',
    closedAt: new Date().toISOString(),
    club: ACTIVE_CLUB,
    category: 'strafen'
  });
}