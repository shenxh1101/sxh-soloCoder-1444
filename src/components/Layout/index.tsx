import { NavLink, Outlet } from 'react-router-dom';
import { PackageSearch, PlusCircle, BarChart3 } from 'lucide-react';
import { useEffect } from 'react';
import { usePackageStore } from '@/hooks/usePackageStore';

const navItems = [
  { path: '/', label: '包裹登记', icon: PlusCircle },
  { path: '/pickup', label: '取件查询', icon: PackageSearch },
  { path: '/statistics', label: '数据统计', icon: BarChart3 },
];

export default function Layout() {
  const loadData = usePackageStore((state) => state.loadData);
  const isLoaded = usePackageStore((state) => state.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      loadData();
    }
  }, [isLoaded, loadData]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
              <PackageSearch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-dark-800">驿站管家</h1>
              <p className="text-xs text-dark-400">菜鸟驿站管理系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-200'
                        : 'text-dark-600 hover:bg-gray-100 hover:text-dark-800'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-br from-primary-50 to-orange-50 rounded-xl p-4">
            <p className="text-sm text-dark-600 font-medium">温馨提示</p>
            <p className="text-xs text-dark-500 mt-1">
              数据保存在本地浏览器中，请勿清理浏览器缓存
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
