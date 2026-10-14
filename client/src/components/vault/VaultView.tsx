import React, { useEffect, useState } from 'react';
import type { Asset, AssetCategory, CreateAssetInput } from '@larv/shared';
import { apiClient } from '../../services/api.client.js';
import {
  Search,
  Plus,
  Copy,
  Check,
  Trash2,
  Pin,
  Tag,
  Code2,
  FileText,
  Sliders,
  Key,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export interface VaultViewProps {
  onAssetsChanged?: (totalCount: number) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({ onAssetsChanged }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: AssetCategory;
    language: string;
    content: string;
    tagsInput: string;
    isPinned: boolean;
  }>({
    title: '',
    description: '',
    category: 'snippet',
    language: 'typescript',
    content: '',
    tagsInput: '',
    isPinned: false,
  });

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.listAssets({
        q: searchQuery.trim() || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        tag: selectedTag || undefined,
      });
      setAssets(response.items);
      setTotal(response.total);
      if (onAssetsChanged) onAssetsChanged(response.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar assets do cofre';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadAssets();
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedCategory, selectedTag]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Falha ao copiar para o clipboard:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma a exclusão permanente deste asset?')) return;
    try {
      await apiClient.deleteAsset(id);
      await loadAssets();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir asset');
    }
  };

  const handleTogglePin = async (asset: Asset) => {
    try {
      await apiClient.updateAsset(asset.id, { isPinned: !asset.isPinned });
      await loadAssets();
    } catch (err: unknown) {
      console.error('Falha ao alternar pin:', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('O título é obrigatório.');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('O conteúdo do snippet/configuração não pode estar vazio.');
      return;
    }

    setFormSubmitting(true);
    try {
      const tags = formData.tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const payload: CreateAssetInput = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        language: formData.language.trim().toLowerCase(),
        content: formData.content,
        tags,
        isPinned: formData.isPinned,
      };

      await apiClient.createAsset(payload);
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        category: 'snippet',
        language: 'typescript',
        content: '',
        tagsInput: '',
        isPinned: false,
      });
      await loadAssets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar asset';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case 'snippet':
        return <Code2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'config':
        return <Sliders className="w-3.5 h-3.5 text-amber-400" />;
      case 'doc':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'token':
        return <Key className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  // Collect all unique tags from current assets
  const availableTags = Array.from(new Set(assets.flatMap((a) => a.tags)));

  return (
    <div className="space-y-6">
      {/* Action Header & Search Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, conteúdo ou descrição..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-300 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
            {(['all', 'snippet', 'config', 'doc', 'token'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                    : 'text-zinc-300 hover:text-zinc-200'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Create Trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAssets}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-sm font-semibold shadow-lg shadow-cyan-950/50 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Recurso</span>
          </button>
        </div>
      </div>

      {/* Tag Filter Ribbon */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-zinc-300 flex items-center gap-1 shrink-0">
            <Tag className="w-3.5 h-3.5" />
            Tags:
          </span>
          {availableTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(isSelected ? null : tag)}
                className={`px-2.5 py-1 rounded-full text-[11px] transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800'
                }`}
              >
                #{tag}
              </button>
            );
          })}
          {selectedTag && (
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="text-[11px] text-zinc-300 hover:text-zinc-200 underline ml-2 shrink-0"
            >
              Limpar tag
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Asset Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {assets.map((asset) => {
          const isCopied = copiedId === asset.id;

          return (
            <div
              key={asset.id}
              className={`p-5 rounded-2xl bg-zinc-900/60 border transition-all duration-150 flex flex-col justify-between ${
                asset.isPinned
                  ? 'border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div>
                {/* Header of card */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1 rounded bg-zinc-800 border border-zinc-700">
                      {getCategoryIcon(asset.category)}
                    </span>
                    <h3 className="text-base font-semibold text-zinc-100 truncate">
                      {asset.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(asset)}
                      title={asset.isPinned ? 'Desafixar' : 'Fixar no topo'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        asset.isPinned
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-zinc-850 text-zinc-300 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${asset.isPinned ? 'fill-cyan-400' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(asset.id)}
                      title="Excluir"
                      className="p-1.5 rounded-lg bg-zinc-850 hover:bg-rose-500/20 border border-zinc-800 hover:border-rose-500/30 text-zinc-300 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {asset.description && (
                  <p className="text-xs text-zinc-300 mb-3 line-clamp-2">
                    {asset.description}
                  </p>
                )}

                {/* Code Preview Box */}
                <div className="relative rounded-xl bg-zinc-950 border border-zinc-850 p-3.5 mb-3 font-mono text-xs overflow-x-auto max-h-48 group">
                  <pre className="text-zinc-300 leading-relaxed">
                    <code>{asset.content}</code>
                  </pre>
                </div>
              </div>

              {/* Footer of card */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-850 text-xs font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] uppercase font-semibold">
                    {asset.language}
                  </span>
                  {asset.tags.map((t) => (
                    <span
                      key={t}
                      onClick={() => setSelectedTag(t)}
                      className="cursor-pointer text-[10px] text-zinc-300 hover:text-cyan-400 transition-colors"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(asset.id, asset.content)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isCopied
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!loading && assets.length === 0 && (
        <div className="text-center py-16 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
          <Code2 className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-zinc-300">Nenhum asset encontrado</h4>
          <p className="text-xs text-zinc-300 max-w-sm mx-auto mt-1">
            {searchQuery || selectedCategory !== 'all' || selectedTag
              ? 'Tente ajustar os filtros ou o termo de pesquisa.'
              : 'O cofre está vazio. Clique em "+ Novo Recurso" para salvar seu primeiro snippet ou configuração.'}
          </p>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Cadastrar Novo Recurso no Cofre
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-300 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 mb-1 font-sans text-xs">Título *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Redis Cache Config"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-300 mb-1 font-sans text-xs">Categoria</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as AssetCategory })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="snippet">Snippet</option>
                      <option value="config">Config</option>
                      <option value="doc">Documento</option>
                      <option value="token">Token</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 mb-1 font-sans text-xs">Linguagem</label>
                    <input
                      type="text"
                      required
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      placeholder="typescript, json, sql..."
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                    >
                    </input>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-sans text-xs">Descrição (Opcional)</label>
                <input
                  type="text"
                  maxLength={500}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Contexto ou finalidade deste snippet"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-sans text-xs">Conteúdo do Snippet / Config *</label>
                <textarea
                  required
                  rows={7}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Cole o código ou payload aqui..."
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-zinc-300 mb-1 font-sans text-xs">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={formData.tagsInput}
                    onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                    placeholder="cache, redis, infra"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isPinnedCheck"
                    checked={formData.isPinned}
                    onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-cyan-600 focus:ring-0"
                  />
                  <label htmlFor="isPinnedCheck" className="text-zinc-200 cursor-pointer font-sans text-xs select-none">
                    Fixar no topo do cofre
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Salvar no Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
