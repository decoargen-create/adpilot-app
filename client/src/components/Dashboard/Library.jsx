import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useCurrency } from '../../context/CurrencyContext';
import {
  Search,
  Film,
  Image,
  Trash2,
  Eye,
  Edit,
  Grid3x3,
  List,
  Upload,
  Package,
  AlertCircle,
  X,
  ZoomIn,
  HardDrive
} from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatSize(bytes) {
  if (!bytes) return '0 MB';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
}

export default function Library() {
  const { currency } = useCurrency();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [productCreatives, setProductCreatives] = useState({});
  const [loadingCreatives, setLoadingCreatives] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await client.get('/products');
      setProducts(res.data || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreativesForProduct = async (productId) => {
    if (productCreatives[productId]) {
      return productCreatives[productId];
    }

    try {
      setLoadingCreatives(true);
      const res = await client.get(`/products/${productId}/creatives`);
      const creatives = res.data || [];
      setProductCreatives(prev => ({ ...prev, [productId]: creatives }));
      return creatives;
    } catch (e) {
      console.error('Error fetching creatives:', e);
      return [];
    } finally {
      setLoadingCreatives(false);
    }
  };

  const openGallery = async (product) => {
    setSelectedProduct(product);
    await fetchCreativesForProduct(product.id);
    setShowGallery(true);
  };

  const deleteProduct = async (productId) => {
    if (!confirm('¿Eliminar este producto y todos sus creativos?')) return;
    try {
      await client.delete(`/products/${productId}`);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (e) {
      console.error('Error deleting product:', e);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.ad_account_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalProducts: products.length,
    totalCreatives: products.reduce((sum, p) => sum + (p.creative_count || 0), 0),
    totalStorage: products.reduce((sum, p) => sum + (p.total_storage || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-200 dark:border-slate-600 border-t-violet-600 dark:border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
              Biblioteca de Creativos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Gestiona todos tus productos y creativos en un solo lugar
            </p>
          </div>

          {/* Stats Bar */}
          {stats.totalProducts > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-blue-200 dark:border-slate-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Productos</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{stats.totalProducts}</p>
                  </div>
                  <Package className="text-blue-400 dark:text-blue-300" size={28} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-purple-200 dark:border-slate-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Creativos Totales</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{stats.totalCreatives}</p>
                  </div>
                  <Image className="text-purple-400 dark:text-purple-300" size={28} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4 border border-orange-200 dark:border-slate-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 dark:text-orange-300 font-medium">Almacenamiento</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">{formatSize(stats.totalStorage)}</p>
                  </div>
                  <HardDrive className="text-orange-400 dark:text-orange-300" size={28} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Buscar productos o cuentas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-300 dark:border-slate-600">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
              title="Vista de grid"
            >
              <Grid3x3 size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
              title="Vista de lista"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && searchQuery === '' && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-slate-700 dark:to-slate-600 mb-6">
              <Upload className="text-violet-600 dark:text-violet-400" size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Biblioteca vacía</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
              Cuando crees productos y subas creativos, aparecerán aquí organizados de forma automática.
            </p>
          </div>
        )}

        {/* No Search Results */}
        {filteredProducts.length === 0 && searchQuery !== '' && (
          <div className="text-center py-16">
            <AlertCircle className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No se encontraron resultados</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No hay productos que coincidan con "{searchQuery}"
            </p>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product, idx) => (
              <div
                key={product.id}
                className="group animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="h-full bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 overflow-hidden group/thumb">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="text-gray-400 dark:text-gray-500" size={48} />
                      </div>
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <span className="text-white text-sm font-medium">{product.creative_count || 0} creativos</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                      {product.name}
                    </h3>

                    {product.ad_account_name && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {product.ad_account_name}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="inline-flex items-center space-x-1 bg-blue-50 dark:bg-slate-700 px-3 py-1 rounded-full">
                        <Image size={14} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {product.creative_count || 0}
                        </span>
                      </div>

                      {product.daily_budget && (
                        <div className="inline-flex items-center space-x-1 bg-green-50 dark:bg-slate-700 px-3 py-1 rounded-full">
                          <span className="text-xs font-bold text-green-700 dark:text-green-300">
                            {currency}{product.daily_budget.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meta Info */}
                    {product.meta_campaign_id && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">
                        Meta: {product.meta_campaign_id}
                      </p>
                    )}

                    {/* Last Creative Date */}
                    {product.last_creative_date && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Último: {formatDate(product.last_creative_date)}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                      <button
                        onClick={() => openGallery(product)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-600 dark:hover:to-indigo-600 text-white font-medium py-2 rounded-lg transition-all duration-200 transform hover:shadow-lg"
                      >
                        <Eye size={16} />
                        <span>Ver</span>
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center space-x-2 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium py-2 rounded-lg transition"
                      >
                        <Edit size={16} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && filteredProducts.length > 0 && (
          <div className="space-y-3">
            {filteredProducts.map((product, idx) => (
              <div
                key={product.id}
                className="animate-fade-in bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all duration-300 p-5"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 flex-shrink-0 overflow-hidden">
                      {product.thumbnail_url ? (
                        <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="text-gray-400 dark:text-gray-500" size={24} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{product.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{product.ad_account_name}</p>
                      {product.last_creative_date && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Último: {formatDate(product.last_creative_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Creativos</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{product.creative_count || 0}</p>
                    </div>

                    {product.daily_budget && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Presupuesto</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {currency}{product.daily_budget.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openGallery(product)}
                        className="p-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Ver creatives"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gallery Modal */}
      {showGallery && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProduct.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedProduct.ad_account_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowGallery(false);
                  setSelectedProduct(null);
                }}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {loadingCreatives ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-violet-200 dark:border-slate-600 border-t-violet-600 dark:border-t-violet-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando creativos...</p>
                  </div>
                </div>
              ) : productCreatives[selectedProduct.id]?.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">No hay creativos en este producto</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {productCreatives[selectedProduct.id]?.map((creative, idx) => (
                    <div
                      key={creative.id}
                      className="group relative rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 animate-fade-in"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      {/* Thumbnail Container */}
                      <div className="relative h-48 overflow-hidden">
                        {creative.file_type === 'video' ? (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <Film className="text-blue-400" size={48} />
                          </div>
                        ) : (
                          <img
                            src={creative.file_url || creative.preview_url}
                            alt={creative.file_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <ZoomIn className="text-white" size={32} />
                        </div>

                        {/* Type Badge */}
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center space-x-1">
                          {creative.file_type === 'video' ? (
                            <>
                              <Film size={12} />
                              <span>Vídeo</span>
                            </>
                          ) : (
                            <>
                              <Image size={12} />
                              <span>Imagen</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 bg-white dark:bg-slate-800">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={creative.file_name}>
                          {creative.file_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatSize(creative.file_size)}
                        </p>
                        {creative.upload_date && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDate(creative.upload_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
