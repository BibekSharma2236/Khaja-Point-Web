const API_BASE = '';

function getToken() {
  return localStorage.getItem('khaja_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const msg = body?.error || body?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

export const api = {
  async register({ name, email, password }) {
    return apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  async login({ email, password }) {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async me() {
    return apiFetch('/api/auth/me');
  },

  async getMenu() {
    return apiFetch('/api/menu');
  },

  async checkout({ deliveryName, deliveryPhone, deliveryAddress, deliveryInstructions, items }) {
    return apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        deliveryName,
        deliveryPhone,
        deliveryAddress,
        deliveryInstructions,
        items
      })
    });
  },

  async payEsewa({ orderId, forceFailure }) {
    return apiFetch(`/api/orders/${orderId}/pay/esewa`, {
      method: 'POST',
      body: JSON.stringify({ forceFailure: !!forceFailure })
    });
  },

  async payEsewaMock({ orderId, forceFailure }) {
    return apiFetch(`/api/orders/${orderId}/pay/esewa/mock`, {
      method: 'POST',
      body: JSON.stringify({ forceFailure: !!forceFailure })
    });
  },

  async getOrders() {
    return apiFetch('/api/orders');
  },

  async getAdminOrders() {
    return apiFetch('/api/admin/orders');
  },

  async getOrder(orderId) {
    return apiFetch(`/api/orders/${orderId}`);
  },

  async updateOrderStatus({ orderId, status }) {
    return apiFetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async createAdminOrder({ userEmail, deliveryName, deliveryPhone, deliveryAddress, deliveryInstructions, status, items }) {
    return apiFetch('/api/admin/orders', {
      method: 'POST',
      body: JSON.stringify({ userEmail, deliveryName, deliveryPhone, deliveryAddress, deliveryInstructions, status, items })
    });
  },

  async deleteOrder(orderId) {
    return apiFetch(`/api/admin/orders/${orderId}`, {
      method: 'DELETE'
    });
  },

  async getOrderTracking(orderId) {
    return apiFetch(`/api/orders/${orderId}/tracking`);
  }
};


