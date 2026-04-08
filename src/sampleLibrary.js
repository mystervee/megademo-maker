const SAMPLE_LIBRARY_LIMIT = 16;
const SAMPLE_NAME_MAX_LENGTH = 18;
const SAMPLE_COLORS = [
  '#ff6f91',
  '#45c4b0',
  '#ffd166',
  '#f25c54',
  '#f9844a',
  '#6c63ff',
  '#ffad5a',
  '#39a0ed',
  '#f7b801',
  '#48e5c2',
  '#b8f2e6',
  '#ff99c8',
  '#9bf6ff',
  '#caffbf',
  '#fdffb6',
  '#a0c4ff'
];

const DISCOVERED_SAMPLE_FILES = import.meta.glob(
  [
    '../assets/music/*.wav',
    '../assets/music/*.mp3',
    '../assets/music/*.ogg',
    '../assets/music/*.flac',
    '../assets/music/*.aif',
    '../assets/music/*.aiff'
  ],
  {
    eager: true,
    import: 'default'
  }
);

function getFileName(filePath = '') {
  return filePath.split('/').pop() ?? '';
}

function getFileStem(fileName = '') {
  return fileName.replace(/\.[^.]+$/, '');
}

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function truncateFileName(fileName, maxLength = SAMPLE_NAME_MAX_LENGTH) {
  if (!fileName || fileName.length <= maxLength) {
    return fileName;
  }

  const extensionIndex = fileName.lastIndexOf('.');
  if (extensionIndex <= 0 || extensionIndex === fileName.length - 1) {
    return `${fileName.slice(0, Math.max(1, maxLength - 3))}...`;
  }

  const extension = fileName.slice(extensionIndex);
  const availableBaseLength = maxLength - extension.length - 3;
  if (availableBaseLength <= 0) {
    return `${fileName.slice(0, Math.max(1, maxLength - 3))}...`;
  }

  return `${fileName.slice(0, availableBaseLength)}...${extension}`;
}

function inferCategory(fileStem = '') {
  const value = fileStem.toLowerCase();
  if (value.startsWith('drum')) return 'Drums';
  if (value.startsWith('bass')) return 'Bass';
  if (value.startsWith('lead')) return 'Lead';
  if (value.startsWith('vocal')) return 'Vocal';
  return 'Sample';
}

function createConfiguredSampleMap(configuredSamples = []) {
  return new Map(
    configuredSamples
      .filter((sample) => typeof sample?.file === 'string' && sample.file.length > 0)
      .map((sample) => [getFileName(sample.file).toLowerCase(), sample])
  );
}

function createUniqueSampleId(baseId, usedIds) {
  let nextId = baseId || 'sample';
  let suffix = 2;
  while (usedIds.has(nextId)) {
    nextId = `${baseId || 'sample'}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(nextId);
  return nextId;
}

function createSampleEntry(filePath, assetUrl, configuredSample, index, usedIds) {
  const fileName = getFileName(filePath);
  const fileStem = getFileStem(fileName);
  const baseId = typeof configuredSample?.id === 'string' && configuredSample.id.length > 0
    ? configuredSample.id
    : slugify(fileStem);

  return {
    id: createUniqueSampleId(baseId, usedIds),
    name: truncateFileName(fileName),
    fullName: fileName,
    description: configuredSample?.description ?? fileName,
    category: configuredSample?.category ?? inferCategory(fileStem),
    rootNote: configuredSample?.rootNote ?? 'C4',
    file: assetUrl,
    color: configuredSample?.color ?? SAMPLE_COLORS[index % SAMPLE_COLORS.length]
  };
}

function sortDiscoveredSamples([leftPath], [rightPath]) {
  return getFileName(leftPath).localeCompare(getFileName(rightPath), undefined, {
    numeric: true,
    sensitivity: 'base'
  });
}

export function resolveSampleLibrary(configuredSamples = [], limit = SAMPLE_LIBRARY_LIMIT) {
  const configuredSampleMap = createConfiguredSampleMap(configuredSamples);
  const discoveredSamples = Object.entries(DISCOVERED_SAMPLE_FILES)
    .sort(sortDiscoveredSamples)
    .slice(0, Math.max(0, limit));

  if (discoveredSamples.length === 0) {
    return configuredSamples.slice(0, Math.max(0, limit)).map((sample, index) => ({
      ...sample,
      name: truncateFileName(getFileName(sample.file) || sample.name || sample.id || `sample-${index + 1}`),
      fullName: getFileName(sample.file) || sample.name || sample.id || `sample-${index + 1}`,
      color: sample.color ?? SAMPLE_COLORS[index % SAMPLE_COLORS.length]
    }));
  }

  const usedIds = new Set();

  return discoveredSamples.map(([filePath, assetUrl], index) =>
    createSampleEntry(filePath, assetUrl, configuredSampleMap.get(getFileName(filePath).toLowerCase()), index, usedIds)
  );
}

export const SAMPLE_LIBRARY_MAX_SIZE = SAMPLE_LIBRARY_LIMIT;
