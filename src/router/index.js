import { createRouter, createWebHistory } from "vue-router";
import { auth } from "../stores/auth";
import AppLayout from "../components/AppLayout.vue";
import LoginView from "../views/LoginView.vue";
import HomeView from "../views/HomeView.vue";
import ExpensesView from "../views/ExpensesView.vue";
import PurchasesView from "../views/PurchasesView.vue";
import SalesView from "../views/SalesView.vue";
import ProductsView from "../views/ProductsView.vue";
import StockView from "../views/StockView.vue";
import MenuView from "../views/MenuView.vue";
import ProductionsView from "../views/ProductionsView.vue";
import HppView from "../views/HppView.vue";
import ReportsView from "../views/ReportsView.vue";
import ExportView from "../views/ExportView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginView },
    {
      path: "/",
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: "", name: "home", component: HomeView },
        { path: "pembelian", name: "purchases", component: PurchasesView },
        { path: "penjualan", name: "sales", component: SalesView },
        { path: "stok", name: "stock", component: StockView },
        { path: "pengeluaran", name: "expenses", component: ExpensesView },
        { path: "menu", name: "menu", component: MenuView },
        {
          path: "produk",
          name: "products",
          component: ProductsView,
          meta: { requiresOwner: true },
        },
        { path: "produksi", name: "productions", component: ProductionsView },
        {
          path: "hpp",
          name: "hpp",
          component: HppView,
          meta: { requiresOwner: true },
        },
        { path: "laporan", name: "reports", component: ReportsView },
        {
          path: "ekspor",
          name: "export",
          component: ExportView,
          meta: { requiresOwner: true },
        },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !auth.user) return { name: "login" };
  if (to.meta.requiresOwner && auth.role !== "owner") return { name: "home" };
  if (to.name === "login" && auth.user) return { name: "home" };
});

export default router;
