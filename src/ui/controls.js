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

function createLabeledInput({ label, type = 'text', value, min, max, step, multiline = false }) {
  const wrapper = document.createElement('label');
  wrapper.textContent = label;

  let input;
  if (multiline) {
    input = document.createElement('textarea');
    input.value = value ?? '';
  } else {
    input = document.createElement('input');
    input.type = type;
    if (type === 'range' && typeof value === 'number') {
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
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  });
  return output;
}

export function createControlPanel(container, initialConfig, { onChange, onAudioToggle, onSamplePreview }) {
  let config = clone(initialConfig);
  container.innerHTML = '';

  const playbackButton = document.createElement('button');
  playbackButton.type = 'button';
  playbackButton.className = 'playback-toggle';
  playbackButton.textContent = 'Play Tracker Loop';
  playbackButton.addEventListener('click', () => {
    onAudioToggle();
  });

  const demoGroup = createGroup('Main Demo Settings');
  const { wrapper: groupNameWrapper, input: groupNameInput } = createLabeledInput({
    label: 'Group Name',
    value: config.groupName ?? ''
  });
  groupNameInput.addEventListener('input', () => {
    updateConfig({ groupName: groupNameInput.value });
  });
  demoGroup.content.appendChild(groupNameWrapper);

  const { wrapper: themeWrapper, select: themeSelect } = createSelect({
    label: 'Theme',
    value: config.theme ?? 'crt',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'crt', label: 'CRT' },
      { value: 'custom', label: 'Custom' }
    ]
  });
  themeSelect.addEventListener('change', () => {
    updateConfig({ theme: themeSelect.value });
  });
  demoGroup.content.appendChild(themeWrapper);

  const scrollerGroup = createGroup('Rolling Message');
  const { wrapper: messageWrapper, input: messageInput } = createLabeledInput({
    label: 'Message Text',
    value: config.scroller?.messageText ?? '',
    multiline: true
  });
  messageInput.addEventListener('input', () => {
    updateConfig({ scroller: { messageText: messageInput.value } });
  });
  scrollerGroup.content.appendChild(messageWrapper);

  const { wrapper: messageSpeedWrapper, input: messageSpeedInput } = createLabeledInput({
    label: 'Scroll Speed',
    type: 'range',
    min: 0.5,
    max: 6,
    step: 0.1,
    value: config.scroller?.messageSpeed ?? 2.5
  });
  messageSpeedInput.addEventListener('input', () => {
    updateConfig({ scroller: { messageSpeed: Number.parseFloat(messageSpeedInput.value) } });
  });
  scrollerGroup.content.appendChild(messageSpeedWrapper);

  const visualGroup = createGroup('Visual Effects');
  const { wrapper: bobCountWrapper, input: bobCountInput } = createLabeledInput({
    label: 'Bobs Count',
    type: 'range',
    min: 4,
    max: 64,
    step: 1,
    value: config.visual?.bobs?.bobCount ?? 24
  });
  bobCountInput.addEventListener('input', () => {
    updateConfig({ visual: { bobs: { bobCount: Number.parseInt(bobCountInput.value, 10) } } });
  });
  visualGroup.content.appendChild(bobCountWrapper);

  const { wrapper: bobSpeedWrapper, input: bobSpeedInput } = createLabeledInput({
    label: 'Bobs Speed',
    type: 'range',
    min: 0.2,
    max: 3,
    step: 0.1,
    value: config.visual?.bobs?.bobSpeed ?? 1.2
  });
  bobSpeedInput.addEventListener('input', () => {
    updateConfig({ visual: { bobs: { bobSpeed: Number.parseFloat(bobSpeedInput.value) } } });
  });
  visualGroup.content.appendChild(bobSpeedWrapper);

  const { wrapper: plasmaIntensityWrapper, input: plasmaIntensityInput } = createLabeledInput({
    label: 'Plasma Intensity',
    type: 'range',
    min: 0.2,
    max: 1.2,
    step: 0.05,
    value: config.visual?.plasma?.plasmaIntensity ?? 0.85
  });
  plasmaIntensityInput.addEventListener('input', () => {
    updateConfig({ visual: { plasma: { plasmaIntensity: Number.parseFloat(plasmaIntensityInput.value) } } });
  });
  visualGroup.content.appendChild(plasmaIntensityWrapper);

  const { wrapper: starSpeedWrapper, input: starSpeedInput } = createLabeledInput({
    label: 'Star Speed',
    type: 'range',
    min: 0.2,
    max: 4,
    step: 0.1,
    value: config.visual?.starfield?.starSpeed ?? 1.4
  });
  starSpeedInput.addEventListener('input', () => {
    updateConfig({ visual: { starfield: { starSpeed: Number.parseFloat(starSpeedInput.value) } } });
  });
  visualGroup.content.appendChild(starSpeedWrapper);

  const audioGroup = createGroup('Audio');
  audioGroup.content.appendChild(playbackButton);

  const trackerPanel = createTrackerPanel(config.audio ?? {}, {
    onChange: (nextAudioConfig) => {
      updateConfig({ audio: nextAudioConfig });
    },
    onSamplePreview: (sampleId) => {
      if (typeof onSamplePreview === 'function') {
        onSamplePreview(sampleId);
      }
    }
  });

  audioGroup.content.appendChild(trackerPanel.element);

  container.append(demoGroup.element, scrollerGroup.element, visualGroup.element, audioGroup.element);

  function updateConfig(partial) {
    config = deepMerge(config, partial);
    onChange(config);
  }

  function update(newConfig) {
    config = clone(newConfig);
    groupNameInput.value = config.groupName ?? '';
    themeSelect.value = config.theme ?? 'crt';
    messageInput.value = config.scroller?.messageText ?? '';
    messageSpeedInput.value = String(config.scroller?.messageSpeed ?? 2.5);
    bobCountInput.value = String(config.visual?.bobs?.bobCount ?? 24);
    bobSpeedInput.value = String(config.visual?.bobs?.bobSpeed ?? 1.2);
    plasmaIntensityInput.value = String(config.visual?.plasma?.plasmaIntensity ?? 0.85);
    starSpeedInput.value = String(config.visual?.starfield?.starSpeed ?? 1.4);
    trackerPanel.update(config.audio ?? {});
  }

  function setAudioState(isPlaying) {
    playbackButton.textContent = isPlaying ? 'Stop Tracker Loop' : 'Play Tracker Loop';
  }

  return {
    update,
    setAudioState
  };
}

