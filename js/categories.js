/**
 * Linux Tech - Category Definitions
 * Defines the display order, labels and icons for topic categories.
 * Each topic declares a "category" id that must match one of these.
 * Topics with a missing/unknown category fall into the "other" bucket.
 */
const CATEGORIES = [
  { id: 'core',      label: 'Core Linux & System',    icon: '🐧' },
  { id: 'kernel',    label: 'Kernel Internals',       icon: '⚙️' },
  { id: 'drivers',   label: 'Device Drivers',         icon: '🧩' },
  { id: 'hardware',  label: 'Hardware & Buses',       icon: '🔌' },
  { id: 'io',        label: 'I/O & Performance',      icon: '🚀' },
  { id: 'networking',label: 'Networking',             icon: '🌐' },
  { id: 'languages', label: 'Programming Languages',  icon: '💻' },
  { id: 'services',  label: 'Services & Protocols',   icon: '🔗' },
  { id: 'tooling',   label: 'DevOps & Tooling',       icon: '🛠️' },
  { id: 'other',     label: 'Other',                  icon: '📚' }
];
