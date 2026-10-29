'use client'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react'
import { cloneSeed, loadState, saveState } from '../../types/store'
import {
  Activity, AlertTriangle, BarChart3, Bell, Box, ChevronDown, ChevronLeft, ChevronRight,
  CircleDollarSign, ClipboardList, Clock3, Home, LayoutDashboard, Menu, Moon, MoreHorizontal,
  Package, PanelRightClose, Plus, Search, Settings, ShoppingBag, ShoppingCart, Sun, Tag,
  TrendingUp, Truck, Users, X, Zap, Edit, Trash2, Image as ImageIcon, MessageCircle, Eye,
} from 'lucide-react'

const nav = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'products', label: 'المنتجات', icon: ShoppingBag },
  { id: 'categories', label: 'الأقسام', icon: Tag },
  { id: 'inventory', label: 'المخزون', icon: Box },
  { id: 'orders', label: 'الطلبات', icon: ShoppingCart },
  { id: 'customers', label: 'العملاء', icon: Users },
  { id: 'coupons', label: 'الكوبونات', icon: Tag },
  { id: 'activity', label: 'سجل النشاطات', icon: Activity },
  { id: 'settings', label: 'إعدادات المتجر', icon: Settings },
]

const products = [
  { id: 1, name: 'حقيبة جلدية كلاسيكية', sku: 'BG-1042', category: 'شنط يد', price: 280, stock: 42, sales: 186, status: 'منشور', color: 'navy' },
  { id: 2, name: 'حقيبة كروس عصرية', sku: 'BG-1038', category: 'شنط كروس', price: 195, stock: 18, sales: 142, status: 'منشور', color: 'rose' },
  { id: 3, name: 'حقيبة ظهر عملية', sku: 'BG-1029', category: 'شنط ظهر', price: 240, stock: 7, sales: 98, status: 'منشور', color: 'sand' },
  { id: 4, name: 'حقيبة سفر فاخرة', sku: 'BG-1017', category: 'شنط سفر', price: 420, stock: 0, sales: 76, status: 'مخفي', color: 'brown' },
  { id: 5, name: 'حقيبة لابتوب ذكية', sku: 'BG-1004', category: 'شنط لابتوب', price: 310, stock: 24, sales: 64, status: 'منشور', color: 'slate' },
]
const orders = [
  { id: '#10482', customer: 'سارة أحمد', product: 'حقيبة جلدية كلاسيكية', total: 280, date: 'اليوم، 10:42 ص', status: 'تم التوصيل' },
  { id: '#10481', customer: 'محمد خالد', product: 'حقيبة ظهر عملية', total: 240, date: 'اليوم، 09:18 ص', status: 'جاري الشحن' },
  { id: '#10480', customer: 'نور علي', product: 'حقيبة كروس عصرية', total: 195, date: 'أمس، 08:55 م', status: 'قيد المراجعة' },
  { id: '#10479', customer: 'عمر حسن', product: 'حقيبة لابتوب ذكية', total: 310, date: 'أمس، 05:20 م', status: 'تم التأكيد' },
]

function Status({ children }: { children: string }) {
  const tone = children === 'تم التوصيل' || children === 'منشور' ? 'success' : children === 'نفد' || children === 'مخفي' ? 'danger' : 'warning'
  return <span className={`status status-${tone}`}><i />{children}</span>
}

function StatCard({ icon: Icon, label, value, trend, accent }: { icon: typeof Zap, label: string, value: string, trend: string, accent: string }) {
  return <div className="stat-card">
    <div className={`stat-icon ${accent}`}><Icon size={19} /></div>
    <div className="stat-copy"><span>{label}</span><strong>{value}</strong><small className="trend"><TrendingUp size={13} /> {trend} <em>من الشهر الماضي</em></small></div>
  </div>
}

const egp = (n: number) => `${Math.round(n || 0).toLocaleString('ar-EG')} ج.م`
const tsOf = (o: any): Date | null => (o?.createdAt?.toDate ? o.createdAt.toDate() : null)

function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [ready, setReady] = useState({ p: false, o: false, c: false });
  const loading = !(ready.p && ready.o && ready.c);

  useEffect(() => {
    const sub = (name: string, set: (d: any[]) => void, key: 'p' | 'o' | 'c') =>
      onSnapshot(query(collection(db, name)), (s) => {
        set(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setReady(r => ({ ...r, [key]: true }));
      }, () => setReady(r => ({ ...r, [key]: true })));
    const u = [sub('products', setProducts, 'p'), sub('orders', setOrders, 'o'), sub('customers', setCustomers, 'c')];
    return () => u.forEach(f => f());
  }, []);

  const d = useMemo(() => {
    const valid = orders.filter(o => o.status !== 'ملغي');
    const revenue = valid.reduce((t, o) => t + (Number(o.totalPrice) || 0), 0);
    const newOrders = orders.filter(o => (o.status || 'جديد') === 'جديد');
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const today = orders.filter(o => (tsOf(o)?.getTime() || 0) >= startToday.getTime());
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startToday); day.setDate(day.getDate() - (6 - i));
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const list = valid.filter(o => { const t = tsOf(o)?.getTime() || 0; return t >= day.getTime() && t < next.getTime(); });
      return { label: day.toLocaleDateString('ar-EG', { weekday: 'short' }), total: list.reduce((t, o) => t + (Number(o.totalPrice) || 0), 0), count: list.length };
    });
    const maxDay = Math.max(...days.map(x => x.total), 1);
    const byStatus: Record<string, number> = {};
    orders.forEach(o => { const s = o.status || 'جديد'; byStatus[s] = (byStatus[s] || 0) + 1; });
    const top: Record<string, number> = {};
    valid.forEach(o => { if (o.productName) top[o.productName] = (top[o.productName] || 0) + (Number(o.quantity) || 1); });
    const topProducts = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const out = products.filter(p => Number(p.stock) === 0);
    const low = products.filter(p => Number(p.stock) > 0 && Number(p.stock) < 10);
    const stockValue = products.reduce((t, p) => t + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);
    return { revenue, newOrders, today, days, maxDay, byStatus, topProducts, out, low, stockValue, avg: valid.length ? revenue / valid.length : 0, recent: [...orders].sort((a, b) => (tsOf(b)?.getTime() || 0) - (tsOf(a)?.getTime() || 0)).slice(0, 6) };
  }, [orders, products]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور';
  const v = (x: string | number) => (loading ? '...' : String(x));
  const statusTone: Record<string, string> = { 'جديد': 'gold', 'ملغي': 'rose' };

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greet}، حسن</h1>
          <p className="subtle">{loading ? 'جاري تحميل بيانات المتجر...' : d.newOrders.length ? `عندك ${d.newOrders.length} طلب جديد محتاج مراجعة.` : 'مفيش طلبات جديدة دلوقتي.'}</p>
        </div>
        <div className="dx-actions">
          <button className="secondary-button" onClick={() => setPage('orders')}><ClipboardList size={16} /> الطلبات</button>
          <button className="primary-button" onClick={() => setPage('add-product')}><Plus size={17} /> منتج جديد</button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={CircleDollarSign} label="إجمالي المبيعات" value={v(egp(d.revenue))} trend={`متوسط الطلب ${egp(d.avg)}`} accent="purple" />
        <StatCard icon={ShoppingCart} label="طلبات اليوم" value={v(d.today.length)} trend={`الإجمالي ${orders.length} طلب`} accent="blue" />
        <StatCard icon={Users} label="العملاء" value={v(customers.length)} trend="عملاء مسجلين" accent="green" />
        <StatCard icon={Package} label="المنتجات" value={v(products.length)} trend={`قيمة المخزون ${egp(d.stockValue)}`} accent="gold" />
      </div>

      <div className="main-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>مبيعات آخر 7 أيام</h2><p>بدون الطلبات الملغية</p></div><b className="dx-total">{egp(d.days.reduce((t, x) => t + x.total, 0))}</b></div>
          <div className="dx-bars">
            {d.days.map((x, i) => (
              <div className="dx-bar" key={i} title={`${x.count} طلب`}>
                <span className="dx-val">{x.total ? Math.round(x.total).toLocaleString('ar-EG') : ''}</span>
                <i style={{ height: `${Math.max((x.total / d.maxDay) * 100, 4)}%` }} />
                <em>{x.label}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><h2>حالات الطلبات</h2><p>توزيع كل الطلبات</p></div></div>
          <div className="dx-status">
            {orders.length === 0 && <p className="muted">مفيش طلبات لسه.</p>}
            {Object.entries(d.byStatus).map(([s, n]) => (
              <div key={s}><div className="dx-row"><span>{s}</span><b>{n}</b></div><div className="mini-bar wide"><i style={{ width: `${(n / orders.length) * 100}%` }} /></div></div>
            ))}
          </div>
        </section>
      </div>

      <div className="main-grid lower-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>آخر الطلبات</h2><p>أحدث 6 طلبات وصلت</p></div><button className="text-button" onClick={() => setPage('orders')}>عرض الكل <ChevronLeft size={15} /></button></div>
          <div className="table-scroll"><table className="dx-table"><thead><tr><th>العميل</th><th>المنتج</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>
            {d.recent.length === 0 && <tr><td colSpan={4} className="muted">لا توجد طلبات حتى الآن.</td></tr>}
            {d.recent.map(o => <tr key={o.id}><td><strong>{o.customerName}</strong><div className="muted">{tsOf(o)?.toLocaleDateString('ar-EG') || ''}</div></td><td>{o.productName}{o.quantity > 1 ? ` ×${o.quantity}` : ''}</td><td><strong>{egp(o.totalPrice)}</strong></td><td><Status>{o.status || 'جديد'}</Status></td></tr>)}
          </tbody></table></div>
        </section>

        <div className="dx-stack">
          <section className="panel">
            <div className="panel-heading"><div><h2>تنبيهات المخزون</h2><p>{d.out.length} نفذت · {d.low.length} قاربت على النفاد</p></div><button className="text-button" onClick={() => setPage('inventory')}>المخزون <ChevronLeft size={15} /></button></div>
            <div className="stock-list">
              {!loading && d.out.length + d.low.length === 0 && <p className="muted">المخزون ممتاز، مفيش نواقص.</p>}
              {[...d.out, ...d.low].slice(0, 5).map(p => (
                <div className="stock-row" key={p.id}><div className="product-thumb small rose"><AlertTriangle size={16} /></div><div><strong>{p.name}</strong><span>{Number(p.stock) === 0 ? 'نفذت الكمية' : <>متبقي <b>{p.stock}</b> قطع</>}</span></div><Status>{Number(p.stock) === 0 ? 'نفذ' : 'منخفض'}</Status></div>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading"><div><h2>الأكثر مبيعاً</h2><p>حسب الكمية المطلوبة</p></div></div>
            <div className="stock-list">
              {d.topProducts.length === 0 && <p className="muted">هتظهر هنا بعد أول الطلبات.</p>}
              {d.topProducts.map(([name, qty], i) => <div className="stock-row" key={name}><div className="product-thumb small navy">{i + 1}</div><div><strong>{name}</strong></div><b>{qty} قطعة</b></div>)}
            </div>
          </section>
        </div>
      </div>

      <div className="dx-quick">
        {[['categories', Tag, 'الأقسام'], ['coupons', Tag, 'الكوبونات'], ['customers', Users, 'العملاء'], ['settings', Settings, 'إعدادات المتجر'], ['activity', Activity, 'سجل النشاطات']].map(([id, Icon, label]: any) => (
          <button key={id} className="secondary-button" onClick={() => setPage(id)}><Icon size={16} /> {label}</button>
        ))}
      </div>
    </div>
  );
}

function OrderTable({ compact = false }: { compact?: boolean }) { return <div className="table-scroll"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>المنتج</th><th>الإجمالي</th><th>التاريخ</th><th>الحالة</th><th /></tr></thead><tbody>{orders.concat(orders).slice(0, compact ? 4 : 8).map((o, i) => <tr key={`${o.id}-${i}`}><td><strong>{o.id}</strong></td><td><div className="customer"><span>{o.customer.charAt(0)}</span>{o.customer}</div></td><td>{o.product}</td><td><strong>{o.total}</strong></td><td className="muted">{o.date}</td><td><Status>{o.status}</Status></td><td><button className="icon-button"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div> }

function Products({ setPage, toast }: { setPage: (p: string) => void, toast: (m: string) => void }) {
  const [querySearch, setQuerySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // فلتر الأقسام
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]); // قائمة الأقسام
  const [loading, setLoading] = useState(true);

  // 1. جلب المنتجات من فايربيز
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRealProducts(productsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب الأقسام عشان نحطها في الفلتر
  useEffect(() => {
    const qCat = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      setCategoriesList(snapshot.docs.map(doc => doc.data().name));
    });
    return () => unsubscribeCat();
  }, []);

  // 3. تطبيق الفلتر (بحث بالاسم + القسم مع بعض)
  const filtered = realProducts.filter(p => {
    const matchSearch = (p.name && p.name.includes(querySearch)) || (p.sku && p.sku.includes(querySearch));
    const matchCat = selectedCategory === '' ? true : p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">إدارة الكتالوج</p>
          <h1>المنتجات</h1>
          <p className="subtle">إدارة منتجات متجرك وأسعارها ومخزونها.</p>
        </div>
        <button className="primary-button" onClick={() => setPage('add-product')}>
          <Plus size={17} /> إضافة منتج
        </button>
      </div>

      <section className="panel products-panel">
        <div className="toolbar">
          <div className="search-field">
            <Search size={17} />
            <input placeholder="ابحث باسم المنتج أو SKU..." value={querySearch} onChange={e => setQuerySearch(e.target.value)} />
          </div>

          {/* القائمة المنسدلة لفلتر الأقسام */}
          <select
            className="filter-button"
            style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">كل الأقسام</option>
            {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>SKU</th>
                <th>القسم</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>جاري تحميل المنتجات...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>لا توجد منتجات حالياً.</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb small navy">
                          <ShoppingBag size={16} />
                        </div>
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td className="muted">{p.sku}</td>
                    <td>{p.category}</td>
                    <td><strong>${p.price}</strong></td>
                    <td><span className={p.stock < 10 ? 'low-stock' : ''}>{p.stock}</span></td>
                    <td><Status>{p.status || 'منشور'}</Status></td>
                    <td>
                      <button className="icon-button" onClick={() => toast('سيتم إضافة خيارات التعديل قريباً')}>
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function GenericPage({ id, setPage }: { id: string, setPage: (p: string) => void }) { const info: Record<string, [string, string, typeof Box]> = { inventory: ['المخزون', 'تابع مستويات المخزون وحركات المنتجات بسهولة.', Box], orders: ['الطلبات', 'تابع طلبات العملاء وحدّث حالتها من مكان واحد.', ClipboardList], customers: ['العملاء', 'تعرف على عملائك وسجل مشترياتهم.', Users], coupons: ['الخصومات والكوبونات', 'أنشئ عروضًا وكوبونات تزيد من مبيعاتك.', Tag], reports: ['التقارير والإحصائيات', 'حلل أداء متجرك واتخذ قرارات أفضل.', BarChart3], activity: ['سجل النشاطات', 'كل ما يحدث في متجرك موثق هنا.', Activity], settings: ['إعدادات المتجر', 'تحكم في إعدادات متجرك العامة.', Settings] }; const [title, desc, Icon] = info[id] || info.inventory; return <div className="page-content"><div className="page-title"><div><p className="eyebrow">لوحة التحكم</p><h1>{title}</h1><p className="subtle">{desc}</p></div>{id === 'orders' && <button className="primary-button"><Plus size={17} /> طلب جديد</button>}</div><section className="panel placeholder-panel"><div className="placeholder-icon"><Icon size={28} /></div><h2>{title}</h2><p>هذه الصفحة جاهزة لإدارة بياناتك. ابدأ بإضافة أول عنصر أو استعرض البيانات الموجودة.</p>{id !== 'reports' && id !== 'activity' && <button className="primary-button" onClick={() => setPage(id === 'inventory' ? 'products' : id)}><Plus size={17} /> إضافة جديد</button>}</section>{id === 'orders' && <section className="panel"><OrderTable /></section>}</div> }
function Categories({ toast }: { toast: (m: string) => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  // جلب الأقسام من فايربيز
  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // إضافة قسم جديد
  const handleAdd = async () => {
    if (!newCategory) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'categories'), { name: newCategory, createdAt: serverTimestamp() });
      setNewCategory('');
      toast('تم إضافة القسم بنجاح');
    } catch (e) {
      toast('حدث خطأ أثناء الإضافة');
    }
    setLoading(false);
  };

  // حذف قسم
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
      await deleteDoc(doc(db, 'categories', id));
      toast('تم حذف القسم');
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">إدارة المتجر</p>
          <h1>الأقسام</h1>
          <p className="subtle">أضف أو احذف أقسام الشنط لتنظيم متجرك.</p>
        </div>
      </div>
      <section className="panel form-panel">
        <h2>إضافة قسم جديد</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="مثال: شنط لابتوب..."
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: 'transparent' }}
          />
          <button className="primary-button" onClick={handleAdd} disabled={loading}>
            {loading ? 'جاري...' : 'إضافة القسم'}
          </button>
        </div>

        <h2>الأقسام الحالية</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th>اسم القسم</th><th>إجراء</th></tr></thead>
            <tbody>
              {categories.length === 0 ? <tr><td colSpan={2} style={{ textAlign: 'center', padding: '15px' }}>لا توجد أقسام حالياً.</td></tr> : null}
              {categories.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>
                    <button className="icon-button" onClick={() => handleDelete(c.id)}>
                      <X size={18} color="red" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function AddProduct({ toast }: { toast: (m: string) => void }) {
  // جلب الأقسام
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  useEffect(() => {
    const qCat = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      setCategoriesList(snapshot.docs.map(doc => doc.data().name));
    });
    return () => unsubscribeCat();
  }, []);

  // متغيرات البيانات الأساسية
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');

  // المتغيرات (الصور، الألوان، المقاسات)
  const [imageUrl, setImageUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState('');
  const [colors, setColors] = useState('');
  const [sizes, setSizes] = useState('');

  // --- المتغيرات الجديدة للمواصفات (اختيارية) ---
  const [specYarn, setSpecYarn] = useState(''); // نوع الخيط (صوف، قطن، كليم، مكرمية)
  const [specCategory, setSpecCategory] = useState(''); // الفئة/الموسم (شتوي، صيفي، أطفال)
  const [specTime, setSpecTime] = useState(''); // مدة التنفيذ (جاهز، أو بياخد من 3 لـ 5 أيام)
  const [specDimensions, setSpecDimensions] = useState(''); // الأبعاد (لو بتعمل شنطة أو مفرش)
  const [specCare, setSpecCare] = useState(''); // العناية (غسيل يدوي، ماء بارد)
  const [loading, setLoading] = useState(false);

  // دالة الإرسال
  const handleSaveProduct = async () => {
    if (!name || !price || !category) {
      toast('يرجى كتابة اسم المنتج، السعر، واختيار القسم أولاً');
      return;
    }

    setLoading(true);
    try {
      const galleryArray = galleryUrls
        ? galleryUrls.split(',').map(link => link.trim()).filter(link => link !== '')
        : [];

      const colorsArray = colors.split(',').map(c => c.trim()).filter(Boolean);
      const sizesArray = sizes.split(',').map(s => s.trim()).filter(Boolean);

      // تجميع المواصفات الاختيارية في كائن واحد شامل
      const specs = {
        yarn: specYarn.trim(),
        category: specCategory.trim(),
        time: specTime.trim(),
        dimensions: specDimensions.trim(),
        care: specCare.trim()
      };



      toast('جاري حفظ البيانات...');
      await addDoc(collection(db, 'products'), {
        name,
        sku,
        category,
        price: Number(price),
        oldPrice: Number(oldPrice),
        stock: Number(stock),
        description,
        shortDescription: shortDescription.trim(),
        imageUrl: imageUrl,
        gallery: galleryArray,
        colors: colorsArray,
        sizes: sizesArray,
        specs: specs, // <--- المواصفات الكاملة والنظيفة
        status: 'منشور',
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'activity_logs'), {
        type: 'add',
        message: `تم إضافة منتج جديد: ${name}`,
        createdAt: serverTimestamp()
      });

      toast('تم إضافة المنتج بنجاح!');

      // تفريغ كل الحقول
      setName(''); setSku(''); setCategory(''); setPrice(''); setOldPrice(''); setStock('');
      setDescription(''); setShortDescription(''); setColors(''); setSizes(''); setImageUrl(''); setGalleryUrls('');
      setSpecYarn(''); setSpecCategory(''); setSpecTime(''); setSpecDimensions(''); setSpecCare('');

    } catch (error) {
      console.error(error);
      toast('حدث خطأ أثناء الحفظ، تأكد من اتصالك');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">المنتجات / جديد</p>
          <h1>إضافة منتج</h1>
          <p className="subtle">أضف تفاصيل الشنطة وصورها ومواصفاتها لتظهر في متجرك.</p>
        </div>
      </div>
      <div className="form-grid">
        <section className="panel form-panel">
          <h2>معلومات المنتج الأساسية</h2>
          <div className="field-grid">
            <label>اسم الشنطة<input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حقيبة كروس جلد" /></label>
            <label>كود المنتج (SKU)<input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="BG-0000" /></label>
            <label>القسم
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">اختر القسم</option>
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
          </div>
          <label>الوصف القصير (يظهر على كارت المنتج)<textarea maxLength={140} rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="جملة واحدة جذابة عن أهم ميزة في المنتج..." /><small className="muted">{shortDescription.length}/140 حرف</small></label>
          <label>الوصف التفصيلي (يظهر في صفحة المنتج)<textarea className="tall" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الخامات، المقاسات، الألوان، طريقة الاستخدام والعناية..." /></label>
        </section>

        <section className="panel form-panel">
          <h2>الصور والمتغيرات</h2>
          <div className="field-grid">
            <label style={{ gridColumn: '1 / -1' }}>رابط الصورة الأساسية (Main Image URL)
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="مثال: https://i.ibb.co/bag.jpg" style={{ padding: '10px', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%' }} dir="ltr" />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>روابط الصور الإضافية (افصل بينها بفاصلة ,)
              <textarea value={galleryUrls} onChange={(e) => setGalleryUrls(e.target.value)} placeholder="Link 1, Link 2..." style={{ padding: '10px', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', minHeight: '80px' }} dir="ltr" />
            </label>
            <label>الألوان المتاحة<input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="أسود, بني" /></label>
            <label>المقاسات المتاحة<input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="كبير, وسط" /></label>
          </div>

          {/* --- قسم المواصفات الجديد --- */}
          <h2 style={{ marginTop: '30px', color: '#8b7355' }}>مواصفات الكروشيه (اختياري)</h2>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '15px' }}>اترك الحقل فارغاً ولن يظهر للعميل.</p>
          <div className="field-grid">
            <label>نوع الخيط<input value={specYarn} onChange={(e) => setSpecYarn(e.target.value)} placeholder="مثال: خيط صوف تركي، قطن مصري 100%" /></label>
            <label>الفئة والموسم<input value={specCategory} onChange={(e) => setSpecCategory(e.target.value)} placeholder="مثال: ملابس شتوي، أطفال" /></label>
            <label>مدة التنفيذ<input value={specTime} onChange={(e) => setSpecTime(e.target.value)} placeholder="مثال: جاهز للتسليم، أو يحتاج 3 أيام عمل" /></label>
            <label>الأبعاد (للشنط والمفارش)<input value={specDimensions} onChange={(e) => setSpecDimensions(e.target.value)} placeholder="مثال: 20x30 سم (اتركه فارغاً للملابس)" /></label>
            <label>تعليمات الغسيل والعناية<input value={specCare} onChange={(e) => setSpecCare(e.target.value)} placeholder="مثال: غسيل يدوي بماء بارد حتى لا يوبر" /></label>
          </div>
          <h2 style={{ marginTop: '30px' }}>الأسعار والمخزون</h2>
          <div className="field-grid">
            <label>السعر الحالي<input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ 0.00" /></label>
            <label>السعر القديم<input type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="$ 0.00" /></label>
            <label>الكمية المتاحة<input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" /></label>
          </div>

          <button className="primary-button full-button" onClick={handleSaveProduct} disabled={loading} style={{ marginTop: '20px', fontSize: '16px', padding: '15px' }}>
            {loading ? 'جاري الحفظ والرفع...' : 'حفظ ونشر المنتج'}
          </button>
        </section>
      </div>
    </div>
  );
}


function Inventory({ toast }: { toast: (m: string) => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const qCat = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      setCategoriesList(snapshot.docs.map(doc => doc.data().name));
    });
    return () => unsubscribeCat();
  }, []);

  const handleDelete = async (id: string, productName: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        await addDoc(collection(db, 'activity_logs'), {
          type: 'delete',
          message: `تم حذف المنتج: ${productName}`,
          createdAt: serverTimestamp()
        });
        toast('تم حذف المنتج بنجاح');
      } catch (error) {
        toast('حدث خطأ أثناء الحذف');
      }
    }
  };

  const handleUpdate = async () => {
    try {
      const productRef = doc(db, 'products', editingProduct.id);

      const colorsArray = typeof editingProduct.colors === 'string'
        ? editingProduct.colors.split(',').map((c: string) => c.trim()).filter(Boolean)
        : editingProduct.colors;

      const sizesArray = typeof editingProduct.sizes === 'string'
        ? editingProduct.sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
        : editingProduct.sizes;

      const galleryArray = typeof editingProduct.gallery === 'string'
        ? editingProduct.gallery.split(',').map((l: string) => l.trim()).filter(Boolean)
        : editingProduct.gallery || [];

      const updatedSpecs = {
        yarn: (editingProduct.specs?.yarn || '').trim(),
        category: (editingProduct.specs?.category || '').trim(),
        time: (editingProduct.specs?.time || '').trim(),
        dimensions: (editingProduct.specs?.dimensions || '').trim(),
        care: (editingProduct.specs?.care || '').trim()
      };



      await updateDoc(productRef, {
        name: editingProduct.name,
        description: editingProduct.description || '',
        shortDescription: (editingProduct.shortDescription || '').trim(),
        price: Number(editingProduct.price),
        stock: Number(editingProduct.stock),
        category: editingProduct.category,
        colors: colorsArray,
        sizes: sizesArray,
        imageUrl: editingProduct.imageUrl || '',
        gallery: galleryArray,
        specs: updatedSpecs // <--- إضافة المواصفات للتحديث هنا
      });

      await addDoc(collection(db, 'activity_logs'), {
        type: 'update',
        message: `تم تعديل بيانات المنتج: ${editingProduct.name}`,
        createdAt: serverTimestamp()
      });

      toast('تم تحديث المنتج بنجاح!');
      setEditingProduct(null);
    } catch (error) {
      toast('حدث خطأ أثناء التحديث');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = (p.name && p.name.includes(searchQuery)) || (p.sku && p.sku.includes(searchQuery));
    const matchCat = selectedCategory === '' ? true : p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">إدارة المتجر</p>
          <h1>المخزون الشامل</h1>
          <p className="subtle">تابع كميات المنتجات، عدل الأسعار، وتحكم في كل التفاصيل.</p>
        </div>
      </div>

      <section className="panel">
        <div className="toolbar" style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="search-field" style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 10px' }}>
            <Search size={17} style={{ color: 'var(--muted)' }} />
            <input
              placeholder="ابحث باسم المنتج أو SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '10px', width: '100%', outline: 'none', color: 'var(--text-color)' }}
            />
          </div>

          <select
            className="filter-button"
            style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">كل الأقسام</option>
            {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>صورة</th>
                <th>اسم المنتج / SKU</th>
                <th>القسم</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>المتغيرات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>جاري التحميل...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>لا توجد منتجات مطابقة للبحث.</td></tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id}>
                    <td>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={20} color="#999" />
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{p.name}</strong><br />
                      <small className="muted">{p.sku}</small>
                    </td>
                    <td>{p.category}</td>
                    <td>
                      <span className={p.stock < 10 ? 'status status-danger' : 'status status-success'}>
                        <i /> {p.stock} قطعة
                      </span>
                    </td>
                    <td><strong>${p.price}</strong></td>
                    <td>
                      <small style={{ display: 'block' }}>الألوان: {p.colors?.length > 0 ? p.colors.join('، ') : 'لا يوجد'}</small>
                      <small style={{ display: 'block' }}>المقاسات: {p.sizes?.length > 0 ? p.sizes.join('، ') : 'لا يوجد'}</small>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="icon-button" onClick={() => setEditingProduct({
                          ...p,
                          colors: p.colors ? p.colors.join(', ') : '',
                          sizes: p.sizes ? p.sizes.join(', ') : '',
                          gallery: p.gallery && Array.isArray(p.gallery) ? p.gallery.join(', ') : '',
                          specs: p.specs || {} // تجهيز المواصفات للتعديل
                        })} title="تعديل">
                          <Edit size={18} />
                        </button>
                        <button className="icon-button" onClick={() => handleDelete(p.id, p.name)} title="حذف">
                          <Trash2 size={18} color="red" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* نافذة التعديل المنبثقة (Modal) */}
      {editingProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '90%', maxWidth: '600px', backgroundColor: '#ffffff', color: '#222', padding: '25px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#111' }}>تعديل المنتج</h2>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '5px' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>

              <div style={{ display: 'flex', gap: '15px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px', flex: 1 }}>
                  اسم المنتج
                  <input style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '15px' }} value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px', flex: 1 }}>
                  القسم
                  <select style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '15px' }} value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}>
                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                الوصف القصير (يظهر على كارت المنتج)
                <textarea
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '15px', minHeight: '56px', fontFamily: 'inherit' }}
                  maxLength={140}
                  value={editingProduct.shortDescription || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, shortDescription: e.target.value })}
                  placeholder="جملة واحدة جذابة (حتى 140 حرف)"
                />
                <small style={{ color: '#888', fontWeight: 'normal' }}>{(editingProduct.shortDescription || '').length}/140 حرف</small>
              </label>
              {/* خانة الوصف التفصيلي */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                الوصف التفصيلي (يظهر في صفحة المنتج)
                <textarea
                  style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '15px', minHeight: '80px', fontFamily: 'inherit' }}
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="اكتب تفاصيل المنتج هنا..."
                />
              </label>

              <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', color: '#8b7355' }}>
                  رابط الصورة الأساسية
                  <input dir="ltr" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} value={editingProduct.imageUrl || ''} onChange={e => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px', color: '#8b7355' }}>
                  روابط الصور الإضافية (افصل بفاصلة ,)
                  <textarea dir="ltr" rows={2} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} value={editingProduct.gallery || ''} onChange={e => setEditingProduct({ ...editingProduct, gallery: e.target.value })} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px', flex: 1 }}>
                  الكمية
                  <input type="number" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '15px' }} value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px', flex: 1 }}>
                  السعر
                  <input type="number" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '15px' }} value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                الألوان (افصل بفاصلة)
                <input style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '15px' }} value={editingProduct.colors} onChange={e => setEditingProduct({ ...editingProduct, colors: e.target.value })} />
              </label>

              {/* قسم تعديل المواصفات الجديد */}
              <div style={{ background: '#f8f6f0', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#8b7355', fontWeight: 'bold' }}>تعديل المواصفات (اختياري)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>نوع الخيط<input style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }} value={editingProduct.specs?.yarn || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, yarn: e.target.value } })} /></label>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>الفئة/الموسم<input style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }} value={editingProduct.specs?.category || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, category: e.target.value } })} /></label>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>مدة التنفيذ<input style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }} value={editingProduct.specs?.time || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, time: e.target.value } })} /></label>
                  <label style={{ fontSize: '13px', fontWeight: 'bold' }}>الأبعاد<input style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }} value={editingProduct.specs?.dimensions || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, dimensions: e.target.value } })} /></label>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', gridColumn: '1 / -1' }}>تعليمات الغسيل<input style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }} value={editingProduct.specs?.care || ''} onChange={e => setEditingProduct({ ...editingProduct, specs: { ...editingProduct.specs, care: e.target.value } })} /></label>
                </div>
              </div>

            </div>

            <button
              className="primary-button"
              style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'center', background: '#8b7355', color: '#fff', border: 'none', cursor: 'pointer' }}
              onClick={handleUpdate}
            >
              حفظ التعديلات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function Orders({ toast }: { toast: (m: string) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null); // للنافذة المنبثقة

  // جلب الطلبات من فايربيز (هنعمل جدول اسمه orders)
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // تحديث حالة الطلب
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      toast('تم تحديث حالة الطلب بنجاح');
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });
    } catch (error) {
      toast('حدث خطأ أثناء التحديث');
    }
  };

  // فتح محادثة واتساب
  const openWhatsApp = (phone: string) => {
    // تنسيق رقم الهاتف (بافتراض أرقام مصر +20)
    let formattedPhone = phone.startsWith('0') ? '2' + phone : phone;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">إدارة المبيعات</p>
          <h1>طلبات العملاء</h1>
          <p className="subtle">تابع الطلبات الجديدة، تواصل مع العملاء، وحدّث حالة الشحن.</p>
        </div>
      </div>

      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>المنتج</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>جاري تحميل الطلبات...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>لا توجد طلبات حتى الآن.</td></tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id}>
                    <td className="muted">{o.createdAt?.toDate ? new Date(o.createdAt.toDate()).toLocaleDateString('ar-EG') : 'جديد'}</td>
                    <td>
                      <strong>{o.customerName}</strong><br />
                      <small className="muted">{o.customerPhone}</small>
                    </td>
                    <td>
                      <strong>{o.productName}</strong>
                      <small style={{ display: 'block' }}>{o.color ? `لون: ${o.color}` : ''} {o.size ? `مقاس: ${o.size}` : ''}</small>
                    </td>
                    <td><strong>${o.totalPrice}</strong></td>
                    <td>
                      <select
                        value={o.status || 'جديد'}
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        style={{ padding: '5px', borderRadius: '5px', border: '1px solid #ddd' }}
                      >
                        <option value="جديد">🔵 جديد</option>
                        <option value="تم التأكيد">🟡 تم التأكيد</option>
                        <option value="جاري الشحن">🟠 جاري الشحن</option>
                        <option value="تم التوصيل">🟢 تم التوصيل</option>
                        <option value="ملغي">🔴 ملغي</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="icon-button" onClick={() => setSelectedOrder(o)} title="عرض التفاصيل">
                          <Eye size={18} />
                        </button>
                        <button className="icon-button" onClick={() => openWhatsApp(o.customerPhone)} title="مراسلة واتساب">
                          <MessageCircle size={18} color="#25D366" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* نافذة تفاصيل الطلب */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '90%', maxWidth: '500px', backgroundColor: '#fff', padding: '25px', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#111' }}>تفاصيل الطلب</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4f' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: '#333' }}>
              <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>بيانات العميل</h3>
                <p style={{ margin: '5px 0' }}><strong>الاسم:</strong> {selectedOrder.customerName}</p>
                <p style={{ margin: '5px 0' }}><strong>الهاتف:</strong> <span dir="ltr">{selectedOrder.customerPhone}</span></p>
                <p style={{ margin: '5px 0' }}><strong>العنوان بالتفصيل:</strong> {selectedOrder.address}</p>
              </div>

              <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>تفاصيل المنتج</h3>
                <p style={{ margin: '5px 0' }}><strong>المنتج:</strong> {selectedOrder.productName}</p>
                <p style={{ margin: '5px 0' }}><strong>الكمية:</strong> {selectedOrder.quantity || 1}</p>
                <p style={{ margin: '5px 0' }}><strong>اللون:</strong> {selectedOrder.color || 'لم يحدد'}</p>
                <p style={{ margin: '5px 0' }}><strong>المقاس:</strong> {selectedOrder.size || 'لم يحدد'}</p>
                <p style={{ margin: '5px 0', fontSize: '18px', color: 'var(--primary-color)' }}><strong>الإجمالي:</strong> ${selectedOrder.totalPrice}</p>
              </div>
            </div>

            <button
              className="primary-button"
              style={{ width: '100%', padding: '12px', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', backgroundColor: '#25D366' }}
              onClick={() => openWhatsApp(selectedOrder.customerPhone)}
            >
              <MessageCircle size={20} /> تواصل لتأكيد الطلب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function Customers({ toast }: { toast: (m: string) => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب بيانات العملاء من قاعدة البيانات
  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // دالة لفتح الواتساب مباشرة
  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    let formattedPhone = phone.startsWith('0') ? '2' + phone : phone;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">إدارة العملاء</p>
          <h1>قاعدة بيانات العملاء</h1>
          <p className="subtle">تتبع بيانات عملائك، وتواصل معهم لزيادة مبيعاتك.</p>
        </div>
      </div>

      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>اسم العميل</th>
                <th>رقم الهاتف</th>
                <th>إجمالي الطلبات</th>
                <th>إجمالي المدفوعات</th>
                <th>تاريخ الانضمام</th>
                <th>تواصل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>جاري تحميل بيانات العملاء...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>لا يوجد عملاء مسجلين حتى الآن.</td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{c.phone}</td>
                    <td>{c.totalOrders || 1} طلب</td>
                    <td><strong style={{ color: 'var(--primary-color)' }}>${c.totalSpent || 0}</strong></td>
                    <td className="muted">
                      {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleDateString('ar-EG') : 'جديد'}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={() => openWhatsApp(c.phone)}
                        title="مراسلة واتساب"
                      >
                        <MessageCircle size={18} color="#25D366" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function Coupons({ toast }: { toast: (m: string) => void }) {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(false);

  // جلب الكوبونات من قاعدة البيانات
  useEffect(() => {
    const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // إضافة كوبون جديد
  const handleAdd = async () => {
    if (!code || !discount) {
      toast('يرجى كتابة كود الخصم ونسبة الخصم');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'coupons'), {
        code: code.toUpperCase(), // بنحفظه حروف كابيتال عشان يكون شكله احترافي
        discount: Number(discount),
        active: true,
        createdAt: serverTimestamp()
      });
      setCode('');
      setDiscount('');
      toast('تم إضافة الكوبون بنجاح');
    } catch (error) {
      toast('حدث خطأ أثناء الإضافة');
    } finally {
      setLoading(false);
    }
  };

  // حذف كوبون
  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من إيقاف وحذف هذا الكوبون؟')) {
      await deleteDoc(doc(db, 'coupons', id));
      toast('تم حذف الكوبون بنجاح');
    }
  };

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">إدارة التسويق</p>
          <h1>الكوبونات والخصومات</h1>
          <p className="subtle">أنشئ أكواد خصم لعملائك لزيادة المبيعات والتحويلات.</p>
        </div>
      </div>

      <section className="panel form-panel">
        <h2>إضافة كوبون جديد</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="كود الخصم (مثال: EID20)"
            style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)' }}
          />
          <input
            type="number"
            value={discount}
            onChange={e => setDiscount(e.target.value)}
            placeholder="نسبة الخصم % (مثال: 15)"
            style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)' }}
          />
          <button className="primary-button" onClick={handleAdd} disabled={loading}>
            {loading ? 'جاري...' : 'إضافة الكوبون'}
          </button>
        </div>

        <h2>الكوبونات الفعالة</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>كود الخصم</th>
                <th>نسبة الخصم</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '15px' }}>لا توجد كوبونات حالياً.</td></tr> : null}
              {coupons.map(c => (
                <tr key={c.id}>
                  <td>
                    <strong style={{ background: 'var(--bg-color)', border: '1px dashed var(--border-color)', padding: '5px 10px', borderRadius: '4px', letterSpacing: '2px' }}>
                      {c.code}
                    </strong>
                  </td>
                  <td><strong style={{ color: 'var(--primary-color)' }}>{c.discount}%</strong></td>
                  <td><Status>{c.active ? 'منشور' : 'متوقف'}</Status></td>
                  <td>
                    <button className="icon-button" onClick={() => handleDelete(c.id)}>
                      <X size={18} color="red" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function ActivityLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // جلب النشاطات من الجدول المخصص لها
    const q = query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">مراقبة النظام</p>
          <h1>سجل النشاطات</h1>
          <p className="subtle">تابع كل التعديلات والحذف والإضافات في متجرك.</p>
        </div>
      </div>

      <section className="panel">
        {loading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>جاري تحميل السجل...</p>
        ) : logs.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>لا توجد نشاطات حتى الآن.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 20px' }}>
            {logs.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', gap: '15px', padding: '15px 0', borderBottom: index !== logs.length - 1 ? '1px solid var(--border-color)' : 'none' }}>

                {/* أيقونة الحركة بناءً على نوعها */}
                <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.type === 'delete' ? <Trash2 size={20} color="red" /> :
                    item.type === 'update' ? <Edit size={20} color="orange" /> :
                      <Activity size={20} color="var(--primary-color)" />}
                </div>

                {/* تفاصيل الحركة */}
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '15px', color: 'var(--text-color)' }}>
                    <strong>{item.message}</strong>
                  </p>
                  <small className="muted">
                    <Clock3 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '5px' }} />
                    {item.createdAt && typeof item.createdAt.toDate === 'function'
                      ? new Date(item.createdAt.toDate()).toLocaleString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'الآن'}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
function StoreSettings({ toast }: { toast: (m: string) => void }) {
  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // جلب الإعلانات من قاعدة البيانات
  useEffect(() => {
    const docRef = doc(db, 'settings', 'announcements');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setMessages(docSnap.data().messages || []);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // حفظ التعديلات في قاعدة البيانات
  const handleSave = async (updatedMessages: string[]) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'announcements'), { messages: updatedMessages });
      toast('تم تحديث شريط الإعلانات بنجاح');
    } catch (error) {
      toast('حدث خطأ أثناء الحفظ');
    }
    setSaving(false);
  };

  const addMessage = () => {
    if (!newMessage.trim()) return;
    const updated = [...messages, newMessage];
    setMessages(updated);
    setNewMessage('');
    handleSave(updated);
  };

  const removeMessage = (index: number) => {
    const updated = messages.filter((_, i) => i !== index);
    setMessages(updated);
    handleSave(updated);
  };

  return (
    <div className="page-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">إعدادات المتجر</p>
          <h1>شريط الإعلانات العُلوي</h1>
          <p className="subtle">أضف أو احذف الرسائل المتحركة التي تظهر للعملاء أعلى الموقع.</p>
        </div>
      </div>

      <section className="panel form-panel">
        <h2>إضافة إعلان جديد</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="مثال: 🚚 شحن مجاني للطلبات فوق 500 جنيه..."
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)' }}
          />
          <button className="primary-button" onClick={addMessage} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'إضافة'}
          </button>
        </div>

        <h2>الإعلانات الحالية</h2>
        {loading ? <p>جاري التحميل...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && <p className="muted" style={{ padding: '10px 0' }}>لا توجد إعلانات حالياً.</p>}
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong>{msg}</strong>
                <button className="icon-button" onClick={() => removeMessage(idx)} title="حذف الإعلان">
                  <X size={18} color="red" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
export default function Page() {
  const [page, setPage] = useState('dashboard'); const [mobileOpen, setMobileOpen] = useState(false); const [dark, setDark] = useState(false); const [toastMsg, setToastMsg] = useState(''); const [storeState, setStoreState] = useState(() => cloneSeed());
  useEffect(() => { const saved = loadState(); setStoreState(saved); setDark(window.localStorage.getItem('theme') === 'dark'); }, []);
  useEffect(() => { saveState(storeState); }, [storeState]);
  useEffect(() => { window.localStorage.setItem('theme', dark ? 'dark' : 'light'); }, [dark]); const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 2600) }; const current = nav.find(n => n.id === page)?.label || (page === 'add-product' ? 'إضافة منتج' : 'الرئيسية'); const go = (id: string) => { setPage(id); setMobileOpen(false) }; return (
    <div className={dark ? 'app-shell dark-mode' : 'app-shell'} dir="rtl">

      {/* القائمة الجانبية (Sidebar) */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ShoppingBag size={21} /></div>
          <div><strong>Rocraft</strong><small>لوحة تحكم المتجر</small></div>
        </div>
        <nav>
          <p className="nav-label">القائمة الرئيسية</p>
          {nav.slice(0, 1).map(n => (
            <button className={page === n.id ? 'nav-item active' : 'nav-item'} key={n.id} onClick={() => go(n.id)}>
              <n.icon size={18} /><span>{n.label}</span>
            </button>
          ))}

          <p className="nav-label">إدارة المتجر</p>
          {/* تم مسح رقم 12 الوهمي من قسم الطلبات هنا */}
          {nav.slice(1, 7).map(n => (
            <button className={page === n.id ? 'nav-item active' : 'nav-item'} key={n.id} onClick={() => go(n.id)}>
              <n.icon size={18} /><span>{n.label}</span>
            </button>
          ))}

          <p className="nav-label">النظام</p>
          {nav.slice(7).map(n => (
            <button className={page === n.id ? 'nav-item active' : 'nav-item'} key={n.id} onClick={() => go(n.id)}>
              <n.icon size={18} /><span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="theme-switch" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            <span>{dark ? 'الوضع النهاري' : 'الوضع الليلي'}</span><i />
          </button>
          {/* الجزء الخاص باسم المدير تحت في القائمة الجانبية (تقدر تغير الاسم من هنا بعدين) */}
          <div className="profile">
            <div className="avatar">ح</div>
            <div><strong>حسن</strong><span>مدير المتجر</span></div>
            <MoreHorizontal size={18} className="muted" />
          </div>
        </div>
      </aside>

      {/* مساحة العرض الرئيسية */}
      <div className="main-area">

        {/* الشريط العلوي (Header) */}
        <header>
          <button className="menu-button" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <div className="header-title">
            <span>لوحة التحكم</span><ChevronLeft size={14} /><strong>{current}</strong>
          </div>

          {/* تم مسح الإشعارات، والبحث، وحرف الـ (أ) من هنا بالكامل عشان ننظف الهيدر */}
          <div className="header-actions">
            {/* فاضي تماماً */}
          </div>
        </header>

        {/* عرض الصفحات */}
        {page === 'dashboard' && <Dashboard setPage={go} />}
        {page === 'products' && <Products setPage={go} toast={toast} />}
        {page === 'add-product' && <AddProduct toast={toast} />}
        {page === 'categories' && <Categories toast={toast} />}
        {page === 'inventory' && <Inventory toast={toast} />}
        {page === 'orders' && <Orders toast={toast} />}
        {page === 'customers' && <Customers toast={toast} />}
        {page === 'coupons' && <Coupons toast={toast} />}
        {page === 'activity' && <ActivityLog />}
        {page === 'settings' && <StoreSettings toast={toast} />}
        {!['dashboard', 'products', 'add-product', 'categories', 'inventory', 'orders', 'customers', 'coupons', 'activity', 'settings'].includes(page) && <GenericPage id={page} setPage={go} />}      </div>

      {/* نوافذ ورسائل التأكيد */}
      {mobileOpen && <div className="overlay" onClick={() => setMobileOpen(false)} />}
      {toastMsg && <div className="toast"><Zap size={17} /><span>{toastMsg}</span></div>}
    </div>
  );
}
