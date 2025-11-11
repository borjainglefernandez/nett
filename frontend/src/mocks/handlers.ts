import { http, HttpResponse } from 'msw';
import { mockApiResponses } from '../test-utils';

export const handlers = [
  // GET /api/account with optional error simulation
  http.get('/api/account', ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('error') === 'server') {
      return HttpResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return HttpResponse.json(mockApiResponses.accounts);
  }),

  // GET /api/account/:id/transactions
  http.get('/api/account/:id/transactions', ({ params }) => {
    const { id } = params;
    return HttpResponse.json(
      mockApiResponses.transactions.filter(
        (txn) => txn.account_id === id
      )
    );
  }),

  // PUT /api/account
  http.put('/api/account', () =>
    HttpResponse.json({
      message: 'Account updated successfully',
    })
  ),

  // DELETE /api/account/:id
  http.delete('/api/account/:id', ({ params }) =>
    HttpResponse.json({
      message:
        'Account deletion requires removing the entire bank connection',
      item_id: 'test-item-1',
      action: 'delete_item',
    })
  ),

  // GET /api/item
  http.get('/api/item', () => HttpResponse.json(mockApiResponses.items)),

  // POST /api/item
  http.post('/api/item', () =>
    HttpResponse.json(mockApiResponses.itemCreation)
  ),

  // DELETE /api/item/:id with optional "not found" behaviour
  http.delete('/api/item/:id', ({ params }) => {
    if (params.id === 'nonexistent') {
      return HttpResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(mockApiResponses.itemDeletion);
  }),

  // POST /api/item/:id/sync
  http.post('/api/item/:id/sync', () =>
    HttpResponse.json({ message: 'Transactions synced successfully' })
  ),

  // POST /api/create_link_token
  http.post('/api/create_link_token', () =>
    HttpResponse.json(mockApiResponses.linkToken)
  ),
];

