/* V170: viewport-pinned headers without changing the tables' horizontal scrolling. */
(() => {
  function setup() {
    // Share the content's stacking context so its dialogs always cover the header.
    const host = document.querySelector('#app .app-content') || document.body;
    const entries = ['drinks-header', 'strafen-header'].map(id => {
      const row = document.getElementById(id);
      if (!row) return null;
      const table = row.closest('table');
      const wrap = table.closest('.drinks-table-wrap');
      const layer = document.createElement('div');
      layer.className = 'kc-fixed-table-header';
      layer.setAttribute('aria-hidden', 'true');
      layer.hidden = true;
      host.append(layer);
      return {table, wrap, head: table.tHead, layer, dirty: true, size: ''};
    }).filter(Boolean);
    if (!entries.length) return;

    let frame = 0;
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    function topOffset() {
      let top = 0;
      for (const element of document.querySelectorAll('#app > header, #team-stopwatch-global')) {
        if (!element.getClientRects().length) continue;
        const rect = element.getBoundingClientRect();
        const position = getComputedStyle(element).position;
        if ((position === 'sticky' || position === 'fixed') && rect.top <= top + 1 && rect.bottom > top) {
          top = rect.bottom;
        }
      }
      return top;
    }

    function update() {
      frame = 0;
      const top = topOffset();
      for (const entry of entries) {
        const {table, wrap, head, layer} = entry;
        if (!table.getClientRects().length || !head.rows[0]?.cells.length) {
          layer.hidden = true;
          continue;
        }
        const bounds = table.getBoundingClientRect();
        const heading = head.getBoundingClientRect();
        if (heading.top >= top || bounds.bottom <= top) {
          layer.hidden = true;
          continue;
        }

        const widths = [...head.rows[0].cells].map(cell => cell.getBoundingClientRect().width);
        const size = [bounds.width, heading.height, ...widths].join(',');
        if (entry.dirty || entry.size !== size) {
          const copy = document.createElement('table');
          copy.className = table.className;
          copy.style.width = bounds.width + 'px';
          const columns = document.createElement('colgroup');
          widths.forEach(width => {
            const column = document.createElement('col');
            column.style.width = width + 'px';
            columns.append(column);
          });
          const clonedHead = head.cloneNode(true);
          clonedHead.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
          [...clonedHead.rows[0].cells].forEach((cell, index) => {
            cell.style.width = cell.style.minWidth = cell.style.maxWidth = widths[index] + 'px';
          });
          copy.append(columns, clonedHead);
          layer.replaceChildren(copy);
          entry.dirty = false;
          entry.size = size;
        }
        const viewport = wrap.getBoundingClientRect();
        layer.style.left = viewport.left + wrap.clientLeft + 'px';
        layer.style.width = wrap.clientWidth + 'px';
        layer.style.height = heading.height + 'px';
        // Push the heading out with the final table row, just like native sticky.
        layer.style.top = Math.min(top, bounds.bottom - heading.height) + 'px';
        layer.hidden = false;
        layer.scrollLeft = wrap.scrollLeft;
      }
    }

    for (const entry of entries) {
      new MutationObserver(() => {
        entry.dirty = true;
        schedule();
      }).observe(entry.head, {childList: true, subtree: true, characterData: true});
    }
    const app = document.getElementById('app');
    if (app) new MutationObserver(records => {
      if (records.some(record => !record.target.closest('.kc-fixed-table-header'))) schedule();
    }).observe(app, {
      attributes: true, subtree: true, attributeFilter: ['class', 'style', 'hidden']
    });
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(schedule);
      entries.forEach(({table, wrap, head}) => [table, wrap, head].forEach(element => observer.observe(element)));
      document.querySelectorAll('#app > header, #team-stopwatch-global').forEach(element => observer.observe(element));
    }
    document.addEventListener('scroll', schedule, {capture: true, passive: true});
    window.addEventListener('resize', schedule, {passive: true});
    document.fonts?.ready.then(schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once: true});
  else setup();
})();
