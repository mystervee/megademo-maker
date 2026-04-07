const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const DEFAULT_SAMPLE_LIBRARY = [
  { id: 'synth-1', name: 'Synth/Bass' },
  { id: 'synth-2', name: 'Synth/Bass' },
  { id: 'synth-3', name: 'Synth/Bass' },
  { id: 'synth-4', name: 'Synth/Bass' },
  { id: 'synth-5', name: 'Synth/Bass' },
  { id: 'synth-6', name: 'Synth/Bass' },
  { id: 'synth-7', name: 'Synth/Bass' },
  { id: 'synth-8', name: 'Synth/Bass' },
  { id: 'drum-1', name: 'Drum/Perc' },
  { id: 'drum-2', name: 'Drum/Perc' },
  { id: 'drum-3', name: 'Drum/Perc' },
  { id: 'drum-4', name: 'Drum/Perc' },
  { id: 'drum-5', name: 'Drum/Perc' },
  { id: 'drum-6', name: 'Drum/Perc' },
  { id: 'drum-7', name: 'Drum/Perc' },
  { id: 'drum-8', name: 'Drum/Perc' }
];

export function createTrackerPanel(initialConfig = {}, { onChange, onSamplePreview } = {}) {
  let trackerState = initialConfig.globalTune || {
    steps: Array.from({ length: 64 }, () => ({
      channels: Array.from({ length: 5 }, () => ({
        sampleId: null,
        pitch: 0,
        volume: 1
      }))
    })),
    trackEffects: Array.from({ length: 5 }, () => ({
      reverb: 0,
      delay: 0,
      filter: 0
    }))
  };

  let sampleLibrary = initialConfig.audio?.sampleLibrary || initialConfig.sampleLibrary || [];
  if (sampleLibrary.length === 0) {
    sampleLibrary = clone(DEFAULT_SAMPLE_LIBRARY);
  }
  let activeSample = null;

  const root = document.createElement('div');
  root.className = 'tracker-ui';
  root.style.display = 'flex';
  root.style.flexDirection = 'row';
  root.style.gap = '20px';
  root.style.height = '100%';
  root.style.minWidth = '0';

  const libraryContainer = document.createElement('div');
  libraryContainer.className = 'tracker-library';
  libraryContainer.style.width = '200px';
  libraryContainer.style.borderRight = '1px solid #ccc';
  libraryContainer.style.paddingRight = '10px';
  libraryContainer.style.display = 'flex';
  libraryContainer.style.flexDirection = 'column';

  const libraryHeading = document.createElement('h3');
  libraryHeading.textContent = 'Sample Library';
  libraryHeading.style.marginBottom = '10px';
  libraryContainer.appendChild(libraryHeading);

  const libraryList = document.createElement('ul');
  libraryList.style.listStyle = 'none';
  libraryList.style.padding = '0';
  libraryList.style.margin = '0';
  libraryList.style.flex = '1';
  libraryList.style.overflowY = 'auto';

  function renderLibrary() {
    libraryList.innerHTML = '';
    sampleLibrary.forEach((sample) => {
      const li = document.createElement('li');
      li.textContent = sample.name || sample.id;
      li.style.cursor = 'pointer';
      li.style.padding = '8px';
      li.style.borderRadius = '4px';
      li.style.border = activeSample === sample.id ? '2px solid #48e5c2' : '1px solid #eee';
      li.style.marginBottom = '5px';
      li.style.backgroundColor = activeSample === sample.id ? 'rgba(72, 229, 194, 0.1)' : 'transparent';
      li.addEventListener('click', () => {
        activeSample = sample.id;
        renderLibrary();
        if (typeof onSamplePreview === 'function') {
          onSamplePreview(sample.id);
        }
      });
      libraryList.appendChild(li);
    });
  }
  renderLibrary();
  libraryContainer.appendChild(libraryList);
  root.appendChild(libraryContainer);

  const gridContainerWrapper = document.createElement('div');
  gridContainerWrapper.style.display = 'flex';
  gridContainerWrapper.style.flexDirection = 'row';
  gridContainerWrapper.style.overflow = 'hidden';
  gridContainerWrapper.style.width = '100%';
  gridContainerWrapper.style.maxWidth = '100%';
  gridContainerWrapper.style.minWidth = '0';
  gridContainerWrapper.style.flex = '1 1 0%';

  const headersContainer = document.createElement('div');
  headersContainer.className = 'tracker-headers';
  headersContainer.style.display = 'flex';
  headersContainer.style.flexDirection = 'column';
  headersContainer.style.width = '200px';
  headersContainer.style.flex = '0 0 auto';
  headersContainer.style.position = 'sticky';
  headersContainer.style.left = '0';
  headersContainer.style.zIndex = '10';
  headersContainer.style.backgroundColor = '#fff';
  headersContainer.style.overflowY = 'auto';

  function createKnob(label, value, onChangeCallback) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'space-between';
    wrapper.style.fontSize = '11px';
    wrapper.style.marginBottom = '2px';

    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.color = '#000000';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(value);
    input.style.width = '80px';
    input.addEventListener('input', (e) => {
      onChangeCallback(Number.parseInt(e.target.value, 10));
    });

    wrapper.append(lbl, input);
    return wrapper;
  }

  function emitChange() {
    if (typeof onChange === 'function') {
      onChange({ globalTune: trackerState });
    }
  }

  function renderHeaders() {
    headersContainer.innerHTML = '';

    const spacer = document.createElement('div');
    spacer.style.height = '24px';
    spacer.style.marginBottom = '4px';
    headersContainer.appendChild(spacer);

    trackerState.trackEffects.forEach((fx, trackIndex) => {
      const header = document.createElement('div');
      header.style.height = '100px';
      header.style.border = '1px solid #ccc';
      header.style.marginBottom = '4px';
      header.style.padding = '5px';
      header.style.boxSizing = 'border-box';
      header.style.display = 'flex';
      header.style.flexDirection = 'column';
      header.style.justifyContent = 'space-between';
      header.style.backgroundColor = '#f9f9f9';

      const title = document.createElement('strong');
      title.textContent = trackIndex === 4 ? 'Drum Track' : `Track ${trackIndex + 1}`;
      title.style.fontSize = '12px';
      title.style.color = '#000000';

      const fxContainer = document.createElement('div');
      fxContainer.style.display = 'flex';
      fxContainer.style.flexDirection = 'column';

      fxContainer.appendChild(createKnob('Reverb', fx.reverb, (val) => {
        trackerState.trackEffects[trackIndex].reverb = val;
        emitChange();
      }));
      fxContainer.appendChild(createKnob('Delay', fx.delay, (val) => {
        trackerState.trackEffects[trackIndex].delay = val;
        emitChange();
      }));
      fxContainer.appendChild(createKnob('Filter', fx.filter, (val) => {
        trackerState.trackEffects[trackIndex].filter = val;
        emitChange();
      }));

      header.append(title, fxContainer);
      headersContainer.appendChild(header);
    });
  }
  renderHeaders();

  const gridScrollable = document.createElement('div');
  gridScrollable.className = 'tracker-grid';
  gridScrollable.style.display = 'flex';
  gridScrollable.style.flexDirection = 'column';
  gridScrollable.style.overflowX = 'auto';
  gridScrollable.style.overflowY = 'hidden';
  gridScrollable.style.paddingBottom = '10px';
  gridScrollable.style.minWidth = '0';
  gridScrollable.style.flex = '1 1 0%';

  function renderGrid() {
    gridScrollable.innerHTML = '';

    const rulerRow = document.createElement('div');
    rulerRow.style.display = 'flex';
    rulerRow.style.flexWrap = 'nowrap';
    rulerRow.style.width = 'max-content';
    rulerRow.style.height = '24px';
    rulerRow.style.marginBottom = '4px';
    for (let stepIndex = 0; stepIndex < 64; stepIndex++) {
      const cell = document.createElement('div');
      cell.style.width = '60px';
      cell.style.minWidth = '60px';
      cell.style.borderRight = (stepIndex + 1) % 4 === 0 ? '2px solid #bbb' : '1px solid #e0e0e0';
      cell.style.display = 'flex';
      cell.style.alignItems = 'center';
      cell.style.justifyContent = 'center';
      cell.style.boxSizing = 'border-box';
      cell.style.fontSize = '10px';
      cell.style.fontWeight = (stepIndex % 4 === 0) ? 'bold' : 'normal';
      cell.style.color = (stepIndex % 4 === 0) ? '#000' : '#888';
      cell.style.backgroundColor = (stepIndex % 4 === 0) ? '#e0e0e0' : '#f0f0f0';
      cell.textContent = String(stepIndex + 1);
      rulerRow.appendChild(cell);
    }
    gridScrollable.appendChild(rulerRow);

    for (let trackIndex = 0; trackIndex < 5; trackIndex++) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.flexWrap = 'nowrap';
      row.style.width = 'max-content';
      row.style.height = '100px';
      row.style.marginBottom = '4px';

      for (let stepIndex = 0; stepIndex < 64; stepIndex++) {
        const cell = document.createElement('div');
        cell.style.width = '60px';
        cell.style.minWidth = '60px';
        cell.style.border = '1px solid #e0e0e0';
        cell.style.borderRight = (stepIndex + 1) % 4 === 0 ? '2px solid #bbb' : '1px solid #e0e0e0';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.cursor = 'pointer';
        cell.style.boxSizing = 'border-box';
        cell.style.fontSize = '10px';
        cell.style.padding = '2px';
        cell.style.textAlign = 'center';
        cell.style.overflow = 'hidden';
        cell.style.textOverflow = 'ellipsis';
        cell.style.whiteSpace = 'nowrap';
        cell.style.userSelect = 'none';

        cell.addEventListener('mousedown', () => {
          if (activeSample) {
            const currentSlot = trackerState.steps[stepIndex].channels[trackIndex];
            if (currentSlot.sampleId === activeSample) {
              currentSlot.sampleId = null;
            } else {
              currentSlot.sampleId = activeSample;
            }
            renderGrid();
            emitChange();
          }
        });

        const slot = trackerState.steps[stepIndex].channels[trackIndex];
        if (slot.sampleId) {
          const sample = sampleLibrary.find((s) => s.id === slot.sampleId);
          cell.textContent = sample ? (sample.name || sample.id) : slot.sampleId;
          cell.style.backgroundColor = '#48e5c2';
          cell.style.color = '#000';
          cell.style.fontWeight = 'bold';
        } else {
          cell.style.backgroundColor = '#fff';
        }

        row.appendChild(cell);
      }
      gridScrollable.appendChild(row);
    }
  }
  renderGrid();

  gridContainerWrapper.append(headersContainer, gridScrollable);
  root.appendChild(gridContainerWrapper);

  function update(nextConfig = {}) {
    if (nextConfig.globalTune) {
      trackerState = nextConfig.globalTune;
    }
    sampleLibrary = nextConfig.audio?.sampleLibrary || nextConfig.sampleLibrary || [];
    if (sampleLibrary.length === 0) {
      sampleLibrary = clone(DEFAULT_SAMPLE_LIBRARY);
    }
    renderLibrary();
    renderHeaders();
    renderGrid();
  }

  return {
    element: root,
    update
  };
}
