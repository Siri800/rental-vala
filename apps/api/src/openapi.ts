type Method = 'get' | 'post' | 'patch' | 'delete';

interface DocumentedRoute {
  path: string;
  method: Method;
  tag: string;
  summary: string;
  authenticated?: boolean;
  responseCode?: '200' | '201';
}

const routes: DocumentedRoute[] = [
  { path: '/auth/register', method: 'post', tag: 'Authentication', summary: 'Register a customer or provider', responseCode: '201' },
  { path: '/auth/verify-email', method: 'post', tag: 'Authentication', summary: 'Verify an email address with its OTP' },
  { path: '/auth/resend-otp', method: 'post', tag: 'Authentication', summary: 'Resend an email verification OTP' },
  { path: '/auth/verify-otp', method: 'post', tag: 'Authentication', summary: 'Verify registration or login OTP' },
  { path: '/auth/login/send-otp', method: 'post', tag: 'Authentication', summary: 'Send a sign-in OTP for the selected customer or provider role' },
  { path: '/auth/login/verify-otp', method: 'post', tag: 'Authentication', summary: 'Verify a mobile-number OTP for the selected customer or provider role' },
  { path: '/auth/login', method: 'post', tag: 'Authentication', summary: 'Log in with email or mobile, password, and selected customer or provider role' },
  { path: '/auth/admin/login', method: 'post', tag: 'Authentication', summary: 'Authenticate an administrator account' },
  { path: '/auth/me', method: 'get', tag: 'Authentication', summary: 'Get the current user', authenticated: true },
  { path: '/auth/logout', method: 'post', tag: 'Authentication', summary: 'Log out and clear the refresh cookie' },
  { path: '/categories', method: 'get', tag: 'Categories', summary: 'List active categories and subcategories' },
  { path: '/categories/{slug}', method: 'get', tag: 'Categories', summary: 'Get category details' },
  { path: '/categories/{id}/attributes', method: 'post', tag: 'Categories', summary: 'Create a category attribute', authenticated: true, responseCode: '201' },
  { path: '/providers/dashboard', method: 'get', tag: 'Providers', summary: 'Get provider dashboard metrics', authenticated: true },
  { path: '/providers/me', method: 'get', tag: 'Providers', summary: 'Get the current provider profile', authenticated: true },
  { path: '/providers/profile', method: 'post', tag: 'Providers', summary: 'Create a provider profile', authenticated: true, responseCode: '201' },
  { path: '/providers/{slug}', method: 'get', tag: 'Providers', summary: 'Get a verified provider and published listings' },
  { path: '/listings', method: 'get', tag: 'Listings', summary: 'Search published listings' },
  { path: '/listings', method: 'post', tag: 'Listings', summary: 'Create a listing for provider review', authenticated: true, responseCode: '201' },
  { path: '/listings/{slug}', method: 'get', tag: 'Listings', summary: 'Get published listing details' },
  { path: '/bookings/quote', method: 'post', tag: 'Bookings', summary: 'Calculate availability and booking quote' },
  { path: '/bookings', method: 'post', tag: 'Bookings', summary: 'Create a booking and initialize checkout when applicable', authenticated: true, responseCode: '201' },
  { path: '/bookings/my', method: 'get', tag: 'Bookings', summary: 'List the current customer bookings', authenticated: true },
  { path: '/bookings/provider', method: 'get', tag: 'Bookings', summary: 'List the current provider bookings', authenticated: true },
  { path: '/bookings/{id}/invoice', method: 'get', tag: 'Bookings', summary: 'Download the GST tax invoice PDF', authenticated: true },
  { path: '/bookings/{id}/approve', method: 'post', tag: 'Bookings', summary: 'Approve a pending booking', authenticated: true },
  { path: '/bookings/{id}/cancel', method: 'post', tag: 'Bookings', summary: 'Cancel an eligible booking', authenticated: true },
  { path: '/payments/create-order', method: 'post', tag: 'Payments', summary: 'Create a payment order', authenticated: true, responseCode: '201' },
  { path: '/payments/verify', method: 'post', tag: 'Payments', summary: 'Verify captured payment', authenticated: true },
  { path: '/payments/webhook', method: 'post', tag: 'Payments', summary: 'Process a signed Razorpay webhook' },
  { path: '/payments/my', method: 'get', tag: 'Payments', summary: 'List the current customer payments', authenticated: true },
  { path: '/operations/{bookingId}/dispatch', method: 'post', tag: 'Operations', summary: 'Dispatch or schedule a booking handover', authenticated: true },
  { path: '/operations/{bookingId}/verify-handover', method: 'post', tag: 'Operations', summary: 'Verify handover OTP', authenticated: true },
  { path: '/operations/{bookingId}/inspect-return', method: 'post', tag: 'Operations', summary: 'Inspect a returned rental', authenticated: true },
  { path: '/engagement/wishlist', method: 'get', tag: 'Engagement', summary: 'List the current customer wishlist', authenticated: true },
  { path: '/engagement/wishlist/{listingId}', method: 'post', tag: 'Engagement', summary: 'Add a listing to wishlist', authenticated: true, responseCode: '201' },
  { path: '/engagement/wishlist/{listingId}', method: 'delete', tag: 'Engagement', summary: 'Remove a listing from wishlist', authenticated: true },
  { path: '/engagement/notifications', method: 'get', tag: 'Engagement', summary: 'List current user notifications', authenticated: true },
  { path: '/engagement/notifications/{id}/read', method: 'patch', tag: 'Engagement', summary: 'Mark a notification as read', authenticated: true },
  { path: '/engagement/reviews', method: 'post', tag: 'Engagement', summary: 'Review a completed booking', authenticated: true, responseCode: '201' },
  { path: '/engagement/listings/{listingId}/reviews', method: 'get', tag: 'Engagement', summary: 'List visible reviews for a listing' },
  { path: '/support/tickets', method: 'post', tag: 'Support', summary: 'Create a support ticket', authenticated: true, responseCode: '201' },
  { path: '/support/tickets', method: 'get', tag: 'Support', summary: 'List support tickets for staff', authenticated: true },
  { path: '/support/tickets/my', method: 'get', tag: 'Support', summary: 'List current user support tickets', authenticated: true },
  { path: '/support/tickets/{id}/messages', method: 'post', tag: 'Support', summary: 'Add a message to a support ticket', authenticated: true, responseCode: '201' },
  { path: '/support/tickets/{id}/status', method: 'patch', tag: 'Support', summary: 'Update a support ticket status', authenticated: true },
  { path: '/admin/overview', method: 'get', tag: 'Administration', summary: 'Get marketplace overview', authenticated: true },
  { path: '/admin/listings', method: 'get', tag: 'Administration', summary: 'List listings for moderation', authenticated: true },
  { path: '/admin/listings/{id}/status', method: 'patch', tag: 'Administration', summary: 'Approve or reject a listing', authenticated: true },
  { path: '/admin/providers', method: 'get', tag: 'Administration', summary: 'List providers for verification', authenticated: true },
  { path: '/admin/providers/{id}/verification', method: 'patch', tag: 'Administration', summary: 'Review provider verification', authenticated: true },
  { path: '/admin/disputes', method: 'get', tag: 'Administration', summary: 'List booking disputes', authenticated: true },
  { path: '/admin/disputes/{id}/resolve', method: 'patch', tag: 'Administration', summary: 'Resolve a dispute', authenticated: true },
  { path: '/uploads/presign', method: 'post', tag: 'Uploads', summary: 'Get a presigned URL for an image upload', authenticated: true },
];

const paths: Record<string, Record<string, unknown>> = {};
for (const route of routes) {
  const methods = paths[route.path] ?? {};
  const parameters = [...route.path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
  methods[route.method] = {
    tags: [route.tag],
    summary: route.summary,
    operationId: `${route.method}_${route.path.replace(/[{}\/]/g, '_').replace(/^_+|_+$/g, '')}`,
    ...(parameters.length ? { parameters } : {}),
    ...(route.authenticated ? { security: [{ bearerAuth: [] }] } : {}),
    responses: {
      [route.responseCode ?? '200']: { description: 'Successful response' },
      '400': { description: 'Invalid request' },
      ...(route.authenticated ? { '401': { description: 'Authentication required' }, '403': { description: 'Insufficient permissions' } } : {}),
      '500': { description: 'Unexpected server error' },
    },
  };
  paths[route.path] = methods;
}

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Rental Vala API',
    version: '1.0.0',
    description: 'REST API for the Rental Vala rental marketplace.',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  tags: [...new Set(routes.map((route) => route.tag))].map((name) => ({ name })),
  paths,
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
};
