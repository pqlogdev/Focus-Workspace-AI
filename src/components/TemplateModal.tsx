import React, { useState, useEffect } from 'react';
import { WorkspaceConfig, Template, Task, StickyNote, TemplateMember, Participant } from '../types';
import {
  savePersonalTemplate,
  loadPersonalTemplates,
  deletePersonalTemplate,
  publishTemplateToMarketplace,
  updateTemplateMembers,
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
  UserPlus,
  Shield,
  Filter,
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
  roomParticipants = [],
  onApplyTemplate,
  onOpenMarketplace,
}) => {
  const [activeTab, setActiveTab] = useState<'my-templates' | 'save-new' | 'export-import'>('my-templates');
  const [personalTemplates, setPersonalTemplates] = useState<Template[]>([]);
  const [templateFilter, setTemplateFilter] = useState<'all' | 'personal' | 'group'>('all');
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

  // Group Ownership State (isGroup: 0 = personal, isGroup: 1 = group with max 5 members)
  const [isGroupFlag, setIsGroupFlag] = useState<0 | 1>(0);
  const [groupMembers, setGroupMembers] = useState<TemplateMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  // Manage existing template members dialog
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editMembersList, setEditMembersList] = useState<TemplateMember[]>([]);
  const [editMemberEmail, setEditMemberEmail] = useState('');
  const [editMemberName, setEditMemberName] = useState('');

  // Share/Import states
  const [copiedCode, setCopiedCode] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize group members with current user when opening or switching to group
  useEffect(() => {
    if (user) {
      const creatorMember: TemplateMember = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'You (Creator)',
        photoURL: user.photoURL || undefined,
        role: 'owner',
        addedAt: new Date().toISOString(),
      };
      setGroupMembers([creatorMember]);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen || !user) return;
    loadUserTemplates();
  }, [isOpen, user]);

  const loadUserTemplates = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const templates = await loadPersonalTemplates(user.uid, user.email);
      setPersonalTemplates(templates);
    } catch (err) {
      console.warn('Error loading personal/group templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a member to the group user list (capped at maximum 5 members)
  const handleAddMemberToForm = () => {
    if (!newMemberEmail.trim() && !newMemberName.trim()) return;
    if (groupMembers.length >= 5) {
      alert('Group templates are limited to a maximum of 5 members.');
      return;
    }

    const email = newMemberEmail.trim();
    const name = newMemberName.trim() || email.split('@')[0] || `Member ${groupMembers.length + 1}`;

    // Prevent duplicate email
    if (email && groupMembers.some((m) => m.email && m.email.toLowerCase() === email.toLowerCase())) {
      alert('This member is already added to the group template list.');
      return;
    }

    const newMember: TemplateMember = {
      uid: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      email,
      displayName: name,
      role: 'member',
      addedAt: new Date().toISOString(),
    };

    setGroupMembers((prev) => [...prev.slice(0, 4), newMember]);
    setNewMemberEmail('');
    setNewMemberName('');
  };

  // Remove a member from the form list (keep owner)
  const handleRemoveMemberFromForm = (index: number) => {
    if (index === 0) return; // Keep owner
    setGroupMembers((prev) => prev.filter((_, i) => i !== index));
  };

  // Import up to 4 participants from live room (total max 5 with current user)
  const handleImportRoomParticipants = () => {
    if (!roomParticipants || roomParticipants.length === 0) return;
    
    const existingUids = new Set(groupMembers.map((m) => m.uid));
    const toAdd: TemplateMember[] = [];

    for (const p of roomParticipants) {
      if (groupMembers.length + toAdd.length >= 5) break;
      if (!existingUids.has(p.id)) {
        toAdd.push({
          uid: p.id,
          displayName: p.displayName,
          photoURL: p.photoURL,
          role: 'member',
          addedAt: new Date().toISOString(),
        });
        existingUids.add(p.id);
      }
    }

    if (toAdd.length > 0) {
      setGroupMembers((prev) => [...prev, ...toAdd].slice(0, 5));
      setIsGroupFlag(1);
    }
  };

  if (!isOpen) return null;

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const templateId = `template-${Date.now()}`;
    const creatorId = user?.uid || 'anonymous';
    const creatorName = user?.displayName || 'Focus Explorer';

    // Prepare members user list (stored directly in template table, max 5 members)
    const finalMembers: TemplateMember[] =
      isGroupFlag === 1
        ? groupMembers.slice(0, 5)
        : [
            {
              uid: creatorId,
              email: user?.email || '',
              displayName: creatorName,
              photoURL: user?.photoURL || undefined,
              role: 'owner',
              addedAt: new Date().toISOString(),
            },
          ];

    const memberUids = finalMembers.map((m) => m.uid).filter(Boolean);

    const newTemplate: Template = {
      id: templateId,
      creatorId,
      creatorName,
      creatorPhoto: user?.photoURL || undefined,
      name: templateName.trim(),
      description: description.trim() || (isGroupFlag === 1 ? 'Shared Group Workspace Template.' : 'Personal Focus Workspace setup.'),
      category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      thumbnail: thumbnailUrl || PRESET_BACKGROUNDS[0].url,
      config: currentConfig,
      tasks: includeTasks ? currentTasks : undefined,
      stickyNotes: includeStickyNotes ? currentStickyNotes : undefined,
      notepad: includeNotepad ? currentNotepad : undefined,
      isPublic: publishDirectlyToMarketplace,
      isGroup: isGroupFlag, // 0 = personal, 1 = group
      members: finalMembers, // max 5 members stored in template
      memberUids,
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
        isGroupFlag === 1
          ? `Group Template saved! Belonged to ${finalMembers.length}/5 team members.`
          : 'Personal Template saved to your Cloud workspace!'
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
      console.error('Failed to delete template:', err);
    }
  };

  // Open Edit Members Dialog for an existing Group Template
  const handleOpenEditMembers = (tmpl: Template) => {
    setEditingTemplate(tmpl);
    setEditMembersList(tmpl.members && tmpl.members.length > 0 ? [...tmpl.members] : [{
      uid: tmpl.creatorId,
      displayName: tmpl.creatorName,
      role: 'owner',
      addedAt: tmpl.createdAt,
    }]);
    setEditMemberEmail('');
    setEditMemberName('');
  };

  const handleSaveEditedMembers = async () => {
    if (!editingTemplate) return;
    try {
      setIsLoading(true);
      const updatedMembers = await updateTemplateMembers(editingTemplate.id, editMembersList);
      setPersonalTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, members: updatedMembers, memberUids: updatedMembers.map((m) => m.uid) }
            : t
        )
      );
      setStatusMessage(`Updated group roster (${updatedMembers.length}/5 members)!`);
      setEditingTemplate(null);
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (e) {
      console.error('Error saving updated group members:', e);
      alert('Failed to update group members.');
    } finally {
      setIsLoading(false);
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
        isGroup: isGroupFlag,
        members: groupMembers,
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

  // Filter templates list
  const filteredTemplates = personalTemplates.filter((t) => {
    if (templateFilter === 'personal') return t.isGroup === 0 || !t.isGroup;
    if (templateFilter === 'group') return t.isGroup === 1;
    return true;
  });

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
              <h2 className="text-lg font-bold text-white">Personal & Group Workspace Templates</h2>
              <p className="text-xs text-slate-400">Store individual setups or group templates for up to 5 members</p>
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
            <span>My Templates ({personalTemplates.length})</span>
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
            
            {/* Filter Pills and Market Link */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTemplateFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    templateFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({personalTemplates.length})
                </button>
                <button
                  onClick={() => setTemplateFilter('personal')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    templateFilter === 'personal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserIcon className="w-3 h-3" />
                  Personal (isGroup: 0)
                </button>
                <button
                  onClick={() => setTemplateFilter('group')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    templateFilter === 'group' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  Group (isGroup: 1)
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
              <div className="py-12 text-center text-slate-400 text-xs">Loading saved cloud templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-12 px-4 border border-dashed border-slate-800 rounded-3xl text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Layout className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {templateFilter === 'group' ? 'No group templates found' : 'No custom templates saved yet'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  {templateFilter === 'group'
                    ? 'Save a template with isGroup flag (1) and add up to 5 team members to collaborate together.'
                    : 'Customize your workspace and save as a Personal (isGroup: 0) or Group (isGroup: 1) template.'}
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
                  const isGroupTmpl = t.isGroup === 1;
                  const memberCount = t.members?.length || 1;

                  return (
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

                          {/* Group / Personal Badge */}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            {isGroupTmpl ? (
                              <span className="bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-white font-bold flex items-center gap-1 shadow-sm">
                                <Users className="w-2.5 h-2.5" /> Group ({memberCount}/5)
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

                        {/* Group Members Avatars / List (max 5) */}
                        {isGroupTmpl && t.members && t.members.length > 0 && (
                          <div className="mb-2.5 p-2 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center -space-x-1.5 overflow-hidden">
                              {t.members.slice(0, 5).map((m, idx) => (
                                <div
                                  key={m.uid || idx}
                                  title={`${m.displayName || m.email || 'Member'} (${m.role || 'member'})`}
                                  className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border border-slate-950 flex items-center justify-center text-[8px] font-bold text-white"
                                >
                                  {m.photoURL ? (
                                    <img src={m.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    (m.displayName?.[0] || m.email?.[0] || 'U').toUpperCase()
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => handleOpenEditMembers(t)}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5"
                            >
                              <Users className="w-3 h-3" /> Manage Group ({t.members.length}/5)
                            </button>
                          </div>
                        )}

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
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: Save New Template Form */}
        {activeTab === 'save-new' && (
          <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            
            {/* Template Ownership Type Selection (isGroup: 0 vs isGroup: 1) */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Template Ownership (isGroup flag)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsGroupFlag(0)}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    isGroupFlag === 0
                      ? 'bg-indigo-600/15 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isGroupFlag === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Personal Template (isGroup = 0)</div>
                    <div className="text-[10px] text-slate-400">Belongs strictly to you</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsGroupFlag(1)}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    isGroupFlag === 1
                      ? 'bg-emerald-600/15 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${isGroupFlag === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Group Template (isGroup = 1)</div>
                    <div className="text-[10px] text-slate-400">Belongs to a team of up to 5 members</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Group Members Manager (When isGroup === 1) */}
            {isGroupFlag === 1 && (
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">
                      Group Member User List ({groupMembers.length}/5 max)
                    </span>
                  </div>
                  {roomParticipants && roomParticipants.length > 0 && (
                    <button
                      type="button"
                      onClick={handleImportRoomParticipants}
                      className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[10px] font-semibold transition flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-fill from Live Room
                    </button>
                  )}
                </div>

                {/* Member Chips List */}
                <div className="space-y-1.5">
                  {groupMembers.map((m, index) => (
                    <div
                      key={m.uid || index}
                      className="flex items-center justify-between p-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                          {index === 0 ? <Shield className="w-3 h-3" /> : index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 text-[11px] flex items-center gap-1">
                            <span>{m.displayName}</span>
                            {index === 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px]">
                                Owner
                              </span>
                            )}
                          </div>
                          {m.email && <div className="text-[10px] text-slate-400">{m.email}</div>}
                        </div>
                      </div>

                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberFromForm(index)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                          title="Remove member"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Member Input (If under 5 members) */}
                {groupMembers.length < 5 ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="email"
                      placeholder="Add by email (e.g. peer@study.com)..."
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Nickname (optional)"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMemberToForm}
                      disabled={!newMemberEmail.trim() && !newMemberName.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-center font-medium">
                    Maximum limit of 5 group members reached.
                  </div>
                )}
              </div>
            )}

            {/* Template Core Info */}
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
                  <option value="Group Study">Group Study / Team Sprint</option>
                  <option value="Cozy Cabin">Cozy Cabin & Hearth</option>
                  <option value="Zen Nature">Zen Nature & Rain</option>
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
                  placeholder="Rain, Lofi, Team, DeepWork"
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
                className={`w-full py-3 text-white font-bold rounded-2xl text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                  isGroupFlag === 1
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {isGroupFlag === 1
                    ? `Save Group Template (${groupMembers.length}/5 Members)`
                    : 'Save Personal Template in Cloud (isGroup: 0)'}
                </span>
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

        {/* DIALOG: Edit Group Members Modal */}
        {editingTemplate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 max-w-md w-full shadow-2xl text-slate-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Users className="w-4 h-4" />
                  <span>Manage Group Members ({editMembersList.length}/5)</span>
                </div>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Template: <span className="font-semibold text-slate-200">{editingTemplate.name}</span>. Maximum 5 members stored directly in the template data.
              </p>

              {/* Members List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {editMembersList.map((m, idx) => (
                  <div
                    key={m.uid || idx}
                    className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                          <span>{m.displayName || m.email || 'Member'}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px]">
                              Owner
                            </span>
                          )}
                        </div>
                        {m.email && <div className="text-[10px] text-slate-400">{m.email}</div>}
                      </div>
                    </div>

                    {idx !== 0 && (
                      <button
                        onClick={() => setEditMembersList((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add member to list */}
              {editMembersList.length < 5 ? (
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Peer email..."
                    value={editMemberEmail}
                    onChange={(e) => setEditMemberEmail(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => {
                      if (!editMemberEmail.trim() && !editMemberName.trim()) return;
                      const newM: TemplateMember = {
                        uid: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        email: editMemberEmail.trim(),
                        displayName: editMemberName.trim() || editMemberEmail.trim().split('@')[0],
                        role: 'member',
                        addedAt: new Date().toISOString(),
                      };
                      setEditMembersList((prev) => [...prev.slice(0, 4), newM]);
                      setEditMemberEmail('');
                      setEditMemberName('');
                    }}
                    disabled={!editMemberEmail.trim() && !editMemberName.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-xl text-center font-medium">
                  5/5 Members Maximum.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedMembers}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Save Group Members
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
