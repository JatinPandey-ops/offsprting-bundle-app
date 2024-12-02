import { json } from '@remix-run/node';
import prisma from '../db.server.js';

export const action = async ({ request }) => {
  try {
    console.log(request)
    const headers = request.headers;
    const body = request.body;
    console.log(headers)
    console.log(body)
   
    return json({ message: 'Product processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    return json({ error: 'Error processing product webhook' }, { status: 500 });
  }
};
