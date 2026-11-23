import React, { useState } from 'react';
import {
  X,
  Settings,
  Terminal,
  Type,
  Layout,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Check,
} from 'lucide-react';
import { EditorTypographySettings, PageLayoutOption, StoryProject } from '../types/story';
import {
  DEFAULT_EDITOR_TYPOGRAPHY,
  LINE_SPACING_OPTIONS,
  PAGE_LAYOUT_OPTIONS,
  SCRIPT_FONT_FAMILIES,
  SCRIPT_FONT_SIZES,
} from '../utils/screenplayFormatting';
import { RustDesktopHub } from './RustDesktopHub';

interface PreferencesModalProps {
  project: StoryProject;
  initialOpenRustWindow?: boolean;
  onUpdateTypography: (patch: Partial<EditorTypographySettings>) => void;
  onClose: () => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  project,
  initialOpenRustWindow = false,
  onUpdateTypography,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<'editor' | 'rust_desktop'>('editor');
  const [isRustWindowOpen, setIsRustWindowOpen] = useState<boolean>(initialOpenRustWindow);

  const typo = project.editorTypography || DEFAULT_EDITOR_TYPOGRAPHY;
  const activeLayout: PageLayoutOption = typo.pageLayout || 'letter';

  if (isRustWindowOpen) {
    return (
      <div className="no-print fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
        <div className="bg-[#1b1b1d] border border-[#3f3f46] rounded-lg shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden text-xs text-gray-200">
          {/* Dedicated Rust Desktop Window Titlebar */}
          <div className="px-4 py-3 bg-[#151517] border-b border-[#323238] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 rounded bg-[#ff7700]/15 border border-[#ff7700]/40 text-[#ff8000] shrink-0">
                <Terminal className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-100 truncate">
                  &gt;_ Rust Desktop
                </h2>
                <p className="text-[11px] text-gray-400 truncate">
                  Native Rust &amp; Tauri v2 Architecture, Source Inspector &amp; Desktop Bundle
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsRustWindowOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#252528] hover:bg-[#323236] border border-[#3e3e44] text-gray-200 transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Back to Preferences</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2a2e] rounded transition-colors"
                aria-label="Close Rust Desktop Window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <RustDesktopHub currentProject={project} />
        </div>
      </div>
    );
  }

  return (
    <div className="no-print fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-[#202023] border border-[#3d3d42] rounded-lg shadow-2xl w-full max-w-4xl h-[78vh] flex flex-col overflow-hidden text-xs text-gray-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#17171a] border-b border-[#323238] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-[#ff8000]" />
            <div>
              <h2 className="text-sm font-bold text-gray-100">
                ScreenCraft Studio Preferences
              </h2>
              <p className="text-[11px] text-gray-400">
                Configure script defaults, page layout, and native Rust Desktop tools
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2b2b30] rounded transition-colors"
            aria-label="Close Preferences"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left Navigation Rail */}
          <aside className="w-56 bg-[#19191c] border-r border-[#303036] p-3 space-y-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('editor')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                activeSection === 'editor'
                  ? 'bg-[#2c2115] border border-[#ff7700]/60 text-amber-200 font-semibold'
                  : 'text-gray-300 hover:bg-[#242429]'
              }`}
            >
              <Type className="w-3.5 h-3.5 text-[#ff8000] shrink-0" />
              <span>Editor &amp; Page Layout</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('rust_desktop');
                setIsRustWindowOpen(true);
              }}
              className={`w-full text-left px-3 py-2 rounded flex items-center justify-between gap-2 transition-colors ${
                activeSection === 'rust_desktop'
                  ? 'bg-[#2c2115] border border-[#ff7700]/60 text-amber-200 font-semibold'
                  : 'text-gray-300 hover:bg-[#242429]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#ff8000] shrink-0" />
                <span>&gt;_ Rust Desktop</span>
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>
          </aside>

          {/* Right Settings Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#1e1e21]">
            {/* Typography & Script Defaults */}
            <section className="space-y-4">
              <div className="border-b border-[#2f2f36] pb-2">
                <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#ff8000]" />
                  <span>Authoring Typography Defaults</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Applies across the current document&apos;s screenplay workspace ({project.title}).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5">
                    Script Font Family
                  </label>
                  <select
                    value={typo.fontFamily}
                    onChange={(e) => onUpdateTypography({ fontFamily: e.target.value })}
                    className="w-full bg-[#141416] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {SCRIPT_FONT_FAMILIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label} ({f.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5">
                    Font Size (pt)
                  </label>
                  <select
                    value={typo.fontSizePt}
                    onChange={(e) => onUpdateTypography({ fontSizePt: Number(e.target.value) })}
                    className="w-full bg-[#141416] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 tabular-nums focus:outline-none focus:border-[#ff8000]"
                  >
                    {SCRIPT_FONT_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz} pt
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5">
                    Line Spacing
                  </label>
                  <select
                    value={typo.lineSpacing}
                    onChange={(e) => onUpdateTypography({ lineSpacing: Number(e.target.value) })}
                    className="w-full bg-[#141416] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 tabular-nums focus:outline-none focus:border-[#ff8000]"
                  >
                    {LINE_SPACING_OPTIONS.map((ls) => (
                      <option key={ls.value} value={ls.value}>
                        {ls.label} — {ls.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Page Layout */}
            <section className="space-y-3">
              <div className="border-b border-[#2f2f36] pb-2">
                <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-cyan-400" />
                  <span>Page Layout &amp; Margins</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PAGE_LAYOUT_OPTIONS.map((opt) => {
                  const selected = activeLayout === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdateTypography({ pageLayout: opt.id })}
                      className={`text-left p-3 rounded border transition-colors ${
                        selected
                          ? 'bg-[#2a2015] border-[#ff7700] text-amber-200'
                          : 'bg-[#17171a] border-[#33333a] text-gray-300 hover:bg-[#232328]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-xs">
                        <span>{opt.shortLabel}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-[#ff8000]" />}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{opt.dimensionsLabel}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Dedicated >_ Rust Desktop Launcher */}
            <section className="bg-[#17171a] border border-[#e67300]/45 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded bg-[#ff7700]/15 border border-[#ff7700]/40 text-[#ff8000] shrink-0">
                  <Terminal className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-gray-100">
                    &gt;_ Rust Desktop Engine &amp; Native Packaging
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Open the dedicated &gt;_ Rust Desktop window to inspect Tauri v2 &amp; Cargo sources, run the native parser benchmark, or package standalone Windows, macOS, and Linux builds.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRustWindowOpen(true)}
                className="px-4 py-2 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Open &gt;_ Rust Desktop</span>
              </button>
            </section>

            {/* Storage & Autosave Info */}
            <section className="bg-[#17171a] border border-[#2f2f36] rounded-lg p-3.5 flex items-center gap-3 text-[11px] text-gray-400">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Auto-save runs every <strong className="text-gray-200">30 seconds</strong> to local browser storage, alongside manual <strong className="text-gray-200">.sccrft</strong> local file saves via <strong className="text-gray-200">File → Save / Save As</strong>.
              </span>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#17171a] border-t border-[#323238] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
