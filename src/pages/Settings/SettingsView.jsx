import React, { useState, useEffect } from 'react';
import { Trash2, Shield, RefreshCw, BookOpen } from 'lucide-react';
import {
  getSettings,
  saveSettings,
  clearAllData,
  getStorageUsage,
} from '../../services/storage/reportsStorage';
import { Section, Stat, Button, Badge } from '../../components/ui';
import AboutScoringModal from './AboutScoringModal';

export default function SettingsView() {
  const [settings, setSettings] = useState({ autoSave: false, retentionLimit: 25 });
  const [storageInfo, setStorageInfo] = useState({ bytesUsed: 0, formatted: '0 B', count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isScoringModalOpen, setIsScoringModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [savedSettings, usage] = await Promise.all([getSettings(), getStorageUsage()]);
        setSettings(savedSettings);
        setStorageInfo(usage);
      } catch (err) {
        console.error('[WebXray] Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleAutoSave = async () => {
    const next = { ...settings, autoSave: !settings.autoSave };
    setSettings(next);
    await saveSettings(next);
    showNotice('Auto-save preference updated.');
  };

  const handleRetentionChange = async (e) => {
    const val = parseInt(e.target.value, 10);
    const next = { ...settings, retentionLimit: val };
    setSettings(next);
    await saveSettings(next);
    showNotice(`Retention limit set to ${val} reports.`);
  };

  const handleClearAllData = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete all extension data? This permanently removes all saved reports and resets settings. This action cannot be undone.'
      )
    ) {
      await clearAllData();
      setSettings({ autoSave: false, retentionLimit: 25 });
      setStorageInfo({ bytesUsed: 0, formatted: '0 B', count: 0 });
      showNotice('All saved reports and settings have been cleared.');
    }
  };

  const showNotice = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  return (
    <div className="font-sans text-wl-text space-y-5">
      {/* 1. Header Row */}
      <div className="flex items-center justify-between border-b border-wl-border pb-3">
        <div>
          <h2 className="text-[16px] font-semibold text-wl-text">Settings & Storage</h2>
          <p className="text-[12px] text-wl-muted mt-0.5">
            Local extension preferences and storage configuration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4f8cff]" />}
          <button
            type="button"
            onClick={() => setIsScoringModalOpen(true)}
            className="text-[12px] font-medium text-[#4f8cff] hover:underline flex items-center gap-1.5 py-1 px-2 rounded-[4px] hover:bg-wl-raised transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>About scoring</span>
          </button>
          <Badge variant="neutral">Local Only</Badge>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded-[6px] bg-[#3fb950]/10 border border-[#3fb950]/30 text-[12px] text-[#3fb950]">
          {statusMessage}
        </div>
      )}

      {/* 2. Storage Utilization */}
      <Section title="Storage Utilization" description="Local storage consumption in chrome.storage.local">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Storage Used" value={storageInfo.formatted} />
          <Stat label="Saved Reports" value={storageInfo.count} />
          <Stat label="Storage Quota" value="~5.0 MB" mono={false} hint="Browser local allocation" />
        </div>
      </Section>

      {/* 3. Audit Snapshot Preferences */}
      <Section title="Preferences" description="Automatic audit recording and retention rules">
        <div className="space-y-3">
          {/* Auto-Save Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-[6px] bg-wl-surface border border-wl-border">
            <div>
              <div className="text-[13px] font-medium text-wl-text">Auto-save reports</div>
              <div className="text-[11px] text-wl-muted mt-0.5">
                Automatically archive an audit report whenever a page scan completes.
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoSave}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 ${
                settings.autoSave ? 'bg-[#4f8cff]' : 'bg-wl-raised border border-wl-border'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.autoSave ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Retention Limit Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[6px] bg-wl-surface border border-wl-border">
            <div>
              <div className="text-[13px] font-medium text-wl-text">Retention limit</div>
              <div className="text-[11px] text-wl-muted mt-0.5">
                Maximum number of reports to store before oldest reports are pruned.
              </div>
            </div>

            <select
              value={settings.retentionLimit}
              onChange={handleRetentionChange}
              className="py-1.5 px-2.5 rounded-[6px] bg-wl-surface border border-wl-border text-[12px] font-sans text-wl-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4f8cff]"
            >
              <option value="10">10 reports</option>
              <option value="25">25 reports (Default)</option>
              <option value="50">50 reports</option>
              <option value="100">100 reports</option>
            </select>
          </div>
        </div>
      </Section>

      {/* 4. Scoring Engine Transparency */}
      <Section title="Scoring Engine" description="Transparent calculation model, weights, and rule catalog">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[6px] bg-wl-surface border border-wl-border">
          <div>
            <div className="text-[13px] font-medium text-wl-text">Scoring specification & rules</div>
            <div className="text-[11px] text-wl-muted mt-0.5">
              Review full rule weights, heuristic vs standard criteria, and mathematical models in-app.
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setIsScoringModalOpen(true)} icon={BookOpen}>
            About scoring
          </Button>
        </div>
      </Section>

      {/* 5. Privacy Guarantee */}
      <Section title="Privacy" description="Zero remote telemetry guarantee">
        <div className="p-3 rounded-[6px] bg-wl-surface border border-wl-border space-y-1">
          <div className="flex items-center gap-2 text-[12px] font-medium text-wl-text">
            <Shield className="w-4 h-4 text-[#3fb950]" />
            <span>Local analysis guarantee</span>
          </div>
          <p className="text-[11px] text-wl-muted leading-relaxed">
            All audits and stored reports remain strictly inside your local browser. No page data or metrics are ever sent to external servers.
          </p>
        </div>
      </Section>

      {/* 6. Danger Zone */}
      <Section title="Danger Zone" description="Irreversible data actions">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[6px] bg-[#f85149]/5 border border-[#f85149]/30">
          <div>
            <div className="text-[13px] font-medium text-[#f85149]">Clear all local data</div>
            <div className="text-[11px] text-wl-muted mt-0.5">
              Permanently delete all saved reports and reset preferences.
            </div>
          </div>

          <Button variant="danger" size="sm" onClick={handleClearAllData} icon={Trash2}>
            Clear all data
          </Button>
        </div>
      </Section>

      <AboutScoringModal isOpen={isScoringModalOpen} onClose={() => setIsScoringModalOpen(false)} />
    </div>
  );
}
