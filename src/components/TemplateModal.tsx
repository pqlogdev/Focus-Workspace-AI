import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceConfig, Template, Task, StickyNote, TemplateMember, Participant } from '../types';
import {
  savePersonalTemplate,
  loadPersonalTemplates,
  deletePersonalTemplate,
  saveRoomTemplate,
  loadRoomTemplates,
  deleteRoomTemplate,
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
  StickyNote as StickyNoteIcon,
  Users,
  User as UserIcon,
  Shield,
  Filter,
  RefreshCw,
  Zap,
  CheckCircle2,
  Radio,
} from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentConfig: WorkspaceConfig;
  currentTasks?: Task[];
  currentStickyNotes?: StickyNote[];
  currentNotepad?: string;
  roomParticipants?: Participant[];
  roomId?: string | null;
  activeRoomCode?: string | null;
  onApplyTemplate: (
    config: WorkspaceConfig,
    tasks?: Task[],
    stickyNotes?: StickyNote[],
    notepad?: string,
    appliedTemplate?: Template
  ) => void;
  onOpenMarketplace: () => void;
  activeTemplate?: Template | null;
  isTemplateAutoSync?: boolean;
  isTemplateSyncing?: boolean;
  lastTemplateSyncedAt?: Date | null;
  onSetActiveTemplate?: (template: Template | null, enableAutoSync?: boolean) => void;
  onToggleTemplateAutoSync?: () => void;
  onDetachActiveTemplate?: () => void;
  onSyncActiveTemplateNow?: () => Promise<void>;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  user,
  currentConfig,
  currentTasks = [],
  currentStickyNotes = [],
  currentNotepad = '',
  roomParticipants = [],
  roomId = null,
  activeRoomCode = null,
  onApplyTemplate,
  onOpenMarketplace,
  activeTemplate,
  isTemplateAutoSync = false,
  isTemplateSyncing = false,
  lastTemplateSyncedAt,
  onSetActiveTemplate,
  onToggleTemplateAutoSync,
  onDetachActiveTemplate,
  onSyncActiveTemplateNow,
}) => {
  const [activeTab, setActiveTab] = useState<'my-templates' | 'save-new' | 'export-import'>('my-templates');
  const [personalTemplates, setPersonalTemplates] = useState<Template[]>([]);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'personal' | 'room'>('all');
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
  const [autoSyncThisTemplate, setAutoSyncThisTemplate] = useState(false);
  const [publishDirectlyToMarketplace, setPublishDirectlyToMarketplace] = useState(false);

  // Share/Import states
  const [copiedCode, setCopiedCode] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadUserTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const personalList = await loadPersonalTemplates(user?.uid || 'guest', user?.email);
      let roomList: Template[] = [];
      if (roomId) {
        roomList = await loadRoomTemplates(roomId);
      }

      const combinedMap = new Map<string, Template>();
      roomList.forEach((t) => combinedMap.set(t.id, { ...t, contextType: 'room', roomId }));
      personalList.forEach((t) => {
        if (!combinedMap.has(t.id)) {
          combinedMap.set(t.id, { ...t, contextType: t.roomId ? 'room' : 'personal' });
        }
      });

      const list = Array.from(combinedMap.values()).sort(
        (a, b) => new Date(b.updatedAt || b.createdAt || '').getTime() - new Date(a.updatedAt || a.createdAt || '').getTime()
      );
      setPersonalTemplates(list);
    } catch (err) {
      console.warn('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, roomId]);

  useEffect(() => {
    if (!isOpen) return;
    loadUserTemplates();
  }, [isOpen, loadUserTemplates]);

  if (!isOpen) return null;

  const isRoomActive = Boolean(roomId);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const templateId = `template-${Date.now()}`;
    const creatorId = user?.uid || 'guest';
    const creatorName = user?.displayName || (isRoomActive ? 'Room Host' : 'Focus Explorer');

    const newTemplate: Template = {
      id: templateId,
      creatorId,
      creatorName,
      creatorPhoto: user?.photoURL || undefined,
      name: templateName.trim(),
      description:
        description.trim() ||
        (isRoomActive
          ? `Shared Workspace Template for room ${activeRoomCode || roomId}.`
          : 'Personal Focus Workspace setup.'),
      category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      thumbnail: thumbnailUrl || PRESET_BACKGROUNDS[0].url,
      config: currentConfig,
      tasks: includeTasks ? currentTasks : undefined,
      stickyNotes: includeStickyNotes ? currentStickyNotes : undefined,
      notepad: includeNotepad ? currentNotepad : undefined,
      isPublic: publishDirectlyToMarketplace,
      roomId: isRoomActive && roomId ? roomId : undefined,
      contextType: isRoomActive ? 'room' : 'personal',
      isGroup: isRoomActive ? 1 : 0,
      price: 0,
      downloadCount: 0,
      likesCount: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsLoading(true);
    try {
      let saved: Template;
      if (isRoomActive && roomId) {
        saved = await saveRoomTemplate(roomId, newTemplate);
      } else {
        saved = await savePersonalTemplate(user?.uid || 'guest', newTemplate);
      }

      if (publishDirectlyToMarketplace && user) {
        await publishTemplateToMarketplace(saved);
      }
      if (autoSyncThisTemplate && onSetActiveTemplate) {
        onSetActiveTemplate(saved, true);
      }
      await loadUserTemplates();

      setStatusMessage(
        isRoomActive
          ? `✨ Room Template "${saved.name}" saved for Room ${activeRoomCode || roomId}!`
          : autoSyncThisTemplate
          ? `✨ Template "${saved.name}" saved & linked! Future workspace changes will auto-sync.`
          : `Template "${saved.name}" saved successfully!`
      );
      setTemplateName('');
      setDescription('');
      setTimeout(() => {
        setStatusMessage(null);
        setActiveTab('my-templates');
      }, 1800);
    } catch (err) {
      console.error('Failed to save template:', err);
      setStatusMessage('Error saving template.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) return;
    try {
      if (template.roomId || template.contextType === 'room') {
        await deleteRoomTemplate(template.roomId || roomId || '', template.id);
      } else {
        await deletePersonalTemplate(user?.uid || 'guest', template.id);
      }
      if (activeTemplate?.id === template.id && onDetachActiveTemplate) {
        onDetachActiveTemplate();
      }
      setPersonalTemplates((prev) => prev.filter((t) => t.id !== template.id));
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleQuickUpdateTemplateWithWorkspace = async (template: Template) => {
    try {
      setIsLoading(true);
      const updatedTmpl: Template = {
        ...template,
        config: currentConfig,
        tasks: template.tasks !== undefined ? currentTasks : undefined,
        stickyNotes: template.stickyNotes !== undefined ? currentStickyNotes : undefined,
        notepad: template.notepad !== undefined ? currentNotepad : undefined,
        thumbnail:
          currentConfig.background.workItems?.[0]?.thumbnailUrl ||
          currentConfig.background.workItems?.[0]?.url ||
          template.thumbnail,
        updatedAt: new Date().toISOString(),
      };

      let saved: Template;
      if (template.roomId || template.contextType === 'room') {
        saved = await saveRoomTemplate(template.roomId || roomId || '', updatedTmpl);
      } else {
        saved = await savePersonalTemplate(user?.uid || 'guest', updatedTmpl);
      }

      if (activeTemplate?.id === template.id && onSetActiveTemplate) {
        onSetActiveTemplate(saved, true);
      }
      await loadUserTemplates();
      setStatusMessage(`✨ Updated template "${saved.name}" with current workspace!`);
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (err) {
      console.error('Error updating template:', err);
      setStatusMessage('Error updating template.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (template: Template, autoSync: boolean = false) => {
    onApplyTemplate(template.config, template.tasks, template.stickyNotes, template.notepad, template);
    if (onSetActiveTemplate) {
      onSetActiveTemplate(template, autoSync);
    }
    setStatusMessage(`✨ Template "${template.name}" applied successfully!`);
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 900);
  };

  const encodeFullTemplate = (overrides?: Partial<Template>): string => {
    try {
      const payload: Partial<Template> = {
        ...overrides,
        config: currentConfig,
        tasks: includeTasks ? currentTasks : [],
        stickyNotes: includeStickyNotes ? currentStickyNotes : [],
        notepad: includeNotepad ? currentNotepad : '',
        name: templateName || 'Custom Atmosphere',
        roomId: isRoomActive && roomId ? roomId : undefined,
        contextType: isRoomActive ? 'room' : 'personal',
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
      alert('Invalid template code.');
    }
  };

  const filteredTemplates = personalTemplates.filter((t) => {
    const isRoomTmpl = Boolean(t.roomId || t.contextType === 'room' || t.isGroup === 1);
    if (templateFilter === 'personal') return !isRoomTmpl;
    if (templateFilter === 'room') return isRoomTmpl;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-2xl w-full text-slate-100 relative max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 pr-10">
          <div className="flex items-center gap-3 text-indigo-400">
            <div className={`p-3 rounded-2xl border ${isRoomActive ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'}`}>
              {isRoomActive ? <Radio className="w-6 h-6 animate-pulse" /> : <Layout className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Workspace Templates</span>
                {isRoomActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    Room {activeRoomCode || roomId}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {isRoomActive
                  ? `Room Mode active: Templates saved will be shared automatically with room members.`
                  : 'Personal Workspace Mode: Save and switch your personal atmospheres seamlessly.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 mb-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('my-templates')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'my-templates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Templates ({personalTemplates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('save-new')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'save-new' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Setup</span>
          </button>
          <button
            onClick={() => setActiveTab('export-import')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'export-import' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share & Import</span>
          </button>
        </div>

        {statusMessage && (
          <div className="mb-4 p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {activeTab === 'my-templates' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTemplateFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    templateFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTemplateFilter('personal')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    templateFilter === 'personal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserIcon className="w-3 h-3" />
                  Personal
                </button>
                <button
                  onClick={() => setTemplateFilter('room')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    templateFilter === 'room' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  Room Templates
                </button>
              </div>

              <button
                onClick={onOpenMarketplace}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium ml-auto"
              >
                <Store className="w-3.5 h-3.5" /> Community Market <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-12 px-4 border border-dashed border-slate-800 rounded-3xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Layout className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {templateFilter === 'room' ? 'No room templates found' : 'No templates found'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  {isRoomActive
                    ? 'Save your current room atmosphere to create a shared template for everyone in the room.'
                    : 'Customize your workspace settings and save as a Personal Template.'}
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
                {filteredTemplates.map((t) => {
                  const isRoomTmpl = Boolean(t.roomId || t.contextType === 'room' || t.isGroup === 1);
                  const isActive = activeTemplate?.id === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`bg-slate-950/70 border rounded-2xl p-3.5 flex flex-col justify-between transition group relative ${
                        isActive
                          ? 'border-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/50'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="relative h-24 rounded-xl overflow-hidden mb-2.5 border border-slate-800">
                          <img
                            src={t.thumbnail}
                            alt={t.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono border border-slate-800">
                            {t.config?.method?.type?.toUpperCase() || 'FLOW'}
                          </div>

                          <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap">
                            {isActive && (
                              <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 shadow-md animate-pulse">
                                <Radio className="w-2.5 h-2.5" /> ACTIVE
                              </span>
                            )}
                            {isRoomTmpl ? (
                              <span className="bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-white font-bold flex items-center gap-1 shadow-sm">
                                <Users className="w-2.5 h-2.5" /> Room Template
                              </span>
                            ) : (
                              <span className="bg-slate-900/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] text-slate-300 font-medium flex items-center gap-1 border border-slate-700">
                                <UserIcon className="w-2.5 h-2.5 text-indigo-400" /> Personal
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <h4 className="font-bold text-xs text-slate-100">{t.name}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{t.description}</p>

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

                      <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-1 gap-1.5">
                        <button
                          onClick={() => handleDeleteTemplate(t)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => handleQuickUpdateTemplateWithWorkspace(t)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Save Changes</span>
                          </button>

                          <button
                            onClick={() => handleApply(t, false)}
                            className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-1 shadow-md ${
                              isActive
                                ? 'bg-emerald-600 hover:bg-emerald-500'
                                : 'bg-indigo-600 hover:bg-indigo-500'
                            }`}
                          >
                            <Download className="w-3 h-3" />
                            <span>{isActive ? 'Re-Apply' : 'Apply'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'save-new' && (
          <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isRoomActive
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
            }`}>
              <div className={`p-2 rounded-xl border ${
                isRoomActive
                  ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
              }`}>
                {isRoomActive ? <Radio className="w-4 h-4 animate-pulse" /> : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold flex items-center gap-2">
                  <span>{isRoomActive ? 'Room Template Scope' : 'Personal Template Scope'}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[9px] font-mono uppercase font-semibold ${
                    isRoomActive ? 'bg-emerald-600/30 text-emerald-300' : 'bg-indigo-600/30 text-indigo-300'
                  }`}>
                    {isRoomActive ? `Room ${activeRoomCode || roomId}` : 'Personal Cloud'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isRoomActive
                    ? `This template will be saved to Room ${activeRoomCode || roomId} and immediately accessible to all room members.`
                    : 'This template will be saved to your personal cloud workspace collection.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={isRoomActive ? "e.g. Team Sprint Atmosphere" : "e.g. Midnight Cyberpunk Deep Flow"}
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
                  <option value="Deep Coding">Deep Coding</option>
                  <option value="Group Study">Group / Team</option>
                  <option value="Cozy Cabin">Cozy Cabin</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">Include in Template</span>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={includeTasks} onChange={(e) => setIncludeTasks(e.target.checked)} className="rounded accent-indigo-500" />
                  <span>Tasks</span>
                </label>
                <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={includeStickyNotes} onChange={(e) => setIncludeStickyNotes(e.target.checked)} className="rounded accent-indigo-500" />
                  <span>Notes</span>
                </label>
                <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={includeNotepad} onChange={(e) => setIncludeNotepad(e.target.checked)} className="rounded accent-indigo-500" />
                  <span>Notepad</span>
                </label>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Auto-Sync Changes</span>
                </p>
                <p className="text-[11px] text-slate-400">Keep template updated automatically.</p>
              </div>
              <div
                onClick={() => setAutoSyncThisTemplate(!autoSyncThisTemplate)}
                className={`w-11 h-6 rounded-full transition flex items-center px-0.5 cursor-pointer ${
                  autoSyncThisTemplate ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !templateName.trim()}
                className={`w-full py-3 text-white font-bold rounded-2xl text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                  isRoomActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>
                  {isRoomActive
                    ? `Save Room Template for Room ${activeRoomCode || roomId}`
                    : 'Save Personal Template'}
                </span>
              </button>
            </div>
          </form>
        )}

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
