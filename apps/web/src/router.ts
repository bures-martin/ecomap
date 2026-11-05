import type { Permission } from '@ecomap/shared';
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type Router,
  type RouteRecordRaw,
} from 'vue-router';
import { IS_DEMO, useDemoDialog } from './demo/demo.js';
import AboutPage from './pages/AboutPage.vue';
import LoginPage from './pages/LoginPage.vue';
import MapPage from './pages/MapPage.vue';
import NotFoundPage from './pages/NotFoundPage.vue';
import RegisterPage from './pages/RegisterPage.vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** Wraps the page in `<RequirePermission>`; see App.vue. */
    permission?: Permission;
  }
}

/*
 * Screens only a signed-in member or an admin ever opens are split out of the
 * first download: a visitor who just wants to look at the map should not pay for
 * the layer editor or the QR-code library.
 */
export const routes: RouteRecordRaw[] = [
  { path: '/', component: MapPage },
  { path: '/about', component: AboutPage },
  { path: '/s/:code', component: () => import('./pages/ShortLinkPage.vue') },
  { path: '/privacy', component: () => import('./pages/PrivacyPage.vue') },
  { path: '/sign-in', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/join', component: () => import('./pages/JoinPage.vue') },
  { path: '/verify-email', component: () => import('./pages/VerifyEmailPage.vue') },
  { path: '/forgot-password', component: () => import('./pages/ForgotPasswordPage.vue') },
  { path: '/reset-password', component: () => import('./pages/ResetPasswordPage.vue') },
  { path: '/account', component: () => import('./pages/AccountPage.vue') },
  {
    path: '/admin/layers',
    component: () => import('./pages/AdminLayersPage.vue'),
    meta: { permission: 'layer:manage' },
  },
  {
    path: '/admin/settings',
    component: () => import('./pages/AdminSettingsPage.vue'),
    meta: { permission: 'settings:manage' },
  },
  {
    path: '/admin/moderation',
    component: () => import('./pages/ModerationPage.vue'),
    meta: { permission: 'feature:moderate' },
  },
  {
    path: '/admin/people',
    component: () => import('./pages/PeoplePage.vue'),
    meta: { permission: 'user:manage' },
  },
  { path: '/admin', redirect: '/admin/layers' },
  { path: '/:pathMatch(.*)*', component: NotFoundPage },
];

/**
 * Pages the read-only demo cannot offer: signing in, accounts, admin, and
 * short links (which live on a server).
 */
const NOT_IN_DEMO = [
  '/sign-in',
  '/register',
  '/join',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/account',
  '/admin',
  '/s',
];
const notInDemo = (path: string): boolean =>
  NOT_IN_DEMO.some((blocked) => path === blocked || path.startsWith(`${blocked}/`));

export function createEcoMapRouter(options: { memory?: boolean } = {}): Router {
  const router = createRouter({
    /* BASE_URL is "/" normally, and e.g. "/ecomap/" for the demo on GitHub Pages. */
    history: options.memory ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes,
  });
  if (IS_DEMO) {
    router.beforeEach((to, from) => {
      if (!notInDemo(to.path)) return true;
      /* Explain instead - and stay put, or land on the map when opened directly. */
      useDemoDialog().show();
      return from.matched.length > 0 ? false : '/';
    });
  }
  return router;
}

/**
 * Only same-site paths are honoured as a post-sign-in destination: a `from`
 * pointing at another origin would turn the sign-in page into an open redirect.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}
