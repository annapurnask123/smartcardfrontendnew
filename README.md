# SmartMetroCard Frontend (React + Vite)

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build

## Environment

Create a `.env` at the project root:

```
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
VITE_SOCKET_PATH=/socket.io
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

If you omit `VITE_API_BASE_URL`, the app will use the Vite proxy to `http://localhost:5000` for `/api`.