import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Package, Plus, Search, Truck, CheckCircle, XCircle,
  BookOpen, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { acquisitionsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type TabType = 'orders' | 'suggestions' | 'vendors';

const orderStatusStyles: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
  ORDERED: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  PARTIAL: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  RECEIVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  CANCELLED: { bg: 'bg-stone-800', text: 'text-stone-500', border: 'border-stone-700' },
};

const suggestionStatusStyles: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
  APPROVED: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  REJECTED: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' },
  ORDERED: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
};

export function AdminAcquisitionsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '', contact: '', address: '' });
  const [orderForm, setOrderForm] = useState({
    vendorId: '',
    notes: '',
    expectedDate: '',
    items: [{ title: '', author: '', isbn: '', price: 0, quantity: 1 }],
  });

  // Queries
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['acquisition-orders', search],
    queryFn: () => acquisitionsApi.getOrders({ q: search || undefined, limit: 100 }),
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['acquisition-vendors'],
    queryFn: () => acquisitionsApi.getVendors(),
  });

  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['acquisition-suggestions', search],
    queryFn: () => acquisitionsApi.getSuggestions({ q: search || undefined }),
  });

  const orders = ordersData?.data?.data ?? [];
  const vendors = vendorsData?.data?.data ?? [];
  const suggestions = suggestionsData?.data?.data ?? [];

  // Mutations
  const createVendorMutation = useMutation({
    mutationFn: (data: any) => acquisitionsApi.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisition-vendors'] });
      setShowVendorModal(false);
      setVendorForm({ name: '', email: '', phone: '', contact: '', address: '' });
      setPageSuccess('Proveedor creado');
    },
    onError: (e: any) => setPageError(e.message),
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: string) => acquisitionsApi.deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisition-vendors'] });
      setPageSuccess('Proveedor eliminado');
    },
    onError: (e: any) => setPageError(e.message),
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => acquisitionsApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisition-orders'] });
      setShowOrderModal(false);
      setOrderForm({ vendorId: '', notes: '', expectedDate: '', items: [{ title: '', author: '', isbn: '', price: 0, quantity: 1 }] });
      setPageSuccess('Orden creada');
    },
    onError: (e: any) => setPageError(e.message),
  });

  const receiveOrderMutation = useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId?: string }) =>
      acquisitionsApi.receiveOrder(orderId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisition-orders'] });
      setPageSuccess('Orden/items recibidos');
    },
    onError: (e: any) => setPageError(e.message),
  });

  const updateSuggestionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      acquisitionsApi.updateSuggestion(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acquisition-suggestions'] });
      setPageSuccess('Sugerencia actualizada');
    },
    onError: (e: any) => setPageError(e.message),
  });

  const tabs = [
    { id: 'orders' as TabType, label: 'Órdenes', icon: Package },
    { id: 'suggestions' as TabType, label: 'Sugerencias', icon: BookOpen },
    { id: 'vendors' as TabType, label: 'Proveedores', icon: Truck },
  ];

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl xl:text-5xl text-stone-100 tracking-tight">
          Adquisiciones
        </h1>
        <p className="text-stone-500 font-sans mt-2">
          Gestiona compras, proveedores y sugerencias
        </p>
      </div>

      {pageError && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-rose-500 text-sm font-sans">
          {pageError}
        </div>
      )}

      {pageSuccess && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-emerald-500 text-sm font-sans flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {pageSuccess}
        </div>
      )}

      <div className="flex gap-2 mb-6 border-b border-stone-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 font-sans text-sm transition-all border-b-2 -mb-px',
              activeTab === id
                ? 'text-amber-500 border-amber-500'
                : 'text-stone-500 border-transparent hover:text-stone-300'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                type="text"
                placeholder="Buscar órdenes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-11"
              />
            </div>
            <button
              onClick={() => setShowOrderModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Orden
            </button>
          </div>

          <div className="space-y-3">
            {ordersLoading ? (
              <p className="text-stone-500">Cargando...</p>
            ) : orders.length === 0 ? (
              <div className="card text-center py-12">
                <Package className="w-12 h-12 text-amber-500/20 mx-auto mb-4" />
                <p className="text-stone-500">No hay órdenes de compra</p>
              </div>
            ) : (
              orders.map((order: any) => (
                <div key={order.id} className="card">
                  <div
                    className="flex items-center justify-between cursor-pointer p-4"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-stone-100 font-sans font-medium">{order.orderNumber}</p>
                        <p className="text-stone-500 text-sm">{order.vendor?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-sans font-medium',
                        orderStatusStyles[order.status]?.bg,
                        orderStatusStyles[order.status]?.text,
                        orderStatusStyles[order.status]?.border,
                        'border'
                      )}>
                        {order.status}
                      </span>
                      <span className="font-display text-lg text-stone-100">${order.total.toFixed(2)}</span>
                      {expandedOrder === order.id ? (
                        <ChevronUp className="w-5 h-5 text-stone-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-stone-500" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedOrder === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-stone-800/50"
                      >
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-stone-500">Fecha de orden</p>
                              <p className="text-stone-100">{format(new Date(order.orderDate), 'PP', { locale: es })}</p>
                            </div>
                            {order.expectedDate && (
                              <div>
                                <p className="text-stone-500">Fecha esperada</p>
                                <p className="text-stone-100">{format(new Date(order.expectedDate), 'PP', { locale: es })}</p>
                              </div>
                            )}
                            {order.receivedDate && (
                              <div>
                                <p className="text-stone-500">Fecha de recepción</p>
                                <p className="text-emerald-500">{format(new Date(order.receivedDate), 'PP', { locale: es })}</p>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-stone-800/50 pt-4">
                            <p className="text-stone-500 text-sm mb-2">Items ({order.items?.length})</p>
                            <div className="space-y-2">
                              {order.items?.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between bg-stone-800/50 rounded-lg p-3">
                                  <div>
                                    <p className="text-stone-100 font-sans text-sm">{item.title}</p>
                                    <p className="text-stone-500 text-xs">{item.author || 'Autor desconocido'}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-stone-400 text-sm">
                                      {item.receivedQuantity}/{item.quantity} rec.
                                    </span>
                                    <span className="text-stone-100 font-mono text-sm">${item.price.toFixed(2)}</span>
                                    {order.status !== 'RECEIVED' && (
                                      <button
                                        onClick={() => receiveOrderMutation.mutate({ orderId: order.id, itemId: item.id })}
                                        className="text-emerald-500 hover:text-emerald-400 text-sm font-sans"
                                      >
                                        Recibir
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {order.notes && (
                            <div className="border-t border-stone-800/50 pt-4">
                              <p className="text-stone-500 text-sm">Notas: {order.notes}</p>
                            </div>
                          )}

                          {order.status !== 'RECEIVED' && (
                            <div className="border-t border-stone-800/50 pt-4 flex gap-3">
                              <button
                                onClick={() => receiveOrderMutation.mutate({ orderId: order.id })}
                                className="btn-primary text-sm"
                              >
                                Recibir todo
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                type="text"
                placeholder="Buscar sugerencias..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-11"
              />
            </div>
          </div>

          <div className="space-y-3">
            {suggestionsLoading ? (
              <p className="text-stone-500">Cargando...</p>
            ) : suggestions.length === 0 ? (
              <div className="card text-center py-12">
                <BookOpen className="w-12 h-12 text-amber-500/20 mx-auto mb-4" />
                <p className="text-stone-500">No hay sugerencias</p>
              </div>
            ) : (
              suggestions.map((suggestion: any) => (
                <div key={suggestion.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-stone-100 font-sans font-medium">{suggestion.title}</p>
                        <p className="text-stone-500 text-sm">{suggestion.author || 'Autor desconocido'}</p>
                        {suggestion.user && (
                          <p className="text-stone-600 text-xs mt-1">Por: {suggestion.user.name}</p>
                        )}
                        {suggestion.reason && (
                          <p className="text-stone-400 text-sm mt-2 italic">"{suggestion.reason}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-sans font-medium',
                        suggestionStatusStyles[suggestion.status]?.bg,
                        suggestionStatusStyles[suggestion.status]?.text,
                        suggestionStatusStyles[suggestion.status]?.border,
                        'border'
                      )}>
                        {suggestion.status}
                      </span>
                      {suggestion.status === 'PENDING' && (
                        <button
                          onClick={() => updateSuggestionMutation.mutate({ id: suggestion.id, status: 'APPROVED' })}
                          className="text-emerald-500 hover:text-emerald-400 text-sm font-sans"
                        >
                          Aprobar
                        </button>
                      )}
                      {suggestion.status === 'PENDING' && (
                        <button
                          onClick={() => updateSuggestionMutation.mutate({ id: suggestion.id, status: 'REJECTED' })}
                          className="text-rose-500 hover:text-rose-400 text-sm font-sans"
                        >
                          Rechazar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'vendors' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <input
                type="text"
                placeholder="Buscar proveedores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-11"
              />
            </div>
            <button
              onClick={() => setShowVendorModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.filter((v: any) => v.name.toLowerCase().includes(search.toLowerCase())).map((vendor: any) => (
              <div key={vendor.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-500" />
                  </div>
                  <button
                    onClick={() => deleteVendorMutation.mutate(vendor.id)}
                    className="text-stone-500 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-stone-100 font-sans font-medium">{vendor.name}</p>
                {vendor.contact && <p className="text-stone-500 text-sm">{vendor.contact}</p>}
                {vendor.email && <p className="text-stone-500 text-sm">{vendor.email}</p>}
                {vendor.phone && <p className="text-stone-500 text-sm">{vendor.phone}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      <AnimatePresence>
        {showVendorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVendorModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-2xl text-stone-100 mb-4">Nuevo Proveedor</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-stone-500 text-sm font-sans">Nombre</label>
                  <input
                    type="text"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-stone-500 text-sm font-sans">Email</label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-stone-500 text-sm font-sans">Teléfono</label>
                  <input
                    type="text"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-stone-500 text-sm font-sans">Contacto</label>
                  <input
                    type="text"
                    value={vendorForm.contact}
                    onChange={(e) => setVendorForm({ ...vendorForm, contact: e.target.value })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowVendorModal(false)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    onClick={() => createVendorMutation.mutate(vendorForm)}
                    className="btn-primary flex-1"
                  >
                    Crear
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-2xl text-stone-100 mb-4">Nueva Orden de Compra</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-stone-500 text-sm font-sans">Proveedor</label>
                  <select
                    value={orderForm.vendorId}
                    onChange={(e) => setOrderForm({ ...orderForm, vendorId: e.target.value })}
                    className="input-field w-full mt-1"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-stone-500 text-sm font-sans">Fecha esperada</label>
                  <input
                    type="date"
                    value={orderForm.expectedDate}
                    onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })}
                    className="input-field w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-stone-500 text-sm font-sans">Notas</label>
                  <textarea
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                    className="input-field w-full mt-1"
                    rows={2}
                  />
                </div>

                <div className="border-t border-stone-800 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-stone-500 text-sm font-sans">Items</label>
                    <button
                      onClick={() => setOrderForm({
                        ...orderForm,
                        items: [...orderForm.items, { title: '', author: '', isbn: '', price: 0, quantity: 1 }]
                      })}
                      className="text-amber-500 text-sm font-sans"
                    >
                      + Agregar item
                    </button>
                  </div>

                  {orderForm.items.map((item, index) => (
                    <div key={index} className="bg-stone-800/50 rounded-lg p-3 mb-2 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Título"
                          value={item.title}
                          onChange={(e) => {
                            const newItems = [...orderForm.items];
                            newItems[index].title = e.target.value;
                            setOrderForm({ ...orderForm, items: newItems });
                          }}
                          className="input-field flex-1"
                        />
                        <input
                          type="text"
                          placeholder="Autor"
                          value={item.author}
                          onChange={(e) => {
                            const newItems = [...orderForm.items];
                            newItems[index].author = e.target.value;
                            setOrderForm({ ...orderForm, items: newItems });
                          }}
                          className="input-field flex-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ISBN"
                          value={item.isbn}
                          onChange={(e) => {
                            const newItems = [...orderForm.items];
                            newItems[index].isbn = e.target.value;
                            setOrderForm({ ...orderForm, items: newItems });
                          }}
                          className="input-field w-32"
                        />
                        <input
                          type="number"
                          placeholder="Precio"
                          value={item.price}
                          onChange={(e) => {
                            const newItems = [...orderForm.items];
                            newItems[index].price = Number(e.target.value);
                            setOrderForm({ ...orderForm, items: newItems });
                          }}
                          className="input-field w-24"
                        />
                        <input
                          type="number"
                          placeholder="Cant"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...orderForm.items];
                            newItems[index].quantity = Number(e.target.value);
                            setOrderForm({ ...orderForm, items: newItems });
                          }}
                          className="input-field w-20"
                        />
                        {orderForm.items.length > 1 && (
                          <button
                            onClick={() => {
                              const newItems = orderForm.items.filter((_, i) => i !== index);
                              setOrderForm({ ...orderForm, items: newItems });
                            }}
                            className="text-rose-500 hover:text-rose-400 px-2"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-stone-800">
                  <button onClick={() => setShowOrderModal(false)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    onClick={() => createOrderMutation.mutate(orderForm)}
                    className="btn-primary flex-1"
                    disabled={!orderForm.vendorId || orderForm.items.length === 0}
                  >
                    Crear Orden
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}