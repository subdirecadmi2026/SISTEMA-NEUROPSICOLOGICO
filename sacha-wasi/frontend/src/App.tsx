import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedLayout } from './ProtectedLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ProductsPage } from './pages/ProductsPage'
import { RecipesPage } from './pages/RecipesPage'
import { InventoryPage } from './pages/InventoryPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/productos" element={<ProductsPage />} />
            <Route path="/recetas" element={<RecipesPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
