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

export function createTrackerPanel(initialAudioConfig = {}, { onChange, onSamplePreview } = {}) {
  let audioConfig = normalizeAudioConfig(initialAudioConfig);
  let selected = { trackIndex: 0, stepIndex: 0 };

  const root = document.createElement('div');
  root.className = 'tracker';

  const header = document.createElement('header');
  header.className = 'tracker__header';
  const title = document.createElement('h3');
  title.textContent = 'Demo-Tracker';
  const subtitle = document.createElement('p');
  subtitle.textContent = '4-track sample sequencer with an 8-step grid.';
  header.append(title, subtitle);
  root.appendChild(header);

  const layout = document.createElement('div');
  layout.className = 'tracker__layout';
  root.appendChild(layout);

  const librarySection = document.createElement('section');
  librarySection.className = 'tracker__library';
  const libraryHeading = document.createElement('h4');
  libraryHeading.textContent = 'Sample Library';
  const libraryHint = document.createElement('p');
  libraryHint.className = 'tracker__hint';
  libraryHint.textContent = 'Click a card to preview and then assign it to a track slot.';
  const libraryGrid = document.createElement('div');
  libraryGrid.className = 'tracker-library__grid';
  librarySection.append(libraryHeading, libraryHint, libraryGrid);
  layout.appendChild(librarySection);

  const tracksSection = document.createElement('section');
  tracksSection.className = 'tracker__tracks';
  layout.appendChild(tracksSection);

  const trackViews = [];

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

  function buildTrackView(track, trackIndex) {
    const section = document.createElement('article');
    section.className = 'tracker-track';
    section.style.setProperty('--track-color', track.color ?? '#48e5c2');

    const headerRow = document.createElement('header');
    headerRow.className = 'tracker-track__header';
    const heading = document.createElement('h5');
    heading.textContent = track.name ?? `Track ${trackIndex + 1}`;
    headerRow.appendChild(heading);

    const slotsWrapper = document.createElement('div');
    slotsWrapper.className = 'tracker-track__slots';
    const slotSelects = [];
    track.sampleSlots.forEach((slot, slotIndex) => {
      const slotLabel = document.createElement('label');
      slotLabel.className = 'tracker-slot';
      const name = document.createElement('span');
      name.className = 'tracker-slot__name';
      name.textContent = `Slot ${slotIndex + 1}`;
      const select = document.createElement('select');
      const emptyOption = createOption('', 'Empty');
      select.appendChild(emptyOption);
      audioConfig.sampleLibrary.forEach((sample) => {
        select.appendChild(createOption(sample.id, sample.name));
      });
      select.value = slot.sampleId ?? '';
      select.addEventListener('change', () => {
        const nextValue = select.value || null;
        audioConfig.tracks[trackIndex].sampleSlots[slotIndex].sampleId = nextValue;
        emitChange();
        syncTrack(trackIndex);
        if (selected.trackIndex === trackIndex) {
          syncEditor();
        }
      });
      slotLabel.append(name, select);
      slotsWrapper.appendChild(slotLabel);
      slotSelects.push(select);
    });
    headerRow.appendChild(slotsWrapper);
    section.appendChild(headerRow);

    const grid = document.createElement('div');
    grid.className = 'tracker-track__grid';
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

    const editor = createStepEditor(trackIndex);
    section.appendChild(editor.root);

    return { section, slotSelects, stepButtons, stepLabels, editor };
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
    const view = trackViews[trackIndex];
    if (!view) return;
    const track = audioConfig.tracks[trackIndex];
    view.slotSelects.forEach((select, slotIndex) => {
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

  function createStepEditor(trackIndex) {
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
      syncTrack(trackIndex);
      syncEditor();
    });

    sampleSelect.addEventListener('change', () => {
      const step = getSelectedStep();
      if (!step) return;
      step.sampleSlot = Number.parseInt(sampleSelect.value, 10) || 0;
      emitChange();
      syncTrack(trackIndex);
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
      syncTrack(trackIndex);
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
    const track = getSelectedTrack();
    if (!track) return;
    const view = trackViews[selected.trackIndex];
    if (!view) return;
    const step = getSelectedStep();
    if (!step) {
      view.editor.root.classList.add('tracker-step-editor--hidden');
      return;
    }

    view.editor.root.classList.remove('tracker-step-editor--hidden');
    view.editor.title.textContent = `${track.name ?? 'Track'} • Step ${selected.stepIndex + 1}`;

    view.editor.enableToggle.checked = Boolean(step.enabled);

    view.editor.sampleSelect.innerHTML = '';
    track.sampleSlots.forEach((_, slotIndex) => {
      view.editor.sampleSelect.appendChild(createOption(String(slotIndex), getSampleSlotLabel(audioConfig, track, slotIndex)));
    });
    view.editor.sampleSelect.value = String(step.sampleSlot ?? 0);

    view.editor.pitchInput.value = String(step.pitch ?? 0);
    view.editor.pitchValue.textContent = formatPitch(step.pitch ?? 0);

    view.editor.volumeInput.value = String(step.volume ?? 1);
    view.editor.volumeValue.textContent = formatVolume(step.volume ?? 1);

    view.editor.panInput.value = String(step.pan ?? 0);
    view.editor.panValue.textContent = formatPan(step.pan ?? 0);

    view.editor.reverseToggle.checked = Boolean(step.reverse);
    view.editor.modSelect.value = step.mod ?? 'none';

    const disabled = !step.enabled;
    [
      view.editor.sampleSelect,
      view.editor.pitchInput,
      view.editor.volumeInput,
      view.editor.panInput,
      view.editor.reverseToggle,
      view.editor.modSelect
    ].forEach((control) => {
      control.disabled = disabled;
    });
  }

  function syncAll() {
    ensureSelectionBounds();
    updateLibrary();
    buildTracks();
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
