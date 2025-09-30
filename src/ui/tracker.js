import { normalizeAudioConfig } from '../audio/index.js';

const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const MOD_OPTIONS = [
  { value: 'none', label: 'None (dry signal)' },
  { value: 'lpf', label: 'Low-pass smooth' },
  { value: 'hpf', label: 'High-pass snap' },
  { value: 'bitcrush', label: 'Bitcrush grit' },
  { value: 'chorus', label: 'Chorus doubler' },
  { value: 'delay', label: 'Echo delay' }
];

const TIME_DIVISION_OPTIONS = [
  { value: 1, label: 'Quarter (1/4)' },
  { value: 2, label: 'Eighth (1/8)' },
  { value: 3, label: 'Triplet (1/12)' },
  { value: 4, label: 'Sixteenth (1/16)' },
  { value: 6, label: 'Sixteenth Triplet (1/24)' },
  { value: 8, label: 'Thirty-second (1/32)' }
];

function formatPitch(value) {
  const numeric = Number.parseInt(value, 10) || 0;
  if (numeric === 0) return '0 st';
  return `${numeric > 0 ? '+' : ''}${numeric} st`;
}

function formatVolume(value) {
  const numeric = Number.parseFloat(value);
  return `${Math.round(clamp(numeric, 0, 2) * 100)}%`;
}

function formatPan(value) {
  const numeric = Number.parseFloat(value) || 0;
  if (Math.abs(numeric) < 0.01) return 'Center';
  return numeric < 0 ? `Left ${Math.round(Math.abs(numeric) * 100)}%` : `Right ${Math.round(numeric * 100)}%`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function getSampleById(audioConfig, sampleId) {
  if (!sampleId) return null;
  return audioConfig.sampleLibrary.find((sample) => sample.id === sampleId) ?? null;
}

function getSampleSlotLabel(audioConfig, track, slotIndex) {
  const slot = track.sampleSlots?.[slotIndex];
  if (!slot) return `Slot ${slotIndex + 1}`;
  const sample = getSampleById(audioConfig, slot.sampleId);
  if (!sample) return `Slot ${slotIndex + 1}: Empty`;
  return `Slot ${slotIndex + 1}: ${sample.name}`;
}

function createLibraryCard(sample, onPreview) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tracker-sample';
  button.style.setProperty('--sample-color', sample.color ?? '#48e5c2');

  const name = document.createElement('span');
  name.className = 'tracker-sample__name';
  name.textContent = sample.name;

  const meta = document.createElement('span');
  meta.className = 'tracker-sample__meta';
  meta.textContent = sample.category ?? '';

  const description = document.createElement('span');
  description.className = 'tracker-sample__description';
  description.textContent = sample.description ?? '';

  button.append(name, meta, description);

  button.addEventListener('click', () => {
    if (typeof onPreview === 'function') {
      onPreview(sample.id);
    }
  });

  return button;
}

function createStepButton(stepIndex) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tracker-step';
  if ((stepIndex + 1) % 4 === 0) {
    button.classList.add('tracker-step--bar');
  }

  const indexLabel = document.createElement('span');
  indexLabel.className = 'tracker-step__index';
  indexLabel.textContent = String(stepIndex + 1);

  const sampleLabel = document.createElement('span');
  sampleLabel.className = 'tracker-step__label';
  sampleLabel.textContent = '';

  button.append(indexLabel, sampleLabel);
  return { button, sampleLabel };
}

function createEmptyStep() {
  return {
    enabled: false,
    sampleSlot: 0,
    pitch: 0,
    volume: 1,
    pan: 0,
    reverse: false,
    mod: 'none'
  };
}

export function createTrackerPanel(initialAudioConfig = {}, { onChange, onSamplePreview } = {}) {
  let audioConfig = normalizeAudioConfig(initialAudioConfig);
  let selected = { trackIndex: 0, stepIndex: 0 };
  const trackSlotViews = [];
  const trackViews = [];
  let stepEditor = null;

  const root = document.createElement('div');
  root.className = 'tracker';

  const header = document.createElement('header');
  header.className = 'tracker__header';
  const title = document.createElement('h3');
  title.textContent = 'Demo-Tracker';
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Multi-track pattern editor with extendable 8-step blocks.';
  header.append(title, subtitle);
  root.appendChild(header);

  const libraryCard = document.createElement('section');
  libraryCard.className = 'tracker__library-card tracker__panel';
  const libraryHeading = document.createElement('h4');
  libraryHeading.textContent = 'Sample Library';
  const libraryHint = document.createElement('p');
  libraryHint.className = 'tracker__hint';
  libraryHint.textContent = 'Click a card to preview and then assign it to a track slot.';
  const libraryGrid = document.createElement('div');
  libraryGrid.className = 'tracker-library__grid';
  libraryCard.append(libraryHeading, libraryHint, libraryGrid);
  root.appendChild(libraryCard);

  const timelineSection = document.createElement('section');
  timelineSection.className = 'tracker__timeline tracker__panel';
  root.appendChild(timelineSection);

  const timelineHeader = document.createElement('header');
  timelineHeader.className = 'tracker__timeline-header';
  timelineSection.appendChild(timelineHeader);

  const timelineTitle = document.createElement('h4');
  timelineTitle.textContent = 'Pattern Steps';
  timelineHeader.appendChild(timelineTitle);

  const tempoControl = document.createElement('div');
  tempoControl.className = 'tracker__tempo';
  timelineHeader.appendChild(tempoControl);

  const tempoSlider = document.createElement('div');
  tempoSlider.className = 'tracker__tempo-slider';
  tempoControl.appendChild(tempoSlider);

  const tempoLabel = document.createElement('span');
  tempoLabel.textContent = 'Tempo';
  tempoSlider.appendChild(tempoLabel);

  const tempoInput = document.createElement('input');
  tempoInput.type = 'range';
  tempoInput.min = '40';
  tempoInput.max = '200';
  tempoInput.step = '1';
  tempoSlider.appendChild(tempoInput);

  const tempoValue = document.createElement('span');
  tempoValue.className = 'tracker__tempo-value';
  tempoSlider.appendChild(tempoValue);

  const divisionGroup = document.createElement('div');
  divisionGroup.className = 'tracker__division-group';
  tempoControl.appendChild(divisionGroup);

  const divisionLabel = document.createElement('span');
  divisionLabel.textContent = 'Step length';
  divisionGroup.appendChild(divisionLabel);

  const timeDivisionSelect = document.createElement('select');
  timeDivisionSelect.className = 'tracker__time-division';
  TIME_DIVISION_OPTIONS.forEach((option) => {
    timeDivisionSelect.appendChild(createOption(String(option.value), option.label));
  });
  divisionGroup.appendChild(timeDivisionSelect);

  const addStepsButton = document.createElement('button');
  addStepsButton.type = 'button';
  addStepsButton.className = 'tracker__add-steps';
  addStepsButton.textContent = '+8 Steps';
  timelineHeader.appendChild(addStepsButton);

  const tracksPanel = document.createElement('section');
  tracksPanel.className = 'tracker__tracks-panel tracker__panel';
  root.appendChild(tracksPanel);

  const tracksHeading = document.createElement('h4');
  tracksHeading.className = 'tracker__tracks-heading';
  tracksHeading.textContent = 'Step & Tune Editor';
  tracksPanel.appendChild(tracksHeading);

  const editorLayout = document.createElement('div');
  editorLayout.className = 'tracker__editor-layout';
  tracksPanel.appendChild(editorLayout);

  const slotGrid = document.createElement('div');
  slotGrid.className = 'tracker__slot-grid';
  editorLayout.appendChild(slotGrid);

  const stepEditorContainer = document.createElement('div');
  stepEditorContainer.className = 'tracker__step-editor-container';
  editorLayout.appendChild(stepEditorContainer);

  stepEditor = createStepEditor();
  stepEditorContainer.appendChild(stepEditor.root);

  const tracksSection = document.createElement('div');
  tracksSection.className = 'tracker__tracks';
  tracksPanel.appendChild(tracksSection);

  tempoInput.addEventListener('input', () => {
    tempoValue.textContent = `${tempoInput.value} BPM`;
  });

  tempoInput.addEventListener('change', () => {
    const nextBpm = clamp(Number.parseInt(tempoInput.value, 10) || 120, 40, 200);
    tempoInput.value = String(nextBpm);
    tempoValue.textContent = `${nextBpm} BPM`;
    audioConfig.bpm = nextBpm;
    emitChange();
  });

  timeDivisionSelect.addEventListener('change', () => {
    const nextDivision = clamp(Number.parseInt(timeDivisionSelect.value, 10) || 1, 1, 16);
    audioConfig.timeDivision = nextDivision;
    emitChange();
    syncTempoControl();
  });

  addStepsButton.addEventListener('click', () => {
    extendPattern(8);
  });

  function emitChange() {
    if (typeof onChange === 'function') {
      onChange(clone(audioConfig));
    }
  }

  function ensureSelectionBounds() {
    if (!audioConfig.tracks.length) {
      selected = { trackIndex: 0, stepIndex: 0 };
      return;
    }
    selected.trackIndex = clamp(selected.trackIndex, 0, audioConfig.tracks.length - 1);
    const currentTrack = audioConfig.tracks[selected.trackIndex];
    if (!currentTrack || currentTrack.steps.length === 0) {
      selected.stepIndex = 0;
      return;
    }
    selected.stepIndex = clamp(selected.stepIndex, 0, currentTrack.steps.length - 1);
  }

  function getSelectedStep() {
    const track = audioConfig.tracks[selected.trackIndex];
    if (!track) return null;
    return track.steps[selected.stepIndex] ?? null;
  }

  function getSelectedTrack() {
    return audioConfig.tracks[selected.trackIndex] ?? null;
  }

  function syncTempoControl() {
    const bpm = clamp(Math.round(audioConfig.bpm ?? 120), 40, 200);
    tempoInput.value = String(bpm);
    tempoValue.textContent = `${bpm} BPM`;

    const division = clamp(Math.round(audioConfig.timeDivision ?? 2), 1, 16);
    const hasOption = Array.from(timeDivisionSelect.options).some((option) => option.value === String(division));
    if (!hasOption) {
      const customOption = createOption(String(division), `Custom (${division} steps/beat)`);
      customOption.dataset.custom = 'true';
      timeDivisionSelect.appendChild(customOption);
    }
    Array.from(timeDivisionSelect.options)
      .filter((option) => option.dataset?.custom === 'true' && option.value !== String(division))
      .forEach((option) => option.remove());
    timeDivisionSelect.value = String(division);
  }

  function updateTimelineMeta() {
    const totalSteps = audioConfig.stepsPerBar ?? audioConfig.tracks[0]?.steps?.length ?? 0;
    const stepsLabel = totalSteps === 1 ? 'step' : 'steps';
    const division = Math.max(1, audioConfig.timeDivision ?? 2);
    const beats = totalSteps / division;
    const bars = beats / 4;
    const barsLabel = Number.isFinite(bars) && bars > 0
      ? ` • ${bars % 1 === 0 ? `${bars} bar${bars === 1 ? '' : 's'}` : `${bars.toFixed(2)} bars`}`
      : '';
    timelineTitle.textContent = `Pattern Steps (${totalSteps} ${stepsLabel}${barsLabel})`;
    addStepsButton.disabled = audioConfig.tracks.length === 0;
    syncTempoControl();
  }

  function extendPattern(stepBlockSize = 8) {
    if (audioConfig.tracks.length === 0) {
      return;
    }

    const increment = Math.max(1, stepBlockSize);
    audioConfig.stepsPerBar = (audioConfig.stepsPerBar ?? 0) + increment;
    audioConfig.tracks.forEach((track) => {
      for (let index = 0; index < increment; index += 1) {
        track.steps.push(createEmptyStep());
      }
    });

    const targetTrack = audioConfig.tracks[selected.trackIndex];
    if (targetTrack) {
      selected.stepIndex = clamp(targetTrack.steps.length - increment, 0, targetTrack.steps.length - 1);
    }

    emitChange();
    syncAll();
  }

  function updateLibrary() {
    libraryGrid.innerHTML = '';
    if (audioConfig.sampleLibrary.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tracker__empty';
      empty.textContent = 'No samples loaded yet. Add them to config/config.json to expand your palette!';
      libraryGrid.appendChild(empty);
      return;
    }
    audioConfig.sampleLibrary.forEach((sample) => {
      libraryGrid.appendChild(createLibraryCard(sample, onSamplePreview));
    });
  }

  function buildSlotGrid() {
    slotGrid.innerHTML = '';
    trackSlotViews.length = 0;

    if (audioConfig.tracks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tracker__empty';
      empty.textContent = 'Add tracks to start assigning samples.';
      slotGrid.appendChild(empty);
      syncTrackSelection();
      return;
    }

    audioConfig.tracks.forEach((track, index) => {
      const view = createTrackSlotCard(track, index);
      trackSlotViews[index] = view;
      slotGrid.appendChild(view.root);
    });

    syncTrackSelection();
  }

  function createTrackSlotCard(track, trackIndex) {
    const card = document.createElement('article');
    card.className = 'tracker-track-card';
    card.style.setProperty('--track-color', track.color ?? '#48e5c2');

    const headerRow = document.createElement('header');
    headerRow.className = 'tracker-track-card__header';
    const heading = document.createElement('h5');
    heading.textContent = track.name ?? `Track ${trackIndex + 1}`;
    headerRow.appendChild(heading);
    card.appendChild(headerRow);

    const slotsWrapper = document.createElement('div');
    slotsWrapper.className = 'tracker-track-card__slots';
    card.appendChild(slotsWrapper);

    const slotSelects = [];
    track.sampleSlots.forEach((slot, slotIndex) => {
      const slotLabel = document.createElement('label');
      slotLabel.className = 'tracker-slot';
      const name = document.createElement('span');
      name.className = 'tracker-slot__name';
      name.textContent = `Slot ${slotIndex + 1}`;
      const select = document.createElement('select');
      select.appendChild(createOption('', 'Empty'));
      audioConfig.sampleLibrary.forEach((sample) => {
        select.appendChild(createOption(sample.id, sample.name));
      });
      select.value = slot.sampleId ?? '';
      select.addEventListener('change', () => {
        const nextValue = select.value || null;
        audioConfig.tracks[trackIndex].sampleSlots[slotIndex].sampleId = nextValue;
        emitChange();
        syncSlotOptions(trackIndex);
        syncTrack(trackIndex);
        if (selected.trackIndex === trackIndex) {
          syncEditor();
        }
      });
      slotLabel.append(name, select);
      slotsWrapper.appendChild(slotLabel);
      slotSelects.push(select);
    });

    card.addEventListener('click', (event) => {
      if (event.target.closest('select')) return;
      selected.trackIndex = trackIndex;
      ensureSelectionBounds();
      syncTracks();
      syncEditor();
    });

    return { root: card, slotSelects };
  }

  function syncTrackSelection() {
    trackSlotViews.forEach((view, index) => {
      if (!view) return;
      view.root.classList.toggle('tracker-track-card--active', index === selected.trackIndex);
    });
    trackViews.forEach((view, index) => {
      if (!view) return;
      view.section.classList.toggle('tracker-track--active', index === selected.trackIndex);
    });
  }

  function buildTrackView(track, trackIndex) {
    const section = document.createElement('article');
    section.className = 'tracker-track';
    section.style.setProperty('--track-color', track.color ?? '#48e5c2');

    const headerRow = document.createElement('header');
    headerRow.className = 'tracker-track__header';
    const heading = document.createElement('h5');
    heading.textContent = track.name ?? `Track ${trackIndex + 1}`;
    headerRow.appendChild(heading);
    section.appendChild(headerRow);

    const grid = document.createElement('div');
    grid.className = 'tracker-track__grid';
    grid.style.gridTemplateColumns = `repeat(${Math.max(track.steps.length, 1)}, minmax(72px, 1fr))`;
    const stepButtons = [];
    const stepLabels = [];
    track.steps.forEach((_, stepIndex) => {
      const { button, sampleLabel } = createStepButton(stepIndex);
      button.addEventListener('click', () => {
        selected = { trackIndex, stepIndex };
        const step = audioConfig.tracks[trackIndex].steps[stepIndex];
        if (!step.enabled) {
          const defaultSlot = audioConfig.tracks[trackIndex].sampleSlots.findIndex((slot) => slot.sampleId);
          if (defaultSlot >= 0) {
            step.sampleSlot = defaultSlot;
          }
          step.enabled = true;
          emitChange();
        }
        syncTrack(trackIndex);
        syncEditor();
      });
      grid.appendChild(button);
      stepButtons.push(button);
      stepLabels.push(sampleLabel);
    });
    section.appendChild(grid);

    return { section, heading, stepButtons, stepLabels, grid };
  }

  function buildTracks() {
    tracksSection.innerHTML = '';
    trackViews.length = 0;
    audioConfig.tracks.forEach((track, index) => {
      const view = buildTrackView(track, index);
      trackViews[index] = view;
      tracksSection.appendChild(view.section);
    });
  }

  function syncSlotOptions(trackIndex) {
    const slotView = trackSlotViews[trackIndex];
    const track = audioConfig.tracks[trackIndex];
    if (!slotView || !track) return;
    slotView.slotSelects.forEach((select, slotIndex) => {
      select.innerHTML = '';
      select.appendChild(createOption('', 'Empty'));
      audioConfig.sampleLibrary.forEach((sample) => {
        select.appendChild(createOption(sample.id, sample.name));
      });
      select.value = track.sampleSlots[slotIndex]?.sampleId ?? '';
    });
  }

  function syncTrack(trackIndex) {
    const view = trackViews[trackIndex];
    const track = audioConfig.tracks[trackIndex];
    if (!view || !track) return;

    syncSlotOptions(trackIndex);

    view.grid.style.gridTemplateColumns = `repeat(${Math.max(track.steps.length, 1)}, minmax(72px, 1fr))`;

    track.steps.forEach((step, stepIndex) => {
      const button = view.stepButtons[stepIndex];
      const label = view.stepLabels[stepIndex];
      if (!button || !label) return;
      button.classList.toggle('tracker-step--active', Boolean(step.enabled));
      button.classList.toggle('tracker-step--selected',
        selected.trackIndex === trackIndex && selected.stepIndex === stepIndex
      );
      const slotLabel = getSampleSlotLabel(audioConfig, track, step.sampleSlot ?? 0);
      label.textContent = step.enabled ? slotLabel.replace(/^Slot \d+:\s*/, '') : '—';
      button.title = `${track.name ?? 'Track'} • Step ${stepIndex + 1}${step.enabled ? ` • ${slotLabel}` : ''}`;
    });
  }

  function syncTracks() {
    audioConfig.tracks.forEach((_, index) => syncTrack(index));
  }

  function createStepEditor() {
    const root = document.createElement('div');
    root.className = 'tracker-step-editor';

    const title = document.createElement('div');
    title.className = 'tracker-step-editor__title';
    root.appendChild(title);

    const enableLabel = document.createElement('label');
    enableLabel.className = 'tracker-step-editor__row';
    const enableText = document.createElement('span');
    enableText.textContent = 'Enable step';
    const enableToggle = document.createElement('input');
    enableToggle.type = 'checkbox';
    enableLabel.append(enableText, enableToggle);

    const sampleLabel = document.createElement('label');
    sampleLabel.className = 'tracker-step-editor__row';
    const sampleText = document.createElement('span');
    sampleText.textContent = 'Sample slot';
    const sampleSelect = document.createElement('select');
    sampleLabel.append(sampleText, sampleSelect);

    const pitchLabel = document.createElement('label');
    pitchLabel.className = 'tracker-step-editor__row';
    const pitchText = document.createElement('span');
    pitchText.textContent = 'Pitch';
    const pitchValue = document.createElement('span');
    pitchValue.className = 'tracker-step-editor__value';
    const pitchInput = document.createElement('input');
    pitchInput.type = 'range';
    pitchInput.min = '-24';
    pitchInput.max = '24';
    pitchInput.step = '1';
    const pitchWrapper = document.createElement('div');
    pitchWrapper.className = 'tracker-step-editor__control';
    pitchWrapper.append(pitchInput, pitchValue);
    pitchLabel.append(pitchText, pitchWrapper);

    const volumeLabel = document.createElement('label');
    volumeLabel.className = 'tracker-step-editor__row';
    const volumeText = document.createElement('span');
    volumeText.textContent = 'Volume';
    const volumeValue = document.createElement('span');
    volumeValue.className = 'tracker-step-editor__value';
    const volumeInput = document.createElement('input');
    volumeInput.type = 'range';
    volumeInput.min = '0';
    volumeInput.max = '1.5';
    volumeInput.step = '0.01';
    const volumeWrapper = document.createElement('div');
    volumeWrapper.className = 'tracker-step-editor__control';
    volumeWrapper.append(volumeInput, volumeValue);
    volumeLabel.append(volumeText, volumeWrapper);

    const panLabel = document.createElement('label');
    panLabel.className = 'tracker-step-editor__row';
    const panText = document.createElement('span');
    panText.textContent = 'Pan';
    const panValue = document.createElement('span');
    panValue.className = 'tracker-step-editor__value';
    const panInput = document.createElement('input');
    panInput.type = 'range';
    panInput.min = '-1';
    panInput.max = '1';
    panInput.step = '0.05';
    const panWrapper = document.createElement('div');
    panWrapper.className = 'tracker-step-editor__control';
    panWrapper.append(panInput, panValue);
    panLabel.append(panText, panWrapper);

    const reverseLabel = document.createElement('label');
    reverseLabel.className = 'tracker-step-editor__row';
    const reverseText = document.createElement('span');
    reverseText.textContent = 'Reverse';
    const reverseToggle = document.createElement('input');
    reverseToggle.type = 'checkbox';
    reverseLabel.append(reverseText, reverseToggle);

    const modLabel = document.createElement('label');
    modLabel.className = 'tracker-step-editor__row';
    const modText = document.createElement('span');
    modText.textContent = 'Mod FX';
    const modSelect = document.createElement('select');
    MOD_OPTIONS.forEach((option) => {
      modSelect.appendChild(createOption(option.value, option.label));
    });
    modLabel.append(modText, modSelect);

    root.append(
      enableLabel,
      sampleLabel,
      pitchLabel,
      volumeLabel,
      panLabel,
      reverseLabel,
      modLabel
    );

    enableToggle.addEventListener('change', () => {
      const step = getSelectedStep();
      if (!step) return;
      step.enabled = enableToggle.checked;
      emitChange();
      syncTrack(selected.trackIndex);
      syncEditor();
    });

    sampleSelect.addEventListener('change', () => {
      const step = getSelectedStep();
      if (!step) return;
      step.sampleSlot = Number.parseInt(sampleSelect.value, 10) || 0;
      emitChange();
      syncTrack(selected.trackIndex);
      syncEditor();
    });

    pitchInput.addEventListener('input', () => {
      pitchValue.textContent = formatPitch(pitchInput.value);
    });
    pitchInput.addEventListener('change', () => {
      const step = getSelectedStep();
      if (!step) return;
      step.pitch = Number.parseInt(pitchInput.value, 10) || 0;
      emitChange();
    });

    volumeInput.addEventListener('input', () => {
      volumeValue.textContent = formatVolume(volumeInput.value);
    });
    volumeInput.addEventListener('change', () => {
      const step = getSelectedStep();
      if (!step) return;
      step.volume = Number.parseFloat(volumeInput.value) || 0;
      emitChange();
    });

    panInput.addEventListener('input', () => {
      panValue.textContent = formatPan(panInput.value);
    });
    panInput.addEventListener('change', () => {
      const step = getSelectedStep();
      if (!step) return;
      step.pan = Number.parseFloat(panInput.value) || 0;
      emitChange();
      syncTrack(selected.trackIndex);
    });

    reverseToggle.addEventListener('change', () => {
      const step = getSelectedStep();
      if (!step) return;
      step.reverse = reverseToggle.checked;
      emitChange();
    });

    modSelect.addEventListener('change', () => {
      const step = getSelectedStep();
      if (!step) return;
      step.mod = modSelect.value;
      emitChange();
    });

    return {
      root,
      title,
      enableToggle,
      sampleSelect,
      pitchInput,
      pitchValue,
      volumeInput,
      volumeValue,
      panInput,
      panValue,
      reverseToggle,
      modSelect
    };
  }

  function syncEditor() {
    ensureSelectionBounds();
    syncTrackSelection();

    if (!stepEditor) return;

    const track = getSelectedTrack();
    const step = getSelectedStep();
    if (!track || !step) {
      stepEditor.root.classList.add('tracker-step-editor--hidden');
      return;
    }

    stepEditor.root.classList.remove('tracker-step-editor--hidden');
    stepEditor.title.textContent = `${track.name ?? 'Track'} • Step ${selected.stepIndex + 1}`;

    stepEditor.enableToggle.checked = Boolean(step.enabled);

    stepEditor.sampleSelect.innerHTML = '';
    track.sampleSlots.forEach((_, slotIndex) => {
      stepEditor.sampleSelect.appendChild(createOption(String(slotIndex), getSampleSlotLabel(audioConfig, track, slotIndex)));
    });
    stepEditor.sampleSelect.value = String(step.sampleSlot ?? 0);

    stepEditor.pitchInput.value = String(step.pitch ?? 0);
    stepEditor.pitchValue.textContent = formatPitch(step.pitch ?? 0);

    stepEditor.volumeInput.value = String(step.volume ?? 1);
    stepEditor.volumeValue.textContent = formatVolume(step.volume ?? 1);

    stepEditor.panInput.value = String(step.pan ?? 0);
    stepEditor.panValue.textContent = formatPan(step.pan ?? 0);

    stepEditor.reverseToggle.checked = Boolean(step.reverse);
    stepEditor.modSelect.value = step.mod ?? 'none';

    const disabled = !step.enabled;
    [
      stepEditor.sampleSelect,
      stepEditor.pitchInput,
      stepEditor.volumeInput,
      stepEditor.panInput,
      stepEditor.reverseToggle,
      stepEditor.modSelect
    ].forEach((control) => {
      control.disabled = disabled;
    });
  }

  function syncAll() {
    ensureSelectionBounds();
    updateLibrary();
    buildSlotGrid();
    buildTracks();
    updateTimelineMeta();
    syncTracks();
    syncEditor();
  }

  syncAll();

  function update(nextAudioConfig) {
    audioConfig = normalizeAudioConfig(nextAudioConfig ?? {});
    ensureSelectionBounds();
    syncAll();
  }

  return {
    element: root,
    update
  };
}
