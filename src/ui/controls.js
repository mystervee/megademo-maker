import { createTrackerPanel } from './tracker.js';

const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

function createGroup(title) {
  const group = document.createElement('section');
  group.className = 'control-group';

  const header = document.createElement('header');
  header.className = 'control-group__header';

  const heading = document.createElement('h2');
  heading.textContent = title;
  header.appendChild(heading);

  const content = document.createElement('div');
  content.className = 'control-group__content';

  group.append(header, content);

  return { element: group, content };
}

function createLabeledInput({ label, type = 'text', value, min, max, step, multiline = false, checked = false }) {
  const wrapper = document.createElement('label');
  wrapper.textContent = label;

  let input;
  if (multiline) {
    input = document.createElement('textarea');
    input.value = value ?? '';
  } else {
    input = document.createElement('input');
    input.type = type;
    if (type === 'checkbox') {
      input.checked = Boolean(checked);
    } else if (type === 'range' && typeof value === 'number') {
      input.value = String(value);
    } else {
      input.value = value ?? '';
    }
    if (typeof min === 'number') input.min = String(min);
    if (typeof max === 'number') input.max = String(max);
    if (typeof step === 'number') input.step = String(step);
  }

  wrapper.appendChild(input);
  return { wrapper, input };
}

function createSelect({ label, options, value }) {
  const wrapper = document.createElement('label');
  wrapper.textContent = label;
  const select = document.createElement('select');

  options.forEach((option) => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    if (option.value === value) {
      optionElement.selected = true;
    }
    select.appendChild(optionElement);
  });

  wrapper.appendChild(select);
  return { wrapper, select };
}

function deepMerge(target, source) {
  const output = clone(target);
  Object.entries(source).forEach(([key, value]) => {
    if (key === '__proto__' || key === 'constructor') return;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  });
  return output;
}

export function createControlPanel(
  container,
  initialConfig,
  { onChange, onPlaybackToggle, onSamplePreview, onTrackerPreviewStart, onTrackerPreviewStop }
) {
  let config = clone(initialConfig);
  let currentStep = 1;
  let currentPartTab = 0;
  let playbackState = { isPlaying: false, currentIndex: 0, totalParts: 1 };
  let trackerPlaybackState = { isPlaying: false };
  let currentPlaybackStep = null;

  container.innerHTML = '';
  container.className = 'wizard-container';

  if (!config.globalTune) {
    config.globalTune = {
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
  }

  // Setup main navigation
  const nav = document.createElement('nav');
  nav.className = 'wizard-nav';
  nav.style.display = 'flex';
  nav.style.gap = '10px';
  nav.style.marginBottom = '20px';

  const steps = ['1. Setup', '2. Sound Tracker', '3. Configure Parts', '4. Playback'];
  const navButtons = steps.map((text, idx) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = 'wizard-nav__btn';
    btn.addEventListener('click', () => {
      currentStep = idx + 1;
      onChange(config, currentStep, currentPartTab);
      render();
    });
    nav.appendChild(btn);
    return btn;
  });

  const content = document.createElement('div');
  content.className = 'wizard-content';
  container.append(nav, content);

  let trackerPanelInstance = createTrackerPanel(config, {
    onChange: (updatedTracker) => {
      updateConfig({ globalTune: updatedTracker.globalTune });
    },
    onSamplePreview
  });
  trackerPanelInstance.setPlaybackStep(currentPlaybackStep);

  function syncPartsArray() {
    if (!config.parts) config.parts = [];
    const defaultPart = {
      durationInSeconds: 10,
      visual: { bobs: {}, plasma: {}, starfield: {} },
      scroller: {},
      audio: { tracks: [], sampleLibrary: [] },
      transition: 'cut'
    };

    while (config.parts.length < (config.numberOfParts || 1)) {
      config.parts.push(clone(defaultPart));
    }
    if (config.parts.length > (config.numberOfParts || 1)) {
      config.parts.length = config.numberOfParts;
    }
    if (currentPartTab >= config.numberOfParts) {
      currentPartTab = Math.max(0, config.numberOfParts - 1);
    }
  }

  function updateConfig(partial) {
    config = deepMerge(config, partial);
    syncPartsArray();
    onChange(config, currentStep, currentPartTab);
  }

  // --- STEP 1: SETUP ---
  function renderSetup() {
    const group = createGroup('Global Setup');

    const { wrapper: nameWrapper, input: nameInput } = createLabeledInput({
      label: 'Group Name',
      value: config.globalSettings?.groupName ?? config.groupName ?? ''
    });
    nameInput.addEventListener('change', () => {
      updateConfig({ globalSettings: { groupName: nameInput.value } });
    });

    const { wrapper: bpmWrapper, input: bpmInput } = createLabeledInput({
      label: 'Master BPM',
      type: 'number',
      min: 40, max: 300, step: 1,
      value: config.globalSettings?.bpm ?? 120
    });
    bpmInput.addEventListener('change', () => {
      updateConfig({ globalSettings: { bpm: Number.parseInt(bpmInput.value, 10) } });
    });

    const { wrapper: partsWrapper, input: partsInput } = createLabeledInput({
      label: 'Number of Parts (1-4)',
      type: 'range',
      min: 1, max: 4, step: 1,
      value: config.numberOfParts ?? 1
    });
    const partsDisplay = document.createElement('span');
    partsDisplay.textContent = ` ${partsInput.value}`;
    partsDisplay.style.marginLeft = '8px';
    partsWrapper.appendChild(partsDisplay);

    partsInput.addEventListener('change', () => {
      updateConfig({ numberOfParts: Number.parseInt(partsInput.value, 10) });
      partsDisplay.textContent = ` ${partsInput.value}`;
    });
    partsInput.addEventListener('input', () => {
      partsDisplay.textContent = ` ${partsInput.value}`;
    });

    group.content.append(nameWrapper, bpmWrapper, partsWrapper);
    content.appendChild(group.element);
  }

  // --- STEP 2: SOUND TRACKER ---
  function renderSoundTracker() {
    const group = createGroup('Global Tune Settings');
    group.content.style.height = '520px';
    group.content.style.display = 'grid';
    group.content.style.gap = '12px';

    const trackerActions = document.createElement('div');
    trackerActions.className = 'tracker-preview-controls';

    const trackerStatus = document.createElement('p');
    trackerStatus.className = 'tracker-preview-status';
    trackerStatus.textContent = trackerPlaybackState.isPlaying
      ? 'Tracker preview playing.'
      : 'Tracker preview stopped.';

    const playTrackerButton = document.createElement('button');
    playTrackerButton.type = 'button';
    playTrackerButton.className = 'playback-toggle tracker-preview-button';
    playTrackerButton.textContent = 'Play Tracker';
    playTrackerButton.disabled = trackerPlaybackState.isPlaying;
    playTrackerButton.addEventListener('click', () => {
      if (typeof onTrackerPreviewStart === 'function') {
        onTrackerPreviewStart();
      }
    });

    const stopTrackerButton = document.createElement('button');
    stopTrackerButton.type = 'button';
    stopTrackerButton.className = 'playback-toggle tracker-preview-button tracker-preview-button--secondary';
    stopTrackerButton.textContent = 'Stop Tracker';
    stopTrackerButton.disabled = !trackerPlaybackState.isPlaying;
    stopTrackerButton.addEventListener('click', () => {
      if (typeof onTrackerPreviewStop === 'function') {
        onTrackerPreviewStop();
      }
    });

    trackerActions.append(playTrackerButton, stopTrackerButton, trackerStatus);
    trackerPanelInstance.update(config);
    trackerPanelInstance.setPlaybackStep(currentPlaybackStep);
    group.content.appendChild(trackerActions);
    group.content.appendChild(trackerPanelInstance.element);
    content.appendChild(group.element);
  }

  // --- STEP 3: CONFIGURE PARTS ---
  function renderConfigureParts() {
    const header = document.createElement('div');
    header.className = 'wizard-parts-nav';
    header.style.display = 'flex';
    header.style.gap = '8px';
    header.style.marginBottom = '16px';

    // Dynamically generate sub-tabs based on numberOfParts
    for (let i = 0; i < config.numberOfParts; i++) {
      const btn = document.createElement('button');
      btn.textContent = `Part ${i + 1}`;
      btn.className = `wizard-parts-nav__btn ${i === currentPartTab ? 'active' : ''}`;
      if (i === currentPartTab) {
        btn.style.fontWeight = 'bold';
        btn.style.textDecoration = 'underline';
      }
      btn.addEventListener('click', () => {
        currentPartTab = i;
        onChange(config, currentStep, currentPartTab);
        render(); // Rerender to show the active part tab
      });
      header.appendChild(btn);
    }
    content.appendChild(header);

    const part = config.parts[currentPartTab];
    if (!part) return;

    const partGroup = createGroup(`Settings for Part ${currentPartTab + 1}`);

    const { wrapper: durationWrapper, input: durationInput } = createLabeledInput({
      label: 'Duration (Seconds)',
      type: 'number',
      min: 1, max: 300, step: 1,
      value: part.durationInSeconds ?? 10
    });
    durationInput.addEventListener('change', () => {
      const newParts = clone(config.parts);
      newParts[currentPartTab].durationInSeconds = Number.parseInt(durationInput.value, 10);
      updateConfig({ parts: newParts });
    });

    const { wrapper: transitionWrapper, select: transitionSelect } = createSelect({
      label: 'Transition to Next Part',
      value: part.transition ?? 'cut',
      options: [
        { value: 'cut', label: 'Cut' },
        { value: 'crossfade', label: 'Crossfade' },
        { value: 'wipe', label: 'Wipe' }
      ]
    });
    transitionSelect.addEventListener('change', () => {
      const newParts = clone(config.parts);
      newParts[currentPartTab].transition = transitionSelect.value;
      updateConfig({ parts: newParts });
    });

    const { wrapper: messageWrapper, input: messageInput } = createLabeledInput({
      label: 'Scroller Text',
      value: part.scroller?.messageText ?? '',
      multiline: true
    });
    messageInput.addEventListener('change', () => {
      const newParts = clone(config.parts);
      if (!newParts[currentPartTab].scroller) newParts[currentPartTab].scroller = {};
      newParts[currentPartTab].scroller.messageText = messageInput.value;
      updateConfig({ parts: newParts });
    });

    const { wrapper: plasmaWrapper, input: plasmaInput } = createLabeledInput({
      label: 'Enable Plasma',
      type: 'checkbox',
      checked: part.plasmaEnabled ?? false
    });
    plasmaInput.addEventListener('change', () => {
      const newParts = clone(config.parts);
      newParts[currentPartTab].plasmaEnabled = plasmaInput.checked;
      updateConfig({ parts: newParts });
    });

    const { wrapper: bobsWrapper, input: bobsInput } = createLabeledInput({
      label: 'Enable Bobs',
      type: 'checkbox',
      checked: part.bobsEnabled ?? false
    });
    bobsInput.addEventListener('change', () => {
      const newParts = clone(config.parts);
      newParts[currentPartTab].bobsEnabled = bobsInput.checked;
      updateConfig({ parts: newParts });
    });

    const { wrapper: starfieldWrapper, input: starfieldInput } = createLabeledInput({
      label: 'Enable Starfield',
      type: 'checkbox',
      checked: part.starfieldEnabled ?? false
    });
    starfieldInput.addEventListener('change', () => {
      const newParts = clone(config.parts);
      newParts[currentPartTab].starfieldEnabled = starfieldInput.checked;
      updateConfig({ parts: newParts });
    });

    const { wrapper: vectorsEnabledWrapper, input: vectorsEnabledInput } = createLabeledInput({
      label: 'Enable Vectors',
      type: 'checkbox',
      checked: part.vectorsEnabled ?? false
    });
    vectorsEnabledInput.addEventListener('change', () => {
      const newParts = clone(config.parts);
      newParts[currentPartTab].vectorsEnabled = vectorsEnabledInput.checked;
      updateConfig({ parts: newParts });
    });

    const { wrapper: vectorTypeWrapper, select: vectorTypeSelect } = createSelect({
      label: 'Vector Type',
      value: part.visual?.vector?.vectorType ?? 'cube',
      options: [
        { value: 'cube', label: 'Cube' },
        { value: 'pyramid', label: 'Pyramid' }
      ]
    });
    vectorTypeSelect.addEventListener('change', () => {
      const newParts = clone(config.parts);
      if (!newParts[currentPartTab].visual) newParts[currentPartTab].visual = {};
      if (!newParts[currentPartTab].visual.vector) newParts[currentPartTab].visual.vector = {};
      newParts[currentPartTab].visual.vector.vectorType = vectorTypeSelect.value;
      updateConfig({ parts: newParts });
    });

    const { wrapper: vectorStyleWrapper, select: vectorStyleSelect } = createSelect({
      label: 'Vector Style',
      value: part.visual?.vector?.vectorStyle ?? 'wireframe',
      options: [
        { value: 'wireframe', label: 'Wireframe' },
        { value: 'filled', label: 'Filled' }
      ]
    });
    vectorStyleSelect.addEventListener('change', () => {
      const newParts = clone(config.parts);
      if (!newParts[currentPartTab].visual) newParts[currentPartTab].visual = {};
      if (!newParts[currentPartTab].visual.vector) newParts[currentPartTab].visual.vector = {};
      newParts[currentPartTab].visual.vector.vectorStyle = vectorStyleSelect.value;
      updateConfig({ parts: newParts });
    });

    partGroup.content.append(
      durationWrapper,
      transitionWrapper,
      messageWrapper,
      plasmaWrapper,
      bobsWrapper,
      starfieldWrapper,
      vectorsEnabledWrapper,
      vectorTypeWrapper,
      vectorStyleWrapper
    );
    content.appendChild(partGroup.element);
  }

  // --- STEP 4: PLAYBACK ---
  function renderPlayback() {
    const group = createGroup('Playback Controls');
    
    const statusText = document.createElement('p');
    statusText.className = 'playback-status';
    statusText.style.fontWeight = 'bold';
    statusText.style.marginBottom = '16px';
    statusText.textContent = playbackState.isPlaying 
      ? `Now Playing: Part ${playbackState.currentIndex + 1} of ${playbackState.totalParts}` 
      : 'Ready to play sequence.';

    const playbackButton = document.createElement('button');
    playbackButton.type = 'button';
    playbackButton.className = 'playback-toggle';
    playbackButton.textContent = playbackState.isPlaying ? 'Stop Sequence' : 'Play Full Sequence';
    playbackButton.addEventListener('click', () => {
      onPlaybackToggle();
    });
    group.content.append(statusText, playbackButton);
    content.appendChild(group.element);
  }

  function render() {
    navButtons.forEach((btn, idx) => {
      if (currentStep === idx + 1) {
        btn.classList.add('active');
        btn.style.fontWeight = 'bold';
        btn.style.borderBottom = '2px solid currentColor';
      } else {
        btn.classList.remove('active');
        btn.style.fontWeight = 'normal';
        btn.style.borderBottom = 'none';
      }
    });

    content.innerHTML = '';
    if (currentStep === 1) renderSetup();
    else if (currentStep === 2) renderSoundTracker();
    else if (currentStep === 3) renderConfigureParts();
    else if (currentStep === 4) renderPlayback();
  }

  syncPartsArray();
  render();

  function update(newConfig) {
    config = clone(newConfig);
    syncPartsArray();
    trackerPanelInstance.update(config);
    trackerPanelInstance.setPlaybackStep(currentPlaybackStep);
    render(); // Re-render to update currently active step/inputs
  }

  function setPlaybackState(isPlaying, currentIndex = 0, totalParts = 1) {
    playbackState = { isPlaying, currentIndex, totalParts };
    const playBtn = content.querySelector('.playback-toggle');
    const statusText = content.querySelector('.playback-status');
    if (playBtn) {
      playBtn.textContent = isPlaying ? 'Stop Sequence' : 'Play Full Sequence';
    }
    if (statusText) {
      statusText.textContent = isPlaying ? `Now Playing: Part ${currentIndex + 1} of ${totalParts}` : 'Ready to play sequence.';
    }
  }

  function setPlaybackStep(stepIndex) {
    currentPlaybackStep = Number.isInteger(stepIndex) ? stepIndex : null;
    trackerPanelInstance.setPlaybackStep(currentPlaybackStep);
  }

  function setTrackerPlaybackState(isPlaying) {
    trackerPlaybackState = { isPlaying };
    const playTrackerButton = content.querySelector('.tracker-preview-button');
    const stopTrackerButton = content.querySelector('.tracker-preview-button--secondary');
    const trackerStatus = content.querySelector('.tracker-preview-status');

    if (playTrackerButton) {
      playTrackerButton.disabled = isPlaying;
    }
    if (stopTrackerButton) {
      stopTrackerButton.disabled = !isPlaying;
    }
    if (trackerStatus) {
      trackerStatus.textContent = isPlaying ? 'Tracker preview playing.' : 'Tracker preview stopped.';
    }
  }

  return {
    update,
    setPlaybackState,
    setPlaybackStep,
    setTrackerPlaybackState
  };
}
