import React, { useState, useEffect } from 'react';
import { WorkspaceConfig, Template, Task, StickyNote } from '../types';
import {
  fetchMarketplaceTemplates,
  publishTemplateToMarketplace,
  updateMarketplaceTemplate,
  deleteMarketplaceTemplate,
  recordTemplateClone,
  toggleTemplateLike,
} from '../firebase';
import { type User } from 'firebase/auth';
import { PRESET_BACKGROUNDS } from '../data/presetBackgrounds';
import {
  Store,
  Search,
  Download,
  Heart,
  Tag,
  Clock,
  Music,
  Image,
  UploadCloud,
  Check,
  X,
  Filter,
  Sparkles,
  User as UserIcon,
  Trash2,
  Edit3,
  RefreshCw,
  Eye,
  FileText,
  ListTodo,
  StickyNote as StickyNoteIcon,
  Globe,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentConfig: WorkspaceConfig;
  currentTasks?: Task[];
  currentStickyNotes?: StickyNote[];
  currentNotepad?: string;
  onApplyTemplate: (config: WorkspaceConfig, tasks?: Task[], stickyNotes?: StickyNote[], notepad?: string) => void;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  isOpen,
  onClose,
  user,
  currentConfig,
  currentTasks = [],
  currentStickyNotes = [],
  currentNotepad = '',
  onApplyTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-published' | 'publish'>('browse');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'likes' | 'newest'>('popular');

  // Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Edit template state for authors
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');

  // Publish Form State
  const [publishName, setPublishName] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishCategory, setPublishCategory] = useState('Lofi Study');
  const [publishTags, setPublishTags] = useState('Focus, Lofi, Productivity');
  const [publishThumbnail, setPublishThumbnail] = useState(
    currentConfig.background.workItems?.[0]?.thumbnailUrl ||
    currentConfig.background.workItems?.[0]?.url ||
    PRESET_BACKGROUNDS[0].url
  );
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeStickyNotes, setIncludeStickyNotes] = useState(true);
  const [includeNotepad, setIncludeNotepad] = useState(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categories = [
    'All',
    'Lofi Study',
    'Deep Coding',
    'Cozy Cabin',
    'Zen Nature',
    'Late Night Flow',
    'Classic Pomodoro',
  ];

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMarketplaceTemplates();
      setTemplates(data);
    } catch (err) {
      console.warn('Failed to load marketplace templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApply = async (template: Template) => {
    onApplyTemplate(template.config, template.tasks, template.stickyNotes, template.notepad);
    await recordTemplateClone(template.id);
    
    // Update local download count
    setTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, downloadCount: (t.downloadCount || 0) + 1 } : t))
    );

    showToast(`Loaded & activated "${template.name}"!`);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleLikeToggle = async (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('Please sign in with your Google account to like templates.');
      return;
    }

    const isLiked = template.likedBy?.includes(user.uid) || false;
    const newLikedBy = isLiked
      ? (template.likedBy || []).filter((id) => id !== user.uid)
      : [...(template.likedBy || []), user.uid];
    const newLikesCount = Math.max(0, (template.likesCount || 0) + (isLiked ? -1 : 1));

    // Optimistic UI update
    setTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, likesCount: newLikesCount, likedBy: newLikedBy } : t))
    );
    if (previewTemplate?.id === template.id) {
      setPreviewTemplate({ ...previewTemplate, likesCount: newLikesCount, likedBy: newLikedBy });
    }

    try {
      await toggleTemplateLike(template.id, user.uid, isLiked);
    } catch (err) {
      console.warn('Failed to sync like toggle:', err);
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishName.trim()) return;

    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      creatorId: user?.uid || 'anonymous-creator',
      creatorName: user?.displayName || 'Community Creator',
      creatorPhoto: user?.photoURL || undefined,
      name: publishName.trim(),
      description: publishDesc.trim() || 'A curated Focus Atmosphere configuration.',
      category: publishCategory,
      tags: publishTags.split(',').map((t) => t.trim()).filter(Boolean),
      thumbnail: publishThumbnail || PRESET_BACKGROUNDS[0].url,
      config: currentConfig,
      tasks: includeTasks ? currentTasks : undefined,
      stickyNotes: includeStickyNotes ? currentStickyNotes : undefined,
      notepad: includeNotepad ? currentNotepad : undefined,
      isPublic: true,
      price: 0,
      downloadCount: 1,
      likesCount: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsLoading(true);
    try {
      await publishTemplateToMarketplace(newTemplate);
      setTemplates((prev) => [newTemplate, ...prev]);
      showToast('Template published to the Community Marketplace!');
      setPublishName('');
      setPublishDesc('');
      setActiveTab('browse');
    } catch (err) {
      console.error('Failed to publish template:', err);
      showToast('Error publishing template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (t: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(t);
    setEditName(t.name);
    setEditDesc(t.description);
    setEditCategory(t.category || 'Lofi Study');
    setEditTags(t.tags.join(', '));
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;
    const updates: Partial<Template> = {
      name: editName.trim(),
      description: editDesc.trim(),
      category: editCategory,
      tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    try {
      await updateMarketplaceTemplate(editingTemplate.id, updates);
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...updates } : t))
      );
      setEditingTemplate(null);
      showToast('Template metadata updated!');
    } catch (err) {
      console.error('Failed to update template:', err);
      showToast('Failed to update template.');
    }
  };

  const handleUpdateWithCurrentWorkspace = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Update this published template with your current workspace layout, audio settings, and notes?')) {
      return;
    }

    const updates: Partial<Template> = {
      config: currentConfig,
      tasks: currentTasks,
      stickyNotes: currentStickyNotes,
      notepad: currentNotepad,
      thumbnail: currentConfig.background.workItems?.[0]?.thumbnailUrl || currentConfig.background.workItems?.[0]?.url,
    };

    try {
      await updateMarketplaceTemplate(templateId, updates);
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, ...updates } : t))
      );
      showToast('Template updated with your latest workspace settings!');
    } catch (err) {
      console.error('Failed to update workspace settings:', err);
    }
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete and unpublish this template from the market?')) {
      return;
    }

    try {
      await deleteMarketplaceTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      showToast('Template removed from marketplace.');
    } catch (err) {
      console.error('Failed to delete marketplace template:', err);
    }
  };

  // Filter and Sort Logic
  const filteredTemplates = templates
    .filter((t) => {
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        return (b.downloadCount || 0) - (a.downloadCount || 0);
      }
      if (sortBy === 'likes') {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });

  const myPublishedTemplates = templates.filter((t) => user && t.creatorId === user.uid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-4xl w-full text-slate-100 relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 pr-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Community Template Marketplace</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Cloud Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Discover, copy, rate, and publish customizable focus workspaces
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'browse' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Explore Market ({templates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('my-published')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'my-published' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>My Published ({myPublishedTemplates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('publish')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'publish' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Publish Current Workspace</span>
          </button>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: BROWSE MARKETPLACE */}
        {activeTab === 'browse' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Search, Filter & Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, tag, vibe, or creator..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="popular">🔥 Most Cloned</option>
                  <option value="likes">❤️ Highest Rated</option>
                  <option value="newest">✨ Newest First</option>
                </select>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {isLoading ? (
                <div className="py-16 text-center text-slate-400 text-xs">Loading marketplace community templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl">
                  <p className="text-sm font-bold text-white mb-1">No matching templates found</p>
                  <p className="text-xs text-slate-400">Try adjusting your search query or category filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pb-2">
                  {filteredTemplates.map((template) => {
                    const isUserAuthor = user && template.creatorId === user.uid;
                    const isLiked = user && template.likedBy?.includes(user.uid);

                    return (
                      <div
                        key={template.id}
                        onClick={() => setPreviewTemplate(template)}
                        className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition flex flex-col justify-between group cursor-pointer"
                      >
                        <div>
                          {/* Image Cover */}
                          <div className="relative h-32 w-full overflow-hidden bg-slate-900">
                            <img
                              src={template.thumbnail}
                              alt={template.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30" />

                            {/* Method Badge */}
                            <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-300 border border-slate-800">
                              {template.config?.method?.type?.toUpperCase() || 'POMODORO'}
                            </div>

                            {/* Like Button */}
                            <button
                              onClick={(e) => handleLikeToggle(template, e)}
                              className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md border transition flex items-center gap-1 text-[11px] font-bold ${
                                isLiked
                                  ? 'bg-rose-500/30 border-rose-500/50 text-rose-300'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-rose-400'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                              <span>{template.likesCount || 0}</span>
                            </button>

                            {/* Category & Clones Badge */}
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-slate-300">
                              <span className="bg-indigo-600/80 px-2 py-0.5 rounded-md font-medium">
                                {template.category || 'Lofi Study'}
                              </span>
                              <span className="flex items-center gap-1 font-mono text-slate-300">
                                <Download className="w-3 h-3 text-emerald-400" /> {template.downloadCount || 0} clones
                              </span>
                            </div>
                          </div>

                          {/* Content Details */}
                          <div className="p-3.5">
                            <h3 className="font-bold text-xs text-white mb-1 group-hover:text-indigo-400 transition line-clamp-1">
                              {template.name}
                            </h3>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5">
                              {template.description}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {template.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {/* Included content indicators */}
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              {template.tasks && template.tasks.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <ListTodo className="w-2.5 h-2.5" /> {template.tasks.length} tasks
                                </span>
                              )}
                              {template.stickyNotes && template.stickyNotes.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <StickyNoteIcon className="w-2.5 h-2.5" /> {template.stickyNotes.length} notes
                                </span>
                              )}
                              {template.notepad && (
                                <span className="flex items-center gap-0.5">
                                  <FileText className="w-2.5 h-2.5" /> notepad
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/30">
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            {template.creatorPhoto ? (
                              <img src={template.creatorPhoto} alt="" className="w-4 h-4 rounded-full" />
                            ) : (
                              <UserIcon className="w-3 h-3 text-slate-400" />
                            )}
                            <span className="truncate max-w-[90px]">{template.creatorName}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApply(template);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-md"
                            >
                              <Download className="w-3 h-3" /> Copy & Use
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: MY PUBLISHED TEMPLATES */}
        {activeTab === 'my-published' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300">
                Templates you authored and published to the public marketplace. You can update or edit them anytime.
              </p>
              <button
                onClick={() => setActiveTab('publish')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" /> Publish Current Setup
              </button>
            </div>

            {myPublishedTemplates.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">No published templates yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Share your favorite atmosphere, music mix, and timer configurations with the community!
                </p>
                <button
                  onClick={() => setActiveTab('publish')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <UploadCloud className="w-4 h-4" /> Publish Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myPublishedTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <img src={t.thumbnail} alt="" className="w-20 h-16 rounded-xl object-cover border border-slate-800" />
                      <div>
                        <h4 className="font-bold text-sm text-white mb-0.5">{t.name}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1 max-w-md mb-1.5">{t.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span className="text-indigo-400 font-medium">{t.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3 text-emerald-400" /> {t.downloadCount || 0} Clones
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400" /> {t.likesCount || 0} Likes
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <button
                        onClick={(e) => handleStartEdit(t, e)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5"
                        title="Edit title & tags"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Info
                      </button>

                      <button
                        onClick={(e) => handleUpdateWithCurrentWorkspace(t.id, e)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-900/50 text-indigo-300 text-xs font-medium transition flex items-center gap-1.5 border border-indigo-500/20"
                        title="Sync with your current workspace layout and notes"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Overwrite with Current Workspace
                      </button>

                      <button
                        onClick={(e) => handleDeleteTemplate(t.id, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition"
                        title="Delete from Marketplace"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: PUBLISH CURRENT WORKSPACE FORM */}
        {activeTab === 'publish' && (
          <form onSubmit={handlePublishSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-300 text-xs font-medium">
              Publishing your active workspace (wallpapers, ambient sounds, timer method, layout, tasks, and notes) as a reusable template to the Community Marketplace.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={publishName}
                  onChange={(e) => setPublishName(e.target.value)}
                  placeholder="e.g. Kyoto Zen Garden Meditation & Code"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={publishCategory}
                  onChange={(e) => setPublishCategory(e.target.value)}
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
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Description *</label>
              <textarea
                rows={2}
                required
                value={publishDesc}
                onChange={(e) => setPublishDesc(e.target.value)}
                placeholder="Explain what makes this atmosphere unique (music combo, timer rhythm, lighting, notes starter)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={publishTags}
                  onChange={(e) => setPublishTags(e.target.value)}
                  placeholder="Rain, Coding, 90min, Dark"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Cover Preview Image URL</label>
                <input
                  type="text"
                  value={publishThumbnail}
                  onChange={(e) => setPublishThumbnail(e.target.value)}
                  placeholder="Image URL..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Inclusions */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Include Content in Public Template
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
                  <span>Notepad Markdown</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !publishName.trim()}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Globe className="w-4 h-4" />
                <span>Publish to Public Marketplace</span>
              </button>
            </div>

          </form>
        )}

        {/* PREVIEW DETAIL POPUP */}
        {previewTemplate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full text-slate-100 relative">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative h-44 rounded-2xl overflow-hidden mb-4 border border-slate-800">
                <img src={previewTemplate.thumbnail} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-xs bg-indigo-600 px-2.5 py-1 rounded-lg font-bold">
                    {previewTemplate.category || 'Lofi Study'}
                  </span>
                  <span className="text-xs font-mono text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    {previewTemplate.config?.method?.type?.toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{previewTemplate.name}</h3>
              <p className="text-xs text-slate-400 mb-4">{previewTemplate.description}</p>

              {/* Specs Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/80 p-3 rounded-2xl border border-slate-800 mb-4">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Timer Cycle</span>
                  <span className="font-semibold text-slate-200">
                    {Math.round((previewTemplate.config?.method?.workDuration || 1500) / 60)}m Focus /{' '}
                    {Math.round((previewTemplate.config?.method?.breakDuration || 300) / 60)}m Break
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Default Music</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {previewTemplate.config?.audio?.musicTrack?.title || 'Lofi Beats'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Active Ambience</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {previewTemplate.config?.audio?.ambientTracks?.filter((a) => a.active)?.map((a) => a.name).join(', ') || 'Rain'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Included Assets</span>
                  <span className="font-semibold text-slate-200">
                    {previewTemplate.tasks?.length || 0} tasks • {previewTemplate.stickyNotes?.length || 0} notes
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => handleLikeToggle(previewTemplate, e)}
                  className={`py-3 px-4 rounded-2xl border transition flex items-center justify-center gap-1.5 text-xs font-bold ${
                    previewTemplate.likedBy?.includes(user?.uid || '')
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-rose-400'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${previewTemplate.likedBy?.includes(user?.uid || '') ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{previewTemplate.likesCount || 0}</span>
                </button>

                <button
                  onClick={() => {
                    handleApply(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl text-xs shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Clone & Activate Workspace</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT METADATA POPUP FOR AUTHORS */}
        {editingTemplate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full text-slate-100 relative">
              <button
                onClick={() => setEditingTemplate(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-white mb-3">Edit Published Template</h3>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tags</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
