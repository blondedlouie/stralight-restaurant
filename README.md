# Starlight Restaurant

## Local mock mode

Use local mock mode to preview customer and staff workflows without Supabase.

Create or update `.env.local` in the project root:

```env
NEXT_PUBLIC_ENABLE_SANDBOX=true
NEXT_PUBLIC_USE_MOCK_DATA=true
```

Restart the development server after changing environment variables:

```powershell
npm run dev
```

Open the site and use **Dev tools** in the bottom-left corner. It can create a paid mock order, change to each staff role, open the staff role selector, and reset the shared local mock state.

The role selector is also available at `/admin/login`. Mock mode is available only outside production. For implementation status and the shared mock data lifecycle, see [LOCAL_MOCK_MODE.md](LOCAL_MOCK_MODE.md).
