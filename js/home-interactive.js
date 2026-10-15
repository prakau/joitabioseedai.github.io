document.addEventListener('DOMContentLoaded', () => {
  const tasks = {
    crop: [
      ['Check a crop photo', 'Visible symptoms and practical next checks.', '/farmassist/#/diagnose'],
      ['Check local weather', 'Location-specific forecasts and dated observations.', '/farmassist/#/weather'],
    ],
    records: [
      ['Open Crop Diary', 'Record symptoms, compare observations, and share an expert report.', '/farmassist/#/diary'],
      ['Plan field tasks', 'Save crop tasks and recheck dates in your calendar.', '/farmassist/#/calendar'],
    ],
    selling: [
      ['Compare buyer offers', 'Estimate proceeds after transport, fees, and commission.', '/farmassist/#/sales'],
      ['Check mandi prices', 'Dated market records, with availability shown clearly.', '/farmassist/#/market'],
    ],
    pilots: [
      ['Explore field evaluation', 'Review the validation approach and supervised pilot pathway.', '/data-validation.html'],
      ['Work with JOITA', 'Connect about an FPO programme or research collaboration.', '/farmers-fpos.html'],
    ],
  };
  const taskLinks = document.querySelector('#task-links');
  document.querySelectorAll('[name="field-goal"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (!radio.checked || !tasks[radio.value]) return;
      taskLinks.replaceChildren(...tasks[radio.value].map(([title, detail, href]) => {
        const link = document.createElement('a'); link.href = href;
        const heading = document.createElement('strong'); heading.textContent = title;
        const description = document.createElement('span'); description.textContent = detail;
        const arrow = document.createElement('b'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
        link.append(heading, description, arrow); return link;
      }));
    });
  });

  const form = document.querySelector('#home-question');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.querySelector('#home-crop-question');
    const error = document.querySelector('#home-question-error');
    const question = input.value.trim();
    error.hidden = true;
    if (!question || question.length > 1000) {
      error.textContent = 'Enter a question of 1 to 1,000 characters.'; error.hidden = false; input.focus(); return;
    }
    try {
      // Same-tab, short-lived handoff: never place a farmer's question in a URL.
      sessionStorage.setItem('joita-fa-launch-question', JSON.stringify({
        id: crypto.randomUUID(), question, language: document.querySelector('#home-answer-language').value, createdAt: Date.now(),
      }));
      location.assign('/farmassist/#/ask');
    } catch {
      error.textContent = 'Your browser blocked the question handoff. Open JOITAFA using the link above to ask there.'; error.hidden = false;
    }
  });

  const products = [
    { css: 'product-prime', name: 'BioSynth Prime', categories: ['inputs', 'water'], focus: 'Soil-water resilience', stage: 'Field evaluation in progress', use: 'FA-WAP hydrogel research from rice stubble and fly ash.', href: '/products.html#biosynth-prime' },
    { css: 'product-nano', name: 'BioSynth Nano', categories: ['inputs'], focus: 'Functional crop inputs', stage: 'Research sample; supervised evaluation', use: 'Carbon Quantum Dot aqueous dispersion for supervised crop evaluation.', href: '/products.html#biosynth-nano' },
    { css: 'product-ai', name: 'JOITAFA', categories: ['digital'], focus: 'Crop advisory and field records', stage: 'Public app; pilot advisory', use: 'Hindi and English guidance, crop diary, weather and sale planning.', href: '/farmassist-ai.html' },
    { css: 'product-edge', name: 'AgriTrust TriLeaf Edge Node', categories: ['sensing'], focus: 'Root-zone sensing', stage: 'Pilot and evaluation enquiries', use: 'Sensing and edge-computing for field measurements.', href: '/agritrust-trileaf-edge-node.html' },
    { css: 'product-seed', name: 'SmartSeedMat', categories: ['inputs'], focus: 'Seed and nursery support', stage: 'Pilot and evaluation enquiries', use: 'Material for early-stage crop establishment research.', href: '/products.html#smartseedmat' },
    { css: 'product-aqua', name: 'AquaSynth Nano', categories: ['water'], focus: 'Aquaculture', stage: 'Controlled pilots', use: 'Water-quality management research and evaluation.', href: '/products.html#aquasynth-nano' },
    { css: 'product-soil', name: 'JOITA Soil Sathi App', categories: ['digital', 'sensing'], focus: 'Soil measurement records', stage: 'Field-team workflow', use: 'Organise multi-parameter soil readings from compatible sensors.', href: '/soil-sathi-app.html' },
  ];
  const selected = new Set();
  const cards = products.map(product => {
    const card = document.querySelector(`.home-product-card.${product.css}`);
    const actions = document.createElement('div'); actions.className = 'product-actions';
    const label = document.createElement('label'); const check = document.createElement('input');
    check.type = 'checkbox'; check.setAttribute('aria-label', `Compare ${product.name}`);
    label.append(check, document.createTextNode('Compare'));
    const link = document.createElement('a'); link.href = product.href; link.textContent = 'Details ↗'; link.setAttribute('aria-label', `${product.name} details`);
    actions.append(label, link); card.append(actions);
    check.addEventListener('change', () => {
      const error = document.querySelector('#comparison-error'); error.hidden = true;
      if (check.checked && selected.size >= 3) {
        check.checked = false; error.textContent = 'Compare up to three products. Clear a selection to add another.'; error.hidden = false; return;
      }
      if (check.checked) selected.add(product); else selected.delete(product);
      card.classList.toggle('is-selected', check.checked); syncSelection();
    });
    return { product, card, check };
  });
  const open = document.querySelector('#open-comparison');
  const dialog = document.querySelector('#product-comparison');
  // Keep the fixed action bar outside scroll-reveal sections, which create containing blocks.
  document.body.append(document.querySelector('.comparison-bar'));
  function syncSelection() {
    document.querySelector('.comparison-bar').hidden = !selected.size;
    document.body.classList.toggle('comparison-active', selected.size > 0);
    document.documentElement.classList.toggle('product-comparison-active', selected.size > 0);
    const count = document.querySelector('#comparison-count');
    count.textContent = `${selected.size} of 3 products selected`;
    count.title = [...selected].map(p => p.name).join(', ');
    open.disabled = selected.size < 2;
  }
  const search = document.querySelector('#product-search');
  const category = document.querySelector('#product-category');
  function filter() {
    const query = search.value.trim().normalize('NFKC').toLowerCase(); let count = 0;
    for (const { product, card } of cards) {
      const visible = (category.value === 'all' || product.categories.includes(category.value)) && [product.name, product.focus, product.use, product.stage].join(' ').toLowerCase().includes(query);
      card.hidden = !visible;
      if (visible) { count++; card.classList.add('is-visible'); }
    }
    document.querySelector('#product-count').textContent = `${count} of ${products.length} products`;
    document.querySelector('#products-empty').hidden = count !== 0;
  }
  search.addEventListener('input', filter); category.addEventListener('change', filter);
  document.querySelector('#reset-products').addEventListener('click', () => { search.value = ''; category.value = 'all'; filter(); search.focus(); });
  document.querySelector('#clear-comparison').addEventListener('click', () => {
    selected.clear(); cards.forEach(({card, check}) => { check.checked = false; card.classList.remove('is-selected'); });
    document.querySelector('#comparison-error').hidden = true; syncSelection(); search.focus();
  });
  open.addEventListener('click', () => {
    if (selected.size < 2) return;
    const body = document.querySelector('#comparison-body'); body.replaceChildren();
    for (const [label, key] of [['Product', 'name'], ['Focus', 'focus'], ['Current stage', 'stage'], ['Intended workflow', 'use'], ['Explore', 'href']]) {
      const row = document.createElement('tr'); const heading = document.createElement('th'); heading.scope = 'row'; heading.textContent = label; row.append(heading);
      for (const product of selected) {
        const cell = document.createElement(key === 'name' ? 'th' : 'td');
        if (key === 'name') cell.scope = 'col';
        if (key === 'href') { const link = document.createElement('a'); link.href = product.href; link.textContent = `Explore ${product.name}`; cell.append(link); }
        else cell.textContent = product[key];
        row.append(cell);
      }
      body.append(row);
    }
    dialog.showModal();
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => open.focus());
  document.querySelector('.product-controls').hidden = false;
  document.querySelector('#product-count').hidden = false; filter();
});
