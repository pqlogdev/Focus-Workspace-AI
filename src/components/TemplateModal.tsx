import React, { useState, useEffect } from 'react';
import { WorkspaceConfig, Template, Task, StickyNote } from '../types';
import {
  savePersonalTemplate,
  loadPersonalTemplates,
  deletePersonalTemplate,
  publishTemplateToMarketplace,
} from '../firebase';
import { type User } from 'firebase/auth';
import { PRESET_BACKGROUNDS } from '../data/presetBackgrounds';
import {
  Layout,
  Download,
  Share2,
  Plus,
  Copy,
  Check,
  X,
  Sparkles,
  Trash2,
  Globe,
  Lock,
  UploadCloud,
  Layers,
  ArrowRight,
  Store,
  FileText,
  ListTodo,
  StickyNote as StickyNoteIcon
} from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentConfig: WorkspaceConfig;
  currentTasks?: Task[];
  currentStickyNotes?: StickyNote[];
  currentNotepad?: string;
  onApplyTemplate: (config: WorkspaceConfig, tasks?: Task[], stickyNotes?: StickyNote[], notepad?: string) => void;
  onOpenMarketplace: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  user,
  currentConfig,
  currentTasks = [],
  currentStickyNotes = [],
  currentNotepad = '',
  onApplyTemplate,
  onOpenMarketplace,
}) => {
  const [activeTab, setActiveTab] = useState<'my-templates' | 'save-new' | 'export-import'>('my-templates');
  const [personalTemplates, setPersonalTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states for saving a new template
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Lofi Study');
  const [tags, setTags] = useState('Focus, Lofi, Productivity');
  const [thumbnailUrl, setThumbnailUrl] = useState(
    currentConfig.background.workItems?.[0]?.thumbnailUrl ||
    currentConfig.background.workItems?.[0]?.url ||
    PRESET_BACKGROUNDS[0].url
  );
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeStickyNotes, setIncludeStickyNotes] = useState(true);
  const [includeNotepad, setIncludeNotepad] = useState(true);
  const [publishDirectlyToMarketplace, setPublishDirectlyToMarketplace] = useState(false);

  // Share/Import states
  const [copiedCode, setCopiedCode] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    loadUserTemplates();
  }, [isOpen, user]);

  const loadUserTemplates = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const templates = await loadPersonalTemplates(user.uid);
      setPersonalTemplates(templates);
    } catch (err) {
      console.warn('Error loading personal templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const templateId = `template-${Date.now()}`;
    const newTemplate: Template = {
      id: templateId,
      creatorId: user?.uid || 'anonymous',
      creatorName: user?.displayName || 'Focus Explorer',
      creatorPhoto: user?.photoURL || undefined,
      name: templateName.trim(),
      description: description.trim() || 'Customized Focus Atmosphere setup.',
      category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      thumbnail: thumbnailUrl || PRESET_BACKGROUNDS[0].url,
      config: currentConfig,
      tasks: includeTasks ? currentTasks : undefined,
      stickyNotes: includeStickyNotes ? currentStickyNotes : undefined,
      notepad: includeNotepad ? currentNotepad : undefined,
      isPublic: publishDirectlyToMarketplace,
      price: 0,
      downloadCount: 0,
      likesCount: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsLoading(true);
    try {
      if (user) {
        await savePersonalTemplate(user.uid, newTemplate);
        if (publishDirectlyToMarketplace) {
          await publishTemplateToMarketplace(newTemplate);
        }
        await loadUserTemplates();
      }

      setStatusMessage(
        publishDirectlyToMarketplace
          ? 'Template saved & published to Community Marketplace!'
          : 'Template saved to your personal Cloud workspace!'
      );
      setTemplateName('');
      setDescription('');
      setTimeout(() => {
        setStatusMessage(null);
        setActiveTab('my-templates');
      }, 1500);
    } catch (err) {
      console.error('Failed to save template:', err);
      setStatusMessage('Error saving template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this saved template?')) return;
    try {
      await deletePersonalTemplate(user.uid, templateId);
      setPersonalTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      console.error('Failed to delete personal template:', err);
    }
  };

  const handleApply = (template: Template) => {
    onApplyTemplate(template.config, template.tasks, template.stickyNotes, template.notepad);
    setStatusMessage(`Activated template: "${template.name}"!`);
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 800);
  };

  // Encoded Share Code Generator
  const encodeFullTemplate = (tmpl: Partial<Template>): string => {
    try {
      const payload = {
        config: currentConfig,
        tasks: includeTasks ? currentTasks : [],
        stickyNotes: includeStickyNotes ? currentStickyNotes : [],
        notepad: includeNotepad ? currentNotepad : '',
        name: templateName || 'Custom Atmosphere',
      };
      return btoa(encodeURIComponent(JSON.stringify(payload)));
    } catch {
      return '';
    }
  };

  const handleCopyShareCode = () => {
    const code = encodeFullTemplate({});
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleImportCode = () => {
    if (!importCode.trim()) return;
    try {
      const decoded = decodeURIComponent(atob(importCode.trim()));
      const parsed = JSON.parse(decoded);
      if (parsed.config) {
        onApplyTemplate(parsed.config, parsed.tasks, parsed.stickyNotes, parsed.notepad);
        setStatusMessage('Imported workspace loaded successfully!');
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 1000);
      } else {
        alert('Invalid template payload.');
      }
    } catch (e) {
      alert('Invalid template code. Please ensure you copied the entire string.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-2xl w-full text-slate-100 relative max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 pr-10">
          <div className="flex items-center gap-3 text-indigo-400">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Workspace Templates & Cloud Presets</h2>
              <p className="text-xs text-slate-400">Manage saved setups, publish to market, or switch themes</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 mb-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('my-templates')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'my-templates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Saved Templates ({personalTemplates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('save-new')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'save-new' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Current Setup</span>
          </button>
          <button
            onClick={() => setActiveTab('export-import')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'export-import' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share & Import Code</span>
          </button>
        </div>

        {/* Status Toast Message */}
        {statusMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* TAB 1: My Saved Templates */}
        {activeTab === 'my-templates' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Personal Saved Templates in Cloud Firestore
              </span>
              <button
                onClick={onOpenMarketplace}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Store className="w-3.5 h-3.5" /> Browse Community Market <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading saved cloud templates...</div>
            ) : personalTemplates.length === 0 ? (
              <div className="py-12 px-4 border border-dashed border-slate-800 rounded-3xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Layout className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">No custom templates saved yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Customize your background, ambient sound mix, timer method, panel layouts, and notes, then save them as a reusable preset.
                </p>
                <button
                  onClick={() => setActiveTab('save-new')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Save Current Workspace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {personalTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition group"
                  >
                    <div>
                      <div className="relative h-24 rounded-xl overflow-hidden mb-2.5 border border-slate-800">
                        <img
                          src={t.thumbnail}
                          alt={t.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono border border-slate-800">
                          {t.config.method?.type.toUpperCase()}
                        </div>
                        {t.isPublic && (
                          <div className="absolute top-2 left-2 bg-indigo-600/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-white flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" /> Published
                          </div>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-slate-100 mb-0.5">{t.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{t.description}</p>

                      {/* Inclusions chips */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2">
                        {t.tasks && t.tasks.length > 0 && (
                          <span className="flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            <ListTodo className="w-2.5 h-2.5" /> {t.tasks.length} tasks
                          </span>
                        )}
                        {t.stickyNotes && t.stickyNotes.length > 0 && (
                          <span className="flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            <StickyNoteIcon className="w-2.5 h-2.5" /> {t.stickyNotes.length} notes
                          </span>
                        )}
                        {t.notepad && (
                          <span className="flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            <FileText className="w-2.5 h-2.5" /> Notepad
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-1">
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleApply(t)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md"
                      >
                        <Download className="w-3 h-3" /> Apply Setup
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: Save New Template Form */}
        {activeTab === 'save-new' && (
          <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Midnight Cyberpunk Deep Flow"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="Lofi Study">Lofi Study</option>
                  <option value="Deep Coding">Deep Coding & Tech</option>
                  <option value="Cozy Cabin">Cozy Cabin & Hearth</option>
                  <option value="Zen Nature">Zen Nature & Rain</option>
                  <option value="Late Night Flow">Late Night Flow</option>
                  <option value="Classic Pomodoro">Classic Pomodoro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the background vibe, audio mix, and timer flow..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Rain, Lofi, 52/17, DeepWork"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Cover Thumbnail URL</label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="Image URL..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Snapshot Inclusions */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Include Content in Template
              </span>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={includeTasks}
                    onChange={(e) => setIncludeTasks(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  <span>Tasks ({currentTasks.length})</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={includeStickyNotes}
                    onChange={(e) => setIncludeStickyNotes(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  <span>Sticky Notes ({currentStickyNotes.length})</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={includeNotepad}
                    onChange={(e) => setIncludeNotepad(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  <span>Notepad Text</span>
                </label>
              </div>
            </div>

            {/* Marketplace Direct Publish Toggle */}
            <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Publish to Community Marketplace</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Allow everyone in the community to discover, copy, and remix your workspace.
                </p>
              </div>
              <div
                onClick={() => setPublishDirectlyToMarketplace(!publishDirectlyToMarketplace)}
                className={`w-11 h-6 rounded-full transition flex items-center px-0.5 cursor-pointer ${
                  publishDirectlyToMarketplace ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !templateName.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{publishDirectlyToMarketplace ? 'Save & Publish to Market' : 'Save Personal Template in Cloud'}</span>
              </button>
            </div>

          </form>
        )}

        {/* TAB 3: Share & Import Code */}
        {activeTab === 'export-import' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" /> Export Shareable Code
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Generate an encoded string representation of your current workspace settings, audio mixer, and notes to share via messaging or discord.
              </p>
              <button
                onClick={handleCopyShareCode}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedCode ? 'Encoded Code Copied to Clipboard!' : 'Copy Share Code'}</span>
              </button>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" /> Import Workspace Code
              </h4>
              <p className="text-[11px] text-slate-400 mb-2">
                Paste an encoded setup string from a friend to instantly load their workspace layout:
              </p>
              <textarea
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Paste code here (e.g. eyJjb25maWciOnsiYmFja2dyb3VuZCI6...)"
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-300 outline-none focus:border-emerald-500 mb-3 resize-none"
              />
              <button
                onClick={handleImportCode}
                disabled={!importCode.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Load Workspace from Code
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
