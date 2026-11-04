import type { Permission } from '@ecomap/shared';
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type Router,
  type RouteRecordRaw,
} from 'vue-router';
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
  { path: '/privacy', component: () => import('./pages/PrivacyPage.vue') },
  { path: '/sign-in', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/join', component: () => import('./pages/JoinPage.vue') },
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

export function createEcoMapRouter(options: { memory?: boolean } = {}): Router {
  return createRouter({
    history: options.memory ? createMemoryHistory() : createWebHistory(),
    routes,
  });
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
