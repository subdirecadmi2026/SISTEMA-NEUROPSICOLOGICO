import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedLayout } from './ProtectedLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ProductsPage } from './pages/ProductsPage'
import { RecipesPage } from './pages/RecipesPage'
import { InventoryPage } from './pages/InventoryPage'
import { PosPage } from './pages/PosPage'
import { KitchenPage } from './pages/KitchenPage'
import { TablesPage } from './pages/TablesPage'
import { CashPage } from './pages/CashPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { CustomersPage } from './pages/CustomersPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { ReservationsPage } from './pages/ReservationsPage'
import { DeliveryPage } from './pages/DeliveryPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { ReportsPage } from './pages/ReportsPage'
import { AuditPage } from './pages/AuditPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { InvoicePrintPage } from './pages/InvoicePrintPage'
import { PublicMenuPage } from './pages/PublicMenuPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/m/:qrToken" element={<PublicMenuPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pos" element={<PosPage />} />
            <Route path="/cocina" element={<KitchenPage />} />
            <Route path="/mesas" element={<TablesPage />} />
            <Route path="/caja" element={<CashPage />} />
            <Route path="/facturas" element={<InvoicesPage />} />
            <Route path="/facturas/:id/imprimir" element={<InvoicePrintPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/productos" element={<ProductsPage />} />
            <Route path="/recetas" element={<RecipesPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/compras" element={<PurchasesPage />} />
            <Route path="/proveedores" element={<SuppliersPage />} />
            <Route path="/clientes" element={<CustomersPage />} />
            <Route path="/reservas" element={<ReservationsPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="/gastos" element={<ExpensesPage />} />
            <Route path="/reportes" element={<ReportsPage />} />
            <Route path="/auditoria" element={<AuditPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/configuracion" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
